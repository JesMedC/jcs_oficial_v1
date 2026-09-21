"""Refresh token cookies — httpOnly + Secure + SameSite=Lax."""
from __future__ import annotations

from fastapi import Request
from fastapi.responses import Response

_REFRESH_COOKIE_NAME = "jcs_refresh_token"


def set_refresh_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=True,  # en dev Strict-Transport-Security no aplica; el navegador permite
        samesite="lax",
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=_REFRESH_COOKIE_NAME, path="/")


def get_refresh_cookie(request: Request) -> str | None:
    return request.cookies.get(_REFRESH_COOKIE_NAME)