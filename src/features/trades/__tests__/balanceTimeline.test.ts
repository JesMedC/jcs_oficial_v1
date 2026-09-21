/*
 * balanceTimeline.test.ts — Regression tests for the unified
 * operations-log balance walker.
 *
 * Locks the contracts the Operaciones table + CSV export both depend
 * on:
 *   - FUND/WITHDRAW movements count toward the running balance
 *     (their magnitude lives in ``investment_usd`` — backend
 *     ``trading_account_service._build_capital_trade``).
 *   - FOREX/BINARY CLOSED trades move balance by their ``pnl_usd``.
 *   - OPEN trades do NOT move balance (margin in/out cancels out
 *     between open and close).
 *   - The walker walks BACKWARD from ``currentBalance`` so each
 *     row's ``post`` equals the next-earlier row's ``prev``.
 *
 * Without these tests the FUND/WITHDRAW bug (every deposit showing
 * ``bal.prev === bal.post``) had no guardrail and slipped into main.
 */
import { describe, expect, it } from 'vitest';

import { computeBalanceTimeline, type BalancePair } from '../balanceTimeline';
import type { TradeOut } from '../types';

/* ---- minimal TradeOut factory — only the fields the helper reads ---- */

function trade(overrides: Partial<TradeOut> & { id: string }): TradeOut {
  return {
    user_id: 'user-1',
    account_id: 'acct-1',
    instrument: 'EURUSD',
    type: 'BINARY',
    status: 'CLOSED_WIN',
    opened_at: '2026-09-04T20:00:00.000Z',
    closed_at: '2026-09-04T20:01:00.000Z',
    strategy_id: null,
    emotional_tags: null,
    pre_trade_notes: null,
    post_trade_notes: null,
    followed_plan: null,
    mistakes: null,
    screenshots: null,
    interest: null,
    analysis_image_url: null,
    close_image_url: null,
    direction: 'CALL',
    investment_usd: '1.00',
    payout_pct: '85',
    expiration_seconds: 60,
    pnl_usd: '0.85',
    ...overrides,
  };
}

function fund(id: string, openedAt: string, amount: string): TradeOut {
  return trade({
    id,
    type: 'FUND',
    status: 'CLOSED_BREAK',
    instrument: 'CAPITAL',
    opened_at: openedAt,
    closed_at: openedAt,
    investment_usd: amount,
    pnl_usd: null,
    direction: 'CALL',
  });
}

function withdraw(id: string, openedAt: string, amount: string): TradeOut {
  return trade({
    id,
    type: 'WITHDRAW',
    status: 'CLOSED_BREAK',
    instrument: 'CAPITAL',
    opened_at: openedAt,
    closed_at: openedAt,
    investment_usd: amount,
    pnl_usd: null,
    direction: 'PUT',
  });
}

function closed(
  id: string,
  closedAt: string,
  pnlUsd: string,
  openedAt?: string,
): TradeOut {
  return trade({
    id,
    status: 'CLOSED_WIN',
    opened_at: openedAt ?? closedAt,
    closed_at: closedAt,
    pnl_usd: pnlUsd,
  });
}

function openTrade(id: string, openedAt: string, investmentUsd: string): TradeOut {
  return trade({
    id,
    status: 'OPEN',
    opened_at: openedAt,
    closed_at: null,
    investment_usd: investmentUsd,
    pnl_usd: null,
  });
}

/* ---- helpers ---- */

function pair(timeline: Map<string, BalancePair>, id: string): BalancePair {
  const got = timeline.get(id);
  if (got === undefined) {
    throw new Error(`missing balance pair for ${id}`);
  }
  return got;
}

