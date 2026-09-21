"""Auth endpoints — register, login, refresh, logout.

Todas las mutaciones de credenciales pasan por ``app.services.auth_service``.
Las rutas sólo:
1. Validan el body con Pydantic (R1).
2. Leen correlation_id del ``request.state``.
3. Llaman al servicio.
4. Devuelven ``TokenOut`` / ``MessageOut``.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, Response, status

from app.api.deps import DbSession
from app.core.security.cookies import (
    clear_refresh_cookie,
    get_refresh_cookie,
    set_refresh_cookie,
)
from app.schemas.auth import (
    LoginIn,
    LogoutIn,
    MessageOut,
    RefreshIn,
    RegisterIn,
    TokenOut,
)
from app.schemas.envelope import ErrorCode
from app.services.auth_service import (
    AuthError,
    authenticate_user,
    issue_tokens_for_user,
    logout_user,
    register_user,
    rotate_refresh_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _correlation_id(request: Request) -> str | None:
    return getattr(request.state, "correlation_id", None)


def _raise_auth_error(exc: AuthError) -> None:
    raise HTTPException(
        status_code=_status_for_code(exc.code),
        detail={
            "code": exc.code.value,
            "message": exc.message,
            "correlation_id": "0" * 36,
        },
    )


def _status_for_code(code: ErrorCode) -> int:
    if code in (ErrorCode.AUTH_INVALID_CREDENTIALS,):
        return status.HTTP_401_UNAUTHORIZED
    if code == ErrorCode.AUTH_EMAIL_TAKEN:
        return status.HTTP_409_CONFLICT
    if code == ErrorCode.AUTH_WEAK_PASSWORD:
        return status.HTTP_422_UNPROCESSABLE_ENTITY
    if code in (
        ErrorCode.AUTH_TOKEN_EXPIRED,
        ErrorCode.AUTH_TOKEN_INVALID,
        ErrorCode.AUTH_TOKEN_REVOKED,
        ErrorCode.AUTH_TOKEN_MISSING,
        ErrorCode.AUTH_USER_INACTIVE,
    ):
        return status.HTTP_401_UNAUTHORIZED
    return status.HTTP_400_BAD_REQUEST


@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    payload: RegisterIn,
    db: DbSession,
    request: Request,
    response: Response,
) -> TokenOut:
    try:
        user = await register_user(
            db,
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name,
            last_name=payload.last_name,
            phone=payload.phone,
            correlation_id=_correlation_id(request),
        )
        access, refresh, expires_in = await issue_tokens_for_user(db, user)
    except AuthError as exc:
        _raise_auth_error(exc)

    set_refresh_cookie(
        response,
        refresh,
        max_age=14 * 24 * 60 * 60,
    )
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
    )


@router.post("/login", response_model=TokenOut)
async def login(
    payload: LoginIn,
    db: DbSession,
    request: Request,
    response: Response,
) -> TokenOut:
    try:
        user = await authenticate_user(
            db,
            email=payload.email,
            password=payload.password,
            correlation_id=_correlation_id(request),
        )
        access, refresh, expires_in = await issue_tokens_for_user(db, user)
    except AuthError as exc:
        _raise_auth_error(exc)

    set_refresh_cookie(
        response,
        refresh,
        max_age=14 * 24 * 60 * 60,
    )
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=expires_in,
    )


@router.post("/refresh", response_model=TokenOut)
async def refresh(
    db: DbSession,
    request: Request,
    response: Response,
    payload: RefreshIn | None = None,
) -> TokenOut:
    """Refresh vía body JSON. Acepta también la cookie ``jcs_refresh_token``."""
    raw = (
        payload.refresh_token
        if (payload and payload.refresh_token)
        else get_refresh_cookie(request)
    )
    if not raw:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": ErrorCode.AUTH_TOKEN_MISSING.value,
                "message": "Falta refresh token",
                "correlation_id": "0" * 36,
            },
        )
    try:
        _user, access, new_refresh, expires_in = await rotate_refresh_token(
            db,
            raw_refresh_token=raw,
            correlation_id=_correlation_id(request),
        )
    except AuthError as exc:
        _raise_auth_error(exc)

    set_refresh_cookie(
        response,
        new_refresh,
        max_age=14 * 24 * 60 * 60,
    )
    return TokenOut(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=expires_in,
    )


@router.post("/logout", response_model=MessageOut)
async def logout(
    db: DbSession,
    request: Request,
    response: Response,
    payload: LogoutIn | None = None,
) -> MessageOut:
    raw = (
        payload.refresh_token
        if (payload and payload.refresh_token)
        else get_refresh_cookie(request)
    )
    if raw:
        await logout_user(
            db,
            raw_refresh_token=raw,
            correlation_id=_correlation_id(request),
        )
    clear_refresh_cookie(response)
    return MessageOut(message="Sesion cerrada")
