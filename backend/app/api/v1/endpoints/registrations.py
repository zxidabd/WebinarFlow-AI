"""Public registration endpoints – no authentication required.

These are the endpoints hit by the landing page itself (the opt-in page).
They accept UTM parameters and client IP from headers, then delegate to the
registration service which performs the full cascade: Registrant row + counters
+ activity log + (email queued).

All validation (capacity, duplicate email, webinar status) lives in the service.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import Registrant, User, Webinar, WebinarStatus
from app.schemas.webinar import WebinarDetail
from app.services import registration_service

router = APIRouter()


def _get_client_ip(request: Request) -> str | None:
    """Best-effort client IP extraction (respecting common proxy headers)."""
    if not request:
        return None
    # Common proxy headers
    for header in ("x-forwarded-for", "x-real-ip", "cf-connecting-ip"):
        if val := request.headers.get(header):
            # X-Forwarded-For can be a list; take the first IP.
            return val.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/{webinar_id}/register", response_model=WebinarDetail, status_code=status.HTTP_201_CREATED)
async def public_register(
    webinar_id: uuid.UUID,
    request: Request,
    email: str = Header(..., alias="X-Registrant-Email"),
    full_name: str | None = Header(default=None, alias="X-Registrant-Name"),
    landing_page_id: str | None = Header(default=None, alias="X-Landing-Page-Id"),
    db: AsyncSession = Depends(get_db),
):
    """
    Public registration endpoint – called by the opt-in landing page.
    Requires two custom headers: X-Registrant-Email and (optionally) X-Registrant-Name.
    UTM parameters and client IP are read from query string and request.client.
    """
    # Fetch the webinar (no org scoping needed – registration is open to all)
    webinar = (
        await db.execute(
            select(Webinar).where(Webinar.id == webinar_id)
        )
    ).scalar_one_or_none()
    if not webinar:
        raise HTTPException(status_code=404, detail="Webinar not found")

    # Only allow registration on scheduled webinars (draft/live/completed/cancelled are closed)
    if webinar.status != WebinarStatus.scheduled:
        raise HTTPException(
            status_code=400,
            detail=f"Registration is closed for webinars with status '{webinar.status.value}'.",
        )

    # Parse landing_page_id if present
    lp_id: uuid.UUID | None = None
    if landing_page_id:
        try:
            lp_id = uuid.UUID(landing_page_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid landing page ID")

    # Extract UTM parameters from query string (standard names)
    params = request.query_params
    utm_source = params.get("utm_source")
    utm_medium = params.get("utm_medium")
    utm_campaign = params.get("utm_campaign")
    utm_content = params.get("utm_content")
    utm_term = params.get("utm_term")
    referrer = params.get("referrer")

    client_ip = _get_client_ip(request)

    # Call the registration service (does the full cascade)
    registrant = await registration_service.register_for_webinar(
        db,
        webinar=webinar,
        email=email,
        full_name=full_name,
        landing_page_id=lp_id,
        utm=registration_service.UTM(
            source=utm_source,
            medium=utm_medium,
            campaign=utm_campaign,
            content=utm_content,
            term=utm_term,
            referrer=referrer,
            ip=client_ip,
        ),
        client_ip=client_ip,
        is_paid_webinar=webinar.is_paid,
    )

    await db.commit()
    await db.refresh(webinar)
    return WebinarDetail.model_validate(webinar)


# Registration actions that require auth (organizer tools)
# These live under the /api/v1/webinars/{id} path with org-scoping.


def _require_webinar_organizer():
    from fastapi import Depends
    from app.api.deps import get_current_active_user, get_current_membership

    async def _dependency(
        webinar_id: uuid.UUID,
        current_user: User = Depends(get_current_active_user),
        membership = Depends(get_current_membership),
        db: AsyncSession = Depends(get_db),
    ):
        # Load the webinar and verify org membership
        webinar = (
            await db.execute(
                select(Webinar).where(Webinar.id == webinar_id)
            )
        ).scalar_one_or_none()
        if not webinar or webinar.organization_id != membership.organization_id:
            raise HTTPException(status_code=403, detail="Webinar not found or access denied")
        # Optionally: check webinar:write permission here
        return webinar

    return _dependency


router_private = APIRouter()


@router_private.post("/{webinar_id}/cancel", response_model=WebinarDetail)
async def cancel_registration(
    webinar_id: uuid.UUID,
    email: str = Header(..., alias="X-Registrant-Email"),
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Cancel a registration by email (organizer tool)."""
    webinar = (
        await db.execute(
            select(Webinar).where(Webinar.id == webinar_id)
        )
    ).scalar_one_or_none()
    if not webinar or webinar.organization_id != membership.organization_id:
        raise HTTPException(status_code=403, detail="Webinar not found or access denied")

    registrant_res = await db.execute(
        select(Registrant).where(
            Registrant.webinar_id == webinar.id,
            Registrant.email == email.lower(),
        )
    )
    registrant = registrant_res.scalar_one_or_none()
    if not registrant:
        raise HTTPException(status_code=404, detail="Registrant not found for this email")

    await registration_service.cancel_registration(
        db, webinar=webinar, registrant=registrant, reason="Organizer-initiated cancel"
    )
    await db.flush()
    return WebinarDetail.model_validate(webinar)


__all__ = ["router", "router_private"]