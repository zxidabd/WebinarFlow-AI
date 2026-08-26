"""Pydantic schemas for request/response serialization."""
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LinkedInAuthRequest,
    LoginRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
)
from app.schemas.organization import (
    AddMemberRequest,
    OrganizationCreate,
    OrganizationMember,
    OrganizationUpdate,
    UserOrganization,
)
from app.schemas.token import (
    AccessTokenResponse,
    AuthResponse,
    AuthUser,
    OrganizationRole,
    RegisterResponse,
)
from app.schemas.user import MeResponse, UserUpdate
from app.schemas.webinar import (
    AttendanceItem,
    RegistrantItem,
    WebinarCreate,
    WebinarDetail,
    WebinarDuplicateResponse,
    WebinarItem,
    WebinarListResponse,
    WebinarUpdate,
)
from app.schemas.landing_page import (
    LandingPageCreate,
    LandingPageUpdate,
    LandingPageItem,
    LandingPageDetail,
    LandingPageListResponse,
    LandingPageDuplicateResponse,
    PublicRegistrationRequest,
    PublicRegistrationResponse,
    LandingPageStats,
)

__all__ = [
    # auth
    "RegisterRequest",
    "LoginRequest",
    "ResendVerificationRequest",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "GoogleAuthRequest",
    # tokens / auth response
    "AccessTokenResponse",
    "AuthResponse",
    "AuthUser",
    "OrganizationRole",
    "RegisterResponse",
    # user
    "MeResponse",
    "UserUpdate",
    # organization
    "UserOrganization",
    "OrganizationCreate",
    "OrganizationUpdate",
    "OrganizationMember",
    "AddMemberRequest",
    # webinars
    "WebinarCreate",
    "WebinarUpdate",
    "WebinarItem",
    "WebinarDetail",
    "WebinarListResponse",
    "WebinarDuplicateResponse",
    "RegistrantItem",
    "AttendanceItem",
    # landing pages
    "LandingPageCreate",
    "LandingPageUpdate",
    "LandingPageItem",
    "LandingPageDetail",
    "LandingPageListResponse",
    "LandingPageDuplicateResponse",
    "PublicRegistrationRequest",
    "PublicRegistrationResponse",
    "LandingPageStats",
]
