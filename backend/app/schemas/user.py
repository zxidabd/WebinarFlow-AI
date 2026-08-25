"""User-facing request/response schemas (profile)."""
from __future__ import annotations

from pydantic import BaseModel

from app.schemas.organization import UserOrganization
from app.schemas.token import AuthUser


class UserUpdate(BaseModel):
    full_name: str | None = None


class MeResponse(AuthUser):
    """`/users/me` — the user plus their organizations with role per org."""

    organizations: list[UserOrganization] = []
