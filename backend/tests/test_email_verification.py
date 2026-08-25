"""Comprehensive tests for mandatory server-side email verification.

Covers all 13 Phase-11 requirements:
1. New user has email_verified = FALSE after registration
2. Registration generates a verification token and triggers a send
3. Unverified user cannot log in (correct password, still blocked with 403)
4. Unverified user cannot obtain a session via refresh token
5. Verified user can log in normally
6. Valid token verifies the account and is then consumed
7. Expired token fails safely
8. Invalid/malformed token fails safely
9. Already-used token cannot be reused
10. Resend-verification works for unverified accounts
11. Resend-verification is a no-op (but returns success) for already-verified accounts
12. Protected API routes reject requests from an authenticated-but-unverified state
13. Existing Google OAuth flow checks verified email claim
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models import EmailVerificationToken, RefreshToken, User
from app.services import auth_service, email_service, oauth, security
from tests.conftest import DEFAULT_PASSWORD, auth_header, login_user, register_user

META = {"user_agent": "pytest", "ip": "127.0.0.1"}


# 1. New user has email_verified = FALSE after registration
async def test_register_sets_email_verified_false_and_issues_no_tokens(client, session):
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": "newuser@example.com", "password": DEFAULT_PASSWORD, "full_name": "New User"},
    )
    assert resp.status_code == 201
    data = resp.json()

    # Must NOT return access token
    assert "accessToken" not in data
    assert data["email"] == "newuser@example.com"
    assert data["email_verified"] is False

    # Must NOT set refresh cookie
    assert "wf_refresh" not in client.cookies

    # DB state: email_verified = False
    res = await session.execute(select(User).where(User.email == "newuser@example.com"))
    user = res.scalar_one()
    assert user.email_verified is False
    assert user.is_verified is False


# 2. Registration generates a verification token and triggers a send
async def test_register_creates_verification_token_record(session, monkeypatch):
    sent_emails = []

    async def fake_send_email(to: str, subject: str, body: str):
        sent_emails.append({"to": to, "subject": subject, "body": body})

    monkeypatch.setattr(email_service, "send_email", fake_send_email)

    user = await auth_service.register(
        session,
        email="tokencheck@example.com",
        password=DEFAULT_PASSWORD,
        full_name="Token Check",
        **META,
    )
    assert user.email_verified is False

    # Check token record in DB
    tokens = (
        await session.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.user_id == user.id)
        )
    ).scalars().all()
    assert len(tokens) == 1
    assert tokens[0].consumed is False

    # Check email was dispatched
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == "tokencheck@example.com"
    assert "Verify your email" in sent_emails[0]["subject"]


# 3. Unverified user cannot log in (correct password, still blocked with 403)
async def test_unverified_user_cannot_login_403(client):
    await register_user(client, "unverified@example.com")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "unverified@example.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 403
    assert "verify your email" in resp.json()["detail"].lower()
    assert "wf_refresh" not in client.cookies


# 4. Unverified user cannot obtain a session via refresh token
async def test_unverified_user_cannot_refresh(session):
    # Manually create a user with a refresh token but email_verified = False
    user = await auth_service.register(
        session, email="ref_unverified@example.com", password=DEFAULT_PASSWORD, full_name="Ref Test", **META
    )
    # Even if an opaque refresh token somehow existed:
    raw_refresh = security.generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=security.hash_refresh_token(raw_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        )
    )
    await session.commit()

    with pytest.raises(auth_service.UnverifiedEmailError):
        await auth_service.refresh(session, raw_refresh=raw_refresh, **META)


# 5. Verified user can log in normally
async def test_verified_user_can_login_normally(client, session):
    await register_user(client, "verified_login@example.com")
    res = await session.execute(select(User).where(User.email == "verified_login@example.com"))
    user = res.scalar_one()
    user.email_verified = True
    user.is_verified = True
    await session.commit()

    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "verified_login@example.com", "password": DEFAULT_PASSWORD},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "accessToken" in data
    assert data["user"]["email_verified"] is True
    assert "wf_refresh" in client.cookies


# 6. Valid token verifies the account and is then consumed
async def test_valid_token_verifies_account_and_consumes_token(client, session, monkeypatch):
    captured_tokens = []

    async def fake_send_verification_email(user, token: str):
        captured_tokens.append(token)

    monkeypatch.setattr(email_service, "send_verification_email", fake_send_verification_email)

    await register_user(client, "verify_flow@example.com")
    assert len(captured_tokens) == 1
    raw_token = captured_tokens[0]

    # Verify via endpoint
    resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp.status_code == 200
    assert "Email verified successfully" in resp.json()["detail"]

    # Check user can log in
    login_resp = await login_user(client, "verify_flow@example.com")
    assert login_resp["accessToken"]


# 7. Expired token fails safely
async def test_expired_token_fails_safely(client, session):
    user = await auth_service.register(
        session, email="expired_tok@example.com", password=DEFAULT_PASSWORD, full_name="Expired", **META
    )
    raw_token = security.create_email_verification_token(user.id)

    # Insert an already-expired token
    session.add(
        EmailVerificationToken(
            user_id=user.id,
            token_hash=security.hash_refresh_token(raw_token),
            expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
            consumed=False,
        )
    )
    await session.commit()

    resp = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp.status_code == 400
    assert "invalid or has expired" in resp.json()["detail"].lower()


# 8. Invalid/malformed token fails safely
async def test_invalid_malformed_token_fails_safely(client):
    resp = await client.get("/api/v1/auth/verify-email?token=invalid.jwt.token")
    assert resp.status_code == 400
    assert "invalid or has expired" in resp.json()["detail"].lower()


# 9. Already-used token cannot be reused
async def test_already_used_token_cannot_be_reused(client, session, monkeypatch):
    captured_tokens = []

    async def fake_send_verification_email(user, token: str):
        captured_tokens.append(token)

    monkeypatch.setattr(email_service, "send_verification_email", fake_send_verification_email)

    await register_user(client, "reuse_test@example.com")
    assert len(captured_tokens) == 1
    raw_token = captured_tokens[0]

    # First verify succeeds
    resp1 = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp1.status_code == 200

    # Second verify with same token MUST fail
    resp2 = await client.get(f"/api/v1/auth/verify-email?token={raw_token}")
    assert resp2.status_code == 400
    assert "invalid or has expired" in resp2.json()["detail"].lower()


# 10. Resend-verification works for unverified accounts
async def test_resend_verification_creates_new_token(session, monkeypatch):
    captured_tokens = []

    async def fake_send_verification_email(user, token: str):
        captured_tokens.append(token)

    monkeypatch.setattr(email_service, "send_verification_email", fake_send_verification_email)

    user = await auth_service.register(
        session, email="resend_test@example.com", password=DEFAULT_PASSWORD, full_name="Resend", **META
    )
    assert len(captured_tokens) == 1

    # Age the initial token so cooldown rate-limit does not trigger
    tokens = (
        await session.execute(
            select(EmailVerificationToken).where(EmailVerificationToken.user_id == user.id)
        )
    ).scalars().all()
    for t in tokens:
        t.created_at = datetime.now(timezone.utc) - timedelta(seconds=70)
    await session.commit()

    # Trigger resend
    await auth_service.send_verification_email_if_needed(session, "resend_test@example.com")
    assert len(captured_tokens) == 2

    # Check that previous token was marked consumed and a new one was created
    all_tokens = (
        await session.execute(
            select(EmailVerificationToken)
            .where(EmailVerificationToken.user_id == user.id)
            .order_by(EmailVerificationToken.created_at)
        )
    ).scalars().all()
    assert len(all_tokens) == 2
    assert all_tokens[0].consumed is True
    assert all_tokens[1].consumed is False


# 11. Resend-verification is a no-op for already-verified accounts
async def test_resend_verification_noop_for_verified_account(client, session, monkeypatch):
    sent_emails = []

    async def fake_send_email(to: str, subject: str, body: str):
        sent_emails.append({"to": to, "subject": subject, "body": body})

    monkeypatch.setattr(email_service, "send_email", fake_send_email)

    user = await auth_service.register(
        session, email="already_verified@example.com", password=DEFAULT_PASSWORD, full_name="Verified", **META
    )
    user.email_verified = True
    user.is_verified = True
    await session.commit()

    sent_emails.clear()

    resp = await client.post(
        "/api/v1/auth/resend-verification",
        json={"email": "already_verified@example.com"},
    )
    assert resp.status_code == 200
    # No new email sent
    assert len(sent_emails) == 0


# 12. Protected API routes reject requests from an authenticated-but-unverified state
async def test_protected_routes_block_unverified_token(client, session):
    user = await auth_service.register(
        session, email="bypass_test@example.com", password=DEFAULT_PASSWORD, full_name="Bypass", **META
    )
    # Suppose a token was minted before or crafted:
    access_token = security.create_access_token(user.id)

    # Calling protected endpoint with this token MUST be rejected
    resp = await client.get("/api/v1/users/me", headers=auth_header(access_token))
    assert resp.status_code == 403
    assert "verify your email" in resp.json()["detail"].lower()


# 13. Existing Google OAuth flow checks verified email claim
async def test_google_oauth_honors_verified_email_claim(session, monkeypatch):
    # Case A: Google confirms email_verified = True
    async def fake_exchange_verified(code: str) -> dict:
        return {"email": "google_verified@example.com", "name": "Google User", "email_verified": True}

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange_verified)

    user, membership, access, raw = await auth_service.google_signin(
        session, code="good_code", **META
    )
    assert user.email_verified is True
    assert access is not None

    # Case B: Google returns email_verified = False
    async def fake_exchange_unverified(code: str) -> dict:
        return {"email": "google_unverified@example.com", "name": "Unverified Google", "email_verified": False}

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange_unverified)

    with pytest.raises(auth_service.UnverifiedEmailError):
        await auth_service.google_signin(session, code="unverified_code", **META)
