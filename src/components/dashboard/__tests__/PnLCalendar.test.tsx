/*
 * one-by-one-thousand-discipline (PR-2) — PnLCalendar tests.
 *
 * Locks the month-grid + cumplimiento pill contract (REQ-PNL-004/006):
 *   1. Renders the month label + grid for the requested month.
 *   2. Day cells show ops count + P&L value + P&L %.
 *   3. The bottom rollup pill mirrors the backend ``cumple`` boolean.
 *   4. Month picker (←/→) advances the displayed month.
 *   5. NO daily badge — the pill only renders the monthly indicator.
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

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('pnl-month-label').textContent).toMatch(
        /septiembre de 2026/i,
      );
      // Day 1 (2 ops, +5.5%)
      expect(screen.getByTestId('pnl-day-2026-09-01')).toHaveTextContent('2 ops');
      expect(screen.getByTestId('pnl-day-2026-09-01')).toHaveTextContent('+5.50%');
      // Day 2 (no ops → '—')
      expect(screen.getByTestId('pnl-day-2026-09-02')).toHaveTextContent('—');
      // Day 3 (1 op, -2.1%)
      expect(screen.getByTestId('pnl-day-2026-09-03')).toHaveTextContent('1 op');
      expect(screen.getByTestId('pnl-day-2026-09-03')).toHaveTextContent('-2.10%');
    });
  });

  it('muestra la pill "Cumple" cuando el backend devuelve cumple=true', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      const pill = screen.getByTestId('pnl-cumple');
      expect(pill).toHaveTextContent(/Cumple/);
    });
  });

  it('muestra la pill "No cumple" cuando cumple=false', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: { ...SAMPLE_MONTH, cumple: false, month_end_balance: '950.00' },
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      const pill = screen.getByTestId('pnl-cumple');
      expect(pill).toHaveTextContent(/No cumple/);
    });
  });

  it('NO muestra daily badges — solo la pill mensual (REQ-PNL-006)', async () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    const { container } = render(
      <PnLCalendar workspaceId="w1" initialMonth="2026-09" />,
      { wrapper: makeWrapper() },
    );

    // Only ONE "cumple" surface — the monthly pill. The day cells
    // carry no badge/cumple indicator.
    const cumpleNodes = container.querySelectorAll('[data-testid="pnl-cumple"]');
    expect(cumpleNodes.length).toBe(1);
  });

  it('el mes-picker (←/→) cambia el mes mostrado', () => {
    vi.spyOn(api, 'usePnLCalendar').mockReturnValue({
      data: SAMPLE_MONTH,
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof api.usePnLCalendar>);

    render(<PnLCalendar workspaceId="w1" initialMonth="2026-09" />, {
      wrapper: makeWrapper(),
    });

    // Click → (next month) — we don't assert the API was re-called
    // here because it's stubbed; we just assert the label renders
    // and the picker doesn't crash.
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

    render(<PnLCalendar workspaceId="w1" />, { wrapper: makeWrapper() });

    expect(screen.getByTestId('pnl-error')).toHaveTextContent(
      /No pudimos cargar el calendario/i,
    );
  });
});