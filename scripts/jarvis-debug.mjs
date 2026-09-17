#!/usr/bin/env node
/* JARVIS dashboard debug — surface every API request + response. */
import { chromium } from '@playwright/test';

const BASE_URL = process.env.JARVIS_BASE_URL ?? 'http://localhost:5174';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

await context.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock-access-token');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock-refresh-token');
});

const page = await context.newPage();
page.on('request', (req) => {
  const u = req.url();
  if (u.includes('/api/')) console.log(`> ${req.method()} ${u}`);
});
page.on('response', async (res) => {
  const u = res.url();
  if (u.includes('/api/')) {
    console.log(`< ${res.status()} ${u}`);
  }
});
page.on('requestfailed', (req) => {
  const u = req.url();
  if (u.includes('/api/')) console.log(`X ${u} -- ${req.failure()?.errorText}`);
});

await page.goto(`${BASE_URL}/portal/dashboard`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
await page.waitForTimeout(8000);
console.log('FINAL URL:', page.url());
await browser.close();
