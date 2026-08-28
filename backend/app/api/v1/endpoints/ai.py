from __future__ import annotations

import uuid
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.api.deps import get_current_active_user, get_current_membership, get_db
from app.models import User
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


class ApplyFunnelRequest(BaseModel):
    funnel: dict[str, Any]


class ChatRequest(BaseModel):
    messages: list[dict[str, str]]
    model: str | None = None
    system_persona: str | None = None


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
    """List available AI models from OmniRoute / OpenAI."""
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    api_key = settings.OPENAI_API_KEY or "omniroute"

    models_list = [
        {"id": "nvidia/DeepSeek V4 Pro", "name": "AI Agent 1", "provider": "nvidia"},
        {"id": "nvidia/Mistral Large 3 675B", "name": "AI Agent 2", "provider": "nvidia"},
        {"id": "nvidia/Dracarys Llama 3.1 70B Instruct", "name": "AI Agent 3", "provider": "nvidia"},
        {"id": "gpt-4o", "name": "AI Agent 4", "provider": "openai"},
        {"id": "claude-3-5-sonnet-latest", "name": "AI Agent 5", "provider": "anthropic"},
    ]

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(f"{base_url}/models", headers={"Authorization": f"Bearer {api_key}"})
            if res.status_code == 200:
                data = res.json()
                live_models = data.get("data", [])
                if live_models:
                    return {"models": live_models}
    except Exception:
        pass

    return {"models": models_list}


@router.post("/chat")
async def chat_with_agent_endpoint(
    payload: ChatRequest,
    current_user: User = Depends(get_current_active_user),
    membership = Depends(get_current_membership),
):
    """Chat interactively with your WebinarFlow AI Agent."""
    if not payload.messages:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Messages list is required")

    result = await ai_service.chat_with_agent(
        messages=payload.messages,
        model=payload.model,
        system_persona=payload.system_persona,
    )
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
