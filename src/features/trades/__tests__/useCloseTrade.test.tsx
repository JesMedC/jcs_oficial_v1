/*
 * FASE 4A — useCloseTrade test.
 *
 * Asserts the invalidation contract: closing a trade must refresh
 * the trades list (so the row moves out of the OPEN filter) and the
 * accounts tree (so balance / open-position count update). The
 * pattern mirrors ``useCreateTrade.test.tsx`` — spy on the query
 * client, not the mutation itself.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { useCloseTrade } from '../useCloseTrade';

describe('useCloseTrade', () => {
  it('invalida trades + accounts en success', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(api, 'closeTradeApi').mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCloseTrade(), { wrapper });
    result.current.mutate({
      id: 't1',
      payload: { type: 'BINARY', outcome: 'WIN' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: readonly unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(['trades']);
    expect(keys).toContainEqual(['accounts']);
  });
});