"""Shared declarative primitives reused by every ORM model.

`UUIDMixin` gives a model a UUID primary key (`id`), and `TimestampMixin`
adds `created_at` / `updated_at` audit columns. Mixing them in keeps the
Phase-1 tables — and every later table — consistent without repeating the
same column declarations in each model module.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db import Base


class UUIDMixin:
    """UUID primary key, Python-side default (works on Postgres and SQLite)."""

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)


class TimestampMixin:
    """`created_at` (set once by the DB) and `updated_at` (refreshed on update)."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
