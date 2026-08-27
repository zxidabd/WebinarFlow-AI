"""Auth endpoints.

Token model:
  * Access token -> returned in the JSON body (``accessToken``); the client
    stores it and sends it as ``Authorization: Bearer <token>``.
  * Refresh token -> set as an httpOnly cookie ``wf_refresh`` scoped to
    ``/api/v1/auth``. It is rotated on every refresh and revoked on logout.

Google flow:
  GET  /auth/google    -> { url, state } (+ sets a short-lived state cookie)
  The browser goes to Google, which 302s to the frontend redirect, which
  posts { code, state } to  POST /auth/google  to complete sign-in.
"""
from __future__ import annotations

import secrets

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.schemas import (
    AccessTokenResponse,
    AuthResponse,
    AuthUser,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    OrganizationRole,
    RegisterRequest,
    RegisterResponse,
    ResendVerificationRequest,
    ResetPasswordRequest,
)
from app.services import auth_service, oauth

router = APIRouter()

REFRESH_COOKIE = "wf_refresh"
STATE_COOKIE = "wf_google_state"
_COOKIE_PATH = "/api/v1/auth"


def _set_refresh_cookie(response: Response, raw_refresh: str) -> None:
    response.set_cookie(
        REFRESH_COOKIE,
        raw_refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path=_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE, path=_COOKIE_PATH)


def _clear_state_cookie(response: Response) -> None:
    response.delete_cookie(STATE_COOKIE, path=_COOKIE_PATH)


def _client_meta(request: Request) -> tuple[str | None, str | None]:
    return request.headers.get("user-agent"), (request.client.host if request.client else None)


def _auth_response(user, membership, access_token: str) -> AuthResponse:
    return AuthResponse(
        accessToken=access_token,
        user=AuthUser.model_validate(user),
        organization=OrganizationRole(
            id=membership.organization.id,
            name=membership.organization.name,
            slug=membership.organization.slug,
            is_personal=membership.organization.is_personal,
            role=membership.role.name,
        ),
    )


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)):
    ua, ip = _client_meta(request)
    try:
        user = await auth_service.register(
            db, email=payload.email, password=payload.password, full_name=payload.full_name, user_agent=ua, ip=ip
        )
    except auth_service.EmailTakenError:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    # PHASE 2: Return registration response with NO tokens (registration != login)
    return RegisterResponse(
        message="Account created. Please check your email to verify your account.",
        email=user.email,
        email_verified=user.email_verified,
    )


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    ua, ip = _client_meta(request)
    try:
        user, membership, access, raw_refresh = await auth_service.authenticate(
            db, email=payload.email, password=payload.password, user_agent=ua, ip=ip
        )
    except auth_service.UnverifiedEmailError as exc:
        # PHASE 3: 403 error for unverified emails, no tokens issued
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc.args[0] if exc.args else "Please verify your email before logging in."))
    except auth_service.CredentialsError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc.args[0] if exc.args else "Invalid credentials"))

    _set_refresh_cookie(response, raw_refresh)
    return _auth_response(user, membership, access)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(
    response: Response,
    request: Request,
    wf_refresh: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not wf_refresh:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No refresh token")
    ua, ip = _client_meta(request)
    try:
        user, membership, access, new_raw = await auth_service.refresh(
            db, raw_refresh=wf_refresh, user_agent=ua, ip=ip
        )
    except auth_service.UnverifiedEmailError as exc:
        _clear_refresh_cookie(response)
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc.args[0] if exc.args else "Please verify your email before logging in."))
    except auth_service.CredentialsError as exc:
        _clear_refresh_cookie(response)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, str(exc.args[0] if exc.args else "Invalid refresh token"))

    _set_refresh_cookie(response, new_raw)
    return AccessTokenResponse(accessToken=access)


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response, wf_refresh: str | None = Cookie(default=None), db: AsyncSession = Depends(get_db)):
    if wf_refresh:
        await auth_service.revoke_refresh_token(db, wf_refresh)
    _clear_refresh_cookie(response)
    return {"detail": "Logged out"}


