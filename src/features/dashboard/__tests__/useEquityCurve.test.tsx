/*
 * DVC-04 — buildOpsSeries closed_at bucketing + cashflow exclusion.
 *
 * The PerformanceCurveChart now renders the CUMULATIVE realized
 * trading P&L (Σ pnl_usd of FOREX/BINARY closed positions) instead of
 * a per-day histogram. The math lives in ``useEquityCurve``'s
 * ``buildOpsSeries`` helper, so this test pins the contract that the
 * helper:
 *
 *   1. Buckets the daily P&L on ``closed_at`` (not ``opened_at``),
 *      with a fallback to ``opened_at`` ONLY when ``closed_at`` is
 *      null AND the trade's status indicates a closed outcome
 *      (CLOSED_WIN / CLOSED_LOSS / CLOSED_BREAK).
 *   2. NEVER mixes OPEN rows into the cumulative — a trade whose
 *      status is ``OPEN`` contributes nothing to the cumulative P&L,
 *      regardless of whether ``closed_at`` somehow leaked through.
 *   3. Excludes FUND / WITHDRAW from the trading P&L aggregation
 *      (they remain on ``capitalVolume``, untouched by DVC-04).
 *   4. Walks window dates forward and accumulates per-day P&L into
 *      the running cumulative (no firstFund baked in).
 *   5. Carries pre-window history forward — trades that closed
 *      BEFORE the window start are summed into the bootstrap so the
 *      first window day starts on the right value.
 *   6. Preserves zero-activity dates — a window date with no trading
 *      activity keeps the previous cumulative value (flat segment).
 *
 * The test exercises ``buildOpsSeries`` via the ``__test`` re-export
 * surface so we don't depend on TanStack Query mocks.
 */
import { describe, expect, it } from 'vitest';

import { __test, useEquityCurve } from '../useEquityCurve';
import type { TradeOut } from '../../trades/types';

type BuildOpsSeries = (typeof __test)['buildOpsSeries'];

function mkTrade(over: Partial<TradeOut> & { id: string; opened_at: string }): TradeOut {
  return {
    user_id: 'u1',
    account_id: 'a1',
    instrument: 'EURUSD',
    type: 'BINARY',
    status: 'CLOSED_WIN',
    closed_at: over.opened_at,
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
    ...over,
  } as TradeOut;
}

const { buildOpsSeries } = __test as { buildOpsSeries: BuildOpsSeries };

