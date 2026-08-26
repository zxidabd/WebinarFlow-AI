"""Google OAuth — consent URL + code-for-userinfo exchange.

We use Google's raw OAuth endpoints over httpx rather than the heavier
``google-auth-oauthlib`` Flow: the only flows needed are "build a consent
URL to redirect the browser to" and "exchange an authorization code for the
user's OpenID userinfo". The granted ``access_token`` is used only to fetch
userinfo and is then discarded — we never mint Google API tokens; the
backend issues its own JWT access token instead.
"""
from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.core.config import settings

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
SCOPES = ["openid", "email", "profile"]


class OAuthConfigError(RuntimeError):
    """Raised when Google OAuth credentials are not configured."""


class OAuthExchangeError(RuntimeError):
    """Raised when Google rejects the authorization code exchange."""


def get_google_auth_url(state: str) -> str:
    if not settings.GOOGLE_OAUTH_CLIENT_ID:
        raise OAuthConfigError("Google OAuth is not configured (GOOGLE_OAUTH_CLIENT_ID missing)")
    params = {
        "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "state": state,
        "include_granted_scopes": "true",
        "prompt": "consent",
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def exchange_google_code(code: str) -> dict:
    """Exchange an auth code for userinfo ({email, name, picture, ...})."""
    if not settings.GOOGLE_OAUTH_CLIENT_ID or not settings.GOOGLE_OAUTH_CLIENT_SECRET:
        raise OAuthConfigError("Google OAuth is not configured")
    async with httpx.AsyncClient(timeout=15.0) as client:
        tkn = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_OAUTH_CLIENT_ID,
                "client_secret": settings.GOOGLE_OAUTH_CLIENT_SECRET,
                "redirect_uri": settings.GOOGLE_OAUTH_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
        )
        if tkn.status_code != 200:
            raise OAuthExchangeError(f"token endpoint returned {tkn.status_code}: {tkn.text}")
        access_token = tkn.json().get("access_token")
        if not access_token:
            raise OAuthExchangeError("no access_token in Google response")

        ui = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if ui.status_code != 200:
            raise OAuthExchangeError(f"userinfo endpoint returned {ui.status_code}")
        return ui.json()


LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USERINFO_URL = "https://api.linkedin.com/v2/userinfo"
LINKEDIN_SCOPES = ["openid", "profile", "email"]


def get_linkedin_auth_url(state: str) -> str:
    if not settings.LINKEDIN_CLIENT_ID:
        raise OAuthConfigError("LinkedIn OAuth is not configured (LINKEDIN_CLIENT_ID missing)")
    params = {
        "client_id": settings.LINKEDIN_CLIENT_ID,
        "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
        "response_type": "code",
        "scope": " ".join(LINKEDIN_SCOPES),
        "state": state,
    }
    return f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"


async def exchange_linkedin_code(code: str) -> dict:
    """Exchange an auth code for LinkedIn userinfo ({email, name, picture, ...})."""
    if not settings.LINKEDIN_CLIENT_ID or not settings.LINKEDIN_CLIENT_SECRET:
        raise OAuthConfigError("LinkedIn OAuth is not configured")
    async with httpx.AsyncClient(timeout=15.0) as client:
        tkn = await client.post(
            LINKEDIN_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.LINKEDIN_CLIENT_ID,
                "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                "redirect_uri": settings.LINKEDIN_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if tkn.status_code != 200:
            raise OAuthExchangeError(f"LinkedIn token endpoint returned {tkn.status_code}: {tkn.text}")
        access_token = tkn.json().get("access_token")
        if not access_token:
            raise OAuthExchangeError("no access_token in LinkedIn response")

        ui = await client.get(
            LINKEDIN_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if ui.status_code != 200:
            raise OAuthExchangeError(f"LinkedIn userinfo endpoint returned {ui.status_code}: {ui.text}")
        return ui.json()
