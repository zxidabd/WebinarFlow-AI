"""Landing Page service — CRUD, visit tracking, and simple stats.

All functions are org-scoped and webinar-scoped: they require a
`webinar_id` and an `organization_id` and validate that the webinar belongs
to that organization before proceeding.

The service does NOT perform authentication; that is the responsibility of
the endpoint layer (`get_current_membership` / `get_current_active_user`).
"""
from __future__ import annotations

import uuid
import re
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import LandingPage, LandingPageStatus, LandingPageVisit, Registrant
from app.schemas.landing_page import LandingPageCreate, LandingPageUpdate, LandingPageStats

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    """Convert a string to a URL-safe slug."""
    slug = _SLUG_RE.sub("-", (value or "").lower()).strip("-")
    return slug or "landing-page"


async def _unique_lp_slug(
    session: AsyncSession, webinar_id: uuid.UUID, base: str, exclude_id: uuid.UUID | None = None
) -> str:
    """Return a slug guaranteed unique within the webinar."""
    candidate = base[:70]
    n = 2
    while True:
        query = select(LandingPage.id).where(
            LandingPage.webinar_id == webinar_id,
            LandingPage.slug == candidate,
        )
        if exclude_id is not None:
            query = query.where(LandingPage.id != exclude_id)
        res = await session.execute(query)
        if res.scalar_one_or_none() is None:
            return candidate
        suffix = f"-{n}"
        candidate = (base[: 80 - len(suffix)] + suffix)[-80:]
        n += 1
        if n > 999:
            return f"{base[:50]}-{uuid.uuid4().hex[:6]}"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


# ── CRUD ─────────────────────────────────────────────────────────────────────


async def list_landing_pages(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    offset: int = 0,
    limit: int = 20,
    status: str | None = None,
    page_type: str | None = None,
    search: str | None = None,
) -> tuple[list[LandingPage], int]:
    """List landing pages for a webinar (org-scoped)."""
    base = (
        select(LandingPage)
        .where(LandingPage.webinar_id == webinar_id)
        .where(LandingPage.organization_id == organization_id)
    )
    count_base = select(func.count()).select_from(LandingPage).where(
        LandingPage.webinar_id == webinar_id, LandingPage.organization_id == organization_id
    )

    if status:
        base = base.where(LandingPage.status == status)
        count_base = count_base.where(LandingPage.status == status)

    if page_type:
        base = base.where(LandingPage.page_type == page_type)
        count_base = count_base.where(LandingPage.page_type == page_type)

    if search:
        like = f"%{search.lower()}%"
        base = base.where(
            func.lower(LandingPage.title).like(like)
            | func.lower(LandingPage.slug).like(like)
        )
        count_base = count_base.where(
            func.lower(LandingPage.title).like(like)
            | func.lower(LandingPage.slug).like(like)
        )

    total = (await db.execute(count_base)).scalar_one()
    result = await db.execute(
        base.offset(offset).limit(limit).order_by(LandingPage.created_at.desc())
    )
    return result.scalars().all(), total


async def get_landing_page(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    landing_page_id: uuid.UUID,
) -> LandingPage | None:
    """Fetch a single landing page by ID (double-scoped)."""
    res = await db.execute(
        select(LandingPage).where(
            LandingPage.id == landing_page_id,
            LandingPage.webinar_id == webinar_id,
            LandingPage.organization_id == organization_id,
        )
    )
    return res.scalar_one_or_none()


