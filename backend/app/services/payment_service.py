"""Payment service — Stripe checkout sessions and webhook processing.

This service encapsulates all Stripe SDK calls, keeping the payment endpoint
clean and testable. It handles:
- Creating checkout sessions for registrants
- Verifying webhook signatures
- Processing successful payments
"""
from __future__ import annotations

import os
import uuid
from decimal import Decimal

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Payment,
    PaymentProvider,
    PaymentStatus,
    Registrant,
    RegistrantStatus,
    Webinar,
)

# Configure Stripe from environment
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")


class PaymentError(Exception):
    """Base exception for payment errors."""

    def __init__(self, message: str, code: str | None = None):
        self.message = message
        self.code = code
        super().__init__(message)


class CheckoutSessionResult:
    """Result of creating a checkout session."""

    def __init__(self, url: str, session_id: str):
        self.url = url
        self.session_id = session_id


async def create_stripe_checkout_session(
    db: AsyncSession,
    *,
    registrant: Registrant,
    webinar: Webinar,
    success_url: str | None = None,
    cancel_url: str | None = None,
) -> CheckoutSessionResult:
    """Create a Stripe checkout session for a registrant.

    Returns the checkout URL to redirect the user to.
    """
    if getattr(webinar, "is_paid", False) and getattr(webinar, "price_cents", 0) > 0:
        amount_cents = webinar.price_cents
        currency = (getattr(webinar, "currency", "usd") or "usd").lower()
    elif webinar.agenda and "price" in webinar.agenda:
        amount_cents = int(float(webinar.agenda.get("price", 0)) * 100)
        currency = "usd"
    else:
        amount_cents = 0
        currency = "usd"

    if amount_cents <= 0:
        raise PaymentError("This webinar is free - no payment required", "NO_PAYMENT_NEEDED")

    # Prevent duplicate payment records for the same registrant
    existing_payment = (
        await db.execute(
            select(Payment).where(
                Payment.registrant_id == registrant.id,
                Payment.webinar_id == webinar.id,
                Payment.status == PaymentStatus.pending,
            )
        )
    ).scalar_one_or_none()
    if existing_payment:
        # Reuse the existing pending payment
        base_url = os.getenv("FRONTEND_URL", "https://www.webinarflow.in").replace("http://localhost:3000", "https://www.webinarflow.in")
        existing_url = f"{base_url}/payment/success?session_id={existing_payment.checkout_session_id}&registrant_id={registrant.id}"
        return CheckoutSessionResult(url=existing_url, session_id=existing_payment.checkout_session_id)

    # 1. Look up organization-level custom Stripe key first, fallback to environment
    from app.models import Organization
    org = (await db.execute(select(Organization).where(Organization.id == webinar.organization_id))).scalar_one_or_none()
    org_settings = getattr(org, "settings", {}) or {}

    stripe_key = (org_settings.get("stripe_secret_key") or os.getenv("STRIPE_SECRET_KEY", "")).strip()
    if not stripe_key or stripe_key.startswith("sk_test_your"):
        raise PaymentError(
            "Stripe is not configured. Please set your Stripe Secret Key in Dashboard Settings.",
            code="STRIPE_NOT_CONFIGURED",
        )

    stripe.api_key = stripe_key

    base_url = (os.getenv("FRONTEND_URL", "https://www.webinarflow.in")).rstrip("/")
    final_success_url = success_url or f"{base_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}&registrant_id={registrant.id}"
    final_cancel_url = cancel_url or f"{base_url}/r/{webinar.slug}"

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            mode="payment",
            line_items=[
                {
                    "price_data": {
                        "currency": currency,
                        "product_data": {
                            "name": webinar.title,
                            "description": webinar.description or f"Registration for {webinar.title}",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            client_reference_id=str(registrant.id),
            success_url=final_success_url,
            cancel_url=final_cancel_url,
            metadata={
                "webinar_id": str(webinar.id),
                "registrant_id": str(registrant.id),
                "organization_id": str(webinar.organization_id),
            },
        )

        payment = Payment(
            registrant_id=registrant.id,
            webinar_id=webinar.id,
            organization_id=webinar.organization_id,
            amount=Decimal(str(amount_cents / 100)),
            currency=currency,
            provider=PaymentProvider.stripe,
            checkout_session_id=session.id,
            status=PaymentStatus.pending,
        )
        db.add(payment)
        await db.flush()

        return CheckoutSessionResult(url=session.url, session_id=session.id)

    except stripe.error.StripeError as e:
        raise PaymentError(str(e), code="STRIPE_ERROR")


def verify_stripe_webhook_signature(payload: bytes, sig_header: str) -> dict:
    """Verify and parse a Stripe webhook payload.

    Raises ValueError if signature verification fails.
    Returns the parsed event dict on success.
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        # Skip verification in dev without secret
        import json
        return json.loads(payload)

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        return event
    except stripe.error.SignatureVerificationError as e:
        raise ValueError(f"Invalid webhook signature: {e}")


async def process_successful_payment(
    db: AsyncSession,
    *,
    registrant_id: uuid.UUID,
    provider: str,
    provider_txn_id: str | None,
    checkout_session_id: str | None,
    amount: Decimal,
    currency: str,
) -> Payment:
    """Process a successful payment from a webhook.

    This:
    1. Finds or creates the payment record
    2. Updates the registrant status to 'purchased'
    3. Records the activity in webinar_activities
    """
    from datetime import datetime, timezone
    from app.models import WebinarActivity

    # Find the registrant
    registrant = (await db.execute(select(Registrant).where(Registrant.id == registrant_id))).scalar_one_or_none()
    if not registrant:
        raise PaymentError("Registrant not found", "NOT_FOUND")

    # Find existing pending payment or create new one
    if checkout_session_id:
        payment = (
            await db.execute(select(Payment).where(Payment.checkout_session_id == checkout_session_id))
        ).scalar_one_or_none()
    else:
        payment = None

    webinar = (await db.execute(select(Webinar).where(Webinar.id == registrant.webinar_id))).scalar_one_or_none()
    org_id = webinar.organization_id if webinar else None

    if payment:
        # Update existing pending payment
        payment.status = PaymentStatus.completed
        payment.provider_txn_id = provider_txn_id
    else:
        # Create new payment record (webhook arrived before checkout session was saved)
        payment = Payment(
            registrant_id=registrant_id,
            webinar_id=registrant.webinar_id,
            organization_id=org_id,
            amount=amount,
            currency=currency,
            provider=PaymentProvider.stripe if provider == "stripe" else PaymentProvider.razorpay,
            provider_txn_id=provider_txn_id,
            checkout_session_id=checkout_session_id,
            status=PaymentStatus.completed,
        )
        db.add(payment)

    # Update registrant status — paid webinar: pending_payment → registered
    was_pending = registrant.status != RegistrantStatus.registered
    registrant.status = RegistrantStatus.registered

    if was_pending and webinar:
        webinar.registration_count += 1

    # Create activity log
    activity = WebinarActivity(
        registrant_id=registrant_id,
        webinar_id=registrant.webinar_id,
        event_type="registered",
        occurred_at=datetime.now(timezone.utc),
        meta={
            "provider": provider,
            "amount": str(amount),
            "currency": currency,
            "txn_id": provider_txn_id,
            "payment_verified": True,
        },
    )
    db.add(activity)

    await db.flush()

    if webinar:
        try:
            from app.services import email_service
            await email_service.send_registration_confirmation_email(registrant, webinar)
        except Exception:
            pass

    return payment


class RazorpayOrderResult:
    def __init__(self, order_id: str, amount: int, currency: str, key_id: str):
        self.order_id = order_id
        self.amount = amount
        self.currency = currency
        self.key_id = key_id


async def create_razorpay_order(
    db: AsyncSession,
    *,
    registrant: Registrant,
    webinar: Webinar,
) -> RazorpayOrderResult:
    """Create a Razorpay order for a registrant."""
    if getattr(webinar, 'is_paid', False) and getattr(webinar, 'price_cents', 0) > 0:
        amount_cents = webinar.price_cents
        currency = (getattr(webinar, 'currency', 'inr') or 'inr').upper()
    else:
        raise PaymentError("This webinar is free - no payment required", "NO_PAYMENT_NEEDED")

    # Razorpay amounts: for INR use paise (amount_cents already in cents = paise)
    # For USD, Razorpay expects amount in smallest unit too
    razorpay_amount = amount_cents

    # Look up organization-level custom Razorpay keys first, fallback to environment
    from app.models import Organization
    org = (await db.execute(select(Organization).where(Organization.id == webinar.organization_id))).scalar_one_or_none()
    org_settings = getattr(org, "settings", {}) or {}

    razorpay_key_id = (org_settings.get("razorpay_key_id") or os.getenv('RAZORPAY_KEY_ID', '')).strip()
    razorpay_key_secret = (org_settings.get("razorpay_key_secret") or os.getenv('RAZORPAY_KEY_SECRET', '')).strip()

    if not razorpay_key_id or not razorpay_key_secret or razorpay_key_id.startswith('rzp_test_your'):
        raise PaymentError(
            "Razorpay is not configured. Please set valid RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Dashboard Settings.",
            code="RAZORPAY_NOT_CONFIGURED",
        )

    # Prevent duplicate payment records for the same registrant
    existing_payment = (
        await db.execute(
            select(Payment).where(
                Payment.registrant_id == registrant.id,
                Payment.webinar_id == webinar.id,
                Payment.status == PaymentStatus.pending,
            )
        )
    ).scalar_one_or_none()
    if existing_payment:
        return RazorpayOrderResult(
            order_id=existing_payment.checkout_session_id,
            amount=razorpay_amount,
            currency=currency,
            key_id=razorpay_key_id,
        )

    try:
        import razorpay as rzp_sdk
        client = rzp_sdk.Client(auth=(razorpay_key_id, razorpay_key_secret))
        order_data = client.order.create({
            'amount': razorpay_amount,
            'currency': currency,
            'receipt': str(registrant.id)[:40],
            'notes': {
                'webinar_id': str(webinar.id),
                'registrant_id': str(registrant.id),
                'organization_id': str(webinar.organization_id),
            },
        })

        payment = Payment(
            registrant_id=registrant.id,
            webinar_id=webinar.id,
            organization_id=webinar.organization_id,
            amount=Decimal(str(amount_cents / 100)),
            currency=currency.lower(),
            provider=PaymentProvider.razorpay,
            checkout_session_id=order_data['id'],
            status=PaymentStatus.pending,
        )
        db.add(payment)
        await db.flush()

        return RazorpayOrderResult(
            order_id=order_data['id'],
            amount=razorpay_amount,
            currency=currency,
            key_id=razorpay_key_id,
        )
    except Exception as e:
        raise PaymentError(f"Razorpay order creation failed: {e}", code='RAZORPAY_ERROR')


async def verify_razorpay_payment(
    db: AsyncSession,
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    registrant_id: uuid.UUID,
) -> Payment:
    """Verify Razorpay payment signature and mark payment as completed."""
    # Find registrant & webinar for org settings
    registrant = (await db.execute(select(Registrant).where(Registrant.id == registrant_id))).scalar_one_or_none()
    org_settings = {}
    if registrant:
        webinar = (await db.execute(select(Webinar).where(Webinar.id == registrant.webinar_id))).scalar_one_or_none()
        if webinar:
            from app.models import Organization
            org = (await db.execute(select(Organization).where(Organization.id == webinar.organization_id))).scalar_one_or_none()
            org_settings = getattr(org, "settings", {}) or {}

    razorpay_key_id = (org_settings.get("razorpay_key_id") or os.getenv('RAZORPAY_KEY_ID', '')).strip()
    razorpay_key_secret = (org_settings.get("razorpay_key_secret") or os.getenv('RAZORPAY_KEY_SECRET', '')).strip()

    if not razorpay_key_id or not razorpay_key_secret or razorpay_key_id.startswith('rzp_test_your'):
        raise PaymentError(
            "Razorpay is not configured. Please set valid credentials in Dashboard Settings.",
            code="RAZORPAY_NOT_CONFIGURED",
        )

    try:
        import razorpay as rzp_sdk
        client = rzp_sdk.Client(auth=(razorpay_key_id, razorpay_key_secret))
        client.utility.verify_payment_signature({
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        })
    except Exception as e:
        raise PaymentError(f'Razorpay signature verification failed: {e}', code='SIGNATURE_INVALID')

    # Find payment by order_id
    payment = (
        await db.execute(select(Payment).where(Payment.checkout_session_id == razorpay_order_id))
    ).scalar_one_or_none()
    if not payment:
        raise PaymentError('Payment record not found', code='NOT_FOUND')

    # Idempotency: if payment is already completed, return early
    if payment.status == PaymentStatus.completed:
        return payment

    # Mark payment completed & update registrant
    payment = await process_successful_payment(
        db,
        registrant_id=registrant_id,
        provider="razorpay",
        provider_txn_id=razorpay_payment_id,
        checkout_session_id=razorpay_order_id,
        amount=payment.amount,
        currency=payment.currency,
    )
    return payment


async def verify_stripe_checkout_session(
    db: AsyncSession,
    *,
    session_id: str,
    registrant_id: uuid.UUID,
) -> Payment:
    """Verify a Stripe checkout session when the user returns to the success page."""
    registrant = (await db.execute(select(Registrant).where(Registrant.id == registrant_id))).scalar_one_or_none()
    org_settings = {}
    if registrant:
        webinar = (await db.execute(select(Webinar).where(Webinar.id == registrant.webinar_id))).scalar_one_or_none()
        if webinar:
            from app.models import Organization
            org = (await db.execute(select(Organization).where(Organization.id == webinar.organization_id))).scalar_one_or_none()
            org_settings = getattr(org, "settings", {}) or {}

    stripe_key = (org_settings.get("stripe_secret_key") or os.getenv("STRIPE_SECRET_KEY", "")).strip()
    if not stripe_key or stripe_key.startswith("sk_test_your"):
        raise PaymentError("Stripe is not configured.", code="STRIPE_NOT_CONFIGURED")

    stripe.api_key = stripe_key

    try:
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status != "paid":
            raise PaymentError("Payment has not been completed", code="PAYMENT_NOT_PAID")

        amount_cents = session.amount_total or 0
        currency = session.currency or "usd"
        payment_intent = session.payment_intent

        payment = await process_successful_payment(
            db,
            registrant_id=registrant_id,
            provider="stripe",
            provider_txn_id=str(payment_intent) if payment_intent else session_id,
            checkout_session_id=session_id,
            amount=Decimal(str(amount_cents)) / 100,
            currency=currency,
        )
        return payment
    except stripe.error.StripeError as e:
        raise PaymentError(f"Stripe error: {e}", code="STRIPE_ERROR")


async def get_payment_stats(db: AsyncSession, organization_id: uuid.UUID) -> dict:
    """Get aggregated payment statistics for an organization."""
    from sqlalchemy import func

    result = await db.execute(
        select(
            func.count(Payment.id).label("total_payments"),
            func.sum(Payment.amount).filter(Payment.status == PaymentStatus.completed).label("total_revenue"),
            func.count(Payment.id).filter(Payment.status == PaymentStatus.completed).label("completed"),
            func.count(Payment.id).filter(Payment.status == PaymentStatus.pending).label("pending"),
            func.count(Payment.id).filter(Payment.status == PaymentStatus.failed).label("failed"),
            func.sum(Payment.refund_amount).label("refunded_amount"),
        ).where(Payment.organization_id == organization_id)
    )
    row = result.one()
    return {
        "total_payments": row.total_payments or 0,
        "total_revenue": row.total_revenue or Decimal("0"),
        "completed": row.completed or 0,
        "pending": row.pending or 0,
        "failed": row.failed or 0,
        "refunded_amount": row.refunded_amount or Decimal("0"),
    }
