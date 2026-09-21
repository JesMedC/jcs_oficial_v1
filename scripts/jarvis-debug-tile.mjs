#!/usr/bin/env node
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
await ctx.addInitScript(() => {
  sessionStorage.setItem('jcs.auth.access_token', 'mock');
  sessionStorage.setItem('jcs.auth.refresh_token', 'mock');
});
const page = await ctx.newPage();
await page.goto('http://localhost:5174/portal/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const dump = await page.evaluate(() => {
  const asia = document.querySelector('[data-testid="session-tile-ASIA"]');
  const winrate = document.querySelector('[data-testid="winrate-by-session-card"]');
  return {
    asiaText: asia?.textContent,
    asiaHTML: asia?.innerHTML?.slice(0, 800),
    allTiles: [...document.querySelectorAll('[data-testid^="session-tile"]')].map(t => t.textContent),
    winrateHTML: winrate?.innerHTML?.slice(0, 800),
    hasWinrate: !!winrate,
    h1: document.querySelector('h1')?.textContent,
    bodyText: document.body.textContent?.slice(0, 400),
  };
});
console.log('DUMP:', JSON.stringify(dump, null, 2));
await browser.close();
