from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import LandingPage, LandingPageStatus, Webinar, WebinarStatus
from app.services import landing_page_service, webinar_service
from app.schemas.webinar import WebinarCreate
from app.schemas.landing_page import LandingPageCreate

logger = logging.getLogger(__name__)


def _slugify(text: str) -> str:
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return re.sub(r"^-+|-+$", "", s)[:60]


def _build_fallback_funnel(topic: str, audience: str | None, is_paid: bool, price_cents: int) -> dict[str, Any]:
    """Fallback generator in case the LLM provider is unreachable."""
    clean_topic = topic.strip() or "High-Converting Webinar Masterclass"
    aud = audience.strip() if audience else "Ambitious Professionals & Founders"
    
    title = f"{clean_topic}: The Complete Step-by-Step Blueprint"
    slug = f"{_slugify(clean_topic)}-{uuid.uuid4().hex[:6]}"
    
    return {
        "webinar": {
            "title": title,
            "subtitle": f"Discover how {aud} can achieve breakthrough results with proven frameworks.",
            "description": f"In this live, exclusive workshop, you will learn the exact actionable strategies to master {clean_topic} without confusion or wasted effort.",
            "duration_minutes": 60,
            "is_paid": is_paid,
            "price_cents": price_cents if is_paid else 0,
            "learning_points": [
                f"The core principles of {clean_topic} and how to apply them immediately",
                "Common pitfalls to avoid that cost 90% of beginners time and money",
                "A live step-by-step walkthrough and practical case study",
                "Actionable blueprint and roadmap for long-term scalable growth",
            ],
            "host_name": "Webinar Host",
            "host_bio": f"Industry practitioner and specialist in {clean_topic} helping {aud} succeed.",
        },
        "landing_page": {
            "title": title,
            "slug": slug,
            "meta_description": f"Register now for '{title}'. Free training for {aud}.",
            "hero_headline": f"How {aud} Master {clean_topic}",
            "hero_subheadline": f"A free, high-impact masterclass revealing the exact framework to scale faster with clarity and confidence.",
            "cta_text": "Claim Your Free Seat Now" if not is_paid else f"Register Now · ${(price_cents/100):.2f}",
            "benefits": [
                {"title": "Fast Execution", "description": "Implement proven systems that save dozens of hours each week."},
                {"title": "Clear Roadmap", "description": "Get a structured blueprint tailored specifically to your objectives."},
                {"title": "Actionable Strategies", "description": "Zero fluff or theory—only real tactics that produce measurable outcomes."},
            ],
            "agenda": [
                {"time": "00:00 - 00:15", "topic": f"Introduction & The State of {clean_topic}"},
                {"time": "00:15 - 00:40", "topic": "The 3-Pillar Framework & Live Walkthrough"},
                {"time": "00:40 - 00:55", "topic": "Implementation Blueprint & Next Steps"},
                {"time": "00:55 - 01:00", "topic": "Live Interactive Q&A Session"},
            ],
            "faqs": [
                {"question": "Who is this masterclass designed for?", "answer": f"This training is created specifically for {aud} who want practical results."},
                {"question": "Will there be a replay available?", "answer": "Yes, all registered attendees receive 48-hour access to the recording."},
                {"question": "How long is the session?", "answer": "The core training is approximately 60 minutes followed by live Q&A."},
            ]
        },
        "email_sequence": [
            {
                "type": "invitation",
                "subject": f"🔥 You're invited: {title}",
                "body": f"Hi {{first_name}},\n\nAre you looking to take your results in {clean_topic} to the next level?\n\nJoin us for an exclusive masterclass designed for {aud}.\n\n📅 Date: Live this week\n⏰ Duration: 60 Minutes\n\n👉 Reserve your spot here: {{registration_link}}\n\nBest,\nThe Team"
            },
            {
                "type": "reminder_24h",
                "subject": f"⏰ 24 Hours Left: {title}",
                "body": f"Hi {{first_name}},\n\nQuick reminder: Our live workshop starts in exactly 24 hours.\n\nMake sure to add it to your calendar so you don't miss the live training:\n{{webinar_link}}\n\nSee you inside!\nWebinarFlow"
            },
            {
                "type": "reminder_1h",
                "subject": f"🚀 Starting in 1 Hour: {title}",
                "body": f"Hi {{first_name}},\n\nWe are going live in 60 minutes!\n\nGrab your notebook and join the room here:\n{{webinar_link}}\n\nSee you in the room!"
            },
            {
                "type": "reminder_15m",
                "subject": f"🔴 Starting NOW: The room is open!",
                "body": f"Hi {{first_name}},\n\nWe're kicking off right now! Click below to join immediately:\n\n{{webinar_link}}"
            },
            {
                "type": "replay_and_offer",
                "subject": f"🎬 Replay is live + Special Next Step",
                "body": f"Hi {{first_name}},\n\nThank you to everyone who joined our live session today.\n\nThe full recording is now available for the next 48 hours:\n{{replay_link}}\n\nReady to take the next step? Check out our full program here: {{offer_link}}\n\nBest regards,\nThe Team"
            }
        ],
        "outline": {
            "hook": f"Why traditional approaches to {clean_topic} fail in 2026 and what actually works.",
            "story": f"Case study of how {aud} shifted from uncertainty to streamlined execution.",
            "core_content": "Pillar 1: Foundation\nPillar 2: The Core Workflow\nPillar 3: Optimization & Scaling",
            "offer_pitch": "Presenting the complete toolkit / product to accelerate results effortlessly.",
            "qa_points": "Addressing common attendee questions and troubleshooting."
        }
    }


