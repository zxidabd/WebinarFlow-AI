"""phase2: webinars, registrants, attendance, activity timeline

Creates the Phase-2 schema: webinars (tenant-scoped via organization_id),
registrants (the customer/lead data layer — registrant.status tracks the
funnel stage so later phases just add rows), attendance, and the
per-registrant WebinarActivity timeline that feeds the customer activity feed
and the analytics counts.

Revision ID: 0002-phase2-webinars
Revises: 0001-initial-auth-tenancy
Create Date: 2026-07-15
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0002_phase2_webinars"
down_revision = "0001_initial_auth_tenancy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # webinars
    op.create_table(
        "webinars",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("draft", "scheduled", "live", "completed", "cancelled", name="webinar_status", native_enum=False, length=32),
            nullable=False,
            server_default="draft",
        ),
        sa.Column(
            "provider",
            sa.Enum("none", "zoom", "google_meet", name="meeting_provider", native_enum=False, length=32),
            nullable=False,
            server_default="none",
        ),
        sa.Column("provider_meeting_id", sa.String(length=255), nullable=True),
        sa.Column("starts_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("timezone", sa.String(length=64), nullable=False, server_default="UTC"),
        sa.Column("capacity", sa.Integer(), nullable=True),
        sa.Column("location_type", sa.String(length=16), nullable=False, server_default="online"),
        sa.Column("agenda", sa.JSON(), nullable=True),
        sa.Column("ai_topic", sa.String(length=512), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "slug", name="uq_webinar_org_slug"),
    )
    op.create_index("ix_webinars_organization_id", "webinars", ["organization_id"])
    op.create_index("ix_webinars_slug", "webinars", ["slug"])
    op.create_index("ix_webinars_status", "webinars", ["status"])

    # registrants (the customer/lead data layer)
    op.create_table(
        "registrants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("webinar_id", sa.Uuid(), sa.ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=True),
        sa.Column(
            "status",
            sa.Enum(
                "visitor", "registered", "attended", "cancelled", "noshow", "purchased",
                name="registrant_status", native_enum=False, length=32,
            ),
            nullable=False,
            server_default="registered",
        ),
        sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("custom_fields", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("webinar_id", "email", name="uq_registrant_webinar_email"),
    )
    op.create_index("ix_registrants_webinar_id", "registrants", ["webinar_id"])
    op.create_index("ix_registrants_email", "registrants", ["email"])

    # attendance (live session record)
    op.create_table(
        "attendances",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("webinar_id", sa.Uuid(), sa.ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("registrant_id", sa.Uuid(), sa.ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("left_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("webinar_id", "registrant_id", name="uq_attendance_webinar_registrant"),
    )
    op.create_index("ix_attendances_webinar_id", "attendances", ["webinar_id"])
    op.create_index("ix_attendances_registrant_id", "attendances", ["registrant_id"])

    # webinar_activities (the customer activity timeline + analytics source)
    op.create_table(
        "webinar_activities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("registrant_id", sa.Uuid(), sa.ForeignKey("registrants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("webinar_id", sa.Uuid(), sa.ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=48), nullable=False),
        sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("meta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_webinar_activities_registrant_id", "webinar_activities", ["registrant_id"])
    op.create_index("ix_webinar_activities_webinar_id", "webinar_activities", ["webinar_id"])
    op.create_index("ix_webinar_activities_event_type", "webinar_activities", ["event_type"])
    op.create_index("ix_webinar_activities_occurred_at", "webinar_activities", ["occurred_at"])


def downgrade() -> None:
    op.drop_index("ix_webinar_activities_occurred_at", table_name="webinar_activities")
    op.drop_index("ix_webinar_activities_event_type", table_name="webinar_activities")
    op.drop_index("ix_webinar_activities_webinar_id", table_name="webinar_activities")
    op.drop_index("ix_webinar_activities_registrant_id", table_name="webinar_activities")
    op.drop_table("webinar_activities")

    op.drop_index("ix_attendances_registrant_id", table_name="attendances")
    op.drop_index("ix_attendances_webinar_id", table_name="attendances")
    op.drop_table("attendances")

    op.drop_index("ix_registrants_email", table_name="registrants")
    op.drop_index("ix_registrants_webinar_id", table_name="registrants")
    op.drop_table("registrants")

    op.drop_index("ix_webinars_status", table_name="webinars")
    op.drop_index("ix_webinars_slug", table_name="webinars")
    op.drop_index("ix_webinars_organization_id", table_name="webinars")
    op.drop_table("webinars")
