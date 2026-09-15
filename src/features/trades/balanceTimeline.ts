/*
 * balanceTimeline.ts — Pure helper to compute the account balance
 * *before* and *after* each row of the unified operations log
 * (FOREX/BINARY trades + FUND/WITHDRAW capital movements).
 *
 * Algorithm:
 *   1. Sort rows ascending by their effective event date
 *      (closed_at ?? opened_at for trades; created_at is the same
 *      as opened_at for FUND/WITHDRAW since the backend fills both
 *      with `datetime.now(timezone.utc)` in ``_build_capital_trade``).
 *   2. Anchor: start with `currentBalance` (live, from accounts).
 *   3. Walk BACKWARD through the sorted list, subtracting each
 *      row's signed effect to recover the pre-event balance.
 *
 * Signed effect per row:
 *   - CLOSED trade (FOREX/BINARY) → +pnl_usd.
 *     The margin that was deducted on open is returned on close, so
 *     net over open+close == pnl. Treating OPEN as effect=0 keeps
 *     the closed-trade math correct without modeling margin.
 *   - OPEN trade (FOREX/BINARY)   → 0 (see above).
 *   - FUND                        → +investment_usd. The backend
 *     writes the deposit amount into ``investment_usd`` and leaves
 *     ``pnl_usd`` NULL (``trading_account_service._build_capital_trade``).
 *   - WITHDRAW                    → −investment_usd (same shape as
 *     FUND, sign comes from ``type``).
 *
 * Returns a Map<row_id, { prev, post }> so the consumer can do a
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

function balanceEffect(t: TradeOut): number {
  if (t.type === 'FUND') return Number(t.investment_usd ?? 0);
  if (t.type === 'WITHDRAW') return -Number(t.investment_usd ?? 0);
  if (t.status === 'OPEN') return 0;
  return Number(t.pnl_usd ?? 0);
}

export function computeBalanceTimeline(
  trades: ReadonlyArray<TradeOut>,
  currentBalance: number,
): Map<string, BalancePair> {
  const sorted = trades.slice().sort((a, b) => eventDateMs(a) - eventDateMs(b));
  const out = new Map<string, BalancePair>();

  // Walk backward: balance_just_after_last_row = currentBalance.
  // balance_just_before_row_i = balance_just_after_row_(i+1) - effect_i.
  // balance_just_after_row_i = balance_just_before_row_i + effect_i.
  // (At iteration i, the variable `balanceAfter` holds the balance
  // just after row i — which is also the balance just before
  // row (i+1) from the previous iteration.)
  let balanceAfter = currentBalance;
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const trade = sorted[i]!;
    const effect = balanceEffect(trade);
    const prev = balanceAfter - effect;
    out.set(trade.id, {
      prev: Math.round(prev * 100) / 100,
      post: Math.round(balanceAfter * 100) / 100,
    });
    balanceAfter = prev;
  }
  return out;
}
