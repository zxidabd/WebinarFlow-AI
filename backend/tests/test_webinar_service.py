"""Tests for the webinar service layer.

Exercises the core CRUD operations: create, list, get, update, delete,
duplicate, slug generation, and org-scoping.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Webinar, WebinarStatus, MeetingProvider
from app.services import webinar_service


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def org_id() -> uuid.UUID:
    """A stable org ID for testing (not a real Organization row)."""
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture
async def user_id() -> uuid.UUID:
    """A stable user ID for testing."""
    return uuid.UUID("00000000-0000-0000-0000-000000000002")


# ── Create ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_webinar_minimal(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Create a webinar with only required fields."""
    from app.schemas.webinar import WebinarCreate

    payload = WebinarCreate(title="Test Webinar")
    webinar = await webinar_service.create_webinar(
        session,
        organization_id=org_id,
        created_by=user_id,
        payload=payload,
    )
    await session.commit()

    assert webinar.id is not None
    assert webinar.title == "Test Webinar"
    assert webinar.slug == "test-webinar"
    assert webinar.status == WebinarStatus.draft
    assert webinar.provider == MeetingProvider.none
    assert webinar.organization_id == org_id
    assert webinar.created_by == user_id
    assert webinar.registration_count == 0


@pytest.mark.asyncio
async def test_create_webinar_full(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Create a webinar with all fields."""
    from app.schemas.webinar import WebinarCreate

    starts = datetime.now(timezone.utc) + timedelta(days=7)
    ends = starts + timedelta(hours=2)

    payload = WebinarCreate(
        title="Full Webinar",
        description="A complete test webinar",
        starts_at=starts,
        ends_at=ends,
        timezone="America/New_York",
        capacity=100,
        status=WebinarStatus.scheduled,
        provider=MeetingProvider.zoom,
        location_type="online",
        ai_topic="AI-powered marketing",
        is_published=False,
    )
    webinar = await webinar_service.create_webinar(
        session,
        organization_id=org_id,
        created_by=user_id,
        payload=payload,
    )
    await session.commit()

    assert webinar.title == "Full Webinar"
    assert webinar.description == "A complete test webinar"
    assert webinar.capacity == 100
    assert webinar.status == WebinarStatus.scheduled
    assert webinar.provider == MeetingProvider.zoom


@pytest.mark.asyncio
async def test_create_webinar_slug_generation(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Slug is auto-generated from title and made unique."""
    from app.schemas.webinar import WebinarCreate

    w1 = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="My Webinar"),
    )
    await session.commit()

    w2 = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="My Webinar"),
    )
    await session.commit()

    assert w1.slug == "my-webinar"
    assert w2.slug == "my-webinar-2"


@pytest.mark.asyncio
async def test_create_webinar_slug_special_chars(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Slug handles special characters correctly."""
    from app.schemas.webinar import WebinarCreate

    w = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="AI & Machine Learning! (2024)"),
    )
    await session.commit()

    assert w.slug == "ai-machine-learning-2024"


# ── List ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_webinars_empty(session: AsyncSession, org_id: uuid.UUID):
    """List returns empty for org with no webinars."""
    rows, total = await webinar_service.list_webinars(
        session, organization_id=org_id
    )
    assert rows == []
    assert total == 0


@pytest.mark.asyncio
async def test_list_webinars_org_scoped(session: AsyncSession, user_id: uuid.UUID):
    """List only returns webinars for the given org."""
    from app.schemas.webinar import WebinarCreate

    org1 = uuid.UUID("00000000-0000-0000-0000-000000000001")
    org2 = uuid.UUID("00000000-0000-0000-0000-000000000002")

    await webinar_service.create_webinar(
        session, organization_id=org1, created_by=user_id,
        payload=WebinarCreate(title="Org1 Webinar"),
    )
    await webinar_service.create_webinar(
        session, organization_id=org2, created_by=user_id,
        payload=WebinarCreate(title="Org2 Webinar"),
    )
    await session.commit()

    rows1, total1 = await webinar_service.list_webinars(session, organization_id=org1)
    rows2, total2 = await webinar_service.list_webinars(session, organization_id=org2)

    assert total1 == 1
    assert rows1[0].title == "Org1 Webinar"
    assert total2 == 1
    assert rows2[0].title == "Org2 Webinar"


@pytest.mark.asyncio
async def test_list_webinars_pagination(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Pagination works correctly."""
    from app.schemas.webinar import WebinarCreate

    for i in range(25):
        await webinar_service.create_webinar(
            session, organization_id=org_id, created_by=user_id,
            payload=WebinarCreate(title=f"Webinar {i:02d}"),
        )
    await session.commit()

    page1, total = await webinar_service.list_webinars(
        session, organization_id=org_id, limit=10, offset=0
    )
    page2, total = await webinar_service.list_webinars(
        session, organization_id=org_id, limit=10, offset=10
    )

    assert total == 25
    assert len(page1) == 10
    assert len(page2) == 10


@pytest.mark.asyncio
async def test_list_webinars_status_filter(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Filtering by status works."""
    from app.schemas.webinar import WebinarCreate

    await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Draft", status=WebinarStatus.draft),
    )
    await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Scheduled", status=WebinarStatus.scheduled),
    )
    await session.commit()

    drafts, _ = await webinar_service.list_webinars(
        session, organization_id=org_id, status=WebinarStatus.draft
    )
    scheduled, _ = await webinar_service.list_webinars(
        session, organization_id=org_id, status=WebinarStatus.scheduled
    )

    assert len(drafts) == 1
    assert drafts[0].title == "Draft"
    assert len(scheduled) == 1
    assert scheduled[0].title == "Scheduled"


@pytest.mark.asyncio
async def test_list_webinars_search(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Search filters by title (case-insensitive)."""
    from app.schemas.webinar import WebinarCreate

    await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Marketing Masterclass"),
    )
    await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Sales Summit"),
    )
    await session.commit()

    results, _ = await webinar_service.list_webinars(
        session, organization_id=org_id, search="marketing"
    )

    assert len(results) == 1
    assert results[0].title == "Marketing Masterclass"


