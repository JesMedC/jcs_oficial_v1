/*
 * portal-fase0a-base — useCreateTrade.
 *
 * TanStack ``useMutation`` wrapper around ``openTradeApi``. On success
 * it invalidates the ['accounts'] list (because account state changes
 * when a new open trade is counted against the balance) and ['trades']
 * (because the user expects the trade they just submitted to land in
 * their list view). On error the drawer keeps the form open and the
 * consumer renders the envelope in a glass-alert surface.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { openTradeApi } from './api';
import type { CreateTradePayload, TradeOut } from './types';

export interface UseCreateTradeOptions {
  readonly onSuccess?: (result: TradeOut) => void;
  readonly onError?: (error: unknown) => void;
}

export function useCreateTrade(options: UseCreateTradeOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation<TradeOut, ErrorEnvelopeLike, CreateTradePayload>({
    mutationFn: (payload) => openTradeApi(payload),
    onSuccess: (data, _payload, _context) => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['trades'] });
      options.onSuccess?.(data);
    },
    onError: (error) => {
      options.onError?.(error);
    },
  });
}

export interface ErrorEnvelopeLike {
  readonly code: string;
  readonly message: string;
  readonly fields?: Readonly<Record<string, string>>;
}
