"""FastAPI dependencies: authentication, multi-tenant org resolution, RBAC.

The dependency chain is:

  ``get_current_user``  (HTTP Bearer -> User, checks active + email_verified)
    -> ``get_current_active_user``
        -> ``get_current_verified_user``
        -> ``get_current_membership``  (resolves the active organization,
                                          from ``X-Organization-Id`` or the
                                          user's default membership)
            -> ``require_permissions(*perms)``  (RBAC check against the
                                                  active membership's role)
"""
from __future__ import annotations

import uuid
from collections.abc import Callable

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db import get_db
from app.models import Membership, User
from app.services import security

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED,
            "Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = security.decode_token(creds.credentials)
    except security.TokenDecodeError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired access token")

    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong token type")

    user = (
        await db.execute(select(User).where(User.id == uuid.UUID(payload["sub"])))
    ).scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or disabled")

    # PHASE 4: Enforce email_verified on every authenticated request (closes old token bypass)
    if not user.email_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Please verify your email before accessing this resource.",
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account is disabled")
    return current_user


async def get_current_verified_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    if not current_user.email_verified:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Please verify your email before accessing this resource.")
    return current_user


async def get_current_membership(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
    x_organization_id: str | None = Header(default=None, alias="X-Organization-Id"),
) -> Membership:
    """Resolve the organization the request acts in, verifying membership + role."""
    stmt_base = lambda: (  # noqa: E731  -- builds a reusable eager-load query
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .options(selectinload(Membership.organization), selectinload(Membership.role))
    )

    if x_organization_id:
        try:
            org_id = uuid.UUID(x_organization_id)
        except ValueError as exc:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid X-Organization-Id") from exc
        membership = (await db.execute(stmt_base().where(Membership.organization_id == org_id))).scalar_one_or_none()
        if membership is None:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this organization")
        return membership

    # Fall back to the user's default membership, else their most active / latest membership.
    membership = (
        await db.execute(
            stmt_base().where(Membership.is_default.is_(True))
        )
    ).scalar_one_or_none()
    if membership is None:
        membership = (
            await db.execute(stmt_base().order_by(Membership.created_at.desc()))
        ).scalars().first()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not a member of any organization")
    return membership


def require_permissions(*required: str) -> Callable[..., Membership]:
    """Dependency factory: enforce that the active role has all `required` perms."""

    async def _dependency(
        membership: Membership = Depends(get_current_membership),
    ) -> Membership:
        have = {p.name for p in membership.role.permissions}
        missing = set(required) - have
        if missing:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Missing required permissions: {', '.join(sorted(missing))}",
            )
        return membership

    return _dependency


def require_org_permissions(*required: str) -> Callable[..., Membership]:
    """Path-scoped RBAC: enforce `required` perms against the membership for the
    ``{org_id}`` in the request path.
    """

    async def _dependency(
        org_id: uuid.UUID,
        current_user: User = Depends(get_current_active_user),
        db: AsyncSession = Depends(get_db),
    ) -> Membership:
        stmt = (
            select(Membership)
            .where(
                Membership.user_id == current_user.id,
                Membership.organization_id == org_id,
            )
            .options(selectinload(Membership.organization), selectinload(Membership.role))
        )
        membership = (await db.execute(stmt)).scalar_one_or_none()
        if membership is None:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                "You do not have access to this organization",
            )
        have = {p.name for p in membership.role.permissions}
        missing = set(required) - have
        if missing:
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                f"Missing required permissions: {', '.join(sorted(missing))}",
            )
        return membership

    return _dependency
