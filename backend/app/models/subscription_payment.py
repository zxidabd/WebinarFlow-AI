"""`SubscriptionPayment` — records every platform subscription purchase.

Each time a user upgrades to Starter or Pro (via Stripe or Razorpay), a row is
inserted here so the superuser can track subscription revenue, gateway usage,
and payment history separately from webinar ticket payments.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db import Base
from app.models.base import TimestampMixin, UUIDMixin


class SubscriptionPayment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "subscription_payments"

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_tier: Mapped[str] = mapped_column(String(20), nullable=False)  # "starter" or "pro"
    billing_cycle: Mapped[str] = mapped_column(String(20), nullable=False, default="monthly")
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="usd")
    provider: Mapped[str] = mapped_column(String(20), nullable=False)  # "stripe" or "razorpay"
    provider_txn_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_order_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")

    # Relationship
    user = relationship("User", lazy="selectin")
