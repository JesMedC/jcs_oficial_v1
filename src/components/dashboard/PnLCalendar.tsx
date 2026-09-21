/*
 * PnLCalendar — Diario (Calendario P&L).
 *
 * Month-grid P&L for DiarioPage (REQ-PNL-004/005/006). FASE 6 rediseño
 * completo: layout profesional con KPIs mensuales prominentes arriba, grid
 * denso de 7 columnas, día seleccionable con panel de detalle debajo.
 *
 * Layout:
 *   ┌─ Header ──────────────────────────────────────────────────────┐
 *   │  CALENDARIO P&L                       [← Sept 2026 →]         │
 *   │  Subtítulo + descripción                                      │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌─ KPIs del mes ──────────────────────────────────────────────┐
 *   │  Saldo inicio | Saldo fin | Variación | Ops | Win rate | Cumple│
 *   │  $532.00     | $535.95   | +0.74%   | 10 | 66.7%   | ✓ NO    │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌─ Grid ──────────────────────────────────────────────────────┐
 *   │   D   L   M   M   J   V   S                                  │
 *   │  [1] [2] [3] [4] [5] [6] [7]                                 │
 *   │  ...                                                         │
 *   └───────────────────────────────────────────────────────────────┘
 *   ┌─ DayDetailPanel (condicional al día seleccionado) ──────────┐
 *   │  Detalle del día 5 sept                          [Cerrar ×]  │
 *   │  7 ops · +0.26% · +US$ 2.55                                  │
 *   │  ─────────────────────────────────────────────────────────── │
 *   │  09:34  BINARIA  EURUSD  CALL   +$0.85  +85.00%               │
 *   │  10:12  BINARIA  EURUSD  PUT    -$0.30  -30.00%               │
 *   │  ...                                                         │
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Day click → emits `onDaySelect(date)`; parent renders DayDetailPanel
 * with trades for that day. Reading the calendar doesn't navigate —
 * the same date stays selected across month changes (until cleared).
 *
 * Reads `usePnLCalendar` (PR-1 backend). Backend computes day-start
 * balance via the provisional Python walk over `Trade` (per Engram #187
 * + design.md ADR-001) — the wire shape is stable when the
 * account-movement-ledger WIP merges.
 */
import { useEffect, useMemo, useState } from 'react';

import { usePnLCalendar } from '../../features/dashboard/hooks';
import type { PnlDayEntry } from '../../features/dashboard/hooks';
import type { TradeOut } from '../../features/trades/types';
import { DayDetailPanel } from './DayDetailPanel';

interface Props {
  readonly workspaceId: string;
  /** Initial month (YYYY-MM). Defaults to current month. */
  readonly initialMonth?: string;
  readonly accountId?: string | null;
  /**
   * All trades for the current account scope (or all accounts).
   * We don't refetch per-day — the parent already holds this list
   * (e.g. via `useTradesAll`) and we filter it client-side by the
   * selected ``YYYY-MM-DD`` prefix. Trades that have an
   * ``opened_at`` whose date (UTC, matching the calendar service's
   * bucketing convention) falls outside the selected day are
   * filtered out.
   */
  readonly tradesForDayPanel: ReadonlyArray<TradeOut>;
}

