/*
 * Portal — balance update E2E.
 *
 * What this locks down:
 *   1. A registered user, account, and 100 USD fund round-trip work via
 *      the public FastAPI surface.
 *   2. /portal/cuentas renders the funded balance ($100.00) right after
 *      the SPA hydrates with the JWT in sessionStorage.
 *   3. Opening a BINARY trade for 10 USD through /portal/operaciones
 *      deducts the investment from the account balance and the new
 *      figure ($90.00) appears on /portal/cuentas WITHOUT a hard refresh.
 *      This is the regression scenario the user reported ("balance sigue
 *      en 100") — if TanStack Query stops invalidating ['accounts'] after
 *      useCreateTrade succeeds, this assertion fails.
 *
 * Why sessionStorage and not localStorage?
 *   The SPA persists tokens in sessionStorage (see
 *   src/lib/api/client.ts: ACCESS_TOKEN_KEY = 'jcs.auth.access_token',
 *   set via `sessionStorage.setItem(...)`). Seeding localStorage does
 *   nothing — the AuthProvider never looks there. The fixtures.ts
 *   helper documents the same contract.
 *
 * Why request.newContext instead of going through the SPA for setup?
 *   The setup phase is pure CRUD against the public REST surface; using
 *   Playwright's request fixture keeps the test hermetic and avoids
 *   racing with the SPA's bootstrap (cold /auth/refresh + /auth/me
 *   can take 10–20 s in dev). Only the visual assertions need the
 *   browser.
 *
 * What this does NOT cover (and why it's deliberate):
 *   - Soft-block journal guard rail: we already have a vitest unit test
 *     (NewTradeForm.test.tsx) for that branch. E2E doesn't need to
 *     click "Guardar igual" to prove balance deduction works — we go
 *     straight through the form's happy path.
 */
import { test, expect, request } from '@playwright/test';

const BACKEND = 'https://localhost';
const PORTAL = 'http://localhost:5173';

