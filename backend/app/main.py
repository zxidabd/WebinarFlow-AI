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
    allow_origin_regex=r"https://.*(vercel\.app|webinarflow\.in)|http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount versioned API.
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/", tags=["system"])
@app.get("/health", tags=["system"])
@app.get("/api/v1/health", tags=["system"])
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
