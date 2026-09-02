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
 *
 * Lives in its own file (vs. ``useCreateTrade.ts``) because the
 * payload here is a discriminated union that depends on the trade
 * type — splitting it keeps the simpler create-flow file readable.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { closeTradeApi } from './api';
import { tradesKeys } from './hooks';
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
    },
  });
}