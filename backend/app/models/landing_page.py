"""Landing Page domain models.

A LandingPage belongs to exactly one Webinar (within the same Organization).
Each webinar can have multiple landing pages (one per funnel step: opt-in, thank-you, sales, etc.)
The Funnel Agent (Phase 3) will generate these programmatically; for now we expose CRUD.
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


class LandingPageStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class LandingPageType(str, enum.Enum):
    """Which step in the funnel this page represents."""
    opt_in = "opt_in"           # registration page
    thank_you = "thank_you"     # post-registration confirmation
    sales = "sales"             # sales/checkout page
    replay = "replay"           # on-demand replay page
    custom = "custom"           # arbitrary page


class LandingPage(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "landing_pages"
    __table_args__ = (
        UniqueConstraint("webinar_id", "slug", name="uq_landing_page_webinar_slug"),
    )

    webinar_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False, index=True
    )
    organization_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    status: Mapped[LandingPageStatus] = mapped_column(
        Enum(LandingPageStatus, name="landing_page_status", native_enum=False, length=32),
        nullable=False,
        default=LandingPageStatus.draft,
        server_default=LandingPageStatus.draft,
    )
    page_type: Mapped[LandingPageType] = mapped_column(
        Enum(LandingPageType, name="landing_page_type", native_enum=False, length=32),
        nullable=False,
        default=LandingPageType.opt_in,
        server_default=LandingPageType.opt_in,
    )
    # JSON-stored page content: blocks, sections, styling, form config, etc.
    # Phase 3 Funnel Agent will write structured page JSON here.
    content: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    meta_title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    meta_description: Mapped[str | None] = mapped_column(String(512), nullable=True)
    meta_image: Mapped[str | None] = mapped_column(String(512), nullable=True)
    # SEO / tracking
    custom_head_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    custom_body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Publishing
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    # Template system (Phase 2)
    template_id: Mapped[str | None] = mapped_column(String(64), nullable=True, default=None)

    webinar = relationship("Webinar", backref="landing_pages")
    organization = relationship("Organization")
    creator = relationship("User", foreign_keys=[created_by])


class LandingPageVisit(UUIDMixin, TimestampMixin, Base):
    """Anonymous visit tracking for landing page analytics."""
    __tablename__ = "landing_page_visits"

    landing_page_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("landing_pages.id", ondelete="CASCADE"), nullable=False, index=True
    )
    registrant_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("registrants.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)  # hashed IP for uniqueness
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    utm_source: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_medium: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_campaign: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_content: Mapped[str | None] = mapped_column(String(128), nullable=True)
    utm_term: Mapped[str | None] = mapped_column(String(128), nullable=True)

    landing_page = relationship("LandingPage")