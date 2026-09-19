/*
 * FASE 4A — useCloseTrade test.
 *
 * Asserts the invalidation contract: closing a trade must refresh
 * the trades list (so the row moves out of the OPEN filter), the
 * accounts tree (so balance / open-position count update) AND the
 * dashboard tree (so WinrateBySessionCard refreshes the band tiles
 * for the same scope). The pattern mirrors ``useCreateTrade.test.tsx``
 * — spy on the query client, not the mutation itself.
 *
 * DVC-03 added the dashboard invalidation: the WinrateBySessionCard
 * reads `get_session_stats` and the close needs to invalidate that
 * key tree so the band tiles don't render stale 24-vs-64 splits.
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
      payload: { outcome: 'WIN' },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const keys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: readonly unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(['trades']);
    expect(keys).toContainEqual(['accounts']);
    // DVC-03 — closing a trade must also refresh the dashboard
    // tree (session-stats + pnl-calendar). Asserted against the
    // public `dashboardKeys.all` value so a future rename of the
    // key factory surface remains a single source of truth.
    expect(keys).toContainEqual(['dashboard']);
  });
});