"""Payment endpoints — Stripe + Razorpay webhooks and checkout session creation.

Checkout sessions are created by the backend (not the frontend Stripe SDK) so
the secret API key is never exposed to the browser. The webhook handlers
implement the full revenue cascade: payment record → registrant purchase status
→ revenue aggregation → activity log.

Org scoping for webhooks is *not* via X-Organization-Id (since webhook calls
carry no auth token). Instead the handler resolves the organization from the
webinar that the registrant belongs to.
"""
from __future__ import annotations

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    get_current_active_user,
    get_current_membership,
    get_current_membership_unrestricted,
    get_db,
)
from app.models import Membership, Payment, PaymentStatus, Registrant, Webinar
from app.api.v1.endpoints.organizations import (
    PaymentKeysPayload,
    _format_payment_keys,
    _update_payment_keys_data,
)
from app.schemas.payments import (
    CheckoutSessionResponse,
    CreateCheckoutRequest,
    PaymentRecord,
    PaymentStats,
    RazorpayOrderResponse,
)
from app.services import payment_service

router = APIRouter()


# ── Payment Gateway Credentials ────────────────────────────────────────────


@router.get("/keys")
async def get_org_payment_keys(
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve payment gateway configuration for the active organization."""
    return _format_payment_keys(membership.organization)


@router.patch("/keys")
async def update_org_payment_keys(
    payload: PaymentKeysPayload,
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update payment gateway configuration for the active organization."""
    _update_payment_keys_data(membership.organization, payload)
    await db.flush()
    return {"status": "ok", "message": "Payment gateway credentials saved"}


@router.post("/keys")
async def save_org_payment_keys(
    payload: PaymentKeysPayload,
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update payment gateway configuration (POST alias)."""
    _update_payment_keys_data(membership.organization, payload)
    await db.flush()
    return {"status": "ok", "message": "Payment gateway credentials saved"}


# ── Webhook: Stripe ────────────────────────────────────────────────────────


@router.post("/webhook/stripe", status_code=status.HTTP_200_OK)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Stripe webhook handler.

    Verifies the signature, then processes checkout.session.completed events.
    The client_reference_id contains the registrant UUID.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = payment_service.verify_stripe_webhook_signature(payload, sig_header)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    if event.get("type") != "checkout.session.completed":
        return {"status": "ignored", "event": event.get("type")}

    session_obj = event.get("data", {}).get("object", {})
    
    metadata = session_obj.get("metadata", {}) or {}
    if metadata.get("type") == "subscription":
        user_id = metadata.get("user_id")
        plan_tier = metadata.get("plan_tier", "starter")
        if user_id:
            from app.models import User
            user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            sub_user = user_result.scalar_one_or_none()
            if sub_user:
                sub_user.subscription_status = "active"
                sub_user.plan_tier = plan_tier
                sub_user.trial_ends_at = None
                await db.commit()
        return {"status": "ok"}
    
    registrant_id_str = session_obj.get("client_reference_id")
    if not registrant_id_str:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing client_reference_id")

    try:
        registrant_id = uuid.UUID(registrant_id_str)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid registrant UUID")

    amount_cents = session_obj.get("amount_total", 0)
    currency = session_obj.get("currency", "usd")
    payment_intent = session_obj.get("payment_intent")
    session_id = session_obj.get("id")

    await payment_service.process_successful_payment(
        db,
        registrant_id=registrant_id,
        provider="stripe",
        provider_txn_id=payment_intent,
        checkout_session_id=session_id,
        amount=Decimal(str(amount_cents)) / 100,
        currency=currency,
    )

    return {"status": "ok"}


# ── Webhook: Razorpay ──────────────────────────────────────────────────────


@router.post("/webhook/razorpay", status_code=status.HTTP_200_OK)
async def razorpay_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Razorpay webhook handler.

    Expects event = "payment.captured" with registrant_id in notes.
    """
    import json

    body = await request.body()
    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid JSON")

    if payload.get("event") != "payment.captured":
        return {"status": "ignored", "event": payload.get("event")}

    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    notes = payment_entity.get("notes", {}) or {}
    
    if notes.get("type") == "subscription":
        user_id = notes.get("user_id")
        plan_tier = notes.get("plan_tier", "starter")
        if user_id:
            from app.models import User
            user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            sub_user = user_result.scalar_one_or_none()
            if sub_user:
                sub_user.subscription_status = "active"
                sub_user.plan_tier = plan_tier
                sub_user.trial_ends_at = None
                await db.commit()
        return {"status": "ok"}
        
    registrant_id_str = notes.get("registrant_id")
    if not registrant_id_str:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Missing registrant_id in notes")

    try:
        registrant_id = uuid.UUID(registrant_id_str)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid registrant UUID")

    amount_paise = payment_entity.get("amount", 0)
    currency = payment_entity.get("currency", "INR")
    payment_id = payment_entity.get("id")

    await payment_service.process_successful_payment(
        db,
        registrant_id=registrant_id,
        provider="razorpay",
        provider_txn_id=payment_id,
        checkout_session_id=None,
        amount=Decimal(str(amount_paise)) / 100,
        currency=currency,
    )

    return {"status": "ok"}


# ── Create checkout session (authenticated) ────────────────────────────────


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    payload: CreateCheckoutRequest,
    current_user=Depends(get_current_active_user),
    membership=Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for a registrant.

    The frontend calls this after the user clicks "Proceed to Payment" on the
    registration form. The returned URL is where the browser should redirect.
    """
    registrant = (
        await db.execute(select(Registrant).where(Registrant.id == payload.registrant_id))
    ).scalar_one_or_none()
    if registrant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registrant not found")

    webinar = (
        await db.execute(select(Webinar).where(Webinar.id == registrant.webinar_id))
    ).scalar_one_or_none()
    if webinar is None or webinar.organization_id != membership.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    try:
        result = await payment_service.create_stripe_checkout_session(
            db,
            registrant=registrant,
            webinar=webinar,
            success_url=payload.success_url,
            cancel_url=payload.cancel_url,
        )
        return CheckoutSessionResponse(url=result.url, session_id=result.session_id)
    except payment_service.PaymentError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, e.message)


# ── Create Razorpay order (authenticated) ────────────────────────────────────


@router.post("/razorpay/order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    payload: CreateCheckoutRequest,
    current_user=Depends(get_current_active_user),
    membership=Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for a registrant.

    The frontend uses this to initialize the Razorpay checkout.
    """
    registrant = (
        await db.execute(select(Registrant).where(Registrant.id == payload.registrant_id))
    ).scalar_one_or_none()
    if registrant is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registrant not found")

    webinar = (
        await db.execute(select(Webinar).where(Webinar.id == registrant.webinar_id))
    ).scalar_one_or_none()
    if webinar is None or webinar.organization_id != membership.organization_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied")

    try:
        result = await payment_service.create_razorpay_order(
            db,
            registrant=registrant,
            webinar=webinar,
        )
        return RazorpayOrderResponse(
            order_id=result.order_id,
            amount=result.amount,
            currency=result.currency,
            key_id=result.key_id,
        )
    except payment_service.PaymentError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, e.message)


# ── List payments (for the dashboard) ──────────────────────────────────────


@router.get("", response_model=list[PaymentRecord])
async def list_payments(
    webinar_id: uuid.UUID | None = None,
    current_user=Depends(get_current_active_user),
    membership=Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List payments in the active organization, optionally filtered by webinar."""
    query = (
        select(Payment)
        .join(Registrant, Payment.registrant_id == Registrant.id)
        .join(Webinar, Registrant.webinar_id == Webinar.id)
        .where(Webinar.organization_id == membership.organization_id)
    )
    if webinar_id:
        query = query.where(Webinar.id == webinar_id)
    query = query.order_by(Payment.created_at.desc())

    rows = (await db.execute(query)).scalars().all()
    return [PaymentRecord.model_validate(p) for p in rows]


# ── Payment statistics ─────────────────────────────────────────────────────


@router.get("/stats", response_model=PaymentStats)
async def get_payment_stats(
    current_user=Depends(get_current_active_user),
    membership=Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Get aggregated payment statistics for the active organization."""
    stats = await payment_service.get_payment_stats(db, membership.organization_id)
    return PaymentStats(
        total_revenue=stats["total_revenue"],
        total_payments=stats["total_payments"],
        completed_payments=stats["completed"],
        pending_payments=stats["pending"],
        failed_payments=stats["failed"],
        refunded_amount=stats["refunded_amount"],
        currency="usd",
    )


@router.get("/verify-session")
async def verify_session(
    session_id: str,
    registrant_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint called by the /payment/success page to verify a completed Stripe session."""
    try:
        reg_uuid = uuid.UUID(registrant_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid registrant UUID")

    try:
        payment = await payment_service.verify_stripe_checkout_session(
            db,
            session_id=session_id,
            registrant_id=reg_uuid,
        )
        await db.commit()
        return {
            "status": "success",
            "message": "Payment verified and registration confirmed",
            "payment_id": str(payment.id),
        }
    except payment_service.PaymentError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, e.message)


# ── Subscription Checkout ──────────────────────────────────────────────────

from pydantic import BaseModel

class SubscribeRequest(BaseModel):
    plan_tier: str  # "starter" or "pro"
    billing_cycle: str = "monthly"  # "monthly" or "yearly"

PLAN_PRICES = {
    "starter": {"monthly": 999, "yearly": 7990},   # cents
    "pro": {"monthly": 1999, "yearly": 17990},      # cents
}

PLAN_PRICES_INR = {
    "starter": {"monthly": 84900, "yearly": 679900},  # paise (approx conversion)
    "pro": {"monthly": 169900, "yearly": 1529900},     # paise
}

@router.post("/subscribe/stripe")
async def subscribe_stripe(
    payload: SubscribeRequest,
    membership: Membership = Depends(get_current_membership_unrestricted),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe Checkout Session for a platform subscription."""
    import os
    import stripe as stripe_sdk
    
    user = membership.user
    org = membership.organization
    settings = org.settings or {}
    
    sk = (settings.get("stripe_secret_key") or os.getenv("STRIPE_SECRET_KEY", "")).strip()

    # If the user's personal organization doesn't have keys configured, fallback to the superuser's keys
    if not sk:
        super_res = await db.execute(
            select(Organization)
            .join(User, Organization.owner_user_id == User.id)
            .where(User.is_super_user.is_(True))
        )
        super_orgs = super_res.scalars().all()
        for s_org in super_orgs:
            s_sk = ((s_org.settings or {}).get("stripe_secret_key") or "").strip()
            if s_sk:
                sk = s_sk
                break

    if not sk:
        raise HTTPException(400, "Stripe is not configured. Please add your Stripe keys in Dashboard Settings or Render environment variables.")
    
    stripe_sdk.api_key = sk
    
    prices = PLAN_PRICES.get(payload.plan_tier)
    if not prices:
        raise HTTPException(400, f"Invalid plan: {payload.plan_tier}")
    
    amount = prices.get(payload.billing_cycle, prices["monthly"])
    frontend_url = os.getenv("FRONTEND_URL", "https://webinarflow.in")
    
    session = stripe_sdk.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": amount,
                "product_data": {
                    "name": f"WebinarFlow {payload.plan_tier.title()} Plan ({payload.billing_cycle})",
                },
            },
            "quantity": 1,
        }],
        metadata={
            "type": "subscription",
            "user_id": str(user.id),
            "plan_tier": payload.plan_tier,
            "billing_cycle": payload.billing_cycle,
        },
        customer_email=user.email,
        success_url=f"{frontend_url}/payment/success?type=subscription&plan={payload.plan_tier}",
        cancel_url=f"{frontend_url}/payment/cancel?type=subscription",
    )
    
    return {"url": session.url, "session_id": session.id}