test('balance se descuenta automáticamente al abrir un trade (E2E)', async ({
  page,
}) => {
  // 1. Crear test user via API (ignoreHTTPSErrors: backend fronted by
  // nginx with a self-signed cert in dev — same contract as fixtures.ts).
  const ctx = await request.newContext({
    baseURL: BACKEND,
    ignoreHTTPSErrors: true,
  });

  const ts = Date.now();
  const email = `e2e_balance_${ts}@example.com`;
  const password = 'TestPass123';

  const reg = await ctx.post('/api/v1/auth/register', {
    data: {
      email,
      password,
      first_name: 'Balance',
      last_name: 'E2E',
      phone: '+56954524216',
    },
  });
  expect(reg.ok(), `register failed: ${reg.status()} ${await reg.text()}`).toBe(
    true,
  );
  const { access_token, refresh_token } = (await reg.json()) as {
    access_token: string;
    refresh_token: string;
  };

  // 2. Crear cuenta BINARY + fund 100 USD.
  const acc = await ctx.post('/api/v1/accounts', {
    headers: { Authorization: `Bearer ${access_token}` },
    data: { broker_name: 'Pocket', type: 'BINARY', name: 'E2E Balance' },
  });
  expect(acc.ok(), `create account failed: ${acc.status()}`).toBe(true);
  const account = (await acc.json()) as { id: string };

  const fund = await ctx.post(`/api/v1/accounts/${account.id}/fund`, {
    headers: { Authorization: `Bearer ${access_token}` },
    data: { amount: '100.00' },
  });
  expect(fund.ok(), `fund failed: ${fund.status()} ${await fund.text()}`).toBe(
    true,
  );

  await ctx.dispose();

  // 3. Setear tokens en sessionStorage ANTES del primer paint para que
  // el AuthProvider arranque autenticado (no rebote vía /login).
  //
  // Solo sembramos si sessionStorage está vacío: el backend rota el
  // refresh token en cada POST /auth/refresh, así que después de la
  // primera navegación sessionStorage ya tiene la versión rotada. Si
  // sobreescribimos en cada navegación con los tokens originales
  // (revocados), el AuthProvider recibe 401 → tokenStore.clear() →
  // rebote a /login.
  await page.addInitScript(
    ({ a, r }) => {
      try {
        if (sessionStorage.getItem('jcs.auth.access_token') === null) {
          sessionStorage.setItem('jcs.auth.access_token', a);
        }
        if (sessionStorage.getItem('jcs.auth.refresh_token') === null) {
          sessionStorage.setItem('jcs.auth.refresh_token', r);
        }
      } catch {
        /* sessionStorage no disponible — fallará después en la SPA. */
      }
    },
    { a: access_token, r: refresh_token },
  );

  // 4. Verificar balance inicial 100 en /portal/cuentas.
  await page.goto(`${PORTAL}/portal/cuentas`);
  // Esperar a que la página monte. AuthProvider hace /auth/refresh
  // (cold ~9 s en dev) + /auth/me antes de hidratar el shell, así
  // que el listado puede tardar en llegar.
  await expect(
    page.getByRole('heading', { name: 'Mis cuentas', level: 1 }),
  ).toBeVisible({ timeout: 60_000 });

  await expect(
    page.getByText('$100.00', { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });

  // 5. Ir a /portal/operaciones y abrir un trade de 10 USD.
  await page.goto(`${PORTAL}/portal/operaciones`);
  await expect(page.getByTestId('operaciones-page')).toBeVisible({
    timeout: 60_000,
  });

  // Cerrar banner de cookies si aparece (cubre la zona de acciones).
  const acceptCookies = page.getByRole('button', { name: 'Aceptar todas' });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }

  await page.getByTestId('operaciones-new-trade').click();
  await expect(page.getByTestId('glass-drawer-panel').last()).toBeVisible();

  // El NewTradeDrawer está montado DOS veces en el árbol (TopNav a nivel
  // layout + OperacionesPage a nivel página) y ambos se abren al flip
  // de useNewTradeDrawer.isOpen. Como comparten el mismo z-index y el
  // último en el DOM gana el paint, el drawer visible es el .last()
  // (OperacionesPage's). Apuntamos todo al .last() para evitar que el
  // backdrop del primero (TopNav) nos tape los clicks.
  const accountSelect = page.getByTestId('new-trade-account').last();
  const directionSelect = page.getByTestId('new-trade-direction').last();
  const investmentInput = page.getByTestId('new-trade-investment').last();
  const payoutInput = page.getByTestId('new-trade-payout').last();
  const submitBtn = page.getByTestId('new-trade-submit').last();

  await accountSelect.selectOption(account.id);
  // Pequeño settle para que el useEffect del form ajuste direction/type.
  await page.waitForTimeout(300);

  await directionSelect.selectOption('CALL');
  await investmentInput.fill('10.00');
  await payoutInput.fill('85.00');
  // expiration_seconds tiene default 60 (1 min) — no hace falta tocarla.

  // El DisciplineSoftBlock aparece cuando notas Y tags están vacíos.
  // Seleccionamos un tag emocional: el chip hace flip de
  // `emotionalTags` en ESTE form y el soft-block se oculta. El
  // comportamiento del soft-block está cubierto por tests unitarios —
  // acá solo queremos llegar al POST /trades. dispatchEvent esquiva
  // el actionability check (el backdrop del drawer hermano montado en
  // TopNav intercepta pointer events del chip del segundo drawer).
  await page
    .getByTestId('emotional-tag-DISCIPLINE')
    .last()
    .dispatchEvent('click');
  await page.waitForTimeout(300);

  await submitBtn.click();

  // Esperar a que el drawer se cierre = mutación terminó y
  // useCreateTrade invalidó ['accounts'].
  await expect(page.getByTestId('glass-drawer-panel').last()).toBeHidden({
    timeout: 30_000,
  });

  // 6. Volver a /portal/cuentas y verificar balance 90 SIN hard refresh.
  // La invalidación de TanStack Query debería hacer que el listado
  // refetchee y muestre el balance nuevo. Si esto falla, el bug del
  // usuario ("balance sigue en 100") está reproducible en CI.
  await page.goto(`${PORTAL}/portal/cuentas`);
  await expect(
    page.getByText('$90.00', { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
});