async def generate_funnel(
    *,
    topic: str,
    target_audience: str | None = None,
    goal: str | None = None,
    is_paid: bool = False,
    price_cents: int = 0,
    custom_instructions: str | None = None,
    model: str | None = None,
) -> dict[str, Any]:
    """Generate a complete webinar funnel (Webinar + Landing Page + Email Sequence + Outline) via LLM."""
    clean_topic = topic.strip()
    audience = (target_audience or "").strip() or "Entrepreneurs, creators, and business professionals"
    target_model = model or settings.OPENAI_MODEL or "gpt-4o"
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    api_key = settings.OPENAI_API_KEY or "omniroute"

    system_prompt = (
        "You are an expert Webinar Funnel Strategist and Copywriter. "
        "Your task is to generate a comprehensive, highly persuasive, conversion-optimized webinar funnel. "
        "Return ONLY a valid JSON object matching this exact schema (no markdown code blocks, just raw JSON):\n"
        "{\n"
        '  "webinar": {\n'
        '    "title": "string",\n'
        '    "subtitle": "string",\n'
        '    "description": "string",\n'
        '    "duration_minutes": 60,\n'
        '    "is_paid": false,\n'
        '    "price_cents": 0,\n'
        '    "learning_points": ["point 1", "point 2", "point 3", "point 4"],\n'
        '    "host_name": "string",\n'
        '    "host_bio": "string"\n'
        "  },\n"
        '  "landing_page": {\n'
        '    "title": "string",\n'
        '    "slug": "url-friendly-slug",\n'
        '    "meta_description": "string",\n'
        '    "hero_headline": "string",\n'
        '    "hero_subheadline": "string",\n'
        '    "cta_text": "string",\n'
        '    "benefits": [{"title": "string", "description": "string"}],\n'
        '    "agenda": [{"time": "string", "topic": "string"}],\n'
        '    "faqs": [{"question": "string", "answer": "string"}]\n'
        "  },\n"
        '  "email_sequence": [\n'
        '    {"type": "invitation", "subject": "string", "body": "string"},\n'
        '    {"type": "reminder_24h", "subject": "string", "body": "string"},\n'
        '    {"type": "reminder_1h", "subject": "string", "body": "string"},\n'
        '    {"type": "reminder_15m", "subject": "string", "body": "string"},\n'
        '    {"type": "replay_and_offer", "subject": "string", "body": "string"}\n'
        "  ],\n"
        '  "outline": {\n'
        '    "hook": "string",\n'
        '    "story": "string",\n'
        '    "core_content": "string",\n'
        '    "offer_pitch": "string",\n'
        '    "qa_points": "string"\n'
        "  }\n"
        "}"
    )

    user_prompt = (
        f"Generate a webinar funnel for:\n"
        f"- Topic: {clean_topic}\n"
        f"- Target Audience: {audience}\n"
        f"- Primary Goal: {goal or 'Generate qualified leads & high conversion'}\n"
        f"- Pricing: {'Paid ($' + str(price_cents/100) + ')' if is_paid else 'Free Opt-in'}\n"
        f"- Extra Instructions: {custom_instructions or 'None'}"
    )

    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            payload = {
                "model": target_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
            }
            res = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if res.status_code == 200:
                data = res.json()
                content = data["choices"][0]["message"]["content"]
                # Clean any markdown codefence wrapping if present
                clean_json = re.sub(r"^```(?:json)?\s*", "", content.strip())
                clean_json = re.sub(r"\s*```$", "", clean_json)
                parsed = json.loads(clean_json)
                parsed["webinar"]["is_paid"] = is_paid
                parsed["webinar"]["price_cents"] = price_cents if is_paid else 0
                return parsed
            else:
                logger.warning(f"LLM API returned status {res.status_code}: {res.text}")
    except Exception as exc:
        logger.exception(f"AI funnel generation LLM call failed, using intelligent template engine: {exc}")

    # Fallback to structured generator
    return _build_fallback_funnel(clean_topic, audience, is_paid, price_cents)


