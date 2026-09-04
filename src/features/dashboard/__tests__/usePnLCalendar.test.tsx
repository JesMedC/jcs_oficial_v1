/*
 * one-by-one-thousand-discipline (PR-2) — usePnLCalendar hook test.
 *
 * Locks the wire surface for the month-grid P&L endpoint:
 *   1. Disabled when workspaceId is empty OR month fails the
 *      YYYY-MM regex.
 *   2. QueryKey shape stable.
 *   3. The hook resolves with the PnlCalendarMonth shape.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../lib/api/client';
import {
  dashboardKeys,
  usePnLCalendar,
  type PnlCalendarMonth,
} from '../hooks';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SAMPLE: PnlCalendarMonth = {
  workspace_id: 'w1',
  month: '2026-09',
  month_start_balance: '1000',
  month_end_balance: '1100',
  cumple: true,
  days: [],
};

describe('usePnLCalendar', () => {
  it('no llama a la API cuando workspaceId está vacío', () => {
    const spy = vi.spyOn(api.apiClient, 'get');
    renderHook(
      () => usePnLCalendar({ workspaceId: '', month: '2026-09' }),
      { wrapper: makeWrapper() },
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('no llama a la API cuando month no es YYYY-MM', () => {
    const spy = vi.spyOn(api.apiClient, 'get');
    renderHook(
      () => usePnLCalendar({ workspaceId: 'w1', month: 'septiembre' }),
      { wrapper: makeWrapper() },
    );
    expect(spy).not.toHaveBeenCalled();
  });

  it('llama al endpoint /calendar/pnl con los query params correctos', async () => {
    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({ data: SAMPLE } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () => usePnLCalendar({ workspaceId: 'w1', month: '2026-09', accountId: 'a1' }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith('/calendar/pnl', {
      params: {
        workspace_id: 'w1',
        month: '2026-09',
        account_id: 'a1',
      },
    });
    expect(result.current.data?.cumple).toBe(true);
  });

  it('expone queryKey estable', () => {
    const k = dashboardKeys.pnlCalendar({
      workspaceId: 'w1',
      month: '2026-09',
      accountId: null,
    });
    expect(k).toEqual(['dashboard', 'pnl-calendar', 'w1', '2026-09', null]);
  });
});