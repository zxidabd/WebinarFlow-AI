"""Webinar orchestration: CRUD + org-scoping + pagination/filter/search/sort.

Each public function accepts an ``AsyncSession`` plus inputs, performs the work
inside the caller's transaction (the request-scoped session from ``get_db``
commits at the end), and returns ORM entities or result rows for the endpoint.

Org scoping is *invariant*: every function takes an ``organization_id`` and
filters it into every query, so cross-tenant access is impossible at this
layer regardless of how the endpoint is written.
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Webinar, WebinarStatus
from app.schemas.webinar import WebinarCreate, WebinarUpdate


class WebinarNotFoundError(Exception):
    """Raised when a referenced webinar does not exist in the given org."""


class SlugConflictError(Exception):
    """Raised when the auto-generated slug already exists within the org."""


# How slugs are derived from titles. Keeps to ASCII-ish slugs so URLs stay clean.
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(value: str) -> str:
    slug = _SLUG_RE.sub("-", (value or "").lower()).strip("-")
    return slug or "webinar"


async def _unique_slug(session: AsyncSession, organization_id: uuid.UUID, base: str) -> str:
    """Return a slug guaranteed unique within the org.

    Tries ``base``, then ``base-2``, ``base-3``, … up to a sane cap (matches
    the ``80``-char column limit on ``webinars.slug``).
    """
    candidate = base[:70]
    n = 2
    while True:
        res = await session.execute(
            select(Webinar.id).where(
                Webinar.organization_id == organization_id,
                Webinar.slug == candidate,
            )
        )
        if res.scalar_one_or_none() is None:
            return candidate
        suffix = f"-{n}"
        candidate = (base[: 80 - len(suffix)] + suffix)[-80:]
        n += 1
        if n > 999:
            # 999 collisions in one org title pattern is a degenerate case;
            # fall back to a 6-hex suffix so the call can't hang.
            return f"{base[:50]}-{uuid.uuid4().hex[:6]}"


async def list_webinars(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
    status: WebinarStatus | None = None,
    search: str | None = None,
    sort: str = "starts_at",
    order: str = "asc",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Webinar], int]:
    """Return ``(rows, total)`` for the org, after filters, search, sort, paging."""
    base = select(Webinar).where(Webinar.organization_id == organization_id)
    count_base = select(func.count(Webinar.id)).where(Webinar.organization_id == organization_id)

    if status is not None:
        base = base.where(Webinar.status == status)
        count_base = count_base.where(Webinar.status == status)

    if search:
        # Case-insensitive ILIKE works on Postgres; SQLite's LIKE ignores case
        # for ASCII, so this is portable enough across both backends.
        like = f"%{search.lower()}%"
        base = base.where(or_(func.lower(Webinar.title).like(like), func.lower(Webinar.slug).like(like)))
        count_base = count_base.where(
            or_(func.lower(Webinar.title).like(like), func.lower(Webinar.slug).like(like))
        )

    # Sort column whitelist — anything else falls back to starts_at so an
    # attacker can't inject an arbitrary column name into ORDER BY.
    sortable = {
        "starts_at": Webinar.starts_at,
        "title": Webinar.title,
        "status": Webinar.status,
        "created_at": Webinar.created_at,
        "updated_at": Webinar.updated_at,
    }
    sort_col = sortable.get(sort, Webinar.starts_at)
    # ``nulls last`` for ASC window for nullable starts_at; SQLite ignores the clause.
    base = base.order_by(sort_col.asc() if order == "asc" else sort_col.desc(), Webinar.created_at.desc())
    base = base.limit(limit).offset(offset)

    rows = (await session.execute(base)).scalars().all()
    total = (await session.execute(count_base)).scalar_one()
    return rows, total


async def get_webinar(
    session: AsyncSession, *, organization_id: uuid.UUID, webinar_id: uuid.UUID
) -> Webinar:
    res = await session.execute(
        select(Webinar).where(
            Webinar.id == webinar_id, Webinar.organization_id == organization_id
        )
    )
    webinar = res.scalar_one_or_none()
    if webinar is None:
        raise WebinarNotFoundError(webinar_id)
    return webinar


def _build_default_lp_content(webinar: Webinar) -> dict:
    is_paid = bool(getattr(webinar, "is_paid", False))
    price_cents = int(getattr(webinar, "price_cents", 0) or 0)
    currency = str(getattr(webinar, "currency", "usd") or "usd")

    currency_symbols = {"usd": "$", "inr": "₹", "eur": "€", "gbp": "£"}
    sym = currency_symbols.get(currency.lower(), f"{currency.upper()} ")
    price_str = f"{sym}{price_cents / 100:.2f}" if (is_paid and price_cents > 0) else "Free"

    badge = f"🎟️ Paid Event — {price_str}" if is_paid else "🚀 Free Online Webinar"
    cta_btn = f"Get Ticket — {price_str}" if is_paid else "Reserve Your Free Spot"

    date_str = webinar.starts_at.strftime("%b %d, %Y") if webinar.starts_at else "Upcoming Event"
    time_str = webinar.starts_at.strftime("%I:%M %p %Z") if webinar.starts_at else "Live Online"

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
                "headline": webinar.title,
                "subtitle": webinar.description or "Join this exclusive live session and discover actionable frameworks, workflows, and insights with live Q&A.",
                "badge": badge,
                "date": date_str,
                "time": time_str,
                "registrations": "Limited Seats",
                "cta_text": cta_btn,
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


async def create_webinar(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
    created_by: uuid.UUID,
    payload: WebinarCreate,
    create_default_landing_page: bool = False,
) -> Webinar:
    slug = await _unique_slug(session, organization_id, _slugify(payload.title))
    webinar = Webinar(
        organization_id=organization_id,
        created_by=created_by,
        title=payload.title,
        slug=slug,
        description=payload.description,
        status=payload.status,
        provider=payload.provider,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        timezone=payload.timezone,
        capacity=payload.capacity,
        location_type=payload.location_type,
        ai_topic=payload.ai_topic,
        is_published=payload.is_published,
        is_paid=payload.is_paid,
        price_cents=payload.price_cents,
        currency=payload.currency,
        payment_gateway=payload.payment_gateway,
    )
    session.add(webinar)
    await session.flush()
    await session.refresh(webinar)
    return webinar


async def update_webinar(
    session: AsyncSession,
    *,
    organization_id: uuid.UUID,
    webinar_id: uuid.UUID,
    payload: WebinarUpdate,
) -> Webinar:
    webinar = await get_webinar(session, organization_id=organization_id, webinar_id=webinar_id)
    data = payload.model_dump(exclude_unset=True)
    new_title = data.get("title")
    if new_title is not None and new_title != webinar.title:
        data["slug"] = await _unique_slug_for_existing(
            session, organization_id, _slugify(new_title), exclude_id=webinar.id
        )
    for key, value in data.items():
        setattr(webinar, key, value)
    await session.flush()
    await session.refresh(webinar)
    return webinar


async def _unique_slug_for_existing(
    session: AsyncSession, organization_id: uuid.UUID, base: str, exclude_id: uuid.UUID
) -> str:
    """Like ``_unique_slug`` but skips the row being updated (avoids self-collision)."""
    candidate = base[:70]
    n = 2
    while True:
        res = await session.execute(
            select(Webinar.id).where(
                Webinar.organization_id == organization_id,
                Webinar.slug == candidate,
                Webinar.id != exclude_id,
            )
        )
        if res.scalar_one_or_none() is None:
            return candidate
        suffix = f"-{n}"
        candidate = (base[: 80 - len(suffix)] + suffix)[-80:]
        n += 1
        if n > 999:
            return f"{base[:50]}-{uuid.uuid4().hex[:6]}"


async def delete_webinar(
    session: AsyncSession, *, organization_id: uuid.UUID, webinar_id: uuid.UUID
) -> None:
    from sqlalchemy import delete
    from app.models import LandingPage, LandingPageVisit, Payment, Registrant, Attendance, WebinarActivity

    webinar = await get_webinar(session, organization_id=organization_id, webinar_id=webinar_id)

    # 1. Delete visits for landing pages belonging to this webinar
    lp_ids_res = await session.execute(
        select(LandingPage.id).where(LandingPage.webinar_id == webinar_id)
    )
    lp_ids = lp_ids_res.scalars().all()
    if lp_ids:
        await session.execute(
            delete(LandingPageVisit).where(LandingPageVisit.landing_page_id.in_(lp_ids))
        )

    # 2. Delete landing pages
    await session.execute(
        delete(LandingPage).where(LandingPage.webinar_id == webinar_id)
    )

    # 3. Delete payments
    await session.execute(
        delete(Payment).where(Payment.webinar_id == webinar_id)
    )

    # 4. Delete activities
    await session.execute(
        delete(WebinarActivity).where(WebinarActivity.webinar_id == webinar_id)
    )

    # 5. Delete attendance
    await session.execute(
        delete(Attendance).where(Attendance.webinar_id == webinar_id)
    )

    # 6. Delete registrants
    await session.execute(
        delete(Registrant).where(Registrant.webinar_id == webinar_id)
    )

    # 7. Delete webinar
    await session.delete(webinar)
    await session.flush()


async def duplicate_webinar(
    session: AsyncSession, *, organization_id: uuid.UUID, webinar_id: uuid.UUID
) -> Webinar:
    """Clone a webinar into a new draft row within the same org."""
    original = await get_webinar(session, organization_id=organization_id, webinar_id=webinar_id)
    # Title carries a "(copy)" suffix; the slug is regenerated to keep it unique.
    new_title = f"{original.title} (copy)"[:255]
    slug = await _unique_slug(session, organization_id, _slugify(new_title))
    clone = Webinar(
        organization_id=organization_id,
        created_by=original.created_by,
        title=new_title,
        slug=slug,
        description=original.description,
        # A duplicate always starts as a draft, regardless of the source status —
        # so a user can't accidentally publish a second copy of a live webinar.
        status=WebinarStatus.draft,
        provider=original.provider,
        starts_at=original.starts_at,
        ends_at=original.ends_at,
        timezone=original.timezone,
        capacity=original.capacity,
        location_type=original.location_type,
        agenda=original.agenda,
        ai_topic=original.ai_topic,
        is_published=False,
        is_paid=original.is_paid,
        price_cents=original.price_cents,
        currency=original.currency,
        payment_gateway=original.payment_gateway,
    )
    session.add(clone)
    await session.flush()
    return clone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)
