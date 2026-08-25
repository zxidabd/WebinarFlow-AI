"""Tests for the webinar API endpoints.

Exercises the full request/response cycle: auth, org-scoping,
validation, and HTTP status codes.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
import uuid
from datetime import datetime, timezone, timedelta

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Webinar, WebinarStatus
from app.services import webinar_service
from app.schemas.webinar import WebinarCreate

from .conftest import register_and_verify_user, auth_header


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def user_with_org(client: AsyncClient, session: AsyncSession):
    """Register a user, create an org, and return auth headers + org_id."""
    # Register and verify user
    auth = await register_and_verify_user(client, session, "webinar-test@example.com")
    headers = auth_header(auth["accessToken"])

    # Create org
    org_resp = await client.post("/api/v1/organizations", json={"name": "Test Org"}, headers=headers)
    assert org_resp.status_code == 201
    org_id = org_resp.json()["id"]

    # Include X-Organization-Id header so API uses the new org, not the default personal one
    headers["X-Organization-Id"] = org_id

    return {
        "headers": headers,
        "org_id": org_id,
        "user_id": auth["user"]["id"],
    }


# ── List ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_list_webinars_empty(client: AsyncClient, user_with_org):
    """List returns empty list when no webinars exist."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]

    resp = await client.get(
        "/api/v1/webinars",
        headers=headers,
        params={"limit": 20, "offset": 0},
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0


@pytest.mark.asyncio
async def test_list_webinars_requires_auth(client: AsyncClient):
    """List returns 401 without auth."""
    resp = await client.get("/api/v1/webinars")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_webinars_pagination(client: AsyncClient, user_with_org, session: AsyncSession):
    """Pagination works correctly."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    # Create 25 webinars directly via service
    for i in range(25):
        await webinar_service.create_webinar(
            session,
            organization_id=uuid.UUID(org_id),
            created_by=uuid.UUID(user_id),
            payload=WebinarCreate(title=f"Webinar {i}"),
        )
    await session.commit()

    # Fetch first page
    resp = await client.get(
        "/api/v1/webinars",
        headers=headers,
        params={"limit": 10, "offset": 0},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 25
    assert len(data["items"]) == 10

    # Fetch second page
    resp2 = await client.get(
        "/api/v1/webinars",
        headers=headers,
        params={"limit": 10, "offset": 10},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["items"]) == 10


@pytest.mark.asyncio
async def test_list_webinars_status_filter(client: AsyncClient, user_with_org, session: AsyncSession):
    """Filtering by status works."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Draft", status=WebinarStatus.draft),
    )
    await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Scheduled", status=WebinarStatus.scheduled),
    )
    await session.commit()

    resp = await client.get(
        "/api/v1/webinars",
        headers=headers,
        params={"status": "draft"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Draft"


@pytest.mark.asyncio
async def test_list_webinars_search(client: AsyncClient, user_with_org, session: AsyncSession):
    """Search filters by title."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Marketing Masterclass"),
    )
    await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Sales Summit"),
    )
    await session.commit()

    resp = await client.get(
        "/api/v1/webinars",
        headers=headers,
        params={"search": "marketing"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Marketing Masterclass"


# ── Create ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_create_webinar_minimal(client: AsyncClient, user_with_org):
    """Create a webinar with minimal fields."""
    headers = user_with_org["headers"]

    resp = await client.post(
        "/api/v1/webinars",
        headers=headers,
        json={"title": "Test Webinar"},
    )
    assert resp.status_code == 201

    data = resp.json()
    assert data["title"] == "Test Webinar"
    assert data["status"] == "draft"
    assert data["slug"] == "test-webinar"
    assert data["registration_count"] == 0


@pytest.mark.asyncio
async def test_create_webinar_full(client: AsyncClient, user_with_org):
    """Create a webinar with all fields."""
    headers = user_with_org["headers"]

    starts = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
    ends = (datetime.now(timezone.utc) + timedelta(days=7, hours=2)).isoformat()

    resp = await client.post(
        "/api/v1/webinars",
        headers=headers,
        json={
            "title": "Full Webinar",
            "description": "Complete test",
            "starts_at": starts,
            "ends_at": ends,
            "timezone": "America/New_York",
            "capacity": 100,
            "status": "scheduled",
            "provider": "zoom",
            "location_type": "online",
            "ai_topic": "AI Marketing",
            "is_published": False,
        },
    )
    assert resp.status_code == 201

    data = resp.json()
    assert data["title"] == "Full Webinar"
    assert data["capacity"] == 100
    assert data["status"] == "scheduled"
    assert data["provider"] == "zoom"


@pytest.mark.asyncio
async def test_create_webinar_validation_empty_title(client: AsyncClient, user_with_org):
    """Empty title returns validation error."""
    headers = user_with_org["headers"]

    resp = await client.post(
        "/api/v1/webinars",
        headers=headers,
        json={"title": ""},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_webinar_validation_negative_capacity(client: AsyncClient, user_with_org):
    """Negative capacity returns validation error."""
    headers = user_with_org["headers"]

    resp = await client.post(
        "/api/v1/webinars",
        headers=headers,
        json={"title": "Test", "capacity": -10},
    )
    assert resp.status_code == 422


# ── Get ──────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_get_webinar(client: AsyncClient, user_with_org, session: AsyncSession):
    """Get a single webinar by ID."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    created = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Test Webinar"),
    )
    await session.commit()

    resp = await client.get(
        f"/api/v1/webinars/{created.id}",
        headers=headers,
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data["id"] == str(created.id)
    assert data["title"] == "Test Webinar"


@pytest.mark.asyncio
async def test_get_webinar_not_found(client: AsyncClient, user_with_org):
    """Get returns 404 for non-existent webinar."""
    headers = user_with_org["headers"]

    fake_id = uuid.uuid4()
    resp = await client.get(
        f"/api/v1/webinars/{fake_id}",
        headers=headers,
    )
    assert resp.status_code == 404


# ── Update ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_update_webinar(client: AsyncClient, user_with_org, session: AsyncSession):
    """Update a webinar."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    created = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Original"),
    )
    await session.commit()

    resp = await client.patch(
        f"/api/v1/webinars/{created.id}",
        headers=headers,
        json={"title": "Updated", "capacity": 200},
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data["title"] == "Updated"
    assert data["slug"] == "updated"
    assert data["capacity"] == 200


@pytest.mark.asyncio
async def test_update_webinar_partial(client: AsyncClient, user_with_org, session: AsyncSession):
    """Partial update only modifies provided fields."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    created = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="Original", description="Original desc"),
    )
    await session.commit()

    resp = await client.patch(
        f"/api/v1/webinars/{created.id}",
        headers=headers,
        json={"capacity": 50},
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data["title"] == "Original"
    assert data["description"] == "Original desc"
    assert data["capacity"] == 50


# ── Delete ───────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_delete_webinar(client: AsyncClient, user_with_org, session: AsyncSession):
    """Delete a webinar."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    created = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(title="To Delete"),
    )
    await session.commit()

    resp = await client.delete(
        f"/api/v1/webinars/{created.id}",
        headers=headers,
    )
    assert resp.status_code == 204

    # Verify it's gone
    resp2 = await client.get(
        f"/api/v1/webinars/{created.id}",
        headers=headers,
    )
    assert resp2.status_code == 404


# ── Duplicate ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_duplicate_webinar(client: AsyncClient, user_with_org, session: AsyncSession):
    """Duplicate a webinar."""
    headers = user_with_org["headers"]
    org_id = user_with_org["org_id"]
    user_id = user_with_org["user_id"]

    created = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org_id),
        created_by=uuid.UUID(user_id),
        payload=WebinarCreate(
            title="Original",
            description="Description",
            status=WebinarStatus.scheduled,
            capacity=100,
        ),
    )
    await session.commit()

    resp = await client.post(
        f"/api/v1/webinars/{created.id}/duplicate",
        headers=headers,
    )
    assert resp.status_code == 200

    data = resp.json()
    assert data["original_id"] == str(created.id)
    assert data["duplicate_id"] != str(created.id)
    assert data["duplicate_slug"] == "original-copy"

    # Verify the duplicate exists
    resp2 = await client.get(
        f"/api/v1/webinars/{data['duplicate_id']}",
        headers=headers,
    )
    assert resp2.status_code == 200
    dupe = resp2.json()
    assert dupe["title"] == "Original (copy)"
    assert dupe["status"] == "draft"


# ── Org scoping ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_cross_org_access_denied(client: AsyncClient, session: AsyncSession):
    """Cannot access webinars from another org."""
    # Create user1 with org1 and a webinar
    auth1 = await register_and_verify_user(client, session, "user1@example.com")
    headers1 = auth_header(auth1["accessToken"])
    org1_resp = await client.post("/api/v1/organizations", json={"name": "Org1"}, headers=headers1)
    org1_id = org1_resp.json()["id"]

    webinar1 = await webinar_service.create_webinar(
        session,
        organization_id=uuid.UUID(org1_id),
        created_by=uuid.UUID(auth1["user"]["id"]),
        payload=WebinarCreate(title="Org1 Webinar"),
    )
    await session.commit()

    # Create user2 with org2
    auth2 = await register_and_verify_user(client, session, "user2@example.com")
    headers2 = auth_header(auth2["accessToken"])

    # User2 tries to access user1's webinar
    resp = await client.get(
        f"/api/v1/webinars/{webinar1.id}",
        headers=headers2,
    )
    assert resp.status_code == 404  # Not found in user2's org
