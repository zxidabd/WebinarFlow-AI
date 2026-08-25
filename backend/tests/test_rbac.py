"""RBAC seeding: catalog completeness, role→permission mapping, idempotency."""
from __future__ import annotations

import pytest
from sqlalchemy import func, select

from app.models import Permission, Role
from app.services.rbac import PERMISSIONS, ROLE_PERMISSIONS, ROLES, seed_rbac


async def _perm_count(session) -> int:
    return (await session.execute(select(func.count()).select_from(Permission))).scalar_one()


async def _role_count(session) -> int:
    return (await session.execute(select(func.count()).select_from(Role))).scalar_one()


async def test_catalog_is_fully_seeded(session):
    # The engine fixture already seeded RBAC once.
    assert await _perm_count(session) == len(PERMISSIONS)
    assert await _role_count(session) == len(ROLES)


async def test_role_permission_mapping(session):
    roles = {
        r.name: {p.name for p in r.permissions}
        for r in (await session.execute(select(Role))).scalars().all()
    }
    # Owner holds every permission; viewer is strictly read-only.
    assert roles["owner"] == {name for name, _ in PERMISSIONS}
    assert roles["viewer"] == set(ROLE_PERMISSIONS["viewer"])
    assert "billing:manage" not in roles["admin"]  # admin lacks billing by design


async def test_seed_is_idempotent(session):
    # Re-running the seeder must not duplicate rows or links.
    await seed_rbac(session)
    await seed_rbac(session)
    assert await _perm_count(session) == len(PERMISSIONS)
    assert await _role_count(session) == len(ROLES)

    owner = (
        await session.execute(select(Role).where(Role.name == "owner"))
    ).scalar_one()
    assert len(owner.permissions) == len(PERMISSIONS)
