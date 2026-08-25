"""Token + auth-response schemas.

Field names are camelCase to match the frontend client (`api.ts` reads
``accessToken`` and the zustand store persists it under that key).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr


class AccessTokenResponse(BaseModel):
    """Returned by `/auth/refresh` — the refresh token stays in the cookie."""

    accessToken: str


class AuthUser(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    is_verified: bool = False
    email_verified: bool = False
    is_super_user: bool
    last_login_at: datetime | None = None


class OrganizationRole(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    is_personal: bool
    role: str


class AuthResponse(BaseModel):
    """Returned by login/Google — access token + identity + active org."""

    accessToken: str
    user: AuthUser
    organization: OrganizationRole


class RegisterResponse(BaseModel):
    """Returned by `/auth/register` — no access or refresh tokens are issued."""

    message: str = "Account created. Please check your email to verify your account."
    email: EmailStr
    email_verified: bool = False
