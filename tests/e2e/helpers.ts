import { request, type APIRequestContext } from '@playwright/test';

/**
 * E2E helpers — set up real backend state.
 *
 * We deliberately do NOT depend on the seed `demo@jadecapital.local` user.
 * Every test run creates a brand-new user via /api/v1/auth/register so
 * the suite is hermetic and parallel-safe (each worker has its own user).
 */

const BACKEND_BASE = 'https://localhost';

export type TestUser = {
  readonly email: string;
  readonly password: string;
  readonly accessToken: string;
  readonly refreshToken: string;
};

/**
 * Register a fresh user against the FastAPI backend and return the token
 * pair. Throws if registration fails — that's the desired behavior in CI
 * (we want the suite to fail loudly, not silently skip).
 */
export async function createTestUserAndLogin(): Promise<TestUser> {
  const ctx: APIRequestContext = await request.newContext({
    baseURL: BACKEND_BASE,
    // Backend is fronted by nginx with a self-signed cert in dev.
    ignoreHTTPSErrors: true,
  });
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2)}@example.com`;
  const password = 'TestPass123!';

  const reg = await ctx.post('/api/v1/auth/register', {
    data: {
      email,
      password,
      first_name: 'E2E',
      last_name: 'Test',
      phone: '+56954524216',
    },
  });

  if (!reg.ok()) {
    const body = await reg.text();
    await ctx.dispose();
    throw new Error(`Register failed: ${reg.status()} — ${body}`);
  }

  const json = (await reg.json()) as {
    access_token: string;
    refresh_token: string;
  };

  await ctx.dispose();
  return {
    email,
    password,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
  };
}
