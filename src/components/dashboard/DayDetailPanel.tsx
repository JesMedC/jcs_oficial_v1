/*
 * DayDetailPanel — TradingView-style breakdown of a single day's trades.
 *
 * Mounted by ``PnLCalendar`` below the grid once the user clicks a
 * day. Shows two tabs:
 *
 *   ┌─ Operaciones ──────────────────────────┬─ Depósito / Retiro ─┐
 *   │ FOREX / BINARY trades                  │ FUND / WITHDRAW      │
 *   │ with win/loss stats + per-trade table │ with signed-amount   │
 *   │                                        │ table                 │
 *   └────────────────────────────────────────┴───────────────────────┘
 *
 * Top header carries the day-level summary (date, total P&L USD/%, ops
 * count) which is shared across both tabs.
 *
 * Design language matches the calendar's neon-jade/cyan palette: dark
 * surface, monospace numerics, profit green / loss red, subtle
 * borders. Renders inline so the user can scroll from grid → panel
 * without breaking flow.
 */
import { useMemo, useState } from 'react';

import type { PnlDayEntry } from '../../features/dashboard/hooks';
import type { TradeOut } from '../../features/trades/types';

interface Props {
  readonly date: string;
  readonly entry: PnlDayEntry | null;
  readonly trades: ReadonlyArray<TradeOut>;
  readonly pnlSummary: {
    readonly pnlUsd: number;
    readonly winCount: number;
    readonly lossCount: number;
  };
  readonly onClose: () => void;
}

type TabId = 'operaciones' | 'capital';

interface TabDef {
  readonly id: TabId;
  readonly label: string;
  readonly shortLabel: string;
  /** Predicate: returns true if the trade belongs to this tab. */
  readonly match: (t: TradeOut) => boolean;
}

const TABS: ReadonlyArray<TabDef> = [
  {
    id: 'operaciones',
    label: 'Operaciones',
    shortLabel: 'Op.',
    match: (t) => t.type === 'FOREX' || t.type === 'BINARY',
  },
  {
    id: 'capital',
    label: 'Depósito / Retiro',
    shortLabel: 'Cap.',
    match: (t) => t.type === 'FUND' || t.type === 'WITHDRAW',
  },
];

const BADGE_PALETTE: Record<string, { label: string; cls: string }> = {
  FOREX: { label: 'FOREX', cls: 'bg-info/15 text-info border-info/40' },
  BINARY: { label: 'BINARIA', cls: 'bg-primary/15 text-primary border-primary/40' },
  FUND: { label: 'DEPÓSITO', cls: 'bg-profit/15 text-profit border-profit/40' },
  WITHDRAW: { label: 'RETIRO', cls: 'bg-loss/15 text-loss border-loss/40' },
};

function formatUsd(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatSignedUsd(n: number): string {
  if (n === 0) return formatUsd(0);
  return n > 0 ? `+${formatUsd(n)}` : `-${formatUsd(Math.abs(n))}`;
}

function formatTime(iso: string): string {
  const tIdx = iso.indexOf('T');
  if (tIdx < 0) return iso.slice(11, 16);
  return iso.slice(tIdx + 1, tIdx + 6);
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) return '';
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  });
}

function TypeBadge({ type }: { readonly type: TradeOut['type'] }) {
  const meta =
    BADGE_PALETTE[type] ?? {
      label: type,
      cls: 'bg-primary/15 text-primary border-primary/40',
    };
  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded border font-display uppercase tracking-wider text-[10px]',
        meta.cls,
      ].join(' ')}
    >
      {meta.label}
    </span>
  );
}

