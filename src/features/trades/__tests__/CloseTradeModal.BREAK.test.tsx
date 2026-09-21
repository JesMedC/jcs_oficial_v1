/*
 * one-by-one-thousand-discipline (PR-2) — CloseTradeModal BREAK + image.
 *
 * Locks the PR-2 wire contract for the BINARY close form:
 *   1. Three radios: WIN / LOSS / BREAK (BREAK is wire-selectable
 *      per decision #4 #178).
 *   2. Selecting BREAK sends ``outcome: 'BREAK'`` on the wire.
 *   3. The ``close_image_url`` upload control renders.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { CloseTradeModal } from '../CloseTradeModal';
import type { TradeOut } from '../types';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const binaryTrade: TradeOut = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD-1m',
  type: 'BINARY',
  status: 'OPEN',
  opened_at: new Date().toISOString(),
  closed_at: null,
  strategy_id: null,
  emotional_tags: null,
  pre_trade_notes: null,
  post_trade_notes: null,
  followed_plan: null,
  mistakes: null,
  screenshots: null,
  pnl_usd: null,
  direction: 'CALL',
  exit_price: null,
  investment_usd: '50.00',
  payout_pct: '85.00',
  expiration_seconds: 60,
  // PR-2 fields:
  interest: null,
  analysis_image_url: null,
  close_image_url: null,
};

const forexTrade: TradeOut = {
  ...binaryTrade,
  id: 't2',
  type: 'FOREX',
  instrument: 'EURUSD',
  pair: 'EURUSD',
  lot_size: '0.10',
  entry_price: '1.0800',
  stop_loss: null,
  take_profit: null,
  risk_amount_usd: null,
  risk_pct: null,
  r_multiple: null,
  // FOREX branch carries different fields, drop the BINARY ones
  // (exactOptionalPropertyTypes forbids literal undefined).
};

describe('CloseTradeModal — PR-2 BREAK + image upload', () => {
  it('muestra los 3 radios WIN/LOSS/BREAK en el BINARY form', async () => {
    render(<CloseTradeModal trade={binaryTrade} onClose={() => {}} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByTestId('close-outcome-WIN')).toBeInTheDocument();
      expect(screen.getByTestId('close-outcome-LOSS')).toBeInTheDocument();
      expect(screen.getByTestId('close-outcome-BREAK')).toBeInTheDocument();
    });
  });

  it('envía outcome=BREAK cuando el usuario elige la opción BREAK', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);

    render(<CloseTradeModal trade={binaryTrade} onClose={() => {}} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => screen.getByTestId('close-outcome-BREAK'));

    fireEvent.click(screen.getByTestId('close-outcome-BREAK'));
    fireEvent.click(screen.getByTestId('close-submit'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent).toHaveProperty('outcome', 'BREAK');
    // Backend has extra="forbid" — never send ``type``.
    expect(sent).not.toHaveProperty('type');
  });

  it('muestra el control de imagen de cierre en ambos formularios', async () => {
    const { unmount } = render(
      <CloseTradeModal trade={binaryTrade} onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => {
      expect(screen.getByTestId('close-image-file')).toBeInTheDocument();
    });
    unmount();

    render(<CloseTradeModal trade={forexTrade} onClose={() => {}} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByTestId('close-image-file')).toBeInTheDocument();
    });
  });
});