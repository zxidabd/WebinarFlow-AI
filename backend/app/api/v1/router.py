"""Aggregated v1 router.

Sub-routers are imported and attached here. Feature routers are added as
they are implemented in later phases; a placeholder ping route keeps the
aggregate usable before any feature router exists.
"""
from __future__ import annotations

from fastapi import APIRouter

api_router = APIRouter()


@api_router.get("/ping", tags=["system"])
async def ping() -> dict[str, str]:
    """Simple authenticated-pong-free liveness check under the v1 prefix."""
    return {"ping": "pong"}


# --- Feature routers (imported lazily so the app boots even before they exist) ---
def _try_include(module_path: str, prefix: str, *, tags: list[str]) -> None:
    """Attach a feature router if it has been implemented; ignore if still pending.

    Keeps `main.py` importable during incremental scaffolding -- a router that
    isn't done yet simply won't be mounted until it is.
    """
    import importlib

    try:
        module = importlib.import_module(module_path)
    except ModuleNotFoundError:
        return
    router = getattr(module, "router", None)
    if router is not None:
        api_router.include_router(router, prefix=prefix, tags=tags)


_try_include("app.api.v1.endpoints.auth", "/auth", tags=["auth"])
_try_include("app.api.v1.endpoints.users", "/users", tags=["users"])
_try_include("app.api.v1.endpoints.organizations", "/organizations", tags=["organizations"])
_try_include("app.api.v1.endpoints.webinars", "/webinars", tags=["webinars"])
_try_include("app.api.v1.endpoints.landing_pages", "/landing-pages", tags=["landing-pages"])
_try_include("app.api.v1.endpoints.registrations", "/registrations", tags=["registrations"])
_try_include("app.api.v1.endpoints.payments", "/payments", tags=["payments"])
_try_include("app.api.v1.endpoints.analytics", "/analytics", tags=["analytics"])
_try_include("app.api.v1.endpoints.ai", "/ai", tags=["ai"])
