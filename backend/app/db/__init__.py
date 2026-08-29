"""Async SQLAlchemy database session/engine setup.

Uses a side-by-side engine strategy: an async engine for application code
and a sync reference of the metadata's bind for Alembic migrations.
"""
from __future__ import annotations

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _resolve_url() -> str:
    """Allow a SQLite fallback when explicitly requested, and normalize Postgres URLs for asyncpg."""
    raw_url = str(settings.DATABASE_URL or "").strip()
    if raw_url and ("postgres" in raw_url or "postgresql" in raw_url) and "localhost" not in raw_url:
        if raw_url.startswith("postgres://"):
            return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
        if raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
            return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return raw_url

    if settings.SQLITE_FALLBACK and (not raw_url or "localhost" in raw_url):
        return "sqlite+aiosqlite:///.local.db"

    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+"):
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url or "sqlite+aiosqlite:///.local.db"


engine = create_async_engine(
    _resolve_url(),
    echo=settings.DEBUG and settings.ENVIRONMENT == "development",
    future=True,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Declarative base shared by all ORM models."""


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency yielding an async DB session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
