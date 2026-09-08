from __future__ import annotations

from datetime import datetime, timezone
import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified
import httpx

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import User, AIChatSession
from app.services import ai_service
from app.core.config import settings

router = APIRouter()


class GenerateFunnelRequest(BaseModel):
    topic: str
    target_audience: str | None = None
    goal: str | None = None
    is_paid: bool = False
    price_cents: int = 0
    custom_instructions: str | None = None
    model: str | None = None
    template: str | None = "modern-saas"


class ApplyFunnelRequest(BaseModel):
    funnel: dict[str, Any]


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    model: str | None = None
    system_persona: str | None = None


class ChatSessionItem(BaseModel):
    id: str
    title: str = "New Chat"
    category: str = "recent"
    createdAt: int | None = None
    messages: list[dict[str, Any]] = []


class SyncSessionsRequest(BaseModel):
    sessions: list[ChatSessionItem]


@router.get("/status")
async def get_ai_status():
    """Check AI integration status."""
    return {
        "status": "ready",
        "provider": settings.AI_PROVIDER,
        "model": settings.OPENAI_MODEL,
        "base_url": settings.OPENAI_BASE_URL,
    }


@router.get("/models")
async def list_ai_models():
    """List available AI models mapped to clean AI Agent 1..5."""
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    
    if "groq.com" in base_url:
        models_list = [
            {"id": "openai/gpt-oss-120b", "name": "AI Agent 1", "provider": "groq"},
            {"id": "qwen/qwen3.6-27b", "name": "AI Agent 2", "provider": "groq"},
            {"id": "openai/gpt-oss-20b", "name": "AI Agent 3", "provider": "groq"},
            {"id": "qwen/qwen3.8-27b", "name": "AI Agent 4", "provider": "groq"},
            {"id": "groq/compound", "name": "AI Agent 5", "provider": "groq"},
        ]
    else:
        models_list = [
            {"id": settings.OPENAI_MODEL or "gpt-4o", "name": "AI Agent 1", "provider": "openai"},
            {"id": "deepseek/deepseek-chat", "name": "AI Agent 2", "provider": "deepseek"},
            {"id": "claude-3-5-sonnet-latest", "name": "AI Agent 3", "provider": "anthropic"},
            {"id": "gpt-4o-mini", "name": "AI Agent 4", "provider": "openai"},
            {"id": "meta-llama/llama-3.3-70b-instruct", "name": "AI Agent 5", "provider": "meta"},
        ]

    return {"models": models_list}


@router.post("/chat")
async def chat_with_agent_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Chat interactively with your WebinarFlow AI Agent."""
    if not payload.messages:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Messages list is required")

    from app.core.plan_limits import get_limits
    from datetime import datetime, timezone

    # Reset monthly counter if needed
    now = datetime.now(timezone.utc)
    if current_user.ai_chat_count_reset_at is None or current_user.ai_chat_count_reset_at.month != now.month or current_user.ai_chat_count_reset_at.year != now.year:
        current_user.ai_chat_count = 0
        current_user.ai_chat_count_reset_at = now

    limits = get_limits(current_user.plan_tier)
    if current_user.ai_chat_count >= limits["max_ai_chats_per_month"]:
        raise HTTPException(
            status_code=403,
            detail=f"You've used all {limits['max_ai_chats_per_month']} AI chats this month. Upgrade your plan for more.",
        )

    result = await ai_service.chat_with_agent(
        messages=payload.messages,
        model=payload.model,
        system_persona=payload.system_persona,
    )
    
    current_user.ai_chat_count += 1
    db.add(current_user)
    await db.commit()
    
    return result


@router.post("/generate-funnel")
async def generate_funnel_endpoint(
    payload: GenerateFunnelRequest,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
):
    """Generate a complete webinar funnel using AI."""
    if not payload.topic or not payload.topic.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Topic is required for funnel generation")

    funnel = await ai_service.generate_funnel(
        topic=payload.topic,
        target_audience=payload.target_audience,
        goal=payload.goal,
        is_paid=payload.is_paid,
        price_cents=payload.price_cents,
        custom_instructions=payload.custom_instructions,
        model=payload.model,
        template=payload.template or "modern-saas",
    )
    return funnel


@router.post("/apply-funnel")
async def apply_funnel_endpoint(
    payload: ApplyFunnelRequest,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
    db: AsyncSession = Depends(get_db),
):
    """Persist generated funnel as live Webinar and Landing Page records."""
    if not payload.funnel:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Funnel data is required")

    webinar, landing_page = await ai_service.apply_funnel(
        db,
        organization_id=membership.organization_id,
        user_id=current_user.id,
        funnel=payload.funnel,
    )
    await db.commit()

    return {
        "webinar_id": str(webinar.id),
        "webinar_title": webinar.title,
        "landing_page_id": str(landing_page.id),
        "landing_page_slug": landing_page.slug,
        "published_url": f"/r/{landing_page.slug}",
    }


@router.get("/sessions")
async def list_chat_sessions(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List all AI chat sessions for current user across all devices."""
    stmt = (
        select(AIChatSession)
        .where(AIChatSession.user_id == current_user.id)
        .order_by(AIChatSession.updated_at.desc())
    )
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "createdAt": s.created_at_ms or (int(s.created_at.timestamp() * 1000) if s.created_at else int(datetime.utcnow().timestamp() * 1000)),
            "messages": s.messages or [],
        }
        for s in sessions
    ]