async def apply_funnel(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    funnel: dict[str, Any],
) -> tuple[Webinar, LandingPage]:
    """Persist generated funnel as live Webinar and Landing Page records."""
    w_data = funnel.get("webinar", {})
    lp_data = funnel.get("landing_page", {})

    starts_at = datetime.now(timezone.utc) + timedelta(days=3)

    # 1. Create Webinar
    webinar_create = WebinarCreate(
        title=w_data.get("title") or "AI Generated Webinar",
        description=w_data.get("description") or "",
        slug=_slugify(w_data.get("title") or "ai-webinar") + "-" + uuid.uuid4().hex[:4],
        starts_at=starts_at,
        duration_minutes=int(w_data.get("duration_minutes") or 60),
        status=WebinarStatus.scheduled,
        is_paid=bool(w_data.get("is_paid", False)),
        price_cents=int(w_data.get("price_cents", 0) or 0),
        currency="usd",
    )
    webinar = await webinar_service.create_webinar(
        db, organization_id=organization_id, created_by=user_id, payload=webinar_create
    )
    await db.flush()

    # 2. Structure Landing Page Content
    content = {
        "hero": {
            "headline": lp_data.get("hero_headline") or w_data.get("title"),
            "subheadline": lp_data.get("hero_subheadline") or w_data.get("description"),
            "cta_text": lp_data.get("cta_text") or "Register Now",
        },
        "benefits": lp_data.get("benefits") or [],
        "agenda": lp_data.get("agenda") or [],
        "faqs": lp_data.get("faqs") or [],
        "host": {
            "name": w_data.get("host_name") or "Webinar Host",
            "bio": w_data.get("host_bio") or "",
        },
        "outline": funnel.get("outline") or {},
        "emails": funnel.get("email_sequence") or [],
    }

    lp_slug = _slugify(lp_data.get("slug") or webinar.slug)
    if not lp_slug:
        lp_slug = f"webinar-{uuid.uuid4().hex[:6]}"

    lp_create = LandingPageCreate(
        webinar_id=webinar.id,
        title=lp_data.get("title") or webinar.title,
        slug=lp_slug,
        meta_description=lp_data.get("meta_description") or webinar.description,
        is_published=True,
        status=LandingPageStatus.published,
        content=content,
    )
    landing_page = await landing_page_service.create_landing_page(
        db, organization_id=organization_id, created_by=user_id, payload=lp_create
    )
    await db.flush()

    return webinar, landing_page