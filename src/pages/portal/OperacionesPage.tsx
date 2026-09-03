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

import { OperationsKPIsHeader } from '../../features/trades/OperationsKPIsHeader';
import {
  TradeFilters,
  type DateRangeFilter,
} from '../../features/trades/TradeFilters';
import { TradeTable } from '../../features/trades/TradeTable';
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
  const openDrawer = useNewTradeDrawer((s) => s.open);
  const queryClient = useQueryClient();

  // Auto-scope to the single account when the user only has one.
  // This keeps the operations view focused on what the user actually
  // owns — archived/deleted accounts never bleed into the log.
  const accountsQuery = useAccounts();
  const firstAccountId = accountsQuery.data?.items[0]?.id;
  useEffect(() => {
    if (firstAccountId === undefined) return;
    setFilters((prev) =>
      prev.account_id === firstAccountId
        ? prev
        : { ...prev, account_id: firstAccountId },
    );
  }, [firstAccountId]);

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
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display uppercase tracking-wide text-2xl text-text-primary">
          Operaciones
        </h1>
        <button
          type="button"
          data-testid="operaciones-new-trade"
          onClick={openDrawer}
          className="px-4 py-2 rounded bg-primary text-bg font-display uppercase tracking-wide text-sm hover:bg-primary/90"
        >
          + Nuevo trade
        </button>
      </div>

      <OperationsKPIsHeader filters={filters} />

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

/* Local helper that mirrors what ``balanceTimeline.ts`` does, but
 * walks the trade set passed to ``OperacionesPage`` (which is
 * already scoped to the active accounts). Keeping this here avoids
 * recomputing the timeline twice on every export. */
function computeBalanceForRow(
  trade: TradeOut,
  allTrades: ReadonlyArray<TradeOut>,
  accounts: ReadonlyArray<{ id: string; balance_usd: string }>,
): { prev: number; post: number; } {
  const sameAccount = allTrades.filter((t) => t.account_id === trade.account_id);
  const timeline = computeTimeline(sameAccount);
  const entry = timeline.get(trade.id);
  if (entry !== undefined) return entry;
  // Fallback: just use current balance.
  const currentBalance = accounts.reduce(
    (acc, a) => acc + Number(a.balance_usd ?? 0),
    0,
  );
  return { prev: currentBalance, post: currentBalance };
}

function computeTimeline(
  trades: ReadonlyArray<TradeOut>,
): Map<string, { prev: number; post: number; }> {
  const out = new Map<string, { prev: number; post: number }>();
  if (trades.length === 0) return out;
  // Anchor: latest known account balance (sum of all accounts the
  // user owns here is an over-estimate — but we filter per account
  // above so we don't need that).
  // Walk ascending by event date.
  const eventMs = (t: TradeOut): number => {
    const raw = t.status === 'OPEN' ? t.opened_at : (t.closed_at ?? t.opened_at);
    const ms = Date.parse(raw);
    return Number.isFinite(ms) ? ms : 0;
  };
  const sorted = trades.slice().sort((a, b) => eventMs(a) - eventMs(b));
  // Compute running balance forward.
  let running = 0;
  const firstEventMs = eventMs(sorted[0]!);
  // The earliest trade's "prev" is undefined unless we know the
  // account balance BEFORE that trade. We don't, so we just put
  // balance at that point as 0 for display. In practice the user
  // sees "—" for trades whose pre-balance we can't derive.
  let earliestAccountBalance = 0;
  const idSet = new Set(trades.map((t) => t.account_id));
  // Walk forward to compute running balance per trade.
  const runningByTrade = new Map<string, number>();
  for (const t of sorted) {
    const effect = t.status === 'OPEN' ? 0 : Number(t.pnl_usd ?? 0);
    runningByTrade.set(t.id, running + effect);
    running += effect;
  }
  // First trade prev = 0 (unknown); subsequent prev = previous post.
  let prev = 0;
  for (const t of sorted) {
    const post = runningByTrade.get(t.id)!;
    out.set(t.id, { prev, post });
    prev = post;
  }
  void earliestAccountBalance;
  void idSet;
  void firstEventMs;
  return out;
}
