/*
 * p0d.3 — CuentasPage tests.
 *
 * Covers:
 *   1. Renderiza H1 + empty state cuando el backend no trae cuentas.
 *   2. Renderiza filas con broker / tipo / nombre / balance formateado.
 *   3. Error de la API → ErrorBanner muestra el mensaje del envelope.
 *   4. FASE 2A: cada fila expone 3 botones de acción (Fondear /
 *      Retirar / Eliminar) con data-testid por cuenta.
 *   5. KPIs del stat strip reflejan trades REALES (no la formula
 *      sintetica ``accounts.length * 7 + 12``), filtrados a las
 *      cuentas activas del usuario. Trades de cuentas eliminadas
 *      NO cuentan.
 *
 * FASE 4E-revive: el form inline de "Crear cuenta" ya no vive acá —
 * la creación pasó al modal del FAB (``<QuickActionModals>``). Se
 * sacó el test que tipeaba sobre ese form. La cobertura del flujo
 * "crear cuenta" vive ahora en
 * ``src/components/portal/__tests__/QuickActionModals.test.tsx``.
 *
 * Patrón: vitest + testing-library + userEvent + MemoryRouter +
 * HelmetProvider + mock del módulo accounts/api (igual que
 * src/pages/admin/__tests__/AdminPaymentsPage.test.tsx).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../../features/accounts/api', () => ({
  listAccountsApi: vi.fn(),
  createAccountApi: vi.fn(),
  getAccountById: vi.fn(),
  fundAccountApi: vi.fn(),
  withdrawAccountApi: vi.fn(),
  deleteAccountApi: vi.fn(),
}));

// The stat strip now drives its KPIs from `useTradesAll`. Mock the
// hook so we can inject deterministic trade lists per test.
vi.mock('../../../features/trades/useTradesAll', () => ({
  useTradesAll: vi.fn(() => ({
    trades: [],
    isLoading: false,
    isError: false,
    closedCount: 0,
    openCount: 0,
    totalPnl: 0,
  })),
}));

import { listAccountsApi } from '../../../features/accounts/api';
import { useTradesAll } from '../../../features/trades/useTradesAll';
import { CuentasPage } from '../CuentasPage';
import type { AccountOut, AccountList } from '../../../features/accounts/types';
import type { TradeOut } from '../../../features/trades/types';

const mockedList = listAccountsApi as unknown as ReturnType<typeof vi.fn>;
const mockedUseTradesAll = useTradesAll as unknown as ReturnType<typeof vi.fn>;

function buildTrades(rows: Array<Partial<TradeOut> & { account_id: string; status: TradeOut['status'] }>): TradeOut[] {
  return rows.map((r, i) => ({
    id: `trade-${i + 1}`,
    user_id: 'u-1',
    account_id: r.account_id,
    instrument: 'EURUSD',
    type: 'FOREX',
    status: r.status,
    opened_at: `2026-09-0${i + 1}T10:00:00.000Z`,
    closed_at: r.status === 'OPEN' ? null : `2026-09-0${i + 1}T11:00:00.000Z`,
    strategy_id: null,
    emotional_tags: null,
    pre_trade_notes: null,
    post_trade_notes: null,
    followed_plan: null,
    mistakes: null,
    screenshots: null,
    interest: 'PLAN',
    analysis_image_url: null,
    close_image_url: null,
    pnl_usd: r.pnl_usd ?? null,
    pair: 'EURUSD',
    direction: 'LONG',
    entry_price: '1.1',
    exit_price: r.status === 'OPEN' ? null : '1.105',
    r_multiple: null,
  }));
}

function buildAccounts(): AccountOut[] {
  return [
    {
      id: 'acc-1',
      user_id: 'u-1',
      workspace_id: 'ws-1',
      broker_name: 'Pocket Option',
      type: 'BINARY',
      name: 'Cuenta principal',
      balance_usd: '250.50',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:00:00.000Z',
    },
    {
      id: 'acc-2',
      user_id: 'u-1',
      workspace_id: 'ws-1',
      broker_name: 'IC Markets',
      type: 'FOREX',
      name: 'Swing EURUSD',
      balance_usd: '1024.00',
      created_at: '2026-09-01T10:00:00.000Z',
      updated_at: '2026-09-01T10:00:00.000Z',
    },
  ];
}

function emptyList(): AccountList {
  return { items: [], total: 0, skip: 0, limit: 50 };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <MemoryRouter>
          <CuentasPage />
        </MemoryRouter>
      </HelmetProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the trade mock back to its module-level default
  // ("no trades") between tests so a per-test override doesn't leak
  // into the next one.
  mockedUseTradesAll.mockReturnValue({
    trades: [],
    isLoading: false,
    isError: false,
    closedCount: 0,
    openCount: 0,
    totalPnl: 0,
  });
});

describe('CuentasPage', () => {
  it('renders H1 + empty state when api returns no items', async () => {
    mockedList.mockResolvedValueOnce(emptyList());
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Mis cuentas' })).toBeInTheDocument();
    });
    expect(
      screen.getByText(/No tenés cuentas todavía\. Usá el botón \+ \(abajo a la derecha\) para crear la primera\./),
    ).toBeInTheDocument();
  });

  it('renders list rows with broker, type, name and formatted balance', async () => {
    mockedList.mockResolvedValueOnce({
      items: buildAccounts(),
      total: 2,
      skip: 0,
      limit: 50,
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });
    expect(screen.getByText('IC Markets')).toBeInTheDocument();
    expect(screen.getByText('Cuenta principal')).toBeInTheDocument();
    expect(screen.getByText('Swing EURUSD')).toBeInTheDocument();
    // Two binary/forex badges — at least one of each.
    expect(screen.getAllByText('Binary').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Forex').length).toBeGreaterThanOrEqual(1);
    // Balances rendered with USD currency formatter.
    expect(screen.getAllByText('$250.50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('$1,024.00').length).toBeGreaterThanOrEqual(1);
  });

  it('shows ErrorBanner when listAccountsApi rejects', async () => {
    mockedList.mockRejectedValueOnce({
      code: 'INTERNAL_ERROR',
      message: 'No pudimos cargar las cuentas. Intenta de nuevo.',
      correlation_id: 'abc12345-1234-5678-9abc-def012345678',
    });
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByText('No pudimos cargar las cuentas. Intenta de nuevo.'),
      ).toBeInTheDocument();
    });
  });

  it('FASE 2A: cada fila expone los 3 botones de acción (Fondear / Retirar / Eliminar)', async () => {
    mockedList.mockResolvedValueOnce({
      items: buildAccounts(),
      total: 2,
      skip: 0,
      limit: 50,
    });
    renderPage();

    // Wait for both rows to render before asserting on per-account buttons.
    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
      expect(screen.getByText('IC Markets')).toBeInTheDocument();
    });

    // Two rows × three buttons = 6 buttons with these test IDs.
    expect(screen.getByTestId('fund-acc-1')).toBeInTheDocument();
    expect(screen.getByTestId('withdraw-acc-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-acc-1')).toBeInTheDocument();
    expect(screen.getByTestId('fund-acc-2')).toBeInTheDocument();
    expect(screen.getByTestId('withdraw-acc-2')).toBeInTheDocument();
    expect(screen.getByTestId('delete-acc-2')).toBeInTheDocument();

    // Spanish button copy.
    expect(screen.getAllByRole('button', { name: 'Fondear' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Retirar' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Eliminar' })).toHaveLength(2);
  });

  it('KPIs del stat strip derivan de trades reales, NO de accounts.length * 7 + 12', async () => {
    // One active account with $100 balance — under the old synthetic
    // formula the Operaciones card would have shown
    // ``1 * 7 + 12 = 19`` regardless of trade data. The fix replaces
    // that with the real trade count for the active account.
    mockedList.mockResolvedValueOnce({
      items: [
        {
          id: 'acc-1',
user_id: 'u-1',
      workspace_id: 'ws-1',
      broker_name: 'Pocket Option',
          type: 'BINARY',
          name: 'Cuenta principal',
          balance_usd: '100.00',
          created_at: '2026-08-15T10:00:00.000Z',
          updated_at: '2026-08-15T10:00:00.000Z',
        },
      ],
      total: 1,
      skip: 0,
      limit: 50,
    });
    mockedUseTradesAll.mockReturnValue({
      trades: buildTrades([
        { account_id: 'acc-1', status: 'CLOSED_WIN', pnl_usd: '120' },
        { account_id: 'acc-1', status: 'CLOSED_LOSS', pnl_usd: '-50' },
        { account_id: 'acc-1', status: 'OPEN', pnl_usd: null },
      ]),
      isLoading: false,
      isError: false,
      closedCount: 2,
      openCount: 1,
      totalPnl: 70,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });

    // The Operaciones card shows the trade count from the mock (3),
    // NOT the old synthetic value of 19 that the bug produced for
    // ``accounts.length === 1``.
    const operacionesCard = screen
      .getByText('Operaciones')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(operacionesCard).not.toBeNull();
    expect(operacionesCard!).toHaveTextContent('3');
    expect(operacionesCard!).not.toHaveTextContent('19');

    // P&L neto comes from real closed-trade pnl_usd: +120 + (-50) = +70.
    const pnlCard = screen
      .getByText('P&L neto')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(pnlCard).not.toBeNull();
    expect(pnlCard!).toHaveTextContent('$70.00');

    // Win rate from real wins/losses: 1 win / 2 decided = 50%.
    const winRateCard = screen
      .getByText('Win rate')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(winRateCard).not.toBeNull();
    expect(winRateCard!).toHaveTextContent('50%');
    expect(winRateCard!).toHaveTextContent('1 gan. / 1 per.');
  });

  it('excluye trades de cuentas inactivas (borradas / soft-deleted)', async () => {
    // The backend already scopes trades by ``user_id``, but the
    // soft-deleted account's trades may still come back in the list
    // if the backend hasn't garbage-collected them. The client-side
    // filter MUST drop them — that's the whole bug.
    mockedList.mockResolvedValueOnce({
      items: [
        {
          id: 'acc-1',
user_id: 'u-1',
      workspace_id: 'ws-1',
      broker_name: 'Pocket Option',
          type: 'BINARY',
          name: 'Cuenta principal',
          balance_usd: '200.00',
          created_at: '2026-08-15T10:00:00.000Z',
          updated_at: '2026-08-15T10:00:00.000Z',
        },
      ],
      total: 1,
      skip: 0,
      limit: 50,
    });
    mockedUseTradesAll.mockReturnValue({
      trades: buildTrades([
        { account_id: 'acc-1', status: 'CLOSED_WIN', pnl_usd: '50' },
        { account_id: 'deleted-account-id', status: 'CLOSED_LOSS', pnl_usd: '-999' },
        { account_id: 'another-deleted-account', status: 'CLOSED_WIN', pnl_usd: '999' },
      ]),
      isLoading: false,
      isError: false,
      closedCount: 3,
      openCount: 0,
      totalPnl: 50,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });

    // Only the 1 trade belonging to acc-1 should count.
    const operacionesCard = screen
      .getByText('Operaciones')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(operacionesCard).not.toBeNull();
    expect(operacionesCard!).toHaveTextContent('1');
    expect(operacionesCard!).not.toHaveTextContent('3');

    // P&L must reflect the filtered set: only +$50 from the active
    // account's win. The deleted accounts' gains and losses must NOT
    // leak into the total even though the backend returned them.
    const pnlCard = screen
      .getByText('P&L neto')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(pnlCard).not.toBeNull();
    expect(pnlCard!).toHaveTextContent('$50.00');

    // Win rate: 1 win / 1 decided = 100% on the active account only.
    const winRateCard = screen
      .getByText('Win rate')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(winRateCard).not.toBeNull();
    expect(winRateCard!).toHaveTextContent('100%');
  });

  it('Win rate refleja wins/losses reales, no la formula sintetica 12 + accounts.length % 5', async () => {
    // Two accounts, mix of wins and losses. The old synthetic formula
    // produced ``12 + (2 % 5) = 14`` wins and ``round(14 * 0.37) = 5``
    // losses (clamped to max(2, 5) = 5), giving a win rate of
    // ``round(14 / 19 * 100) = 74%``. The fix replaces that with the
    // real ratio from the trade data.
    mockedList.mockResolvedValueOnce({
      items: buildAccounts(),
      total: 2,
      skip: 0,
      limit: 50,
    });
    mockedUseTradesAll.mockReturnValue({
      trades: [
        ...buildTrades([
          { account_id: 'acc-1', status: 'CLOSED_WIN', pnl_usd: '10' },
          { account_id: 'acc-1', status: 'CLOSED_LOSS', pnl_usd: '-5' },
          { account_id: 'acc-1', status: 'CLOSED_WIN', pnl_usd: '20' },
          { account_id: 'acc-2', status: 'CLOSED_LOSS', pnl_usd: '-8' },
        ]),
      ],
      isLoading: false,
      isError: false,
      closedCount: 4,
      openCount: 0,
      totalPnl: 17,
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Pocket Option')).toBeInTheDocument();
    });

    // Real wins/losses: 2 wins (acc-1), 2 losses (1 acc-1 + 1 acc-2)
    // → 50% win rate.
    const winRateCard = screen
      .getByText('Win rate')
      .closest('[class*="rounded-lg"]') as HTMLElement | null;
    expect(winRateCard).not.toBeNull();
    expect(winRateCard!).toHaveTextContent('50%');
    expect(winRateCard!).toHaveTextContent('2 gan. / 2 per.');
    // The synthetic label "+24.0% win rate" is gone for good.
    expect(winRateCard!).not.toHaveTextContent('+24.0% win rate');
  });
});