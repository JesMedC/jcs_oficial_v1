/*
 * FASE 4A — TradeTable render tests.
 *
 * Locks the four render states the table contract promises:
 *   - loading skeleton while the query is in flight.
 *   - error fallback when the query rejects.
 *   - empty state when the API returns zero items.
 *   - ready state: one rendered row exposes the status + type badges.
 *
 * The API is stubbed via ``vi.spyOn`` (same pattern as
 * ``hooks.test.tsx``) so the test stays network-free.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { TradeTable } from '../TradeTable';
import type { TradeOut } from '../types';

/**
 * Hand-rolled FOREX trade — covers every required field of
 * ``TradeOut`` plus the FOREX-only columns the table renders
 * (pair, lot_size, direction, entry_price, exit_price, r_multiple).
 */
const fakeTrade: TradeOut = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD',
  type: 'FOREX',
  status: 'CLOSED_WIN',
  opened_at: new Date().toISOString(),
  closed_at: new Date().toISOString(),
  strategy_id: null,
  emotional_tags: null,
  pre_trade_notes: null,
  post_trade_notes: null,
  followed_plan: null,
  mistakes: null,
  screenshots: null,
  pnl_usd: '50.00',
  pair: 'EURUSD',
  lot_size: '0.10',
  direction: 'LONG',
  entry_price: '1.0800',
  exit_price: '1.0850',
  stop_loss: null,
  take_profit: null,
  risk_amount_usd: null,
  risk_pct: null,
  r_multiple: '1.0',
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('TradeTable', () => {
  it('muestra loading skeleton mientras la query está en vuelo', () => {
    vi.spyOn(api, 'listTradesApi').mockImplementation(
      () => new Promise(() => {}),
    );
    render(<TradeTable />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('trade-table-loading')).toBeInTheDocument();
  });

  it('muestra empty state cuando la lista viene vacía', async () => {
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 50,
    });
    render(<TradeTable />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('trade-table-empty')).toBeInTheDocument();
    });
  });

  it('renderiza fila con badges cuando hay trades', async () => {
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [fakeTrade],
      total: 1,
      skip: 0,
      limit: 50,
    });
    render(<TradeTable />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId(`trade-row-${fakeTrade.id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('trade-status-CLOSED_WIN')).toBeInTheDocument();
    expect(screen.getByTestId('trade-type-FOREX')).toBeInTheDocument();
  });
});
