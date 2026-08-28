"""Landing Page endpoints: list, create, get, update, delete, duplicate.

LIST requires ``webinar_id`` (query param) because it shows pages scoped to a
specific webinar. GET/PATCH/DELETE/duplicate resolve the row by landing_page_id
directly — the landing page already carries webinar_id in the DB.
"""
from __future__ import annotations

import uuid

from datetime import datetime, timezone
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import func, or_, and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import LandingPage, LandingPageStatus, User, Webinar
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageDetail,
    LandingPageDuplicateResponse,
    LandingPageItem,
    LandingPageListResponse,
    LandingPageStats,
    LandingPageUpdate,
    RegistrantItem,
    RegistrantListResponse,
)
from app.services import landing_page_service

router = APIRouter()


# ── Helpers ─────────────────────────────────────────────────────────────────


async def _get_lp_org_scoped(
    db: AsyncSession, landing_page_id: uuid.UUID, organization_id: uuid.UUID
) -> LandingPage:
    """Fetch a landing page by ID, verifying it belongs to the caller's org
    (via the webinar → organization chain)."""
    lp = (
        await db.execute(
            select(LandingPage).where(
                LandingPage.id == landing_page_id,
                LandingPage.organization_id == organization_id,
            )
        )
    ).scalar_one_or_none()
    if lp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    return lp


