/*
 * portal-fase0a-base — useCreateTrade hook smoke test.
 *
 * Validates the invalidation contract from
 * openspec/changes/portal-fase0a-base/specs/trade-ingestion: on success
 * the ['accounts'] and ['trades'] query keys are invalidated so the
 * portal chrome (sidebar counts, CuentasPage list, etc.) reflects the
 * new open trade. We stub the API + set up a small QueryClient with
 * cached data so we can observe the invalidation.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../api', () => ({
  openTradeApi: vi.fn(async () => ({
    id: 'trade-1',
    user_id: 'u-1',
    account_id: 'a-1',
    instrument: 'EURUSD',
    type: 'FOREX',
    status: 'OPEN',
    opened_at: '2026-09-02T15:00:00Z',
    closed_at: null,
    strategy_id: null,
    emotional_tags: null,
    pre_trade_notes: null,
    post_trade_notes: null,
    followed_plan: null,
    mistakes: null,
    screenshots: null,
  })),
}));

import { openTradeApi } from '../api';
import { useCreateTrade } from '../useCreateTrade';
import type { ReactNode } from 'react';

const mockedOpen = openTradeApi as unknown as ReturnType<typeof vi.fn>;

function wrap(client: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  mockedOpen.mockClear();
});

describe('useCreateTrade', () => {
  it('on success invalidates ["accounts"] and ["trades"]', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTrade(), { wrapper: wrap(client) });
    await act(async () => {
      await result.current.mutateAsync({
        type: 'FOREX',
        account_id: 'a-1',
        instrument: 'EURUSD',
        pair: 'EURUSD',
        direction: 'LONG',
        entry_price: '1.085',
        lot_size: '0.1',
        stop_loss: null,
        take_profit: null,
        interest: 'PLAN',
      });
    });

    const keys = invalidateSpy.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
    expect(keys).toContainEqual(['accounts']);
    expect(keys).toContainEqual(['trades']);
  });
});
