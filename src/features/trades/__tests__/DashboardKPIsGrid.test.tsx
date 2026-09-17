/*
 * dashboard-jarvis-fidelity (Slice B, T-041, REQ-DHF-003) —
 * DashboardKPIsGrid MES row tests.
 *
 * Locks the layout swap: 5 stat cards → 2 stat cards + 3
 * `<HudProgressBar>` rows (Win Rate Mensual, R/R exposure,
 * Mejor trade). We assert against the rendered testids so the
 * component contract is pinned regardless of className drift.
 *
 * Fixtures:
 *   - `tradesForKpis` carries 3 closed FOREX trades (2 wins,
 *     1 loss) so the MES aggregates have a non-zero denominator
 *     and the progress bars paint a visible fill.
 *   - The mocked ``useTrades`` + ``useAccounts`` keep the
 *     dashboard fully network-free.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { DashboardKPIsGrid } from '../DashboardKPIsGrid';
import * as tradeHooks from '../hooks';
import * as accountHooks from '../../accounts/hooks';
import type { AccountOut, AccountList } from '../../accounts/types';
import type { TradeList, TradeOut } from '../types';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

function makeTrade(over: Partial<TradeOut> & Pick<TradeOut, 'id' | 'status'>): TradeOut {
  const { id: _id, status: _status, ...rest } = over;
  return {
    user_id: 'u-1',
    account_id: 'acc-1',
    instrument: 'EURUSD',
    type: 'FOREX',
    closed_at: '2026-09-15T10:00:00Z',
    opened_at: '2026-09-15T09:00:00Z',
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
    ...rest,
    id: over.id,
    status: over.status,
  };
}

function mockTrades(items: ReadonlyArray<TradeOut>) {
  return vi.spyOn(tradeHooks, 'useTrades').mockReturnValue({
    data: { items: [...items], total: items.length, skip: 0, limit: items.length } satisfies TradeList,
    isLoading: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof tradeHooks.useTrades>);
}

function mockAccounts(items: ReadonlyArray<AccountOut>) {
  return vi.spyOn(accountHooks, 'useAccounts').mockReturnValue({
    data: { items: [...items], total: items.length, skip: 0, limit: items.length } satisfies AccountList,
    isLoading: false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof accountHooks.useAccounts>);
}

const ACCOUNTS: AccountOut[] = [
  {
    id: 'acc-1',
    user_id: 'u-1',
    workspace_id: 'ws-1',
    broker_name: 'Test Broker',
    name: 'Pocket',
    type: 'FOREX',
    balance_usd: '1000.00',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('DashboardKPIsGrid — MES row (T-041)', () => {
  it('T-041: MES row pinta 2 stat cards + 3 progress bars cuando hay trades cerrados', async () => {
    const trades = [
      makeTrade({ id: 't1', status: 'CLOSED_WIN', pnl_usd: '50.00' }),
      makeTrade({ id: 't2', status: 'CLOSED_WIN', pnl_usd: '30.00' }),
      makeTrade({ id: 't3', status: 'CLOSED_LOSS', pnl_usd: '-20.00' }),
    ];
    mockTrades(trades);
    mockAccounts(ACCOUNTS);

    render(
      <DashboardKPIsGrid
        tradesForKpis={trades}
        layout="vertical"
      />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      // 3 progress bars (one per labeled KPI) MUST render with the
      // pinned testids.
      expect(
        screen.getByTestId('hud-progress-bar-Win Rate Mensual'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('hud-progress-bar-R/R exposure'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('hud-progress-bar-Mejor trade'),
      ).toBeInTheDocument();
    });

    // The 2 surviving stat cards keep their labels.
    expect(screen.getByText('Risk/Reward')).toBeInTheDocument();
    expect(screen.getByText('P&L Acumulado')).toBeInTheDocument();

    // The 3 replaced cards no longer mount as standalone stat cards
    // (they live inside the progress bars instead).
    expect(
      screen.queryByTestId('hud-progress-bar-Risk/Reward'),
    ).toBeNull();
    expect(
      screen.queryByTestId('hud-progress-bar-P&L Acumulado'),
    ).toBeNull();
  });

  it('T-041 (triangulate): MES vacio renderiza las 3 progress bars en 0% (track vacio)', async () => {
    mockTrades([]);
    mockAccounts(ACCOUNTS);

    render(
      <DashboardKPIsGrid tradesForKpis={[]} layout="vertical" />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('hud-progress-bar-Win Rate Mensual'),
      ).toBeInTheDocument();
    });

    // Each progress bar exposes an inner track + a fill div. With
    // zero values, every fill width must be 0%.
    const labels = ['Win Rate Mensual', 'R/R exposure', 'Mejor trade'];
    for (const label of labels) {
      const wrapper = screen.getByTestId(`hud-progress-bar-${label}`);
      const fill = wrapper.querySelector('[data-testid^="hud-progress-bar-fill"]');
      expect(fill).not.toBeNull();
      // Width style is "width: 0%" on empty data.
      expect(fill!.getAttribute('style')).toContain('width: 0%');
    }
  });

  it('T-041 (triangulate): cap de fill en 95% cuando el KPI excede el techo (regression)', async () => {
    // 10 wins / 0 losses = 100% winrate → fill cap at 95%.
    const trades = Array.from({ length: 10 }, (_, i) =>
      makeTrade({ id: `t${i}`, status: 'CLOSED_WIN', pnl_usd: '10.00' }),
    );
    mockTrades(trades);
    mockAccounts(ACCOUNTS);

    render(
      <DashboardKPIsGrid tradesForKpis={trades} layout="vertical" />,
      { wrapper: makeWrapper() },
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('hud-progress-bar-Win Rate Mensual'),
      ).toBeInTheDocument();
    });

    const wrapper = screen.getByTestId('hud-progress-bar-Win Rate Mensual');
    const fill = wrapper.querySelector('[data-testid^="hud-progress-bar-fill"]');
    expect(fill).not.toBeNull();
    // Width MUST be capped at 95% per the spec (not 100%).
    expect(fill!.getAttribute('style')).toContain('width: 95%');
  });

  /*
   * dashboard-jarvis-fidelity-v2 (REQ-DCF-JV2-007) — JARVIS HUD
   * polish on the KPI grid:
   *   - each KPI card (Kpi + HudProgressBar) mounts inside a
   *     <HudPanel> so the chrome + chamfered hex corners travel
   *     with the right-rail block.
   *   - the HOY + MES sections each carry the JARVIS glass
   *     background + cyan border via HudPanel.
   * The progress-bar testids are unchanged so the T-041 suite
   * stays green.
   */
  describe('JARVIS v2 chrome (REQ-DCF-JV2-007)', () => {
    it('KPI cards + progress bars live inside a HudPanel (chamfered hex)', async () => {
      const trades = [
        makeTrade({ id: 't1', status: 'CLOSED_WIN', pnl_usd: '50.00' }),
        makeTrade({ id: 't2', status: 'CLOSED_WIN', pnl_usd: '30.00' }),
        makeTrade({ id: 't3', status: 'CLOSED_LOSS', pnl_usd: '-20.00' }),
      ];
      mockTrades(trades);
      mockAccounts(ACCOUNTS);

      render(
        <DashboardKPIsGrid tradesForKpis={trades} layout="vertical" />,
        { wrapper: makeWrapper() },
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('hud-progress-bar-Win Rate Mensual'),
        ).toBeInTheDocument();
      });

      // Each progress bar wrapper carries the JARVIS chrome in its
      // inline style (HudPanel renders the glass + cyan border +
      // clip-path via inline style, not Tailwind classes).
      const labels = ['Win Rate Mensual', 'R/R exposure', 'Mejor trade'];
      for (const label of labels) {
        const wrapper = screen.getByTestId(`hud-progress-bar-${label}`);
        const style = wrapper.getAttribute('style') ?? '';
        expect(style).toContain('rgba(10, 25, 47, 0.6)');
        expect(style).toContain('clip-path: polygon(');
        expect(style).toContain('rgba(0, 229, 255, 0.3)');
      }
    });
  });
});