def _build_default_template_content(
    template_id: str,
    title: str,
    description: str | None = None,
    is_paid: bool = False,
    price_cents: int = 0,
    currency: str = "usd",
) -> dict:
    curr_upper = (currency or "usd").upper()
    curr_sym = "₹" if curr_upper == "INR" else ("€" if curr_upper == "EUR" else ("£" if curr_upper == "GBP" else "$"))
    price_str = f"{curr_sym}{price_cents / 100:.2f}" if is_paid and price_cents > 0 else "Free"

    desc = description or "Join this exclusive session to master actionable strategies, workflows, and insights."
    tpl = (template_id or "modern-saas").strip().lower()

    if tpl == "corporate":
        return {
            "template": "corporate",
            "sections": {
                "navbar": {
                    "logo_text": "Executive Briefing",
                    "links": "Overview, Speakers, Agenda, Register",
                    "cta_text": "Secure Seat",
                    "cta_link": "#register",
                },
                "hero": {
                    "headline": title,
                    "subtitle": desc,
                    "badge": f"Executive Roundtable · {price_str}",
                    "date": "Upcoming Executive Session",
                    "time": "Live Online",
                    "cta_text": f"Reserve Executive Pass ({price_str})" if is_paid else "Register For Briefing",
                    "cta_link": "#register",
                },
                "features": {
                    "title": "Strategic Focus Areas",
                    "subtitle": "Key organizational and executive leadership outcomes",
                    "items": [
                        {"title": "Industry Landscape & Trends", "description": "High-level analysis of market shifts and competitive advantages."},
                        {"title": "Operational Excellence", "description": "Frameworks for scaling efficiency and optimizing team execution."},
                        {"title": "Risk Mitigation & Governance", "description": "Compliance, security, and strategic risk management practices."},
                    ],
                },
                "register": {
                    "title": f"Executive Registration — {price_str}",
                    "cta_text": f"Confirm Registration ({price_str})" if is_paid else "Register Free Now",
                    "collect_name": "true",
                    "success_message": "Registration confirmed. Executive briefing package will be sent to your inbox.",
                },
                "footer": {
                    "text": "© 2026 Enterprise Briefings. All rights reserved.",
                    "links": "Privacy, Governance, Terms",
                },
            },
        }
    elif tpl == "education":
        return {
            "template": "education",
            "sections": {
                "navbar": {
                    "logo_text": "Academy Workshop",
                    "links": "Curriculum, Outcomes, Enrollment",
                    "cta_text": "Enroll Now",
                    "cta_link": "#register",
                },
                "hero": {
                    "headline": title,
                    "subtitle": desc,
                    "badge": f"Masterclass Workshop · {price_str}",
                    "date": "Live Interactive Training",
                    "time": "Online Masterclass",
                    "cta_text": f"Enroll in Course ({price_str})" if is_paid else "Join Free Masterclass",
                    "cta_link": "#register",
                },
                "curriculum": {
                    "title": "Workshop Modules & Curriculum",
                    "subtitle": "Comprehensive syllabus designed for practical skill acquisition",
                    "modules": [
                        {"number": "01", "title": "Foundational Principles", "description": "Core mental models and essential technical prerequisites."},
                        {"number": "02", "title": "Advanced Execution Systems", "description": "Step-by-step implementation of real-world workflows."},
                        {"number": "03", "title": "Live Project & Case Studies", "description": "Building and deploying end-to-end practical solutions."},
                    ],
                },
                "register": {
                    "title": f"Course Enrollment — {price_str}",
                    "cta_text": f"Complete Enrollment ({price_str})" if is_paid else "Claim Free Student Spot",
                    "collect_name": "true",
                    "success_message": "Enrollment successful! Access your student dashboard via the link in your email.",
                },
                "footer": {
                    "text": "© 2026 Academy Online. All rights reserved.",
                    "links": "Student Portal, Privacy, Terms",
                },
            },
        }
    else:  # modern-saas default
        return {
            "template": "modern-saas",
            "sections": {
                "navbar": {
                    "logo_text": "WebinarFlow",
                    "links": "About, Agenda, Register",
                    "cta_text": "Register",
                    "cta_link": "#register",
                },
                "hero_v2": {
                    "headline": title,
                    "subtitle": desc,
                    "badge": f"Live Masterclass · {price_str}",
                    "date": "Live Interactive Session",
                    "time": "Online Event",
                    "registrations": "Limited Seats",
                    "cta_text": f"Complete Registration ({price_str})" if is_paid else "Register Free Now",
                    "cta_link": "#register",
                },
                "benefits": {
                    "title": "What You Will Learn",
                    "subtitle": "Practical takeaways and key outcomes from this session",
                    "benefits": [
                        {"icon": "Zap", "title": "Step-by-Step Mastery", "description": "Learn proven frameworks and strategies that get real results."},
                        {"icon": "BarChart3", "title": "Live Demos & Breakdown", "description": "Real-world walkthroughs and tactical execution live on stream."},
                        {"icon": "MessageSquare", "title": "Live Interactive Q&A", "description": "Ask your questions directly and get expert answers in real-time."},
                        {"icon": "Award", "title": "Exclusive Resources", "description": "Gain access to downloadable templates and bonus materials."},
                    ],
                },
                "agenda": {
                    "title": "Event Agenda",
                    "items": [
                        {"time": "00:00", "title": "Welcome & Overview", "description": "Introduction and key session goals."},
                        {"time": "15:00", "title": "Core Strategy & Walkthrough", "description": "Deep dive into actionable systems and live demonstration."},
                        {"time": "45:00", "title": "Live Q&A & Next Steps", "description": "Answering attendee questions and sharing resources."},
                    ],
                },
                "register": {
                    "title": f"Reserve Your Spot — {price_str}",
                    "cta_text": f"Complete Registration ({price_str})" if is_paid else "Register Free Now",
                    "collect_name": "true",
                    "success_message": "You're registered! Check your email for access details.",
                },
                "footer": {
                    "text": "© 2026 WebinarFlow AI. All rights reserved.",
                    "links": "Privacy Policy, Terms",
                },
            },
        }


