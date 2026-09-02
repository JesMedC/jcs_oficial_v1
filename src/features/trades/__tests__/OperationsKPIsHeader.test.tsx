/*
 * FASE 4A — OperationsKPIsHeader render tests.
 *
 * Locks the three contracts the header card promises:
 *   - renders the loading skeleton while the summary is in flight.
 *   - paints the three cards from ``getRiskSummaryApi`` once it
 *     resolves, including the localised money + percent strings.
 *   - flips the P&L card to ``text-loss`` when the daily figure is
 *     negative.
 *
 * The API is stubbed via ``vi.spyOn(api, 'getRiskSummaryApi')``
 * (same pattern as ``hooks.test.tsx``) so the test stays
 * network-free.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { OperationsKPIsHeader } from '../OperationsKPIsHeader';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('OperationsKPIsHeader', () => {
  it('muestra loading skeleton', () => {
    vi.spyOn(api, 'getRiskSummaryApi').mockImplementation(
      () => new Promise(() => {}),
    );
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('operations-kpis-loading')).toBeInTheDocument();
  });

  it('renderiza 3 cards con datos del summary', async () => {
    vi.spyOn(api, 'getRiskSummaryApi').mockResolvedValue({
      level: 'green',
      daily_pnl_usd: '150.50',
      open_trades_count: 3,
      win_rate_today: 0.75,
      message: 'ok',
    });
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
      expect(screen.getByTestId('kpi-open')).toHaveTextContent('3');
      expect(screen.getByTestId('kpi-pnl')).toHaveTextContent('150,50');
      expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('75');
    });
  });

  it('colorea P&L en rojo cuando es negativo', async () => {
    vi.spyOn(api, 'getRiskSummaryApi').mockResolvedValue({
      level: 'red',
      daily_pnl_usd: '-200.00',
      open_trades_count: 5,
      win_rate_today: 0,
      message: 'pérdida',
    });
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('kpi-pnl')).toHaveClass('text-loss');
    });
  });
});
