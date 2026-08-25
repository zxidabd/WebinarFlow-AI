"""Payment model — records of successful and failed transactions.

Each payment is linked to a registrant (the person who paid), a webinar,
and an organization for multi-tenant scoping. Supports both Stripe and
Razorpay as payment providers.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db import Base
from app.models.base import TimestampMixin, UUIDMixin


class PaymentStatus(str, enum.Enum):
    """Lifecycle states for a payment record."""

    pending = "pending"      # Checkout session created, awaiting payment
    completed = "completed"  # Payment successful
    failed = "failed"        # Payment failed or declined
    refunded = "refunded"    # Payment was refunded


class PaymentProvider(str, enum.Enum):
    """Supported payment providers."""

    stripe = "stripe"
    razorpay = "razorpay"


class Payment(UUIDMixin, TimestampMixin, Base):
    """A payment record linked to a registrant's purchase.

    Created when a checkout session is initiated, updated when webhooks
    confirm success or failure. The `provider_txn_id` is the Stripe
    payment_intent ID or Razorpay payment ID for reconciliation.
    """

    __tablename__ = "payments"

    # Core relationships
    registrant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    webinar_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Payment details
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="usd", server_default="usd")
    provider: Mapped[PaymentProvider] = mapped_column(
        Enum(PaymentProvider, name="payment_provider", native_enum=False, length=16),
        nullable=False,
    )
    provider_txn_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    checkout_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)

    # Status tracking
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status", native_enum=False, length=16),
        nullable=False,
        default=PaymentStatus.pending,
        server_default=PaymentStatus.pending,
    )

    # Failure info (if any)
    failure_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    failure_message: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Refund tracking
    refunded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    refund_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Relationships
    registrant = relationship("Registrant")
    webinar = relationship("Webinar")
    organization = relationship("Organization")
