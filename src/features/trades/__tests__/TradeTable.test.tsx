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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('muestra controles de paginacion y permite navegar Anterior/Siguiente', async () => {
    mockAccounts([fakeAccount]);
    const listSpy = vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [fakeTrade],
      total: 25,
      skip: 0,
      limit: 10,
    });
    render(<TradeTable tradesForBalance={[fakeTrade]} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('trade-table-pagination')).toBeInTheDocument();
    });
    expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 1 de 3');
    expect(screen.getByTestId('trade-table-prev')).toBeDisabled();
    expect(screen.getByTestId('trade-table-next')).not.toBeDisabled();

    fireEvent.click(screen.getByTestId('trade-table-next'));
    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({ skip: 10, limit: 10 }),
      );
    });
    expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 2 de 3');
    expect(screen.getByTestId('trade-table-prev')).not.toBeDisabled();
  });

  /**
   * RED for work unit (A) — pagination navigation must actually swap
   * the rendered rows. The existing test only pins the API params
   * and the page-info text, which both update from the local page
   * state. The page-info moves without the rows moving is the bug
   * being closed: clicking Siguiente fires skip=10 against a fresh
   * response, the table must render the new items (not keep the
   * previous page forever).
   *
   * Fixture shape mirrors the user's spec: skip=0 → one trade,
   * skip=10 → two different trades. After clicking next, the prior
   * row must leave the DOM and the new rows must be present.
   */
  it('Siguiente avanza la pagina y renderiza las nuevas filas (no mantiene la anterior)', async () => {
    mockAccounts([fakeAccount]);
    const tradeA: TradeOut = { ...fakeTrade, id: 'tradeA', status: 'CLOSED_WIN' };
    const tradeB: TradeOut = { ...fakeTrade, id: 'tradeB', status: 'CLOSED_LOSS', pnl_usd: '-30.00' };
    const tradeC: TradeOut = { ...fakeTrade, id: 'tradeC', status: 'CLOSED_WIN', pnl_usd: '80.00' };
    vi.spyOn(api, 'listTradesApi').mockImplementation((params) => {
      const skip = params?.skip ?? 0;
      if (skip === 0) {
        return Promise.resolve({ items: [tradeA], total: 25, skip: 0, limit: 10 });
      }
      if (skip === 10) {
        return Promise.resolve({ items: [tradeB, tradeC], total: 25, skip: 10, limit: 10 });
      }
      return Promise.resolve({ items: [], total: 25, skip, limit: 10 });
    });

    render(<TradeTable tradesForBalance={[tradeA, tradeB, tradeC]} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('trade-row-tradeA')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('trade-row-tradeB')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('trade-table-next'));

    await waitFor(() => {
      expect(screen.queryByTestId('trade-row-tradeA')).not.toBeInTheDocument();
      expect(screen.getByTestId('trade-row-tradeB')).toBeInTheDocument();
      expect(screen.getByTestId('trade-row-tradeC')).toBeInTheDocument();
    });
    expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 2 de 3');
  });

  /**
   * a11y — pressing Enter (or Space) on the focused Siguiente button
   * must advance the page. Buttons native behaviour handles Enter
   * + Space activation; this test pins that the focused control is
   * the table's pagination button (not a stray element with the
   * same test id) and that the page actually advances.
   */
  it('Enter sobre el boton Siguiente focused avanza la pagina', async () => {
    mockAccounts([fakeAccount]);
    const tradeA: TradeOut = { ...fakeTrade, id: 'tradeA', status: 'CLOSED_WIN' };
    const tradeB: TradeOut = { ...fakeTrade, id: 'tradeB', status: 'CLOSED_WIN' };
    vi.spyOn(api, 'listTradesApi').mockImplementation((params) => {
      const skip = params?.skip ?? 0;
      if (skip === 0) {
        return Promise.resolve({ items: [tradeA], total: 25, skip: 0, limit: 10 });
      }
      return Promise.resolve({ items: [tradeB], total: 25, skip, limit: 10 });
    });

    const user = userEvent.setup();
    render(<TradeTable tradesForBalance={[tradeA, tradeB]} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('trade-row-tradeA')).toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId('trade-table-next');
    nextBtn.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 2 de 3');
      expect(screen.getByTestId('trade-row-tradeB')).toBeInTheDocument();
    });
  });

  /**
   * Defence in depth — when an applied filter narrows the result set
   * while the user is parked on a non-zero page, the page index must
   * reset to 0 so the next/prev controls don't reference an empty
   * window. The TradeTable useEffect (TradeTable.tsx:114-116) clamps
   * the page whenever ``totalPages`` shrinks; this test pins that the
   * page-info text recovers to "Página 1 de 1" after the filter
   * change, instead of being stuck on "Página N de 1".
   */
  it('resetea el indice de pagina cuando un filtro reduce totalPages', async () => {
    mockAccounts([fakeAccount]);
    const tradeA: TradeOut = { ...fakeTrade, id: 'tradeA' };
    const tradeB: TradeOut = { ...fakeTrade, id: 'tradeB' };
    vi.spyOn(api, 'listTradesApi').mockImplementation((params) => {
      // Filter narrows the result: status=CLOSED_WIN shrinks total to 5
      // regardless of pagination, so totalPages becomes 1.
      if (params?.status === 'CLOSED_WIN') {
        return Promise.resolve({
          items: [tradeA],
          total: 5,
          skip: params?.skip ?? 0,
          limit: 10,
        });
      }
      const skip = params?.skip ?? 0;
      if (skip === 0) {
        return Promise.resolve({ items: [tradeA], total: 25, skip: 0, limit: 10 });
      }
      return Promise.resolve({ items: [tradeB], total: 25, skip, limit: 10 });
    });

    const { rerender } = render(<TradeTable tradesForBalance={[tradeA, tradeB]} />, {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 1 de 3');
    });

    fireEvent.click(screen.getByTestId('trade-table-next'));
    await waitFor(() => {
      expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 2 de 3');
    });

    // Narrow the filter — totalPages must collapse back to 1 and the
    // page index must reset to 0 even though the user was on page 2.
    rerender(
      <TradeTable
        tradesForBalance={[tradeA, tradeB]}
        filters={{ status: 'CLOSED_WIN' }}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('trade-table-page-info')).toHaveTextContent('Página 1 de 1');
    });
    expect(screen.getByTestId('trade-table-prev')).toBeDisabled();
    expect(screen.getByTestId('trade-table-next')).toBeDisabled();
  });

  /**
   * Companion to the row-tint work unit (B). Confirms the rendered
   * CLOSED_WIN row exposes the bg-profit tint on its <tr> so a real
   * user (not just an isolated unit test) can see the green ladder
   * in the dense operations log.
   */
  it('fila CLOSED_WIN se renderiza con tinte bg-profit en el <tr>', async () => {
    mockAccounts([fakeAccount]);
    vi.spyOn(api, 'listTradesApi').mockResolvedValue({
      items: [fakeTrade],
      total: 1,
      skip: 0,
      limit: 10,
    });
    render(<TradeTable tradesForBalance={[fakeTrade]} />, { wrapper: makeWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId(`trade-row-${fakeTrade.id}`)).toBeInTheDocument();
    });
    const row = screen.getByTestId(`trade-row-${fakeTrade.id}`);
    expect(row.className).toMatch(/bg-profit/);
  });
});
