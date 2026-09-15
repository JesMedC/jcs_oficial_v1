/*
 * one-by-one-thousand-discipline (PR-2) + FIX-4 — usePnLCalendar hook test.
 *
 * Locks the wire surface for the month-grid P&L endpoint:
 *   1. Disabled when workspaceId is empty OR month fails the
 *      YYYY-MM regex.
 *   2. QueryKey shape stable (now includes ``tz``).
 *   3. The hook resolves with the PnlCalendarMonth shape.
 *   4. FIX-4 — when ``tz`` is set the hook forwards it as a query
 *      param so the backend can override ``user.timezone``.
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
  capital_base: '1000',
  net_pnl_usd: '100',
  monthly_rendimiento_pct: 10,
  monthly_deposits_total: '0',
  monthly_withdrawals_total: '0',
  variacion_pct: 10,
  avg_pnl_pct: 0,
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

  it('FIX-4: pasa ``tz`` como query param cuando el caller lo setea', async () => {
    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({ data: SAMPLE } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () =>
        usePnLCalendar({
          workspaceId: 'w1',
          month: '2026-09',
          accountId: null,
          tz: 'America/Santiago',
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(spy).toHaveBeenCalledWith('/calendar/pnl', {
      params: {
        workspace_id: 'w1',
        month: '2026-09',
        tz: 'America/Santiago',
      },
    });
    expect(result.current.data?.cumple).toBe(true);
  });

  it('FIX-4: NO agrega ``tz`` cuando el caller lo deja null/undefined/""', async () => {
    const spy = vi
      .spyOn(api.apiClient, 'get')
      .mockResolvedValue({ data: SAMPLE } as Awaited<ReturnType<typeof api.apiClient.get>>);

    const { result } = renderHook(
      () =>
        usePnLCalendar({
          workspaceId: 'w1',
          month: '2026-09',
          accountId: null,
          tz: null,
        }),
      { wrapper: makeWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const call = spy.mock.calls[0];
    expect(call).toBeDefined();
    const params = call![1]?.params as Record<string, unknown> | undefined;
    expect(params).toBeDefined();
    expect(params!.tz).toBeUndefined();
  });

  it('expone queryKey estable', () => {
    const k = dashboardKeys.pnlCalendar({
      workspaceId: 'w1',
      month: '2026-09',
      accountId: null,
      tz: null,
    });
    expect(k).toEqual([
      'dashboard',
      'pnl-calendar',
      'w1',
      '2026-09',
      null,
      null,
    ]);
  });

  it('FIX-4: queryKey incluye ``tz`` para que dos TZs distintas no compartan cache', () => {
    const k1 = dashboardKeys.pnlCalendar({
      workspaceId: 'w1',
      month: '2026-09',
      accountId: null,
      tz: 'America/Santiago',
    });
    const k2 = dashboardKeys.pnlCalendar({
      workspaceId: 'w1',
      month: '2026-09',
      accountId: null,
      tz: 'America/Buenos_Aires',
    });
    expect(k1).not.toEqual(k2);
  });
});