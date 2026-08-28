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

    landing_page = LandingPage(
        webinar_id=webinar_id,
        organization_id=organization_id,
        created_by=created_by,
        title=payload.title,
        slug=slug,
        status=payload.status,
        page_type=payload.page_type,
        content=payload.content,
        meta_title=payload.meta_title,
        meta_description=payload.meta_description,
        meta_image=payload.meta_image,
        custom_head_html=payload.custom_head_html,
        custom_body_html=payload.custom_body_html,
        is_published=payload.is_published,
        template_id=payload.template_id,
    )
    db.add(landing_page)
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
    landing_page = await get_landing_page(
        db, webinar_id=webinar_id, organization_id=organization_id, landing_page_id=landing_page_id
    )
    if landing_page is None:
        raise ValueError("Landing page not found")

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

    for key, value in data.items():
        setattr(landing_page, key, value)

    await db.flush()
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