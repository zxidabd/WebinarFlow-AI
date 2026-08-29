"""Webinar domain models — the Phase 2 multi-tenant product surface.

A ``Webinar`` belongs to exactly one ``Organization`` (the tenancy boundary
from Phase 1). Each webinar has many ``Registrant`` rows — and the registrant
table is, deliberately, **also the Customer/Lead data layer**: every person
who interacts with a funnel lives here, with ``status`` tracking their place in
the funnel (visitor → registered → attended → purchased). Later phases (3, 4,
5) add rows and status values to these same tables, never new shapes — that is
the "no major redesign later" guarantee for the dashboard.

``WebinarActivity`` is the per-registrant events timeline (registered,
attended, cancelled, purchased, …) that feeds the customer activity feed and
the analytics counts. ``Attendance`` is the live-session attendance record
(joined/left/duration) — recorded manually in Phase 2, synced from a meeting
provider once the Zoom/Meet adapters land.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid

from app.db import Base
from app.models.base import TimestampMixin, UUIDMixin


# --- statuses --------------------------------------------------------------- #
# Stored as a String-backed enum (name, not value) so adding a new stage later
# is a column-default change, not a schema migration of an enum type (which is
# painful on Postgres). The values are the same strings the dashboard groups by.


class WebinarStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    live = "live"
    completed = "completed"
    cancelled = "cancelled"


class RegistrantStatus(str, enum.Enum):
    """The full customer-funnel stage. Phase 2 uses visitor/registered/attended;
    later phases emit cancelled/noshow/purchased rows without a schema change."""

    visitor = "visitor"
    registered = "registered"
    pending_payment = "pending_payment"
    payment_failed = "payment_failed"
    attended = "attended"
    cancelled = "cancelled"
    noshow = "noshow"
    purchased = "purchased"


class MeetingProvider(str, enum.Enum):
    """Which meeting provider hosts this webinar. ``none`` = manual/own link.
    Zoom/Meet adapters are deferred (Phase 2 keeps this as a future hook)."""

    none = "none"
    zoom = "zoom"
    google_meet = "google_meet"


# --- models ----------------------------------------------------------------- #


class Webinar(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "webinars"
    __table_args__ = (
        UniqueConstraint("organization_id", "slug", name="uq_webinar_org_slug"),
    )

    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[WebinarStatus] = mapped_column(
        Enum(WebinarStatus, name="webinar_status", native_enum=False, length=32),
        nullable=False,
        default=WebinarStatus.draft,
        server_default=WebinarStatus.draft,
    )
    provider: Mapped[MeetingProvider] = mapped_column(
        Enum(MeetingProvider, name="meeting_provider", native_enum=False, length=32),
        nullable=False,
        default=MeetingProvider.none,
        server_default=MeetingProvider.none,
    )
    provider_meeting_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), nullable=False, default="UTC", server_default="UTC")
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location_type: Mapped[str] = mapped_column(String(16), nullable=False, default="online", server_default="online")
    # Free-form agenda / AI topic (Phase 2 stores the wizard's topic here until
    # the agent system populates a structured agenda in Phase 3).
    agenda: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    ai_topic: Mapped[str | None] = mapped_column(String(512), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=func.false())
    # --- pricing ------------------------------------------------------------ #
    is_paid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=func.false())
    price_cents: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="usd", server_default="usd")
    payment_gateway: Mapped[str] = mapped_column(String(16), nullable=False, default="stripe", server_default="stripe")
    # Denormalized counters — kept in sync by the registration service so the
    # dashboard list can render counts without a per-row registrant COUNT(*).
    registration_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    attendance_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    visitor_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    organization = relationship("Organization", lazy="selectin")
    creator = relationship("User", foreign_keys=[created_by], lazy="selectin")
    registrants: Mapped[list["Registrant"]] = relationship(
        "Registrant", back_populates="webinar", cascade="all, delete-orphan", lazy="selectin"
    )
    attendance: Mapped[list["Attendance"]] = relationship(
        "Attendance", back_populates="webinar", cascade="all, delete-orphan", lazy="selectin"
    )


class Registrant(UUIDMixin, TimestampMixin, Base):
    """A registrant IS a customer/contact in the funnel (the Customers section
    + Analytics counts read this table). ``status`` is the stage; the
    per-registrant ``activities`` are the timeline."""

    __tablename__ = "registrants"
    __table_args__ = (
        UniqueConstraint("webinar_id", "email", name="uq_registrant_webinar_email"),
    )

    webinar_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[RegistrantStatus] = mapped_column(
        Enum(RegistrantStatus, name="registrant_status", native_enum=False, length=32),
        nullable=False,
        default=RegistrantStatus.registered,
        server_default=RegistrantStatus.registered,
    )
    registered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    # Phase 3 form-builder hook — arbitrary custom registration answers.
    custom_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # --- integration with Landing Pages ------------------------------------- #
    # Which landing page converted this registration (NULL for direct/JIT regs).
    landing_page_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("landing_pages.id", ondelete="SET NULL"), nullable=True, index=True
    )
    # --- attribution / source tracking — set by the public registration flow #
    utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_term: Mapped[str | None] = mapped_column(String(128), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(512), nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)

    webinar = relationship("Webinar", back_populates="registrants")
    landing_page = relationship("LandingPage")
    attendance: Mapped[list["Attendance"]] = relationship(
        "Attendance", back_populates="registrant", cascade="all, delete-orphan"
    )
    activities: Mapped[list["WebinarActivity"]] = relationship(
        "WebinarActivity", back_populates="registrant", cascade="all, delete-orphan"
    )


class Attendance(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "attendances"
    __table_args__ = (
        UniqueConstraint("webinar_id", "registrant_id", name="uq_attendance_webinar_registrant"),
    )

    webinar_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False, index=True
    )
    registrant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    joined_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    left_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    webinar = relationship("Webinar", back_populates="attendance")
    registrant = relationship("Registrant", back_populates="attendance")


class WebinarActivity(UUIDMixin, TimestampMixin, Base):
    """Per-registrant lifecycle events — the customer activity timeline + a
    source for analytics counts (group by ``event_type`` / day). Generic JSON
    ``meta`` keeps this table shape-stable as new event kinds arrive."""

    __tablename__ = "webinar_activities"

    registrant_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    webinar_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(48), nullable=False, index=True)
    # Used as the natural-ordering column in the timeline (created_at is also
    # set; this is the domain-time event stamp).
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    registrant = relationship("Registrant", back_populates="activities")
