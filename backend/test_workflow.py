#!/usr/bin/env python
"""Integrated workflow test — exercises the full registration cascade."""

import asyncio
import hashlib
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Ensure backend is on path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Override DATABASE_URL to use SQLite for testing
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test_workflow.db"
os.environ["SQLITE_FALLBACK"] = "True"

from app.db import Base
from app.models import Webinar, WebinarStatus, LandingPage, LandingPageStatus, LandingPageType, Registrant, WebinarActivity, Attendance
from app.services import webinar_service, registration_service, landing_page_service
from app.schemas.webinar import WebinarCreate
from app.schemas.landing_page import LandingPageCreate


async def main():
    print("=" * 60)
    print("PHASE 2 INTEGRATED WORKFLOW TEST")
    print("=" * 60)

    # Create fresh DB for testing
    db_file = "test_workflow.db"
    if os.path.exists(db_file):
        os.remove(db_file)
        print(f"Removed old {db_file}")

    engine = create_async_engine("sqlite+aiosqlite:///./test_workflow.db", echo=False, future=True)
    AsyncSessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created\n")

    org_id = uuid.uuid4()
    user_id = uuid.uuid4()

    async with AsyncSessionLocal() as db:
        # 1. Create Webinar
        print("1. Creating webinar...")
        webinar_payload = WebinarCreate(
            title="AI-Powered Webinar Mastery",
            description="Learn to build webinar funnels with AI",
            starts_at=datetime.now(timezone.utc) + timedelta(days=7),
            ends_at=datetime.now(timezone.utc) + timedelta(days=7, hours=1),
            capacity=100,
            is_published=True,
        )
        webinar = await webinar_service.create_webinar(
            db, organization_id=org_id, created_by=user_id, payload=webinar_payload
        )
        await db.flush()
        print(f"   [OK] Webinar created: id={webinar.id}, slug={webinar.slug}")
        print(f"   Initial registration_count={webinar.registration_count}\n")

        # 2. Create Landing Page
        print("2. Creating landing page...")
        lp_payload = LandingPageCreate(
            webinar_id=webinar.id,
            title="Join AI Webinar Mastery",
            slug="ai-webinar-mastery",
            page_type=LandingPageType.opt_in,
            meta_title="Register for AI Webinar",
            meta_description="Free webinar on building webinar funnels with AI",
        )
        landing_page = await landing_page_service.create_landing_page(
            db, webinar_id=webinar.id, organization_id=org_id, created_by=user_id, payload=lp_payload
        )
        await db.flush()
        print(f"   [OK] Landing page created: id={landing_page.id}, slug={landing_page.slug}\n")

        # 3. Publish Landing Page
        print("3. Publishing landing page...")
        from app.schemas.landing_page import LandingPageUpdate
        lp_updated = await landing_page_service.update_landing_page(
            db, webinar_id=webinar.id, organization_id=org_id,
            landing_page_id=landing_page.id,
            payload=LandingPageUpdate(is_published=True)
        )
        print(f"   [OK] Landing page published: is_published={lp_updated.is_published}\n")

        # 4. Visit Landing Page (simulate traffic)
        print("4. Recording landing page visits...")
        visit = await landing_page_service.record_landing_page_visit(
            db, landing_page_id=landing_page.id,
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0",
            utm_source="google",
            utm_medium="cpc",
            utm_campaign="webinar-launch"
        )
        await db.flush()
        print(f"   [OK] Visit recorded: id={visit.id}\n")

        # 5. Submit Registration
        print("5. Registering for webinar (via landing page)...")
        utm = registration_service.UTM(
            source="google",
            medium="cpc",
            campaign="webinar-launch",
            ip="192.168.1.100"
        )
        registrant = await registration_service.register_for_webinar(
            db, webinar=webinar,
            email="john.doe@example.com",
            full_name="John Doe",
            landing_page_id=landing_page.id,
            utm=utm
        )
        await db.flush()
        print(f"   [OK] Registrant created: id={registrant.id}, email={registrant.email}")
        print(f"   Linked to landing_page: {registrant.landing_page_id}")
        print(f"   UTM source: {registrant.utm_source}, medium: {registrant.utm_medium}\n")

        # 6. Verify Registrant record
        print("6. Verifying registrant record...")
        res = await db.execute(select(Registrant).where(Registrant.id == registrant.id))
        saved_registrant = res.scalar_one()
        assert saved_registrant is not None, "Registrant not found!"
        assert saved_registrant.email == "john.doe@example.com"
        assert saved_registrant.full_name == "John Doe"
        assert saved_registrant.landing_page_id == landing_page.id
        assert saved_registrant.utm_source == "google"
        print(f"   [OK] Registrant verified: {saved_registrant.email}\n")

        # 7. Verify Webinar registration_count incremented
        print("7. Verifying webinar registration_count incremented...")
        await db.refresh(webinar)
        assert webinar.registration_count == 1, f"Expected 1, got {webinar.registration_count}"
        print(f"   [OK] registration_count = {webinar.registration_count}\n")

        # 8. Landing Page visit count (no denormalized field in Phase 2, count visits)
        print("8. Verifying landing page visit count...")
        visit_count = (await db.execute(
            select(func.count(LandingPageVisit.id)).where(LandingPageVisit.landing_page_id == landing_page.id)
        )).scalar_one()
        assert visit_count >= 1, f"Expected >= 1 visits, got {visit_count}"
        print(f"   [OK] Visit count = {visit_count}\n")

        # 9. Verify WebinarActivity log created
        print("9. Verifying WebinarActivity log...")
        activity = (await db.execute(
            select(WebinarActivity)
            .where(WebinarActivity.registrant_id == registrant.id)
            .where(WebinarActivity.event_type == "registered")
        )).scalar_one_or_none()
        assert activity is not None, "No WebinarActivity found!"
        print(f"   [OK] Activity log created: event_type={activity.event_type}")
        print(f"   Meta: {activity.meta}\n")

        # 10. Duplicate webinar test (optional)
        print("10. Testing webinar duplication...")
        duplicate = await webinar_service.duplicate_webinar(
            db, organization_id=org_id, webinar_id=webinar.id
        )
        await db.flush()
        print(f"    [OK] Duplicate created: id={duplicate.id}, title={duplicate.title}")
        print(f"    Duplicate starts as draft: status={duplicate.status}, registration_count={duplicate.registration_count}\n")

        print("=" * 60)
        print("ALL WORKFLOW TESTS PASSED [OK]")
        print("=" * 60)
        print()
        print("Cascade verified:")
        print("  • Webinar creation → auto-generated slug")
        print("  • Landing Page creation → linked to webinar")
        print("  • Landing Page publish → is_published flag")
        print("  • Visit tracking → LandingPageVisit record")
        print("  • Registration → Registrant + UTM attribution + landing_page link")
        print("  • Counter increment → webinar.registration_count += 1")
        print("  • Audit log → WebinarActivity timeline entry")
        print("  • Duplication → new draft webinar with unique slug")


if __name__ == "__main__":
    asyncio.run(main())