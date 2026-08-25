"""Payment schemas — request/response models for the payments API.

These Pydantic models define the wire format for:
- Creating checkout sessions
- Handling Stripe/Razorpay webhooks
- Listing payment records in the dashboard
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


# --- Enums (mirror models for API responses) ---


class PaymentStatus(str):
    """Payment status values for API responses."""

    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentProvider(str):
    """Payment provider values for API responses."""

    STRIPE = "stripe"
    RAZORPAY = "razorpay"


# --- Request schemas ---


class CreateCheckoutRequest(BaseModel):
    """Request to create a checkout session (Stripe) or order (Razorpay)."""

    registrant_id: uuid.UUID
    success_url: str | None = None
    cancel_url: str | None = None


# --- Response schemas ---


class CheckoutSessionResponse(BaseModel):
    """Response after creating a Stripe checkout session."""

    url: str
    session_id: str


class RazorpayOrderResponse(BaseModel):
    """Response after creating a Razorpay order."""

    order_id: str
    amount: int  # in paise
    currency: str
    key_id: str


class PaymentRecord(BaseModel):
    """A payment record for the dashboard list."""

    id: uuid.UUID
    registrant_id: uuid.UUID
    webinar_id: uuid.UUID
    organization_id: uuid.UUID
    amount: Decimal
    currency: str
    provider: str
    provider_txn_id: str | None
    checkout_session_id: str | None
    status: str
    failure_code: str | None
    failure_message: str | None
    refunded_at: datetime | None
    refund_amount: Decimal | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Stripe webhook schemas ---


class StripeObjectData(BaseModel):
    """Stripe event data.object for checkout.session.completed."""

    id: str
    object: str = "checkout.session"
    client_reference_id: str | None = None
    payment_intent: str | None = None
    amount_total: int | None = None
    currency: str | None = None
    customer: str | None = None
    metadata: dict[str, str] | None = None


class StripeEventData(BaseModel):
    """Stripe event.data wrapper."""

    object: StripeObjectData


class StripeWebhookPayload(BaseModel):
    """Stripe webhook event payload.

    We only handle checkout.session.completed events; other types are ignored.
    """

    id: str
    object: str = "event"
    type: str
    data: StripeEventData


# --- Razorpay webhook schemas ---


class RazorpayPaymentEntity(BaseModel):
    """Razorpay payload.payment.entity for payment.captured."""

    id: str
    entity: str = "payment"
    amount: int
    currency: str
    status: str
    order_id: str | None = None
    invoice_id: str | None = None
    method: str | None = None
    notes: dict[str, str] = Field(default_factory=dict)


class RazorpayPaymentPayload(BaseModel):
    """Razorpay payload.payment wrapper."""

    entity: RazorpayPaymentEntity


class RazorpayWebhookPayload(BaseModel):
    """Razorpay webhook event payload.

    We only handle payment.captured events; other types are ignored.
    """

    entity: str = "event"
    event: str
    notes: dict[str, str] | None = None
    payload: RazorpayPaymentPayload


# --- Payment stats for dashboard ---


class PaymentStats(BaseModel):
    """Aggregated payment statistics for a webinar or organization."""

    total_revenue: Decimal
    total_payments: int
    completed_payments: int
    pending_payments: int
    failed_payments: int
    refunded_amount: Decimal
    currency: str = "usd"