@router.post("/sessions")
async def upsert_chat_session(
    payload: ChatSessionItem,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Save or update an individual chat session for cross-device sync."""
    stmt = select(AIChatSession).where(
        AIChatSession.id == payload.id,
        AIChatSession.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if not session:
        session = AIChatSession(
            id=payload.id,
            user_id=current_user.id,
            title=payload.title,
            category=payload.category,
            messages=payload.messages,
            created_at_ms=payload.createdAt,
        )
        db.add(session)
    else:
        session.title = payload.title
        session.category = payload.category
        session.messages = payload.messages
        session.updated_at = datetime.now(timezone.utc)
        flag_modified(session, "messages")
        if payload.createdAt:
            session.created_at_ms = payload.createdAt
    await db.commit()
    await db.refresh(session)
    return {
        "id": session.id,
        "title": session.title,
        "category": session.category,
        "createdAt": session.created_at_ms or int(session.created_at.timestamp() * 1000),
        "messages": session.messages or [],
    }


@router.post("/sessions/sync")
async def sync_chat_sessions(
    payload: SyncSessionsRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Sync client sessions with server and return unified cross-device chat history."""
    for s in payload.sessions:
        stmt = select(AIChatSession).where(
            AIChatSession.id == s.id,
            AIChatSession.user_id == current_user.id,
        )
        res = await db.execute(stmt)
        existing = res.scalar_one_or_none()
        if not existing:
            new_s = AIChatSession(
                id=s.id,
                user_id=current_user.id,
                title=s.title,
                category=s.category,
                messages=s.messages,
                created_at_ms=s.createdAt,
            )
            db.add(new_s)
        else:
            if len(s.messages) >= len(existing.messages or []):
                existing.title = s.title
                existing.category = s.category
                existing.messages = s.messages
                existing.updated_at = datetime.now(timezone.utc)
                flag_modified(existing, "messages")
    await db.commit()

    stmt = (
        select(AIChatSession)
        .where(AIChatSession.user_id == current_user.id)
        .order_by(AIChatSession.updated_at.desc())
    )
    res = await db.execute(stmt)
    all_sessions = res.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "category": s.category,
            "createdAt": s.created_at_ms or (int(s.created_at.timestamp() * 1000) if s.created_at else int(datetime.utcnow().timestamp() * 1000)),
            "messages": s.messages or [],
        }
        for s in all_sessions
    ]


@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a chat session across all devices."""
    stmt = select(AIChatSession).where(
        AIChatSession.id == session_id,
        AIChatSession.user_id == current_user.id,
    )
    res = await db.execute(stmt)
    session = res.scalar_one_or_none()
    if session:
        await db.delete(session)
        await db.commit()
    return {"deleted": True, "id": session_id}
