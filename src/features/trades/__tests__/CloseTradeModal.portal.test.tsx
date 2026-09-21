/*
 * DVC-01 — CloseTradeModal portal / footer / smoke regression tests.
 *
 * Locks the DVC-01 contract that survives the refactor:
 *
 *   1. The close-trade dialog mounts at document.body (escapes the
 *      backdrop-blur ancestor from RecentActivityFeed) — same
 *      contract as the Modal primitive test, asserted through the
 *      real consumer this time.
 *   2. Footer submit buttons (`close-cancel`, `close-submit`) live
 *      OUTSIDE the long form body — they are siblings of the form
 *      inside the modal panel so they stay anchored on mobile.
 *   3. The submit button is associated with the form via `form=`
 *      so clicking it dispatches the React Hook Form submit handler
 *      that calls `closeTradeApi`.
 *   4. WIN / LOSS / BREAK paths still send the correct payload and
 *      fire `onClose` on success.
 *   5. The close-image uploader still renders inside the form body
 *      (pending uploads unchanged).
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
  id: 't-bin',
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
  interest: 'FOMO',
  analysis_image_url: null,
  close_image_url: null,
  direction: 'CALL',
  exit_price: null,
  investment_usd: '50.00',
  payout_pct: '85.00',
  expiration_seconds: 60,
  pnl_usd: null,
};

const forexTrade: TradeOut = {
  ...binaryTrade,
  id: 't-fx',
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
  // Drop BINARY-only fields (exactOptionalPropertyTypes forbids literal undefined).
  direction: 'LONG',
};

describe('CloseTradeModal — DVC-01 portal / footer placement', () => {
  it('the close-trade dialog renders at document.body (escapes the caller subtree)', () => {
    // Mounting wrapper carries a backdrop-blur ancestor — this is
    // the same containing-stacking-context trap the real dashboard
    // has via RecentActivityFeed.
    const { getByTestId } = render(
      <div data-testid="caller-backdrop" className="backdrop-blur-md">
        <CloseTradeModal trade={binaryTrade} onClose={() => undefined} />
      </div>,
      { wrapper: makeWrapper() },
    );

    const dialog = screen.getByRole('dialog');
    const caller = getByTestId('caller-backdrop');
    expect(caller.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('footer submit lives OUTSIDE the long form body (anchored at panel bottom)', () => {
    render(<CloseTradeModal trade={binaryTrade} onClose={() => undefined} />, {
      wrapper: makeWrapper(),
    });

    const dialog = screen.getByRole('dialog');
    const form = screen.getByTestId('close-trade-modal');
    const submit = screen.getByTestId('close-submit');
    const cancel = screen.getByTestId('close-cancel');

    // Both footer actions live inside the dialog but OUTSIDE the
    // form — they are siblings of the form body so a long form can
    // scroll inside its own container without pushing them offscreen.
    expect(dialog.contains(submit)).toBe(true);
    expect(dialog.contains(cancel)).toBe(true);
    expect(form.contains(submit)).toBe(false);
    expect(form.contains(cancel)).toBe(false);
  });

  it('footer submit triggers the form via form="<id>" association (BINARY WIN)', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    const onClose = vi.fn();

    render(
      <CloseTradeModal trade={binaryTrade} onClose={onClose} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => screen.getByTestId('close-outcome-WIN'));

    fireEvent.click(screen.getByTestId('close-outcome-WIN'));
    fireEvent.click(screen.getByTestId('close-submit'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent).toHaveProperty('outcome', 'WIN');
    expect(sent).not.toHaveProperty('type');
    expect(onClose).toHaveBeenCalled();
  });

  it('footer submit triggers the form via form="<id>" association (BINARY LOSS)', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    const onClose = vi.fn();

    render(
      <CloseTradeModal trade={binaryTrade} onClose={onClose} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => screen.getByTestId('close-outcome-LOSS'));

    fireEvent.click(screen.getByTestId('close-outcome-LOSS'));
    fireEvent.click(screen.getByTestId('close-submit'));

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
    });
    const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent).toHaveProperty('outcome', 'LOSS');
    expect(onClose).toHaveBeenCalled();
  });

  it('BINARY BREAK payload is preserved (regression)', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    render(
      <CloseTradeModal trade={binaryTrade} onClose={() => undefined} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => screen.getByTestId('close-outcome-BREAK'));
    fireEvent.click(screen.getByTestId('close-outcome-BREAK'));
    fireEvent.click(screen.getByTestId('close-submit'));
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const sent = spy.mock.calls[0]![1] as Record<string, unknown>;
    expect(sent).toHaveProperty('outcome', 'BREAK');
  });

  it('FOREX submit via footer submit still calls closeTradeApi with the typed exit price', async () => {
    const spy = vi
      .spyOn(api, 'closeTradeApi')
      .mockResolvedValue({} as Awaited<ReturnType<typeof api.closeTradeApi>>);
    render(
      <CloseTradeModal trade={forexTrade} onClose={() => undefined} />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => screen.getByTestId('close-exit-price'));
    fireEvent.change(screen.getByTestId('close-exit-price'), {
      target: { value: '1.5' },
    });
    fireEvent.click(screen.getByTestId('close-submit'));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith(
        't-fx',
        expect.objectContaining({ exit_price: '1.5' }),
      );
    });
  });

  it('close-image upload control still renders in BINARY + FOREX forms', () => {
    const { rerender } = render(
      <CloseTradeModal trade={binaryTrade} onClose={() => undefined} />,
      { wrapper: makeWrapper() },
    );
    expect(screen.getByTestId('close-image-file')).toBeInTheDocument();
    rerender(
      <CloseTradeModal trade={forexTrade} onClose={() => undefined} />,
    );
    expect(screen.getByTestId('close-image-file')).toBeInTheDocument();
  });
});