describe('useEquityCurve.buildOpsSeries — DVC-04', () => {
  it('aggregates daily P&L by closed_at (not opened_at)', () => {
    // Trade opens late on day D-1, closes early on day D — must land
    // on day D's cumulative, NOT day D-1's. Cross-midnight closures
    // are the whole point of the change.
    const crossMidnight = mkTrade({
      id: 't-cross',
      opened_at: '2026-09-10T23:55:00.000Z',
      closed_at: '2026-09-11T00:05:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '10.00',
    });
    const sameDay = mkTrade({
      id: 't-same',
      opened_at: '2026-09-12T10:00:00.000Z',
      closed_at: '2026-09-12T11:00:00.000Z',
      status: 'CLOSED_LOSS',
      pnl_usd: '-3.00',
    });
    const { byDate } = buildOpsSeries([crossMidnight, sameDay], [
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);

    // Day D-1 (opened only) — no closed_at lands here.
    expect(byDate.get('2026-09-10')?.dailyPnl).toBe(0);
    // Day D (the cross-midnight closure) — +10 lands here.
    expect(byDate.get('2026-09-11')?.dailyPnl).toBe(10);
    // Day D+1 — −3 lands here.
    expect(byDate.get('2026-09-12')?.dailyPnl).toBe(-3);
  });

  it('falls back to opened_at only when closed_at is null AND status is CLOSED_*', () => {
    // Legacy / backfill edge — the backend hasn't stamped closed_at
    // yet but the status clearly says the trade is closed. Use
    // opened_at's date as the bucket.
    const backfilled = mkTrade({
      id: 't-backfill',
      opened_at: '2026-09-12T10:00:00.000Z',
      closed_at: null,
      status: 'CLOSED_WIN',
      pnl_usd: '7.00',
    });
    const { byDate } = buildOpsSeries([backfilled], ['2026-09-12']);
    expect(byDate.get('2026-09-12')?.dailyPnl).toBe(7);
  });

  it('NEVER mixes OPEN rows into the cumulative P&L', () => {
    const stillOpen = mkTrade({
      id: 't-open',
      opened_at: '2026-09-12T10:00:00.000Z',
      closed_at: null,
      status: 'OPEN',
      pnl_usd: null,
    });
    const { byDate } = buildOpsSeries([stillOpen], ['2026-09-12']);
    expect(byDate.get('2026-09-12')?.dailyPnl).toBe(0);
    expect(byDate.get('2026-09-12')?.cumulativeNetPnl).toBe(0);
  });

  it('excludes FUND and WITHDRAW from the trading P&L aggregation', () => {
    const fund = mkTrade({
      id: 't-fund',
      type: 'FUND',
      opened_at: '2026-09-10T09:00:00.000Z',
      closed_at: '2026-09-10T09:00:00.000Z',
      status: 'OPEN',
      pnl_usd: null,
      investment_usd: '500.00',
    });
    const withdraw = mkTrade({
      id: 't-withdraw',
      type: 'WITHDRAW',
      opened_at: '2026-09-12T09:00:00.000Z',
      closed_at: '2026-09-12T09:00:00.000Z',
      status: 'OPEN',
      pnl_usd: null,
      investment_usd: '100.00',
    });
    const { byDate, firstFundAmount } = buildOpsSeries(
      [fund, withdraw],
      ['2026-09-10', '2026-09-11', '2026-09-12'],
    );

    // Trading P&L untouched — capital movements live on capitalVolume.
    expect(byDate.get('2026-09-10')?.dailyPnl).toBe(0);
    expect(byDate.get('2026-09-12')?.dailyPnl).toBe(0);
    expect(byDate.get('2026-09-10')?.cumulativeNetPnl).toBe(0);
    expect(byDate.get('2026-09-12')?.cumulativeNetPnl).toBe(0);

    // capitalVolume carries FUND + WITHDRAW for downstream capital
    // charts (the buildOpsSeries contract keeps them; the chart just
    // stops rendering them).
    expect(byDate.get('2026-09-10')?.capitalVolume).toBe(500);
    expect(byDate.get('2026-09-12')?.capitalVolume).toBe(-100);

    // firstFundAmount still picked up from the first FUND — KPI
    // math depends on it; not in DVC-04 scope to change.
    expect(firstFundAmount).toBe(500);
  });

  it('walks window dates forward; WIN increments, LOSS decrements in trade order (by closed_at)', () => {
    // Two wins then one loss on different days — by closed_at, the
    // walk order is: day 10 (+5), day 12 (+7), day 13 (−3).
    const winA = mkTrade({
      id: 'win-a',
      opened_at: '2026-09-10T08:00:00.000Z',
      closed_at: '2026-09-10T09:00:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '5.00',
    });
    const winB = mkTrade({
      id: 'win-b',
      opened_at: '2026-09-12T08:00:00.000Z',
      closed_at: '2026-09-12T09:00:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '7.00',
    });
    const loss = mkTrade({
      id: 'loss-c',
      opened_at: '2026-09-13T08:00:00.000Z',
      closed_at: '2026-09-13T09:00:00.000Z',
      status: 'CLOSED_LOSS',
      pnl_usd: '-3.00',
    });

    const { byDate } = buildOpsSeries(
      // shuffle the input order to prove the helper sorts by
      // closed_at internally rather than relying on input order.
      [loss, winA, winB],
      ['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-13'],
    );

    expect(byDate.get('2026-09-10')?.cumulativeNetPnl).toBe(5);
    expect(byDate.get('2026-09-11')?.cumulativeNetPnl).toBe(5); // flat
    expect(byDate.get('2026-09-12')?.cumulativeNetPnl).toBe(12);
    expect(byDate.get('2026-09-13')?.cumulativeNetPnl).toBe(9);
  });

  it('anchors the curve with pre-window history (carries forward)', () => {
    // Trade closed BEFORE the window — its P&L seeds the bootstrap
    // so the first window day starts on the right value, not 0.
    const preWindow = mkTrade({
      id: 't-pre',
      opened_at: '2026-09-08T08:00:00.000Z',
      closed_at: '2026-09-08T09:00:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '20.00',
    });
    const inWindow = mkTrade({
      id: 't-in',
      opened_at: '2026-09-12T08:00:00.000Z',
      closed_at: '2026-09-12T09:00:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '5.00',
    });

    const { byDate } = buildOpsSeries(
      [preWindow, inWindow],
      // Window starts on the 10th — the pre-window win must carry forward.
      ['2026-09-10', '2026-09-11', '2026-09-12'],
    );

    expect(byDate.get('2026-09-10')?.cumulativeNetPnl).toBe(20);
    expect(byDate.get('2026-09-11')?.cumulativeNetPnl).toBe(20);
    expect(byDate.get('2026-09-12')?.cumulativeNetPnl).toBe(25);
  });

  it('preserves zero-activity dates (flat segments) — quiet Monday does not vanish', () => {
    // No trades closed on day 11 — cumulative must carry forward
    // from day 10, NOT reset to 0.
    const onlyDay10 = mkTrade({
      id: 't-only-10',
      opened_at: '2026-09-10T08:00:00.000Z',
      closed_at: '2026-09-10T09:00:00.000Z',
      status: 'CLOSED_WIN',
      pnl_usd: '4.00',
    });

    const { byDate } = buildOpsSeries([onlyDay10], [
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
    ]);

    expect(byDate.get('2026-09-11')?.cumulativeNetPnl).toBe(4);
    expect(byDate.get('2026-09-12')?.cumulativeNetPnl).toBe(4);
  });

  it('module surface exports useEquityCurve + the __test seam', () => {
    // Guard against silent breakage of the import surface — the
    // chart's consumer relies on the named export `useEquityCurve`,
    // and the test seam exposes `buildOpsSeries`.
    expect(typeof useEquityCurve).toBe('function');
    expect(typeof buildOpsSeries).toBe('function');
  });
});