const WEEKDAY_LABELS: ReadonlyArray<string> = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function shiftMonth(month: string, delta: number): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const next = new Date(Date.UTC(y, m - 1 + delta, 1));
  const yy = next.getUTCFullYear();
  const mm = String(next.getUTCMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}`;
}

function monthLabel(month: string): string {
  const [yStr, mStr] = month.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const date = new Date(Date.UTC(y, m - 1, 1));
  return date.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthLabelCapitalize(month: string): string {
  const raw = monthLabel(month);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function daysInMonth(month: string): number {
  const [yStr, mStr] = month.split('-');
  return new Date(Number(yStr), Number(mStr), 0).getUTCDate();
}

function weekdayOfFirst(month: string): number {
  const [yStr, mStr] = month.split('-');
  return new Date(Number(yStr), Number(mStr) - 1, 1).getDay();
}

function formatUsd(raw: string | number): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatSignedUsd(raw: string | number): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(abs);
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  // Backend ships ``pnl_pct`` already as a percent value (multiplied
  // by 100 server-side per REQ-PNL-001), so we just format — no
  // extra multiplication here.
  return `${sign}${pct.toFixed(2)}%`;
}

/**
 * Sum P&L over a closed trade set — used for the day-detail panel KPIs
 * and the inline win-rate calculation. OPEN trades contribute 0 (their
 * P&L isn't settled yet).
 */
function dayPnlSummary(trades: ReadonlyArray<TradeOut>): {
  readonly pnlUsd: number;
  readonly winCount: number;
  readonly lossCount: number;
} {
  let pnlUsd = 0;
  let winCount = 0;
  let lossCount = 0;
  for (const t of trades) {
    if (t.status === 'OPEN') continue;
    const pnl = Number(t.pnl_usd ?? 0);
    pnlUsd += pnl;
    if (pnl > 0) winCount += 1;
    else if (pnl < 0) lossCount += 1;
  }
  return { pnlUsd, winCount, lossCount };
}

interface GridCell {
  readonly key: string;
  readonly date: string | null;
  readonly entry: PnlDayEntry | null;
}

function buildGrid(
  month: string,
  days: ReadonlyArray<PnlDayEntry>,
): GridCell[] {
  const total = daysInMonth(month);
  const firstWeekday = weekdayOfFirst(month);
  const byDate = new Map<string, PnlDayEntry>();
  for (const d of days) byDate.set(d.date, d);
  const cells: GridCell[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ key: `pad-${i}`, date: null, entry: null });
  }
  for (let day = 1; day <= total; day += 1) {
    const dd = String(day).padStart(2, '0');
    const dateStr = `${month}-${dd}`;
    cells.push({
      key: dateStr,
      date: dateStr,
      entry: byDate.get(dateStr) ?? null,
    });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, date: null, entry: null });
  }
  return cells;
}

interface DayCellProps {
  readonly cell: GridCell;
  readonly isSelected: boolean;
  readonly isToday: boolean;
  readonly onSelect: (date: string) => void;
}

function DayCell({ cell, isSelected, isToday, onSelect }: DayCellProps) {
  if (cell.date === null || cell.entry === null) {
    return <div className="h-[72px] rounded border border-transparent" aria-hidden="true" />;
  }
  const ops = cell.entry.ops_count;
  const dayStartBalance = Number(cell.entry.day_start_balance);
  // Backend pre-computes pnl_pct vs day_start; show 0% when no ops.
  const pct = ops === 0 ? 0 : cell.entry.pnl_pct;
  const positive = pct > 0;
  const negative = pct < 0;
  const flat = pct === 0 || ops === 0;
  void flat;
  const accent = positive
    ? 'border-profit/50 bg-profit/10 hover:bg-profit/20 hover:border-profit/70'
    : negative
      ? 'border-loss/50 bg-loss/10 hover:bg-loss/20 hover:border-loss/70'
      : 'border-primary/20 bg-surface/30 hover:bg-primary/10 hover:border-primary/40';
  const selectedRing = isSelected
    ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#0a0e14]'
    : '';
  const todayRing = isToday && !isSelected
    ? 'ring-1 ring-primary/60 ring-offset-1 ring-offset-[#0a0e14]'
    : '';
  const clickable = ops > 0;
  return (
    <button
      type="button"
      data-testid={`pnl-day-${cell.date}`}
      onClick={clickable ? () => onSelect(cell.date!) : undefined}
      disabled={!clickable}
      className={[
        'h-[72px] rounded border p-1.5 flex flex-col justify-between text-left transition-colors',
        accent,
        selectedRing,
        todayRing,
        clickable ? 'cursor-pointer' : 'cursor-default opacity-60',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <span
          className={[
            'text-[11px] font-mono',
            isToday ? 'text-primary font-bold' : 'text-text-secondary',
          ].join(' ')}
        >
          {Number(cell.date!.slice(8, 10))}
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          {ops > 0 ? `${ops} op${ops === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      {ops === 0 ? (
        <span className="text-[10px] font-mono text-text-muted self-end">—</span>
      ) : (
        <div className="flex flex-col items-end gap-0.5">
          <span
            className={[
              'text-[11px] font-mono font-semibold leading-tight',
              positive ? 'text-profit' : negative ? 'text-loss' : 'text-text-muted',
            ].join(' ')}
          >
            {formatPct(pct)}
          </span>
          <span
            className={[
              'text-[10px] font-mono leading-tight',
              positive ? 'text-profit/80' : negative ? 'text-loss/80' : 'text-text-muted',
            ].join(' ')}
          >
            {formatUsd(dayStartBalance)}
          </span>
        </div>
      )}
    </button>
  );
}

