/*
 * p0b.1b — auth API surface. Thin wrappers over `apiClient` that
 * narrow the response to the typed `TokenOut` / `AuthMeOut` / etc.
 * Each function returns the typed payload on success and throws an
 * `ErrorEnvelope` on failure (the response interceptor in
 * `lib/api/client.ts` normalizes Axios errors into the envelope).
 *
 * Per mem #68, code stays in English; error `message` strings are
 * always Spanish because they come from the backend.
 */
import { apiClient } from '../../lib/api/client';
import type {
  AuthMeOut,
  MessageOut,
  TokenOut,
  UpgradeIn,
  UpgradeOut,
  CancelOut,
  SubscriptionOut,
} from './types';

interface LoginPayload {
  readonly email: string;
  readonly password: string;
}

export async function loginApi(payload: LoginPayload): Promise<TokenOut> {
  const { data } = await apiClient.post<TokenOut>('/auth/login', payload);
  return data;
}

interface RegisterPayload {
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
}

/**
 * p0b.1b — registerApi takes the new split fields. `repeat_password`
 * is intentionally NOT in this payload: it's a client-side-only
 * validation field that the backend doesn't accept.
 */
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

/*
 * p0b.1b — subscription endpoints live alongside the auth API because
 * the auth/me response already returns `current_subscription`. We keep
 * them in `auth/api.ts` so callers only need one import; the dedicated
 * `subscription/api.ts` module re-exports them for component-side use.
 */
export async function getMySubscriptionApi(): Promise<SubscriptionOut | null> {
  try {
    const { data } = await apiClient.get<SubscriptionOut>('/subscriptions/me');
    return data;
  } catch (err) {
    const envelope = err as { code?: string };
    if (envelope && envelope.code === 'SUBSCRIPTION_NOT_FOUND') {
      return null;
    }
    throw err;
  }
}

export async function upgradeSubscriptionApi(payload: UpgradeIn): Promise<UpgradeOut> {
  const { data } = await apiClient.post<UpgradeOut>('/subscriptions/upgrade', payload);
  return data;
}

export async function cancelSubscriptionApi(): Promise<CancelOut> {
  const { data } = await apiClient.post<CancelOut>('/subscriptions/cancel', {});
  return data;
}