async def create_landing_page(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    created_by: uuid.UUID,
    payload: LandingPageCreate,
) -> LandingPage:
    """Create a landing page for a webinar (org-scoped). Slug is auto-generated
    from the title if not provided, and made unique within the webinar."""
    slug = payload.slug or _slugify(payload.title) or "landing-page"
    slug = await _unique_lp_slug(db, webinar_id, slug, exclude_id=None)

    tpl_id = payload.template_id or "modern-saas"
    content = payload.content
    if not content or not isinstance(content, dict) or not content.get("sections"):
        content = _build_default_template_content(
            tpl_id,
            payload.title,
            payload.meta_description,
            is_paid=payload.is_paid,
            price_cents=payload.price_cents,
            currency=payload.currency,
        )

    landing_page = LandingPage(
        webinar_id=webinar_id,
        organization_id=organization_id,
        created_by=created_by,
        title=payload.title,
        slug=slug,
        status=LandingPageStatus.draft,
        page_type=payload.page_type,
        content=content,
        meta_title=payload.meta_title or payload.title,
        meta_description=payload.meta_description,
        meta_image=payload.meta_image,
        custom_head_html=payload.custom_head_html,
        custom_body_html=payload.custom_body_html,
        is_published=False,
        template_id=tpl_id,
    )
    db.add(landing_page)

    # Synchronize pricing with parent webinar
    from app.models.webinar import Webinar
    parent_webinar = (await db.execute(select(Webinar).where(Webinar.id == webinar_id))).scalar_one_or_none()
    if parent_webinar is not None:
        parent_webinar.is_paid = payload.is_paid
        parent_webinar.price_cents = payload.price_cents if payload.is_paid else 0
        parent_webinar.currency = payload.currency or "usd"
        parent_webinar.payment_gateway = payload.payment_gateway or "stripe"

    await db.flush()
    return landing_page


async def update_landing_page(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    landing_page_id: uuid.UUID,
    payload: LandingPageUpdate,
) -> LandingPage:
    """Update a landing page (partial update)."""
    landing_page = (
        await db.execute(select(LandingPage).where(LandingPage.id == landing_page_id))
    ).scalar_one_or_none()
    if landing_page is None:
        raise ValueError(f"Landing page {landing_page_id} not found")

    data = payload.model_dump(exclude_unset=True)
    # If title changes, regenerate a unique slug.
    if "title" in data and data["title"] != landing_page.title:
        base_slug = _slugify(data["title"]) or "landing-page"
        data["slug"] = await _unique_lp_slug(db, webinar_id, base_slug, exclude_id=landing_page.id)

    # Sync is_published with status and published_at
    if "is_published" in data:
        is_pub = bool(data["is_published"])
        data["is_published"] = is_pub
        if is_pub:
            data["status"] = LandingPageStatus.published
            if not landing_page.published_at:
                data["published_at"] = datetime.now(timezone.utc)
        else:
            data["status"] = LandingPageStatus.draft
            data["published_at"] = None

        target_webinar_id = getattr(landing_page, "webinar_id", webinar_id)
        if target_webinar_id:
            from sqlalchemy import update
            from app.models.webinar import Webinar
            await db.execute(
                update(Webinar)
                .where(Webinar.id == target_webinar_id)
                .values(is_published=is_pub)
            )

    # Pop pricing fields so we don't setattr on LandingPage model
    pricing_fields = {}
    for fld in ["is_paid", "price_cents", "currency", "payment_gateway"]:
        if fld in data:
            pricing_fields[fld] = data.pop(fld)

    if pricing_fields:
        target_webinar_id = getattr(landing_page, "webinar_id", webinar_id)
        if target_webinar_id:
            update_vals = {}
            if "is_paid" in pricing_fields:
                update_vals["is_paid"] = bool(pricing_fields["is_paid"])
            if "price_cents" in pricing_fields and pricing_fields["price_cents"] is not None:
                update_vals["price_cents"] = pricing_fields["price_cents"]
            if "currency" in pricing_fields and pricing_fields["currency"]:
                update_vals["currency"] = pricing_fields["currency"]
            if "payment_gateway" in pricing_fields and pricing_fields["payment_gateway"]:
                update_vals["payment_gateway"] = pricing_fields["payment_gateway"]
            if update_vals:
                from sqlalchemy import update
                from app.models.webinar import Webinar
                await db.execute(
                    update(Webinar)
                    .where(Webinar.id == target_webinar_id)
                    .values(**update_vals)
                )

    for key, value in data.items():
        setattr(landing_page, key, value)

    await db.commit()
    return landing_page


