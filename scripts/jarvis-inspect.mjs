#!/usr/bin/env node
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  // Use the real production token if available; otherwise fake one
  // for the dev server. We deliberately don't seed tokens so the SPA
  // uses whatever is already in sessionStorage (or none).
  localStorage.setItem('jcs.theme.mode', 'dark');
});
const page = await ctx.newPage();
page.on('console', (msg) => console.log('[browser]', msg.type(), msg.text()));
page.on('pageerror', (err) => console.log('[pageerror]', err.message));
await page.goto('https://jadecapitalsuite.com/portal/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(8000);
const dump = await page.evaluate(() => {
  const balance = document.querySelector('[data-testid="summary-balance"]');
  return {
    url: location.href,
    balanceExists: !!balance,
    balanceClass: balance?.className,
    balanceOuterHTML: balance?.outerHTML?.slice(0, 600),
    theme: document.documentElement.getAttribute('data-theme'),
  };
});
console.log(JSON.stringify(dump, null, 2));
await browser.close();

