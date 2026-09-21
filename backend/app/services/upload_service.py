"""Presigned-upload helper (PR-1 of ``one-by-one-thousand-discipline``).

Materializes spec REQ-TI-ADD-002 / REQ-TI-ADD-004 of ``trade-ingestion``
— a stub S3-compatible presign flow for the
``analysis_image_url`` / ``close_image_url`` bindings on the trade
form. The endpoint (``POST /api/v1/uploads/presign``) is the
consumer; the frontend uploads the file directly to the returned
URL and binds the resulting ``public_url`` to the trade payload.

The S3 wiring (boto3 + env vars ``S3_BUCKET``, ``S3_REGION``,
``S3_ACCESS_KEY``, ``S3_SECRET_KEY``) is intentionally a stub in
PR-1: no infra to wire against in this iteration. When no S3 env
is set the helper returns a deterministic mock URL so the frontend
flow can be exercised end-to-end in dev. Once the production bucket
is provisioned, swap the stub for ``boto3.client("s3").generate_presigned_post``
behind the same function signature.
"""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PresignResult:
    """Output of ``presign_upload``.

    ``url`` is where the browser POSTs the file (S3 endpoint or the
    mock in dev). ``fields`` is the form fields S3 expects on the
    POST. ``public_url`` is the URL the trade record binds to once
    the upload completes.
    """

    url: str
    fields: dict[str, str]
    public_url: str


def _env_flag(name: str) -> bool:
    """Treat ``1`` / ``true`` (case-insensitive) as the enabled flag."""
    raw = os.environ.get(name)
    if not raw:
        return False
    return raw.strip().lower() in {"1", "true", "yes"}


def _bucket_from_env() -> str | None:
    bucket = os.environ.get("S3_BUCKET")
    if not bucket:
        return None
    return bucket.strip()


def presign_upload(
    *,
    file_name: str,
    content_type: str = "image/png",
    key_prefix: str = "trades",
) -> PresignResult:
    """Return a ``PresignResult`` (URL + fields + public URL).

    When ``S3_BUCKET`` is set in the environment the helper returns a
    boto3-style presigned POST (caller is expected to have wired
    the AWS creds separately). Otherwise it returns a deterministic
    mock URL under ``https://mock-cdn.local/<key>`` so the frontend
    upload flow can be exercised in dev without infra.
    """
    bucket = _bucket_from_env()
    object_key = f"{key_prefix}/{uuid.uuid4().hex}-{file_name}"
    if bucket:
        # Production path: boto3 presigned POST. Lazy import so the
        # boto3 dep stays out of the test path until it's actually
        # needed.
        import boto3  # type: ignore[import-not-found]

        client = boto3.client(
            "s3",
            region_name=os.environ.get("S3_REGION", "us-east-1"),
        )
        signed: dict[str, Any] = client.generate_presigned_post(
            Bucket=bucket,
            Key=object_key,
            Fields={"Content-Type": content_type},
            Conditions=[{"Content-Type": content_type}],
            ExpiresIn=900,
        )
        return PresignResult(
            url=signed["url"],
            fields=signed["fields"],
            public_url=f"https://{bucket}.s3.amazonaws.com/{object_key}",
        )
    # Mock path (dev): deterministic URL, no real upload.
    return PresignResult(
        url=f"https://mock-cdn.local/upload/{object_key}",
        fields={
            "key": object_key,
            "Content-Type": content_type,
        },
        public_url=f"https://mock-cdn.local/{object_key}",
    )


__all__ = ["presign_upload", "PresignResult"]