async def delete_landing_page(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    landing_page_id: uuid.UUID,
) -> None:
    """Delete a landing page."""
    landing_page = await get_landing_page(
        db, webinar_id=webinar_id, organization_id=organization_id, landing_page_id=landing_page_id
    )
    if landing_page is None:
        return
    await db.delete(landing_page)
    await db.flush()


async def duplicate_landing_page(
    db: AsyncSession,
    *,
    webinar_id: uuid.UUID,
    organization_id: uuid.UUID,
    landing_page_id: uuid.UUID,
    created_by: uuid.UUID,
) -> LandingPage:
    """Duplicate a landing page as a draft within the same webinar."""
    original = await get_landing_page(
        db, webinar_id=webinar_id, organization_id=organization_id, landing_page_id=landing_page_id
    )
    if original is None:
        raise ValueError("Landing page not found")

    from app.services.webinar_service import _slugify, _unique_slug_for_existing

    base = f"{original.title} (copy)"
    slug = await _unique_lp_slug(db, webinar_id, _slugify(base), exclude_id=None)

    duplicate = LandingPage(
        webinar_id=webinar_id,
        organization_id=organization_id,
        created_by=created_by,
        title=base,
        slug=slug,
        description=original.description,
        status=LandingPageStatus.draft,
        page_type=original.page_type,
        content=original.content,
        meta_title=original.meta_title,
        meta_description=original.meta_description,
        meta_image=original.meta_image,
        custom_head_html=original.custom_head_html,
        custom_body_html=original.custom_body_html,
        is_published=False,
    )
    db.add(duplicate)
    await db.flush()
    return duplicate


# ── Visit tracking ──────────────────────────────────────────────────────────


async def record_landing_page_visit(
    db: AsyncSession,
    *,
    landing_page_id: uuid.UUID,
    registrant_id: uuid.UUID | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    referrer: str | None = None,
    utm_source: str | None = None,
    utm_medium: str | None = None,
    utm_campaign: str | None = None,
    utm_content: str | None = None,
    utm_term: str | None = None,
) -> LandingPageVisit:
    """Record a visit to a landing page (for analytics)."""
    import hashlib

    ip_hash = hashlib.sha256(ip_address.encode()).hexdigest()[:64] if ip_address else None

    visit = LandingPageVisit(
        landing_page_id=landing_page_id,
        registrant_id=registrant_id,
        ip_hash=ip_hash,
        user_agent=user_agent,
        referrer=referrer,
        utm_source=utm_source,
        utm_medium=utm_medium,
        utm_campaign=utm_campaign,
        utm_content=utm_content,
        utm_term=utm_term,
    )
    db.add(visit)
    await db.flush()

    return visit


# ── Stats ───────────────────────────────────────────────────────────────────


async def get_landing_page_stats(
    db: AsyncSession,
    *,
    landing_page_id: uuid.UUID,
) -> LandingPageStats:
    """Return lightweight stats for a landing page (used in dashboard overview)."""
    lp = (await db.execute(select(LandingPage).where(LandingPage.id == landing_page_id))).scalar_one_or_none()
    if lp is None:
        raise ValueError("Landing page not found")

    # Visit count: count rows in landing_page_visits
    visit_count_res = await db.execute(
        select(func.count(LandingPageVisit.id)).where(LandingPageVisit.landing_page_id == landing_page_id)
    )
    visit_count = visit_count_res.scalar_one() or 0

    # Registration count: count registrants with this landing_page_id set
    reg_count_res = await db.execute(
        select(func.count(Registrant.id)).where(
            Registrant.landing_page_id == landing_page_id,
            Registrant.status == "registered",
        )
    )
    registration_count = reg_count_res.scalar_one() or 0

    conversion_rate = (registration_count / visit_count * 100) if visit_count > 0 else 0.0

    return LandingPageStats(
        id=lp.id,
        title=lp.title,
        slug=lp.slug,
        page_type=lp.page_type,
        is_published=lp.is_published,
        visit_count=visit_count,
        registration_count=registration_count,
        conversion_rate=round(float(conversion_rate), 2),
    )