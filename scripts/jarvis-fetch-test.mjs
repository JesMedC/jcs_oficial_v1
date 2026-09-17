#!/usr/bin/env node
/* Quick fetch test — see what the browser actually receives. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);

await context.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
});
await page.waitForTimeout(1000);

const result = await page.evaluate(async () => {
  // 1) Plain fetch (no auth header).
  const r1 = await fetch('/api/v1/trades/session-stats?workspace_id=ws-1');
  const d1 = await r1.json();
  // 2) With auth header.
  const r2 = await fetch('/api/v1/trades/session-stats?workspace_id=ws-1', {
    headers: { Authorization: 'Bearer mock' },
  });
  const d2 = await r2.json();
  return { plain: d1, withAuth: d2, plainStatus: r1.status, withAuthStatus: r2.status };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
