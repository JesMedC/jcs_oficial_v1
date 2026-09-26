"""Programmatic verification of the Google OAuth callback redirect target.

The fix (see commit) changes the post-success redirect from
``{frontend_base}{return_to}?token=...`` to
``{frontend_base}/login?token=...&return_to={return_to}`` so the SPA's
``LoginPage`` ``useEffect`` can capture the tokens before navigation.

This test mocks ``httpx`` so we don't need real Google credentials. It
exercises the router through the FastAPI test client and asserts on the
``Location`` header returned by the callback.
"""
from __future__ import annotations

import secrets
from typing import Any
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def google_settings(monkeypatch):
    """Patch Settings so google_oauth_enabled is True for the test."""
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_ID", "test.apps.googleusercontent.com")
    monkeypatch.setenv("GOOGLE_OAUTH_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("GOOGLE_OAUTH_REDIRECT_URI", "https://jadecapitalsuite.com/api/v1/auth/google/callback")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _userinfo(email: str = "tester@example.com", sub: str | None = None) -> dict[str, Any]:
    return {
        "email": email,
        "email_verified": True,
        "sub": sub or secrets.token_urlsafe(16),
        "given_name": "Test",
        "family_name": "User",
    }


def test_callback_redirects_through_login_with_return_to(
    client: TestClient, google_settings
) -> None:
    """Happy path: after Google exchanges the code, the callback redirects
    to ``/login`` carrying the tokens + return_to. LoginPage then
    persists the tokens and forwards to the intended URL.
    """
    expected_sub = secrets.token_urlsafe(16)
    userinfo = _userinfo(sub=expected_sub)

    # Step 1: hit /login so we get a valid state cookie.
    login_resp = client.get(
        "/api/v1/auth/google/login?return_to=/portal/dashboard",
        follow_redirects=False,
    )
    assert login_resp.status_code == 302
    state_cookie = login_resp.cookies.get("jcs_oauth_state")
    return_cookie_raw = login_resp.cookies.get("jcs_oauth_return")
    assert state_cookie, "login endpoint must set jcs_oauth_state cookie"
    assert return_cookie_raw is not None, (
        "login endpoint must set jcs_oauth_return cookie"
    )

    # The cookie value MAY come back wrapped in literal double quotes
    # because Starlette's ``Response.set_cookie`` formats values via
    # ``http.cookies.SimpleCookie.output()`` which quotes anything
    # that is not strictly ``token``-shaped (per RFC 7230). The
    # leading ``/`` of the return_to path trips that. Browsers
    # des-quote on read; the test client used here does NOT, so
    # ``return_cookie_raw`` may carry the wrapping quotes. The
    # important behavior we test is that the BACKEND des-quotes on
    # read — see the ``return_to`` assertion at the bottom.
    assert return_cookie_raw is not None
    return_cookie = return_cookie_raw  # send the raw value back

    # Step 2: hit /callback with the state from the cookie + a fake code,
    # mocking the upstream exchange so we never actually call Google.
    # Send the RAW cookie value (with the wrapping quotes, if any) so
    # the callback exercises its own unquote-on-read path. The patch
    # target must be the symbol the callback module ACTUALLY calls —
    # ``google_oauth.py`` does
    # ``from app.services.google_oauth_service import exchange_code_for_userinfo``
    # so the binding is in ``app.api.v1.google_oauth``, not the
    # service module.
    with patch(
        "app.api.v1.google_oauth.exchange_code_for_userinfo",
        return_value=userinfo,
    ):
        callback_resp = client.get(
            "/api/v1/auth/google/callback",
            params={"code": "fake-code", "state": state_cookie},
            cookies={
                "jcs_oauth_state": state_cookie,
                "jcs_oauth_return": return_cookie_raw,
            },
            follow_redirects=False,
        )

    assert callback_resp.status_code == 302, callback_resp.text
    location = callback_resp.headers["location"]
    # MUST go through /login so LoginPage can capture tokens.
    assert location.startswith("https://jadecapitalsuite.com/login"), (
        f"callback must redirect to /login, got: {location}"
    )
    # MUST carry the tokens + return_to separately.
    assert "token=" in location, f"missing token in: {location}"
    assert "refresh=" in location, f"missing refresh in: {location}"
    assert "expires_in=" in location, f"missing expires_in in: {location}"
    assert "provider=google" in location, f"missing provider in: {location}"
    # The return_to must be a SEPARATE query param (not concatenated
    # into the path) so LoginPage can extract it with searchParams.get.
    assert "return_to=" in location, (
        f"return_to must travel as a separate query param, got: {location}"
    )
    assert "/portal/dashboard" not in location.split("?")[0], (
        f"return_to leaked into the path; LoginPage never gets the tokens. "
        f"Location was: {location}"
    )

    # And — critically — the return_to query param must NOT carry the
    # wrapping double quotes that the cookie had. The callback
    # ``unquote()``s the value before putting it into the URL, so
    # LoginPage sees a clean same-origin path.
    from urllib.parse import parse_qs, urlparse

    qs = parse_qs(urlparse(location).query)
    assert qs.get("return_to") == ["/portal/dashboard"], (
        f"return_to query param must be the clean path, got {qs.get('return_to')!r}. "
        f"Full location: {location}"
    )


def test_callback_redirects_to_login_when_google_denies(
    client: TestClient, google_settings
) -> None:
    """When Google bounces back with ?error=access_denied, the callback
    redirects to /login with ?oauth_error=denied so LoginPage shows the
    friendly banner.
    """
    callback_resp = client.get(
        "/api/v1/auth/google/callback",
        params={"error": "access_denied"},
        cookies={"jcs_oauth_return": "/portal/dashboard"},
        follow_redirects=False,
    )
    assert callback_resp.status_code == 302
    location = callback_resp.headers["location"]
    assert location.startswith("https://jadecapitalsuite.com/login")
    assert "oauth_error=denied" in location
