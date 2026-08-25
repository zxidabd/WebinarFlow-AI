"""The `Organization` — the multi-tenancy boundary.

All tenant-scoped data created in later phases (webinars, funnels, leads,
campaigns) will carry an `organization_id` FK to this table, enforcing
isolation. Each user gets a personal organization on signup, and may
create/join additional shared organizations.
"""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db import Base
from app.models.base import TimestampMixin, UUIDMixin


class Organization(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True, nullable=False)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    # A "personal" org is auto-created on signup and cannot be left/deleted
    # via member management; shared orgs are user-created.
    is_personal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    members: Mapped[list["Membership"]] = relationship(  # type: ignore[name-defined]
        "Membership", back_populates="organization", cascade="all, delete-orphan"
    )
    owner = relationship("User", foreign_keys=[owner_user_id])
