"""Role-based access control catalog + idempotent seeder.

Defines the system-wide permission catalog and the four built-in roles that
map those permissions. ``seed_rbac`` is called from the app lifespan so the
tables are populated before the first request. It is idempotent: it inserts
missing rows and links missing role<->permission associations without
removing anything, so re-running it as the catalog grows never drops data.
"""
from __future__ import annotations

import logging

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Permission, Role, role_permissions

log = logging.getLogger("webinarflow.rbac")

# (name, description)
PERMISSIONS: list[tuple[str, str]] = [
    ("webinar:read", "View webinars"),
    ("webinar:write", "Create and edit webinars"),
    ("webinar:delete", "Delete webinars"),
    ("funnel:read", "View funnel pages"),
    ("funnel:write", "Create and edit funnel pages"),
    ("crm:read", "View CRM data"),
    ("crm:write", "Manage leads, tags, and segments"),
    ("email:send", "Send email and WhatsApp campaigns"),
    ("analytics:read", "View analytics"),
    ("org:manage", "Manage members and organization settings"),
    ("billing:manage", "Manage billing and subscriptions"),
]

ROLE_PERMISSIONS: dict[str, list[str]] = {
    "owner": [name for name, _ in PERMISSIONS],
    # Admin: everything except billing and org transfer power.
    "admin": [name for name, _ in PERMISSIONS if name not in {"billing:manage"}],
    "member": [
        "webinar:read", "webinar:write",
        "funnel:read", "funnel:write",
        "crm:read", "crm:write",
        "email:send",
        "analytics:read",
    ],
    "viewer": ["webinar:read", "funnel:read", "crm:read", "analytics:read"],
}

ROLES: dict[str, str] = {
    "owner": "Full access — created automatically for the org creator.",
    "admin": "Manage the workspace except billing.",
    "member": "Day-to-day webinar and funnel work.",
    "viewer": "Read-only access.",
}


async def seed_rbac(session: AsyncSession) -> None:
    """Ensure the permission and role rows exist and role->perm links are linked."""
    existing_perms = {
        p.name: p
        for p in (await session.execute(select(Permission))).scalars().all()
    }
    for name, desc in PERMISSIONS:
        if name not in existing_perms:
            perm = Permission(name=name, description=desc)
            session.add(perm)
            existing_perms[name] = perm
    await session.flush()

    existing_roles = {
        r.name: r for r in (await session.execute(select(Role))).scalars().all()
    }
    for name, desc in ROLES.items():
        if name not in existing_roles:
            role = Role(name=name, description=desc)
            session.add(role)
            existing_roles[name] = role
    await session.flush()

    # Link missing role->permission associations.
    #
    # Read existing links straight from the association table rather than via
    # ``role.permissions``: freshly-created Role objects have that relationship
    # unloaded, and touching it here would emit a synchronous lazy-load, which
    # raises ``MissingGreenlet`` under the async engine (and would be swallowed
    # by the lifespan seeder, leaving RBAC unseeded on a fresh database).
    existing_links = {
        (row.role_id, row.permission_id)
        for row in (
            await session.execute(
                select(role_permissions.c.role_id, role_permissions.c.permission_id)
            )
        ).all()
    }
    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role = existing_roles[role_name]
        for perm_name in perm_names:
            perm = existing_perms[perm_name]
            if (role.id, perm.id) not in existing_links:
                await session.execute(
                    role_permissions.insert().values(role_id=role.id, permission_id=perm.id)
                )
    await session.flush()
    await session.commit()
    log.info("RBAC seed complete: %d roles, %d permissions", len(ROLES), len(PERMISSIONS))


async def role_exists(session: AsyncSession, name: str) -> Role | None:
    res = await session.execute(select(Role).where(Role.name == name))
    return res.scalar_one_or_none()
