#!/usr/bin/env node
/* Screenshot script — no test framework, just plain playwright. */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const BASE_URL = 'http://localhost:5173';
const OUT = process.argv[2] ?? '/tmp/jarvis-dashboard.png';
const ROUTE = process.argv[3] ?? '/portal/dashboard';

mkdirSync(dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
});

// Pre-seed an auth user in localStorage so the AuthProvider picks it up
// without needing a backend /api/v1/auth/me round-trip. The shape mirrors
// what AuthProvider expects after a successful /auth/me.
await context.addInitScript(() => {
  window.localStorage.setItem(
    'jarvis-mock-user',
    JSON.stringify({
      user_id: 'demo-1',
      email: 'demo@jadecapital.local',
      first_name: 'Jesus',
      last_name: 'Demo',
      phone: '+54 11 1234 5678',
      role: 'USER',
      workspaces: [{ id: 'ws-1', name: 'Principal', role: 'OWNER' }],
      current_subscription: null,
      timezone: 'UTC',
    }),
  );
});

const page = await context.newPage();

// Surface console errors to stderr so we know if the app crashed.
page.on('pageerror', (err) => console.error('PAGEERROR:', err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    console.error('CONSOLE.ERROR:', msg.text());
  }
});

try {
  await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: 'networkidle', timeout: 30_000 });

  // Dismiss the cookie banner if it shows up.
  const acceptCookies = page.getByRole('button', { name: /aceptar todas/i });
  if (await acceptCookies.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptCookies.click();
    await page.waitForTimeout(500);
  }

  // Wait an extra second for any post-mount paint / decor / fonts.
  await page.waitForTimeout(1500);
  await page.screenshot({ path: OUT, fullPage: false });
  console.log(`OK: ${resolve(OUT)}`);
} catch (err) {
  console.error('FAIL:', err.message);
  // Fallback: try to grab whatever is on screen.
  try {
    await page.screenshot({ path: OUT, fullPage: false });
    console.log(`PARTIAL: ${resolve(OUT)}`);
  } catch (_) {
    process.exit(1);
  }
} finally {
  await browser.close();
}
