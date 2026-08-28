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
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Real live analytics and funnel metrics for the user's organization."""
    org_id = membership.organization_id

    # 1. Parse date range
    clean_range = (range or "30d").strip().lower()
    start_time: datetime | None = None
    if clean_range == "7d":
        start_time = datetime.now(timezone.utc) - timedelta(days=7)
    elif clean_range == "30d":
        start_time = datetime.now(timezone.utc) - timedelta(days=30)
    elif clean_range == "all":
        start_time = None
    else:
        start_time = datetime.now(timezone.utc) - timedelta(days=30)

    # 2. Get Organization Webinars & Landing Pages
    webinars = (
        await db.execute(
            select(Webinar).where(Webinar.organization_id == org_id).order_by(Webinar.created_at.desc())
        )
    ).scalars().all()
    webinar_ids = [w.id for w in webinars]

    lps = (
        await db.execute(
            select(LandingPage).where(LandingPage.organization_id == org_id)
        )
    ).scalars().all()
    lp_ids = [lp.id for lp in lps]

    # Map webinar to landing page ids
    webinar_to_lp_ids: dict[uuid.UUID, list[uuid.UUID]] = {}
    for lp in lps:
        webinar_to_lp_ids.setdefault(lp.webinar_id, []).append(lp.id)

    # 3. Total Landing Page Visits
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

    # 4. Registrants & Attendees
    total_registrations = 0
    total_attended = 0
    regs_by_webinar: dict[uuid.UUID, list[Registrant]] = {}
    if webinar_ids:
        r_query = select(Registrant).where(
            Registrant.webinar_id.in_(webinar_ids),
            Registrant.status != RegistrantStatus.cancelled,
        )
        if start_time:
            r_query = r_query.where(Registrant.created_at >= start_time)
        regs = (await db.execute(r_query)).scalars().all()
        total_registrations = len(regs)

        for r in regs:
            regs_by_webinar.setdefault(r.webinar_id, []).append(r)
            if r.status in (RegistrantStatus.attended, "attended", RegistrantStatus.converted, "converted", "purchased"):
                total_attended += 1

    # 5. Offer / CTA Clicks
    total_cta_clicks = 0
    if webinar_ids:
        act_query = select(func.count(WebinarActivity.id)).where(
            WebinarActivity.webinar_id.in_(webinar_ids),
            WebinarActivity.event_type.in_(["cta_clicked", "offer_clicked"]),
        )
        if start_time:
            act_query = act_query.where(WebinarActivity.occurred_at >= start_time)
        total_cta_clicks = (await db.execute(act_query)).scalar() or 0

    # 6. Real Completed Payments / Sales
    p_query = select(Payment).where(
        Payment.organization_id == org_id,
        Payment.status == PaymentStatus.completed,
    )
    if start_time:
        p_query = p_query.where(Payment.created_at >= start_time)
    payments = (await db.execute(p_query)).scalars().all()

    total_revenue = float(sum(p.amount for p in payments))
    paying_registrant_ids = {p.registrant_id for p in payments}
    total_purchased = len(paying_registrant_ids)

    # If CTA clicks was 0 but we have purchases/attendees, provide realistic funnel progress
    funnel_offer_clicks = max(total_cta_clicks, total_purchased)

    # 7. Top Performing Webinars
    top_webinars = []
    if webinars:
        payments_by_webinar: dict[uuid.UUID, list[Payment]] = {}
        for p in payments:
            payments_by_webinar.setdefault(p.webinar_id, []).append(p)

        for w in webinars:
            w_regs = regs_by_webinar.get(w.id, [])
            w_lp_ids = webinar_to_lp_ids.get(w.id, [])
            w_views = sum(lp_visits_count_by_lp.get(lp_id, 0) for lp_id in w_lp_ids)
            w_payments = payments_by_webinar.get(w.id, [])
            w_rev = float(sum(p.amount for p in w_payments))
            w_buyers_count = len({p.registrant_id for p in w_payments})

            if w_views > 0:
                conv = (len(w_regs) / w_views * 100.0)
            elif len(w_regs) > 0:
                conv = (w_buyers_count / len(w_regs) * 100.0) if w_buyers_count > 0 else 100.0
            else:
                conv = 0.0

            top_webinars.append({
                "id": str(w.id),
                "title": w.title,
                "date": w.created_at.strftime("%b %d, %Y") if w.created_at else "",
                "registrants": len(w_regs),
                "conversion": f"{conv:.1f}%",
                "revenue": f"${w_rev:,.2f}",
                "revenue_raw": w_rev,
                "registrants_raw": len(w_regs),
            })

        # Sort top webinars by revenue then registrants
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
        "total_revenue": total_revenue,
        "funnel_steps": funnel_steps,
        "top_webinars": top_webinars[:5],
    }