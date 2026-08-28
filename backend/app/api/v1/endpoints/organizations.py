"""Organization endpoints — workspace CRUD, members, active-org switching.

Permissions are enforced through ``require_org_permissions`` from ``app.api.deps``;
identity-only operations (creating an org, listing the orgs you're in, switching
your active org) need only authentication, while member/settings management
requires the ``org:manage`` permission granted by the owner/admin roles.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_active_user, get_db, require_org_permissions
from app.models import Membership, Organization, Role, User
from app.schemas import (
    AddMemberRequest,
    OrganizationCreate,
    OrganizationMember,
    OrganizationUpdate,
    UserOrganization,
)

router = APIRouter()


async def _get_role_by_name(db: AsyncSession, name: str) -> Role:
    res = await db.execute(select(Role).where(Role.name == name))
    role = res.scalar_one_or_none()
    if role is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Role '{name}' is not seeded")
    return role


def _to_user_org(membership: Membership) -> UserOrganization:
    return UserOrganization(
        id=membership.organization.id,
        name=membership.organization.name,
        slug=membership.organization.slug,
        is_personal=membership.organization.is_personal,
        role=membership.role.name,
        is_default=membership.is_default,
    )


@router.post("", response_model=UserOrganization, status_code=status.HTTP_201_CREATED)
async def create_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    import re

    slug = payload.slug or re.sub(r"[^a-z0-9]+", "-", (payload.name or "").lower()).strip("-") or "workspace"
    slug = f"{slug}-{uuid.uuid4().hex[:6]}"
    org = Organization(name=payload.name, slug=slug, owner_user_id=current_user.id, is_personal=False)
    db.add(org)
    await db.flush()
    role = await _get_role_by_name(db, "owner")
    membership = Membership(
        user_id=current_user.id, organization_id=org.id, role_id=role.id, is_default=False
    )
    db.add(membership)
    membership.organization = org
    membership.role = role
    return _to_user_org(membership)


@router.get("", response_model=list[UserOrganization])
async def list_my_organizations(
    current_user: User = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Membership)
        .where(Membership.user_id == current_user.id)
        .options(selectinload(Membership.organization), selectinload(Membership.role))
        .order_by(Membership.created_at)
    )
    return [_to_user_org(m) for m in res.scalars().all()]


from pydantic import BaseModel

class PaymentKeysPayload(BaseModel):
    stripe_enabled: bool | None = None
    stripe_publishable_key: str | None = None
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    razorpay_enabled: bool | None = None
    razorpay_key_id: str | None = None
    razorpay_key_secret: str | None = None


def _format_payment_keys(org: Organization) -> dict:
    settings = dict(getattr(org, "settings", {}) or {})
    sk = settings.get("stripe_secret_key") or ""
    masked_sk = (sk[:7] + "•" * 24 + sk[-4:]) if len(sk) > 12 else (sk if sk else "")
    
    rzp_sec = settings.get("razorpay_key_secret") or ""
    masked_rzp_sec = (rzp_sec[:4] + "•" * 16 + rzp_sec[-3:]) if len(rzp_sec) > 8 else (rzp_sec if rzp_sec else "")

    return {
        "stripe_enabled": bool(settings.get("stripe_enabled", True)),
        "stripe_publishable_key": settings.get("stripe_publishable_key") or "",
        "stripe_secret_key": masked_sk,
        "has_stripe_secret_key": bool(sk),
        "stripe_webhook_secret": settings.get("stripe_webhook_secret") or "",
        "razorpay_enabled": bool(settings.get("razorpay_enabled", False)),
        "razorpay_key_id": settings.get("razorpay_key_id") or "",
        "razorpay_key_secret": masked_rzp_sec,
        "has_razorpay_key_secret": bool(rzp_sec),
    }


def _update_payment_keys_data(org: Organization, payload: PaymentKeysPayload) -> dict:
    settings = dict(getattr(org, "settings", {}) or {})

    if payload.stripe_enabled is not None:
        settings["stripe_enabled"] = payload.stripe_enabled
    if payload.stripe_publishable_key is not None:
        settings["stripe_publishable_key"] = payload.stripe_publishable_key.strip()
    if payload.stripe_secret_key is not None and not payload.stripe_secret_key.startswith("••") and "•" not in payload.stripe_secret_key:
        settings["stripe_secret_key"] = payload.stripe_secret_key.strip()
    if payload.stripe_webhook_secret is not None:
        raw_wh = payload.stripe_webhook_secret.strip()
        # Clean invalid domain entries if user pasted a URL instead of whsec_
        if not raw_wh.startswith("http") and "webinarflow" not in raw_wh:
            settings["stripe_webhook_secret"] = raw_wh
        else:
            settings["stripe_webhook_secret"] = ""

    if payload.razorpay_enabled is not None:
        settings["razorpay_enabled"] = payload.razorpay_enabled
    if payload.razorpay_key_id is not None:
        settings["razorpay_key_id"] = payload.razorpay_key_id.strip()
    if payload.razorpay_key_secret is not None and not payload.razorpay_key_secret.startswith("••") and "•" not in payload.razorpay_key_secret:
        settings["razorpay_key_secret"] = payload.razorpay_key_secret.strip()

    org.settings = settings
    return settings


@router.get("/payment-keys")
async def get_active_organization_payment_keys(
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve payment gateway configuration for the active organization."""
    return _format_payment_keys(membership.organization)


