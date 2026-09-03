/*
 * useTradesAll — Convenience hook for read-only analytics surfaces
 * that need EVERY trade the user has (no pagination). The Dashboard
 * uses this to compute equity curve, market distribution, top pairs,
 * profit factor, max drawdown, time heatmap, etc. — all client-side
 * so we don't need new backend endpoints.
 *
 * Strategy:
 *   - Calls the existing listTradesApi with a large limit (500). The
 *     backend's GET /trades already returns up to 100 per page, so we
 *     keep it simple and accept the truncation for now. Once the
 *     backend exposes an analytics-aggregated endpoint, swap this
 *     hook to that — the consumer surface stays identical.
 *   - Returns ``trades`` (deduped, sorted desc by opened_at) plus
 *     derived primitives: closedCount, openCount, totalPnl.
 *
 * NOTE: when the user grows past 500 trades the curves will be
 *       truncated. That limit is a deliberate "ship now, optimize
 *       later" choice — the dashboard shows the most recent history,
 *       which is what traders actually look at first.
 */
import { useQuery } from '@tanstack/react-query';

import { listTradesApi } from './api';
import { tradesKeys } from './hooks';
import type { ListTradesParams, TradeOut } from './types';

const ANALYTICS_LIMIT = 500;

interface UseTradesAllResult {
  readonly trades: ReadonlyArray<TradeOut>;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly closedCount: number;
  readonly openCount: number;
  readonly totalPnl: number;
}

export function useTradesAll(
  filters: ListTradesParams = {},
): UseTradesAllResult {
  const query = useQuery({
    queryKey: tradesKeys.list({ ...filters, limit: ANALYTICS_LIMIT, skip: 0 }),
    queryFn: () => listTradesApi({ ...filters, limit: ANALYTICS_LIMIT, skip: 0 }),
    staleTime: 30_000,
  });

  const trades = query.data?.items ?? [];
  let closedCount = 0;
  let openCount = 0;
  let totalPnl = 0;
  for (const t of trades) {
    if (t.status === 'OPEN') {
      openCount += 1;
    } else {
      closedCount += 1;
      // pnl_usd can be null even on closed trades (BREAK edge case).
      const pnl = Number(t.pnl_usd ?? 0);
      totalPnl += pnl;
    }
  }

  return {
    trades,
    isLoading: query.isLoading,
    isError: query.isError,
    closedCount,
    openCount,
    totalPnl,
  };
}
