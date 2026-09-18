/*
 * ScannerPage — high-level smoke test.
 *
 * Locks the structural contract that the new view ships with:
 *   - Renders the grid layout (left column + right column).
 *   - The alert panel header ("Señales del bot") is present.
 *   - The chart's pair selector defaults to "EUR/USD" (the spec's
 *     "default first pair of the scanner universe").
 *
 * We mock `useScannerAlerts` so the WS doesn't fire in jsdom, and
 * `fetchChart` so the chart doesn't hit the REST endpoint. The
 * lightweight-charts canvas mounts (it's just a div under the
 * ResizeObserver stub from src/test/setup.ts) and renders the page.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

import * as scannerAlertsHook from '../../../features/scanner/useScannerAlerts';
import * as scannerApi from '../../../features/scanner/scannerApi';
import { ScannerPage } from '../ScannerPage';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <HelmetProvider>
      <MemoryRouter>
        <QueryClientProvider client={qc}>{children}</QueryClientProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  vi.spyOn(scannerAlertsHook, 'useScannerAlerts').mockReturnValue({
    alerts: [],
    clear: () => undefined,
    connected: false,
  });
  vi.spyOn(scannerApi, 'fetchChart').mockResolvedValue({
    pair: 'EUR/USD',
    timeframe: '5m',
    candles: [],
    ema: { period: 200, values: [] },
    stochastic: { k: [], d: [], overbought: 90, oversold: 10 },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ScannerPage', () => {
  it('renders the grid layout with the left + right columns', async () => {
    render(<ScannerPage />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('scanner-page-grid')).toBeInTheDocument();
    expect(screen.getByTestId('scanner-page-left-column')).toBeInTheDocument();
    expect(screen.getByTestId('scanner-page-right-column')).toBeInTheDocument();
    // Wait for the chart's lazy fetchChart call to settle so the
    // pair selector has its default value committed.
    await waitFor(() => {
      expect(screen.getByTestId('scanner-chart-pair-select')).toBeInTheDocument();
    });
  });

  it('renders the alert panel header "Señales del bot"', () => {
    render(<ScannerPage />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('scanner-alert-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scanner-alert-panel-header').textContent).toContain(
      'Señales del bot',
    );
  });

  it('defaults the pair selector to EUR/USD', async () => {
    render(<ScannerPage />, { wrapper: makeWrapper() });
    const select = await screen.findByTestId(
      'scanner-chart-pair-select',
    ) as HTMLSelectElement;
    expect(select.value).toBe('EUR/USD');
  });

  it('renders the page title "Scanner"', () => {
    render(<ScannerPage />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('scanner-page-title').textContent).toBe('Scanner');
  });
});
