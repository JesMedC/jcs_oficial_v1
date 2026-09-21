/*
 * p0e.5/FASE 4A — TanStack query hooks for the trades feature.
 *
 * Three read-side hooks (``useTrades``, ``useTrade``, ``useRiskSummary``)
 * over the API surface in ``./api.ts``. ``keepPreviousData`` on the
 * list hook avoids the empty-state flicker when the user changes a
 * filter (status, type, pagination). ``useRiskSummary`` polls every
 * 60s because the topbar semaphore + dashboard guard rail expect
 * near-real-time feedback after a close.
 *
 * The write-side hook (``useCloseTrade``) lives in its own file
 * because it's the first mutation that needs to invalidate sibling
 * query trees — colocating it here would muddy the read-side
 * responsibilities.
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { getRiskSummaryApi, getTradeByIdApi, listTradesApi } from './api';
import type {
  ListTradesParams,
  RiskSummary,
  TradeList,
  TradeOut,
} from './types';

/**
 * Centralised query keys for the trades tree. Other features that
 * need to invalidate the trade list (e.g. ``useCloseTrade`` in
 * ``useCloseTrade.ts``) import this object so the key shape stays
 * in one place.
 */
export const tradesKeys = {
  all: ['trades'] as const,
  list: (filters: ListTradesParams) => [...tradesKeys.all, 'list', filters] as const,
  detail: (id: string) => [...tradesKeys.all, 'detail', id] as const,
  riskSummary: () => [...tradesKeys.all, 'risk-summary'] as const,
};

/**
 * Paginated trade list. ``placeholderData: keepPreviousData`` keeps
 * the previous page rendered while the new filter is fetching, so
 * switching ``status`` from OPEN to CLOSED doesn't blank the table.
 *
 * ``staleTime`` matches the other portal lists — 30s is enough to
 * coalesce rapid filter changes without serving stale data on a
 * manual refresh.
 */
export function useTrades(filters: ListTradesParams = {}) {
  return useQuery<TradeList>({
    queryKey: tradesKeys.list(filters),
    queryFn: () => listTradesApi(filters),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/**
 * Single-trade detail fetcher. Disabled until ``id`` is truthy so
 * callers can wire it before the route param resolves.
 */
export function useTrade(id: string | undefined) {
  return useQuery<TradeOut>({
    queryKey: id ? tradesKeys.detail(id) : ['trades', 'detail', 'noop'],
    queryFn: () => getTradeByIdApi(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

/**
 * Aggregated risk snapshot for the active session. Polls every 60s
 * because the topbar semaphore + dashboard guard rail expect
 * near-real-time feedback after a close. ``staleTime`` stays under
 * the poll interval so the cached value is considered fresh while
 * the next poll is in flight.
 */
export function useRiskSummary() {
  return useQuery<RiskSummary>({
    queryKey: tradesKeys.riskSummary(),
    queryFn: getRiskSummaryApi,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}