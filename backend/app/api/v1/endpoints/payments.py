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
from app.models import Membership, Organization, Payment, PaymentStatus, Registrant, SubscriptionPayment, User, Webinar
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
            user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            sub_user = user_result.scalar_one_or_none()
            if sub_user:
                sub_user.subscription_status = "active"
                sub_user.plan_tier = plan_tier
                sub_user.trial_ends_at = None
                # Record subscription payment
                amount_cents = session_obj.get("amount_total", 0)
                currency = session_obj.get("currency", "usd")
                db.add(SubscriptionPayment(
                    user_id=sub_user.id,
                    plan_tier=plan_tier,
                    billing_cycle=metadata.get("billing_cycle", "monthly"),
                    amount=Decimal(str(amount_cents)) / 100,
                    currency=currency.upper(),
                    provider="stripe",
                    provider_txn_id=session_obj.get("payment_intent"),
                    provider_order_id=session_obj.get("id"),
                    status="completed",
                ))
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
            user_result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
            sub_user = user_result.scalar_one_or_none()
            if sub_user:
                sub_user.subscription_status = "active"
                sub_user.plan_tier = plan_tier
                sub_user.trial_ends_at = None
                # Record subscription payment
                amount_paise = payment_entity.get("amount", 0)
                currency = payment_entity.get("currency", "INR")
                db.add(SubscriptionPayment(
                    user_id=sub_user.id,
                    plan_tier=plan_tier,
                    billing_cycle=notes.get("billing_cycle", "monthly"),
                    amount=Decimal(str(amount_paise)) / 100,
                    currency=currency.upper(),
                    provider="razorpay",
                    provider_txn_id=payment_entity.get("id"),
                    provider_order_id=payment_entity.get("order_id"),
                    status="completed",
                ))
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
    
    candidates = []
    if (settings.get("stripe_secret_key") or "").strip():
        candidates.append((settings["stripe_secret_key"], "user_org"))

    super_res = await db.execute(
        select(Organization)
        .join(User, Organization.owner_user_id == User.id)
        .where(User.is_super_user.is_(True))
    )
    for s_org in super_res.scalars().all():
        s_sk = ((s_org.settings or {}).get("stripe_secret_key") or "").strip()
        if s_sk:
            candidates.append((s_sk, f"super_org_{s_org.name}"))

    all_orgs = (await db.execute(select(Organization).order_by(Organization.created_at.desc()))).scalars().all()
    for a_org in all_orgs:
        a_sk = ((a_org.settings or {}).get("stripe_secret_key") or "").strip()
        if a_sk:
            candidates.append((a_sk, f"org_{a_org.name}"))

    env_sk = os.getenv("STRIPE_SECRET_KEY", "").strip()
    if env_sk:
        candidates.append((env_sk, "render_env"))

    seen = set()
    unique_candidates = []
    for k, src in candidates:
        ck = str(k).strip().strip('"').strip("'")
        if ck and ck not in seen and not ck.startswith("sk_test_your"):
            seen.add(ck)
            unique_candidates.append((ck, src))

    if not unique_candidates:
        raise HTTPException(400, "Stripe is not configured. Please add your Stripe keys in Render environment variables or Dashboard Settings.")
    
    prices = PLAN_PRICES.get(payload.plan_tier)
    if not prices:
        raise HTTPException(400, f"Invalid plan: {payload.plan_tier}")
    
    amount = prices.get(payload.billing_cycle, prices["monthly"])
    frontend_url = os.getenv("FRONTEND_URL", "https://webinarflow.in")
    
    last_error = None
    for clean_sk, src in unique_candidates:
        stripe_sdk.api_key = clean_sk
        try:
            session = stripe_sdk.checkout.Session.create(
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
                success_url=f"{frontend_url}/payment/success?type=subscription&plan={payload.plan_tier}&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{frontend_url}/payment/cancel?type=subscription",
            )
            return {"url": session.url, "session_id": session.id}
        except Exception as exc:
            err_msg = str(exc).lower()
            if "managed_payments" in err_msg or "tax_code" in err_msg:
                try:
                    session = stripe_sdk.checkout.Session.create(
                        mode="payment",
                        managed_payments={"enabled": False},
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
                        success_url=f"{frontend_url}/payment/success?type=subscription&plan={payload.plan_tier}&session_id={{CHECKOUT_SESSION_ID}}",
                        cancel_url=f"{frontend_url}/payment/cancel?type=subscription",
                    )
                    return {"url": session.url, "session_id": session.id}
                except Exception as inner_exc:
                    last_error = inner_exc
                    continue
            last_error = exc
            continue

    raise HTTPException(500, f"Stripe checkout session creation failed: {last_error}")


