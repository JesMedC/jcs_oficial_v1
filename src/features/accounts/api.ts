/*
 * p0d.3 — accounts feature API surface.
 *
 * Thin wrappers over `apiClient`. Each function narrows the response
 * and rejects with the canonical `ErrorEnvelope` on failure (the
 * interceptor in `lib/api/client.ts` always returns a backend-shaped
 * envelope to the catch block).
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