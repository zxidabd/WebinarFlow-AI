"""HTTP-level tests for the auth endpoints (register / login / refresh / me)."""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import select

from app.models import EmailVerificationToken, User
from app.services import email_service, security
from tests.conftest import DEFAULT_PASSWORD, auth_header, login_user, register_and_verify_user, register_user


async def test_register_creates_user_org_without_tokens(client, session):
    data = await register_user(client, "alice@example.com", full_name="Alice")

    # Tokens are NOT returned on registration (Phase 2)
    assert "accessToken" not in data
    assert data["email"] == "alice@example.com"
    assert data["email_verified"] is False
    assert "wf_refresh" not in client.cookies

    # DB state: email_verified is False
    res = await session.execute(select(User).where(User.email == "alice@example.com"))
    user = res.scalar_one()
    assert user.email_verified is False
    assert user.is_active is True


async def test_register_duplicate_email_conflicts(client):
    await register_user(client, "dup@example.com")
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "dup@example.com", "password": DEFAULT_PASSWORD, "full_name": "Dup"},
    )
    assert resp.status_code == 409


async def test_register_rejects_short_password(client):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "short@example.com", "password": "tiny", "full_name": "Short"},
    )
    assert resp.status_code == 422


async def test_login_unverified_user_returns_403(client):
    await register_user(client, "unverified_bob@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "unverified_bob@example.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 403
    assert "verify your email" in resp.json()["detail"].lower()


async def test_login_verified_user_returns_token(client, session):
    data = await register_and_verify_user(client, session, "bob@example.com")
    assert data["accessToken"]
    assert data["user"]["email"] == "bob@example.com"
    assert data["user"]["email_verified"] is True
    assert "wf_refresh" in client.cookies


async def test_login_wrong_password_401(client, session):
    await register_and_verify_user(client, session, "carol@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "carol@example.com", "password": "wrong-password"},
    )
    assert resp.status_code == 401


async def test_login_unknown_email_401(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 401


async def test_me_requires_authentication(client):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_me_rejects_garbage_token(client):
    resp = await client.get("/api/v1/users/me", headers=auth_header("not-a-jwt"))
    assert resp.status_code == 401


async def test_me_returns_profile_with_org(client, session):
    data = await register_and_verify_user(client, session, "dave@example.com", full_name="Dave")
    resp = await client.get("/api/v1/users/me", headers=auth_header(data["accessToken"]))
    assert resp.status_code == 200, resp.text
    me = resp.json()
    assert me["email"] == "dave@example.com"
    assert len(me["organizations"]) == 1
    assert me["organizations"][0]["role"] == "owner"
    assert me["organizations"][0]["is_default"] is True


async def test_update_me_full_name(client, session):
    data = await register_and_verify_user(client, session, "erin@example.com", full_name="Erin")
    resp = await client.patch(
        "/api/v1/users/me",
        json={"full_name": "Erin Updated"},
        headers=auth_header(data["accessToken"]),
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["full_name"] == "Erin Updated"


async def test_refresh_rotates_access_token(client, session):
    await register_and_verify_user(client, session, "frank@example.com")
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200, resp.text
    assert resp.json()["accessToken"]
    # A rotated refresh cookie is set on the response.
    assert "wf_refresh" in client.cookies


async def test_logout_revokes_refresh(client, session):
    await register_and_verify_user(client, session, "grace@example.com")
    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 200
    # The cookie was cleared, and even a replayed token no longer refreshes.
    resp = await client.post("/api/v1/auth/refresh")
    assert resp.status_code == 401


async def test_verify_email_flow(client, monkeypatch):
    captured_tokens = []

    async def fake_send_verification_email(user, token: str):
        captured_tokens.append(token)

    monkeypatch.setattr(email_service, "send_verification_email", fake_send_verification_email)

    await register_user(client, "heidi@example.com")
    assert len(captured_tokens) == 1
    raw_token = captured_tokens[0]

    verify = await client.get("/api/v1/auth/verify-email", params={"token": raw_token})
    assert verify.status_code == 200, verify.text
    assert verify.json()["email"] == "heidi@example.com"

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "heidi@example.com", "password": DEFAULT_PASSWORD},
    )
    assert login_resp.status_code == 200
    me = await client.get("/api/v1/users/me", headers=auth_header(login_resp.json()["accessToken"]))
    assert me.json()["email_verified"] is True


async def test_verify_email_rejects_wrong_token_type(client):
    user_id = uuid.uuid4()
    # A password-reset token must not be accepted by the verify-email endpoint.
    reset_token = security.create_password_reset_token(user_id)
    resp = await client.get("/api/v1/auth/verify-email", params={"token": reset_token})
    assert resp.status_code == 400


async def test_forgot_password_is_always_accepted(client):
    # Does not reveal whether the account exists (202 either way).
    known = await client.post("/api/v1/auth/forgot-password", json={"email": "x@example.com"})
    unknown = await client.post("/api/v1/auth/forgot-password", json={"email": "ghost@example.com"})
    assert known.status_code == 202
    assert unknown.status_code == 202


async def test_google_callback_requires_state(client):
    # Without the state cookie the CSRF check fails before any network call.
    resp = await client.post("/api/v1/auth/google", json={"code": "abc", "state": "xyz"})
    assert resp.status_code == 400
