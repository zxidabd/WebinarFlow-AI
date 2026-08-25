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
    await _run_startup_seeding()
    yield
    logger.info("Shutting down %s", settings.APP_NAME)


async def _run_startup_seeding() -> None:
    """Seed RBAC roles/permissions and ensure DB tables exist."""
    from app.db import AsyncSessionLocal, Base, engine
    import app.models  # noqa: F401
    from app.services.rbac import seed_rbac

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
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

# CORS — use origins from environment variable, fallback to default dev origins if not set.
# In development, we want to allow the frontend dev server on common ports.
if settings.ENVIRONMENT == "development":
    env_origins = settings.cors_origins_list
    CORS_ORIGINS = env_origins if env_origins else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
        "http://localhost:3003",
        "http://127.0.0.1:3003",
        "http://localhost:3004",
        "http://127.0.0.1:3004",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    CORS_ORIGINS = settings.cors_origins_list or ["*"]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount versioned API.
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["system"])
async def health() -> dict[str, str]:
    """Lightweight liveness probe — does not touch the DB."""
    return {"status": "ok", "app": settings.APP_NAME, "version": __version__}


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
