/*
 * FASE 4A — hooks test.
 *
 * Smoke-tests the three read-side hooks in
 * ``src/features/trades/hooks.ts``. The mutation hook
 * (``useCloseTrade``) lives in ``useCloseTrade.test.tsx``.
 *
 * API functions are stubbed via ``vi.spyOn`` so the test stays
 * network-free and only exercises the hook contract: query key
 * shape, enabled flag, and the typed return surface.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { tradesKeys, useRiskSummary, useTrade, useTrades } from '../hooks';

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useTrades', () => {
  it('llama a listTradesApi con filtros y devuelve TradeList', async () => {
    const spy = vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 50,
    });

    const { result } = renderHook(() => useTrades({ status: 'OPEN' }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith({ status: 'OPEN' });
    expect(result.current.data?.items).toEqual([]);
  });

  it('usa queryKey estable por filtros', () => {
    expect(tradesKeys.list({ status: 'OPEN' })).toEqual([
      'trades',
      'list',
      { status: 'OPEN' },
    ]);
  });
});

describe('useRiskSummary', () => {
  it('llama a getRiskSummaryApi', async () => {
    const spy = vi.spyOn(api, 'getRiskSummaryApi').mockResolvedValue({
      level: 'green',
      daily_pnl_usd: '0',
      open_trades_count: 0,
      win_rate_today: 0,
      message: 'ok',
    });

    const { result } = renderHook(() => useRiskSummary(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalled();
    expect(result.current.data?.level).toBe('green');
  });
});

describe('useTrade (detail)', () => {
  it('no llama api cuando id es undefined', () => {
    const spy = vi.spyOn(api, 'getTradeByIdApi');
    renderHook(() => useTrade(undefined), { wrapper: makeWrapper() });
    expect(spy).not.toHaveBeenCalled();
  });
});