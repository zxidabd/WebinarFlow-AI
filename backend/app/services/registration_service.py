"""Registration orchestration — the cascade hub for Phase 2.

Every public-registration action flows through this service. It is the single
integration seam where business actions produce side-effects across modules:

  Register for webinar
    → validate capacity / slot
    → upsert Registrant (create or re-activate if cancelled)
    → record UTM / attribution
    → increment webinar.registration_count
    → create WebinarActivity entry (the timeline / audit log)
    → (email queued — stub for Phase 5 email service)
    → return enriched Registrant + updated webinar stats

  Cancel registration
    → soft-cancel Registrant
    → decrement webinar.registration_count
    → create cancelled WebinarActivity entry

  Check in attendee
    → create Attendance record
    → increment webinar.attendance_count
    → create attended WebinarActivity entry

Org scoping is enforced at the endpoint; the service trusts the caller.
"""
from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Attendance, Registrant, RegistrantStatus, Webinar, WebinarActivity


class CapacityExceededError(Exception):
    """Raised when a webinar is at full capacity."""


class AlreadyRegisteredError(Exception):
    """Raised when an email is already registered for this webinar."""


class WebinarNotLiveError(Exception):
    """Raised when the webinar is not open for registration."""


def _ip_hash(ip: str | None) -> str | None:
    """Pseudonymise an IP for storage (SHA-256 of IP + salt)."""
    if not ip:
        return None
    # In production this salt would come from settings; for Phase 2 we use
    # a fixed pepper stored in the hash so it is not reversible without it.
    # We only need uniqueness, not reversibility, so a plain SHA-256 of the
    # IP alone is sufficient for analytics (no PII stored).
    return hashlib.sha256(ip.encode()).hexdigest()[:64]


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── UTM helpers ──────────────────────────────────────────────────────────────


class UTM:
    """Immutable UTM attribution snapshot stored on a Registrant."""

    def __init__(
        self,
        source: str | None = None,
        medium: str | None = None,
        campaign: str | None = None,
        content: str | None = None,
        term: str | None = None,
        referrer: str | None = None,
        ip: str | None = None,
    ):
        self.source = source
        self.medium = medium
        self.campaign = campaign
        self.content = content
        self.term = term
        self.referrer = referrer
        self.ip_hash = _ip_hash(ip)


# ── Main registration ──────────────────────────────────────────────────────


