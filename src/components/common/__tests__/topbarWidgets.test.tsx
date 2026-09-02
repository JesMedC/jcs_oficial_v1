/*
 * portal-fase0a-base — tests for the three topbar widgets.
 *
 * Each widget owns a single integration with its backing source; the
 * tests assert the read-from-source contract plus the click -> store
 * contract. jsdom's render doesn't ship a layout engine so visual
 * placement / responsive classes are not asserted here.
 *
 * RiskSemaphore is wired to ``useRiskSummary()`` since FASE 4A —
 * the test wraps it with a QueryClientProvider and stubs
 * ``getRiskSummaryApi`` so the rendered level is deterministic and
 * independent from the network.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { RiskSemaphore } from '../RiskSemaphore';
import { CommandPaletteTrigger } from '../CommandPaletteTrigger';
import { NewTradeButton } from '../NewTradeButton';
import * as tradesApi from '../../../features/trades/api';
import { useCommandPalette } from '../../../stores/useCommandPalette';
import { useNewTradeDrawer } from '../../../stores/useNewTradeDrawer';

function makeRiskClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function RiskWrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={makeRiskClient()}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  useCommandPalette.setState({ isOpen: false });
  useNewTradeDrawer.setState({ isOpen: false });
});

describe('RiskSemaphore', () => {
  it('renders green by default with the P&L suffix in aria-label', async () => {
    vi.spyOn(tradesApi, 'getRiskSummaryApi').mockResolvedValue({
      level: 'green',
      daily_pnl_usd: '0',
      open_trades_count: 0,
      win_rate_today: 0,
      message: 'ok',
    });
    render(<RiskSemaphore />, { wrapper: RiskWrapper });
    await waitFor(() =>
      expect(
        screen.getByTestId('risk-semaphore').getAttribute('aria-label'),
      ).toBe('Riesgo: green (P&L hoy: $0)'),
    );
  });

  it('reflects level from the API response (red case)', async () => {
    vi.spyOn(tradesApi, 'getRiskSummaryApi').mockResolvedValue({
      level: 'red',
      daily_pnl_usd: '-150.00',
      open_trades_count: 4,
      win_rate_today: 0.25,
      message: 'Stop diario recomendado',
    });
    render(<RiskSemaphore />, { wrapper: RiskWrapper });
    await waitFor(() =>
      expect(
        screen.getByTestId('risk-semaphore').getAttribute('aria-label'),
      ).toBe('Riesgo: red (P&L hoy: $-150.00)'),
    );
    expect(screen.getByTestId('risk-semaphore').getAttribute('title')).toBe(
      'Stop diario recomendado',
    );
  });
});

describe('CommandPaletteTrigger', () => {
  it('click invokes useCommandPalette.open()', () => {
    render(<CommandPaletteTrigger />);
    fireEvent.click(screen.getByTestId('command-palette-trigger'));
    expect(useCommandPalette.getState().isOpen).toBe(true);
  });
});

describe('NewTradeButton', () => {
  it('click invokes useNewTradeDrawer.open()', () => {
    render(<NewTradeButton />);
    fireEvent.click(screen.getByTestId('new-trade-button'));
    expect(useNewTradeDrawer.getState().isOpen).toBe(true);
  });
});