/* ---------- top KPI bar ---------- */

interface KpiProps {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'profit' | 'loss' | 'muted';
  readonly sub?: string | undefined;
  /** Optional ``title`` attribute — used as native tooltip on hover. */
  readonly title?: string | undefined;
}

function Kpi({ label, value, tone = 'default', sub, title }: KpiProps) {
  const toneClass =
    tone === 'profit'
      ? 'text-profit'
      : tone === 'loss'
        ? 'text-loss'
        : tone === 'muted'
          ? 'text-text-muted'
          : 'text-text-primary';
  return (
    <div
      className="flex flex-col gap-0.5 min-w-0"
      title={title}
    >
      <span className="font-display uppercase tracking-widest text-[10px] text-text-muted truncate">
        {label}
      </span>
      <span className={`font-mono text-base md:text-lg font-semibold tabular-nums ${toneClass}`}>
        {value}
      </span>
      {sub !== undefined ? (
        <span className="font-mono text-[10px] text-text-muted truncate">{sub}</span>
      ) : null}
    </div>
  );
}

export function PnLCalendar({
  workspaceId,
  initialMonth,
  accountId = null,
  tradesForDayPanel,
}: Props) {
  const [month, setMonth] = useState<string>(initialMonth ?? currentMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // FIX-4 — defensive browser-TZ override. Resolved once on mount
  // (Intl is cheap but no need to re-resolve on every render).
  const browserTz = useMemo(
    () =>
      typeof Intl !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null,
    [],
  );

  const filters = useMemo(
    () => ({
      workspaceId,
      month,
      ...(accountId !== null ? { accountId } : {}),
      ...(browserTz && browserTz !== 'UTC' ? { tz: browserTz } : {}),
    }),
    [workspaceId, month, accountId, browserTz],
  );

  const { data, isLoading, isError } = usePnLCalendar(filters);
  const days = useMemo(() => data?.days ?? [], [data?.days]);
  const grid = useMemo(() => buildGrid(month, days), [month, days]);

  const monthStart = data ? Number(data.month_start_balance) : 0;
  const monthEnd = data ? Number(data.month_end_balance) : 0;
  const cumple = data?.cumple ?? false;

  /* ---- Monthly aggregates for the KPI bar ---- */
  const monthlyKpis = useMemo(() => {
    const totalOps = days.reduce((acc, d) => acc + d.ops_count, 0);
    const totalDays = days.length;
    const tradingDays = days.filter((d) => d.ops_count > 0).length;
    let totalPnlPct = 0;
    for (const d of days) {
      if (d.ops_count > 0 && d.day_start_balance !== '0.00') {
        totalPnlPct += d.pnl_pct;
      }
    }
    const avgPct = tradingDays > 0 ? totalPnlPct / tradingDays : 0;
    return {
      totalOps,
      tradingDays,
      totalDays,
      avgPct,
      variationPct:
        monthStart > 0 ? (monthEnd - monthStart) / monthStart : 0,
    };
  }, [days, monthStart, monthEnd]);

  /* ---- Today (UTC, matching the calendar's bucketing) ---- */
  const todayIso = useMemo(
    () => new Date().toISOString().slice(0, 10),
    [],
  );

  /* ---- Auto-select the most recent day with data on first load ---- */
  useEffect(() => {
    if (selectedDate !== null) return;
    if (days.length === 0) return;
    // Pick the latest day with ops > 0 (most recent trading day).
    const last = [...days].reverse().find((d) => d.ops_count > 0);
    if (last !== undefined) setSelectedDate(last.date);
  }, [days, selectedDate]);

  /* ---- Trades for the selected day ----
   *
   * Bucket rule: each trade belongs to exactly ONE day — the day it
   * was OPENED (local date). We previously also matched on
   * ``closed_at`` to capture night-spanning trades on their close
   * day, but that caused the same trade to show up in two days' day-
   * detail panels (the user reported this as "trades that belong to
   * 05/09 are showing up in 06/09 too"). The cleaner mental model
   * is: a trade's "home day" is its open date, full stop.
   *
   * TZ-aware: convert the raw ``opened_at`` UTC timestamp into the
   * user's local date (matches the calendar service's bucket).
   */
  const selectedDayTrades = useMemo(() => {
    if (selectedDate === null) return [];
    const tz = browserTz ?? 'UTC';
    const localDate = (iso: string): string => {
      // ``en-CA`` renders ``YYYY-MM-DD`` regardless of TZ.
      const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return fmt.format(new Date(iso));
    };
    return tradesForDayPanel.filter(
      (t) => localDate(t.opened_at) === selectedDate,
    );
  }, [selectedDate, tradesForDayPanel, browserTz]);

  const selectedDayEntry = useMemo(
    () => (selectedDate !== null ? days.find((d) => d.date === selectedDate) ?? null : null),
    [days, selectedDate],
  );

  const selectedDaySummary = useMemo(
    () => dayPnlSummary(selectedDayTrades),
    [selectedDayTrades],
  );

  /* ---- Click handler — toggles if same day clicked twice ---- */
  const handleDaySelect = (date: string) => {
    setSelectedDate((curr) => (curr === date ? null : date));
  };

  return (
    <div
      data-testid="pnl-calendar"
      className="rounded-xl border border-primary/20 bg-[rgba(13,21,30,0.7)] backdrop-blur-md p-5 md:p-6"
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-[#00B8FF]"
            style={{ boxShadow: '0 0 6px #00B8FF' }}
            aria-hidden="true"
          />
          <div className="flex flex-col min-w-0">
            <h3 className="font-display uppercase tracking-widest text-xs md:text-sm text-text-primary">
              Calendario P&L
            </h3>
            <span className="font-mono text-[10px] text-text-muted truncate">
              Mes a mes · ops, P&L diario, cumplimiento
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            data-testid="pnl-prev-month"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="w-8 h-8 rounded border border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm transition-colors"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <span
            data-testid="pnl-month-label"
            className="font-display uppercase tracking-wider text-sm text-text-primary min-w-[160px] text-center"
          >
            {monthLabelCapitalize(month)}
          </span>
          <button
            type="button"
            data-testid="pnl-next-month"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="w-8 h-8 rounded border border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm transition-colors"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      {/* ---- KPI bar (monthly aggregates — FASE 6 operations/capital split) ----
          Cards are organised as:
          1. Saldo inicio base mesi  (contable carry-over)
          2. Capital base            (ops-only base — first fund or carry-over ops)
          3. Saldo fin de cuenta     (real end balance, with capital-movements tooltip)
          4. Rendimiento operativo  (% based on capital_base; net P&L sub-label)
          5. Net P&L Trading        (Σ pnl_usd, the raw trading P&L)
          6. Cumple                 (> 5% threshold pill) */}
      <div
        data-testid="pnl-month-kpis"
        className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 px-3 py-3 rounded-lg border border-primary/15 bg-[rgba(6,11,16,0.5)]"
      >
        <Kpi
          label="Saldo inicio base mesi"
          value={data ? formatUsd(data.month_start_balance) : '—'}
          sub="Base contable del Mes"
        />
        <Kpi
          label="Capital base"
          value={data ? formatUsd(data.capital_base) : '—'}
          sub={
            data && Number(data.net_pnl_usd) > 0
              ? `Base del cálculo de Rendimiento`
              : 'Base del cálculo de Rendimiento'
          }
        />
        <Kpi
          label="Saldo fin de cuenta"
          value={data ? formatUsd(data.month_end_balance) : '—'}
          sub={
            data && (Number(data.monthly_deposits_total) > 0 ||
              Number(data.monthly_withdrawals_total) > 0)
              ? `Incluye +${formatUsd(data.monthly_deposits_total)} Depósitos / -${formatUsd(data.monthly_withdrawals_total)} Retiros`
              : 'Sin movimientos de capital este mes'
          }
          title={
            data
              ? `Desglose: Depósitos +${formatUsd(data.monthly_deposits_total)} · Retiros -${formatUsd(data.monthly_withdrawals_total)}`
              : undefined
          }
        />
        <Kpi
          label="Rendimiento operativo"
          value={
            data ? formatPct(data.monthly_rendimiento_pct ?? 0) : '—'
          }
          tone={
            data && data.monthly_rendimiento_pct > 0
              ? 'profit'
              : data && data.monthly_rendimiento_pct < 0
                ? 'loss'
                : 'muted'
          }
          sub={
            data
              ? `${formatSignedUsd(Number(data.net_pnl_usd))} (${monthlyKpis.totalOps} ops)`
              : undefined
          }
        />
        <Kpi
          label="Net P&L Trading"
          value={data ? formatSignedUsd(Number(data.net_pnl_usd)) : '—'}
          tone={
            data && Number(data.net_pnl_usd) > 0
              ? 'profit'
              : data && Number(data.net_pnl_usd) < 0
                ? 'loss'
                : 'muted'
          }
          sub="Σ pnl_usd de ops cerradas"
        />
        <Kpi
          label="CUMPLE"
          value={cumple ? 'CUMPLE' : 'NO CUMPLE'}
          tone={cumple ? 'profit' : 'loss'}
          sub={cumple ? '> 5%' : '≤ 5%'}
        />
      </div>

      {/* ---- Weekday header ---- */}
      <div className="mt-5 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={`wd-${i}`}
            className="text-[10px] font-display uppercase tracking-widest text-text-muted text-center py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ---- Grid ---- */}
      {isLoading ? (
        <div
          className="mt-1.5 grid grid-cols-7 gap-1.5"
          data-testid="pnl-loading"
        >
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="h-[72px] rounded border border-primary/10 bg-surface/20 animate-pulse"
            />
          ))}
        </div>
      ) : isError ? (
        <div
          className="mt-3 text-loss font-body text-sm"
          data-testid="pnl-error"
        >
          No pudimos cargar el calendario P&L.
        </div>
      ) : (
        <div className="mt-1.5 grid grid-cols-7 gap-1.5" data-testid="pnl-grid">
          {grid.map((cell) => (
            <DayCell
              key={cell.key}
              cell={cell}
              isSelected={cell.date !== null && cell.date === selectedDate}
              isToday={cell.date !== null && cell.date === todayIso}
              onSelect={handleDaySelect}
            />
          ))}
        </div>
      )}

      {/* ---- Day detail panel ---- */}
      {selectedDate !== null ? (
        <DayDetailPanel
          date={selectedDate}
          entry={selectedDayEntry}
          trades={selectedDayTrades}
          pnlSummary={selectedDaySummary}
          onClose={() => setSelectedDate(null)}
        />
      ) : null}
    </div>
  );
}