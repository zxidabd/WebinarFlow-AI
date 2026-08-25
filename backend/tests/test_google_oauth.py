"""Happy-path tests for the Google OAuth sign-in endpoint.

The CSRF-reject path (`test_google_callback_requires_state` in test_auth_api.py)
already covers the missing/mismatched state cookie. These cover the success
paths by stubbing ``app.services.oauth`` so no network or Google config is
needed: ``exchange_google_code`` is replaced with an async fake that returns
the userinfo dict Google's userinfo endpoint would have returned.
"""
from __future__ import annotations

import pytest

from app.services import oauth
from tests.conftest import DEFAULT_PASSWORD, auth_header, register_user

# Re-used across the success tests. Sent on the request's `Cookie` header — the
# ASGI test transport does not reliably forward httpx's cookie jar, so set the
# state cookie header explicitly. The payload's `state` must match this value.
_STATE = "test-state"
_STATE_COOKIE_HEADER = {"Cookie": f"wf_google_state={_STATE}"}


def _google_userinfo(email: str = "guser@example.com", name: str = "G User") -> dict:
    return {"email": email, "name": name, "picture": "", "sub": "fake-google-sub", "email_verified": True}


async def test_google_signin_creates_new_user(client, monkeypatch):
    """A first Google sign-in provisions a verified, OAuth-only user + personal org."""

    async def fake_exchange(code: str) -> dict:
        assert code == "valid-code"
        return _google_userinfo()

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange)

    resp = await client.post(
        "/api/v1/auth/google",
        json={"code": "valid-code", "state": _STATE},
        headers=_STATE_COOKIE_HEADER,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["accessToken"]
    # Google users are auto-verified and get a personal org with the owner role.
    assert data["user"]["email"] == "guser@example.com"
    assert data["user"]["email_verified"] is True
    assert data["organization"]["is_personal"] is True
    assert data["organization"]["role"] == "owner"
    # The refresh token rides the httpOnly cookie, never in the body.
    assert "wf_refresh" in client.cookies
    assert "refreshToken" not in data

    # The session actually works — the issued access token authenticates.
    me = await client.get("/api/v1/users/me", headers=auth_header(data["accessToken"]))
    assert me.status_code == 200
    assert me.json()["email"] == "guser@example.com"


async def test_google_signin_existing_user(client, monkeypatch):
    """Signing in with Google on an existing email reuses that user (no dup)."""

    async def fake_exchange(code: str) -> dict:
        return _google_userinfo(email="guser@example.com", name="Renamed")

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange)

    # First create the user the normal way (unverified, password-hashed).
    await register_user(client, "guser@example.com", full_name="Original Name")

    resp = await client.post(
        "/api/v1/auth/google",
        json={"code": "valid-code", "state": _STATE},
        headers=_STATE_COOKIE_HEADER,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["user"]["email"] == "guser@example.com"
    # Existing user is now verified by the Google sign-in.
    assert data["user"]["email_verified"] is True
    assert data["organization"]["is_personal"] is True

    # Exactly one membership exists for that email (no duplicate provisioning).
    me = await client.get("/api/v1/users/me", headers=auth_header(data["accessToken"]))
    assert me.status_code == 200
    assert len(me.json()["organizations"]) == 1


async def test_google_state_mismatch_returns_400(client, monkeypatch):
    """A state that does not match the cookie is rejected before any exchange."""

    async def fake_exchange(code: str) -> dict:  # pragma: no cover - must not be called
        raise AssertionError("exchange_google_code should not be called on state mismatch")

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange)

    resp = await client.post(
        "/api/v1/auth/google",
        json={"code": "valid-code", "state": "different-state"},
        headers=_STATE_COOKIE_HEADER,
    )
    assert resp.status_code == 400
    assert "state mismatch" in resp.json()["detail"]


async def test_google_signin_without_config_returns_503(client, monkeypatch):
    """If Google OAuth is not configured, the exchange surfaces a 503."""

    async def fake_exchange(code: str) -> dict:
        raise oauth.OAuthConfigError("Google OAuth is not configured")

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange)

    resp = await client.post(
        "/api/v1/auth/google",
        json={"code": "valid-code", "state": _STATE},
        headers=_STATE_COOKIE_HEADER,
    )
    assert resp.status_code == 503
    assert "not configured" in resp.json()["detail"]
