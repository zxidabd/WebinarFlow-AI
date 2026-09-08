from __future__ import annotations

from typing import Any
import uuid

from sqlalchemy import BigInteger, ForeignKey, String
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base
from app.models.base import TimestampMixin


class AIChatSession(TimestampMixin, Base):
    __tablename__ = "ai_chat_sessions"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), default="New Chat", nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="recent", nullable=False)
    messages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list, nullable=False)
    created_at_ms: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