@router.get("/verify-email", status_code=status.HTTP_200_OK)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.verify_email(db, token)
    except auth_service.TokenError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return {
        "detail": "Email verified successfully. Your WebinarFlow account is now ready.",
        "email": user.email,
    }


@router.post("/verify-email/resend", status_code=status.HTTP_200_OK)
@router.post("/resend-verification", status_code=status.HTTP_200_OK)
async def resend_verification(payload: ResendVerificationRequest, db: AsyncSession = Depends(get_db)):
    try:
        await auth_service.send_verification_email_if_needed(db, payload.email)
    except auth_service.RateLimitError as exc:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, str(exc))
    return {"detail": "If an unverified account exists for this email, a verification link has been sent."}


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(payload: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await auth_service.request_password_reset(db, payload.email)
    return {"detail": "If an account exists for this email, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(payload: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    try:
        user = await auth_service.reset_password(db, payload.token, payload.new_password)
    except auth_service.TokenError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc))
    return {"detail": "Password reset", "email": user.email}


@router.get("/google")
async def google_auth_url(response: Response):
    """Return the Google consent URL and stash a CSRF state token in a cookie."""
    try:
        state = secrets.token_urlsafe(24)
        url = oauth.get_google_auth_url(state=state)
    except oauth.OAuthConfigError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google OAuth is not configured on the server")
    response.set_cookie(
        STATE_COOKIE,
        state,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=600,  # 10 minutes to complete the OAuth round-trip
        path=_COOKIE_PATH,
    )
    return {"url": url, "state": state}


@router.post("/google", response_model=AuthResponse)
async def google_callback(
    payload: GoogleAuthRequest,
    request: Request,
    response: Response,
    wf_google_state: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not wf_google_state or (payload.state and payload.state != wf_google_state):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OAuth state mismatch — retry Google sign-in")
    _clear_state_cookie(response)

    ua, ip = _client_meta(request)
    try:
        user, membership, access, raw_refresh = await auth_service.google_signin(
            db, code=payload.code, user_agent=ua, ip=ip
        )
    except oauth.OAuthConfigError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Google OAuth is not configured on the server")
    except auth_service.UnverifiedEmailError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc.args[0] if exc.args else "Please verify your email before logging in."))
    except (oauth.OAuthExchangeError, auth_service.CredentialsError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Google sign-in failed: {exc}")

    _set_refresh_cookie(response, raw_refresh)
    return _auth_response(user, membership, access)


STATE_COOKIE_LINKEDIN = "wf_linkedin_state"


@router.get("/linkedin")
async def linkedin_auth_url(response: Response):
    """Return the LinkedIn consent URL and stash a CSRF state token in a cookie."""
    try:
        state = secrets.token_urlsafe(24)
        url = oauth.get_linkedin_auth_url(state=state)
    except oauth.OAuthConfigError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "LinkedIn OAuth is not configured on the server")
    response.set_cookie(
        STATE_COOKIE_LINKEDIN,
        state,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        max_age=600,
        path=_COOKIE_PATH,
    )
    return {"url": url, "state": state}


@router.post("/linkedin", response_model=AuthResponse)
async def linkedin_callback(
    payload: LinkedInAuthRequest,
    request: Request,
    response: Response,
    wf_linkedin_state: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
    if not wf_linkedin_state or (payload.state and payload.state != wf_linkedin_state):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "OAuth state mismatch — retry LinkedIn sign-in")
    response.delete_cookie(STATE_COOKIE_LINKEDIN, path=_COOKIE_PATH)

    ua, ip = _client_meta(request)
    try:
        user, membership, access, raw_refresh = await auth_service.linkedin_signin(
            db, code=payload.code, user_agent=ua, ip=ip
        )
    except oauth.OAuthConfigError:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "LinkedIn OAuth is not configured on the server")
    except auth_service.UnverifiedEmailError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc.args[0] if exc.args else "Please verify your email before logging in."))
    except (oauth.OAuthExchangeError, auth_service.CredentialsError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"LinkedIn sign-in failed: {exc}")

    _set_refresh_cookie(response, raw_refresh)
    return _auth_response(user, membership, access)
