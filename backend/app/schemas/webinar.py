"""Pydantic schemas for Webinar CRUD.

Wire convention is camelCase (matching the auth schemas); however the Webinar
ORM columns themselves are snake_case so we keep pydantic field names as-is and
rely on attribute access via ``from_attributes=True``. Enum fields serialize to
their string value (``use_enum_values=True``) so the API returns plain strings.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.webinar import MeetingProvider, RegistrantStatus, WebinarStatus


# --- Create / Update payloads ------------------------------------------------- #


class WebinarCreate(BaseModel):
    """Payload for creating a webinar. Organization is resolved from X-Organization-Id."""

    title: str = Field(..., min_length=1, max_length=255, description="Webinar title")
    description: str | None = Field(default=None, max_length=4000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str = Field(default="UTC", max_length=64)
    capacity: int | None = Field(default=None, ge=1)
    status: WebinarStatus = Field(default=WebinarStatus.draft)
    provider: MeetingProvider = Field(default=MeetingProvider.none)
    location_type: str = Field(default="online", max_length=16)
    ai_topic: str | None = Field(default=None, max_length=512)
    is_published: bool = False
    is_paid: bool = False
    price_cents: int = Field(default=0, ge=0, description="Price in cents (e.g. 1999 = $19.99). Required > 0 when is_paid=True.")
    currency: str = Field(default="usd", max_length=3, description="ISO 4217 currency code, e.g. usd, inr, eur")
    payment_gateway: str = Field(default="stripe", max_length=16, description="Payment gateway: stripe or razorpay")

    @model_validator(mode="after")
    def _price_required_when_paid(self):
        if self.is_paid and self.price_cents <= 0:
            raise ValueError("price_cents must be greater than 0 for paid webinars")
        return self

    @field_validator("title")
    @classmethod
    def _strip_title(cls, v: str) -> str:
        return v.strip()


class WebinarUpdate(BaseModel):
    """Payload for updating a webinar. All fields optional; org scoping enforced by endpoint."""

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str | None = Field(default=None, max_length=64)
    capacity: int | None = Field(default=None, ge=1)
    status: WebinarStatus | None = None
    provider: MeetingProvider | None = None
    location_type: str | None = Field(default=None, max_length=16)
    ai_topic: str | None = Field(default=None, max_length=512)
    is_published: bool | None = None
    is_paid: bool | None = None
    price_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, max_length=3)
    payment_gateway: str | None = Field(default=None, max_length=16)

    @model_validator(mode="after")
    def _price_required_when_paid(self):
        if self.is_paid is True and self.price_cents is not None and self.price_cents <= 0:
            raise ValueError("price_cents must be greater than 0 for paid webinars")
        return self


# --- Read / List schemas ----------------------------------------------------- #


_READ_CONFIG = ConfigDict(from_attributes=True, use_enum_values=True)


class WebinarItem(BaseModel):
    """Compact list item — used in paginated responses."""

    model_config = _READ_CONFIG

    id: UUID
    organization_id: UUID
    title: str
    slug: str
    status: WebinarStatus
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    capacity: int | None = None
    is_published: bool = False
    is_paid: bool = False
    price_cents: int | None = 0
    currency: str | None = "usd"
    payment_gateway: str | None = "stripe"
    # Denormalized counters — updated on every registration/attendance change
    registration_count: int = 0
    attendance_count: int = 0
    visitor_count: int = 0
    created_at: datetime
    updated_at: datetime


class WebinarDetail(BaseModel):
    """Full webinar detail — includes all fields plus agenda JSON."""

    model_config = _READ_CONFIG

    id: UUID
    organization_id: UUID
    created_by: UUID
    title: str
    slug: str
    description: str | None = None
    status: WebinarStatus
    provider: MeetingProvider | None = MeetingProvider.none
    provider_meeting_id: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    timezone: str = "UTC"
    capacity: int | None = None
    location_type: str = "online"
    agenda: dict[str, Any] | None = None
    ai_topic: str | None = None
    is_published: bool = False
    is_paid: bool = False
    price_cents: int | None = 0
    currency: str | None = "usd"
    payment_gateway: str | None = "stripe"
    registration_count: int = 0
    attendance_count: int = 0
    visitor_count: int = 0
    created_at: datetime
    updated_at: datetime


class WebinarListResponse(BaseModel):
    """Paginated list envelope."""

    items: list[WebinarItem]
    total: int
    limit: int
    offset: int


class WebinarDuplicateResponse(BaseModel):
    """Result of duplicating a webinar."""

    original_id: UUID
    duplicate_id: UUID
    duplicate_slug: str


# --- Registrant schemas ------------------------------------------------------ #


class RegistrantCreate(BaseModel):
    """Public registrant payload."""

    email: str = Field(..., max_length=255, description="Registrant email")
    first_name: str | None = Field(default=None, max_length=128)
    last_name: str | None = Field(default=None, max_length=128)
    custom_fields: dict[str, Any] | None = None
    utm_source: str | None = Field(default=None, max_length=128)
    utm_medium: str | None = Field(default=None, max_length=128)
    utm_campaign: str | None = Field(default=None, max_length=128)
    referrer: str | None = Field(default=None, max_length=512)
    landing_page_id: UUID | None = None

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class RegistrantItem(BaseModel):
    """Registrant detail for admin list."""

    model_config = _READ_CONFIG

    id: UUID
    webinar_id: UUID
    email: str
    first_name: str | None
    last_name: str | None
    status: RegistrantStatus
    registered_at: datetime
    attended: bool
    attended_at: datetime | None
    join_token: str
    custom_fields: dict[str, Any] | None


class RegistrantListResponse(BaseModel):
    """Paginated registrants list."""

    items: list[RegistrantItem]
    total: int
    limit: int
    offset: int


class RegistrationResponse(BaseModel):
    """Response after successful public registration."""

    id: UUID
    webinar_id: UUID
    email: str
    join_url: str
    status: RegistrantStatus
    registered_at: datetime


# --- Attendance schemas ------------------------------------------------------ #


class AttendanceCheckIn(BaseModel):
    """Payload to record attendee presence."""

    join_token: str = Field(..., min_length=1)
    duration_seconds: int = Field(default=0, ge=0)


class AttendanceItem(BaseModel):
    """Attendance record."""

    model_config = _READ_CONFIG

    id: UUID
    webinar_id: UUID
    registrant_id: UUID
    joined_at: datetime
    left_at: datetime | None
    duration_seconds: int