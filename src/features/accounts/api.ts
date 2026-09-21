/*
 * p0d.3 / p0e.3 — accounts feature API surface.
 *
 * Thin wrappers over `apiClient`. Each function narrows the response
 * and rejects with the canonical `ErrorEnvelope` on failure (the
 * interceptor in `lib/api/client.ts` always returns a backend-shaped
 * envelope to the catch block).
 *
 * p0e.3 adds the per-account write endpoints (``GET /{id}``,
 * ``POST /{id}/fund``, ``POST /{id}/withdraw``, ``DELETE /{id}``).
 * The frontend is the only caller of these wrappers — the list page
 * (``CuentasPage``) and the detail panel (``CuentasDetailPage``) both
 * rely on them.
 */
import { apiClient } from '../../lib/api/client';

import type { AccountList, CreateAccountPayload, AccountOut } from './types';

export async function listAccountsApi(
  params: { readonly skip?: number; readonly limit?: number } = {},
): Promise<AccountList> {
  const { data } = await apiClient.get<AccountList>('/accounts', { params });
  return data;
}

export async function createAccountApi(payload: CreateAccountPayload): Promise<AccountOut> {
  const { data } = await apiClient.post<AccountOut>('/accounts', payload);
  return data;
}

export async function getAccountById(id: string): Promise<AccountOut> {
  const { data } = await apiClient.get<AccountOut>(`/accounts/${id}`);
  return data;
}

export async function fundAccountApi(id: string, amount: number): Promise<AccountOut> {
  const { data } = await apiClient.post<AccountOut>(`/accounts/${id}/fund`, { amount });
  return data;
}

export async function withdrawAccountApi(id: string, amount: number): Promise<AccountOut> {
  const { data } = await apiClient.post<AccountOut>(`/accounts/${id}/withdraw`, { amount });
  return data;
}

export async function deleteAccountApi(id: string, confirmation: string): Promise<void> {
  await apiClient.delete(`/accounts/${id}`, { data: { confirmation } });
}
