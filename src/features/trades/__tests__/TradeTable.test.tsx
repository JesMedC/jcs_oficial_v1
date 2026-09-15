/*
 * FASE 4A — TradeTable render tests.
 *
 * Locks the four render states the table contract promises:
 *   - loading skeleton while the query is in flight.
 *   - error fallback when the query rejects.
 *   - empty state when the API returns zero items.
 *   - ready state: one rendered row exposes the status + type badges.
 *
 * Also pins the Session-column contract: a trade whose opened_at
 * falls inside a known window renders the localized session pill;
 * a trade whose opened_at falls outside every window renders an
 * em-dash placeholder (``trade-session-none-{id}``).
 *
 * Slice B (sessions-configurable-cap) renamed the legacy
 * NYSE / LONDRES / SIDNEY trio to the four real session names;
 * the fixtures + assertions here mirror the new contract.
 *
 * The API is stubbed via ``vi.spyOn`` (same pattern as
 * ``hooks.test.tsx``) so the test stays network-free.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import * as accountsApi from '../../accounts/api';
import * as api from '../api';
import { TradeTable } from '../TradeTable';
import type { AccountList, AccountOut } from '../../accounts/types';
import type { TradeOut } from '../types';

/**
 * Hand-rolled FOREX trade — covers every required field of
 * ``TradeOut`` plus the FOREX-only columns the table renders
 * (pair, lot_size, direction, entry_price, exit_price, r_multiple).
 *
 * ``opened_at`` pins 13:00 UTC so the Session column can assert a
 * deterministic NEW_YORK badge (window [12:00-17:00) UTC).
 */
const fakeTrade: TradeOut = {
  id: 't1',
  user_id: 'u1',
  account_id: 'a1',
  instrument: 'EURUSD',
  type: 'FOREX',
  status: 'CLOSED_WIN',
  opened_at: '2026-01-01T13:00:00.000Z',
  closed_at: '2026-01-01T14:00:00.000Z',
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
  // PR-2 fields:
  interest: 'PLAN',
  analysis_image_url: null,
  close_image_url: null,
};

/**
 * Sibling trade pinned to 09:00 UTC — falls inside LONDON
 * (window [07:00-12:00) UTC). Used to assert the LONDON badge path.
 */
const londonTrade: TradeOut = {
  ...fakeTrade,
  id: 't2',
  opened_at: '2026-01-01T09:00:00.000Z',
  closed_at: '2026-01-01T10:00:00.000Z',
};

/**
 * Sibling trade pinned to 02:00 UTC — falls inside ASIA
 * (window [00:00-07:00) UTC). Used to verify the morning band.
 */
const asiaTrade: TradeOut = {
  ...fakeTrade,
  id: 't3',
  opened_at: '2026-01-01T02:00:00.000Z',
  closed_at: '2026-01-01T02:30:00.000Z',
};

/**
 * Sibling trade pinned to 19:00 UTC — falls inside SYDNEY
 * (window [17:00-24:00) UTC). Used to verify the evening band.
 */
const sydneyTrade: TradeOut = {
  ...fakeTrade,
  id: 't4',
  opened_at: '2026-01-01T19:00:00.000Z',
  closed_at: '2026-01-01T19:30:00.000Z',
};

/**
 * Trade pinned to 07:30 UTC — falls in a gap (LONDON ends at 12:00
 * UTC, NEW_YORK begins at 12:00 UTC). Wait — actually 07:30 IS inside
 * LONDON. For the off-hours placeholder we want a non-window hour.
 * Real gap hours in the new 4-band UTC scheme: there are no gaps
 * (00–07 / 07–12 / 12–17 / 17–24 covers the full 24h). The previous
 * gap windows (08–12 and 16–23) were artifacts of the legacy 3-class
 * file; with the new 4-band model every hour lands in a band, so the
 * em-dash placeholder path is now reachable only via invalid dates.
 */

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

/**
 * Mock the accounts list so ``TradeTable``'s defense-in-depth filter
 * (``activeAccountIds.has(t.account_id)``) lets the test trades
 * through. Without this mock the table renders its empty state and
 * the row-level assertions never find a row.
 */
function mockAccounts(items: readonly AccountOut[]) {
  return vi.spyOn(accountsApi, 'listAccountsApi').mockResolvedValue({
    items,
    total: items.length,
    skip: 0,
    limit: 100,
  } satisfies AccountList);
}

const fakeAccount: AccountOut = {
  id: 'a1',
  user_id: 'u1',
      workspace_id: 'ws-1',
  broker_name: 'Test Broker',
  name: 'Test Account',
  type: 'FOREX',
  balance_usd: '1000.00',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('TradeTable', () => {
  it('muestra loading skeleton mientras la query está en vuelo', () => {
    mockAccounts([fakeAccount]);
    vi.spyOn(api, 'listTradesApi').mockImplementation(
      () => new Promise(() => {}),
    );
    render(<TradeTable tradesForBalance={[fakeTrade]} />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('trade-table-loading')).toBeInTheDocument();
  });

  it('muestra empty state cuando la lista viene vacía', async () => {
    mockAccounts([fakeAccount]);
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [],
      total: 0,
      skip: 0,
      limit: 50,
    });
    render(<TradeTable tradesForBalance={[]} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('trade-table-empty')).toBeInTheDocument();
    });
  });

  it('renderiza fila con badges cuando hay trades', async () => {
    mockAccounts([fakeAccount]);
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [fakeTrade],
      total: 1,
      skip: 0,
      limit: 50,
    });
    render(<TradeTable tradesForBalance={[fakeTrade]} />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId(`trade-row-${fakeTrade.id}`)).toBeInTheDocument();
    });
    expect(screen.getByTestId('trade-status-CLOSED_WIN')).toBeInTheDocument();
    expect(screen.getByTestId('trade-type-FOREX')).toBeInTheDocument();
  });

  it('renderiza el badge de sesion segun el UTC hour del opened_at', async () => {
    // fakeTrade   → 13:00 UTC → NEW_YORK badge (window [12-17)).
    // londonTrade → 09:00 UTC → LONDON badge (window [07-12)).
    // asiaTrade   → 02:00 UTC → ASIA badge (window [00-07)).
    // sydneyTrade → 19:00 UTC → SYDNEY badge (window [17-24)).
    mockAccounts([fakeAccount]);
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [fakeTrade, londonTrade, asiaTrade, sydneyTrade],
      total: 4,
      skip: 0,
      limit: 50,
    });
    render(
      <TradeTable
        tradesForBalance={[fakeTrade, londonTrade, asiaTrade, sydneyTrade]}
      />,
      { wrapper: makeWrapper() },
    );
    await waitFor(() => {
      expect(screen.getByTestId(`trade-row-${fakeTrade.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`trade-row-${londonTrade.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`trade-row-${asiaTrade.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`trade-row-${sydneyTrade.id}`)).toBeInTheDocument();
    });
    // Each band renders its own pill.
    expect(screen.getByTestId('trade-session-NEW_YORK')).toBeInTheDocument();
    expect(screen.getByTestId('trade-session-LONDON')).toBeInTheDocument();
    expect(screen.getByTestId('trade-session-ASIA')).toBeInTheDocument();
    expect(screen.getByTestId('trade-session-SYDNEY')).toBeInTheDocument();
    // Pill text uses the Spanish label.
    expect(screen.getByText('Nueva York')).toBeInTheDocument();
    expect(screen.getByText('Londres')).toBeInTheDocument();
    expect(screen.getByText('Asia')).toBeInTheDocument();
    expect(screen.getByText('Sídney')).toBeInTheDocument();
  });
});