describe('computeBalanceTimeline', () => {
  it('walks backward from currentBalance for a single closed trade', () => {
    const timeline = computeBalanceTimeline(
      [closed('t1', '2026-09-04T20:00:00.000Z', '0.85')],
      1000.85,
    );
    expect(pair(timeline, 't1')).toEqual({ prev: 1000, post: 1000.85 });
  });

  it('regression — FUND deposit must move balance by investment_usd', () => {
    // Antes del fix: ambos eran 1050.85 (la depositaba no contaba).
    const timeline = computeBalanceTimeline(
      [fund('f1', '2026-09-05T10:30:00.000Z', '500.00')],
      550.85,
    );
    expect(pair(timeline, 'f1')).toEqual({ prev: 50.85, post: 550.85 });
  });

  it('regression — WITHDRAW must subtract investment_usd from balance', () => {
    const timeline = computeBalanceTimeline(
      [withdraw('w1', '2026-09-05T11:00:00.000Z', '100.00')],
      450.85,
    );
    expect(pair(timeline, 'w1')).toEqual({ prev: 550.85, post: 450.85 });
  });

  it('walks multi-event chronologically: trade → FUND → trade → WITHDRAW', () => {
    // Event order (oldest → newest):
    //   t1 WIN +0.85
    //   f1 FUND +500
    //   t2 LOSS -0.50
    //   w1 WITHDRAW -100
    // currentBalance = 1400.35
    // Walking BACKWARD from 1400.35:
    //   w1: prev = 1500.35, post = 1400.35   (effect = -100)
    //   t2: prev = 1500.85, post = 1500.35   (effect = -0.50)
    //   f1: prev = 1000.85, post = 1500.85   (effect = +500)
    //   t1: prev = 1000.00, post = 1000.85   (effect = +0.85)
    const timeline = computeBalanceTimeline(
      [
        closed('t1', '2026-09-01T10:00:00.000Z', '0.85'),
        fund('f1', '2026-09-02T09:00:00.000Z', '500.00'),
        closed('t2', '2026-09-03T20:00:00.000Z', '-0.50'),
        withdraw('w1', '2026-09-04T11:00:00.000Z', '100.00'),
      ],
      1400.35,
    );
    expect(pair(timeline, 't1')).toEqual({ prev: 1000.00, post: 1000.85 });
    expect(pair(timeline, 'f1')).toEqual({ prev: 1000.85, post: 1500.85 });
    expect(pair(timeline, 't2')).toEqual({ prev: 1500.85, post: 1500.35 });
    expect(pair(timeline, 'w1')).toEqual({ prev: 1500.35, post: 1400.35 });

    // Continuity: each row's post equals the previous (earlier) row's prev.
    expect(pair(timeline, 't1').post).toBe(pair(timeline, 'f1').prev);
    expect(pair(timeline, 'f1').post).toBe(pair(timeline, 't2').prev);
    expect(pair(timeline, 't2').post).toBe(pair(timeline, 'w1').prev);
  });

  it('OPEN trade contributes 0 to balance (margin round-trips on close)', () => {
    // BINARIA abierta con investment_usd=2.00. Backend deduce margin al
    // abrir, pero acá el walker ignora OPEN (asume que al cerrar el
    // margen vuelve). Para verificar end-to-end necesitamos un par
    // open → close: el delta total = pnl_usd del close.
    const timeline = computeBalanceTimeline(
      [
        openTrade('o1', '2026-09-04T20:00:00.000Z', '2.00'),
        closed('t1', '2026-09-04T20:05:00.000Z', '1.70'),
      ],
      1001.70,
    );
    // El walker ve la cerrada como +1.70 y la abierta como 0:
    expect(pair(timeline, 'o1')).toEqual({ prev: 1000.0, post: 1000.0 });
    expect(pair(timeline, 't1')).toEqual({ prev: 1000.0, post: 1001.7 });
  });

  it('null/undefined pnl_usd on a closed trade is treated as zero', () => {
    const timeline = computeBalanceTimeline(
      [trade({ id: 't1', pnl_usd: null, status: 'CLOSED_BREAK' })],
      1000,
    );
    expect(pair(timeline, 't1')).toEqual({ prev: 1000, post: 1000 });
  });

  it('empty trade list returns an empty timeline', () => {
    const timeline = computeBalanceTimeline([], 1234.56);
    expect(timeline.size).toBe(0);
  });

  it('orders by event date regardless of input array order', () => {
    // Pasar las filas en orden inverso no debe cambiar los balances.
    const ordered = [
      closed('t1', '2026-09-01T10:00:00.000Z', '0.85'),
      fund('f1', '2026-09-02T09:00:00.000Z', '500.00'),
    ];
    const reversed = ordered.slice().reverse();
    const a = computeBalanceTimeline(ordered, 1500.85);
    const b = computeBalanceTimeline(reversed, 1500.85);
    expect(pair(a, 't1')).toEqual(pair(b, 't1'));
    expect(pair(a, 'f1')).toEqual(pair(b, 'f1'));
  });
});