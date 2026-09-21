/*
 * FASE 4A / FASE 4E — Portal OperacionesPage (Trade Station real).
 *
 * Renders the full Trade Station:
 *   - `OperationsKPIsHeader` — KPIs (open count / daily P&L / WR)
 *     driven by the same trade list the table shows, so header and
 *     table always agree on what's "today".
 *   - `TradeFilters` — status / type / account_id / from / to +
 *     "Exportar CSV" button.
 *   - `TradeTable` — 13-column dense grid with balance prev/post per
 *     row (computed from the full trade history).
 *   - `NewTradeDrawer` mounted at PortalShell level (so any trigger
 *     works from any page).
 *
 * Filter state:
 *   - `filters` (status/type/account_id) — sent to the backend.
 *   - `dateRange` — client-side (the public ``GET /trades`` endpoint
 *     doesn't expose date params; we keep it client-side and use
 *     `useTradesAll` to fetch everything relevant for the balance
 *     timeline so the prev/post columns stay accurate).
 *
 * Defense-in-depth: trades whose ``account_id`` is not in the user's
 * currently-active accounts list are dropped both here and inside
 * ``TradeTable``.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../../components/ui/PageHeader';
import { HudButton } from '../../components/ui/HudButton';
import { OperationsKPIsHeader } from '../../features/trades/OperationsKPIsHeader';
import {
  TradeFilters,
  type DateRangeFilter,
} from '../../features/trades/TradeFilters';
import { TradeTable } from '../../features/trades/TradeTable';
import { computeBalanceTimeline } from '../../features/trades/balanceTimeline';
import { AccountSelector } from '../../components/dashboard/AccountSelector';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import { useAccounts } from '../../features/accounts/hooks';
import { useTradesAll } from '../../features/trades/useTradesAll';
import { tradesKeys } from '../../features/trades/hooks';
import {
  TRADE_STATUS_BADGE,
  TRADE_TYPE_BADGE,
  type ListTradesParams,
  type TradeOut,
  type TradeStatus,
  type TradeType,
} from '../../features/trades/types';
import { buildCsv, downloadCsv } from '../../features/trades/exportCsv';

function isWithinDateRange(
  iso: string,
  range: DateRangeFilter,
): boolean {
  if (!range.from && !range.to) return true;
  // Compare on YYYY-MM-DD prefix so timezone shifts don't drop the
  // edge case of a trade opened late on the boundary day.
  const day = iso.slice(0, 10);
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

function formatDateForFilename(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function OperacionesPage() {
  const [filters, setFilters] = useState<ListTradesParams>({});
  const [dateRange, setDateRange] = useState<DateRangeFilter>({
    from: '',
    to: '',
  });
  // `null` = aggregate across every active account. The prominent
  // AccountSelector at the top of the page is the source of truth —
  // we sync it into ``filters.account_id`` so the backend hook picks
  // up the scope on every refetch. The previous auto-scope behaviour
  // (default to single account) is dropped: the selector's "Todas
  // las cuentas" default matches DashboardPage, and the backend cost
  // is identical for users with one account.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );
  const openDrawer = useNewTradeDrawer((s) => s.open);
  const queryClient = useQueryClient();

  const accountsQuery = useAccounts();

  // Mirror the selector → filters.account_id. Single source of truth:
  // TradeFilters reads from ``filters`` and never holds the account
  // selection internally anymore.
  useEffect(() => {
    setFilters((prev) => {
      const next = { ...prev };
      if (selectedAccountId !== null) {
        next.account_id = selectedAccountId;
      } else {
        delete next.account_id;
      }
      return next;
    });
  }, [selectedAccountId]);

  // Fetch every trade the user owns (single page of 500) so we can
  // compute the balance timeline AND give the date filter something
  // to filter against. Same query key as the table so the network
  // request is shared.
  const tradesAllQuery = useTradesAll(filters);
  const allTradesScoped = useMemo(() => {
    const ids = new Set<string>();
    for (const a of accountsQuery.data?.items ?? []) ids.add(a.id);
    return (tradesAllQuery.trades ?? []).filter((t) => ids.has(t.account_id));
  }, [tradesAllQuery.trades, accountsQuery.data]);

  const visibleTrades = useMemo(
    () => allTradesScoped.filter((t) => isWithinDateRange(t.opened_at, dateRange)),
    [allTradesScoped, dateRange],
  );

  const handleExport = () => {
    const rows: Array<Array<string | number>> = visibleTrades.map((t) => {
      const balance = computeBalanceForRow(t, allTradesScoped, accountsQuery.data?.items ?? []);
      return [
        new Date(t.opened_at).toISOString(),
        t.closed_at ? new Date(t.closed_at).toISOString() : '',
        TRADE_STATUS_BADGE[t.status as TradeStatus].label,
        TRADE_TYPE_BADGE[t.type as TradeType].label,
        t.instrument,
        t.direction ?? '',
        t.entry_price ?? '',
        t.exit_price ?? '',
        t.lot_size ?? '',
        t.investment_usd ?? '',
        t.pnl_usd ?? '',
        balance.prev,
        balance.post,
        t.r_multiple ?? '',
        t.pre_trade_notes ?? '',
        t.post_trade_notes ?? '',
        t.followed_plan === null ? '' : t.followed_plan ? 'si' : 'no',
      ];
    });
    const csv = buildCsv(
      [
        'opened_at',
        'closed_at',
        'status',
        'type',
        'instrument',
        'direction',
        'entry_price',
        'exit_price',
        'lot_size',
        'investment_usd',
        'pnl_usd',
        'balance_prev',
        'balance_post',
        'r_multiple',
        'pre_trade_notes',
        'post_trade_notes',
        'followed_plan',
      ],
      rows,
    );
    const today = formatDateForFilename(new Date());
    const fromTag = dateRange.from || 'all';
    const toTag = dateRange.to || 'all';
    downloadCsv(`operaciones_${fromTag}_a_${toTag}_${today}.csv`, csv);
  };

  // Refresh the all-trades cache when the page mounts so the export
  // button has fresh data without waiting for the table's own fetch.
  useEffect(() => {
    void queryClient.invalidateQueries({ queryKey: tradesKeys.all });
  }, [queryClient]);

  return (
    <div data-testid="operaciones-page" className="flex flex-col gap-4 p-4">
      <PageHeader
        subLabel="Trade Station"
        title="Operaciones"
        actions={
          <HudButton
            data-testid="operaciones-new-trade"
            onClick={openDrawer}
          >
            + Nuevo trade
          </HudButton>
        }
      />

      <OperationsKPIsHeader filters={filters} />

      <div data-testid="operaciones-account-selector">
        <AccountSelector
          value={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <TradeFilters
        filters={filters}
        dateRange={dateRange}
        onChange={setFilters}
        onDateRangeChange={setDateRange}
        matchCount={visibleTrades.length}
        onExport={handleExport}
      />

      <TradeTable
        filters={filters}
        tradesForBalance={allTradesScoped}
      />
    </div>
  );
}

/* Per-row balance lookup for the CSV export.
 *
 * Anchors on the per-account ``balance_usd`` (NOT the sum across all
 * accounts) and delegates to the canonical walker in
 * ``balanceTimeline.ts`` — that one already does the right thing:
 * walks backward from the live balance so each row gets
 * ``prev = balance just before`` and ``post = balance just after``.
 */
function computeBalanceForRow(
  trade: TradeOut,
  allTrades: ReadonlyArray<TradeOut>,
  accounts: ReadonlyArray<{ id: string; balance_usd: string }>,
): { prev: number; post: number; } {
  const sameAccount = allTrades.filter((t) => t.account_id === trade.account_id);
  const account = accounts.find((a) => a.id === trade.account_id);
  const accountBalance = account ? Number(account.balance_usd) : 0;
  const timeline = computeBalanceTimeline(sameAccount, accountBalance);
  return (
    timeline.get(trade.id) ?? { prev: accountBalance, post: accountBalance }
  );
}
