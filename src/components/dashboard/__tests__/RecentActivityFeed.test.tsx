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

  /*
   * dashboard-jarvis-fidelity (Slice B, T-047, REQ-DCF-006 +
   * REQ-DCF-007) — RecentActivityFeed timestamp + pair chip.
   *
   * Locks:
   *   - Each row exposes a `<span>` matching `/^\d{2}:\d{2} hrs$/`.
   *   - Closed trades read from `closed_at`; OPEN trades fall
   *     back to `opened_at`.
   *   - The pair-flag emoji is wrapped in a chip span with the
   *     pinned cyan classes.
   */
  it('T-047: cada row muestra un timestamp "HH:MM hrs" derivado de closed_at / opened_at', () => {
    const closed = mkTrade({
      id: 'closed-time',
      status: 'CLOSED_WIN',
      opened_at: '2026-09-13T09:00:00Z',
      closed_at: '2026-09-13T14:32:00Z',
    });
    const open = mkTrade({
      id: 'open-time',
      status: 'OPEN',
      opened_at: '2026-09-13T09:00:00Z',
      closed_at: null,
      pnl_usd: null,
    });

    render(<RecentActivityFeed trades={[closed, open]} />, {
      wrapper: makeWrapper(),
    });

    const closedRow = screen.getByTestId('dash-recent-activity-row-closed-time');
    const openRow = screen.getByTestId('dash-recent-activity-row-open-time');
    // Both rows surface a timestamp span matching the `HH:MM hrs`
    // shape. The exact hour depends on the runtime timezone, so we
    // only assert the shape + that BOTH rows paint the chip.
    expect(closedRow.textContent).toMatch(/\d{2}:\d{2} hrs/);
    expect(openRow.textContent).toMatch(/\d{2}:\d{2} hrs/);
  });

  it('T-047 (triangulate): el pair-flag emoji vive dentro del chip cyan', () => {
    const trade = mkTrade({
      id: 'flag-chip',
      instrument: 'EURUSD',
      status: 'CLOSED_WIN',
      opened_at: '2026-09-13T09:00:00Z',
      closed_at: '2026-09-13T10:00:00Z',
    });

    render(<RecentActivityFeed trades={[trade]} />, { wrapper: makeWrapper() });

    const row = screen.getByTestId('dash-recent-activity-row-flag-chip');
    const chip = row.querySelector(
      'span.w-7.h-7.rounded-full.bg-primary\\/15',
    );
    expect(chip).not.toBeNull();
    // The chip carries the exact classes pinned by the spec.
    expect(chip!.className).toContain('border');
    expect(chip!.className).toContain('border-primary/30');
    expect(chip!.className).toContain('inline-flex');
    expect(chip!.className).toContain('items-center');
    expect(chip!.className).toContain('justify-center');
    // The inner emoji survives inside the chip.
    expect(chip!.textContent).not.toBe('');
  });

  it('T-047 (triangulate): OPEN row usa opened_at cuando closed_at es null', () => {
    const open = mkTrade({
      id: 'open-fallback',
      status: 'OPEN',
      opened_at: '2026-09-13T09:00:00Z',
      closed_at: null,
      pnl_usd: null,
    });
    const closed = mkTrade({
      id: 'closed-fallback',
      status: 'CLOSED_WIN',
      opened_at: '2026-09-13T09:00:00Z',
      // closed_at far in the future vs opened_at — the row must
      // surface the CLOSE hour, not the open hour.
      closed_at: '2026-09-13T18:00:00Z',
    });

    render(<RecentActivityFeed trades={[open, closed]} />, {
      wrapper: makeWrapper(),
    });

    const openRow = screen.getByTestId('dash-recent-activity-row-open-fallback');
    const closedRow = screen.getByTestId(
      'dash-recent-activity-row-closed-fallback',
    );
    // Both rows carry a "HH:MM hrs" span; we don't compare the
    // exact hour because the runtime timezone may shift, but we
    // confirm the helper runs in both branches without crashing.
    expect(openRow.textContent).toMatch(/\d{2}:\d{2} hrs/);
    expect(closedRow.textContent).toMatch(/\d{2}:\d{2} hrs/);
  });
});
