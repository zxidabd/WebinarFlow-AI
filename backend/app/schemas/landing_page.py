"""Landing Page Pydantic schemas.

Wire format is camelCase to match the rest of the API. All models use
from_attributes=True so they can be instantiated directly from ORM objects,
and use_enum_values=True so enums serialize as their string value.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.landing_page import LandingPageStatus, LandingPageType


_READ_CONFIG = ConfigDict(from_attributes=True, use_enum_values=True)


class LandingPageBase(BaseModel):
    model_config = _READ_CONFIG

    title: str = Field(..., min_length=1, max_length=255)
    slug: str | None = Field(default=None, min_length=1, max_length=80)
    status: LandingPageStatus = Field(default=LandingPageStatus.draft)
    page_type: LandingPageType = Field(default=LandingPageType.opt_in)
    # JSON blob – the actual page content (blocks, sections, styling)
    # Populated by the Funnel Agent in Phase 3; for Phase 2 it's a placeholder.
    content: dict[str, Any] | None = None
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=512)
    meta_image: str | None = Field(default=None, max_length=512)
    custom_head_html: str | None = Field(default=None)
    custom_body_html: str | None = Field(default=None)
    is_published: bool = False
    template_id: str | None = Field(default="modern-saas", max_length=64)
    is_paid: bool = False
    price_cents: int = 0
    currency: str = "usd"
    payment_gateway: str = "stripe"


class LandingPageCreate(LandingPageBase):
    """Payload for creating a landing page. webinar_id is required to scope the page."""
    webinar_id: uuid.UUID = Field(...)


class LandingPageUpdate(BaseModel):
    model_config = _READ_CONFIG

    title: str | None = Field(default=None, min_length=1, max_length=255)
    page_type: LandingPageType | None = None
    content: dict[str, Any] | None = None
    meta_title: str | None = Field(default=None, max_length=255)
    meta_description: str | None = Field(default=None, max_length=512)
    meta_image: str | None = Field(default=None, max_length=512)
    custom_head_html: str | None = Field(default=None)
    custom_body_html: str | None = Field(default=None)
    is_published: bool | None = None
    template_id: str | None = Field(default=None, max_length=64)
    is_paid: bool | None = None
    price_cents: int | None = None
    currency: str | None = None
    payment_gateway: str | None = None


class LandingPageItem(BaseModel):
    """Compact list item."""

    model_config = _READ_CONFIG

    id: uuid.UUID
    webinar_id: uuid.UUID
    title: str
    slug: str
    status: LandingPageStatus
    page_type: LandingPageType
    is_published: bool
    template_id: str | None = None
    created_at: datetime
    updated_at: datetime


class LandingPageDetail(LandingPageBase):
    """Full detail – includes foreign keys, audit timestamps, and parent webinar pricing."""

    model_config = _READ_CONFIG

    id: uuid.UUID
    webinar_id: uuid.UUID
    organization_id: uuid.UUID
    created_by: uuid.UUID | None = None
    is_paid: bool = False
    price_cents: int = 0
    currency: str = "usd"
    payment_gateway: str = "stripe"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LandingPageListResponse(BaseModel):
    """Paginated list envelope."""

    model_config = _READ_CONFIG

    items: list[LandingPageItem]
    total: int
    limit: int
    offset: int


class LandingPageDuplicateResponse(BaseModel):
    """Response after duplicating a landing page."""

    model_config = _READ_CONFIG

    original_id: uuid.UUID
    duplicate_id: uuid.UUID
    duplicate_slug: str


# --------------------------- Registration via landing page ----------------------


class PublicRegistrationRequest(BaseModel):
    """Payload submitted by the public opt-in landing page (no auth)."""

    email: str = Field(..., min_length=3, max_length=255)
    full_name: str | None = Field(default=None, max_length=255)
    # UTM parameters – passed as query string by the page
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=128)
    utm_content: str | None = Field(default=None, max_length=128)
    utm_term: str | None = Field(default=None, max_length=128)
    referrer: str | None = Field(default=None, max_length=512)


class PublicRegistrationResponse(BaseModel):
    """Response after a successful public registration."""

    message: str = "Registration successful"
    registrant_id: uuid.UUID
    webinar_id: uuid.UUID
    landing_page_id: uuid.UUID | None = None
    # Echo back the sanitized values for the frontend to show a thank-you screen
    email: str
    full_name: str | None = None


class LandingPageStats(BaseModel):
    """Lightweight stats for the dashboard overview card."""

    model_config = _READ_CONFIG

    id: uuid.UUID
    title: str
    slug: str
    page_type: LandingPageType
    is_published: bool
    visit_count: int
    registration_count: int
    conversion_rate: float  # registrants / visits * 100


class RegistrantItem(BaseModel):
    """A registrant record for listing in the registrations dashboard."""
    model_config = _READ_CONFIG
    id: uuid.UUID
    webinar_id: uuid.UUID
    landing_page_id: uuid.UUID | None = None
    email: str
    full_name: str | None = None
    status: str
    registered_at: datetime
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    created_at: datetime
    updated_at: datetime


class RegistrantDetail(RegistrantItem):
    """Full registrant detail with all attribution fields."""
    utm_content: str | None = None
    utm_term: str | None = None
    referrer: str | None = None
    custom_fields: dict[str, Any] | None = None


class RegistrantListResponse(BaseModel):
    """Paginated list of registrants for a landing page."""
    items: list[RegistrantItem]
    total: int
    limit: int
    offset: int


__all__ = [
    "LandingPageCreate",
    "LandingPageUpdate",
    "LandingPageItem",
    "LandingPageDetail",
    "LandingPageListResponse",
    "LandingPageDuplicateResponse",
    "PublicRegistrationRequest",
    "PublicRegistrationResponse",
    "LandingPageStats",
    "RegistrantItem",
    "RegistrantDetail",
    "RegistrantListResponse",
]