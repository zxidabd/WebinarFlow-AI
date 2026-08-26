"""Add template_id and SEO columns to landing_pages table.

Revision ID: 0007_landing_pages_template_id
Revises: 0006_webinar_pricing_counters
Create Date: 2026-08-27
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0007_landing_pages_template_id"
down_revision = "0006_webinar_pricing_counters"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col["name"] for col in inspector.get_columns("landing_pages")]

    if "template_id" not in existing_columns:
        op.add_column("landing_pages", sa.Column("template_id", sa.String(length=64), nullable=True))
    if "custom_head_html" not in existing_columns:
        op.add_column("landing_pages", sa.Column("custom_head_html", sa.Text(), nullable=True))
    if "custom_body_html" not in existing_columns:
        op.add_column("landing_pages", sa.Column("custom_body_html", sa.Text(), nullable=True))
    if "meta_title" not in existing_columns:
        op.add_column("landing_pages", sa.Column("meta_title", sa.String(length=255), nullable=True))
    if "meta_description" not in existing_columns:
        op.add_column("landing_pages", sa.Column("meta_description", sa.String(length=512), nullable=True))
    if "meta_image" not in existing_columns:
        op.add_column("landing_pages", sa.Column("meta_image", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("landing_pages", "meta_image")
    op.drop_column("landing_pages", "meta_description")
    op.drop_column("landing_pages", "meta_title")
    op.drop_column("landing_pages", "custom_body_html")
    op.drop_column("landing_pages", "custom_head_html")
    op.drop_column("landing_pages", "template_id")
