/*
 * one-by-one-thousand-discipline (PR-2) — presigned upload helper.
 *
 * Thin wrapper over ``POST /api/v1/uploads/presign`` (PR-1 backend)
 * that returns the S3-style {url, fields, public_url} the form
 * needs to bind a trade's ``analysis_image_url`` / ``close_image_url``
 * after uploading.
 *
 * The two-step flow:
 *   1. presignUpload() → {url, fields, public_url}
 *   2. PUT the file body to ``url`` with the form ``fields``
 *   3. Store ``public_url`` on the trade via NewTradeForm /
 *      CloseTradeModal
 *
 * In dev (no S3 env), the backend returns a deterministic mock
 * public_url; the PUT step is then a no-op for the user but the
 * contract still round-trips so the UI flow is exercisable.
 */
import { apiClient } from '../../lib/api/client';

export interface PresignResult {
  readonly url: string;
  readonly fields: Readonly<Record<string, string>>;
  readonly public_url: string;
}

interface PresignBody {
  readonly file_name: string;
  readonly content_type: string;
  readonly key_prefix: string;
}

export async function presignUpload(body: PresignBody): Promise<PresignResult> {
  const { data } = await apiClient.post<{
    url: string;
    fields: Record<string, string>;
    public_url: string;
  }>('/uploads/presign', body);
  return {
    url: data.url,
    fields: data.fields,
    public_url: data.public_url,
  };
}

/**
 * Upload a ``File`` to the presigned URL. Uses a raw fetch (NOT
 * apiClient) because S3-style presign endpoints aren't under our
 * ``/api/v1`` base — they point at the bucket directly. Returns the
 * public URL the caller should bind to the trade field.
 */
export async function uploadFile(
  file: File,
  presign: PresignResult,
): Promise<string> {
  const form = new FormData();
  for (const [k, v] of Object.entries(presign.fields)) {
    form.append(k, v);
  }
  form.append('file', file);
  const res = await fetch(presign.url, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`upload failed: ${res.status}`);
  }
  return presign.public_url;
}