"""Verify the Alembic migration builds the real schema on PostgreSQL.

This closes the last open Phase-1 backend item from ``docs/BUILD-PLAN.md``:
"migration unverified against Postgres" (every test in ``backend/tests/``
runs against in-memory SQLite via ``Base.metadata.create_all``, so the
Alembic migration itself is exercised nowhere). The fast test loop does
*not* need Postgres, so this is a *separate*, opt-in path rather than a
pytest fixture.

WHAT IT VERIFIES
  1. ``alembic upgrade head`` runs cleanly against a real Postgres DB
     (the *migration*, not ``Base.metadata``).
  2. Every table, unique constraint, foreign key, and index the migration
     declares actually exists in the resulting schema.
  3. The production ``seed_rbac`` seeder runs against the migrated tables
     and the full RBAC catalog (owner/admin/member/viewer + all 11 perms)
     lands — proving the migration's ``roles``/``permissions``/
     ``role_permissions`` tables are usable by production code paths.
  4. (optional) ``alembic downgrade base`` drops everything cleanly.

USAGE
  Requires a reachable, *empty-ish* PostgreSQL and the asyncpg driver
  (already pinned in requirements.txt). Point the app's DATABASE_URL at it
  and run from the backend directory::

      # pick a throwaway DB (create it once out-of-band)
      DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wf_verify \
      SQLITE_FALLBACK=false \
      python -m scripts.verify_migration_postgres

  The script opens the DB *through the app config* (``settings.DATABASE_URL``)
  exactly as Alembic's ``env.py`` does, then shells out to the ``alembic``
  CLI so ``env.py`` re-reads the same env var. A failed assertion prints the
  diff and exits non-zero, so this works as a CI gate.

  If no PostgreSQL is available locally, the *expected output* is documented
  at the bottom of this file and the live run can be deferred — but the
  assertions here are what a future CI matrix must satisfy.
"""
from __future__ import annotations

import asyncio
import os
import subprocess
import sys
from pathlib import Path

