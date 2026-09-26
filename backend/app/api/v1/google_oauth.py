"""Google OAuth 2.0 login flow.

Two endpoints, both mounted under the existing ``/api/v1/auth`` prefix:

  GET /auth/google/login
    Generates a random ``state`` and stores it in a short-lived,
    http-only, SameSite=Lax cookie. Then redirects the browser to
    Google's OAuth 2.0 consent screen with the configured scopes
    (``openid email profile``), the configured redirect URI, and
    ``state`` for CSRF protection.

  GET /auth/google/callback?code=...&state=...
    Validates that ``state`` matches the cookie set by ``/login``,
    exchanges ``code`` for tokens at
    ``https://oauth2.googleapis.com/token``, fetches the user's
    email + name from
    ``https://openidconnect.googleapis.com/v1/userinfo`` (using the
    access token Google just issued), then either finds an existing
    user by ``email`` or creates a new one (role=USER, no password,
    email_verified=True) and issues the same JWT pair that the regular
    ``/auth/login`` endpoint returns. Finally it redirects the browser
    back to the frontend at ``{return_to}?token={access}&refresh={refresh}``
    so the SPA's AuthProvider can capture the tokens and persist them.

Configuration (env vars, optional — endpoints return 503 if unset):
  - GOOGLE_OAUTH_CLIENT_ID
  - GOOGLE_OAUTH_CLIENT_SECRET
  - GOOGLE_OAUTH_REDIRECT_URI  (e.g. https://jadecapitalsuite.com/api/v1/auth/google/callback)
"""
from __future__ import annotations

import json
import logging
import secrets
from http.cookies import SimpleCookie
from urllib.parse import quote, unquote, urlencode

import httpx
from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse

from app.api.deps import DbSession
from app.config import get_settings
from app.core.security.cookies import clear_refresh_cookie, set_refresh_cookie
from app.schemas.envelope import ErrorCode
from app.services.auth_service import issue_tokens_for_user
from app.services.google_oauth_service import (
    GoogleOAuthError,
    exchange_code_for_userinfo,
    find_or_create_user_from_google,
)


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/google", tags=["auth"])

# Short-lived cookie that holds the OAuth ``state`` for CSRF. 5 minutes
# is plenty: Google round-trip is usually <30s. The browser sends this
# cookie back on the callback automatically; the SPA never sees it.
_OAUTH_STATE_COOKIE = "jcs_oauth_state"
_OAUTH_RETURN_COOKIE = "jcs_oauth_return"
_OAUTH_STATE_MAX_AGE = 300  # seconds

# Allowed scopes: openid + email + profile. ``email`` is required so we
# can match / create the user. ``profile`` gives us the display name.
_GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_SCOPES = ("openid", "email", "profile")


def _raise_oauth_unavailable() -> None:
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "code": ErrorCode.INTERNAL_ERROR.value,
            "message": "Google login no esta configurado",
            "correlation_id": "0" * 36,
        },
    )


def _raise_oauth_error(code: ErrorCode, message: str) -> None:
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail={
            "code": code.value,
            "message": message,
            "correlation_id": "0" * 36,
        },
    )


