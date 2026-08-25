"""Organization, membership, and RBAC-enforcement tests.

Covers the multi-tenant authorization surface: who can manage an org, and the
path-scoped permission check that stops a role held in one org from being
exercised against another org's URL.
"""
from __future__ import annotations

import pytest

from tests.conftest import auth_header, register_and_verify_user


async def _org_pair(client, session):
    """Owner (with a personal org) + a second user added to it as a viewer."""
    owner = await register_and_verify_user(client, session, "owner@example.com", full_name="Owner")
    viewer = await register_and_verify_user(client, session, "viewer@example.com", full_name="Viewer")
    org_id = owner["organization"]["id"]

    add = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        json={"email": "viewer@example.com", "role_name": "viewer"},
        headers=auth_header(owner["accessToken"]),
    )
    assert add.status_code == 201, add.text
    return owner, viewer, org_id


async def test_owner_can_list_members(client, session):
    owner, _, org_id = await _org_pair(client, session)
    resp = await client.get(
        f"/api/v1/organizations/{org_id}/members",
        headers=auth_header(owner["accessToken"]),
    )
    assert resp.status_code == 200, resp.text
    emails = {m["email"] for m in resp.json()}
    assert emails == {"owner@example.com", "viewer@example.com"}


async def test_viewer_cannot_manage_members(client, session):
    _, viewer, org_id = await _org_pair(client, session)
    # Viewer lacks org:manage — listing members (a management op) is forbidden.
    resp = await client.get(
        f"/api/v1/organizations/{org_id}/members",
        headers=auth_header(viewer["accessToken"]),
    )
    assert resp.status_code == 403


async def test_viewer_cannot_add_members(client, session):
    _, viewer, org_id = await _org_pair(client, session)
    resp = await client.post(
        f"/api/v1/organizations/{org_id}/members",
        json={"email": "someone@example.com", "role_name": "member"},
        headers=auth_header(viewer["accessToken"]),
    )
    assert resp.status_code == 403


async def test_permission_is_scoped_to_path_org(client, session):
    """Regression: a role held in your own org must not authorize actions on
    another org named in the URL path."""
    alice = await register_and_verify_user(client, session, "alice2@example.com")
    bob = await register_and_verify_user(client, session, "bob2@example.com")
    bob_org = bob["organization"]["id"]

    # Alice is an owner — but only of *her* org. Acting on Bob's org path must 403.
    resp = await client.patch(
        f"/api/v1/organizations/{bob_org}",
        json={"name": "Hijacked"},
        headers=auth_header(alice["accessToken"]),
    )
    assert resp.status_code == 403


async def test_create_and_list_organizations(client, session):
    alice = await register_and_verify_user(client, session, "founder@example.com", full_name="Founder")
    create = await client.post(
        "/api/v1/organizations",
        json={"name": "Acme Inc"},
        headers=auth_header(alice["accessToken"]),
    )
    assert create.status_code == 201, create.text
    body = create.json()
    assert body["name"] == "Acme Inc"
    assert body["is_personal"] is False
    assert body["role"] == "owner"
    assert body["is_default"] is False

    listing = await client.get(
        "/api/v1/organizations", headers=auth_header(alice["accessToken"])
    )
    assert listing.status_code == 200
    names = {o["name"] for o in listing.json()}
    assert "Acme Inc" in names
    assert len(listing.json()) == 2  # personal + Acme


async def test_set_default_organization(client, session):
    alice = await register_and_verify_user(client, session, "switch@example.com", full_name="Switch")
    create = await client.post(
        "/api/v1/organizations",
        json={"name": "Second Org"},
        headers=auth_header(alice["accessToken"]),
    )
    new_org = create.json()["id"]

    resp = await client.post(
        f"/api/v1/organizations/{new_org}/default",
        headers=auth_header(alice["accessToken"]),
    )
    assert resp.status_code == 200
    assert resp.json()["is_default"] is True

    me = await client.get("/api/v1/users/me", headers=auth_header(alice["accessToken"]))
    defaults = [o for o in me.json()["organizations"] if o["is_default"]]
    assert len(defaults) == 1
    assert defaults[0]["id"] == new_org
