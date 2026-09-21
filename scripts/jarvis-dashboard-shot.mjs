#!/usr/bin/env node
/*
 * JARVIS dashboard screenshot — drives the SPA at BASE_URL through
 * the auth bootstrap by pre-seeding sessionStorage with a mock
 * access + refresh token, then waits long enough for the
 * dashboard's query cascade (auth → accounts → trades → session
 * stats → equity curve → calendar) to settle.
 *
 * Usage:
 *   node scripts/jarvis-dashboard-shot.mjs [outPath] [viewport]
 *     - outPath defaults to /tmp/jarvis-dashboard.png
 *     - viewport defaults to desktop (1440x900). Use 'tablet' or
 *       'mobile' to test responsive layouts.
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.JARVIS_BASE_URL ?? 'http://localhost:5174';
const OUT = process.argv[2] ?? '/tmp/jarvis-dashboard.png';
const VIEWPORT = process.argv[3] ?? 'desktop'; // desktop | tablet | mobile

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 834, height: 1112 },
  mobile: { width: 390, height: 844 },
};

mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORTS[VIEWPORT] ?? VIEWPORTS.desktop,
  deviceScaleFactor: 1,
});

// Pre-seed tokens so the SPA's auth bootstrap picks them up before
// the dashboard query cascade fires. Theme forced to dark via
// localStorage so the JARVIS aesthetic renders.
await context.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
  localStorage.setItem('jcs.theme.mode', 'dark');
});

// Mock API routes — Playwright intercepts BEFORE the request hits
// the network or the dev-server proxy. This works even when the
// backend is unreachable on :8000/:443.
await context.route('**/api/v1/auth/me', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    user_id: 'demo-1',
    email: 'demo@jadecapital.local',
    first_name: 'Jesus',
    last_name: 'Demo',
    phone: '+54 11 1234 5678',
    role: 'USER',
    workspaces: [{ id: 'ws-1', name: 'Principal', role: 'OWNER' }],
    current_subscription: { plan: 'PRO', status: 'ACTIVE', trial_ends_at: null, renews_at: '2026-12-31' },
    timezone: 'UTC',
  }) });
});
await context.route('**/api/v1/accounts**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    items: [
      { id: 'a1', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Asia', type: 'FOREX', balance_usd: '4200.50', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
      { id: 'a2', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Nueva York', type: 'FOREX', balance_usd: '2150.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
      { id: 'a3', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Sidney', type: 'FOREX', balance_usd: '1850.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
      { id: 'a4', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Londres', type: 'FOREX', balance_usd: '1810.78', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
    ],
    total: 4,
    skip: 0,
    limit: 100,
  }) });
});
const MOCK_TRADES = [];
const pairs = ['EUR/USD', 'GBP/JPY', 'AUD/JPY', 'USD/JPY', 'EUR/JPY'];
const sides = ['Compra', 'Venta'];
const now = new Date('2026-09-15T16:00:00Z');
for (let i = 0; i < 8; i += 1) {
  const d = new Date(now);
  d.setHours(d.getHours() - i * 3);
  const pnl = (Math.random() - 0.4) * 120;
  MOCK_TRADES.push({
    id: `t-${i}`,
    account_id: 'a1',
    pair: pairs[i % pairs.length],
    side: sides[i % 2],
    lots: 0.5,
    pnl_usd: Number(pnl.toFixed(2)),
    instrument: pairs[i % pairs.length],
    type: 'FOREX',
    opened_at: d.toISOString(),
    closed_at: d.toISOString(),
    duration_minutes: 30 + i * 5,
    status: 'CLOSED',
    investment_usd: '500.00',
  });
}
await context.route('**/api/v1/trades/session-stats**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    workspace_id: 'ws-1',
    date_from: '2026-08-15',
    date_to: '2026-09-15',
    account_id: null,
    sessions: {
      ASIA: { trades: 8, wins: 6, winrate_pct: 75 },
      LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
      NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
      SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
    },
    general: { trades: 14, wins: 10, winrate_pct: 71 },
  }) });
});
await context.route('**/api/v1/trades**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: MOCK_TRADES, total: MOCK_TRADES.length, skip: 0, limit: 100 }) });
});
// Generate 31 days of equity-curve points.
const points = [];
let balance = 4200.5;
let cum = 0;
for (let i = 30; i >= 0; i -= 1) {
  const d = new Date('2026-09-15');
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().slice(0, 10);
  const drift = (Math.sin(i * 0.7) + Math.cos(i * 0.3)) * 22 + 18;
  cum += drift;
  balance = 4200.5 + cum;
  points.push({
    date: dateStr,
    account_balance: Number(balance.toFixed(2)),
    cumulative_net_pnl: Number(cum.toFixed(2)),
    daily_pnl: Number(drift.toFixed(2)),
    capital_volume: 1000 + i * 14,
    trades: Math.max(1, Math.round(4 + Math.sin(i) * 2)),
  });
}
await context.route('**/api/v1/equity-curve**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ points }) });
});
await context.route('**/api/v1/analytics/**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});
await context.route('**/api/v1/auth/refresh', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
  }) });
});
await context.route('**/api/v1/auth/login', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
  }) });
});
await context.route('**/api/v1/auth/register', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
  }) });
});
await context.route('**/api/v1/auth/logout', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
});
await context.route('**/api/v1/subscription/me', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    plan: 'PRO',
    status: 'ACTIVE',
    trial_ends_at: null,
    renews_at: '2026-12-31',
  }) });
});
await context.route('**/api/v1/scanner/ws', async (route) => {
  await route.abort();
});
await context.route('**/api/v1/scanner/alerts', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ items: [] }) });
});
await context.route('**/api/v1/calendar/pnl**', async (route) => {
  const month = new URL(route.request().url()).searchParams.get('month') ?? '2026-09';
  const days = [];
  const monthNum = Number(month.split('-')[1] ?? '9');
  const yearNum = Number(month.split('-')[0] ?? '2026');
  const lastDay = new Date(yearNum, monthNum, 0).getDate();
  let cum = 0;
  let bal = 4200.5;
  for (let d = 1; d <= lastDay; d += 1) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const daily = (Math.sin(d * 0.5) + Math.cos(d * 0.3)) * 12 + 5;
    cum += daily;
    bal += daily;
    days.push({
      date,
      ops_count: Math.max(0, Math.round(4 + Math.sin(d) * 2)),
      day_start_balance: String((bal - daily).toFixed(2)),
      pnl_pct: bal > 0 ? Number((daily / bal * 100).toFixed(2)) : 0,
    });
  }
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
    workspace_id: 'ws-1',
    month,
    month_start_balance: '4200.50',
    month_end_balance: bal.toFixed(2),
    cumple: cum > 0,
    days,
  }) });
});

const page = await context.newPage();
page.on('pageerror', (err) => console.error('PAGEERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('CONSOLE.ERROR:', msg.text());
});

try {
  // Direct goto + long wait. This mirrors the debug-tile flow that
  // actually shows data on the tiles.
  await page.goto(`${BASE_URL}/portal/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(3000);

  // Dismiss cookie banner if present.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const acceptCookies = page.getByRole('button', { name: /aceptar todas/i });
    if (await acceptCookies.isVisible({ timeout: 1500 }).catch(() => false)) {
      await acceptCookies.click();
      await page.waitForTimeout(400);
      break;
    }
  }

  await page.waitForTimeout(5000);

  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`URL: ${page.url()}`);
  console.log(`OK: ${resolve(OUT)}`);
} catch (err) {
  console.error('FAIL:', err.message);
  await page.screenshot({ path: OUT, fullPage: false }).catch(() => null);
  console.log(`PARTIAL: ${resolve(OUT)}`);
} finally {
  await browser.close();
}
