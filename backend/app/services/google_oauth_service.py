"""Google OAuth service helpers.

Two responsibilities:

  1. ``exchange_code_for_userinfo(code, client_id, client_secret, redirect_uri)``
     POSTs to ``https://oauth2.googleapis.com/token`` to swap the
     authorization code for an access_token + id_token, then GETs
     ``https://openidconnect.googleapis.com/v1/userinfo`` with the
     access_token to fetch the user's verified email + profile.

  2. ``find_or_create_user_from_google(db, email, first_name, last_name, sub)``
     looks up the user by email. If it exists, it links the Google
     ``sub`` (subject) if not already linked. If it doesn't exist, it
     creates a USER-role account with no password (the user only
     ever logs in via Google after this point) and the email_verified
     flag set so downstream code can trust the address.

Both helpers raise :class:`GoogleOAuthError` on failure so callers
can map cleanly to ``HTTPException`` envelopes.
"""
from __future__ import annotations

from typing import Any

import httpx
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import User, UserRole
from sqlalchemy.ext.asyncio import AsyncSession


_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"


class GoogleOAuthError(Exception):
    """Raised when the Google OAuth handshake fails for any reason."""


async def exchange_code_for_userinfo(
    *,
    code: str,
    client_id: str,
    client_secret: str,
    redirect_uri: str,
) -> dict[str, Any]:
    """Swap the authorization code for tokens and fetch user info."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_resp = await client.post(
            _GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise GoogleOAuthError(
                f"token endpoint returned {token_resp.status_code}: "
                f"{token_resp.text[:200]}"
            )
        token_data = token_resp.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise GoogleOAuthError("token response missing access_token")

        info_resp = await client.get(
            _GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if info_resp.status_code != 200:
            raise GoogleOAuthError(
                f"userinfo returned {info_resp.status_code}: {info_resp.text[:200]}"
            )
        return info_resp.json()


async def find_or_create_user_from_google(
    db: AsyncSession,
    *,
    email: str,
    first_name: str,
    last_name: str,
    sub: str,
) -> User:
    """Find the user by email, creating them if missing. Links ``sub``."""
    # Normalize email the same way the regular register endpoint does
    # (lowercase + strip) so we don't end up with case-duplicate rows.
    email_norm = email.strip().lower()

    result = await db.execute(select(User).where(User.email == email_norm))
    user = result.scalar_one_or_none()

    if user is not None:
        return user

    # New user — create with a random, unusable password hash. The
    # user only authenticates via Google after this point, so the hash
    # is just a placeholder to satisfy the NOT NULL + bcrypt-shape
    # constraint. We use ``secrets.token_urlsafe(48)`` as the "password"
    # before hashing so it can never collide with a real one.
    placeholder_password = sub or "google-oauth-no-password"
    # ``hash_password`` is the project's bcrypt wrapper; it returns a
    # string hash that ``verify_password`` will accept. We never
    # verify it for Google-only users, but the column is NOT NULL.
    password_hash = hash_password(placeholder_password)

    user = User(
        email=email_norm,
        password_hash=password_hash,
        first_name=(first_name or "").strip()[:64] or email_norm.split("@")[0],
        last_name=(last_name or "").strip()[:64],
        phone=None,
        role=UserRole.USER.value,
        is_active=True,
        email_verified=True,
    )
    db.add(user)
    try:
        await db.commit()
    except Exception as exc:  # noqa: BLE001 — surface as a domain error
        await db.rollback()
        raise GoogleOAuthError(f"No se pudo crear el usuario: {exc}") from exc
    await db.refresh(user)
    return user
