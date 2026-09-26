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

from datetime import datetime, timezone
from typing import Any

import httpx
from sqlalchemy import select

from app.core.security.password import hash_password
from app.models import User, UserRole
from app.services.workspace_service import ensure_default_workspace_for_user
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
    """Find the user by ``google_sub`` first, then email, creating if missing.

    Resolution order:

      1. ``google_sub`` — stable per-Google-account id. If we've seen
         this exact Google account before, return the same User row,
         even if their Google email has since changed.
      2. ``email`` — case-normalized. If the user signed up with
         email/password and is now linking Google for the first time,
         we attach the ``google_sub`` to the existing row (one-shot
         write so future lookups take path 1).
      3. Create a new ``USER``-role account with a placeholder
         password hash (Google-only users never authenticate against
         ``password_hash``, but the column is ``NOT NULL`` and
         ``bcrypt``-shaped).

    ``sub`` MUST be non-empty — the caller (``google_callback``) has
    already validated Google's ``email_verified`` claim before getting
    here, so an empty ``sub`` is a programmer error, not a runtime
    condition we should paper over.
    """
    if not sub:
        raise GoogleOAuthError("Google devolvio un sub vacio")

    # Normalize email the same way the regular register endpoint does
    # (lowercase + strip) so we don't end up with case-duplicate rows.
    email_norm = email.strip().lower() if email else ""

    # 1) Lookup by google_sub — the canonical fast path.
    by_sub = await db.execute(select(User).where(User.google_sub == sub))
    user = by_sub.scalar_one_or_none()
    if user is not None:
        workspace = await ensure_default_workspace_for_user(db, user)
        if workspace is not None:
            await db.commit()
            await db.refresh(user)
        return user

    # 2) Lookup by email — link the google_sub to the existing row
    #    if we find one (one-shot write so path 1 takes over next
    #    time).
    if email_norm:
        by_email = await db.execute(select(User).where(User.email == email_norm))
        user = by_email.scalar_one_or_none()
        if user is not None:
            user.google_sub = sub
            await ensure_default_workspace_for_user(db, user)
            await db.commit()
            await db.refresh(user)
            return user

    # 3) Create. Placeholder hash is required because ``password_hash``
    #    is NOT NULL and bcrypt-shaped (cost 12). The placeholder is
    #    a deterministic function of ``sub`` so a collision is
    #    impossible (each Google account gets its own placeholder)
    #    and verify_password is never called against this row.
    password_hash = hash_password(f"google-oauth-only:{sub}")

    user = User(
        email=email_norm,
        password_hash=password_hash,
        first_name=(first_name or "").strip()[:64] or (email_norm.split("@")[0] if email_norm else "user"),
        last_name=(last_name or "").strip()[:64],
        phone="",
        role=UserRole.USER.value,
        is_active=True,
        # Google already verified the email (caller checks
        # ``userinfo.email_verified``), so we stamp the timestamp
        # the same way ``POST /auth/register`` would after a future
        # email-confirmation round-trip.
        email_verified_at=datetime.now(timezone.utc),
        google_sub=sub,
    )
    db.add(user)
    await ensure_default_workspace_for_user(db, user)
    try:
        await db.commit()
    except Exception as exc:  # noqa: BLE001 — surface as a domain error
        await db.rollback()
        raise GoogleOAuthError(f"No se pudo crear el usuario: {exc}") from exc
    await db.refresh(user)
    return user