@router.get("/login")
async def google_login(
    request: Request,
    return_to: str = "/portal/dashboard",
) -> RedirectResponse:
    """Redirect to Google OAuth consent screen."""
    settings = get_settings()
    if not settings.google_oauth_enabled:
        _raise_oauth_unavailable()

    # Only allow same-origin return_to paths to avoid open-redirect bugs.
    if not return_to.startswith("/") or return_to.startswith("//"):
        return_to = "/portal/dashboard"

    state = secrets.token_urlsafe(32)
    params = {
        "response_type": "code",
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "scope": " ".join(_SCOPES),
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    response = RedirectResponse(
        url=f"{_GOOGLE_AUTHORIZE_URL}?{urlencode(params)}",
        status_code=status.HTTP_302_FOUND,
    )
    response.set_cookie(
        key=_OAUTH_STATE_COOKIE,
        value=state,
        max_age=_OAUTH_STATE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key=_OAUTH_RETURN_COOKIE,
        value=return_to,
        max_age=_OAUTH_STATE_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    return response


@router.get("/callback")
async def google_callback(
    request: Request,
    db: DbSession,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    oauth_state: str | None = Cookie(default=None, alias=_OAUTH_STATE_COOKIE),
    oauth_return: str | None = Cookie(default=None, alias=_OAUTH_RETURN_COOKIE),
) -> RedirectResponse:
    """Receive Google's redirect, exchange code, issue JWT, bounce to SPA."""
    settings = get_settings()
    if not settings.google_oauth_enabled:
        _raise_oauth_unavailable()

    # Google sends ``error`` when the user denies the consent or the
    # request is malformed. We just bounce back to /login with a flag
    # the SPA can pick up via querystring.
    if error is not None:
        logger.info("google_oauth_denied", extra={"error": error})
        return _redirect_to_login(
            settings.google_oauth_redirect_uri,
            reason="denied",
            return_to=oauth_return or "/portal/dashboard",
        )

    if not code or not state:
        _raise_oauth_error(
            ErrorCode.INTERNAL_ERROR,
            "Faltan parametros code o state en el callback de Google",
        )

    if oauth_state is None or not secrets.compare_digest(state, oauth_state):
        _raise_oauth_error(
            ErrorCode.INTERNAL_ERROR,
            "OAuth state invalido (posible CSRF)",
        )

    # Starlette's ``Response.set_cookie`` formats values via
    # ``http.cookies.SimpleCookie.output()`` which wraps anything that
    # is not strictly ``token``-shaped (per RFC 7230) in
    # ``DQUOTE ... DQUOTE``. The leading ``/`` of our return-to path
    # trips that, so the cookie that comes back on the callback is
    # literally ``"/portal/dashboard"`` — not what the SPA can
    # ``window.location.assign``. Parse with ``SimpleCookie`` to strip
    # the wrapping quotes the same way a conformant cookie jar would.
    if oauth_return is not None:
        parsed = SimpleCookie()
        parsed.load(f"jcs_oauth_return={oauth_return}")
        oauth_return = parsed["jcs_oauth_return"].value

    # Exchange the code for an access_token + id_token. Reuses the
    # shared httpx client via service module so connection pooling kicks
    # in across repeated calls.
    try:
        userinfo = await exchange_code_for_userinfo(
            code=code,
            client_id=settings.google_oauth_client_id,
            client_secret=settings.google_oauth_client_secret,
            redirect_uri=settings.google_oauth_redirect_uri,
        )
    except GoogleOAuthError as exc:
        logger.warning("google_oauth_exchange_failed", extra={"err": str(exc)})
        _raise_oauth_error(ErrorCode.INTERNAL_ERROR, f"Google rechazo el code: {exc}")

    email = userinfo.get("email")
    if not email or not userinfo.get("email_verified", False):
        _raise_oauth_error(
            ErrorCode.AUTH_INVALID_CREDENTIALS,
            "Google no devolvio un email verificado",
        )

    # Find or create the user.
    try:
        user = await find_or_create_user_from_google(
            db,
            email=email,
            first_name=userinfo.get("given_name") or "",
            last_name=userinfo.get("family_name") or "",
            sub=userinfo.get("sub") or "",
        )
    except GoogleOAuthError as exc:
        logger.warning("google_oauth_user_lookup_failed", extra={"err": str(exc)})
        _raise_oauth_error(ErrorCode.INTERNAL_ERROR, str(exc))

    # Same JWT pair as the password login.
    access, refresh, expires_in = await issue_tokens_for_user(db, user)

    return_to = oauth_return or "/portal/dashboard"
    frontend_base = _frontend_base_from_redirect(settings.google_oauth_redirect_uri)
    # Always bounce through ``/login`` so the SPA's ``LoginPage``
    # ``useEffect`` can capture the tokens from the querystring and
    # persist them in ``sessionStorage`` before the SPA navigates to
    # the intended URL. Sending the tokens straight to ``return_to``
    # (e.g. ``/portal/dashboard``) lands on ``DashboardPage`` /
    # ``ProtectedRoute``, which don't read the querystring — the
    # tokens evaporate, ``ProtectedRoute`` sees an anonymous user,
    # and bounces back to ``/login`` with no banner and no error.
    # The ``return_to`` value travels along as a separate query
    # parameter so ``LoginPage`` can forward to it after persisting.
    target = (
        f"{frontend_base}/login"
        f"?token={access}"
        f"&refresh={refresh}"
        f"&expires_in={expires_in}"
        f"&return_to={quote(return_to, safe='')}"
        f"&provider=google"
    )
    response = RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
    # Clear the short-lived oauth cookies once consumed.
    response.delete_cookie(_OAUTH_STATE_COOKIE, path="/")
    response.delete_cookie(_OAUTH_RETURN_COOKIE, path="/")
    # Keep the same refresh cookie behaviour as the regular /login.
    set_refresh_cookie(response, refresh, max_age=14 * 24 * 60 * 60)
    return response


def _frontend_base_from_redirect(redirect_uri: str) -> str:
    """Derive the SPA origin from the OAuth redirect URI.

    Example: https://jadecapitalsuite.com/api/v1/auth/google/callback
    →        https://jadecapitalsuite.com
    """
    from urllib.parse import urlparse

    parsed = urlparse(redirect_uri)
    return f"{parsed.scheme}://{parsed.netloc}"


def _redirect_to_login(redirect_uri: str, *, reason: str, return_to: str) -> RedirectResponse:
    base = _frontend_base_from_redirect(redirect_uri)
    target = f"{base}/login?oauth_error={reason}&return_to={return_to}"
    response = RedirectResponse(url=target, status_code=status.HTTP_302_FOUND)
    response.delete_cookie(_OAUTH_STATE_COOKIE, path="/")
    response.delete_cookie(_OAUTH_RETURN_COOKIE, path="/")
    return response
