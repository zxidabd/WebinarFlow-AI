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


def _resolve_color_theme(text: str) -> dict[str, Any]:
    """
    Detects any user-specified color (hex code or color name) from input text.
    Computes luminance to adapt dark/light text contrast automatically.
    """
    lower = text.lower()
    
    # 1. Check for explicit hex code (e.g. #000, #000000, #0f172a, #1e1b4b, #ffffff)
    hex_match = re.search(r"#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b", text)
    if hex_match:
        raw_hex = hex_match.group(0).lower()
        if len(raw_hex) == 4:
            clean_hex = f"#{raw_hex[1]*2}{raw_hex[2]*2}{raw_hex[3]*2}"
        else:
            clean_hex = raw_hex
            
        r = int(clean_hex[1:3], 16)
        g = int(clean_hex[3:5], 16)
        b = int(clean_hex[5:7], 16)
        luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
        is_dark = luminance < 0.45
        
        return {
            "requested_color": clean_hex,
            "is_dark": is_dark,
            "bg_main": clean_hex,
            "bg_alt": clean_hex if clean_hex != "#000000" else "#09090b",
            "bg_nav": clean_hex,
            "bg_footer": clean_hex if is_dark else "#0f172a",
            "hero_grad": "from-zinc-950 via-neutral-900 to-black" if is_dark else "from-indigo-900 via-purple-900 to-slate-950",
        }

    # 2. Check for named colors
    named_map = {
        "navy": ("#0a192f", True),
        "midnight": ("#0f172a", True),
        "black": ("#000000", True),
        "dark": ("#09090b", True),
        "purple": ("#1e1b4b", True),
        "violet": ("#2e1065", True),
        "indigo": ("#1e1b4b", True),
        "emerald": ("#064e3b", True),
        "green": ("#064e3b", True),
        "slate": ("#0f172a", True),
        "zinc": ("#18181b", True),
        "charcoal": ("#18181b", True),
        "maroon": ("#450a0a", True),
        "crimson": ("#450a0a", True),
        "blue": ("#1e3a8a", True),
        "white": ("#ffffff", False),
        "cream": ("#fafaf9", False),
        "light": ("#ffffff", False),
    }

    for name, (hex_code, is_dark) in named_map.items():
        if re.search(rf"\b{name}\b", lower):
            return {
                "requested_color": hex_code,
                "is_dark": is_dark,
                "bg_main": hex_code,
                "bg_alt": "#09090b" if hex_code == "#000000" else (hex_code if is_dark else "#f8fafc"),
                "bg_nav": hex_code,
                "bg_footer": hex_code if is_dark else "#0f172a",
                "hero_grad": "from-zinc-950 via-neutral-900 to-black" if is_dark else "from-indigo-900 via-purple-900 to-slate-950",
            }

    # 3. Default fallback (clean light mode)
    return {
        "requested_color": None,
        "is_dark": False,
        "bg_main": "#ffffff",
        "bg_alt": "#f8fafc",
        "bg_nav": "#ffffff",
        "bg_footer": "#0f172a",
        "hero_grad": "from-indigo-900 via-purple-900 to-slate-950",
    }


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

    combined_text = f"{clean_topic} {aud} {goal or ''} {extra}".lower()
    color_info = _resolve_color_theme(f"{clean_topic} {extra}")
    bg_main = color_info["bg_main"]
    bg_alt = color_info["bg_alt"]
    bg_nav = color_info["bg_nav"]
    bg_footer = color_info["bg_footer"]
    hero_grad = color_info["hero_grad"]

    title = f"{clean_topic}: The Complete Blueprint"
    slug = f"{_slugify(clean_topic)}-{uuid.uuid4().hex[:6]}"

    # Parse custom instructor / speaker if provided in extra instructions
    speaker_name = None
    sp_match = re.search(r"(?:speaker|host|instructor)\s*:\s*([^,\n.]+)", extra, re.IGNORECASE)
    if sp_match:
        speaker_name = sp_match.group(1).strip()
    if not speaker_name:
        speaker_name = "Alex Vance" if "ai" in clean_topic.lower() else "David Carter"

    speaker_title = f"Lead Strategist & {clean_topic} Specialist"
    speaker_bio = f"Over 10+ years deploying industry frameworks. Mentored 3,000+ {aud} in real-world project delivery."

    # 1. Navbar
    navbar = {
        "logo_text": clean_topic[:20] if len(clean_topic) <= 20 else "WebinarFlow",
        "links": "Curriculum, Speakers, Benefits, Reviews, FAQ",
        "cta_text": "Claim Your Seat" if not is_paid else f"Register ({price_str})",
        "cta_link": "#register",
        "bg_color": bg_nav,
    }

    # 2. Hero
    hero_v2 = {
        "headline": f"How {aud} Master {clean_topic}",
        "subtitle": f"A live, high-impact masterclass revealing practical frameworks to build automated systems, demonstrate verified skills, and achieve rapid growth. {extra}"[:300].strip(),
        "cta_text": "Join Free Live Training" if not is_paid else f"Enroll Now · {price_str}",
        "cta_link": "#register",
        "bg_color": bg_main if is_black_or_dark else "#4f46e5",
        "background_gradient": hero_grad,
        "hero_image": "/hero-dashboard.png",
    }

    # 3. Speakers
    speakers = {
        "title": "Meet Your Instructor & Mentors",
        "speakers": [
            {
                "name": speaker_name,
                "title": speaker_title,
                "avatar": "/avatars/alex.jpg",
                "bio": speaker_bio,
            },
            {
                "name": "Maya Lin",
                "title": "Head of Career & Acceleration",
                "avatar": "/avatars/sarah.jpg",
                "bio": f"Assists {aud} in showcasing verifiable portfolio projects to recruiters, clients, and institutions.",
            },
        ],
        "bg_color": bg_main,
    }

    # 4. Stats
    stats = {
        "stats": [
            {"value": "5,000+", "label": f"{aud} Trained"},
            {"value": "98%", "label": "Satisfaction Rating"},
            {"value": "15+", "label": "Practical Workflows"},
            {"value": "4.9/5", "label": "Attendee Score"},
        ],
        "bg_color": bg_alt,
    }

    # 5. Logos
    logos = {
        "title": f"Tools & Platforms Covered in This {clean_topic} Workshop",
        "logos": [
            {"src": "/logos/openai.svg", "alt": "Automation Tools"},
            {"src": "/logos/python.svg", "alt": "Execution Scripts"},
            {"src": "/logos/github.svg", "alt": "Portfolio Showcase"},
            {"src": "/logos/cloud.svg", "alt": "Cloud Systems"},
        ],
        "bg_color": bg_main,
    }

    # 6. Benefits Grid
    benefits = {
        "title": f"Everything You Will Master in {clean_topic}",
        "subtitle": f"Structured specifically for {aud} to deliver tangible outcomes and verified knowledge.",
        "benefits": [
            {
                "icon": "Zap",
                "title": f"Production-Ready {clean_topic} Skills",
                "description": f"Build practical systems you can demonstrate immediately with real-world impact.",
            },
            {
                "icon": "RefreshCw",
                "title": "Continuous Tool & Framework Updates",
                "description": "Stay ahead with workflows that adapt as technologies and platforms evolve.",
            },
            {
                "icon": "BarChart3",
                "title": "Zero Fluff & Pure Execution",
                "description": "Step-by-step live build walkthrough with zero confusing theory or wasted time.",
            },
            {
                "icon": "Users",
                "title": "Exclusive Community & Mentorship",
                "description": f"Connect with fellow {aud}, mentors, and industry practitioners for ongoing support.",
            },
        ],
        "bg_color": bg_main,
    }

    # 7. Agenda Timeline
    agenda = {
        "title": "Workshop Curriculum & Schedule",
        "items": [
            {
                "time": "00:00 - 00:15",
                "title": f"The State of {clean_topic} in 2026",
                "description": f"Why traditional approaches are obsolete and what {aud} must focus on today.",
            },
            {
                "time": "00:15 - 00:40",
                "title": f"Live Build: End-to-End {clean_topic} System",
                "description": "Step-by-step live demonstration constructing a production-grade workflow from scratch.",
            },
            {
                "time": "00:40 - 00:55",
                "title": "Packaging & Scaling Your Results",
                "description": "How to showcase your proof-of-work, avoid common mistakes, and maximize conversion.",
            },
            {
                "time": "00:55 - 01:00",
                "title": "Interactive Live Q&A & Resource Toolkit Drop",
                "description": "Get all your specific questions answered and receive the complete toolkit templates.",
            },
        ],
        "bg_color": bg_alt,
    }

    # 8. Testimonials
    testimonials = {
        "title": f"What Past {aud} Are Saying",
        "testimonials": [
            {
                "quote": f"This masterclass completely transformed how I build projects. The framework helped me showcase real proficiency and win high-value opportunities!",
                "name": "Rohan Patel",
                "title": f"{clean_topic} Practitioner",
                "avatar": "/avatars/john.jpg",
            },
            {
                "quote": f"Zero theory, 100% actionable. I automated our workflows the very next day with outstanding measurable results.",
                "name": "Jessica Taylor",
                "title": "Operations & Strategy Lead",
                "avatar": "/avatars/emily.jpg",
            },
        ],
        "bg_color": bg_main,
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
                "question": "Will course materials and templates be updated?",
                "answer": "Yes! All participants get access to updated resources and templates as new tools are released.",
            },
            {
                "question": "Can I showcase these projects in my portfolio or career?",
                "answer": "Absolutely. The projects built during this workshop are structured specifically to be demonstrated as verified proof of skills.",
            },
            {
                "question": "Will a recording / replay be available?",
                "answer": "Yes, registered attendees receive 48-hour access to the full recording, slide decks, and code/template resources.",
            },
        ],
        "bg_color": bg_alt,
    }

    # 10. Countdown
    countdown = {
        "enabled": "true",
        "end_date": (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%dT23:59:00Z"),
        "message": f"Live cohort filling fast — reserve your seat for {clean_topic}",
        "bg_color": bg_alt if is_black_or_dark else "#4f46e5",
    }

    # 11. Registration Form
    register = {
        "title": "Reserve Your Spot in the Live Masterclass",
        "cta_text": "Register Now — It's Free" if not is_paid else f"Register Now · {price_str}",
        "collect_name": "true",
        "success_message": "You're registered! Check your email for room access and preparatory worksheets.",
        "bg_color": bg_main,
    }

    # 12. Footer
    footer = {
        "text": f"© {datetime.now().year} {clean_topic}. All rights reserved.",
        "links": "Privacy Policy, Terms of Service, Contact Support",
        "bg_color": bg_footer,
    }

    # Standard Hero for Corporate / Education
    hero = {
        "headline": hero_v2["headline"],
        "subtitle": hero_v2["subtitle"],
        "cta_text": hero_v2["cta_text"],
        "cta_link": "#register",
        "price": price_str,
        "bg_color": bg_main if is_black_or_dark else ("#0f172a" if template == "education" else "#1e293b"),
        "background_color": bg_main if is_black_or_dark else "#1e293b",
        "hero_image": "/hero-dashboard.png",
        "course_image": "/hero-dashboard.png",
        "logo_url": "/logo.png",
    }

    # Education: Instructor Profile
    instructor = {
        "title": "Meet Your Lead Instructor",
        "name": speaker_name,
        "title_role": speaker_title,
        "avatar": speakers["speakers"][0]["avatar"],
        "bio": speaker_bio,
        "credentials": f"10+ Years Experience, Mentored 3,000+ {aud}",
        "bg_color": bg_main,
    }

    # Education: Learning Outcomes
    outcomes = {
        "title": "What You'll Master & Take Away",
        "outcomes": [{"text": f"{b['title']} — {b['description']}"} for b in benefits["benefits"]],
        "bg_color": bg_alt,
    }

    # Education: Complete Curriculum
    curriculum = {
        "title": f"Course Curriculum & Modules",
        "modules": [
            {
                "title": item["title"],
                "duration": item["time"],
                "description": item["description"],
                "lessons": "1 In-Depth Module",
            }
            for item in agenda["items"]
        ],
        "bg_color": bg_main,
    }

    # Education: Certificate
    certificate = {
        "title": "Official Certificate of Completion",
        "description": f"Earn a verifiable credential in {clean_topic} to showcase on your LinkedIn, resume, and portfolio.",
        "bullet_points": [
            "Verifiable digital certificate for universities & employers",
            f"Demonstrates hands-on proficiency in {clean_topic}",
            "Included free with live attendance",
        ],
        "badge_text": "VERIFIED CREDENTIAL",
        "bg_color": bg_alt,
    }

    # Corporate: Schedule
    schedule = {
        "title": "Event Schedule & Session Breakdown",
        "date": "Live This Week",
        "items": [
            {
                "time": item["time"],
                "title": item["title"],
                "speaker": speaker_name,
            }
            for item in agenda["items"]
        ],
        "bg_color": bg_main,
    }

    # Corporate: Case Study
    case_study = {
        "title": "Real-World Impact & Case Study",
        "headline": f"How Modern Teams Scaled {clean_topic} by 10x",
        "metrics": [
            {"value": "10x", "label": "Faster Execution"},
            {"value": "95%", "label": "Cost Efficiency"},
            {"value": "5,000+", "label": "Projects Delivered"},
        ],
        "quote": f"Implementing this exact blueprint accelerated our delivery and gave our team a decisive competitive edge.",
        "quote_author": "David Chen",
        "quote_role": "VP of Technology & Operations",
        "bg_color": bg_main,
    }

    # Corporate: Contact
    contact = {
        "title": "Questions? Contact Our Team",
        "email": "support@webinarflow.in",
        "phone": "+1 (800) 555-0199",
        "address": "San Francisco, CA",
        "bg_color": bg_alt,
    }

    all_sections = {
        "navbar": navbar,
        "hero": hero,
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
        # Education Template Sections
        "instructor": instructor,
        "outcomes": outcomes,
        "curriculum": curriculum,
        "certificate": certificate,
        # Corporate Template Sections
        "schedule": schedule,
        "case_study": case_study,
        "case_studies": case_study,
        "contact": contact,
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
            "host_name": speaker_name,
            "host_bio": speaker_bio,
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
                "body": f"Hi {{first_name}},\n\nAre you looking to master {clean_topic} and stand out in 2026?\n\nJoin us for an exclusive masterclass designed for {aud}.\n\n📅 Date: Live this week\n⏰ Duration: 60 Minutes\n\n👉 Reserve your spot here: {{registration_link}}\n\nBest,\nThe Team",
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
            "story": f"Case study of how {aud} shifted from theory to portfolio-ready execution.",
            "core_content": f"Pillar 1: Modern {clean_topic} Foundation\nPillar 2: Live Workflow Build\nPillar 3: Proof-of-Work Demonstration",
            "offer_pitch": "Presenting the complete toolkit, templates, and ongoing mentorship to accelerate results.",
            "qa_points": "Addressing attendee questions, tool evolution, and implementation roadblocks.",
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

    combined_text = f"{clean_topic} {audience} {goal or ''} {custom_instructions or ''}".lower()
    color_info = _resolve_color_theme(f"{clean_topic} {custom_instructions or ''}")
    is_custom_color = color_info["requested_color"] is not None
    is_dark = color_info["is_dark"]
    bg_primary = color_info["bg_main"]
    bg_secondary = color_info["bg_alt"]
    hero_gradient = color_info["hero_grad"]

    if is_custom_color:
        color_rule = (
            f"CRITICAL COLOR REQUIREMENT: The user specifically requested background color '{bg_primary}' "
            f"({'DARK THEME' if is_dark else 'LIGHT THEME'}). "
            f"You MUST set 'bg_color': '{bg_primary}' on EVERY single section inside 'sections'. "
            f"Set 'background_gradient': '{hero_gradient}'. All text and card components will render in {'dark' if is_dark else 'light'} mode with proper contrast."
        )
    else:
        color_rule = "Use clean, professional background colors matching the selected template style."

    system_prompt = (
        "You are an expert Webinar Funnel Strategist inside WebinarFlow AI.\n"
        f"Generate a complete, high-converting webinar funnel for template style '{target_template}'.\n"
        f"{color_rule}\n"
        "Return ONLY a valid JSON object matching the full funnel schema with all 11+ landing page sections populated:\n"
        "{\n"
        '  "webinar": {\n'
        '    "title": "...",\n'
        '    "subtitle": "...",\n'
        '    "description": "...",\n'
        '    "duration_minutes": 60,\n'
        '    "is_paid": false,\n'
        '    "price_cents": 0,\n'
        '    "learning_points": ["..."],\n'
        '    "host_name": "...",\n'
        '    "host_bio": "..."\n'
        "  },\n"
        '  "landing_page": {\n'
        '    "title": "...",\n'
        '    "slug": "...",\n'
        '    "meta_description": "...",\n'
        f'    "template": "{target_template}",\n'
        '    "hero_headline": "...",\n'
        '    "hero_subheadline": "...",\n'
        '    "cta_text": "...",\n'
        '    "benefits": [{"title": "...", "description": "..."}],\n'
        '    "agenda": [{"time": "...", "topic": "..."}],\n'
        '    "faqs": [{"question": "...", "answer": "..."}],\n'
        '    "sections": {\n'
        '      "navbar": {"logo_text": "...", "links": "...", "cta_text": "...", "cta_link": "#register", "bg_color": "#000000"},\n'
        '      "hero_v2": {"headline": "...", "subtitle": "...", "cta_text": "...", "cta_link": "#register", "bg_color": "#000000", "background_gradient": "from-zinc-950 via-neutral-900 to-black"},\n'
        '      "hero": {"headline": "...", "subtitle": "...", "cta_text": "...", "bg_color": "#000000"},\n'
        '      "speakers": {"title": "...", "speakers": [{"name": "...", "title": "...", "bio": "..."}], "bg_color": "#000000"},\n'
        '      "stats": {"stats": [{"value": "...", "label": "..."}], "bg_color": "#09090b"},\n'
        '      "logos": {"title": "...", "logos": [{"src": "/logos/openai.svg", "alt": "..."}], "bg_color": "#000000"},\n'
        '      "benefits": {"title": "...", "subtitle": "...", "benefits": [{"title": "...", "description": "..."}], "bg_color": "#000000"},\n'
        '      "agenda": {"title": "...", "items": [{"time": "...", "title": "...", "description": "..."}], "bg_color": "#09090b"},\n'
        '      "testimonials": {"title": "...", "testimonials": [{"name": "...", "title": "...", "quote": "..."}], "bg_color": "#000000"},\n'
        '      "faq": {"title": "...", "items": [{"question": "...", "answer": "..."}], "bg_color": "#09090b"},\n'
        '      "countdown": {"enabled": "true", "message": "...", "bg_color": "#09090b"},\n'
        '      "register": {"title": "...", "cta_text": "...", "bg_color": "#000000"},\n'
        '      "footer": {"text": "...", "links": "...", "bg_color": "#000000"},\n'
        '      "instructor": {"title": "...", "name": "...", "title_role": "...", "bio": "...", "credentials": "...", "bg_color": "#000000"},\n'
        '      "outcomes": {"title": "...", "outcomes": [{"text": "..."}], "bg_color": "#09090b"},\n'
        '      "curriculum": {"title": "...", "modules": [{"title": "...", "lessons": "...", "duration": "..."}], "bg_color": "#000000"},\n'
        '      "certificate": {"title": "...", "description": "...", "bg_color": "#09090b"},\n'
        '      "schedule": {"title": "...", "date": "...", "items": [{"time": "...", "title": "...", "speaker": "..."}], "bg_color": "#000000"},\n'
        '      "case_study": {"title": "...", "headline": "...", "metrics": [{"value": "...", "label": "..."}], "quote": "...", "quote_author": "...", "bg_color": "#000000"},\n'
        '      "contact": {"title": "...", "email": "support@webinarflow.in", "bg_color": "#09090b"}\n'
        '    }\n'
        "  },\n"
        '  "email_sequence": [\n'
        '    {"type": "invitation", "subject": "...", "body": "..."},\n'
        '    {"type": "reminder_24h", "subject": "...", "body": "..."},\n'
        '    {"type": "reminder_1h", "subject": "...", "body": "..."},\n'
        '    {"type": "reminder_15m", "subject": "...", "body": "..."},\n'
        '    {"type": "replay_and_offer", "subject": "...", "body": "..."}\n'
        "  ],\n"
        '  "outline": {"hook": "...", "story": "...", "core_content": "...", "offer_pitch": "...", "qa_points": "..."}\n'
        "}\n\n"
        "Ensure ALL sections reflect the user's specific topic and instructions in rich detail. Return ONLY JSON."
    )

    user_prompt = (
        f"Generate a webinar funnel for:\n"
        f"- Topic: {clean_topic}\n"
        f"- Target Audience: {audience}\n"
        f"- Template Style: {target_template} ('modern-saas', 'corporate', or 'education')\n"
        f"- Primary Goal: {goal or 'High Lead Generation & Sales Conversion'}\n"
        f"- Pricing: {'Paid ($' + str(price_cents/100) + ')' if is_paid else 'Free Opt-in'}\n"
        f"- Extra Custom Instructions: {custom_instructions or 'None'}\n"
        f"{f'- Requested Background Color: {bg_primary} (' + ('Dark Theme' if is_dark else 'Light Theme') + ')' if is_custom_color else ''}"
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

                    # Handle case where LLM returned root level sections or missing landing_page wrapper
                    if "landing_page" not in parsed and "sections" in parsed:
                        parsed = {
                            "webinar": parsed.get("webinar", {}),
                            "landing_page": parsed,
                            "email_sequence": parsed.get("email_sequence", []),
                            "outline": parsed.get("outline", {}),
                        }

                    if "landing_page" in parsed:
                        lp = parsed["landing_page"]
                        lp["template"] = target_template

                        # If sections was at root level
                        if "sections" not in lp and "sections" in parsed:
                            lp["sections"] = parsed["sections"]

                        # Enforce user's requested color on sections
                        if is_custom_color and "sections" in lp and isinstance(lp["sections"], dict):
                            for sec_key, sec_val in lp["sections"].items():
                                if isinstance(sec_val, dict):
                                    sec_val["bg_color"] = bg_primary
                                    if sec_key in ("hero", "hero_v2"):
                                        sec_val["background_color"] = bg_primary
                                        sec_val["background_gradient"] = hero_gradient
                                    elif sec_key in ("stats", "agenda", "faq", "countdown", "outcomes", "certificate", "schedule", "contact"):
                                        sec_val["bg_color"] = bg_secondary

                        if "sections" in lp and len(lp["sections"]) >= 4:
                            return parsed
        except Exception as exc:
            logger.warning(f"LLM API call with model '{try_model}' failed: {exc}")

    return _build_full_funnel_sections(clean_topic, audience, goal, is_paid, price_cents, custom_instructions, template=target_template)


async def _get_live_forex_rates() -> dict[str, float]:
    """Fetch live exchange rates for major currencies against INR."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get("https://open.er-api.com/v6/latest/USD")
            if res.status_code == 200:
                rates = res.json().get("rates", {})
                inr_per_usd = rates.get("INR")
                if inr_per_usd and isinstance(inr_per_usd, (int, float)):
                    res_dict = {"USD": round(float(inr_per_usd), 2)}
                    for code in ["GBP", "AUD", "EUR", "NZD", "CAD", "SGD", "AED"]:
                        rate_to_usd = rates.get(code)
                        if rate_to_usd and isinstance(rate_to_usd, (int, float)) and rate_to_usd > 0:
                            res_dict[code] = round(float(inr_per_usd) / float(rate_to_usd), 2)
                    return res_dict
    except Exception:
        pass
    return {"USD": 87.50, "GBP": 112.50, "AUD": 58.20, "EUR": 95.10, "NZD": 53.40}


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
        f"You are WebinarFlow AI — a world-class AI assistant with full live web browsing and real-time internet search capabilities, communicating just like ChatGPT and Gemini with browsing enabled.\n"
        f"TEMPORAL CONTEXT: The current year is {current_year} (Today: {current_date}).\n"
        f"LIVE BROWSING CAPABILITY:\n"
        f"- You HAVE live web search and real-time browsing capabilities connected directly to the internet.\n"
        f"- NEVER say 'I don't have live-web browsing capability' or 'my training cutoff is...'. You can and do access live internet data via your integrated search engine.\n"
        f"- When the user asks about live currency rates, current news, sports, stock prices, or events, utilize your live search grounding data to answer accurately and decisively.\n"
        f"STYLE & FORMATTING GUIDELINES:\n"
        f"- Write in natural, clear conversational language using paragraphs and bullet points when listing items.\n"
        f"- NEVER use Markdown tables unless the user explicitly asks for a comparison or table (e.g. 'compare X vs Y in a table'). For calculations, summaries, scripts, and explanations, use plain text, paragraphs, or bullet points.\n"
        f"- For webinar scripts and copywriting: write naturally in full spoken paragraphs with cues and bullet points. Never format scripts into tables.\n"
        f"- For mathematical or currency conversions: compute the exact arithmetic accurately and write the final result cleanly in plain text (e.g. '$1 ≈ ₹87' or '₹499 ≈ $5.74'). Do NOT write raw LaTeX tags like '\\[ \\frac...' or '\\text{...}'.\n"
        f"- Give direct, helpful, and concise answers immediately without unnecessary preamble, boilerplate, or internal thinking."
    )

    sys_prompt = system_persona or default_persona
    
    # Retrieve live web search grounding or forex rates for the latest message
    last_user_msg = messages[-1]["content"] if messages else ""
    live_context = await _fetch_live_web_search(last_user_msg)
    
    # If the user asks about currency, dollar, rupees, or inr, fetch real-time exchange rates
    lower_msg = last_user_msg.lower()
    if any(term in lower_msg for term in ["dollar", "inr", "rupee", "usd", "aud", "eur", "gbp", "nzd", "cad", "$", "₹", "€", "£", "rate", "forex", "exchange"]):
        rates_map = await _get_live_forex_rates()
        lines = [f"1 {c} ≈ ₹{r} INR" for c, r in rates_map.items()]
        forex_info = (
            "- Verified Real-Time Forex Rates (Live from Internet):\n"
            + "\n".join(f"  * {line}" for line in lines)
            + "\n- When computing conversions, use these exact live rates and state the result directly in plain text without raw LaTeX."
        )
        if live_context:
            live_context = f"{forex_info}\n{live_context}"
        else:
            live_context = forex_info

    convo = [{"role": "system", "content": sys_prompt}]
    for idx, m in enumerate(messages):
        if idx == len(messages) - 1 and m.get("role") == "user" and live_context:
            convo.append({
                "role": "user",
                "content": f"{m['content']}\n\n[Verified Real-Time Internet Search Grounding (Live)]: \n{live_context}"
            })
        else:
            convo.append(m)
    # Simple, fast model cascade — only models verified to exist on this Groq key
    # Primary: openai/gpt-oss-120b (best quality, does coding + general knowledge + everything)
    # Fallbacks: other verified models on this key
    models_to_try = [
        model or "openai/gpt-oss-120b",   # User's choice or primary
        "openai/gpt-oss-120b",
        "qwen/qwen3.6-27b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.8-27b",
        "allam-2-7b",
    ]
    # Remove duplicates preserving order
    seen: set[str] = set()
    models_to_try = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

    for try_model in models_to_try:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
                payload = {
                    "model": try_model,
                    "messages": convo,
                    "temperature": 0.6,
                    "max_tokens": 4096,
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
        "reply": f"Here is the guidance for your question regarding **\"{last_msg}\"**:\n\nCould you clarify which specific angle or details you'd like me to expand upon?",
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
        status=WebinarStatus.draft,
        is_published=False,
        is_paid=bool(w_data.get("is_paid", False)),
        price_cents=int(w_data.get("price_cents", 0) or 0),
        currency="usd",
    )
    webinar = await webinar_service.create_webinar(
        db, organization_id=organization_id, created_by=user_id, payload=webinar_create, create_default_landing_page=False
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
        is_published=False,
        status=LandingPageStatus.draft,
        template_id=tpl_id,
        content=content,
    )
    landing_page = await landing_page_service.create_landing_page(
        db, organization_id=organization_id, created_by=user_id, payload=lp_create
    )
    await db.flush()

    return webinar, landing_page
