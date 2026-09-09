from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import (
    LandingPage,
    LandingPageVisit,
    Membership,
    Payment,
    PaymentStatus,
    Registrant,
    RegistrantStatus,
    Attendance,
    WebinarActivity,
    User,
    Webinar,
)

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    range: str = Query(default="30d"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Real live analytics and funnel metrics for the user's workspace."""
    try:
        # 1. Parse date range
        clean_range = (range or "30d").strip().lower()
        start_time: datetime | None = None
        if clean_range == "7d":
            start_time = datetime.now(timezone.utc) - timedelta(days=7)
        elif clean_range == "all":
            start_time = None
        else:
            start_time = datetime.now(timezone.utc) - timedelta(days=30)

        # 2. Fast org discovery
        from app.models import Organization

        user_memberships = (
            await db.execute(
                select(Membership.organization_id).where(Membership.user_id == current_user.id)
            )
        ).scalars().all()

        owned_orgs = (
            await db.execute(
                select(Organization.id).where(Organization.owner_user_id == current_user.id)
            )
        ).scalars().all()

        user_org_ids = list(set(list(user_memberships) + list(owned_orgs)))

        # 3. Get all webinars for this user
        webinar_conditions = [Webinar.created_by == current_user.id]
        if user_org_ids:
            webinar_conditions.append(Webinar.organization_id.in_(user_org_ids))

        webinars = (
            await db.execute(
                select(Webinar).where(or_(*webinar_conditions)).order_by(Webinar.created_at.desc())
            )
        ).scalars().all()
        webinar_ids = [w.id for w in webinars]

        # 4. Get all landing pages
        lp_conditions = [LandingPage.created_by == current_user.id]
        if user_org_ids:
            lp_conditions.append(LandingPage.organization_id.in_(user_org_ids))
        if webinar_ids:
            lp_conditions.append(LandingPage.webinar_id.in_(webinar_ids))

        lps = (
            await db.execute(
                select(LandingPage).where(or_(*lp_conditions))
            )
        ).scalars().all()
        lp_ids = [lp.id for lp in lps]

        # Map webinar to landing page ids
        webinar_to_lp_ids: dict[uuid.UUID, list[uuid.UUID]] = {}
        for lp in lps:
            webinar_to_lp_ids.setdefault(lp.webinar_id, []).append(lp.id)

        # 5. Total Landing Page Visits
        total_views = 0
        lp_visits_count_by_lp: dict[uuid.UUID, int] = {}
        if lp_ids:
            v_query = select(LandingPageVisit.landing_page_id, func.count(LandingPageVisit.id)).where(
                LandingPageVisit.landing_page_id.in_(lp_ids)
            )
            if start_time:
                v_query = v_query.where(LandingPageVisit.created_at >= start_time)
            v_query = v_query.group_by(LandingPageVisit.landing_page_id)
            v_res = (await db.execute(v_query)).all()
            for lp_id, count in v_res:
                lp_visits_count_by_lp[lp_id] = count
                total_views += count

        # Also account for direct webinar visitor_count
        sum_webinar_visitors = sum((w.visitor_count or 0) for w in webinars)
        total_views = max(total_views, sum_webinar_visitors)

        # 6. Registrants & Attendees
        total_registrations = 0
        total_attended = 0
        regs_by_webinar: dict[uuid.UUID, list[Registrant]] = {}

        target_conditions = []
        if webinar_ids:
            target_conditions.append(Registrant.webinar_id.in_(webinar_ids))
        if lp_ids:
            target_conditions.append(Registrant.landing_page_id.in_(lp_ids))

        if target_conditions:
            r_query = select(Registrant).where(or_(*target_conditions))
            if start_time:
                r_query = r_query.where(
                    or_(
                        Registrant.created_at >= start_time,
                        Registrant.registered_at >= start_time,
                    )
                )
            regs = (await db.execute(r_query)).scalars().all()
            active_regs = [r for r in regs if getattr(r.status, "value", str(r.status)) not in ("cancelled",)]
            total_registrations = len(active_regs)

            for r in active_regs:
                if r.webinar_id:
                    regs_by_webinar.setdefault(r.webinar_id, []).append(r)
                st_val = getattr(r.status, "value", str(r.status)).lower()
                if st_val in ("attended", "converted", "purchased"):
                    total_attended += 1

        # Fallback to denormalized webinar counters if higher
        sum_webinar_regs = sum((w.registration_count or 0) for w in webinars)
        total_registrations = max(total_registrations, sum_webinar_regs)

        # Every registration came from a visitor view
        total_views = max(total_views, total_registrations)

        # 7. Offer / CTA Clicks
        total_cta_clicks = 0
        if webinar_ids:
            act_query = select(func.count(WebinarActivity.id)).where(
                WebinarActivity.webinar_id.in_(webinar_ids),
                WebinarActivity.event_type.in_(["cta_clicked", "offer_clicked"]),
            )
            if start_time:
                act_query = act_query.where(WebinarActivity.occurred_at >= start_time)
            total_cta_clicks = (await db.execute(act_query)).scalar() or 0

        # 8. Payments
        p_conditions = [Payment.user_id == current_user.id]
        if user_org_ids:
            p_conditions.append(Payment.organization_id.in_(user_org_ids))
        if webinar_ids:
            p_conditions.append(Payment.webinar_id.in_(webinar_ids))

        p_query = select(Payment).where(
            or_(*p_conditions),
            Payment.status == PaymentStatus.completed,
        )
        if start_time:
            p_query = p_query.where(Payment.created_at >= start_time)
        payments = (await db.execute(p_query)).scalars().all()

        total_revenue = float(sum(p.amount for p in payments))
        paying_registrant_ids = {p.registrant_id for p in payments if p.registrant_id}
        total_purchased = max(len(paying_registrant_ids), len(payments))

        funnel_offer_clicks = max(total_cta_clicks, total_purchased)

        # 9. Top Performing Webinars
        top_webinars = []
        if webinars:
            payments_by_webinar: dict[uuid.UUID, list[Payment]] = {}
            for p in payments:
                if p.webinar_id:
                    payments_by_webinar.setdefault(p.webinar_id, []).append(p)

            for w in webinars:
                w_regs = regs_by_webinar.get(w.id, [])
                w_regs_count = max(len(w_regs), w.registration_count or 0)
                w_lp_ids = webinar_to_lp_ids.get(w.id, [])
                w_views = max(
                    sum(lp_visits_count_by_lp.get(lp_id, 0) for lp_id in w_lp_ids),
                    w.visitor_count or 0,
                    w_regs_count,
                )
                w_payments = payments_by_webinar.get(w.id, [])
                w_rev = float(sum(p.amount for p in w_payments))
                w_buyers_count = len({p.registrant_id for p in w_payments if p.registrant_id})

                if w_views > 0:
                    conv = (w_regs_count / w_views * 100.0)
                elif w_regs_count > 0:
                    conv = (w_buyers_count / w_regs_count * 100.0) if w_buyers_count > 0 else 100.0
                else:
                    conv = 0.0

                top_webinars.append({
                    "id": str(w.id),
                    "title": w.title,
                    "date": w.created_at.strftime("%b %d, %Y") if w.created_at else "",
                    "registrants": w_regs_count,
                    "conversion": f"{conv:.1f}%",
                    "revenue": f"${w_rev:,.2f}",
                    "revenue_raw": w_rev,
                    "registrants_raw": w_regs_count,
                })

            top_webinars.sort(key=lambda x: (x["revenue_raw"], x["registrants_raw"]), reverse=True)

        attendance_rate = (total_attended / total_registrations * 100.0) if total_registrations > 0 else 0.0
        overall_conv_rate = (total_purchased / total_registrations * 100.0) if total_registrations > 0 else (
            (total_purchased / total_views * 100.0) if total_views > 0 else 0.0
        )

        funnel_steps = [
            {
                "name": "Landing Page Views",
                "value": total_views,
                "percentage": 100 if total_views > 0 else 0,
            },
            {
                "name": "Registered",
                "value": total_registrations,
                "percentage": round((total_registrations / total_views * 100.0), 1) if total_views > 0 else (100.0 if total_registrations > 0 else 0.0),
            },
            {
                "name": "Attended",
                "value": total_attended,
                "percentage": round((total_attended / total_registrations * 100.0), 1) if total_registrations > 0 else 0.0,
            },
            {
                "name": "Clicked Offer",
                "value": funnel_offer_clicks,
                "percentage": round((funnel_offer_clicks / total_registrations * 100.0), 1) if total_registrations > 0 else 0.0,
            },
            {
                "name": "Purchased",
                "value": total_purchased,
                "percentage": round(overall_conv_rate, 1),
            },
        ]

        return {
            "total_views": total_views,
            "total_registrations": total_registrations,
            "attendance_rate": round(attendance_rate, 1),
            "total_sales": total_purchased,
            "total_revenue": total_revenue,
            "funnel_steps": funnel_steps,
            "top_webinars": top_webinars[:5],
        }
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return {
            "total_views": 0,
            "total_registrations": 0,
            "attendance_rate": 0.0,
            "total_sales": 0,
            "total_revenue": 0.0,
            "funnel_steps": [
                {"name": "Landing Page Views", "value": 0, "percentage": 0},
                {"name": "Registered", "value": 0, "percentage": 0},
                {"name": "Attended", "value": 0, "percentage": 0},
                {"name": "Clicked Offer", "value": 0, "percentage": 0},
                {"name": "Purchased", "value": 0, "percentage": 0},
            ],
            "top_webinars": [],
        }