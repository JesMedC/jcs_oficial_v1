/*
 * DVC-01 — RecentActivityFeed portal-mount integration test.
 *
 * Asserts the close-trade dialog escapes the RecentActivityFeed
 * subtree (the backdrop-blur ancestor that creates a containing
 * stacking context). The original RecentActivityFeed test mocks
 * CloseTradeModal at the component boundary; this one mounts the
 * REAL CloseTradeModal so the portal mount is on the test path.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';

import { RecentActivityFeed } from '../RecentActivityFeed';
import type { TradeOut } from '../../../features/trades/types';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function mkOpenTrade(id: string): TradeOut {
  return {
    id,
    user_id: 'u1',
    account_id: 'a1',
    instrument: 'EURUSD',
    type: 'BINARY',
    status: 'OPEN',
    opened_at: '2026-09-14T10:00:00Z',
    closed_at: null,
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
    investment_usd: '50.00',
    payout_pct: '85',
    expiration_seconds: 60,
    pnl_usd: null,
  };
}

describe('RecentActivityFeed — close-trade dialog portal mount (DVC-01)', () => {
  it('the close-trade dialog renders at document.body, NOT inside the feed (backdrop-blur ancestor)', () => {
    const trade = mkOpenTrade('open-portal-1');
    render(<RecentActivityFeed trades={[trade]} />, { wrapper: makeWrapper() });

    // Click the close chip — the real CloseTradeModal mounts the
    // Modal primitive, which createPortals into document.body.
    fireEvent.click(screen.getByTestId('dash-recent-close-open-portal-1'));

    const dialog = screen.getByRole('dialog');
    const feed = screen.getByTestId('dash-recent-activity');

    // The feed subtree (which carries the backdrop-blur ancestor)
    // does NOT contain the dialog — the portal moves the dialog
    // out of the feed and into document.body.
    expect(feed.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });
});
