"""Auth orchestration: register / login / refresh / verify / reset / Google.

Each public function takes a session plus inputs, performs the DB work, and
returns the entities the endpoint needs to build a response. Token issuers
return ``(user, membership, access_token, raw_refresh_token)`` — the raw
refresh token is handed to the endpoint to set as an httpOnly cookie; only
its hash is ever persisted (see ``security.hash_refresh_token``).
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import (
    EmailVerificationToken,
    Membership,
    Organization,
    RefreshToken,
    Role,
    User,
)
from app.services import email_service, oauth, security


class CredentialsError(Exception):
    """Bad email/password or an invalid/expired refresh token."""


class EmailTakenError(Exception):
    """Registration with an email that already exists."""


class UnverifiedEmailError(Exception):
    """Attempting to log in or access protected resources before verifying email."""


class RateLimitError(Exception):
    """Rate limit exceeded on resending verification email."""


class TokenError(Exception):
    """Raised when a signed verification/reset token is invalid/used."""


def _as_utc(dt: datetime) -> datetime:
    """Normalize a possibly-naive datetime to timezone-aware UTC.

    Postgres (``TIMESTAMP WITH TIME ZONE``) hands back aware datetimes, but the
    SQLite fallback returns naive ones — treat those as UTC so refresh-token
    expiry comparisons work under both backends.
    """
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug or "workspace"


async def _get_role(session: AsyncSession, name: str) -> Role:
    res = await session.execute(select(Role).where(Role.name == name))
    role = res.scalar_one_or_none()
    if role is None:
        # Roles are seeded at startup; if missing the seed never ran.
        raise RuntimeError(f"Role '{name}' not found — run RBAC seeding first")
    return role


async def _default_membership(session: AsyncSession, user_id: uuid.UUID) -> Membership:
    """The membership used for token issuance when none is explicitly chosen."""
    stmt = (
        select(Membership)
        .where(Membership.user_id == user_id, Membership.is_default.is_(True))
        .options(selectinload(Membership.organization), selectinload(Membership.role))
    )
    res = await session.execute(stmt)
    membership = res.scalar_one_or_none()
    if membership is None:
        stmt = (
            select(Membership)
            .where(Membership.user_id == user_id)
            .options(selectinload(Membership.organization), selectinload(Membership.role))
            .order_by(Membership.created_at)
        )
        res = await session.execute(stmt)
        membership = res.scalar_one_or_none()
    if membership is None:
        raise CredentialsError("User has no organization access")
    return membership


async def _create_personal_org(session: AsyncSession, user: User) -> Membership:
    """Auto-provision a personal org + owner membership for a new user."""
    slug = f"{_slugify(user.email.split('@')[0])}-{uuid.uuid4().hex[:6]}"
    org = Organization(
        name=f"{user.full_name or user.email}'s Workspace",
        slug=slug,
        owner_user_id=user.id,
        is_personal=True,
    )
    session.add(org)
    await session.flush()
    role = await _get_role(session, "owner")
    membership = Membership(
        user_id=user.id,
        organization_id=org.id,
        role_id=role.id,
        is_default=True,
    )
    session.add(membership)
    await session.flush()
    # Eagerly attach relations so the endpoint can read org/role without extra queries.
    membership.organization = org
    membership.role = role
    return membership


async def _issue_tokens(
    session: AsyncSession, user: User, org: Organization, *, user_agent: str | None, ip: str | None
) -> tuple[str, str]:
    access = security.create_access_token(user.id, org.id)
    raw_refresh = security.generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=security.hash_refresh_token(raw_refresh),
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            user_agent=user_agent,
            ip_address=ip,
        )
    )
    await session.flush()
    return access, raw_refresh


async def _create_and_record_verification_token(session: AsyncSession, user_id: uuid.UUID) -> str:
    """Mint a signed verification token and record its hash for single-use enforcement."""
    token = security.create_email_verification_token(user_id)
    token_hash = security.hash_refresh_token(token)
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS)

    session.add(
        EmailVerificationToken(
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            consumed=False,
        )
    )
    await session.flush()
    return token


# --------------------------------------------------------------------------- #
# Public flows
# --------------------------------------------------------------------------- #


async def register(
    session: AsyncSession, *, email: str, password: str, full_name: str | None, user_agent: str | None = None, ip: str | None = None
) -> User:
    """Create a new user, personal workspace, and trigger verification email.

    Does NOT issue access or refresh tokens (registration != login).
    """
    res = await session.execute(select(User).where(User.email == email))
    if res.scalar_one_or_none() is not None:
        raise EmailTakenError()

    user = User(
        email=email,
        hashed_password=security.hash_password(password),
        full_name=full_name,
        is_active=True,
        email_verified=False,
        is_verified=False,
    )
    session.add(user)
    await session.flush()

    await _create_personal_org(session, user)

    # Generate single-use verification token and send email
    token = await _create_and_record_verification_token(session, user.id)
    await email_service.send_verification_email(user, token)

    return user


async def authenticate(
    session: AsyncSession, *, email: str, password: str, user_agent: str | None, ip: str | None
) -> tuple[User, Membership, str, str]:
    """Authenticate a user via email and password.

    Enforces mandatory email verification before issuing tokens.
    """
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None or not security.verify_password(password, user.hashed_password):
        raise CredentialsError("Invalid email or password")
    if not user.is_active:
        raise CredentialsError("Account is disabled")

    # PHASE 3 Enforcement: Never issue tokens to unverified users
    if not user.email_verified:
        raise UnverifiedEmailError("Please verify your email before logging in.")

    user.last_login_at = datetime.now(timezone.utc)
    membership = await _default_membership(session, user.id)
    access, raw_refresh = await _issue_tokens(
        session, user, membership.organization, user_agent=user_agent, ip=ip
    )
    return user, membership, access, raw_refresh


async def refresh(
    session: AsyncSession, *, raw_refresh: str, user_agent: str | None, ip: str | None
) -> tuple[User, Membership, str, str]:
    """Exchange a valid refresh token for a new access token and rotated refresh token."""
    token_hash = security.hash_refresh_token(raw_refresh)
    res = await session.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash, RefreshToken.revoked.is_(False))
    )
    stored = res.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    if stored is None or _as_utc(stored.expires_at) < now:
        raise CredentialsError("Invalid or expired refresh token")

    # Rotate: revoke the presented token, mint a fresh one for the next cycle.
    stored.revoked = True
    user_res = await session.execute(select(User).where(User.id == stored.user_id))
    user = user_res.scalar_one_or_none()
    if user is None or not user.is_active:
        raise CredentialsError("Account is disabled")

    # PHASE 4 Enforcement: Refresh exchange must also check email_verified
    if not user.email_verified:
        raise UnverifiedEmailError("Please verify your email before logging in.")

    membership = await _default_membership(session, user.id)
    access, new_raw = await _issue_tokens(
        session, user, membership.organization, user_agent=user_agent, ip=ip
    )
    return user, membership, access, new_raw


async def revoke_refresh_token(session: AsyncSession, raw_refresh: str) -> None:
    token_hash = security.hash_refresh_token(raw_refresh)
    res = await session.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = res.scalar_one_or_none()
    if stored is not None:
        stored.revoked = True
        await session.flush()


async def revoke_all_refresh_tokens(session: AsyncSession, user_id: uuid.UUID) -> None:
    res = await session.execute(
        select(RefreshToken).where(RefreshToken.user_id == user_id, RefreshToken.revoked.is_(False))
    )
    for stored in res.scalars().all():
        stored.revoked = True
    await session.flush()


async def verify_email(session: AsyncSession, token: str) -> User:
    """Validate verification token, set email_verified = True, and consume the token."""
    try:
        payload = security.decode_token(token)
    except security.TokenDecodeError as exc:
        raise TokenError("This verification link is invalid or has expired.") from exc

    if payload.get("type") != "verify_email":
        raise TokenError("This verification link is invalid or has expired.")

    try:
        user_uuid = uuid.UUID(payload["sub"])
    except (ValueError, KeyError) as exc:
        raise TokenError("This verification link is invalid or has expired.") from exc

    # Check single-use token record in DB
    token_hash = security.hash_refresh_token(token)
    tok_res = await session.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == token_hash,
            EmailVerificationToken.consumed.is_(False),
        )
    )
    tok_record = tok_res.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if tok_record is None or _as_utc(tok_record.expires_at) < now:
        raise TokenError("This verification link is invalid or has expired.")

    res = await session.execute(select(User).where(User.id == user_uuid))
    user = res.scalar_one_or_none()
    if user is None:
        raise TokenError("This verification link is invalid or has expired.")

    # Mark user as verified
    user.email_verified = True
    user.is_verified = True

    # Invalidate token so it cannot be reused
    tok_record.consumed = True
    tok_record.consumed_at = now
    await session.flush()

    return user


async def send_verification_email_if_needed(session: AsyncSession, email: str) -> None:
    """Resend a verification email with cooldown rate-limiting and token invalidation.

    Returns without leaking whether an account exists or is already verified.
    """
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None or user.email_verified:
        return

    now = datetime.now(timezone.utc)
    # Rate limit check: 1 request per 60 seconds
    recent_res = await session.execute(
        select(EmailVerificationToken)
        .where(EmailVerificationToken.user_id == user.id)
        .order_by(EmailVerificationToken.created_at.desc())
        .limit(1)
    )
    latest_tok = recent_res.scalar_one_or_none()
    if latest_tok is not None:
        created_at = _as_utc(latest_tok.created_at)
        if (now - created_at).total_seconds() < 60:
            raise RateLimitError("Please wait 60 seconds before requesting another verification email.")

    # Invalidate previous unconsumed tokens for this user
    prev_tokens = await session.execute(
        select(EmailVerificationToken).where(
            EmailVerificationToken.user_id == user.id,
            EmailVerificationToken.consumed.is_(False),
        )
    )
    for t in prev_tokens.scalars().all():
        t.consumed = True
        t.consumed_at = now

    token = await _create_and_record_verification_token(session, user.id)
    await email_service.send_verification_email(user, token)


async def request_password_reset(session: AsyncSession, email: str) -> None:
    """Does not reveal whether the email exists."""
    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None:
        return
    token = security.create_password_reset_token(user.id)
    await email_service.send_password_reset_email(user, token)


async def reset_password(session: AsyncSession, token: str, new_password: str) -> User:
    try:
        payload = security.decode_token(token)
    except security.TokenDecodeError as exc:
        raise TokenError("This password reset link is invalid or has expired.") from exc
    if payload.get("type") != "reset_password":
        raise TokenError("This password reset link is invalid or has expired.")
    res = await session.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    user = res.scalar_one_or_none()
    if user is None:
        raise TokenError("This password reset link is invalid or has expired.")
    user.hashed_password = security.hash_password(new_password)
    # Invalidate all existing sessions after a password change.
    await revoke_all_refresh_tokens(session, user.id)
    await session.flush()
    return user


async def google_signin(
    session: AsyncSession, *, code: str, redirect_uri: str | None = None, user_agent: str | None, ip: str | None
) -> tuple[User, Membership, str, str]:
    """Google OAuth sign-in flow.

    Inspects Google userinfo for explicit verified_email claim before marking verified.
    """
    info = await oauth.exchange_google_code(code, redirect_uri=redirect_uri)
    email = info.get("email")
    if not email:
        raise CredentialsError("Google did not return an email address")

    # PHASE 10: Explicit claim check (not an assumption)
    is_google_verified = bool(info.get("email_verified") or info.get("verified_email"))

    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            hashed_password=None,
            full_name=info.get("name"),
            email_verified=is_google_verified,
            is_verified=is_google_verified,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        membership = await _create_personal_org(session, user)
    else:
        # Link Google account if user already existed
        if not user.email_verified and is_google_verified:
            user.email_verified = True
            user.is_verified = True
            await session.flush()
        membership = await _default_membership(session, user.id)

    access, raw_refresh = await _issue_tokens(session, user, membership.organization, user_agent=user_agent, ip=ip)
    return user, membership, access, raw_refresh


async def linkedin_signin(
    session: AsyncSession, *, code: str, redirect_uri: str | None = None, user_agent: str | None, ip: str | None
) -> tuple[User, Membership, str, str]:
    """LinkedIn OAuth sign-in flow (OpenID Connect)."""
    info = await oauth.exchange_linkedin_code(code, redirect_uri=redirect_uri)
    email = info.get("email")
    if not email:
        raise CredentialsError("LinkedIn did not return an email address")

    # In OpenID Connect, email_verified is returned or verified by default
    is_verified = bool(info.get("email_verified", True))

    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            hashed_password=None,
            full_name=info.get("name") or f"{info.get('given_name', '')} {info.get('family_name', '')}".strip(),
            email_verified=is_verified,
            is_verified=is_verified,
            is_active=True,
        )
        session.add(user)
        await session.flush()
        membership = await _create_personal_org(session, user)
    else:
        if is_verified:
            user.email_verified = True
            user.is_verified = True
        membership = await _default_membership(session, user.id)

    if not user.email_verified:
        token = await _create_and_record_verification_token(session, user.id)
        await email_service.send_verification_email(user, token)
        raise UnverifiedEmailError("Please verify your email before logging in.")

    access, raw_refresh = await _issue_tokens(
        session, user, membership.organization, user_agent=user_agent, ip=ip
    )
    return user, membership, access, raw_refresh
