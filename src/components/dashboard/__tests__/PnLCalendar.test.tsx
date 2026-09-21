/*
 * one-by-one-thousand-discipline (PR-2) — PnLCalendar tests.
 *
 * Locks the FASE 6 redesign contract:
 *   1. Month grid + day cells with ops count + P&L + %.
 *   2. KPI bar surfaces the monthly ``cumple`` boolean (FASE 6
 *      moved it into the KPI bar — the standalone pill is gone).
 *   3. NO daily badges — the indicator is monthly-only (REQ-PNL-006).
 *   4. Day cells are clickable and the detail panel mounts below.
 *   5. FIX-4: the browser TZ is forwarded to the hook.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../../../features/dashboard/hooks';
import { PnLCalendar } from '../PnLCalendar';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const SAMPLE_MONTH = {
  workspace_id: 'w1',
  month: '2026-09',
  month_start_balance: '1000.00',
  month_end_balance: '1100.00',
  cumple: true,
  days: [
    {
      date: '2026-09-01',
      ops_count: 2,
      day_start_balance: '50.00',
      pnl_pct: 5.5,
    },
    {
      date: '2026-09-02',
      ops_count: 0,
      day_start_balance: '0',
      pnl_pct: 0,
    },
    {
      date: '2026-09-03',
      ops_count: 1,
      day_start_balance: '-20.00',
      pnl_pct: -2.1,
    },
  ],
};

describe('PnLCalendar', () => {
  it('renderiza el label del mes y los day cells con ops + P&L + %', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('pnl-month-label').textContent).toMatch(
        /septiembre de 2026/i,
      );
      expect(screen.getByTestId('pnl-day-2026-09-01')).toHaveTextContent('2 ops');
      expect(screen.getByTestId('pnl-day-2026-09-01')).toHaveTextContent('+5.50%');
      expect(screen.getByTestId('pnl-day-2026-09-02')).toHaveTextContent('—');
      expect(screen.getByTestId('pnl-day-2026-09-03')).toHaveTextContent('1 op');
      expect(screen.getByTestId('pnl-day-2026-09-03')).toHaveTextContent('-2.10%');
    });
  });

  it('la KPI bar muestra "CUMPLE" cuando el backend devuelve cumple=true', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('pnl-month-kpis')).toHaveTextContent(/CUMPLE/);
      // The new design surfaces it inside the KPI bar (not as a
      // standalone pill anymore).
      expect(screen.queryByTestId('pnl-cumple')).toBeNull();
    });
  });

  it('la KPI bar muestra "NO CUMPLE" cuando cumple=false', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: { ...SAMPLE_MONTH, cumple: false, month_end_balance: '950.00' },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('pnl-month-kpis')).toHaveTextContent(/NO CUMPLE/);
    });
  });

  it('NO muestra daily badges — el indicador es mensual (REQ-PNL-006)', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    const { container } = render(
      <PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />,
      { wrapper: makeWrapper() },
    );

    // The cumple indicator surfaces exactly ONCE — inside the KPI bar.
    const cumpleCount = container.querySelectorAll('[data-testid="pnl-cumple"]').length;
    expect(cumpleCount).toBe(0); // legacy testid is gone
    // The day cells should NOT carry cumple indicators (no badge / pill per day).
    const dayCumple = container.querySelectorAll('[data-testid^="pnl-day-"] [class*="cumple"]').length;
    expect(dayCumple).toBe(0);
  });

  it('click en un día con ops abre el panel de detalle con tabs', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
      wrapper: makeWrapper(),
    });

    // Day 1 has 2 ops — click it.
    fireEvent.click(screen.getByTestId('pnl-day-2026-09-01'));

    await waitFor(() => {
      expect(screen.getByTestId('pnl-day-detail')).toBeInTheDocument();
      expect(screen.getByTestId('pnl-day-tab-operaciones')).toBeInTheDocument();
      expect(screen.getByTestId('pnl-day-tab-capital')).toBeInTheDocument();
    });
  });

  it('el mes-picker (←/→) cambia el mes mostrado', () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
      wrapper: makeWrapper(),
    });

    fireEvent.click(screen.getByTestId('pnl-next-month'));
    expect(screen.getByTestId('pnl-month-label')).toBeInTheDocument();
  });

  it('muestra fallback legible cuando el fetch falla', () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('boom'),
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" tradesForDayPanel={[]} />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('pnl-error')).toHaveTextContent(
      /No pudimos cargar el calendario/i,
    );
  });

  it('FIX-4: pasa el browser TZ como ``tz`` filter cuando difiere de UTC', () => {
    const spy = vi
      .spyOn(api, 'usePnLCalendar')
      .mockReturnValue({
        data: SAMPLE_MONTH,
        isLoading: false,
        isError: false,
        error: null,
      } as unknown as ReturnType<typeof api.usePnLCalendar>);
    vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(
      ((..._args: unknown[]) => ({
        resolvedOptions: () => ({ timeZone: 'America/Santiago' } as Intl.ResolvedDateTimeFormatOptions),
        format: () => '',
        formatToParts: () => [],
      })) as unknown as typeof Intl.DateTimeFormat,
    );
    try {
      render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" tradesForDayPanel={[]} />, {
        wrapper: makeWrapper(),
      });
      expect(spy).toHaveBeenCalled();
      const lastCall = spy.mock.calls[spy.mock.calls.length - 1];
      const filters = lastCall![0] as { tz?: string };
      expect(filters.tz).toBe('America/Santiago');
    } finally {
      vi.restoreAllMocks();
    }
  });
});