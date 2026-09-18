#!/usr/bin/env node
/*
 * JARVIS route screenshot — drives the SPA through every portal
 * route (one screenshot per page) so we can do a visual diff
 * before/after applying the JARVIS chrome polish.
 *
 * Usage:
 *   node scripts/jarvis-routes-shot.mjs [outDir]
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.JARVIS_BASE_URL ?? 'http://localhost:5174';
const OUT_DIR = process.argv[2] ?? '/tmp/jarvis-routes';

const ROUTES = [
  ['dashboard', '/portal/dashboard'],
  ['cuentas', '/portal/cuentas'],
  ['cuentas-detail', '/portal/cuentas/a1'],
  ['operaciones', '/portal/operaciones'],
  ['diario', '/portal/diario'],
  ['scanner', '/portal/scanner'],
  ['playbook', '/portal/playbook'],
  ['disciplina', '/portal/disciplina'],
  ['configuracion', '/portal/configuracion'],
];

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

await context.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
  localStorage.setItem('jcs.theme.mode', 'dark');
});

// Mirror the route mocks from jarvis-dashboard-shot.mjs (kept inline
// so this script stays self-contained).
const MOCK_USER = {
  user_id: 'demo-1',
  email: 'demo@jadecapital.local',
  first_name: 'Jesus',
  last_name: 'Demo',
  phone: '+54 11 1234 5678',
  role: 'USER',
  workspaces: [{ id: 'ws-1', name: 'Principal', role: 'OWNER' }],
  current_subscription: { plan: 'PRO', status: 'ACTIVE', trial_ends_at: null, renews_at: '2026-12-31' },
  timezone: 'UTC',
};
const MOCK_ACCOUNTS = { items: [
  { id: 'a1', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Asia', type: 'FOREX', balance_usd: '4200.50', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a2', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Nueva York', type: 'FOREX', balance_usd: '2150.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a3', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Sidney', type: 'FOREX', balance_usd: '1850.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a4', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Londres', type: 'FOREX', balance_usd: '1810.78', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
], total: 4, skip: 0, limit: 100 };
const MOCK_TRADES = { items: [
  { id: 't-0', account_id: 'a1', pair: 'EUR/USD', side: 'Compra', lots: 0.5, pnl_usd: 53.33, instrument: 'EUR/USD', type: 'FOREX', opened_at: '2026-09-15T16:00:00Z', closed_at: '2026-09-15T16:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-1', account_id: 'a1', pair: 'GBP/JPY', side: 'Venta', lots: 0.5, pnl_usd: 9.78, instrument: 'GBP/JPY', type: 'FOREX', opened_at: '2026-09-15T13:00:00Z', closed_at: '2026-09-15T13:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-2', account_id: 'a1', pair: 'AUD/JPY', side: 'Compra', lots: 0.5, pnl_usd: 42.93, instrument: 'AUD/JPY', type: 'FOREX', opened_at: '2026-09-15T10:00:00Z', closed_at: '2026-09-15T10:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-3', account_id: 'a1', pair: 'USD/JPY', side: 'Venta', lots: 0.5, pnl_usd: -28.41, instrument: 'USD/JPY', type: 'FOREX', opened_at: '2026-09-15T07:00:00Z', closed_at: '2026-09-15T07:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-4', account_id: 'a1', pair: 'EUR/JPY', side: 'Compra', lots: 0.5, pnl_usd: 15.42, instrument: 'EUR/JPY', type: 'FOREX', opened_at: '2026-09-15T04:00:00Z', closed_at: '2026-09-15T04:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-5', account_id: 'a1', pair: 'GBP/JPY', side: 'Compra', lots: 0.5, pnl_usd: -12.50, instrument: 'GBP/JPY', type: 'FOREX', opened_at: '2026-09-15T01:00:00Z', closed_at: '2026-09-15T01:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-6', account_id: 'a1', pair: 'AUD/JPY', side: 'Venta', lots: 0.5, pnl_usd: 88.34, instrument: 'AUD/JPY', type: 'FOREX', opened_at: '2026-09-15T00:00:00Z', closed_at: '2026-09-15T00:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
  { id: 't-7', account_id: 'a1', pair: 'USD/JPY', side: 'Compra', lots: 0.5, pnl_usd: 5.34, instrument: 'USD/JPY', type: 'FOREX', opened_at: '2026-09-14T22:00:00Z', closed_at: '2026-09-14T22:00:00Z', duration_minutes: 30, status: 'CLOSED', investment_usd: '500.00' },
], total: 8, skip: 0, limit: 100 };

await context.route('**/api/v1/auth/me', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
});
await context.route('**/api/v1/auth/refresh', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ access_token: 'mock', refresh_token: 'mock', token_type: 'bearer', expires_in: 3600 }) });
});
await context.route('**/api/v1/accounts**', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ACCOUNTS) });
});
await context.route('**/api/v1/trades**', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRADES) });
});
await context.route('**/api/v1/trades/session-stats**', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace_id: 'ws-1', date_from: '2026-08-15', date_to: '2026-09-15', account_id: null, sessions: { ASIA: { trades: 8, wins: 6, winrate_pct: 75 }, LONDON: { trades: 0, wins: 0, winrate_pct: 0 }, NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 }, SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 } }, general: { trades: 14, wins: 10, winrate_pct: 71 } }) });
});
await context.route('**/api/v1/analytics/**', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});
await context.route('**/api/v1/scanner/ws', async (r) => r.abort());
await context.route('**/api/v1/scanner/alerts', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
});
await context.route('**/api/v1/calendar/pnl**', async (r) => {
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ workspace_id: 'ws-1', month: '2026-09', month_start_balance: '4200.50', month_end_balance: '5000.00', cumple: true, days: [] }) });
});

const page = await context.newPage();

for (const [name, route] of ROUTES) {
  try {
    await page.goto(`${BASE_URL}${route}?_=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);

    // Dismiss cookie banner if present.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const btn = page.getByRole('button', { name: /aceptar todas/i });
      if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(400);
        break;
      }
    }

    await page.waitForTimeout(2500);
    const out = resolve(OUT_DIR, `${name}.png`);
    mkdirSync(dirname(out), { recursive: true });
    await page.screenshot({ path: out, fullPage: false });
    console.log(`OK ${name}: ${out}`);
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
  }
}

await browser.close();
