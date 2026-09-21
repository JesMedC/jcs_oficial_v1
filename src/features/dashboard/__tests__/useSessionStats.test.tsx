/*
 * one-by-one-thousand-discipline (PR-2) — useSessionStats hook test.
 *
 * Smoke-tests the wire surface:
 *   1. Disables the fetch when workspaceId is empty.
 *   2. QueryKey includes workspaceId + date range + accountId.
 *   3. The hook resolves with the SessionStats shape.
 *   4. Stale-cache regression: a cached response from a previous backend
 *      version (bands=0, general=3) must NOT survive across deploys —
 *      the hook forces a refetch on mount and overwrites the cache with
 *      the NEW shape (``sum(bands) === general.trades``).
 *
 * Slice B (sessions-configurable-cap) renamed the band literals to
 * the four real session names. The fixtures here mirror the new
 * payload — backend already returns `ASIA/LONDON/NEW_YORK/SYDNEY`
 * after Slice A merged.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../lib/api/client';
import {
  dashboardKeys,
  useSessionStats,
  type SessionStats,
} from '../hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SAMPLE: SessionStats = {
  workspace_id: 'w1',
  date_from: '2026-08-01',
  date_to: '2026-09-01',
  account_id: null,
  sessions: {
    ASIA: { trades: 1, wins: 1, winrate_pct: 100 },
    LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
    NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
    SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
  },
  general: { trades: 1, wins: 1, winrate_pct: 100 },
};

describe('useSessionStats', () => {
  it('no llama a la API cuando workspaceId está vacío', () => {
    const spy = vi.spyOn(api.apiClient, 'get');
    renderHook(
      () =>
        useSessionStats({
          workspaceId: '',
          dateFrom: '2026-08-01',
          dateTo: '2026-09-01',
        }),
      { wrapper: makeWrapper() },
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('llama al endpoint /trades/session-stats con los query params correctos', async () => {
    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({ data: SAMPLE } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () =>
        useSessionStats({
          workspaceId: 'w1',
          dateFrom: '2026-08-01',
          dateTo: '2026-09-01',
          accountId: 'a1',
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith('/trades/session-stats', {
      params: {
        workspace_id: 'w1',
        date_from: '2026-08-01',
        date_to: '2026-09-01',
        account_id: 'a1',
      },
    });
    expect(result.current.data?.general.trades).toBe(1);
  });

  it('expone queryKey estable que incluye todos los filtros', () => {
    const k = dashboardKeys.sessionStats({
      workspaceId: 'w1',
      dateFrom: '2026-08-01',
      dateTo: '2026-09-01',
      accountId: 'a1',
    });
    expect(k).toEqual([
      'dashboard',
      'session-stats',
      'w1',
      '2026-08-01',
      '2026-09-01',
      'a1',
    ]);
  });

  it('omite account_id del query string cuando es null', async () => {
    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({ data: SAMPLE } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () =>
        useSessionStats({
          workspaceId: 'w1',
          dateFrom: '2026-08-01',
          dateTo: '2026-09-01',
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const params = (spy.mock.calls[0]![1] as { params: Record<string, unknown> }).params;
    expect(params).not.toHaveProperty('account_id');
  });

  /*
   * Stale-cache regression (PR for stale TanStack Query response surviving
   * across deploys). The user's browser kept a cached payload from the OLD
   * backend where the bands summed to 0 but ``general.trades`` was 3; the
   * partition-mismatch note correctly surfaced the mismatch, but the stale
   * response itself never got overwritten because no trade was closed to
   * invalidate the dashboard query. This test seeds the cache with that
   * exact stale payload and asserts the hook forces a fresh fetch on mount
   * so the cache entry ends up holding the NEW shape (``sum(bands) ===
   * general.trades``).
   *
   * To faithfully reproduce the production scenario we instantiate the
   * QueryClient with the same defaults the app ships (``staleTime: 30s``
   * — see ``src/lib/queryClient.ts``): with those defaults a fresh
   * ``setQueryData`` keeps the entry "fresh" for 30 seconds and the
   * library-default ``refetchOnMount: true`` does NOT refetch. The hook's
   * own ``staleTime: 0`` + ``refetchOnMount: 'always'`` overrides must do
   * the work — that is what we are asserting here.
   */
  it('refresca al montarse para descartar respuesta obsoleta entre deploys', async () => {
    const STALE_FIXTURE: SessionStats = {
      workspace_id: 'w1',
      date_from: '2026-08-01',
      date_to: '2026-09-01',
      account_id: null,
      sessions: {
        ASIA: { trades: 0, wins: 0, winrate_pct: 0 },
        LONDON: { trades: 0, wins: 0, winrate_pct: 0 },
        NEW_YORK: { trades: 0, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 3, wins: 2, winrate_pct: 66 },
    };

    // NEW backend shape: sum of bands equals general.trades (partition invariant).
    const FRESH_FIXTURE: SessionStats = {
      workspace_id: 'w1',
      date_from: '2026-08-01',
      date_to: '2026-09-01',
      account_id: null,
      sessions: {
        ASIA: { trades: 1, wins: 1, winrate_pct: 100 },
        LONDON: { trades: 1, wins: 1, winrate_pct: 100 },
        NEW_YORK: { trades: 1, wins: 0, winrate_pct: 0 },
        SYDNEY: { trades: 0, wins: 0, winrate_pct: 0 },
      },
      general: { trades: 3, wins: 2, winrate_pct: 66 },
    };

    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          staleTime: 30_000,
          refetchOnWindowFocus: false,
        },
      },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );

    const key = dashboardKeys.sessionStats({
      workspaceId: 'w1',
      dateFrom: '2026-08-01',
      dateTo: '2026-09-01',
    });
    qc.setQueryData<SessionStats>(key, STALE_FIXTURE);

    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({
        data: FRESH_FIXTURE,
      } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () =>
        useSessionStats({
          workspaceId: 'w1',
          dateFrom: '2026-08-01',
          dateTo: '2026-09-01',
        }),
      { wrapper },
    );

    // The cache must NOT be served as-is: a fresh fetch must fire on mount.
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // After the fresh response, the cache holds the NEW shape (partition invariant).
    const cached = qc.getQueryData<SessionStats>(key);
    expect(cached).toBeDefined();
    const sumOfBands =
      cached!.sessions.ASIA.trades +
      cached!.sessions.LONDON.trades +
      cached!.sessions.NEW_YORK.trades +
      cached!.sessions.SYDNEY.trades;
    expect(sumOfBands).toBe(cached!.general.trades);
    expect(cached!.general.trades).toBe(3);
  });
});