@router.patch("/payment-keys")
async def update_active_organization_payment_keys(
    payload: PaymentKeysPayload,
    membership: Membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update payment gateway configuration for the active organization."""
    _update_payment_keys_data(membership.organization, payload)
    await db.flush()
    return {"status": "ok", "message": "Payment gateway credentials saved"}


async def _load_membership(db: AsyncSession, user_id, org_id: uuid.UUID) -> Membership:
    res = await db.execute(
        select(Membership)
        .where(Membership.user_id == user_id, Membership.organization_id == org_id)
        .options(selectinload(Membership.organization), selectinload(Membership.role))
    )
    membership = res.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You do not have access to this organization")
    return membership


@router.get("/{org_id}", response_model=UserOrganization)
async def get_organization(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    return _to_user_org(await _load_membership(db, current_user.id, org_id))


@router.patch("/{org_id}", response_model=UserOrganization)
async def update_organization(
    org_id: uuid.UUID,
    payload: OrganizationUpdate,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    org = membership.organization
    if payload.name is not None:
        org.name = payload.name
    if payload.slug is not None:
        org.slug = payload.slug
    await db.flush()
    membership.organization = org  # reflect updates
    return _to_user_org(membership)


@router.post("/{org_id}/default", response_model=UserOrganization)
async def set_default_organization(
    org_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    membership = await _load_membership(db, current_user.id, org_id)
    # Unset the previous default membership for this user, then mark this one.
    res = await db.execute(
        select(Membership).where(Membership.user_id == current_user.id, Membership.is_default.is_(True))
    )
    for prev in res.scalars().all():
        prev.is_default = False
    membership.is_default = True
    await db.flush()
    return _to_user_org(membership)


@router.get("/{org_id}/members", response_model=list[OrganizationMember])
async def list_members(
    org_id: uuid.UUID,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Membership)
        .where(Membership.organization_id == org_id)
        .options(selectinload(Membership.user), selectinload(Membership.role))
        .order_by(Membership.created_at)
    )
    return [
        OrganizationMember(
            user_id=m.user.id,
            email=m.user.email,
            full_name=m.user.full_name,
            role=m.role.name,
            is_default=m.is_default,
            joined_at=m.created_at,
        )
        for m in res.scalars().all()
    ]


@router.post("/{org_id}/members", response_model=OrganizationMember, status_code=status.HTTP_201_CREATED)
async def add_member(
    org_id: uuid.UUID,
    payload: AddMemberRequest,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    if payload.role_name not in {"admin", "member", "viewer"}:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role_name must be one of: admin, member, viewer")
    user_res = await db.execute(select(User).where(User.email == payload.email))
    target = user_res.scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No user found for that email — invite-by-email is not supported yet")
    existing = (await db.execute(
        select(Membership).where(Membership.user_id == target.id, Membership.organization_id == org_id)
    )).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "User is already a member")
    role = await _get_role_by_name(db, payload.role_name)
    new_membership = Membership(user_id=target.id, organization_id=org_id, role_id=role.id, is_default=False)
    db.add(new_membership)
    await db.flush()
    return OrganizationMember(
        user_id=target.id,
        email=target.email,
        full_name=target.full_name,
        role=role.name,
        is_default=False,
        joined_at=new_membership.created_at,
    )


@router.delete("/{org_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: uuid.UUID,
    user_id: uuid.UUID,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    if membership.role.name == "owner" and membership.user_id == user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot remove the owner of the organization")
    res = await db.execute(
        select(Membership).where(Membership.user_id == user_id, Membership.organization_id == org_id)
    )
    target = res.scalar_one_or_none()
    if target is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    await db.delete(target)


@router.get("/{org_id}/payment-keys")
async def get_organization_payment_keys(
    org_id: uuid.UUID,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve payment gateway configuration for this organization by ID."""
    return _format_payment_keys(membership.organization)


@router.patch("/{org_id}/payment-keys")
async def update_organization_payment_keys(
    org_id: uuid.UUID,
    payload: PaymentKeysPayload,
    membership: Membership = Depends(require_org_permissions("org:manage")),
    db: AsyncSession = Depends(get_db),
):
    """Update payment gateway configuration for this organization by ID."""
    _update_payment_keys_data(membership.organization, payload)
    await db.flush()
    return {"status": "ok", "message": "Payment gateway credentials saved"}