export function DayDetailPanel({
  date,
  entry,
  trades,
  pnlSummary,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('operaciones');
  const totalOps = trades.length;
  const settled = totalOps - trades.filter((t) => t.status === 'OPEN').length;
  const positive = pnlSummary.pnlUsd > 0;
  const negative = pnlSummary.pnlUsd < 0;
  const pct = entry !== null ? entry.pnl_pct : 0;
  const winRate = settled > 0 ? (pnlSummary.winCount / settled) * 100 : 0;

  // Per-tab counts — used for the badge on each tab so the user can
  // tell at a glance which tab has data without switching into it.
  const tabCounts = useMemo(() => {
    const counts: Record<TabId, number> = { operaciones: 0, capital: 0 };
    for (const t of trades) {
      for (const tab of TABS) {
        if (tab.match(t)) counts[tab.id] += 1;
      }
    }
    return counts;
  }, [trades]);

  // Capital-flow summary for the "DEPÓSITO / RETIRO" tab — the upper-
  // right metric on the day-detail header swaps from "P&L del día"
  // (jade / red) to "Flujo de Capital del día" (neutral) so the
  // user never confuses a deposit with a trading gain.
  const capitalFlow = useMemo(() => {
    let inflow = 0;
    let outflow = 0;
    for (const t of trades) {
      const amount = Number(t.investment_usd ?? 0);
      if (t.type === 'FUND') inflow += amount;
      else if (t.type === 'WITHDRAW') outflow += amount;
    }
    return {
      inflow,
      outflow,
      net: inflow - outflow,
      count: tabCounts.capital,
    };
  }, [trades, tabCounts.capital]);

  return (
    <div
      data-testid="pnl-day-detail"
      className="mt-5 rounded-xl border border-primary/25 bg-[rgba(6,11,16,0.55)] overflow-hidden"
    >
      {/* ---- Header (shared day summary) ---- */}
      <div className="flex items-start justify-between gap-4 p-4 border-b border-primary/15">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-display uppercase tracking-widest text-[10px] text-text-muted">
            Detalle del día
          </span>
          <span className="font-display text-base md:text-lg text-text-primary capitalize">
            {weekdayLabel(date)}
          </span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === 'operaciones' ? (
            <div className="flex flex-col items-end" data-testid="pnl-day-pnl-summary">
              <span className="font-display uppercase tracking-widest text-[10px] text-text-muted">
                P&L del día
              </span>
              <span
                className={[
                  'font-mono text-lg md:text-xl font-bold tabular-nums',
                  positive ? 'text-profit' : negative ? 'text-loss' : 'text-text-secondary',
                ].join(' ')}
                data-testid="pnl-day-pnl-usd"
              >
                {formatSignedUsd(pnlSummary.pnlUsd)}
              </span>
              <span
                className={[
                  'font-mono text-[11px]',
                  positive ? 'text-profit/80' : negative ? 'text-loss/80' : 'text-text-muted',
                ].join(' ')}
              >
                {entry !== null
                  ? pct > 0
                    ? `+${pct.toFixed(2)}%`
                    : `${pct.toFixed(2)}%`
                  : '—'}
              </span>
            </div>
          ) : (
            <div
              className="flex flex-col items-end"
              data-testid="pnl-day-cashflow-summary"
            >
              <span className="font-display uppercase tracking-widest text-[10px] text-text-muted">
                Flujo de Capital del día
              </span>
              <span className="font-mono text-lg md:text-xl font-bold tabular-nums text-text-primary">
                {capitalFlow.count === 0
                  ? '—'
                  : formatSignedUsd(capitalFlow.net)}
              </span>
              <span className="font-mono text-[11px] text-text-muted">
                {capitalFlow.count === 0
                  ? 'Sin movimientos'
                  : `${capitalFlow.count} mov · +${formatUsd(capitalFlow.inflow)}/-${formatUsd(capitalFlow.outflow)}`}
              </span>
            </div>
          )}
          <button
            type="button"
            data-testid="pnl-day-close"
            onClick={onClose}
            aria-label="Cerrar detalle del día"
            className="w-8 h-8 rounded border border-primary/30 text-text-muted hover:text-text-primary hover:border-primary/60 font-mono text-sm transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* ---- Tabs ---- */}
      <div
        role="tablist"
        aria-label="Filtro de operaciones del día"
        className="flex items-stretch border-b border-primary/15"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = tabCounts[tab.id];
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              data-testid={`pnl-day-tab-${tab.id}`}
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-1 md:flex-none md:px-6 py-2.5 font-display uppercase tracking-widest text-[10px] md:text-xs',
                'border-r border-primary/10 last:border-r-0 transition-colors',
                isActive
                  ? 'text-primary bg-primary/10 border-b-2 border-b-primary'
                  : 'text-text-muted hover:text-text-primary hover:bg-primary/5',
              ].join(' ')}
            >
              <span className="inline-flex items-center gap-2">
                <span>{tab.label}</span>
                <span
                  data-testid={`pnl-day-tab-count-${tab.id}`}
                  className={[
                    'inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full font-mono text-[10px]',
                    isActive
                      ? 'bg-primary text-bg'
                      : 'bg-primary/15 text-text-muted',
                  ].join(' ')}
                >
                  {count}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- Stats strip — only relevant on the Operaciones tab ---- */}
      {activeTab === 'operaciones' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-primary/15">
          <Stat label="Operaciones" value={`${totalOps}`} sub={`${settled} cerradas`} />
          <Stat
            label="Wins"
            value={`${pnlSummary.winCount}`}
            tone="profit"
            sub={`${winRate.toFixed(0)}% WR`}
          />
          <Stat
            label="Losses"
            value={`${pnlSummary.lossCount}`}
            tone="loss"
            sub={
              settled > 0
                ? `${((pnlSummary.lossCount / settled) * 100).toFixed(0)}% LR`
                : '—'
            }
          />
          <Stat
            label="Break"
            value={`${settled - pnlSummary.winCount - pnlSummary.lossCount}`}
            tone="muted"
          />
        </div>
      ) : null}

      {/* ---- Active tab content ---- */}
      {activeTab === 'operaciones' ? (
        <OperacionesTab
          trades={trades.filter((t) => TABS[0]!.match(t))}
        />
      ) : (
        <CapitalTab trades={trades.filter((t) => TABS[1]!.match(t))} />
      )}
    </div>
  );
}

