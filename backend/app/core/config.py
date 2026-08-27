"""Application settings, sourced from environment variables.

All settings carry typed defaults so the app boots in development with a
Postgres DB URL supplied (or falling back to SQLite for local tinkering).
Production secrets must come from the environment / a secrets manager.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AnyHttpUrl, EmailStr, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- App ---
    APP_NAME: str = "WebinarFlow-AI"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # --- Database ---
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/webinarflow"
    # Fallback SQLite URL used when Postgres is unavailable during scaffold work.
    SQLITE_FALLBACK: bool = True

    # --- CORS ---
    BACKEND_CORS_ORIGINS: list[AnyHttpUrl] | str = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _assemble_cors(cls, v: object) -> list[str] | str:
        if isinstance(v, str):
            # Allow a comma-separated string in .env
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    # --- Auth / JWT ---
    JWT_SECRET_KEY: str = "change-me-in-production-please-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 2

    # --- Email (Resend / Brevo / SMTP) ---
    RESEND_API_KEY: str = ""
    BREVO_API_KEY: str = ""
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: EmailStr | None = None  # type: ignore[assignment]
    SMTP_FROM_NAME: str = "WebinarFlow-AI"

    # --- Google OAuth ---
    GOOGLE_OAUTH_CLIENT_ID: str = ""
    GOOGLE_OAUTH_CLIENT_SECRET: str = ""
    GOOGLE_OAUTH_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"

    # --- LinkedIn OAuth ---
    LINKEDIN_CLIENT_ID: str = ""
    LINKEDIN_CLIENT_SECRET: str = ""
    LINKEDIN_REDIRECT_URI: str = "http://localhost:3000/auth/linkedin/callback"

    # --- AI providers ---
    OPENAI_API_KEY: str = ""
    OPENAI_BASE_URL: str = "http://localhost:20128/v1"
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-latest"
    AI_PROVIDER: str = "openai"

    # --- Zoom ---
    ZOOM_ACCOUNT_ID: str = ""
    ZOOM_CLIENT_ID: str = ""
    ZOOM_CLIENT_SECRET: str = ""

    # --- Google Meet ---
    GOOGLE_MEET_CREDENTIALS_JSON: str = ""

    # --- WhatsApp (Meta Cloud API) ---
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = ""

    # --- Stripe ---
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # --- Razorpay ---
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # --- Redis / Celery ---
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # --- Frontend ---
    FRONTEND_URL: AnyHttpUrl = "http://localhost:3000"  # type: ignore[assignment]

    @property
    def cors_origins_list(self) -> list[str]:
        origins = self.BACKEND_CORS_ORIGINS
        if isinstance(origins, str):
            return [o.strip() for o in origins.split(",") if o.strip()]
        return [str(o) for o in origins]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
