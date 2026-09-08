"""Plan-based feature limits for subscription tiers."""
from __future__ import annotations

TRIAL_DURATION_DAYS = 3

PLAN_LIMITS = {
    "free_trial": {
        "max_webinars": 3,
        "max_funnels_per_webinar": 2,
        "max_ai_chats_per_month": 15,
        "max_registrants_per_webinar": 300,
    },
    "starter": {
        "max_webinars": 3,
        "max_funnels_per_webinar": 2,
        "max_ai_chats_per_month": 15,
        "max_registrants_per_webinar": 300,
    },
    "pro": {
        "max_webinars": 7,
        "max_funnels_per_webinar": 4,
        "max_ai_chats_per_month": 50,
        "max_registrants_per_webinar": 600,
    },
}

def get_limits(plan_tier: str) -> dict:
    return PLAN_LIMITS.get(plan_tier, PLAN_LIMITS["free_trial"])
