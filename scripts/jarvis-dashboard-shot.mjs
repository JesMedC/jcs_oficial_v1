#!/usr/bin/env node
/* Dashboard screenshot — bypasses auth by mocking /api/v1/auth/me via init script. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = process.env.JARVIS_BASE_URL ?? 'http://localhost:5173';
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

const MOCK_ACCOUNTS = {
  items: [
    { id: 'a1', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Asia', type: 'FOREX', balance_usd: '4200.50', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
    { id: 'a2', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Nueva York', type: 'FOREX', balance_usd: '2150.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
    { id: 'a3', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Sidney', type: 'FOREX', balance_usd: '1850.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
    { id: 'a4', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Londres', type: 'FOREX', balance_usd: '1810.78', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  ],
  total: 4,
  skip: 0,
  limit: 100,
};

const MOCK_TRADES = { items: [], total: 0, skip: 0, limit: 100 };

// Mock API routes — Playwright intercepts BEFORE the request hits the
// network or the dev-server proxy. This works even when the backend
// is unreachable on :8000/:443.
await context.route('**/api/v1/auth/me', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER) });
});
await context.route('**/api/v1/accounts**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_ACCOUNTS) });
});
await context.route('**/api/v1/trades**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TRADES) });
});
await context.route('**/api/v1/equity-curve**', async (route) => {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ points: [] }) });
});
await context.route('**/api/v1/scanner/ws', async (route) => {
  await route.abort();
});

const page = await context.newPage();
page.on('pageerror', (err) => console.error('PAGEERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('CONSOLE.ERROR:', msg.text());
});

// Seed the AuthProvider's token store via sessionStorage BEFORE any
// navigation, so the bootstrap path sees tokens and runs
// loadCurrentUser() (which hits /auth/me).
// Also force the theme to 'dark' so the JARVIS aesthetic renders
// correctly (the agent's OS may default to light mode).
await page.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
  localStorage.setItem('jcs.theme.mode', 'dark');
});

try {
  // Force-reload strategy: navigate once to set up tokens + theme,
  // then reload so the React app sees the seed values during boot.
  await page.goto(`${BASE_URL}/portal/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(500);

  // Dismiss cookie banner if present.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const acceptCookies = page.getByRole('button', { name: /aceptar todas/i });
    if (await acceptCookies.isVisible({ timeout: 1500 }).catch(() => false)) {
      await acceptCookies.click();
      await page.waitForTimeout(400);
      break;
    }
  }

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  // If we landed on /login, navigate back to dashboard so the seeded
  // sessionStorage is picked up by the auth bootstrap on the second
  // pass.
  if (page.url().includes('/login')) {
    await page.goto(`${BASE_URL}/portal/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForTimeout(2000);
  }

  // Hard reload so all TanStack queries see the workspaceId from
  // the auth context on first mount.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForTimeout(2000);

  // Wait for queries to settle: dashboard fires auth -> accounts ->
  // trades + session-stats + equity-curve. Allow 8s for the cascade.
  await page.waitForTimeout(8000);

  // Force workspaceId into the page (debugging aid for the dashboard
  // workspaceId resolution race). If the page already mounted with
  // empty workspaceId, the queries never fire; this would re-mount
  // with the seeded value.
  const winrateNowHasData = await page.evaluate(async () => {
    const el = document.querySelector('[data-testid="session-tile-ASIA"] .text-xl');
    const elText = el?.textContent ?? 'no el';
    // Hit the API via the current origin (vite proxy or direct).
    const r = await fetch('http://localhost:8001/api/v1/trades/session-stats?workspace_id=ws-1&date_from=2026-08-18&date_to=2026-09-17&_=' + Date.now(), {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    console.log('REQUEST URL:', r.url);
    console.log('STATUS:', r.status);
    const apiData = await r.json();
    const url = r.url;
    return {
      tileText: elText,
      apiAsia: apiData.sessions?.ASIA,
      apiFull: JSON.stringify(apiData).slice(0, 200),
      respUrl: url,
      status: r.status,
      hasWinrateCard: !!document.querySelector('[data-testid="winrate-by-session-card"]'),
      hasDashWinrateSection: !!document.querySelector('[data-testid="dash-winrate-section"]'),
      h1: document.querySelector('h1')?.textContent,
      bodyText: document.body.textContent?.slice(0, 300),
      // Raw fetch to see what /api/v1/accounts returns.
      rawAccounts: await (await fetch('/api/v1/accounts?limit=100')).text(),
      swRegistrations: await navigator.serviceWorker?.getRegistrations().then(r => r.map(x => x.scope)).catch(() => 'none'),
      // Direct fetch via the page's axios instance — uses baseURL=http://localhost:8001/api/v1.
      axResponse: await (async () => {
        try {
          const token = sessionStorage.getItem('jcs.auth.access_token');
          const r = await fetch('http://localhost:8001/api/v1/trades/session-stats?workspace_id=ws-1', {
            cache: 'no-store',
            headers: { Authorization: `Bearer ${token}` },
          });
          return await r.json();
        } catch (e) {
          return String(e);
        }
      })(),
    };
  });
  console.log(`winrateNowHasData: ${JSON.stringify(winrateNowHasData)}`);

  await page.screenshot({ path: OUT, fullPage: true });
  console.log(`URL: ${page.url()}`);
  console.log(`OK: ${resolve(OUT)}`);
} catch (err) {
  console.error('FAIL:', err.message);
  await page.screenshot({ path: OUT, fullPage: false }).catch(() => null);
  console.log(`PARTIAL: ${resolve(OUT)}`);
} finally {
  await browser.close();
}
