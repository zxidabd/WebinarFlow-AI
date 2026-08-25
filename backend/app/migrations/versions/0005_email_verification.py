"""Add email_verified and email_verification_tokens table.

Revision ID: 0005_email_verification
Revises: 0004_payments
Create Date: 2026-08-25
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import Uuid


# revision identifiers, used by Alembic.
revision = "0005_email_verification"
down_revision = "0004_payments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add email_verified to users
    op.add_column(
        "users",
        sa.Column("email_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )

    # 2. Backfill: set email_verified = true ONLY for accounts with verifiable proof
    # (e.g. Google OAuth accounts where hashed_password is NULL, or accounts previously verified)
    op.execute(
        "UPDATE users SET email_verified = true WHERE hashed_password IS NULL OR is_verified = true"
    )

    # 3. Create email_verification_tokens table for single-use token tracking
    op.create_table(
        "email_verification_tokens",
        sa.Column("id", Uuid, primary_key=True),
        sa.Column("user_id", Uuid, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, index=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )
    op.create_index("ix_email_verification_tokens_user_id", "email_verification_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_email_verification_tokens_user_id", table_name="email_verification_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_column("users", "email_verified")
