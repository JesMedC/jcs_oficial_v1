/*
 * balanceTimeline.ts — Pure helper to compute the account balance
 * *before* and *after* each trade, walking the trade history in
 * reverse so the most recent balance is the anchor we already know
 * (the live `account.balance_usd`).
 *
 * Algorithm:
 *   1. Sort trades ascending by their effective event date
 *      (closed_at for closed trades, opened_at for OPEN ones).
 *   2. Anchor: start with `currentBalance` (live, from accounts).
 *   3. Walk BACKWARD through the sorted list, subtracting each
 *      trade's P&L effect to recover the pre-trade balance.
 *
 * P&L effect per trade:
 *   - CLOSED_WIN  → +pnl_usd
 *   - CLOSED_LOSS → +pnl_usd (already negative)
 *   - CLOSED_BREAK → 0
 *   - OPEN        → 0 (open trades don't move settled balance; the
 *     size is "reserved" by the broker but the SQL backend doesn't
 *     deduct it from balance_usd on open, so neither do we)
 *   - FUND        → +pnl_usd (positive amount)
 *   - WITHDRAW    → +pnl_usd (negative amount)
 *
 * Returns a Map<trade_id, { prev, post }> so the consumer can do a
 * O(1) lookup per row in the Operaciones table.
 */
import type { TradeOut } from './types';

export interface BalancePair {
  readonly prev: number;
  readonly post: number;
}

function eventDateMs(t: TradeOut): number {
  const raw = t.status === 'OPEN' ? t.opened_at : (t.closed_at ?? t.opened_at);
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

function pnlEffect(t: TradeOut): number {
  if (t.status === 'OPEN') return 0;
  return Number(t.pnl_usd ?? 0);
}

export function computeBalanceTimeline(
  trades: ReadonlyArray<TradeOut>,
  currentBalance: number,
): Map<string, BalancePair> {
  const sorted = trades.slice().sort((a, b) => eventDateMs(a) - eventDateMs(b));
  const out = new Map<string, BalancePair>();

  // Walk backward: balance_just_after_last_trade = currentBalance.
  // balance_just_before_trade_i = balance_just_after_trade_(i+1) - pnl_i.
  // balance_just_after_trade_i = balance_just_before_trade_i + pnl_i.
  let balanceAfter = currentBalance;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const trade = sorted[i]!;
    const effect = pnlEffect(trade);
    const prev = balanceAfter - effect;
    out.set(trade.id, {
      prev: Math.round(prev * 100) / 100,
      post: Math.round(balanceAfter * 100) / 100,
    });
    balanceAfter = prev;
  }
  return out;
}
