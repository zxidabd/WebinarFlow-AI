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


def _build_full_funnel_sections(
    topic: str,
    audience: str | None,
    goal: str | None,
    is_paid: bool,
    price_cents: int,
    custom_instructions: str | None,
    template: str = "modern-saas",
) -> dict[str, Any]:
    clean_topic = topic.strip() or "AI Automation Masterclass"
    aud = (audience or "").strip() or "Students, Creators & Professionals"
    extra = (custom_instructions or "").strip()
    price_str = f"${(price_cents / 100):.2f}" if is_paid else "Free"

    title = f"{clean_topic}: The Complete Career & Growth Blueprint"
    slug = f"{_slugify(clean_topic)}-{uuid.uuid4().hex[:6]}"

    # 1. Navbar
    navbar = {
        "logo_text": clean_topic[:20] if len(clean_topic) <= 20 else "WebinarFlow",
        "links": "Curriculum, Speakers, Benefits, Reviews, FAQ",
        "cta_text": "Claim Your Seat" if not is_paid else f"Register ({price_str})",
        "cta_link": "#register",
        "bg_color": "#ffffff",
    }

    # 2. Hero
    hero_v2 = {
        "headline": f"How {aud} Master {clean_topic}",
        "subtitle": f"A live, high-impact masterclass revealing practical frameworks to build automated AI systems, demonstrate verified skills to universities & employers, and stay ahead as AI tools evolve. {extra}"[:300].strip(),
        "cta_text": "Join Free Live Training" if not is_paid else f"Enroll Now · {price_str}",
        "cta_link": "#register",
        "bg_color": "#4f46e5",
        "background_gradient": "from-indigo-900 via-purple-900 to-slate-950",
        "hero_image": "/hero-dashboard.png",
    }

    # 3. Speakers
    speakers = {
        "title": "Meet Your Instructor & AI Mentors",
        "speakers": [
            {
                "name": "Dr. Alex Vance",
                "title": f"Lead AI Strategist & {clean_topic} Specialist",
                "avatar": "/avatars/alex.jpg",
                "bio": f"Over 10+ years deploying automation and machine learning workflows. Mentored 3,000+ {aud} in real-world project delivery.",
            },
            {
                "name": "Maya Lin",
                "title": "Head of Career & Project Acceleration",
                "avatar": "/avatars/sarah.jpg",
                "bio": f"Assists {aud} in showcasing verifiable portfolio projects to universities, recruiters, and enterprise clients.",
            },
        ],
        "bg_color": "#ffffff",
    }

    # 4. Stats
    stats = {
        "stats": [
            {"value": "5,000+", "label": f"{aud} Trained"},
            {"value": "98%", "label": "Satisfaction Rating"},
            {"value": "15+", "label": "Practical AI Workflows"},
            {"value": "4.9/5", "label": "Student & Attendee Score"},
        ],
        "bg_color": "#f8fafc",
    }

    # 5. Logos
    logos = {
        "title": f"Tools & Platforms Covered in This {clean_topic} Workshop",
        "logos": [
            {"src": "/logos/openai.svg", "alt": "OpenAI & LLMs"},
            {"src": "/logos/python.svg", "alt": "Automation Scripts"},
            {"src": "/logos/github.svg", "alt": "Portfolio Showcase"},
            {"src": "/logos/cloud.svg", "alt": "Cloud Workflows"},
        ],
        "bg_color": "#ffffff",
    }

    # 6. Benefits Grid
    benefits = {
        "title": f"Everything You Will Master in {clean_topic}",
        "subtitle": f"Structured specifically for {aud} to deliver real outcomes and verified knowledge.",
        "benefits": [
            {
                "icon": "Zap",
                "title": "Portfolio-Ready AI Projects",
                "description": f"Build practical systems you can demonstrate to universities, employers, and clients immediately.",
            },
            {
                "icon": "RefreshCw",
                "title": "Continuous Tool Updates",
                "description": "Stay current with frameworks that adapt as AI models and automation platforms evolve.",
            },
            {
                "icon": "BarChart3",
                "title": "Zero Fluff & Pure Execution",
                "description": "Step-by-step live build walkthrough with zero confusing theory or wasted time.",
            },
            {
                "icon": "Users",
                "title": "Exclusive Community Access",
                "description": f"Connect with fellow {aud}, mentors, and industry practitioners for ongoing support.",
            },
        ],
        "bg_color": "#ffffff",
    }

    # 7. Agenda Timeline
    agenda = {
        "title": "Workshop Curriculum & Schedule",
        "items": [
            {
                "time": "00:00 - 00:15",
                "title": f"The State of {clean_topic} in 2026",
                "description": f"Why traditional learning is obsolete and what {aud} need to focus on today.",
            },
            {
                "time": "00:15 - 00:40",
                "title": "Live Build: End-to-End Automation System",
                "description": "Step-by-step live demonstration constructing a production-grade workflow from scratch.",
            },
            {
                "time": "00:40 - 00:55",
                "title": "Demonstrating AI Mastery to Employers & Universities",
                "description": "How to package your automation projects into verified proof-of-work portfolios.",
            },
            {
                "time": "00:55 - 01:00",
                "title": "Interactive Live Q&A & Resource Drop",
                "description": "Get all your specific questions answered and receive the complete toolkit templates.",
            },
        ],
        "bg_color": "#f8fafc",
    }

    # 8. Testimonials
    testimonials = {
        "title": f"What Past {aud} Are Saying",
        "testimonials": [
            {
                "quote": f"This masterclass completely transformed how I build projects. The portfolio framework helped me showcase real AI automation to top universities!",
                "name": "Rohan Patel",
                "title": f"Computer Science Student & AI Developer",
                "avatar": "/avatars/john.jpg",
            },
            {
                "quote": f"Zero theory, 100% actionable. I automated our team workflow the very next day and received an employer internship offer.",
                "name": "Jessica Taylor",
                "title": "Junior Automation Engineer",
                "avatar": "/avatars/emily.jpg",
            },
        ],
        "bg_color": "#ffffff",
    }

    # 9. FAQ
    faq = {
        "title": "Frequently Asked Questions",
        "items": [
            {
                "question": f"Who is this {clean_topic} masterclass designed for?",
                "answer": f"This session is crafted specifically for {aud} who want practical, real-world execution rather than passive theory.",
            },
            {
                "question": "Will course materials be updated as AI tools evolve?",
                "answer": "Yes! All participants get access to updated resources and frameworks as new AI models and tools are released.",
            },
            {
                "question": "Can I showcase these projects to universities or employers?",
                "answer": "Absolutely. The projects built during this workshop are structured specifically to be demonstrated as verified proof of skills.",
            },
            {
                "question": "Will a recording / replay be available?",
                "answer": "Yes, registered attendees receive 48-hour access to the full recording, slide decks, and code/template resources.",
            },
        ],
        "bg_color": "#f8fafc",
    }

    # 10. Countdown
    countdown = {
        "enabled": "true",
        "end_date": (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%dT23:59:00Z"),
        "message": f"Live cohort filling fast — reserve your seat for {clean_topic}",
        "bg_color": "#4f46e5",
    }

    # 11. Registration Form
    register = {
        "title": "Reserve Your Spot in the Live Masterclass",
        "cta_text": "Register Now — It's Free" if not is_paid else f"Register Now · {price_str}",
        "collect_name": "true",
        "success_message": "You're registered! Check your email for room access and preparatory worksheets.",
        "bg_color": "#ffffff",
    }

    # 12. Footer
    footer = {
        "text": f"© {datetime.now().year} {clean_topic}. All rights reserved.",
        "links": "Privacy Policy, Terms of Service, Contact Support",
        "bg_color": "#0f172a",
    }

    all_sections = {
        "navbar": navbar,
        "hero_v2": hero_v2,
        "speakers": speakers,
        "stats": stats,
        "logos": logos,
        "benefits": benefits,
        "agenda": agenda,
        "testimonials": testimonials,
        "faq": faq,
        "countdown": countdown,
        "register": register,
        "footer": footer,
    }

    return {
        "webinar": {
            "title": title,
            "subtitle": hero_v2["subtitle"],
            "description": f"In this exclusive live training, {aud} learn the exact systems to master {clean_topic}.",
            "duration_minutes": 60,
            "is_paid": is_paid,
            "price_cents": price_cents if is_paid else 0,
            "learning_points": [b["title"] for b in benefits["benefits"]],
            "host_name": speakers["speakers"][0]["name"],
            "host_bio": speakers["speakers"][0]["bio"],
        },
        "landing_page": {
            "title": title,
            "slug": slug,
            "meta_description": f"Register now for '{title}'. Free live training for {aud}.",
            "template": template or "modern-saas",
            "hero_headline": hero_v2["headline"],
            "hero_subheadline": hero_v2["subtitle"],
            "cta_text": hero_v2["cta_text"],
            "benefits": benefits["benefits"],
            "agenda": agenda["items"],
            "faqs": faq["items"],
            "sections": all_sections,
        },
        "email_sequence": [
            {
                "type": "invitation",
                "subject": f"🔥 You're invited: {title}",
                "body": f"Hi {{first_name}},\n\nAre you looking to master {clean_topic} and stand out to top universities and employers?\n\nJoin us for an exclusive masterclass designed for {aud}.\n\n📅 Date: Live this week\n⏰ Duration: 60 Minutes\n\n👉 Reserve your spot here: {{registration_link}}\n\nBest,\nThe Team",
            },
            {
                "type": "reminder_24h",
                "subject": f"⏰ 24 Hours Left: {title}",
                "body": f"Hi {{first_name}},\n\nQuick reminder: Our live workshop starts in exactly 24 hours.\n\nMake sure to add it to your calendar so you don't miss the live training:\n{{webinar_link}}\n\nSee you inside!\nWebinarFlow",
            },
            {
                "type": "reminder_1h",
                "subject": f"🚀 Starting in 1 Hour: {title}",
                "body": f"Hi {{first_name}},\n\nWe are going live in 60 minutes!\n\nGrab your notebook and join the room here:\n{{webinar_link}}\n\nSee you in the room!",
            },
            {
                "type": "reminder_15m",
                "subject": f"🔴 Starting NOW: The room is open!",
                "body": f"Hi {{first_name}},\n\nWe're kicking off right now! Click below to join immediately:\n\n{{webinar_link}}",
            },
            {
                "type": "replay_and_offer",
                "subject": f"🎬 Replay is live + Resource Toolkit",
                "body": f"Hi {{first_name}},\n\nThank you to everyone who joined our live session today.\n\nThe full recording is now available for the next 48 hours:\n{{replay_link}}\n\nReady to take the next step? Check out our full program here: {{offer_link}}\n\nBest regards,\nThe Team",
            },
        ],
        "outline": {
            "hook": f"Why traditional approaches to {clean_topic} fail in 2026 and what actually works for {aud}.",
            "story": f"Case study of how {aud} shifted from theory to portfolio-ready automation.",
            "core_content": "Pillar 1: Modern AI Foundation\nPillar 2: Live Workflow Build\nPillar 3: University & Employer Demonstration",
            "offer_pitch": "Presenting the complete toolkit, templates, and ongoing mentorship to accelerate results.",
            "qa_points": "Addressing student questions, tool evolution, and employer portfolio presentation.",
        },
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
    template: str | None = "modern-saas",
) -> dict[str, Any]:
    clean_topic = topic.strip()
    target_template = template or "modern-saas"
    audience = (target_audience or "").strip() or "Students, creators, and business professionals"
    target_model = model or settings.OPENAI_MODEL or "gpt-4o"
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    api_key = settings.OPENAI_API_KEY or "omniroute"

    system_prompt = (
        "You are an expert Webinar Funnel Strategist inside WebinarFlow AI. "
        f"Generate a complete webinar funnel for template '{target_template}' with all 11 landing page sections populated matching the user's specific description. "
        "Return ONLY a valid JSON object matching the full funnel schema."
    )

    user_prompt = (
        f"Generate a webinar funnel for:\n"
        f"- Topic: {clean_topic}\n"
        f"- Target Audience: {audience}\n"
        f"- Template Style: {target_template} ('modern-saas', 'corporate', or 'education')\n"
        f"- Primary Goal: {goal or 'High Lead Generation & Sales Conversion'}\n"
        f"- Pricing: {'Paid ($' + str(price_cents/100) + ')' if is_paid else 'Free Opt-in'}\n"
        f"- Extra Custom Instructions: {custom_instructions or 'None'}"
    )

    funnel_models = [
        target_model,
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "groq/compound",
        settings.OPENAI_MODEL or "gpt-4o",
    ]
    seen_f = set()
    models_to_try_f = [m for m in funnel_models if m and not (m in seen_f or seen_f.add(m))]

    for try_model in models_to_try_f:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {
                    "model": try_model,
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
                    clean_json = re.sub(r"^```(?:json)?\s*", "", content.strip())
                    clean_json = re.sub(r"\s*```$", "", clean_json)
                    parsed = json.loads(clean_json)
                    if "landing_page" in parsed and "sections" in parsed["landing_page"]:
                        parsed["landing_page"]["template"] = target_template
                        return parsed
        except Exception as exc:
            logger.warning(f"LLM API call with model '{try_model}' failed: {exc}")

    return _build_full_funnel_sections(clean_topic, audience, goal, is_paid, price_cents, custom_instructions, template=target_template)


async def _fetch_live_web_search(query: str) -> str:
    """Fetch live web search snippets for real-time grounding."""
    try:
        clean_q = re.sub(r"[^\w\s-]", " ", query).strip()[:100]
        if not clean_q or len(clean_q) < 3:
            return ""
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        async with httpx.AsyncClient(timeout=4.0, follow_redirects=True) as client:
            res = await client.post(
                "https://html.duckduckgo.com/html/",
                data={"q": clean_q},
                headers=headers,
            )
            if res.status_code == 200:
                snippets = re.findall(r'<a class="result__snippet[^"]*"[^>]*>(.*?)</a>', res.text, re.DOTALL)
                clean = [re.sub(r"<[^>]+>", "", s).strip() for s in snippets[:4]]
                if clean:
                    return "\n".join(f"- {s}" for s in clean if len(s) > 15)
    except Exception:
        pass
    return ""


async def chat_with_agent(
    *,
    messages: list[dict[str, str]],
    model: str | None = None,
    system_persona: str | None = None,
) -> dict[str, Any]:
    target_model = model or settings.OPENAI_MODEL or "gpt-4o"
    base_url = settings.OPENAI_BASE_URL.rstrip("/") if settings.OPENAI_BASE_URL else "http://localhost:20128/v1"
    api_key = settings.OPENAI_API_KEY or "omniroute"
    now = datetime.now(timezone.utc)
    current_date = now.strftime("%B %d, %Y")
    current_year = now.year

    default_persona = (
        f"You are WebinarFlow AI — a world-class autonomous AI agent with real-time web search capabilities.\n"
        f"TEMPORAL CONTEXT: The current year is {current_year} (Today: {current_date}).\n"
        f"- Always answer in the active present tense (e.g. 'The President of China is Xi Jinping').\n"
        f"- Do NOT add phrases like '(as of 2024)' or '(as of 2023)'. Present all active facts as current.\n"
        f"- Provide direct, definitive answers immediately without showing internal reasoning scratchpads.\n"
        f"- You assist users with coding (Python, JS, React, SQL, APIs, Docker), data science, AI, global knowledge, and webinars."
    )

    sys_prompt = system_persona or default_persona
    
    # Retrieve live web search grounding for the latest message
    last_user_msg = messages[-1]["content"] if messages else ""
    live_context = await _fetch_live_web_search(last_user_msg)
    
    convo = [{"role": "system", "content": sys_prompt}]
    for idx, m in enumerate(messages):
        if idx == len(messages) - 1 and m.get("role") == "user" and live_context:
            convo.append({
                "role": "user",
                "content": f"{m['content']}\n\n[Verified Real-Time Search Results as of {current_date}]:\n{live_context}"
            })
        else:
            convo.append(m)

    candidate_models = [
        target_model,
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "groq/compound",
        "llama-3.3-70b-versatile",
        settings.OPENAI_MODEL or "gpt-4o",
    ]
    # Remove duplicates preserving order
    seen = set()
    models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

    for try_model in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {
                    "model": try_model,
                    "messages": convo,
                    "temperature": 0.5,
                }
                res = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    raw_reply = data["choices"][0]["message"]["content"]
                    # Strip <think>...</think> and thinking scratchpads
                    clean_reply = re.sub(r"<think>[\s\S]*?</think>", "", raw_reply).strip()
                    if clean_reply.startswith("Here's a thinking process:"):
                        # If there's an answer after the thinking lines, extract it
                        sub_parts = clean_reply.split("\n\n")
                        final_paragraphs = [p for p in sub_parts if not p.strip().startswith(("1.", "2.", "3.", "4.", "5.", "Analyze", "Identify", "Check Knowledge", "Let's verify:", "Here's a thinking"))]
                        if final_paragraphs:
                            clean_reply = "\n\n".join(final_paragraphs).strip()
                    # Strip residual (as of 2024) qualifiers
                    clean_reply = re.sub(r"\(as of (?:mid-)?202[0-4]\):?", "", clean_reply, flags=re.IGNORECASE).strip()
                    return {"reply": clean_reply or raw_reply, "model": try_model, "provider": "cloud-llm"}
                else:
                    logger.warning(f"LLM API returned status {res.status_code} for model '{try_model}': {res.text}")
        except Exception as exc:
            logger.warning(f"Chat API call with model '{try_model}' failed: {exc}")

    last_msg = messages[-1]["content"] if messages else ""
    if live_context:
        return {
            "reply": f"Here is the verified information for your question:\n\n{live_context}",
            "model": target_model,
            "provider": "live-search",
        }

    return {
        "reply": f"I am your AI Agent. Regarding **\"{last_msg}\"**, let me know if you would like me to write code, provide full technical solutions, or analyze this topic in detail!",
        "model": target_model,
        "provider": "universal-ai-engine",
    }


async def apply_funnel(
    db: AsyncSession,
    *,
    organization_id: uuid.UUID,
    user_id: uuid.UUID,
    funnel: dict[str, Any],
) -> tuple[Webinar, LandingPage]:
    w_data = funnel.get("webinar", {})
    lp_data = funnel.get("landing_page", {})

    starts_at = datetime.now(timezone.utc) + timedelta(days=3)

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

    # Pass the full structured sections directly into template content!
    sections = lp_data.get("sections") or {}
    if not sections:
        sections = {
            "hero_v2": {
                "headline": lp_data.get("hero_headline") or w_data.get("title"),
                "subtitle": lp_data.get("hero_subheadline") or w_data.get("description"),
                "cta_text": lp_data.get("cta_text") or "Register Now",
            },
            "benefits": {"benefits": lp_data.get("benefits") or []},
            "agenda": {"items": lp_data.get("agenda") or []},
            "faq": {"items": lp_data.get("faqs") or []},
        }

    tpl_id = lp_data.get("template") or "modern-saas"
    content = {
        "template": tpl_id,
        "sections": sections,
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
        template_id=tpl_id,
        content=content,
    )
    landing_page = await landing_page_service.create_landing_page(
        db, organization_id=organization_id, created_by=user_id, payload=lp_create
    )
    await db.flush()

    return webinar, landing_page