/* ----- tab: Operaciones (FOREX / BINARY) ----- */

interface OperacionesTabProps {
  readonly trades: ReadonlyArray<TradeOut>;
}

function OperacionesTab({ trades }: OperacionesTabProps) {
  if (trades.length === 0) {
    return (
      <div
        className="p-6 text-center text-text-muted font-body text-sm"
        data-testid="pnl-day-tab-operaciones-empty"
      >
        Sin operaciones (FOREX / BINARY) en esta fecha.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto" data-testid="pnl-day-tab-operaciones-table">
      <table className="w-full font-mono text-sm">
        <thead className="bg-surface/40 border-b border-primary/15">
          <tr className="text-[10px] font-display uppercase tracking-widest text-text-muted">
            <th className="px-3 py-2 text-left">Hora</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Instr.</th>
            <th className="px-3 py-2 text-left">Dir.</th>
            <th className="px-3 py-2 text-right">Inversión</th>
            <th className="px-3 py-2 text-right">Resultado</th>
            <th className="px-3 py-2 text-right">P&L</th>
            <th className="px-3 py-2 text-right">%</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const pnl = Number(t.pnl_usd ?? 0);
            const investment = Number(t.investment_usd ?? 0);
            const resultPct = investment > 0 ? (pnl / investment) * 100 : 0;
            const isWin = pnl > 0;
            const isLoss = pnl < 0;
            const tone = isWin
              ? 'text-profit'
              : isLoss
                ? 'text-loss'
                : 'text-text-muted';
            return (
              <tr
                key={t.id}
                data-testid={`pnl-day-trade-${t.id}`}
                className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
              >
                <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                  {formatTime(t.opened_at)}
                </td>
                <td className="px-3 py-2">
                  <TypeBadge type={t.type} />
                </td>
                <td className="px-3 py-2 text-text-primary font-display">
                  {t.instrument}
                </td>
                <td className="px-3 py-2 text-text-secondary">
                  {t.direction ?? '—'}
                </td>
                <td className="px-3 py-2 text-right text-text-secondary tabular-nums">
                  {investment > 0 ? formatUsd(investment) : '—'}
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${tone}`}>
                  {t.status === 'OPEN' ? '—' : formatSignedUsd(pnl)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${tone}`}>
                  {t.status === 'OPEN' ? '—' : formatSignedUsd(pnl)}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${tone}`}>
                  {t.status === 'OPEN'
                    ? '—'
                    : `${resultPct > 0 ? '+' : ''}${resultPct.toFixed(2)}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ----- tab: Capital movements (FUND / WITHDRAW) ----- */

interface CapitalTabProps {
  readonly trades: ReadonlyArray<TradeOut>;
}

function CapitalTab({ trades }: CapitalTabProps) {
  if (trades.length === 0) {
    return (
      <div
        className="p-6 text-center text-text-muted font-body text-sm"
        data-testid="pnl-day-tab-capital-empty"
      >
        Sin depósitos ni retiros en esta fecha.
      </div>
    );
  }
  // Sort: FUND first, then WITHDRAW; within each, by time asc.
  const sorted = [...trades].sort((a, b) => {
    const order: Partial<Record<TradeOut['type'], number>> = { FUND: 0, WITHDRAW: 1 };
    if (a.type !== b.type) {
      return (order[a.type] ?? 0) - (order[b.type] ?? 0);
    }
    return a.opened_at.localeCompare(b.opened_at);
  });
  return (
    <div className="overflow-x-auto" data-testid="pnl-day-tab-capital-table">
      <table className="w-full font-mono text-sm">
        <thead className="bg-surface/40 border-b border-primary/15">
          <tr className="text-[10px] font-display uppercase tracking-widest text-text-muted">
            <th className="px-3 py-2 text-left">Hora</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Instr.</th>
            <th className="px-3 py-2 text-left">Dir.</th>
            <th className="px-3 py-2 text-right">Monto</th>
            <th className="px-3 py-2 text-right">Δ Saldo</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const amount = Number(t.investment_usd ?? 0);
            const isFund = t.type === 'FUND';
            const tone = isFund ? 'text-profit' : 'text-loss';
            return (
              <tr
                key={t.id}
                data-testid={`pnl-day-capital-${t.id}`}
                className="border-b border-primary/10 hover:bg-primary/5 transition-colors"
              >
                <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                  {formatTime(t.opened_at)}
                </td>
                <td className="px-3 py-2">
                  <TypeBadge type={t.type} />
                </td>
                <td className="px-3 py-2 text-text-primary font-display">
                  {t.instrument}
                </td>
                <td className="px-3 py-2 text-text-secondary">
                  {t.direction ?? '—'}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${tone}`}>
                  {formatSignedUsd(isFund ? amount : -amount)}
                </td>
                <td className={`px-3 py-2 text-right font-semibold tabular-nums ${tone}`}>
                  {isFund ? '↑ Ingreso' : '↓ Egreso'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ----- shared Stat cell ----- */

function Stat({
  label,
  value,
  tone = 'default',
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'profit' | 'loss' | 'muted';
  readonly sub?: string | undefined;
}) {
  const toneClass =
    tone === 'profit'
      ? 'text-profit'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-primary';
  return (
    <div className="bg-[rgba(13,21,30,0.65)] px-4 py-3">
      <span className="block font-display uppercase tracking-widest text-[10px] text-text-muted">
        {label}
      </span>
      <span className={`block font-mono text-xl font-bold tabular-nums mt-0.5 ${toneClass}`}>
        {value}
      </span>
      {sub !== undefined ? (
        <span className="block font-mono text-[10px] text-text-muted mt-0.5">{sub}</span>
      ) : null}
    </div>
  );
}