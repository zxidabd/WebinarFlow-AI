"""Add payments table for Stripe/Razorpay integration.

Revision ID: 0004
Revises: 0003_phase2b_landing_pages
Create Date: 2024-08-23

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.types import Uuid


# revision identifiers, used by Alembic.
revision = "0004_payments"
down_revision = "0003_phase2b_landing_pages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create payments table with foreign keys to registrants, webinars, organizations."""
    op.create_table(
        "payments",
        sa.Column("id", Uuid, primary_key=True),
        sa.Column("registrant_id", Uuid, sa.ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("webinar_id", Uuid, sa.ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", Uuid, sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="usd"),
        sa.Column("provider", sa.String(16), nullable=False),
        sa.Column("provider_txn_id", sa.String(255), nullable=True),
        sa.Column("checkout_session_id", sa.String(255), nullable=True),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("failure_code", sa.String(64), nullable=True),
        sa.Column("failure_message", sa.String(512), nullable=True),
        sa.Column("refunded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("refund_amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )

    # Indexes for common queries
    op.create_index("ix_payments_registrant_id", "payments", ["registrant_id"])
    op.create_index("ix_payments_webinar_id", "payments", ["webinar_id"])
    op.create_index("ix_payments_organization_id", "payments", ["organization_id"])
    op.create_index("ix_payments_provider_txn_id", "payments", ["provider_txn_id"])
    op.create_index("ix_payments_checkout_session_id", "payments", ["checkout_session_id"])


def downgrade() -> None:
    """Drop payments table."""
    op.drop_index("ix_payments_checkout_session_id", table_name="payments")
    op.drop_index("ix_payments_provider_txn_id", table_name="payments")
    op.drop_index("ix_payments_organization_id", table_name="payments")
    op.drop_index("ix_payments_webinar_id", table_name="payments")
    op.drop_index("ix_payments_registrant_id", table_name="payments")
    op.drop_table("payments")
