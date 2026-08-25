"""Shared pytest fixtures.

The whole suite runs against a single in-memory SQLite database held open by
a ``StaticPool`` (so every connection sees the same schema and rows). The
schema is created from ``Base.metadata`` — the same metadata the Alembic
migration mirrors — and RBAC is seeded once per test via the real seeder, so
tests exercise production code paths rather than fixtures faking them.

``get_db`` is overridden to hand out sessions bound to the test engine; the
app's real Postgres engine is never touched, and the ASGI lifespan (which
would try to reach Postgres) is intentionally not run by the httpx transport.
"""
from __future__ import annotations

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401  -- registers all models on Base.metadata
from app.db import Base, get_db
from app.main import app
from app.models import User
from app.services.rbac import seed_rbac


@pytest_asyncio.fixture
async def engine():
    """A fresh in-memory SQLite engine with the schema created and RBAC seeded."""
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sessionmaker = async_sessionmaker(eng, class_=AsyncSession, expire_on_commit=False)
    async with sessionmaker() as session:
        await seed_rbac(session)

    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
def session_factory(engine):
    return async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False, autoflush=False)


@pytest_asyncio.fixture
async def session(session_factory) -> AsyncSession:
    """A standalone session for service-level (non-HTTP) tests."""
    async with session_factory() as s:
        yield s


@pytest_asyncio.fixture
async def client(session_factory):
    """An httpx client wired to the app with ``get_db`` overridden.

    Mirrors the production ``get_db`` contract: commit on success, roll back on
    error — so endpoints that rely on the dependency committing behave the same.
    """

    async def _override_get_db():
        async with session_factory() as s:
            try:
                yield s
                await s.commit()
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


# --- helpers -------------------------------------------------------------- #

DEFAULT_PASSWORD = "sup3r-secret-pw"


async def register_user(
    client: AsyncClient,
    email: str,
    password: str = DEFAULT_PASSWORD,
    full_name: str | None = "Test User",
) -> dict:
    """Register a user and return the parsed JSON response."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "full_name": full_name},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def login_user(
    client: AsyncClient,
    email: str,
    password: str = DEFAULT_PASSWORD,
) -> dict:
    """Log in a verified user and return the AuthResponse."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def register_and_verify_user(
    client: AsyncClient,
    session: AsyncSession,
    email: str,
    password: str = DEFAULT_PASSWORD,
    full_name: str | None = "Test User",
) -> dict:
    """Register a user, mark them verified in DB, and log in returning AuthResponse."""
    await register_user(client, email=email, password=password, full_name=full_name)
    user_res = await session.execute(select(User).where(User.email == email))
    user = user_res.scalar_one()
    user.email_verified = True
    user.is_verified = True
    await session.commit()
    return await login_user(client, email=email, password=password)


def auth_header(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}