@router.post("/subscribe/razorpay")
async def subscribe_razorpay(
    payload: SubscribeRequest,
    membership: Membership = Depends(get_current_membership_unrestricted),
    db: AsyncSession = Depends(get_db),
):
    """Create a Razorpay order for a platform subscription with automated fallback across all key sources."""
    import os
    import razorpay as rzp_sdk
    
    user = membership.user
    org = membership.organization
    settings = org.settings or {}
    
    candidates = []

    # 1. User's active organization settings
    if (settings.get("razorpay_key_id") or "").strip() and (settings.get("razorpay_key_secret") or "").strip():
        candidates.append((settings["razorpay_key_id"], settings["razorpay_key_secret"], "user_org"))

    # 2. Superuser organizations in database
    super_res = await db.execute(
        select(Organization)
        .join(User, Organization.owner_user_id == User.id)
        .where(User.is_super_user.is_(True))
    )
    for s_org in super_res.scalars().all():
        s_k = ((s_org.settings or {}).get("razorpay_key_id") or "").strip()
        s_s = ((s_org.settings or {}).get("razorpay_key_secret") or "").strip()
        if s_k and s_s:
            candidates.append((s_k, s_s, f"super_org_{s_org.name}"))

    # 3. Any organization in database that has configured keys (e.g. webinar host workspace)
    all_orgs = (await db.execute(select(Organization).order_by(Organization.created_at.desc()))).scalars().all()
    for a_org in all_orgs:
        a_k = ((a_org.settings or {}).get("razorpay_key_id") or "").strip()
        a_s = ((a_org.settings or {}).get("razorpay_key_secret") or "").strip()
        if a_k and a_s:
            candidates.append((a_k, a_s, f"org_{a_org.name}"))

    # 4. Render environment variables
    env_k = os.getenv("RAZORPAY_KEY_ID", "").strip()
    env_s = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if env_k and env_s:
        candidates.append((env_k, env_s, "render_env"))

    # Deduplicate candidate pairs
    seen = set()
    unique_candidates = []
    for k, s, src in candidates:
        ck = str(k).strip().strip('"').strip("'")
        cs = str(s).strip().strip('"').strip("'")
        if ck and cs and (ck, cs) not in seen and not ck.startswith("rzp_test_your") and not cs.startswith("your_key"):
            seen.add((ck, cs))
            unique_candidates.append((ck, cs, src))

    if not unique_candidates:
        raise HTTPException(400, "Razorpay is not configured. Please add your Razorpay keys in Dashboard Settings or Render environment variables.")
    
    prices = PLAN_PRICES_INR.get(payload.plan_tier)
    if not prices:
        raise HTTPException(400, f"Invalid plan: {payload.plan_tier}")
    
    amount = prices.get(payload.billing_cycle, prices["monthly"])
    
    last_error = None
    for clean_k, clean_s, src in unique_candidates:
        try:
            client = rzp_sdk.Client(auth=(clean_k, clean_s))
            order = client.order.create({
                "amount": amount,
                "currency": "INR",
                "receipt": f"sub_{uuid.uuid4().hex[:12]}",
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
                "key_id": clean_k,
                "user_email": user.email,
                "user_name": user.full_name or "",
            }
        except Exception as exc:
            last_error = exc
            continue

    raise HTTPException(500, f"Razorpay order creation failed: {last_error}")


class SubscribeVerifyRazorpayRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_tier: str = "starter"


@router.post("/subscribe/razorpay/verify")
async def verify_subscription_razorpay(
    payload: SubscribeVerifyRazorpayRequest,
    membership: Membership = Depends(get_current_membership_unrestricted),
    db: AsyncSession = Depends(get_db),
):
    """Verify Razorpay payment signature for platform subscription and instantly activate the plan."""
    import os
    import razorpay as rzp_sdk

    org = membership.organization
    settings = org.settings or {}

    candidates = []
    if (settings.get("razorpay_key_id") or "").strip() and (settings.get("razorpay_key_secret") or "").strip():
        candidates.append((settings["razorpay_key_id"], settings["razorpay_key_secret"]))

    super_res = await db.execute(
        select(Organization)
        .join(User, Organization.owner_user_id == User.id)
        .where(User.is_super_user.is_(True))
    )
    for s_org in super_res.scalars().all():
        s_k = ((s_org.settings or {}).get("razorpay_key_id") or "").strip()
        s_s = ((s_org.settings or {}).get("razorpay_key_secret") or "").strip()
        if s_k and s_s:
            candidates.append((s_k, s_s))

    all_orgs = (await db.execute(select(Organization).order_by(Organization.created_at.desc()))).scalars().all()
    for a_org in all_orgs:
        a_k = ((a_org.settings or {}).get("razorpay_key_id") or "").strip()
        a_s = ((a_org.settings or {}).get("razorpay_key_secret") or "").strip()
        if a_k and a_s:
            candidates.append((a_k, a_s))

    env_k = os.getenv("RAZORPAY_KEY_ID", "").strip()
    env_s = os.getenv("RAZORPAY_KEY_SECRET", "").strip()
    if env_k and env_s:
        candidates.append((env_k, env_s))

    verified = False
    for k, s in candidates:
        ck = str(k).strip().strip('"').strip("'")
        cs = str(s).strip().strip('"').strip("'")
        if not ck or not cs:
            continue
        try:
            client = rzp_sdk.Client(auth=(ck, cs))
            client.utility.verify_payment_signature({
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            })
            verified = True
            break
        except Exception:
            continue

    if not verified:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment signature verification failed")

    user = membership.user
    user.subscription_status = "active"
    user.plan_tier = payload.plan_tier
    user.trial_ends_at = None

    # Fetch actual amount from Razorpay payment or fallback to plan pricing
    actual_amount = Decimal("0")
    billing_cycle = "monthly"
    try:
        payment_info = client.payment.fetch(payload.razorpay_payment_id)
        if payment_info and "amount" in payment_info:
            actual_amount = Decimal(str(payment_info["amount"])) / 100
        notes = payment_info.get("notes", {}) if payment_info else {}
        billing_cycle = notes.get("billing_cycle", "monthly")
    except Exception:
        pass

    if actual_amount <= Decimal("0"):
        prices = PLAN_PRICES_INR.get(payload.plan_tier, {})
        paise = prices.get(billing_cycle, prices.get("monthly", 169900 if payload.plan_tier == "pro" else 84900))
        actual_amount = Decimal(str(paise)) / 100

    # Record subscription payment with real amount
    db.add(SubscriptionPayment(
        user_id=user.id,
        plan_tier=payload.plan_tier,
        billing_cycle=billing_cycle,
        amount=actual_amount,
        currency="INR",
        provider="razorpay",
        provider_txn_id=payload.razorpay_payment_id,
        provider_order_id=payload.razorpay_order_id,
        status="completed",
    ))
    await db.commit()

    return {"status": "ok", "message": f"Successfully activated {payload.plan_tier} plan!"}


@router.get("/subscribe/stripe/verify")
async def verify_subscription_stripe(
    session_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Verify a completed Stripe checkout session for platform subscription and instantly activate the plan."""
    import os
    import stripe as stripe_sdk

    sk = os.getenv("STRIPE_SECRET_KEY", "").strip()
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
        raise HTTPException(400, "Stripe secret key not configured")

    stripe_sdk.api_key = sk
    try:
        session = stripe_sdk.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(400, f"Failed to retrieve Stripe session: {e}")

    if session.payment_status != "paid":
        raise HTTPException(400, "Payment has not been completed")

    metadata = session.metadata or {}
    user_id_str = metadata.get("user_id")
    plan_tier = metadata.get("plan_tier", "starter")

    if not user_id_str:
        raise HTTPException(400, "Session metadata missing user_id")

    user = (await db.execute(select(User).where(User.id == uuid.UUID(user_id_str)))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.subscription_status = "active"
    user.plan_tier = plan_tier
    user.trial_ends_at = None
    # Record subscription payment
    amount_cents = getattr(session, "amount_total", 0) or 0
    currency = getattr(session, "currency", "usd") or "usd"
    db.add(SubscriptionPayment(
        user_id=user.id,
        plan_tier=plan_tier,
        billing_cycle=metadata.get("billing_cycle", "monthly"),
        amount=Decimal(str(amount_cents)) / 100,
        currency=currency.upper(),
        provider="stripe",
        provider_txn_id=getattr(session, "payment_intent", None),
        provider_order_id=session_id,
        status="completed",
    ))
    await db.commit()

    return {"status": "ok", "message": f"Successfully activated {plan_tier} plan!", "plan_tier": plan_tier}


__all__ = ["router"]
