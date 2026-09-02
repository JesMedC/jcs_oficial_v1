/*
 * p0a.2 — axios instance for the JadeCapitalSuite SPA.
 *
 * - baseURL: VITE_API_BASE_URL env, falling back to the local FastAPI
 *   dev server (port 8000, base path /api/v1 per backend/main.py).
 * - withCredentials: true so the backend can also set the refresh
 *   HttpOnly cookie. The SPA prefers JSON tokens (stored in
 *   sessionStorage) but the cookie path is the documented fallback
 *   for the rare case the SPA ever loses access to sessionStorage.
 * - Request interceptor: attaches the access token from sessionStorage
 *   as `Authorization: Bearer <token>`.
 * - Response interceptor: on 401, attempts ONE refresh via
 *   `/auth/refresh` using the stored refresh token. If refresh
 *   succeeds, the original request is retried with the new token.
 *   If refresh fails, tokens are cleared and the user is redirected
 *   to /login (preserving the intended URL via location state).
 *
 * The interceptor is a singleton — created once at module load and
 * shared by every API call. Tests that need to mock the client should
 * stub `client.post` / `client.get` directly.
 */
import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';

import { FALLBACK_ERROR_MESSAGE, type ErrorEnvelope } from '../../features/auth/types';

const ACCESS_TOKEN_KEY = 'jcs.auth.access_token';
const REFRESH_TOKEN_KEY = 'jcs.auth.refresh_token';
const INTENDED_URL_KEY = 'jcs.auth.intended_url';

// Relative base URL — works behind any reverse proxy (nginx in prod,
// Vite's dev proxy on :5173). Override with `VITE_API_BASE_URL` for
// exotic topologies (e.g. calling a remote staging API directly).
const DEFAULT_BASE_URL = '/api/v1';

const baseURL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? DEFAULT_BASE_URL;

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/*
 * Token storage helpers. Centralised so callers never touch
 * sessionStorage directly — keeps the storage contract greppable.
 */
export const tokenStore = {
  getAccess(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },
  set(access: string, refresh: string): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, access);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
  getIntendedUrl(): string | null {
    return sessionStorage.getItem(INTENDED_URL_KEY);
  },
  setIntendedUrl(url: string): void {
    sessionStorage.setItem(INTENDED_URL_KEY, url);
  },
  clearIntendedUrl(): void {
    sessionStorage.removeItem(INTENDED_URL_KEY);
  },
};

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStore.getAccess();
  if (token !== null && config.headers !== undefined) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

/**
 * True while a 401-retry is in flight. Multiple in-flight 401s share
 * a single refresh promise so we never race a token rotation.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.getRefresh();
  if (refresh === null) return null;

  try {
    const response = await axios.post<{
      access_token: string;
      refresh_token: string;
      token_type: 'bearer';
      expires_in: number;
    }>(
      `${baseURL}/auth/refresh`,
      { refresh_token: refresh },
      {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
        timeout: 15000,
      },
    );
    tokenStore.set(response.data.access_token, response.data.refresh_token);
    return response.data.access_token;
  } catch {
    tokenStore.clear();
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorEnvelope>) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const status = error.response?.status;
    const isAuthEndpoint =
      original?.url?.includes('/auth/login') === true ||
      original?.url?.includes('/auth/register') === true ||
      original?.url?.includes('/auth/refresh') === true;

    if (status === 401 && original !== undefined && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      refreshInFlight = refreshInFlight ?? refreshAccessToken();
      const newToken = await refreshInFlight;
      refreshInFlight = null;
      if (newToken !== null) {
        original.headers = {
          ...(original.headers ?? {}),
          Authorization: `Bearer ${newToken}`,
        };
        return apiClient.request(original);
      }
      // Refresh failed — drop tokens and bounce to /login. Preserve
      // the current URL as the intended destination so the user lands
      // back where they were after re-auth.
      tokenStore.clear();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        tokenStore.setIntendedUrl(window.location.pathname + window.location.search);
        window.location.assign('/login');
      }
    }

    // Normalize: ensure every error has a backend-shaped envelope so
    // callers can always read `.code`, `.message`, `.correlation_id`.
    const data = error.response?.data;
    if (data !== undefined && typeof data === 'object' && 'code' in data && 'message' in data) {
      return Promise.reject(data as ErrorEnvelope);
    }
    const correlationId =
      (error.response?.headers as Record<string, string> | undefined)?.['x-correlation-id'] ??
      'unavailable';
    return Promise.reject({
      code: 'INTERNAL_ERROR' as const,
      message: error.message || FALLBACK_ERROR_MESSAGE,
      correlation_id: correlationId,
    } satisfies ErrorEnvelope);
  },
);
