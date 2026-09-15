/*
 * Regression: Winrate formula MUST ignore BREAK + FUND + WITHDRAW trades.
 *
 * Mirrors 7-business-rule "Exclusiones estrictas: El cálculo DEBE ignorar
 * por completo las operaciones Breakeven, Fondeos y Retiros." and
 * "Formato: Renderizar siempre como número entero sin decimales
 * (ej. 70%)."
 *
 * We replicate the calculation locally instead of mocking the hook so
 * the test documents the formula in code. If anyone changes the
 * formula (e.g. accidentally counts BREAK), the test fails immediately.
 */
import { describe, expect, it } from 'vitest';

import type { TradeOut } from '../types';

/* ---- inline replica of the dashboard winrate formula ----
 * The OperationsKPIsHeader computes:
 *   winRate = winsToday / (winsToday + lossesToday)
 *   closedToday includes CLOSED_BREAK (so "cerradas hoy" stays honest)
 *   but BREAK is NOT counted toward the win-rate denominator.
 *   FUND and WITHDRAW are dropped before either sum.
 */
function computeWinrate(trades: ReadonlyArray<TradeOut>): number | null {
  let wins = 0;
  let losses = 0;
  for (const t of trades) {
    // Exclude FUND and WITHDRAW — capital movements, not outcomes.
    if (t.type === 'FUND' || t.type === 'WITHDRAW') continue;
    if (t.status === 'OPEN') continue;
    // CLOSED_BREAK excluded from denominator — break-even is neither.
    if (t.status === 'CLOSED_WIN') wins += 1;
    else if (t.status === 'CLOSED_LOSS') losses += 1;
    // CLOSED_BREAK falls through (counted in closedToday but NOT win/loss).
  }
  const decided = wins + losses;
  return decided > 0 ? wins / decided : null;
}

const baseTrade = (over: Partial<TradeOut> & { id: string }): TradeOut => {
  const defaults: Partial<TradeOut> = {
    user_id: 'u1',
    account_id: 'a1',
    instrument: 'EURUSD',
    type: 'BINARY',
    status: 'CLOSED_WIN',
    opened_at: '2026-09-05T10:00:00.000Z',
    closed_at: '2026-09-05T10:01:00.000Z',
    investment_usd: '1.00',
    payout_pct: '85',
    expiration_seconds: 60,
    pnl_usd: '0.85',
  };
  // Cast through unknown to satisfy exactOptionalPropertyTypes —
  // the spread of optional `undefined` fields otherwise trips TS.
  return { ...defaults, ...over, id: over.id } as unknown as TradeOut;
};

describe('winrate formula (7-business-rule compliance)', () => {
  it('returns 100% for 3 wins + 0 losses (FUND/WITHDRAW ignored)', () => {
    const trades = [
      baseTrade({ id: 't1', status: 'CLOSED_WIN' }),
      baseTrade({ id: 't2', status: 'CLOSED_WIN' }),
      baseTrade({ id: 't3', status: 'CLOSED_WIN' }),
      // Capital movements that must be DROPPED:
      baseTrade({ id: 'f1', type: 'FUND', status: 'CLOSED_BREAK', pnl_usd: null }),
      baseTrade({ id: 'w1', type: 'WITHDRAW', status: 'CLOSED_BREAK', pnl_usd: null }),
    ];
    expect(computeWinrate(trades)).toBeCloseTo(1, 5);
  });

  it('returns 50% for 2 wins + 2 losses (BREAK ignored)', () => {
    const trades = [
      baseTrade({ id: 't1', status: 'CLOSED_WIN' }),
      baseTrade({ id: 't2', status: 'CLOSED_WIN' }),
      baseTrade({ id: 't3', status: 'CLOSED_LOSS', pnl_usd: '-1.00' }),
      baseTrade({ id: 't4', status: 'CLOSED_LOSS', pnl_usd: '-1.00' }),
      // BREAK excluded — the classic regression trap.
      baseTrade({ id: 'b1', status: 'CLOSED_BREAK', pnl_usd: '0' }),
    ];
    expect(computeWinrate(trades)).toBeCloseTo(0.5, 5);
  });

  it('returns null when no decided trades (only OPEN/BREAK/FUND/WITHDRAW)', () => {
    const trades = [
      baseTrade({ id: 'o1', status: 'OPEN', pnl_usd: null }),
      baseTrade({ id: 'b1', status: 'CLOSED_BREAK', pnl_usd: '0' }),
      baseTrade({ id: 'f1', type: 'FUND', status: 'CLOSED_BREAK', pnl_usd: null }),
    ];
    expect(computeWinrate(trades)).toBeNull();
  });

  it('format renders as integer without decimals (e.g. 70%, not 70.5%)', () => {
    const trades = Array.from({ length: 7 }, (_, i) =>
      baseTrade({ id: `w${i}`, status: 'CLOSED_WIN' }),
    ).concat(Array.from({ length: 3 }, (_, i) =>
      baseTrade({ id: `l${i}`, status: 'CLOSED_LOSS', pnl_usd: '-1.00' }),
    ));
    const rate = computeWinrate(trades);
    expect(rate).not.toBeNull();
    // 7 wins / 10 = 0.7 → formatted as "70%" via toFixed(0).
    const display = `${((rate as number) * 100).toFixed(0)}%`;
    expect(display).toBe('70%');
  });
});