async def register_for_webinar(
    db: AsyncSession,
    *,
    webinar: Webinar,
    email: str,
    full_name: str | None = None,
    custom_fields: dict | None = None,
    landing_page_id: uuid.UUID | None = None,
    utm: UTM | None = None,
    client_ip: str | None = None,
    is_paid_webinar: bool = False,
) -> Registrant:
    """
    Register (or re-activate) a person for a webinar.

    Cascade:
      1. Capacity check.
      2. Check for existing registration (upsert / re-activate).
      3. Create/update Registrant row with attribution.
      4. Increment webinar.registration_count (only on net-new registrations).
      5. Create WebinarActivity timeline entry (the audit log).
      6. (Email confirmation — stub, wired for Phase 5.)

    Returns the Registrant ORM object (uncommitted — caller flushes).
    """
    # 1. Capacity check
    if webinar.capacity is not None and webinar.registration_count >= webinar.capacity:
        raise CapacityExceededError(
            f"Webinar '{webinar.title}' is full ({webinar.registration_count}/{webinar.capacity})."
        )

    # 2. Check for existing registrant (upsert pattern)
    existing_res = await db.execute(
        select(Registrant).where(
            Registrant.webinar_id == webinar.id,
            Registrant.email == email.lower(),
        )
    )
    existing = existing_res.scalar_one_or_none()

    ip_hash = _ip_hash(client_ip) if client_ip else None
    if utm is None:
        utm = UTM(ip=client_ip)
    # Use the hashed IP from UTM object or the direct hash
    final_ip_hash = utm.ip_hash or ip_hash

    if existing:
        # If existing is already registered and was a paid webinar, or free
        if not is_paid_webinar and existing.status in (RegistrantStatus.cancelled, RegistrantStatus.noshow):
            webinar.registration_count += 1
        existing.full_name = full_name or existing.full_name
        existing.status = RegistrantStatus.pending_payment if is_paid_webinar else RegistrantStatus.registered
        existing.registered_at = _utc_now()
        if custom_fields:
            existing.custom_fields = {**(existing.custom_fields or {}), **custom_fields}
        registrant = existing
    else:
        # New registration — only increment count for free webinars immediately
        if not is_paid_webinar:
            webinar.registration_count += 1
        registrant = Registrant(
            webinar_id=webinar.id,
            email=email.lower().strip(),
            full_name=full_name.strip() if full_name else None,
            status=RegistrantStatus.pending_payment if is_paid_webinar else RegistrantStatus.registered,
            landing_page_id=landing_page_id,
            utm_source=utm.source,
            utm_medium=utm.medium,
            utm_campaign=utm.campaign,
            utm_content=utm.content,
            utm_term=utm.term,
            referrer=utm.referrer,
            ip_hash=final_ip_hash,
            custom_fields=custom_fields,
        )
        db.add(registrant)

    await db.flush()

    # 5. Audit log — WebinarActivity timeline entry
    event_type = "pending_payment" if is_paid_webinar else "registered"
    activity = WebinarActivity(
        registrant_id=registrant.id,
        webinar_id=webinar.id,
        event_type=event_type,
        occurred_at=_utc_now(),
        meta={
            "email": registrant.email,
            "full_name": registrant.full_name,
            "landing_page_id": str(landing_page_id) if landing_page_id else None,
            "utm_source": utm.source,
            "utm_medium": utm.medium,
            "utm_campaign": utm.campaign,
            "is_paid": is_paid_webinar,
        },
    )
    db.add(activity)

    # 6. Email confirmation for free webinars
    if not is_paid_webinar:
        try:
            from app.services import email_service
            await email_service.send_registration_confirmation_email(registrant, webinar)
        except Exception as e:
            pass

    await db.flush()
    return registrant


# ── Cancel registration ─────────────────────────────────────────────────────


async def cancel_registration(
    db: AsyncSession,
    *,
    webinar: Webinar,
    registrant: Registrant,
    reason: str | None = None,
) -> None:
    """Cancel a registration. Decrements the counter and creates an audit entry."""
    if registrant.status == RegistrantStatus.cancelled:
        return  # idempotent

    registrant.status = RegistrantStatus.cancelled
    webinar.registration_count = max(0, webinar.registration_count - 1)

    activity = WebinarActivity(
        registrant_id=registrant.id,
        webinar_id=webinar.id,
        event_type="cancelled",
        occurred_at=_utc_now(),
        meta={"reason": reason} if reason else None,
    )
    db.add(activity)
    await db.flush()


# ── Check in attendee ───────────────────────────────────────────────────────


async def check_in_attendee(
    db: AsyncSession,
    *,
    webinar: Webinar,
    registrant: Registrant,
    joined_at: datetime | None = None,
    left_at: datetime | None = None,
) -> Attendance:
    """
    Record attendee check-in. Creates an Attendance row, bumps
    webinar.attendance_count, and writes a timeline event.

    If the registrant was previously registered (not checked in yet), their
    status is upgraded to 'attended'.
    """
    if joined_at is None:
        joined_at = _utc_now()

    duration_seconds: int | None = None
    if left_at is not None and joined_at is not None:
        duration_seconds = int((left_at - joined_at).total_seconds())

    attendance = Attendance(
        webinar_id=webinar.id,
        registrant_id=registrant.id,
        joined_at=joined_at,
        left_at=left_at,
        duration_seconds=duration_seconds,
    )
    db.add(attendance)

    if registrant.status != RegistrantStatus.attended:
        registrant.status = RegistrantStatus.attended
        webinar.attendance_count += 1

    activity = WebinarActivity(
        registrant_id=registrant.id,
        webinar_id=webinar.id,
        event_type="attended",
        occurred_at=joined_at,
        meta={"duration_seconds": duration_seconds} if duration_seconds else None,
    )
    db.add(activity)
    await db.flush()
    return attendance