"""Analytics endpoints — public page view tracking.

p0c: ``POST /api/v1/analytics/pageview`` — público (sin auth). El SPA lo
llama automáticamente en cada cambio de ruta vía
``usePageviewTracker``. Auth opcional: si hay Bearer token, setea
``user_id``; si no, usa/genera un ``anonymous_id`` (cookie
``jcs.analytics.anon_id``). Devuelve 204 No Content.

Los endpoints de administración (``/admin/analytics/*``) viven en
``app.api.v1.admin`` para mantenerlos agrupados con el resto del admin.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Cookie, Header, Query, Request, Response, status

from app.api.deps import DbSession
from app.core.security.jwt import (
    TokenExpiredError,
    TokenInvalidError,
    decode_access_token,
)
from app.models import User
from app.observability.logging import get_logger
from app.schemas.page_view import PageViewIn
from app.services.analytics_service import record_pageview
from app.services.user_service import get_user_by_id

router = APIRouter(prefix="/analytics", tags=["analytics"])

log = get_logger(__name__)

ANON_COOKIE = "jcs.analytics.anon_id"
ANON_COOKIE_MAX_AGE = 365 * 24 * 60 * 60  # 1 año


@router.api_route(
    "/pageview",
    methods=["POST"],
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    response_model=None,
)
async def record_pageview_route(
    payload: PageViewIn,
    db: DbSession,
    request: Request,
    response: Response,
    authorization: Annotated[
        str | None,
        Header(alias="Authorization", description=None),
    ] = None,
    anon_id_cookie: Annotated[
        str | None,
        Cookie(alias=ANON_COOKIE, description=None),
    ] = None,
) -> None:
    """Registra una visita. Auth opcional. Devuelve 204 + cookie.

    Si la request trae ``Authorization: Bearer <token>`` y el token es
    válido, la visita se atribuye al usuario autenticado. Si no, se
    atribuye al ``anonymous_id`` (de la cookie o generado al vuelo).
    """
    # 1. Resolver el usuario si hay Bearer.
    user: User | None = None
    if authorization is not None and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ").strip()
        try:
            claims = decode_access_token(token)
        except (TokenExpiredError, TokenInvalidError):
            claims = None
        if claims is not None:
            try:
                user_id = uuid.UUID(claims["sub"])
            except (KeyError, ValueError):
                user_id = None
            if user_id is not None:
                user = await get_user_by_id(db, user_id)

    # 2. Resolver el anonymous_id (cookie o generado).
    anon_id: str | None = anon_id_cookie
    new_cookie_needed = anon_id is None or anon_id == ""
    if new_cookie_needed:
        anon_id = str(uuid.uuid4())

    user_id_value: uuid.UUID | None = user.id if user is not None else None
    if user is not None:
        # Visitante autenticado — el anon_id NO se persiste para esta fila
        # (mantiene user_id como fuente de verdad).
        anon_id = None

    # 3. Insertar la fila.
    user_agent = request.headers.get("user-agent")
    await record_pageview(
        db,
        user_id=user_id_value,
        anonymous_id=anon_id,
        page_path=payload.page_path,
        page_title=payload.page_title,
        referrer=payload.referrer,
        user_agent=user_agent,
        session_id=payload.session_id,
    )
    await db.commit()

    # 4. Cookie solo si la creamos ahora. La mutamos sobre la
    # ``Response`` inyectada por FastAPI — al devolver ``None`` y tener
    # ``status_code=204`` en el decorator, FastAPI conserva los headers
    # (incluido el set_cookie) en la respuesta final.
    if new_cookie_needed:
        response.set_cookie(
            key=ANON_COOKIE,
            value=anon_id if anon_id is not None else "",
            max_age=ANON_COOKIE_MAX_AGE,
            httponly=False,  # el JS necesita leerla para tracking.
            samesite="lax",
            path="/",
        )


__all__ = ["router"]