@router.post("/subscribe/razorpay")
async def subscribe_razorpay(
    payload: SubscribeRequest,
    membership: Membership = Depends(get_current_membership_unrestricted),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for a platform subscription."""
    import os
    
    user = membership.user
    org = membership.organization
    settings = org.settings or {}
    
    rzp_key = (settings.get("razorpay_key_id") or os.getenv("RAZORPAY_KEY_ID", "")).strip()
    rzp_secret = (settings.get("razorpay_key_secret") or os.getenv("RAZORPAY_KEY_SECRET", "")).strip()

    # If the user's personal organization doesn't have keys configured, fallback to the superuser's keys
    if not rzp_key or not rzp_secret:
        super_res = await db.execute(
            select(Organization)
            .join(User, Organization.owner_user_id == User.id)
            .where(User.is_super_user.is_(True))
        )
        super_orgs = super_res.scalars().all()
        for s_org in super_orgs:
            s_k = ((s_org.settings or {}).get("razorpay_key_id") or "").strip()
            s_s = ((s_org.settings or {}).get("razorpay_key_secret") or "").strip()
            if s_k and s_s:
                rzp_key = s_k
                rzp_secret = s_s
                break

    if not rzp_key or not rzp_secret:
        raise HTTPException(400, "Razorpay is not configured. Please add your Razorpay keys in Dashboard Settings or Render environment variables.")
    
    prices = PLAN_PRICES_INR.get(payload.plan_tier)
    if not prices:
        raise HTTPException(400, f"Invalid plan: {payload.plan_tier}")
    
    amount = prices.get(payload.billing_cycle, prices["monthly"])
    
    try:
        import razorpay as rzp_sdk
        client = rzp_sdk.Client(auth=(rzp_key, rzp_secret))
        order = client.order.create({
            "amount": amount,
            "currency": "INR",
            "notes": {
                "type": "subscription",
                "user_id": str(user.id),
                "plan_tier": payload.plan_tier,
                "billing_cycle": payload.billing_cycle,
            },
        })
        return {
            "order_id": order["id"],
            "amount": amount,
            "currency": "INR",
            "key_id": rzp_key,
            "user_email": user.email,
            "user_name": user.full_name or "",
        }
    except Exception as e:
        raise HTTPException(500, f"Razorpay order creation failed: {e}")

__all__ = ["router"]
