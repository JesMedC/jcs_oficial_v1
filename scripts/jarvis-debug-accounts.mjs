#!/usr/bin/env node
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
await context.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
  localStorage.setItem('jcs.theme.mode', 'dark');
});
const page = await context.newPage();
page.on('request', (r) => {
  if (r.url().includes('/api/v1/')) console.log('>REQ', r.method(), r.url());
});
page.on('response', (r) => {
  if (r.url().includes('/api/v1/')) console.log('<RES', r.status(), r.url());
});
page.on('requestfailed', (r) => {
  if (r.url().includes('/api/v1/')) console.log('<FAIL', r.url(), r.failure()?.errorText);
});
await page.goto('http://localhost:5174/portal/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(10000);
const result = await page.evaluate(async () => {
  const r = await fetch('/api/v1/accounts?limit=100', { cache: 'no-store' });
  return { status: r.status, body: (await r.text()).slice(0, 200) };
});
console.log('FINAL TEST accounts:', JSON.stringify(result));
await browser.close();
