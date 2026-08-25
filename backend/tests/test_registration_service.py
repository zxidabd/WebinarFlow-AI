"""Tests for the registration service layer.

Exercises the registration cascade: create, capacity checks,
re-activation, cancellation, and check-in.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Registrant, RegistrantStatus, Webinar, WebinarStatus
from app.services import registration_service


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_webinar(session: AsyncSession) -> Webinar:
    """Create a test webinar for registration tests."""
    org_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    webinar = Webinar(
        organization_id=org_id,
        created_by=user_id,
        title="Test Webinar",
        slug="test-webinar",
        status=WebinarStatus.scheduled,
        capacity=100,
    )
    session.add(webinar)
    await session.flush()
    return webinar


# ── Registration ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_new_registrant(session: AsyncSession, test_webinar: Webinar):
    """Register a new person for a webinar."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="test@example.com",
        full_name="Test User",
    )
    await session.commit()

    assert registrant.id is not None
    assert registrant.email == "test@example.com"
    assert registrant.full_name == "Test User"
    assert registrant.status == RegistrantStatus.registered
    assert registrant.webinar_id == test_webinar.id

    # Counter incremented
    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 1


@pytest.mark.asyncio
async def test_register_email_normalized(session: AsyncSession, test_webinar: Webinar):
    """Email is lowercased and stripped."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="  TEST@Example.COM  ",
        full_name="Test",
    )
    await session.commit()

    assert registrant.email == "test@example.com"


@pytest.mark.asyncio
async def test_register_capacity_check(session: AsyncSession):
    """Registration fails when capacity is exceeded."""
    org_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    user_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    webinar = Webinar(
        organization_id=org_id,
        created_by=user_id,
        title="Full Webinar",
        slug="full-webinar",
        status=WebinarStatus.scheduled,
        capacity=2,
        registration_count=2,  # Already at capacity
    )
    session.add(webinar)
    await session.flush()

    with pytest.raises(registration_service.CapacityExceededError):
        await registration_service.register_for_webinar(
            session,
            webinar=webinar,
            email="new@example.com",
        )


@pytest.mark.asyncio
async def test_register_duplicate_email(session: AsyncSession, test_webinar: Webinar):
    """Re-registering with same email updates the existing record."""
    # First registration
    r1 = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="dup@example.com",
        full_name="First Name",
    )
    await session.commit()
    first_id = r1.id
    first_registered_at = r1.registered_at

    # Second registration with same email
    r2 = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="dup@example.com",
        full_name="Updated Name",
    )
    await session.commit()

    # Same record, updated fields
    assert r2.id == first_id
    assert r2.full_name == "Updated Name"
    # Compare timestamps - handle timezone-aware vs naive comparison
    r2_time = r2.registered_at.replace(tzinfo=None) if r2.registered_at.tzinfo else r2.registered_at
    first_time = first_registered_at.replace(tzinfo=None) if first_registered_at.tzinfo else first_registered_at
    assert r2_time > first_time  # Timestamp updated

    # Counter should NOT increment (same person)
    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 1


@pytest.mark.asyncio
async def test_register_reactivate_cancelled(session: AsyncSession, test_webinar: Webinar):
    """Re-registering a cancelled registrant re-activates them."""
    # Register
    r = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="reactivate@example.com",
    )
    await session.commit()
    assert r.status == RegistrantStatus.registered
    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 1

    # Cancel
    await registration_service.cancel_registration(
        session, webinar=test_webinar, registrant=r
    )
    await session.commit()
    await session.refresh(r)
    assert r.status == RegistrantStatus.cancelled
    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 0

    # Re-register (reactivate)
    r2 = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="reactivate@example.com",
    )
    await session.commit()

    assert r2.id == r.id
    assert r2.status == RegistrantStatus.registered
    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 1  # Incremented again


# ── UTM Attribution ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_utm_params(session: AsyncSession, test_webinar: Webinar):
    """UTM parameters are stored on the registrant."""
    utm = registration_service.UTM(
        source="google",
        medium="cpc",
        campaign="summer-sale",
        content="banner-ad",
        term="webinar software",
        referrer="https://example.com",
    )

    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="utm@example.com",
        utm=utm,
    )
    await session.commit()

    assert registrant.utm_source == "google"
    assert registrant.utm_medium == "cpc"
    assert registrant.utm_campaign == "summer-sale"
    assert registrant.utm_content == "banner-ad"
    assert registrant.utm_term == "webinar software"
    assert registrant.referrer == "https://example.com"


@pytest.mark.asyncio
async def test_register_ip_hashed(session: AsyncSession, test_webinar: Webinar):
    """Client IP is hashed, not stored in plain."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="ip@example.com",
        client_ip="192.168.1.1",
    )
    await session.commit()

    assert registrant.ip_hash is not None
    assert registrant.ip_hash != "192.168.1.1"  # Not plaintext
    assert len(registrant.ip_hash) == 64  # SHA-256 hex length


