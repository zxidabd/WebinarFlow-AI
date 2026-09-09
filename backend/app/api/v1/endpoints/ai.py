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
    """Check AI integration status and verify live connection."""
    import httpx
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "https://api.groq.com/openai/v1"
    api_key = settings.OPENAI_API_KEY
    test_result = "not_tested"
    test_error = None
    available_models = []
    working_model = None

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            
            # 1. Fetch available models from provider
            try:
                m_res = await client.get(f"{base_url}/models", headers=headers)
                if m_res.status_code == 200:
                    available_models = [m["id"] for m in m_res.json().get("data", []) if "id" in m]
            except Exception:
                pass

            # 2. Build candidate list prioritizing reliable models
            candidates = []
            if available_models:
                candidates.extend(available_models)
            candidates.extend([
                "llama-3.1-8b-instant",
                "llama3-8b-8192",
                "llama-3.1-70b-versatile",
                "gemma2-9b-it",
                "llama-3.3-70b-versatile",
                settings.OPENAI_MODEL,
            ])
            candidates = [c for i, c in enumerate(candidates) if c and c not in candidates[:i]]

            # 3. Test completions on candidates until one succeeds
            for try_model in candidates:
                payload = {
                    "model": try_model,
                    "messages": [{"role": "user", "content": "hi"}],
                    "max_tokens": 5,
                }
                res = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    test_result = "connected_ok"
                    test_error = None
                    working_model = try_model
                    break
                else:
                    test_result = f"http_{res.status_code}"
                    test_error = f"{try_model}: {res.text[:150]}"
    except Exception as exc:
        test_result = "exception"
        test_error = str(exc)

    return {
        "status": "ready",
        "provider": settings.AI_PROVIDER,
        "model": working_model or settings.OPENAI_MODEL,
        "working_model": working_model,
        "base_url": settings.OPENAI_BASE_URL,
        "has_api_key": bool(api_key and len(api_key) > 5),
        "key_prefix": api_key[:8] if api_key else "",
        "live_test": test_result,
        "available_models": available_models[:12],
        "live_error": test_error,
    }


@router.get("/models")
async def list_ai_models():
    """List available AI models mapped to clean AI Agent 1..5."""
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    
    if "groq.com" in base_url:
        models_list = [
            {"id": "llama-3.1-8b-instant", "name": "AI Agent 1 (Llama 3.1 Instant)", "provider": "groq"},
            {"id": "llama-3.1-70b-versatile", "name": "AI Agent 2 (Llama 3.1 70B)", "provider": "groq"},
            {"id": "llama3-8b-8192", "name": "AI Agent 3 (Llama 3 8B)", "provider": "groq"},
            {"id": "gemma2-9b-it", "name": "AI Agent 4 (Gemma 2 9B)", "provider": "groq"},
            {"id": "llama-3.3-70b-versatile", "name": "AI Agent 5 (Llama 3.3 70B)", "provider": "groq"},
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
