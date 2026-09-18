#!/usr/bin/env node
/*
 * jarvis-mock-server.mjs — local mock of the FastAPI backend
 *
 * Implements just enough of the /api/v1 surface for the portal
 * (dashboard) to render with realistic demo data. Used in tandem
 * with `VITE_API_BASE_URL=http://localhost:8001/api/v1` so the
 * frontend's axios instance talks to this server instead of the
 * missing nginx backend.
 */
import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.JARVIS_MOCK_PORT ?? 8001);

const MOCK_USER = {
  user_id: 'demo-1',
  email: 'demo@jadecapital.local',
  first_name: 'Jesus',
  last_name: 'Demo',
  phone: '+54 11 1234 5678',
  role: 'USER',
  workspaces: [{ id: 'ws-1', name: 'Principal', role: 'OWNER' }],
  current_subscription: {
    plan: 'PRO',
    status: 'ACTIVE',
    trial_ends_at: null,
    renews_at: '2026-12-31',
  },
  timezone: 'UTC',
};

const MOCK_ACCOUNTS = [
  { id: 'a1', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Asia', type: 'FOREX', balance_usd: '4200.50', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a2', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Nueva York', type: 'FOREX', balance_usd: '2150.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a3', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Sidney', type: 'FOREX', balance_usd: '1850.00', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
  { id: 'a4', user_id: 'demo-1', workspace_id: 'ws-1', broker_name: 'IC Markets', name: 'Londres', type: 'FOREX', balance_usd: '1810.78', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-09-15T00:00:00Z' },
];

// Generate 30 days of equity-curve points with a believable trend.
function genEquityCurve() {
  const points = [];
  let balance = 4200.5;
  let cum = 0;
  const today = new Date('2026-09-15');
  for (let i = 30; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    // Pseudo-random walk biased up.
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
  return points;
}

// Generate realistic recent trades (5 per account, last few days).
function genRecentTrades() {
  const pairs = ['EUR/USD', 'GBP/JPY', 'AUD/JPY', 'USD/JPY', 'EUR/JPY'];
  const sides = ['Compra', 'Venta'];
  const trades = [];
  const now = new Date('2026-09-15T16:00:00Z');
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(now);
    d.setHours(d.getHours() - i * 3);
    const pnl = (Math.random() - 0.4) * 120;
    trades.push({
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
  // Winrate by session data lives at its own endpoint; don't pollute trades here.
  return trades;
}

function cors(res, req) {
  const origin = req.headers.origin ?? '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function jsonResponse(res, req, body, status = 200) {
  const payload = JSON.stringify(body);
  cors(res, req);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate',
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
  const path = url.pathname;

  console.log(`[mock] ${req.method} ${path} from=${req.headers['x-forwarded-for'] ?? req.socket.remoteAddress}`);

  if (req.method === 'OPTIONS') {
    cors(res, req);
    res.writeHead(204);
    return res.end();
  }

  if (path === '/api/v1/auth/me') {
    return jsonResponse(res, req, MOCK_USER);
  }
  // Auth flow: accept any login + register, return a token + user.
  if (path === '/api/v1/auth/login') {
    return jsonResponse(res, req, {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
    });
  }
  if (path === '/api/v1/auth/register') {
    return jsonResponse(res, req, {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
    });
  }
  if (path === '/api/v1/auth/refresh') {
    return jsonResponse(res, req, {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      token_type: 'bearer',
      expires_in: 3600,
    });
  }
  if (path === '/api/v1/auth/logout') {
    return jsonResponse(res, req, { ok: true });
  }
  if (path === '/api/v1/accounts') {
    return jsonResponse(res, req, { items: MOCK_ACCOUNTS, total: MOCK_ACCOUNTS.length, skip: 0, limit: 100 });
  }
  if (path === '/api/v1/trades/session-stats' || path.startsWith('/api/v1/trades/session-stats?')) {
    return jsonResponse(res, req, {
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
    });
  }
  if (path.startsWith('/api/v1/trades')) {
    const items = genRecentTrades();
    return jsonResponse(res, req, { items, total: items.length, skip: 0, limit: 100 });
  }
  if (path.startsWith('/api/v1/equity-curve')) {
    return jsonResponse(res, req, { points: genEquityCurve() });
  }
  if (path.startsWith('/api/v1/analytics')) {
    // Accept analytics beacons silently.
    return jsonResponse(res, req, { ok: true });
  }
  if (path === '/api/v1/health' || path === '/health') {
    return jsonResponse(res, req, { ok: true });
  }
  if (path === '/api/v1/subscription/me') {
    return jsonResponse(res, req, {
      plan: 'PRO',
      status: 'ACTIVE',
      trial_ends_at: null,
      renews_at: '2026-12-31',
    });
  }
  if (path === '/api/v1/scanner/alerts') {
    return jsonResponse(res, req, { items: [] });
  }
  if (path.startsWith('/api/v1/calendar/pnl')) {
    const month = url.searchParams.get('month') ?? '2026-09';
    // 30 days of calendar data so the equity curve walks.
    const monthNum = Number(month.split('-')[1] ?? '9');
    const yearNum = Number(month.split('-')[0] ?? '2026');
    const days = [];
    const today = new Date(yearNum, monthNum, 0).getDate();
    let cum = 0;
    let balance = 4200.5;
    for (let d = 1; d <= today; d += 1) {
      const date = `${month}-${String(d).padStart(2, '0')}`;
      const daily = (Math.sin(d * 0.5) + Math.cos(d * 0.3)) * 12 + 5;
      cum += daily;
      balance += daily;
      days.push({
        date,
        ops_count: Math.max(0, Math.round(4 + Math.sin(d) * 2)),
        day_start_balance: String((balance - daily).toFixed(2)),
        pnl_pct: balance > 0 ? Number((daily / balance * 100).toFixed(2)) : 0,
      });
    }
    return jsonResponse(res, req, {
      workspace_id: 'ws-1',
      month,
      month_start_balance: '4200.50',
      month_end_balance: balance.toFixed(2),
      cumple: cum > 0,
      days,
    });
  }

  // Default 404
  console.warn(`[mock] 404 ${path}`);
  return jsonResponse(res, req, { detail: 'not found' }, 404);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[mock] listening on http://localhost:${PORT}`);
});