# ── Landing Page Attribution ────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_landing_page_link(session: AsyncSession, test_webinar: Webinar):
    """Registration can be linked to a landing page."""
    from app.models import LandingPage

    lp = LandingPage(
        webinar_id=test_webinar.id,
        organization_id=test_webinar.organization_id,
        created_by=test_webinar.created_by,
        title="Test LP",
        slug="test-lp",
    )
    session.add(lp)
    await session.flush()

    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="lp@example.com",
        landing_page_id=lp.id,
    )
    await session.commit()

    assert registrant.landing_page_id == lp.id


# ── Activity Log ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_creates_activity(session: AsyncSession, test_webinar: Webinar):
    """Registration creates a WebinarActivity entry."""
    from app.models import WebinarActivity

    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="activity@example.com",
        full_name="Activity Test",
    )
    await session.commit()

    # Find the activity
    activities = (await session.execute(
        __import__("sqlalchemy", fromlist=["select"]).select(WebinarActivity)
        .where(WebinarActivity.registrant_id == registrant.id)
    )).scalars().all()

    assert len(activities) == 1
    assert activities[0].event_type == "registered"
    assert activities[0].meta["email"] == "activity@example.com"
    assert activities[0].meta["full_name"] == "Activity Test"


# ── Cancellation ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cancel_registration(session: AsyncSession, test_webinar: Webinar):
    """Cancel a registration."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="cancel@example.com",
    )
    await session.commit()

    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 1

    await registration_service.cancel_registration(
        session, webinar=test_webinar, registrant=registrant, reason="User requested"
    )
    await session.commit()

    await session.refresh(registrant)
    assert registrant.status == RegistrantStatus.cancelled

    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 0


@pytest.mark.asyncio
async def test_cancel_idempotent(session: AsyncSession, test_webinar: Webinar):
    """Cancelling an already-cancelled registration is idempotent."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="idempotent@example.com",
    )
    await session.commit()

    await registration_service.cancel_registration(
        session, webinar=test_webinar, registrant=registrant
    )
    await session.commit()

    # Cancel again - should not raise or decrement counter further
    await registration_service.cancel_registration(
        session, webinar=test_webinar, registrant=registrant
    )
    await session.commit()

    await session.refresh(test_webinar)
    assert test_webinar.registration_count == 0


# ── Check-in / Attendance ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_check_in_attendee(session: AsyncSession, test_webinar: Webinar):
    """Check in an attendee."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="checkin@example.com",
    )
    await session.commit()

    attendance = await registration_service.check_in_attendee(
        session,
        webinar=test_webinar,
        registrant=registrant,
    )
    await session.commit()

    assert attendance.id is not None
    assert attendance.webinar_id == test_webinar.id
    assert attendance.registrant_id == registrant.id
    assert attendance.joined_at is not None

    # Status upgraded to attended
    await session.refresh(registrant)
    assert registrant.status == RegistrantStatus.attended

    # Attendance count incremented
    await session.refresh(test_webinar)
    assert test_webinar.attendance_count == 1


@pytest.mark.asyncio
async def test_check_in_with_duration(session: AsyncSession, test_webinar: Webinar):
    """Check-in with join and leave times calculates duration."""
    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="duration@example.com",
    )
    await session.commit()

    joined = datetime.now(timezone.utc)
    left = joined + __import__("datetime").timedelta(hours=1, minutes=30)

    attendance = await registration_service.check_in_attendee(
        session,
        webinar=test_webinar,
        registrant=registrant,
        joined_at=joined,
        left_at=left,
    )
    await session.commit()

    assert attendance.duration_seconds == 5400  # 1.5 hours in seconds


@pytest.mark.asyncio
async def test_check_in_creates_activity(session: AsyncSession, test_webinar: Webinar):
    """Check-in creates an attended activity entry."""
    from app.models import WebinarActivity

    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="checkin-activity@example.com",
    )
    await session.commit()

    await registration_service.check_in_attendee(
        session,
        webinar=test_webinar,
        registrant=registrant,
    )
    await session.commit()

    activities = (await session.execute(
        __import__("sqlalchemy", fromlist=["select"]).select(WebinarActivity)
        .where(WebinarActivity.registrant_id == registrant.id)
    )).scalars().all()

    event_types = [a.event_type for a in activities]
    assert "registered" in event_types
    assert "attended" in event_types


# ── Custom Fields ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_custom_fields(session: AsyncSession, test_webinar: Webinar):
    """Custom registration fields are stored as JSON."""
    custom = {"company": "Acme Corp", "job_title": "Engineer", "phone": "+1234567890"}

    registrant = await registration_service.register_for_webinar(
        session,
        webinar=test_webinar,
        email="custom@example.com",
        custom_fields=custom,
    )
    await session.commit()

    assert registrant.custom_fields == custom
