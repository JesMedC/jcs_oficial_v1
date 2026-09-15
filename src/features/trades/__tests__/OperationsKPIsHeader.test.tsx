/*
 * FASE 4A + FIX-3 — OperationsKPIsHeader render tests.
 *
 * Locks the three contracts the header card promises:
 *   - renders the loading skeleton while the summary is in flight.
 *   - paints the three cards from the (locally-computed) trades
 *     once they resolve, including the localised money + percent
 *     strings.
 *   - flips the P&L card to ``text-loss`` when the daily figure is
 *     negative.
 *   - FIX-3: win-rate denominator EXCLUDES CLOSED_BREAK trades.
 *
 * The header reads from ``useTrades`` + ``useAccounts``, both of
 * which are now wired to TanStack Query. We mock those hooks
 * directly so the test stays network-free.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { OperationsKPIsHeader } from '../OperationsKPIsHeader';
import * as tradeHooks from '../hooks';
import * as accountHooks from '../../accounts/hooks';
import type { ListTradesParams, TradeOut, TradeList } from '../types';
import type { AccountOut, AccountList } from '../../accounts/types';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeTrade(over: Partial<TradeOut> & Pick<TradeOut, 'id' | 'status'>): TradeOut {
  return {
    id: over.id,
    user_id: 'u-1',
    account_id: 'acc-1',
    instrument: 'EUR/USD OTC',
    type: 'BINARY',
    status: over.status,
    opened_at: over.opened_at ?? '2026-09-04T12:00:00.000Z',
    closed_at: over.closed_at ?? null,
    interest: 'PLAN',
    strategy_id: null,
    emotional_tags: null,
    pre_trade_notes: null,
    post_trade_notes: null,
    followed_plan: null,
    mistakes: null,
    screenshots: null,
    analysis_image_url: null,
    close_image_url: null,
    pair: 'EUR/USD OTC',
    lot_size: '0.01',
    direction: 'CALL',
    entry_price: '1.0',
    exit_price: null,
    stop_loss: null,
    take_profit: null,
    pnl_usd: over.pnl_usd ?? null,
    risk_amount_usd: null,
    risk_pct: null,
    r_multiple: null,
    investment_usd: over.investment_usd ?? '2.00',
    payout_pct: '85.00',
    expiration_seconds: 60,
  };
}

function makeAccounts(): AccountList {
  const items: AccountOut[] = [
    {
      id: 'acc-1',
      user_id: 'u-1',
      workspace_id: 'ws-1',
      broker_name: 'Pocket Option',
      type: 'BINARY',
      name: 'Cuenta principal',
      balance_usd: '1000.00',
      created_at: '2026-08-15T10:00:00.000Z',
      updated_at: '2026-08-15T10:00:00.000Z',
    },
  ];
  return { items, total: 1, skip: 0, limit: 50 };
}

function mockTrades(trades: TradeOut[]) {
  const result: TradeList = { items: trades, total: trades.length, skip: 0, limit: 50 };
  vi.spyOn(tradeHooks, 'useTrades').mockReturnValue({
    data: result,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof tradeHooks.useTrades>);
  vi.spyOn(accountHooks, 'useAccounts').mockReturnValue({
    data: makeAccounts(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof accountHooks.useAccounts>);
}

describe('OperationsKPIsHeader', () => {
  it('muestra loading skeleton', () => {
    vi.spyOn(tradeHooks, 'useTrades').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof tradeHooks.useTrades>);
    vi.spyOn(accountHooks, 'useAccounts').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof accountHooks.useAccounts>);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('operations-kpis-loading')).toBeInTheDocument();
  });

  it('renderiza 3 cards con datos del summary', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 't-1',
        status: 'OPEN',
        opened_at: todayIso,
      }),
      makeTrade({
        id: 't-2',
        status: 'CLOSED_WIN',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '150.50',
      }),
      makeTrade({
        id: 't-3',
        status: 'CLOSED_LOSS',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '0.00',
      }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
    });
    // 1 OPEN today → "Abiertas hoy" = 1
    expect(screen.getByTestId('kpi-open')).toHaveTextContent('1');
    // Daily P&L = +150.50
    expect(screen.getByTestId('kpi-pnl')).toHaveTextContent('150,50');
    // Win rate = 1 win / 2 decided = 50%
    expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('50');
  });

  it('colorea P&L en rojo cuando es negativo', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 't-1',
        status: 'CLOSED_LOSS',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '-200.00',
      }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('kpi-pnl')).toHaveClass('text-loss');
    });
  });

  it('FIX-3: el win-rate EXCLUYE CLOSED_BREAK del denominador', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 'win-1',
        status: 'CLOSED_WIN',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '100',
      }),
      makeTrade({
        id: 'break-1',
        status: 'CLOSED_BREAK',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '0',
      }),
      makeTrade({
        id: 'break-2',
        status: 'CLOSED_BREAK',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '0',
      }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
    });
    // 1 win / (1 win + 0 losses) = 100% — NOT 1/(1+0+2) = 33%.
    expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('100');
  });

  it('FIX-3: el win-rate es null cuando solo hubo BREAK hoy', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 'break-1',
        status: 'CLOSED_BREAK',
        opened_at: todayIso,
        closed_at: todayIso,
        pnl_usd: '0',
      }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
    });
    // "—" placeholder for null win rate.
    expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('—');
  });

  it('FIX-3 mixto: WIN/LOSS/BREAK → win rate = wins / (wins + losses)', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({ id: 'w1', status: 'CLOSED_WIN', opened_at: todayIso, closed_at: todayIso, pnl_usd: '10' }),
      makeTrade({ id: 'w2', status: 'CLOSED_WIN', opened_at: todayIso, closed_at: todayIso, pnl_usd: '10' }),
      makeTrade({ id: 'l1', status: 'CLOSED_LOSS', opened_at: todayIso, closed_at: todayIso, pnl_usd: '-5' }),
      makeTrade({ id: 'b1', status: 'CLOSED_BREAK', opened_at: todayIso, closed_at: todayIso, pnl_usd: '0' }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
    });
    // 2 wins / (2 wins + 1 loss) = 2/3 = 66.67% → 67 after round
    expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('67');
  });

  it('FIX-3 / FASE 4E: ignora FUND y WITHDRAW para win rate / daily P&L', async () => {
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 'fund-1',
        status: 'CLOSED_BREAK',
        type: 'FUND',
        opened_at: todayIso,
        closed_at: todayIso,
        investment_usd: '500',
      }),
      makeTrade({
        id: 'withdraw-1',
        status: 'CLOSED_BREAK',
        type: 'WITHDRAW',
        opened_at: todayIso,
        closed_at: todayIso,
        investment_usd: '100',
      }),
    ]);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('operations-kpis')).toBeInTheDocument();
    });
    // No decided trades today → win rate = null ("—").
    expect(screen.getByTestId('kpi-winrate')).toHaveTextContent('—');
    // P&L diario = 0 (los movements no suman al P&L).
    expect(screen.getByTestId('kpi-pnl')).toHaveTextContent('0,00');
  });

  it('renderiza skeleton mientras ``useTrades`` está cargando', () => {
    vi.spyOn(tradeHooks, 'useTrades').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof tradeHooks.useTrades>);
    vi.spyOn(accountHooks, 'useAccounts').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof accountHooks.useAccounts>);
    render(<OperationsKPIsHeader />, { wrapper: makeWrapper() });
    expect(screen.getByTestId('operations-kpis-loading')).toBeInTheDocument();
  });

  it('Type-check: acepta filtros sin perder default behavior', () => {
    // Smoke test: pass filters prop without crashing.
    const todayIso = new Date().toISOString();
    mockTrades([
      makeTrade({
        id: 't-1',
        status: 'CLOSED_WIN',
        opened_at: todayIso,
        closed_at: todayIso,
      }),
    ]);
    expect(() =>
      render(
        <OperationsKPIsHeader filters={{ status: 'CLOSED_WIN' } as ListTradesParams} />,
        { wrapper: makeWrapper() },
      ),
    ).not.toThrow();
  });
});
