#!/usr/bin/env node
/* Isolated fetch test — no SPA involved, just the mock. */
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();

const page = await context.newPage();

// Capture every request + response on the page so we know exactly
// what hit the network.
page.on('request', (req) => console.log(`> ${req.method()} ${req.url()}`));
page.on('response', (res) => console.log(`< ${res.status()} ${res.url()}`));
page.on('requestfailed', (req) => console.log(`X ${req.url()} ${req.failure()?.errorText}`));

// Load a blank page so we have a JS context.
await page.goto('about:blank');

// 1) Plain fetch (no SPA involvement).
const r1 = await page.evaluate(async () => {
  const r = await fetch('http://localhost:8001/api/v1/trades/session-stats?workspace_id=ws-1');
  return { url: r.url, status: r.status, body: await r.text() };
});
console.log('---R1 (about:blank direct fetch)---');
console.log('status:', r1.status);
console.log('body:', r1.body.slice(0, 200));

await browser.close();
