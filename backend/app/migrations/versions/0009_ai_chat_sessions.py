"""Add ai_chat_sessions table for cross-device chat history sync.

Revision ID: 0009_ai_chat_sessions
Revises: 0008_organizations_settings
Create Date: 2026-09-08
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0009_ai_chat_sessions"
down_revision = "0008_organizations_settings"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if "ai_chat_sessions" not in tables:
        op.create_table(
            "ai_chat_sessions",
            sa.Column("id", sa.String(length=100), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True) if conn.dialect.name == "postgresql" else sa.CHAR(36), nullable=False),
            sa.Column("title", sa.String(length=255), server_default="New Chat", nullable=False),
            sa.Column("category", sa.String(length=50), server_default="recent", nullable=False),
            sa.Column("messages", sa.JSON(), nullable=False),
            sa.Column("created_at_ms", sa.BigInteger(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_ai_chat_sessions_user_id", "ai_chat_sessions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_chat_sessions_user_id", table_name="ai_chat_sessions")
    op.drop_table("ai_chat_sessions")