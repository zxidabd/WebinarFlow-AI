"""Webinar endpoints: list, create, get, update, delete, duplicate.

All endpoints are scoped to the active organization (from ``X-Organization-Id`` or
the user's default membership). Read requires ``webinar:write`` while mutations
require ``webinar:write``—same as organizations:write semantics (create+update).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import User, Webinar, WebinarStatus
from app.schemas.webinar import (
    AttendanceItem,
    WebinarCreate,
    WebinarDetail,
    WebinarDuplicateResponse,
    WebinarItem,
    WebinarListResponse,
    WebinarUpdate,
)
from app.services import webinar_service

router = APIRouter()


def _to_list_item(webinar: Webinar) -> WebinarItem:
    """Convert an ORM model to the compact list schema."""
    return WebinarItem.model_validate(webinar)


def _to_detail(webinar: Webinar) -> WebinarDetail:
    """Convert an ORM model to the detail schema."""
    return WebinarDetail.model_validate(webinar)


def _to_attendance_item(atnd: any) -> AttendanceItem:
    return AttendanceItem.model_validate(atnd)


@router.get("", response_model=WebinarListResponse)
async def list_webinars(
    status: WebinarStatus | None = Query(
        default=None, description="Filter by status (draft/scheduled/live/completed/cancelled)"
    ),
    search: str | None = Query(
        default=None, description="Case-insensitive search in title or slug"
    ),
    sort: str = Query(
        default="starts_at",
        description="Sort field: one of starts_at, title, status, created_at, updated_at",
    ),
    order: str = Query(default="desc", description="Sort direction: asc or desc"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    offset: int = Query(default=0, ge=0, description="Page offset"),
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Paginated list of webinars in the active organization."""
    rows, total = await webinar_service.list_webinars(
        db,
        organization_id=membership.organization_id,
        status=status,
        search=search,
        sort=sort,
        order=order,
        limit=limit,
        offset=offset,
    )
    return WebinarListResponse(
        items=[_to_list_item(w) for w in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=WebinarDetail, status_code=status.HTTP_201_CREATED)
async def create_webinar(
    payload: WebinarCreate,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Create a webinar in the active organization."""
    webinar = await webinar_service.create_webinar(
        db,
        organization_id=membership.organization_id,
        created_by=current_user.id,
        payload=payload,
    )
    await db.flush()
    return _to_detail(webinar)


@router.get("/{webinar_id}", response_model=WebinarDetail)
async def get_webinar(
    webinar_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Get a single webinar by ID (org-scoped)."""
    try:
        webinar = await webinar_service.get_webinar(
            db, organization_id=membership.organization_id, webinar_id=webinar_id
        )
    except webinar_service.WebinarNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webinar not found")
    return _to_detail(webinar)


@router.patch("/{webinar_id}", response_model=WebinarDetail)
async def update_webinar(
    webinar_id: uuid.UUID,
    payload: WebinarUpdate,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Update a webinar in the active organization."""
    try:
        webinar = await webinar_service.update_webinar(
            db, organization_id=membership.organization_id, webinar_id=webinar_id, payload=payload
        )
    except webinar_service.WebinarNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webinar not found")
    await db.flush()
    return _to_detail(webinar)


@router.delete("/{webinar_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_webinar(
    webinar_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Delete a webinar from the active organization."""
    try:
        await webinar_service.delete_webinar(
            db, organization_id=membership.organization_id, webinar_id=webinar_id
        )
        await db.commit()
    except webinar_service.WebinarNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webinar not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{webinar_id}/duplicate", response_model=WebinarDuplicateResponse)
async def duplicate_webinar(
    webinar_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a webinar as a new draft within the same org."""
    try:
        duplicate = await webinar_service.duplicate_webinar(
            db, organization_id=membership.organization_id, webinar_id=webinar_id
        )
    except webinar_service.WebinarNotFoundError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Webinar not found")
    await db.flush()
    return WebinarDuplicateResponse(
        original_id=webinar_id,
        duplicate_id=duplicate.id,
        duplicate_slug=duplicate.slug,
    )


__all__ = ["router"]