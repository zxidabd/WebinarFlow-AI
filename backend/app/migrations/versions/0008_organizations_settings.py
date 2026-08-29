"""Add settings column to organizations table.

Revision ID: 0008_organizations_settings
Revises: 0007_landing_pages_template_id
Create Date: 2026-08-29
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0008_organizations_settings"
down_revision = "0007_landing_pages_template_id"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col["name"] for col in inspector.get_columns("organizations")]

    if "settings" not in existing_columns:
        op.add_column("organizations", sa.Column("settings", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("organizations", "settings")
