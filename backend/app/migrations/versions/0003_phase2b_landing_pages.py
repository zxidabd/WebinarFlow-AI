"""phase2b: landing pages, registration attribution, denormalized counters

Creates:
  landing_pages      — per-webinar funnel step pages (opt-in, thank-you, sales, etc.)
  landing_page_visits — anonymous visit tracking (UTM attribution)

Extends:
  registrants        — landing_page_id FK + full UTM attribution fields + ip_hash
  webinars           — denormalized counters: registration_count, attendance_count,
                        visitor_count (updated by the registration service on every
                        registration / attendance change)

Revision ID: 0003-phase2b-landing-pages
Revises: 0002-phase2-webinars
Create Date: 2026-07-19
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_phase2b_landing_pages"
down_revision = "0002_phase2_webinars"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── landing_pages ────────────────────────────────────────────────────────
    op.create_table(
        "landing_pages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("webinar_id", sa.Uuid(), sa.ForeignKey("webinars.id", ondelete="CASCADE"), nullable=False),
        sa.Column("organization_id", sa.Uuid(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column(
            "status",
            sa.Enum("draft", "published", "archived", name="landing_page_status", native_enum=False, length=32),
            nullable=False, server_default="draft",
        ),
        sa.Column(
            "page_type",
            sa.Enum("opt_in", "thank_you", "sales", "replay", "custom", name="landing_page_type", native_enum=False, length=32),
            nullable=False, server_default="opt_in",
        ),
        sa.Column("content", sa.JSON(), nullable=True),
        sa.Column("meta_title", sa.String(length=255), nullable=True),
        sa.Column("meta_description", sa.String(length=512), nullable=True),
        sa.Column("meta_image", sa.String(length=512), nullable=True),
        sa.Column("custom_head_html", sa.Text(), nullable=True),
        sa.Column("custom_body_html", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("webinar_id", "slug", name="uq_landing_page_webinar_slug"),
    )
    op.create_index("ix_landing_pages_webinar_id", "landing_pages", ["webinar_id"])
    op.create_index("ix_landing_pages_organization_id", "landing_pages", ["organization_id"])
    op.create_index("ix_landing_pages_slug", "landing_pages", ["slug"])
    op.create_index("ix_landing_pages_status", "landing_pages", ["status"])

    # ── landing_page_visits ────────────────────────────────────────────────────
    op.create_table(
        "landing_page_visits",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("landing_page_id", sa.Uuid(), sa.ForeignKey("landing_pages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("registrant_id", sa.Uuid(), sa.ForeignKey("registrants.id", ondelete="SET NULL"), nullable=True),
        sa.Column("ip_hash", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("referrer", sa.Text(), nullable=True),
        sa.Column("utm_source", sa.String(length=128), nullable=True),
        sa.Column("utm_medium", sa.String(length=128), nullable=True),
        sa.Column("utm_campaign", sa.String(length=128), nullable=True),
        sa.Column("utm_content", sa.String(length=128), nullable=True),
        sa.Column("utm_term", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_landing_page_visits_landing_page_id", "landing_page_visits", ["landing_page_id"])
    op.create_index("ix_landing_page_visits_registrant_id", "landing_page_visits", ["registrant_id"])

    # ── extend registrants ────────────────────────────────────────────────────
    op.add_column("registrants", sa.Column("landing_page_id", sa.Uuid(), sa.ForeignKey("landing_pages.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_registrants_landing_page_id", "registrants", ["landing_page_id"])
    op.add_column("registrants", sa.Column("utm_source", sa.String(length=128), nullable=True))
    op.add_column("registrants", sa.Column("utm_medium", sa.String(length=128), nullable=True))
    op.add_column("registrants", sa.Column("utm_campaign", sa.String(length=128), nullable=True))
    op.add_column("registrants", sa.Column("utm_content", sa.String(length=128), nullable=True))
    op.add_column("registrants", sa.Column("utm_term", sa.String(length=128), nullable=True))
    op.add_column("registrants", sa.Column("referrer", sa.String(length=512), nullable=True))
    op.add_column("registrants", sa.Column("ip_hash", sa.String(length=64), nullable=True))

    # ── denormalized webinar counters ─────────────────────────────────────────
    op.add_column("webinars", sa.Column("registration_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("webinars", sa.Column("attendance_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("webinars", sa.Column("visitor_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.remove_column("webinars", "visitor_count")
    op.remove_column("webinars", "attendance_count")
    op.remove_column("webinars", "registration_count")

    op.remove_column("registrants", "ip_hash")
    op.remove_column("registrants", "referrer")
    op.remove_column("registrants", "utm_term")
    op.remove_column("registrants", "utm_content")
    op.remove_column("registrants", "utm_campaign")
    op.remove_column("registrants", "utm_medium")
    op.remove_column("registrants", "utm_source")
    op.drop_index("ix_registrants_landing_page_id", table_name="registrants")
    op.remove_column("registrants", "landing_page_id")

    op.drop_table("landing_page_visits")
    op.drop_table("landing_pages")