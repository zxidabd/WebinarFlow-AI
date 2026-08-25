"""Model registry.

Importing this package registers every model (and association table) on
``Base.metadata``. ``app/migrations/env.py`` imports ``app.models`` for
exactly this reason — autogenerate and runtime queries both rely on the
full metadata being populated before the engine is used.

Add each new model module to ``__all__`` and the eager import block below.
"""
from __future__ import annotations

from app.models.base import TimestampMixin, UUIDMixin
from app.models.membership import Membership
from app.models.organization import Organization
from app.models.refresh_token import RefreshToken
from app.models.email_verification_token import EmailVerificationToken
from app.models.role import Permission, Role, role_permissions
from app.models.user import User
from app.models.webinar import (
    Attendance,
    MeetingProvider,
    Registrant,
    RegistrantStatus,
    Webinar,
    WebinarActivity,
    WebinarStatus,
)
from app.models.landing_page import (
    LandingPage,
    LandingPageStatus,
    LandingPageType,
    LandingPageVisit,
)
from app.models.payment import (
    Payment,
    PaymentProvider,
    PaymentStatus,
)

__all__ = [
    "TimestampMixin",
    "UUIDMixin",
    "User",
    "Organization",
    "Membership",
    "Role",
    "Permission",
    "role_permissions",
    "RefreshToken",
    "EmailVerificationToken",
    "Webinar",
    "Registrant",
    "Attendance",
    "WebinarActivity",
    "WebinarStatus",
    "RegistrantStatus",
    "MeetingProvider",
    "LandingPage",
    "LandingPageStatus",
    "LandingPageType",
    "LandingPageVisit",
    "Payment",
    "PaymentProvider",
    "PaymentStatus",
]
