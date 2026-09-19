/*
 * p0e.5/FASE 4A — useCloseTrade.
 *
 * TanStack ``useMutation`` wrapper around ``closeTradeApi``. On
 * success it invalidates:
 *
 *   - ``['trades']`` — the row that just closed must disappear from
 *     the OPEN filter and appear under its CLOSED_* sibling.
 *   - ``['accounts']`` — closing a trade changes the account balance
 *     and the open-position count surfaced on the dashboard.
 *   - ``['dashboard']`` (DVC-03) — the WinrateBySessionCard /
 *     DashboardSummaryStrip read `get_session_stats` and the P&L
 *     calendar under the `dashboardKeys.all` prefix; closing a trade
 *     must refresh that tree so the band tiles and the cumulative
 *     P&L reflect the new closed trade without a manual reload.
 *     The key is imported from ``features/dashboard/hooks`` so the
 *     single source of truth for query-key shapes stays in one
 *     place (test in ``useCloseTrade.test.tsx``).
 *
 * Lives in its own file (vs. ``useCreateTrade.ts``) because the
 * payload here is a discriminated union that depends on the trade
 * type — splitting it keeps the simpler create-flow file readable.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { closeTradeApi } from './api';
import { tradesKeys } from './hooks';
import { dashboardKeys } from '../dashboard/hooks';
import type { CloseTradePayload, TradeOut } from './types';

interface CloseTradeArgs {
  readonly id: string;
  readonly payload: CloseTradePayload;
}

export function useCloseTrade() {
  const queryClient = useQueryClient();

  return useMutation<TradeOut, Error, CloseTradeArgs>({
    mutationFn: ({ id, payload }) => closeTradeApi(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tradesKeys.all });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}