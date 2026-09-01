/*
 * p0a.2 — auth API surface. Thin wrappers over `apiClient` that
 * narrow the response to the typed `TokenOut` / `AuthMeOut` / etc.
 * Each function returns the typed payload on success and throws an
 * `ErrorEnvelope` on failure (the response interceptor in
 * `lib/api/client.ts` normalizes Axios errors into the envelope).
 *
 * Per mem #68, code stays in English; error `message` strings are
 * always Spanish because they come from the backend.
 */
import { apiClient } from '../../lib/api/client';
import type { AuthMeOut, MessageOut, TokenOut } from './types';

interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

export async function loginApi(payload: LoginPayload): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>('/auth/login', payload);
  return data;
}

interface RegisterPayload {
  readonly email: string;
  readonly password: string;
  readonly name: string;
}

export async function registerApi(payload: RegisterPayload): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>('/auth/register', payload);
  return data;
}

export async function refreshApi(refreshToken: string): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>('/auth/refresh', { refresh_token: refreshToken });
  return data;
}

export async function logoutApi(refreshToken: string | null): Promise<MessageOut> {
  const { data } = await apiClient.post<MessageOut>('/auth/logout', {
    refresh_token: refreshToken ?? '',
  });
  return data;
}

export async function meApi(): Promise<AuthMeOut> {
  const { data } = await apiClient.get<AuthMeOut>('/auth/me');
  return data;
}