# Ensure the backend root is importable when run as a module or directly.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, select  # noqa: E402
from sqlalchemy.ext.asyncio import (  # noqa: E402
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings  # noqa: E402
from app.models import Permission, Role, role_permissions  # noqa: E402
from app.services.rbac import PERMISSIONS, ROLE_PERMISSIONS, ROLES, seed_rbac  # noqa: E402

# --- expected schema (mirrors migration 0001_initial_auth_tenancy.py) --------- #

EXPECTED_TABLES = {
    "users",
    "roles",
    "permissions",
    "role_permissions",
    "organizations",
    "memberships",
    "refresh_tokens",
}

# We assert uniqueness via the column's unique flag / unique constraints.
EXPECTED_UNIQUE_COLUMNS = {
    ("users", "email"),
    ("roles", "name"),
    ("permissions", "name"),
    ("organizations", "slug"),
    ("refresh_tokens", "token_hash"),
}
# Plus the composite membership constraint.
EXPECTED_UNIQUE_CONSTRAINTS = {
    "memberships": {"uq_membership_user_org"},
}

# table -> {column: (referred_table, referred_column, ondelete)}
EXPECTED_FKS: dict[str, dict[str, tuple[str, str, str | None]]] = {
    "role_permissions": {
        "role_id": ("roles", "id", "CASCADE"),
        "permission_id": ("permissions", "id", "CASCADE"),
    },
    "organizations": {
        "owner_user_id": ("users", "id", "RESTRICT"),
    },
    "memberships": {
        "user_id": ("users", "id", "CASCADE"),
        "organization_id": ("organizations", "id", "CASCADE"),
        "role_id": ("roles", "id", "RESTRICT"),
    },
    "refresh_tokens": {
        "user_id": ("users", "id", "CASCADE"),
    },
}

EXPECTED_INDEXES = {
    "users": {"ix_users_email"},
    "roles": {"ix_roles_name"},
    "permissions": {"ix_permissions_name"},
    "organizations": {"ix_organizations_slug"},
    "memberships": {"ix_memberships_user_id", "ix_memberships_organization_id"},
    "refresh_tokens": {"ix_refresh_tokens_user_id", "ix_refresh_tokens_token_hash"},
}


def _run_alembic(*args: str) -> None:
    """Shell out to the alembic CLI from the backend root."""
    backend_root = Path(__file__).resolve().parent.parent
    env = {**os.environ, "PYTHONPATH": str(backend_root)}
    cmd = ["alembic", *args]
    print(f"\n$ {' '.join(cmd)}")
    result = subprocess.run(cmd, cwd=str(backend_root), env=env)
    if result.returncode != 0:
        raise SystemExit(f"alembic {' '.join(args)} exited {result.returncode}")


async def _assert_schema(engine) -> list[str]:
    """Inspect the migrated DB and return a list of assertion failures."""
    failures: list[str] = []

    def check(sync_conn):
        insp = inspect(sync_conn)

        tables = set(insp.get_table_names())
        missing_tables = EXPECTED_TABLES - tables
        if missing_tables:
            failures.append(f"missing tables: {sorted(missing_tables)}")
        extra = tables - EXPECTED_TABLES
        if extra:
            failures.append(f"unexpected extra tables: {sorted(extra)}")

        # unique columns
        for table, col in EXPECTED_UNIQUE_COLUMNS:
            cols = {c["name"]: c for c in insp.get_columns(table)}
            if col not in cols:
                failures.append(f"{table}.{col}: column missing")
                continue
            # SQLite reports column-level unique; Postgres reports it as a UQ.
            uniques = {uq["name"] for uq in insp.get_unique_constraints(table)}
            col_unique_flags = {c["name"]: bool(c.get("unique")) for c in insp.get_columns(table)}
            is_unique = col_unique_flags.get(col) or any(
                col in (uq.get("column_names") or []) for uq in insp.get_unique_constraints(table)
            )
            if not is_unique:
                failures.append(f"{table}.{col}: expected UNIQUE (uqs={uniques})")

        # named composite unique constraints (memberships)
        for table, names in EXPECTED_UNIQUE_CONSTRAINTS.items():
            present = {uq["name"] for uq in insp.get_unique_constraints(table)}
            for name in names:
                if name not in present:
                    failures.append(f"{table}: missing unique constraint {name!r} (have {present})")

        # foreign keys + ondelete
        for table, fks in EXPECTED_FKS.items():
            ref = {f["name"]: f for f in insp.get_foreign_keys(table)}
            # index by the constrained columns for lookup
            by_cols = {tuple(f["constrained_columns"]): f for f in insp.get_foreign_keys(table)}
            for col, (reftable, refcol, ondelete) in fks.items():
                f = by_cols.get((col,))
                if not f:
                    failures.append(f"{table}.{col}: missing FK")
                    continue
                if f["referred_table"] != reftable or f["referred_columns"] != [refcol]:
                    failures.append(
                        f"{table}.{col}: FK references "
                        f"{f['referred_table']}.{f['referred_columns']}, "
                        f"expected {reftable}.{refcol}"
                    )
                fkon = f.get("options", {}).get("ondelete") if f.get("options") else None
                # ondelete may live directly on the fk dict in some dialects
                actual_ondelete = f.get("ondelete") or (
                    f.get("options", {}).get("ondelete") if f.get("options") else None
                )
                if ondelete and actual_ondelete and actual_ondelete.upper() != ondelete.upper():
                    failures.append(
                        f"{table}.{col}: ondelete={actual_ondelete!r}, expected {ondelete!r}"
                    )

        # indexes
        for table, names in EXPECTED_INDEXES.items():
            present = {ix["name"] for ix in insp.get_indexes(table)}
            for name in names:
                if name not in present:
                    failures.append(f"{table}: missing index {name!r} (have {present})")

    async with engine.connect() as conn:
        await conn.run_sync(check)
    return failures


async def _assert_rbac_seeds(engine) -> list[str]:
    """Run the real seeder against the migrated DB and assert the catalog."""
    failures: list[str] = []
    factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with factory() as session:
        await seed_rbac(session)

        perms = {
            p.name for p in (await session.execute(select(Permission))).scalars().all()
        }
        expected_perms = {name for name, _ in PERMISSIONS}
        if perms != expected_perms:
            failures.append(
                f"permissions mismatch: missing={expected_perms - perms}, "
                f"extra={perms - expected_perms}"
            )

        roles = {
            r.name: r for r in (await session.execute(select(Role))).scalars().all()
        }
        if set(roles) != set(ROLES):
            failures.append(f"roles mismatch: have {sorted(roles)}, expected {sorted(ROLES)}")
        else:
            links = {
                (row.role_id, row.permission_id)
                for row in (
                    await session.execute(
                        select(role_permissions.c.role_id, role_permissions.c.permission_id)
                    )
                ).all()
            }
            all_perms = {
                p.name: p.id for p in (await session.execute(select(Permission))).scalars().all()
            }
            for role_name in ROLES:
                expected_ids = {all_perms[pn] for pn in ROLE_PERMISSIONS[role_name]}
                have_ids = {
                    pid for (rid, pid) in links if rid == roles[role_name].id
                }
                if have_ids != expected_ids:
                    failures.append(
                        f"role {role_name}: permission set mismatch "
                        f"(missing={expected_ids - have_ids}, extra={have_ids - expected_ids})"
                    )
    return failures


async def _main() -> int:
    url = settings.DATABASE_URL
    if not url.startswith("postgresql"):
        print(
            "REFUSING to run: DATABASE_URL is not Postgres "
            f"({url!r}). Set DATABASE_URL=postgresql+asyncpg://... and SQLITE_FALLBACK=false."
        )
        return 2

    print(f"Verifying Alembic migration against Postgres:\n  {url}")
    if settings.SQLITE_FALLBACK:
        print("  NOTE: SQLITE_FALLBACK is true — DATABASE_URL above is what Alembic sees regardless.")

    # 1 + 2: upgrade head, then inspect.
    _run_alembic("upgrade", "head")
    engine = create_async_engine(url)
    try:
        print("\n[1/3] Inspecting schema created by the migration…")
        schema_failures = await _assert_schema(engine)
        if schema_failures:
            print("  FAIL:")
            for f in schema_failures:
                print(f"    - {f}")
        else:
            print("  OK — all tables, uniques, FKs and indexes present.")

        # 3: seed RBAC against the migrated tables.
        print("\n[2/3] Running production seed_rbac against the migrated tables…")
        rbac_failures = await _assert_rbac_seeds(engine)
        if rbac_failures:
            print("  FAIL:")
            for f in rbac_failures:
                print(f"    - {f}")
        else:
            print("  OK — RBAC catalog seeded (owner/admin/member/viewer + 11 perms).")
    finally:
        await engine.dispose()

    # 4 (optional): downgrade path.
    do_downgrade = os.environ.get("VERIFY_DOWNGRADE", "1") not in ("0", "false", "no")
    downgrade_ok = True
    if do_downgrade:
        print("\n[3/3] Verifying downgrade to base drops all tables…")
        _run_alembic("downgrade", "base")
        eng2 = create_async_engine(url)
        try:
            async with eng2.connect() as conn:
                leftover = await conn.run_sync(
                    lambda c: set(inspect(c).get_table_names())
                )
            if leftover & EXPECTED_TABLES:
                print(f"  FAIL: tables remain after downgrade: {sorted(leftover & EXPECTED_TABLES)}")
                downgrade_ok = False
            else:
                print("  OK — all migrated tables dropped on downgrade.")
        finally:
            await eng2.dispose()

    all_failures = schema_failures + rbac_failures
    print("\n" + "=" * 60)
    if all_failures or not downgrade_ok:
        print("RESULT: FAIL")
        return 1
    print("RESULT: PASS — Alembic migration verified against PostgreSQL.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))


# --------------------------------------------------------------------------- #
# Expected output when run against a throwaway Postgres (documented for the
# case where no local Postgres is available and the run is deferred):
#
#   Verifying Alembic migration against Postgres:
#     postgresql+asyncpg://postgres:postgres@localhost:5432/wf_verify
#
#   $ alembic upgrade head
#   INFO  [alembic.runtime.migration] Running upgrade  -> 0001-initial-auth-tenancy
#
#   [1/3] Inspecting schema created by the migration…
#     OK — all tables, uniques, FKs and indexes present.
#   [2/3] Running production seed_rbac against the migrated tables…
#     INFO  [webinarflow.rbac] RBAC seed complete: 4 roles, 11 permissions
#     OK — RBAC catalog seeded (owner/admin/member/viewer + 11 perms).
#   [3/3] Verifying downgrade to base drops all tables…
#   $ alembic downgrade base
#   INFO  [alembic.runtime.migration] Running downgrade 0001-initial-auth-tenancy -> base
#     OK — all migrated tables dropped on downgrade.
#
#   ============================================================
#   RESULT: PASS — Alembic migration verified against PostgreSQL.
# --------------------------------------------------------------------------- #
