/*
 * one-by-one-thousand-discipline (PR-2) — useSessionStats hook test.
 *
 * Smoke-tests the wire surface:
 *   1. Disables the fetch when workspaceId is empty.
 *   2. QueryKey includes workspaceId + date range + accountId.
 *   3. The hook resolves with the SessionStats shape.
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
    EUROPA: { trades: 0, wins: 0, winrate_pct: 0 },
    NY_AMERICA: { trades: 0, wins: 0, winrate_pct: 0 },
    NY_PM: { trades: 0, wins: 0, winrate_pct: 0 },
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
});