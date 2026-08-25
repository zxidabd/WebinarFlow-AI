"""Add pricing and counter columns to webinars table.

Revision ID: 0006_webinar_pricing_counters
Revises: 0005_email_verification
Create Date: 2026-08-25
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0006_webinar_pricing_counters"
down_revision = "0005_email_verification"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use batch or direct ALTER TABLE with safety checks
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col["name"] for col in inspector.get_columns("webinars")]

    if "is_paid" not in existing_columns:
        op.add_column("webinars", sa.Column("is_paid", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    if "price_cents" not in existing_columns:
        op.add_column("webinars", sa.Column("price_cents", sa.Integer(), nullable=False, server_default="0"))
    if "currency" not in existing_columns:
        op.add_column("webinars", sa.Column("currency", sa.String(length=3), nullable=False, server_default="usd"))
    if "payment_gateway" not in existing_columns:
        op.add_column("webinars", sa.Column("payment_gateway", sa.String(length=16), nullable=False, server_default="stripe"))
    if "registration_count" not in existing_columns:
        op.add_column("webinars", sa.Column("registration_count", sa.Integer(), nullable=False, server_default="0"))
    if "attendance_count" not in existing_columns:
        op.add_column("webinars", sa.Column("attendance_count", sa.Integer(), nullable=False, server_default="0"))
    if "visitor_count" not in existing_columns:
        op.add_column("webinars", sa.Column("visitor_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("webinars", "visitor_count")
    op.drop_column("webinars", "attendance_count")
    op.drop_column("webinars", "registration_count")
    op.drop_column("webinars", "payment_gateway")
    op.drop_column("webinars", "currency")
    op.drop_column("webinars", "price_cents")
    op.drop_column("webinars", "is_paid")
