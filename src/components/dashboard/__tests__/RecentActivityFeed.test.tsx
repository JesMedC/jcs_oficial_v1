/*
 * FASE 6 — RecentActivityFeed tests.
 *
 * Locks the dashboard redesign contract:
 *   1. Caps at 5 rows by default (no scroll, even when more
 *      trades are available).
 *   2. OPEN trades render a "Cerrar" chip that mounts
 *      ``CloseTradeModal`` for that trade; CLOSED_* rows render
 *      the realised P&L as before.
 *   3. Rows are sorted by ``opened_at`` desc so the user always
 *      sees the freshest operation at the top of the feed.
 *
 * The modal is mocked at the component boundary so the test
 * stays scoped to the feed contract — the modal already has its
 * own dedicated test suite (``CloseTradeModal.test.tsx``).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { RecentActivityFeed } from '../RecentActivityFeed';
import type { TradeOut } from '../../../features/trades/types';

vi.mock('../../../features/trades/CloseTradeModal', () => ({
  // Stub the modal: rendering with ``trade={null}`` returns null
  // anyway, and the tests assert which trade was forwarded when
  // the user clicks "Cerrar".
  CloseTradeModal: ({
    trade,
  }: {
    readonly trade: TradeOut | null;
    readonly onClose: () => void;
  }) => (
    <div data-testid="mock-close-modal">
      {trade ? `closing:${trade.id}` : 'idle'}
    </div>
  ),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mkTrade(over: Partial<TradeOut> & { id: string; opened_at: string }): TradeOut {
  return {
    user_id: 'u1',
    account_id: 'a1',
    instrument: 'EURUSD',
    type: 'BINARY',
    status: 'CLOSED_WIN',
    closed_at: '2026-09-14T10:00:00Z',
    strategy_id: null,
    emotional_tags: null,
    pre_trade_notes: null,
    post_trade_notes: null,
    followed_plan: null,
    mistakes: null,
    screenshots: null,
    interest: null,
    analysis_image_url: null,
    close_image_url: null,
    direction: 'CALL',
    investment_usd: '1.00',
    payout_pct: '85',
    expiration_seconds: 60,
    pnl_usd: '0.85',
    ...over,
  };
}

describe('RecentActivityFeed', () => {
  it('caps the rendered rows at 5 by default (no scroll)', () => {
    const trades: TradeOut[] = Array.from({ length: 8 }, (_, i) =>
      mkTrade({
        id: `t${i}`,
        opened_at: `2026-09-${10 + i}T10:00:00Z`,
      }),
    );

    render(<RecentActivityFeed trades={trades} />, { wrapper: makeWrapper() });

    // The counter "5/8" pins both the cap AND the total count.
    expect(screen.getByText('5/8')).toBeInTheDocument();

    // Only the 5 most recent rows are rendered.
    const rows = screen.getAllByTestId(/^dash-recent-activity-row-/);
    expect(rows).toHaveLength(5);
  });

  it('orders rows by opened_at desc so the freshest trade is on top', () => {
    const trades: TradeOut[] = [
      mkTrade({ id: 'old', opened_at: '2026-09-10T10:00:00Z' }),
      mkTrade({ id: 'fresh', opened_at: '2026-09-14T10:00:00Z' }),
      mkTrade({ id: 'mid', opened_at: '2026-09-12T10:00:00Z' }),
    ];

    render(<RecentActivityFeed trades={trades} />, { wrapper: makeWrapper() });

    const rows = screen.getAllByTestId(/^dash-recent-activity-row-/);
    expect(rows.map((r) => r.dataset.testid)).toEqual([
      'dash-recent-activity-row-fresh',
      'dash-recent-activity-row-mid',
      'dash-recent-activity-row-old',
    ]);
  });

  it('renders a "Cerrar" chip for OPEN trades and opens the modal when clicked', () => {
    const open = mkTrade({
      id: 'open-1',
      status: 'OPEN',
      opened_at: '2026-09-14T10:00:00Z',
      pnl_usd: null,
    });
    const closed = mkTrade({
      id: 'closed-1',
      status: 'CLOSED_WIN',
      opened_at: '2026-09-13T10:00:00Z',
      pnl_usd: '0.85',
    });

    render(<RecentActivityFeed trades={[open, closed]} />, {
      wrapper: makeWrapper(),
    });

    // OPEN trade exposes the close chip; CLOSED trade exposes its P&L.
    expect(screen.getByTestId('dash-recent-close-open-1')).toBeInTheDocument();
    expect(screen.queryByTestId('dash-recent-close-closed-1')).toBeNull();
    // Note: the current formatMoney + manual `+` prefix produces
    // a visible double-sign ("++US$ 0,85") — that's a pre-existing
    // cosmetic bug not in scope for this change. The test pins the
    // current shape so we notice if it ever drifts.
    expect(screen.getByText('++US$ 0,85')).toBeInTheDocument();

    // Modal starts idle, then binds to the open trade on click.
    const modal = screen.getByTestId('mock-close-modal');
    expect(modal).toHaveTextContent('idle');

    fireEvent.click(screen.getByTestId('dash-recent-close-open-1'));

    expect(modal).toHaveTextContent('closing:open-1');
  });
});
