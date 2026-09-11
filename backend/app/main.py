"""FastAPI application entry point.

Run with:  uvicorn app.main:app --reload --port 8000
(or `npm run backend` from the repo root.)
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.config import settings

logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("webinarflow")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s v%s [%s]", settings.APP_NAME, __version__, settings.ENVIRONMENT)
    logger.info(
        "Config check: GOOGLE_CLIENT_ID=%s, RESEND=%s, FRONTEND_URL=%s",
        "SET" if bool(settings.GOOGLE_OAUTH_CLIENT_ID) else "MISSING",
        "SET" if bool(settings.RESEND_API_KEY or settings.SMTP_PASSWORD) else "MISSING",
        settings.FRONTEND_URL,
    )
    await _run_startup_seeding()
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


async def _run_startup_seeding() -> None:
    """Seed RBAC roles/permissions and ensure DB tables exist."""
    from sqlalchemy import text
    from app.db import AsyncSessionLocal, Base, engine
    import app.models  # noqa: F401
    from app.services.rbac import seed_rbac

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

            # Auto-migrate columns that may be missing on existing production tables
            if "postgres" in engine.dialect.name.lower():
                migration_statements = [
                    # organizations
                    "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSON DEFAULT '{}'::json;",
                    # webinars
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'usd';",
                    "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'stripe';",
                    # landing_pages
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS template_id VARCHAR(100);",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS content JSON DEFAULT '{}'::json;",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_head_html TEXT;",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_body_html TEXT;",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_description VARCHAR(512);",
                    "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_image VARCHAR(512);",
                    # registrants
                    "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS custom_answers JSON;",
                    "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'registered';",
                    "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;",
                    "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS total_spent_cents INTEGER DEFAULT 0;",
                    # users
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'active';",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier VARCHAR(20) DEFAULT 'pro';",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_chat_count INTEGER DEFAULT 0;",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_chat_count_reset_at TIMESTAMPTZ;",
                    "UPDATE users SET subscription_status = 'active', plan_tier = 'pro' WHERE subscription_status IS NULL OR subscription_status = 'trialing';",
                    # ai_chat_sessions
                    """
                    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
                        id VARCHAR(100) PRIMARY KEY,
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL DEFAULT 'New Chat',
                        category VARCHAR(50) NOT NULL DEFAULT 'recent',
                        messages JSON NOT NULL DEFAULT '[]'::json,
                        created_at_ms BIGINT,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    """,
                    "CREATE INDEX IF NOT EXISTS ix_ai_chat_sessions_user_id ON ai_chat_sessions (user_id);",
                    # subscription_payments
                    """
                    CREATE TABLE IF NOT EXISTS subscription_payments (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        plan_tier VARCHAR(20) NOT NULL,
                        billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
                        amount NUMERIC(12,2) NOT NULL,
                        currency VARCHAR(10) NOT NULL DEFAULT 'usd',
                        provider VARCHAR(20) NOT NULL,
                        provider_txn_id VARCHAR(255),
                        provider_order_id VARCHAR(255),
                        status VARCHAR(20) NOT NULL DEFAULT 'completed',
                        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                    );
                    """,
                    "CREATE INDEX IF NOT EXISTS ix_subscription_payments_user_id ON subscription_payments (user_id);",
                    "UPDATE subscription_payments SET amount = 1699.00 WHERE (amount = 0 OR amount IS NULL) AND plan_tier = 'pro' AND UPPER(currency) = 'INR';",
                    "UPDATE subscription_payments SET amount = 849.00 WHERE (amount = 0 OR amount IS NULL) AND plan_tier = 'starter' AND UPPER(currency) = 'INR';",
                    "UPDATE subscription_payments SET amount = 19.99 WHERE (amount = 0 OR amount IS NULL) AND plan_tier = 'pro' AND UPPER(currency) != 'INR';",
                    "UPDATE subscription_payments SET amount = 9.99 WHERE (amount = 0 OR amount IS NULL) AND plan_tier = 'starter' AND UPPER(currency) != 'INR';",
                ]
                for stmt in migration_statements:
                    try:
                        await conn.execute(text(stmt))
                    except Exception as col_err:
                        logger.debug("Startup migration statement notice: %s", col_err)

        async with AsyncSessionLocal() as session:
            await seed_rbac(session)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Skipping RBAC seed (DB not ready?): %s", exc)


app = FastAPI(
    title=settings.APP_NAME,
    description="Production-grade AI Webinar Funnel Builder SaaS.",
    version=__version__,
    docs_url="/api/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=None,
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# CORS configuration — support configured origins, custom domains, local dev, and all Vercel deployments.
origins = [str(o).rstrip("/") for o in settings.cors_origins_list if str(o) != "*"]
default_origins = [
    "https://webinarflow.in",
    "https://www.webinarflow.in",
    "https://webinar-flow-ai-frontend.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
for d in default_origins:
    if d not in origins:
        origins.append(d)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://([a-zA-Z0-9-]+\.)*(webinarflow\.in|vercel\.app)|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    origin = request.headers.get("origin") or "https://webinarflow.in"
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )

# Mount versioned API.
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Direct fallback mount for contact
from app.api.v1.endpoints.contact import router as contact_router
app.include_router(contact_router, prefix="/api/v1/contact", tags=["contact"])
app.include_router(contact_router, prefix="/contact", tags=["contact"])


@app.get("/", tags=["system"])
@app.get("/health", tags=["system"])
@app.get("/api/v1/health", tags=["system"])
async def health() -> dict[str, str]:
    """Lightweight liveness probe — does not touch the DB."""
    return {"status": "ok", "app": settings.APP_NAME, "version": __version__}


@app.get("/health/migrate", tags=["system"])
@app.get("/api/v1/health/migrate", tags=["system"])
async def run_db_migration() -> dict[str, object]:
    """Explicit endpoint to trigger column migrations on PostgreSQL."""
    from sqlalchemy import text
    from app.db import engine

    results = []
    migration_statements = [
        "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS settings JSON DEFAULT '{}'::json;",
        "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 0;",
        "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'usd';",
        "ALTER TABLE webinars ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(50) DEFAULT 'stripe';",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS template_id VARCHAR(100);",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS content JSON DEFAULT '{}'::json;",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_head_html TEXT;",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS custom_body_html TEXT;",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_title VARCHAR(255);",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_description VARCHAR(512);",
        "ALTER TABLE landing_pages ADD COLUMN IF NOT EXISTS meta_image VARCHAR(512);",
        "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS custom_answers JSON;",
        "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'registered';",
        "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ;",
        "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS is_buyer BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE registrants ADD COLUMN IF NOT EXISTS total_spent_cents INTEGER DEFAULT 0;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;",
    ]

    async with engine.begin() as conn:
        for stmt in migration_statements:
            try:
                await conn.execute(text(stmt))
                results.append({"stmt": stmt, "status": "executed"})
            except Exception as e:
                results.append({"stmt": stmt, "error": str(e)})

    return {"status": "ok", "dialect": engine.dialect.name, "results": results}


@app.get("/health/ready", tags=["system"])
async def readiness() -> dict[str, object]:
    """Readiness probe — verifies DB connectivity."""
    from sqlalchemy import text  # local import keeps the health import cheap

    from app.db import AsyncSessionLocal

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "ready", "db": "ok"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Readiness check failed: %s", exc)
        return {"status": "degraded", "db": str(exc)}
