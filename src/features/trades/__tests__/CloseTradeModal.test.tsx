/*
 * FASE 4A / Ola 5 — CloseTradeModal render + wire tests.
 *
 * Locks the four contracts the modal promises:
 *
 *   1. null guard — when ``trade`` is null the component returns
 *      ``null`` and the form is not in the DOM.
 *   2. FOREX branch — exit_price input is rendered and the user can
 *      submit a numeric exit price.
 *   3. BINARY branch — three outcome radios (WIN/LOSS) are rendered
 *      (BREAK is intentionally absent: backend computes
 *      CLOSED_BREAK server-side, the wire format only exposes the
 *      two outcomes the user actually decides on).
 *   4. submit success — a valid FOREX submit calls closeTradeApi
 *      with the typed exit price and fires onClose (which the row
 *      uses to unmount the modal).
 *
 * ``closeTradeApi`` is intercepted via ``vi.spyOn`` on the api
 * namespace — vitest ESM live-bindings ensure the spy is observed
 * by ``useCloseTrade``, which imports the same function by name.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as api from '../api';
import { CloseTradeModal } from '../CloseTradeModal';
import type { TradeOut } from '../types';

/**
 * Hand-rolled FOREX trade — covers every required field of
 * ``TradeOut`` plus the FOREX-only columns the modal reads back
 * (pair, direction, entry_price).
 */
const forexTrade: TradeOut = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD',
  type: 'FOREX',
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
  pair: 'EURUSD',
  lot_size: '0.10',
  direction: 'LONG',
  entry_price: '1.0800',
  exit_price: null,
  stop_loss: null,
  take_profit: null,
  risk_amount_usd: null,
  risk_pct: null,
  r_multiple: null,
  // PR-2 fields:
  interest: 'PLAN',
  analysis_image_url: null,
  close_image_url: null,
};

/**
 * Hand-rolled BINARY trade — mirrors the FOREX shape but with the
 * BINARY-only fields populated (instrument carries the broker
 * descriptor, investment_usd replaces lot_size). FOREX-only fields
 * are omitted (not set to ``undefined``) because
 * ``exactOptionalPropertyTypes`` forbids literal ``undefined`` on
 * optional properties.
 */
const binaryTrade: TradeOut = {
  id: 't2',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD-1m',
  type: 'BINARY',
  status: 'OPEN',
  opened_at: forexTrade.opened_at,
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
  interest: 'FOMO',
  analysis_image_url: null,
  close_image_url: null,
};

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

describe('CloseTradeModal', () => {
  it('no renderiza nada si trade es null', () => {
    const { container } = render(
      <CloseTradeModal trade={null} onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );
    expect(container.querySelector('[data-testid="close-trade-modal"]')).toBeNull();
  });

  it('renderiza form FOREX con input exit_price', async () => {
    render(<CloseTradeModal trade={forexTrade} onClose={() => {}} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByTestId('close-trade-modal')).toBeInTheDocument();
      expect(screen.getByTestId('close-exit-price')).toBeInTheDocument();
    });
    // BINARY branch controls must NOT be rendered in the FOREX form.
    expect(screen.queryByTestId('close-outcome-WIN')).toBeNull();
    expect(screen.queryByTestId('close-outcome-LOSS')).toBeNull();
  });

  it('renderiza form BINARY con 3 opciones de outcome (WIN/LOSS/BREAK)', async () => {
    // one-by-one-thousand-discipline PR-2 — BREAK is now
    // wire-selectable (decision #4 #178). Backend
    // ``TradeCloseIn.outcome`` widens to Literal["WIN","LOSS","BREAK"]
    // so the modal exposes all three radios.
    render(<CloseTradeModal trade={binaryTrade} onClose={() => {}} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => {
      expect(screen.getByTestId('close-trade-modal')).toBeInTheDocument();
      expect(screen.getByTestId('close-outcome-WIN')).toBeInTheDocument();
      expect(screen.getByTestId('close-outcome-LOSS')).toBeInTheDocument();
    });
    // BREAK is wire-selectable in PR-2 — the backend accepts it.
    expect(screen.getByTestId('close-outcome-BREAK')).toBeInTheDocument();
    // FOREX-only exit_price input must NOT be in the BINARY form.
    expect(screen.queryByTestId('close-exit-price')).toBeNull();
  });

  it('llama closeTradeApi y onClose en submit exitoso FOREX', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    const onClose = vi.fn();

    render(<CloseTradeModal trade={forexTrade} onClose={onClose} />, {
      wrapper: makeWrapper(),
    });
    await waitFor(() => screen.getByTestId('close-exit-price'));

    // '1.5' survives the schema transform (Number('1.5').toString() === '1.5');
    // using a trailing-zero input would mutate the wire payload and
    // mask a regression in the transform.
    fireEvent.change(screen.getByTestId('close-exit-price'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByTestId('close-submit'));

    await waitFor(() => {
      // FOREX branch: payload must carry exit_price but NOT 'type'
      // (TradeCloseIn has extra="forbid"; the backend discriminates
      // by the loaded trade.type server-side).
      expect(spy).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ exit_price: '1.5' }),
      );
      const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
      expect(sent).not.toHaveProperty('type');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('no envía `type` en el payload (backend lo rechaza con extra=forbid)', async () => {
    // Regression: la consigna del bug 422 — CloseTradeModal
    // construía `{ type: 'BINARY', outcome: 'WIN', ... }` y el
    // backend lo rechazaba con 422 VALIDATION_ERROR
    // "Extra inputs are not permitted". El form sólo usa `type`
    // como discriminator interno de Zod; el wire payload no lo
    // debe incluir.
    const spy = vi.spyOn(api, 'closeTradeApi').mockResolvedValue(
      {} as Awaited<ReturnType<typeof api.closeTradeApi>>,
    );
    render(
      <CloseTradeModal trade={binaryTrade} onClose={() => {}} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => screen.getByTestId('close-outcome-WIN'));
    fireEvent.click(screen.getByTestId('close-outcome-WIN'));
    fireEvent.click(screen.getByTestId('close-submit'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent).not.toHaveProperty('type');
    // Sanity: el discriminator interno del form se descarta, pero
    // los campos propios del BINARY branch sí viajan.
    expect(sent).toHaveProperty('outcome', 'WIN');
  });
});