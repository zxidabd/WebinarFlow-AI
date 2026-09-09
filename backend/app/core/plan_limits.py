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
        "max_ai_chats_per_month": 100,
        "max_registrants_per_webinar": 300,
    },
    "pro": {
        "max_webinars": 7,
        "max_funnels_per_webinar": 4,
        "max_ai_chats_per_month": 200,
        "max_registrants_per_webinar": 600,
    },
}

UNLIMITED_LIMITS = {
    "max_webinars": 999999,
    "max_funnels_per_webinar": 999999,
    "max_ai_chats_per_month": 999999,
    "max_registrants_per_webinar": 999999,
}


def get_limits(plan_tier: str, is_super_user: bool = False) -> dict:
    if is_super_user or plan_tier in ("admin", "unlimited", "enterprise"):
        return UNLIMITED_LIMITS
    return PLAN_LIMITS.get(plan_tier, PLAN_LIMITS["free_trial"])
