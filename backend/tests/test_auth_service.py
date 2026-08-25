"""Service-level tests for refresh-token rotation, revocation, and Google sign-in.

These bypass HTTP to assert the security-critical invariants of the token
lifecycle directly against the auth service.
"""
from __future__ import annotations

import uuid

import pytest
from sqlalchemy import func, select

from app.models import RefreshToken, User
from app.services import auth_service, oauth, security

META = {"user_agent": "pytest", "ip": "127.0.0.1"}


async def test_refresh_rotation_revokes_old_token(session):
    user = await auth_service.register(
        session, email="rot@example.com", password="password123", full_name="Rot", **META
    )
    user.email_verified = True
    user.is_verified = True
    await session.commit()

    _, _, _, raw1 = await auth_service.authenticate(
        session, email="rot@example.com", password="password123", **META
    )

    # Rotating with the current token succeeds and returns a fresh one.
    _, _, _, raw2 = await auth_service.refresh(session, raw_refresh=raw1, **META)
    assert raw2 != raw1

    # The rotated-out token can no longer be used.
    with pytest.raises(auth_service.CredentialsError):
        await auth_service.refresh(session, raw_refresh=raw1, **META)

    # The new token still works.
    _, _, _, raw3 = await auth_service.refresh(session, raw_refresh=raw2, **META)
    assert raw3 not in {raw1, raw2}


async def test_refresh_rejects_unknown_token(session):
    with pytest.raises(auth_service.CredentialsError):
        await auth_service.refresh(session, raw_refresh="never-issued", **META)


async def test_reset_password_revokes_all_sessions(session):
    user = await auth_service.register(
        session, email="reset@example.com", password="oldpassword1", full_name="Reset", **META
    )
    user.email_verified = True
    user.is_verified = True
    await session.commit()

    _, _, _, raw = await auth_service.authenticate(
        session, email="reset@example.com", password="oldpassword1", **META
    )
    token = security.create_password_reset_token(user.id)

    await auth_service.reset_password(session, token, "brandnewpass1")

    # Every previously-issued refresh token is now invalid.
    with pytest.raises(auth_service.CredentialsError):
        await auth_service.refresh(session, raw_refresh=raw, **META)

    # The old password no longer authenticates; the new one does.
    with pytest.raises(auth_service.CredentialsError):
        await auth_service.authenticate(session, email="reset@example.com", password="oldpassword1", **META)
    ok_user, _, _, _ = await auth_service.authenticate(
        session, email="reset@example.com", password="brandnewpass1", **META
    )
    assert ok_user.id == user.id


async def test_register_creates_unverified_user_without_refresh_token(session):
    user = await auth_service.register(
        session, email="hash@example.com", password="password123", full_name="Hash", **META
    )
    assert user.email_verified is False
    stored = (await session.execute(select(RefreshToken).where(RefreshToken.user_id == user.id))).scalars().all()
    assert len(stored) == 0


async def test_google_signin_creates_verified_user(session, monkeypatch):
    async def fake_exchange(code: str) -> dict:
        return {"email": "ggl@example.com", "name": "Google User", "email_verified": True}

    monkeypatch.setattr(oauth, "exchange_google_code", fake_exchange)

    user, membership, access, raw = await auth_service.google_signin(
        session, code="fake-code", **META
    )
    assert user.email == "ggl@example.com"
    assert user.email_verified is True
    assert user.is_verified is True
    assert user.hashed_password is None
    assert membership.organization.is_personal is True
    assert access and raw

    # A second sign-in reuses the same user, not a duplicate.
    user2, _, _, _ = await auth_service.google_signin(session, code="fake-code", **META)
    assert user2.id == user.id
    count = (await session.execute(select(func.count()).select_from(User))).scalar_one()
    assert count == 1
