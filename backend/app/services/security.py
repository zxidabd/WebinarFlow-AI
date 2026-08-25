"""Security primitives: password hashing, JWT signing, opaque refresh tokens.

Access tokens (stateless JWT), email-verification tokens and password-reset
tokens are all signed here against ``settings.JWT_SECRET_KEY`` and carry a
``type`` claim so a token minted for one purpose can't be replayed for
another. Refresh tokens are *not* JWTs — they're opaque random strings whose
SHA-256 hash lives in the ``refresh_tokens`` table so we can rotate and
revoke them (see ``auth_service``).
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    return _pwd.verify(password, hashed)


def _create_token(subject: uuid.UUID | str, token_type: str, expires_delta: timedelta, extra: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(user_id: uuid.UUID, org_id: uuid.UUID | None = None) -> str:
    extra = {"jti": secrets.token_urlsafe(16), "org_id": str(org_id) if org_id else None}
    return _create_token(user_id, "access", timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES), extra)


def create_email_verification_token(user_id: uuid.UUID) -> str:
    extra = {"jti": secrets.token_urlsafe(16)}
    return _create_token(user_id, "verify_email", timedelta(hours=settings.EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS), extra)


def create_password_reset_token(user_id: uuid.UUID) -> str:
    extra = {"jti": secrets.token_urlsafe(16)}
    return _create_token(user_id, "reset_password", timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS), extra)


class TokenDecodeError(Exception):
    """Raised when a signed token is missing, tampered, or expired."""


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:  # expired, malformed, signature mismatch
        raise TokenDecodeError(str(exc) or "invalid token") from exc


# --- Opaque refresh tokens ---

def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    """Hash the bearer string for storage; the DB never holds the raw token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
