from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import LandingPage, LandingPageVisit, Registrant, RegistrantStatus, User, Webinar

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

    # 1. Total Webinars
    webinars = (
        await db.execute(
            select(Webinar).where(Webinar.organization_id == org_id).order_by(Webinar.created_at.desc())
        )
    ).scalars().all()
    webinar_ids = [w.id for w in webinars]

    # 2. Total Landing Pages & Visits
    lps = (
        await db.execute(
            select(LandingPage).where(LandingPage.organization_id == org_id)
        )
    ).scalars().all()
    lp_ids = [lp.id for lp in lps]

    total_views = 0
    if lp_ids:
        visits_count = await db.execute(
            select(func.count(LandingPageVisit.id)).where(LandingPageVisit.landing_page_id.in_(lp_ids))
        )
        total_views = visits_count.scalar() or 0

    # 3. Registrants & Attendees & Buyers
    total_registrations = 0
    total_attended = 0
    total_purchased = 0
    total_revenue = 0.0

    top_webinars = []

    if webinar_ids:
        regs = (
            await db.execute(
                select(Registrant).where(Registrant.webinar_id.in_(webinar_ids))
            )
        ).scalars().all()
        total_registrations = len(regs)

        for r in regs:
            if r.status in (RegistrantStatus.attended, "attended"):
                total_attended += 1
            elif r.status in (RegistrantStatus.converted, "purchased", "converted"):
                total_attended += 1
                total_purchased += 1

        for w in webinars:
            w_regs = [r for r in regs if r.webinar_id == w.id]
            w_buyers = [r for r in w_regs if r.status in (RegistrantStatus.converted, "purchased", "converted")]
            w_rev = len(w_buyers) * ((w.price_cents or 0) / 100.0)
            total_revenue += w_rev
            conv = (len(w_buyers) / len(w_regs) * 100.0) if w_regs else 0.0

            top_webinars.append({
                "id": str(w.id),
                "title": w.title,
                "date": w.created_at.strftime("%b %d, %Y") if w.created_at else "",
                "registrants": len(w_regs),
                "conversion": f"{conv:.1f}%",
                "revenue": f"${w_rev:,.2f}",
            })

    attendance_rate = (total_attended / total_registrations * 100.0) if total_registrations > 0 else 0.0
    conv_rate = (total_purchased / total_views * 100.0) if total_views > 0 else (
        (total_purchased / total_registrations * 100.0) if total_registrations > 0 else 0.0
    )

    funnel_steps = [
        {"name": "Landing Page Views", "value": total_views, "percentage": 100 if total_views > 0 else 0},
        {"name": "Registered", "value": total_registrations, "percentage": round((total_registrations / total_views * 100.0), 1) if total_views > 0 else (100 if total_registrations > 0 else 0)},
        {"name": "Attended", "value": total_attended, "percentage": round((total_attended / total_views * 100.0), 1) if total_views > 0 else (round(total_attended / total_registrations * 100.0, 1) if total_registrations > 0 else 0)},
        {"name": "Clicked Offer", "value": total_purchased, "percentage": round((total_purchased / total_views * 100.0), 1) if total_views > 0 else (round(total_purchased / total_registrations * 100.0, 1) if total_registrations > 0 else 0)},
        {"name": "Purchased", "value": total_purchased, "percentage": round(conv_rate, 1)},
    ]

    return {
        "total_views": total_views,
        "total_registrations": total_registrations,
        "attendance_rate": round(attendance_rate, 1),
        "total_revenue": total_revenue,
        "funnel_steps": funnel_steps,
        "top_webinars": top_webinars[:5],
    }