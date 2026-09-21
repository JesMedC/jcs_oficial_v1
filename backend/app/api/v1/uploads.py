"""``POST /api/v1/uploads/presign`` — S3-style presign (PR-1).

Returns the upload ``url`` + ``fields`` + ``public_url`` for the
frontend to bind a trade's ``analysis_image_url`` /
``close_image_url`` after uploading.

When no S3 env is set, the response is deterministic mock data so
the frontend flow is exercisable in dev without infra.
"""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.api.deps import get_current_user
from app.services.upload_service import presign_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


class PresignIn(BaseModel):
    """Body for ``POST /api/v1/uploads/presign``.

    ``file_name`` is the client-side filename (used as the suffix
    for the generated object key). ``content_type`` defaults to
    ``image/png`` for the screenshot use-case but can be overridden
    for any other image content.
    """

    model_config = ConfigDict(extra="forbid")

    file_name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(
        default="image/png", min_length=1, max_length=64
    )
    key_prefix: str = Field(
        default="trades", min_length=1, max_length=64
    )


class PresignOut(BaseModel):
    """Response shape (mirrors ``upload_service.PresignResult``)."""

    url: str
    fields: dict[str, str]
    public_url: str


@router.post("/presign", response_model=PresignOut)
async def presign_endpoint(
    payload: PresignIn,
    _user: Annotated[object, Depends(get_current_user)],
) -> PresignOut:
    """Stub S3 presign — returns mock URL when no ``S3_BUCKET`` env.

    Real signing lands when the production bucket is provisioned.
    The endpoint contract is stable so the frontend doesn't need to
    change when we swap implementations.
    """
    result = presign_upload(
        file_name=payload.file_name,
        content_type=payload.content_type,
        key_prefix=payload.key_prefix,
    )
    return PresignOut(
        url=result.url,
        fields=result.fields,
        public_url=result.public_url,
    )


__all__ = ["router", "presign_endpoint", "PresignIn", "PresignOut"]
