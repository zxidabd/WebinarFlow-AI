"""Endpoints for the authenticated user's own profile and memberships."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_db
from app.models import Membership, User
from app.schemas import AuthUser, MeResponse, UserOrganization, UserUpdate

router = APIRouter()


async def _memberships_with_orgs(db: AsyncSession, user_id) -> list[Membership]:
    res = await db.execute(
        select(Membership)
        .where(Membership.user_id == user_id)
        .options(selectinload(Membership.organization), selectinload(Membership.role))
        .order_by(Membership.created_at)
    )
    return list(res.scalars().all())


def _to_user_org(m: Membership) -> UserOrganization:
    return UserOrganization(
        id=m.organization.id,
        name=m.organization.name,
        slug=m.organization.slug,
        is_personal=m.organization.is_personal,
        role=m.role.name,
        is_default=m.is_default,
    )


@router.get("/me", response_model=MeResponse)
async def get_me(current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)):
    memberships = await _memberships_with_orgs(db, current_user.id)
    me = MeResponse.model_validate(
        {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "is_active": current_user.is_active,
            "is_verified": current_user.is_verified,
            "email_verified": current_user.email_verified,
            "is_super_user": current_user.is_super_user,
            "last_login_at": current_user.last_login_at,
            "organizations": [_to_user_org(m) for m in memberships],
        }
    )
    return me


@router.get("/me/organizations", response_model=list[UserOrganization])
async def list_my_organizations(
    current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)
):
    memberships = await _memberships_with_orgs(db, current_user.id)
    return [_to_user_org(m) for m in memberships]


@router.patch("/me", response_model=AuthUser)
async def update_me(
    payload: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    await db.flush()
    return AuthUser.model_validate(current_user)