# ── Get ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_webinar_success(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Get returns the webinar if org matches."""
    from app.schemas.webinar import WebinarCreate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Test"),
    )
    await session.commit()

    fetched = await webinar_service.get_webinar(
        session, organization_id=org_id, webinar_id=created.id
    )

    assert fetched.id == created.id
    assert fetched.title == "Test"


@pytest.mark.asyncio
async def test_get_webinar_wrong_org(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Get raises WebinarNotFoundError if org doesn't match."""
    from app.schemas.webinar import WebinarCreate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Test"),
    )
    await session.commit()

    other_org = uuid.UUID("00000000-0000-0000-0000-000000000099")

    with pytest.raises(webinar_service.WebinarNotFoundError):
        await webinar_service.get_webinar(
            session, organization_id=other_org, webinar_id=created.id
        )


# ── Update ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_webinar(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Update modifies fields and regenerates slug on title change."""
    from app.schemas.webinar import WebinarCreate, WebinarUpdate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Original Title"),
    )
    await session.commit()

    updated = await webinar_service.update_webinar(
        session, organization_id=org_id, webinar_id=created.id,
        payload=WebinarUpdate(title="New Title", capacity=50),
    )
    await session.commit()

    assert updated.title == "New Title"
    assert updated.slug == "new-title"
    assert updated.capacity == 50


@pytest.mark.asyncio
async def test_update_webinar_partial(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Partial update only modifies provided fields."""
    from app.schemas.webinar import WebinarCreate, WebinarUpdate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Title", description="Original desc"),
    )
    await session.commit()

    updated = await webinar_service.update_webinar(
        session, organization_id=org_id, webinar_id=created.id,
        payload=WebinarUpdate(capacity=200),
    )
    await session.commit()

    assert updated.title == "Title"  # unchanged
    assert updated.description == "Original desc"  # unchanged
    assert updated.capacity == 200  # changed


# ── Delete ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_webinar(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Delete removes the webinar."""
    from app.schemas.webinar import WebinarCreate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="To Delete"),
    )
    await session.commit()

    await webinar_service.delete_webinar(
        session, organization_id=org_id, webinar_id=created.id
    )
    await session.commit()

    with pytest.raises(webinar_service.WebinarNotFoundError):
        await webinar_service.get_webinar(
            session, organization_id=org_id, webinar_id=created.id
        )


@pytest.mark.asyncio
async def test_delete_webinar_wrong_org(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Delete raises error if org doesn't match."""
    from app.schemas.webinar import WebinarCreate

    created = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(title="Test"),
    )
    await session.commit()

    other_org = uuid.UUID("00000000-0000-0000-0000-000000000099")

    with pytest.raises(webinar_service.WebinarNotFoundError):
        await webinar_service.delete_webinar(
            session, organization_id=other_org, webinar_id=created.id
        )


# ── Duplicate ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_duplicate_webinar(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Duplicate creates a copy as a draft."""
    from app.schemas.webinar import WebinarCreate

    original = await webinar_service.create_webinar(
        session, organization_id=org_id, created_by=user_id,
        payload=WebinarCreate(
            title="Original",
            description="Description",
            status=WebinarStatus.scheduled,
            capacity=100,
        ),
    )
    await session.commit()

    dupe = await webinar_service.duplicate_webinar(
        session, organization_id=org_id, webinar_id=original.id
    )
    await session.commit()

    assert dupe.id != original.id
    assert dupe.title == "Original (copy)"
    assert dupe.description == original.description
    assert dupe.status == WebinarStatus.draft  # always draft
    assert dupe.capacity == original.capacity
    assert dupe.slug != original.slug


# ── Slug edge cases ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_slug_collision_many(session: AsyncSession, org_id: uuid.UUID, user_id: uuid.UUID):
    """Slug collision handling works with many duplicates."""
    from app.schemas.webinar import WebinarCreate

    slugs = []
    for i in range(10):
        w = await webinar_service.create_webinar(
            session, organization_id=org_id, created_by=user_id,
            payload=WebinarCreate(title="webinar"),
        )
        await session.commit()
        slugs.append(w.slug)

    # All slugs should be unique
    assert len(set(slugs)) == 10
    assert slugs[0] == "webinar"
    assert slugs[1] == "webinar-2"
    assert slugs[9] == "webinar-10"