async def _to_detail(db: AsyncSession, lp: LandingPage) -> LandingPageDetail:
    webinar = (
        await db.execute(select(Webinar).where(Webinar.id == lp.webinar_id))
    ).scalar_one_or_none()
    detail_data = {
        "id": lp.id,
        "webinar_id": lp.webinar_id,
        "organization_id": lp.organization_id,
        "created_by": lp.created_by,
        "title": lp.title,
        "slug": lp.slug,
        "status": lp.status,
        "page_type": lp.page_type,
        "content": lp.content,
        "meta_title": lp.meta_title,
        "meta_description": lp.meta_description,
        "meta_image": lp.meta_image,
        "custom_head_html": lp.custom_head_html,
        "custom_body_html": lp.custom_body_html,
        "is_published": lp.is_published,
        "template_id": lp.template_id,
        "created_at": lp.created_at,
        "updated_at": lp.updated_at,
        "is_paid": bool(getattr(webinar, "is_paid", False)) if webinar else False,
        "price_cents": int(getattr(webinar, "price_cents", 0) or 0) if webinar else 0,
        "currency": str(getattr(webinar, "currency", "usd") or "usd") if webinar else "usd",
        "payment_gateway": str(getattr(webinar, "payment_gateway", "stripe") or "stripe") if webinar else "stripe",
    }
    return LandingPageDetail(**detail_data)


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.get("", response_model=LandingPageListResponse)
async def list_landing_pages(
    webinar_id: uuid.UUID = Query(..., description="Webinar ID to list pages for"),
    status: str | None = Query(default=None),
    page_type: str | None = Query(default=None),
    search: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List landing pages for a webinar (org-scoped)."""
    rows, total = await landing_page_service.list_landing_pages(
        db,
        webinar_id=webinar_id,
        organization_id=membership.organization_id,
        offset=offset,
        limit=limit,
        status=status,
        page_type=page_type,
        search=search,
    )
    return LandingPageListResponse(
        items=[LandingPageItem.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=LandingPageDetail, status_code=status.HTTP_201_CREATED)
async def create_landing_page(
    payload: LandingPageCreate,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create a landing page for a webinar (org-scoped)."""
    webinar = (
        await db.execute(
            select(Webinar).where(
                Webinar.id == payload.webinar_id,
                Webinar.organization_id == membership.organization_id,
            )
        )
    ).scalar_one_or_none()
    if webinar is None:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Webinar not found or access denied")
    lp = await landing_page_service.create_landing_page(
        db,
        webinar_id=payload.webinar_id,
        organization_id=membership.organization_id,
        created_by=current_user.id,
        payload=payload,
    )
    await db.flush()
    return await _to_detail(db, lp)


@router.get("/{landing_page_id}", response_model=LandingPageDetail)
async def get_landing_page(
    landing_page_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Get a single landing page (org-scoped by landing page ID)."""
    lp = await _get_lp_org_scoped(db, landing_page_id, membership.organization_id)
    return await _to_detail(db, lp)


@router.patch("/{landing_page_id}", response_model=LandingPageDetail)
async def update_landing_page(
    landing_page_id: uuid.UUID,
    payload: LandingPageUpdate,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update a landing page (org-scoped)."""
    lp = await _get_lp_org_scoped(db, landing_page_id, membership.organization_id)
    updated = await landing_page_service.update_landing_page(
        db,
        webinar_id=lp.webinar_id,
        organization_id=membership.organization_id,
        landing_page_id=landing_page_id,
        payload=payload,
    )
    await db.flush()
    return await _to_detail(db, updated)


@router.delete("/{landing_page_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_landing_page(
    landing_page_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Delete a landing page (org-scoped)."""
    lp = await _get_lp_org_scoped(db, landing_page_id, membership.organization_id)
    await landing_page_service.delete_landing_page(
        db,
        webinar_id=lp.webinar_id,
        organization_id=membership.organization_id,
        landing_page_id=landing_page_id,
    )
    await db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{landing_page_id}/duplicate", response_model=LandingPageDuplicateResponse)
async def duplicate_landing_page(
    landing_page_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a landing page (org-scoped)."""
    lp = await _get_lp_org_scoped(db, landing_page_id, membership.organization_id)
    dup = await landing_page_service.duplicate_landing_page(
        db,
        webinar_id=lp.webinar_id,
        organization_id=membership.organization_id,
        landing_page_id=landing_page_id,
        created_by=current_user.id,
    )
    await db.flush()
    return LandingPageDuplicateResponse(
        original_id=landing_page_id,
        duplicate_id=dup.id,
        duplicate_slug=dup.slug,
    )


@router.get("/{landing_page_id}/stats", response_model=LandingPageStats)
async def get_landing_page_stats(
    landing_page_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Get lightweight stats for a landing page."""
    try:
        stats = await landing_page_service.get_landing_page_stats(
            db, landing_page_id=landing_page_id
        )
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    return stats


# ── Public routes ───────────────────────────────────────────────────────────


async def _resolve_public_landing_page(
    db: AsyncSession, slug: str
) -> tuple[LandingPage, Webinar] | None:
    """Find an active published landing page and its parent webinar by LandingPage.slug, LandingPage.id, or Webinar.slug."""
    clean_slug = (slug or "").strip().lower()
    if not clean_slug:
        return None

    # Parse potential UUID
    parsed_uuid: uuid.UUID | None = None
    try:
        parsed_uuid = uuid.UUID(clean_slug)
    except (ValueError, AttributeError):
        pass

    # Strictly require is_published=True AND status=published
    pub_conditions = and_(
        LandingPage.is_published.is_(True),
        or_(
            LandingPage.status == LandingPageStatus.published,
            LandingPage.status == "published",
        ),
    )

    # 1. Match LandingPage directly by slug (case-insensitive) or UUID
    conditions = [func.lower(LandingPage.slug) == clean_slug]
    if parsed_uuid is not None:
        conditions.append(LandingPage.id == parsed_uuid)

    query = (
        select(LandingPage)
        .where(
            or_(*conditions),
            pub_conditions,
        )
        .order_by(LandingPage.created_at.desc())
    )
    lp = (await db.execute(query)).scalars().first()

    if lp is not None:
        webinar = (
            await db.execute(select(Webinar).where(Webinar.id == lp.webinar_id))
        ).scalar_one_or_none()
        if webinar is not None:
            return lp, webinar

    # 2. Fallback: match by Webinar.slug (case-insensitive) or Webinar UUID if published LP exists
    w_conditions = [func.lower(Webinar.slug) == clean_slug]
    if parsed_uuid is not None:
        w_conditions.append(Webinar.id == parsed_uuid)

    webinar_query = select(Webinar).where(or_(*w_conditions))
    webinar = (await db.execute(webinar_query)).scalars().first()
    if webinar is not None:
        lp = (
            await db.execute(
                select(LandingPage)
                .where(
                    LandingPage.webinar_id == webinar.id,
                    pub_conditions,
                )
                .order_by(LandingPage.created_at.desc())
            )
        ).scalars().first()
        if lp is not None:
            return lp, webinar

    return None


@router.get("/public/{slug}")
async def get_public_landing_page(
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint for published landing pages. No auth required."""
    try:
        resolved = await _resolve_public_landing_page(db, slug)
        if resolved is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Landing page '{slug}' not found")
        lp, webinar = resolved

        status_val = lp.status.value if hasattr(lp.status, "value") else str(lp.status or "published")
        page_type_val = lp.page_type.value if hasattr(lp.page_type, "value") else str(lp.page_type or "opt_in")

        return {
            "id": str(lp.id),
            "webinar_id": str(lp.webinar_id),
            "organization_id": str(lp.organization_id) if getattr(lp, "organization_id", None) else "",
            "title": lp.title or "Webinar Landing Page",
            "slug": lp.slug,
            "status": status_val,
            "page_type": page_type_val,
            "content": lp.content or {},
            "meta_title": lp.meta_title or lp.title,
            "meta_description": lp.meta_description,
            "meta_image": lp.meta_image,
            "custom_head_html": lp.custom_head_html,
            "custom_body_html": lp.custom_body_html,
            "is_published": bool(lp.is_published or status_val == "published"),
            "template_id": lp.template_id,
            "is_paid": bool(getattr(webinar, "is_paid", False)),
            "price_cents": int(getattr(webinar, "price_cents", 0) or 0),
            "currency": str(getattr(webinar, "currency", "usd") or "usd"),
            "payment_gateway": str(getattr(webinar, "payment_gateway", "stripe") or "stripe"),
        }
    except HTTPException:
        raise
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Error loading landing page: {exc}")


class PublicVisitPayload(BaseModel):
    referrer: str | None = None
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    utm_term: str | None = None


@router.post("/public/{slug}/visit")
async def record_public_page_visit(
    slug: str,
    request: Request,
    payload: PublicVisitPayload | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Record a visitor viewing a published landing page."""
    resolved = await _resolve_public_landing_page(db, slug)
    if resolved is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    lp, webinar = resolved

    # Extract client IP
    client_ip = None
    if request:
        for header in ("x-forwarded-for", "x-real-ip", "cf-connecting-ip"):
            if val := request.headers.get(header):
                client_ip = val.split(",")[0].strip()
                break
        if not client_ip and request.client:
            client_ip = request.client.host

    user_agent = request.headers.get("user-agent") if request else None
    ref = (payload.referrer if payload else None) or (request.headers.get("referer") if request else None)

    visit = await landing_page_service.record_landing_page_visit(
        db,
        landing_page_id=lp.id,
        ip_address=client_ip,
        user_agent=user_agent,
        referrer=ref,
        utm_source=payload.utm_source if payload else None,
        utm_medium=payload.utm_medium if payload else None,
        utm_campaign=payload.utm_campaign if payload else None,
        utm_content=payload.utm_content if payload else None,
        utm_term=payload.utm_term if payload else None,
    )
    await db.commit()
    return {"status": "ok", "visit_id": str(visit.id)}


class PublicEventPayload(BaseModel):
    event_type: str = "cta_clicked"
    meta: dict | None = None


@router.post("/public/{slug}/event")
async def record_public_page_event(
    slug: str,
    payload: PublicEventPayload,
    db: AsyncSession = Depends(get_db),
):
    """Record an interaction event (e.g. cta_clicked, offer_clicked) on a published landing page."""
    resolved = await _resolve_public_landing_page(db, slug)
    if resolved is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    lp, webinar = resolved

    from app.models import WebinarActivity
    activity = WebinarActivity(
        webinar_id=webinar.id,
        event_type=payload.event_type or "cta_clicked",
        occurred_at=datetime.now(timezone.utc),
        meta={
            **(payload.meta or {}),
            "landing_page_id": str(lp.id),
            "slug": slug,
        },
    )
    db.add(activity)
    await db.commit()
    return {"status": "ok", "event_id": str(activity.id)}


class PublicRegisterPayload(BaseModel):
    email: str | None = None
    full_name: str | None = None

@router.post("/public/{slug}/register")
async def register_via_public_page(
    slug: str,
    email: str | None = None,
    full_name: str | None = None,
    payload: PublicRegisterPayload | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Public registration via a published landing page."""
    final_email = (email if isinstance(email, str) else None) or (payload.email if payload and isinstance(payload.email, str) else None)
    final_name = (full_name if isinstance(full_name, str) else None) or (payload.full_name if payload and isinstance(payload.full_name, str) else None)
    
    if not final_email or not final_email.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email is required for registration")

    resolved = await _resolve_public_landing_page(db, slug)
    if resolved is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    lp, webinar = resolved

    from app.services import registration_service

    reg = await registration_service.register_for_webinar(
        db,
        webinar=webinar,
        email=final_email,
        full_name=final_name,
        landing_page_id=lp.id,
        is_paid_webinar=webinar.is_paid,
    )

    checkout_url = None
    razorpay_data = None
    payment_gateway = getattr(webinar, 'payment_gateway', 'stripe')
    
    if webinar.is_paid:
        if not webinar.price_cents or webinar.price_cents <= 0:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Paid webinar has no valid price configured")

        try:
            from app.services import payment_service
            if payment_gateway == 'razorpay':
                rzp_result = await payment_service.create_razorpay_order(
                    db, registrant=reg, webinar=webinar
                )
                razorpay_data = {
                    'order_id': rzp_result.order_id,
                    'amount': rzp_result.amount,
                    'currency': rzp_result.currency,
                    'key_id': rzp_result.key_id,
                }
            else:
                checkout_res = await payment_service.create_stripe_checkout_session(
                    db, registrant=reg, webinar=webinar
                )
                checkout_url = checkout_res.url
        except payment_service.PaymentError as e:
            await db.rollback()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, e.message)
        except Exception as e:
            await db.rollback()
            raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"Payment gateway initialization failed: {e}")

    await db.commit()
    await db.refresh(reg)

    return {
        "message": "Payment checkout required" if webinar.is_paid else "Registration successful",
        "status": "payment_pending" if webinar.is_paid else "registered",
        "registrant_id": str(reg.id),
        "webinar_id": str(webinar.id),
        "landing_page_id": str(lp.id),
        "email": reg.email,
        "full_name": reg.full_name,
        "is_paid": webinar.is_paid,
        "price_cents": webinar.price_cents,
        "currency": webinar.currency,
        "payment_gateway": payment_gateway,
        "checkout_url": checkout_url,
        "razorpay": razorpay_data,
    }


class RazorpayVerifyPayload(BaseModel):
    razorpay_payment_id: str
    razorpay_order_id: str
    razorpay_signature: str
    registrant_id: str

@router.post("/public/{slug}/verify-razorpay")
async def verify_razorpay_payment(
    slug: str,
    payload: RazorpayVerifyPayload,
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint to verify Razorpay payment after checkout."""
    resolved = await _resolve_public_landing_page(db, slug)
    if resolved is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")
    lp, webinar = resolved

    try:
        registrant_uuid = uuid.UUID(payload.registrant_id)
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid registrant ID")

    try:
        from app.services import payment_service
        payment = await payment_service.verify_razorpay_payment(
            db,
            razorpay_order_id=payload.razorpay_order_id,
            razorpay_payment_id=payload.razorpay_payment_id,
            razorpay_signature=payload.razorpay_signature,
            registrant_id=registrant_uuid,
        )
        await db.commit()
        return {
            "status": "success",
            "message": "Payment verified and registration confirmed",
            "payment_id": str(payment.id),
        }
    except payment_service.PaymentError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, e.message)


@router.get("/{landing_page_id}/registrations", response_model=RegistrantListResponse)
async def list_registrations(
    landing_page_id: uuid.UUID,
    search: str | None = Query(default=None, description="Search by name or email"),
    sort: str = Query(default="registered_at", description="Sort field"),
    order: str = Query(default="desc", description="asc or desc"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """List all registrations for a landing page (org-scoped)."""
    # Verify landing page belongs to user's org
    lp = (
        await db.execute(
            select(LandingPage).where(
                LandingPage.id == landing_page_id,
                LandingPage.organization_id == membership.organization_id,
            )
        )
    ).scalar_one_or_none()
    if lp is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Landing page not found")

    from app.models import Registrant

    base = select(Registrant).where(Registrant.landing_page_id == landing_page_id)
    count_base = select(func.count()).select_from(Registrant).where(Registrant.landing_page_id == landing_page_id)

    if search:
        like = f"%{search.lower()}%"
        base = base.where(
            func.lower(Registrant.email).like(like)
            | func.lower(Registrant.full_name).like(like)
        )
        count_base = count_base.where(
            func.lower(Registrant.email).like(like)
            | func.lower(Registrant.full_name).like(like)
        )

    sort_col = getattr(Registrant, sort, Registrant.registered_at)
    base = base.order_by(sort_col.asc() if order == "asc" else sort_col.desc())
    base = base.limit(limit).offset(offset)

    rows = (await db.execute(base)).scalars().all()
    total = (await db.execute(count_base)).scalar_one()

    return RegistrantListResponse(
        items=[RegistrantItem.model_validate(r) for r in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


__all__ = ["router"]