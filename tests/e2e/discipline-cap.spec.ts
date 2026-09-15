/*
 * sessions-configurable-cap (Slice C, T-021) — full-stack smoke.
 *
 * Asserts the round-trip Slice A + B shipped:
 *   1. PATCH /workspaces/{id}/discipline persists the cap (200).
 *   2. PATCH above the plan ceiling rejects with
 *      ``DISCIPLINE_CAP_OUT_OF_RANGE`` (422).
 *   3. Lowering the cap below the same-band trade count blocks the
 *      N+1th attempt with ``SESSION_CAP_EXCEEDED`` (422).
 *   4. The Disciplina tab on /portal/configuracion reads the saved
 *      cap on reload (REQ-DSC-007).
 *
 * Infrastructure: backend on https://localhost (nginx-fronted dev
 * cert, ignoreHTTPS), frontend on http://localhost:5173 (vite dev).
 * Run: `docker compose up -d postgres backend`, `pnpm dev` (or rely
 * on Playwright's webServer), then `npx playwright test
 * tests/e2e/discipline-cap.spec.ts`.
 *
 * The fresh user gets the default NONE workspace (ceiling 4), so
 * cap=3 stays inside the ceiling and the 422 path below exercises
 * both rules without a PRO upgrade.
 */
import { test, expect, request } from '@playwright/test';

const BACKEND = 'https://localhost';
const PORTAL = 'http://localhost:5173';

interface Ctx {
  token: string;
  workspaceId: string;
  accountId: string;
  api: Awaited<ReturnType<typeof request.newContext>>;
}

async function bootstrap(): Promise<Ctx> {
  const api = await request.newContext({ baseURL: BACKEND, ignoreHTTPSErrors: true });
  const reg = await api.post('/api/v1/auth/register', {
    data: {
      email: `e2e_disc_${Date.now()}@example.com`,
      password: 'TestPass123',
      first_name: 'Disc',
      last_name: 'E2E',
      phone: '+56954524216',
    },
  });
  expect(reg.ok()).toBe(true);
  const { access_token } = (await reg.json()) as { access_token: string };
  const bearer = { Authorization: `Bearer ${access_token}` };

  const me = await api.get('/api/v1/auth/me', { headers: bearer });
  const workspaceId = ((await me.json()) as { workspaces: Array<{ id: string }> })
    .workspaces[0].id;

  const acc = await api.post('/api/v1/accounts', {
    headers: bearer,
    data: { broker_name: 'Pocket', type: 'BINARY', name: 'E2E Disc' },
  });
  const { id: accountId } = (await acc.json()) as { id: string };

  await api.post(`/api/v1/accounts/${accountId}/fund`, {
    headers: bearer,
    data: { amount: '100.00' },
  });

  return { token: access_token, workspaceId, accountId, api };
}

async function patchCap(
  ctx: Ctx,
  value: number | null,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const r = await ctx.api.patch(
    `/api/v1/workspaces/${ctx.workspaceId}/discipline`,
    { headers: { Authorization: `Bearer ${ctx.token}` }, data: { session_ops_cap: value } },
  );
  const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: r.status(), body };
}

async function openBinary(ctx: Ctx): Promise<number> {
  const r = await ctx.api.post('/api/v1/trades', {
    headers: { Authorization: `Bearer ${ctx.token}` },
    data: {
      account_id: ctx.accountId,
      instrument: 'EURUSD',
      type: 'BINARY',
      direction: 'CALL',
      payout_pct: '85.00',
      investment_usd: '1.00',
      expiration_seconds: 60,
      emotional_tags: ['DISCIPLINE'],
    },
  });
  await r.body().catch(() => undefined);
  return r.status();
}

test('discipline-cap: persist, ceiling-reject, same-band block, tab round-trip', async ({
  page,
}) => {
  const ctx = await bootstrap();

  // 1) Lower the cap to 3 (allowed: NONE ceiling = 4).
  const lower = await patchCap(ctx, 3);
  expect(lower.status).toBe(200);
  expect(lower.body.session_ops_cap).toBe(3);

  // 2) Above the ceiling → 422 DISCIPLINE_CAP_OUT_OF_RANGE.
  const over = await patchCap(ctx, 7);
  expect(over.status).toBe(422);
  expect(over.body.code).toBe('DISCIPLINE_CAP_OUT_OF_RANGE');
  expect(String(over.body.message ?? '')).toContain('4');

  // 3) Three BINARY trades in the same UTC band all succeed.
  for (let i = 0; i < 3; i++) {
    expect(await openBinary(ctx), `trade ${i + 1}/3`).toBe(201);
  }

  // 4) Fourth same-band trade → 422 SESSION_CAP_EXCEEDED.
  expect(await openBinary(ctx), 'fourth trade').toBe(422);
  const lastBody = (await ctx.api
    .post('/api/v1/trades', {
      headers: { Authorization: `Bearer ${ctx.token}` },
      data: {
        account_id: ctx.accountId,
        instrument: 'EURUSD',
        type: 'BINARY',
        direction: 'CALL',
        payout_pct: '85.00',
        investment_usd: '1.00',
        expiration_seconds: 60,
        emotional_tags: ['DISCIPLINE'],
      },
    })
    .then((r) => r.json())
    .catch(() => ({}))) as Record<string, unknown>;
  expect(lastBody.code).toBe('SESSION_CAP_EXCEEDED');

  // 5) Disciplina tab on /portal/configuracion reads the saved cap after reload.
  await page.addInitScript(
    ({ a }) => {
      try {
        if (sessionStorage.getItem('jcs.auth.access_token') === null) {
          sessionStorage.setItem('jcs.auth.access_token', a);
        }
        if (sessionStorage.getItem('jcs.auth.refresh_token') === null) {
          sessionStorage.setItem('jcs.auth.refresh_token', a);
        }
      } catch {
        /* sessionStorage no disponible. */
      }
    },
    { a: ctx.token },
  );

  await page.goto(`${PORTAL}/portal/configuracion`);
  await expect(
    page.getByRole('heading', { name: 'Configuracion', level: 1 }),
  ).toBeVisible({ timeout: 60_000 });

  await page.getByRole('tab', { name: /disciplina/i }).click();
  await expect(page.getByTestId('tab-disciplina')).toBeVisible();
  await expect(page.getByTestId('disciplina-cap-input')).toHaveValue('3');

  await page.reload();
  await page.getByRole('tab', { name: /disciplina/i }).click();
  await expect(page.getByTestId('disciplina-cap-input')).toHaveValue('3', {
    timeout: 30_000,
  });

  await ctx.api.dispose();
});
