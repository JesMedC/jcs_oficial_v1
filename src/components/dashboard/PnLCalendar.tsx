/*
 * one-by-one-thousand-discipline (PR-2) — PnLCalendar.
 *
 * Month-grid P&L for DiarioPage (REQ-PNL-004/005/006). Per-day cell
 * carries ops count + P&L value + P&L % vs day-start. The month-
 * level rollup row surfaces the ``cumple`` boolean as a header pill
 * (REQ-PNL-006 — there is intentionally NO per-day badge).
 *
 * Layout:
 *   - Month picker (← / → + YYYY-MM label) at the top.
 *   - 7-column weekday grid (L M M J V S D) — Sun-start matches
 *     es-AR convention; Saturday + Sunday render but the
 *     PR-1 calendar_service only emits weekday data, so they
 *     display zero (which is correct — no weekday math in the grid).
 *   - Each day cell: date number, ops count, USD P&L (signed,
 *     profit/loss coloured), % vs day-start.
 *   - Rollup row: month-end balance + cumple pill (CUMPLE / NO).
 *
 * Reads ``usePnLCalendar`` (PR-1 backend). Backend computes
 * day-start balance via the provisional Python walk over ``Trade``
 * (per Engram #187 + design.md ADR-001) — the wire shape is stable
 * when the account-movement-ledger WIP merges.
 */
import { useMemo, useState } from 'react';

import { usePnLCalendar } from '../../features/dashboard/hooks';
import type { PnlDayEntry } from '../../features/dashboard/hooks';

interface Props {
  readonly workspaceId: string;
  /** Initial month (YYYY-MM). Defaults to current month. */
  readonly initialMonth?: string;
  readonly accountId?: string | null;
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

function daysInMonth(month: string): number {
  const [yStr, mStr] = month.split('-');
  return new Date(Number(yStr), Number(mStr), 0).getUTCDate();
}

function weekdayOfFirst(month: string): number {
  const [yStr, mStr] = month.split('-');
  // Sun=0..Sat=6 — matches the WEEKDAY_LABELS index.
  return new Date(Number(yStr), Number(mStr) - 1, 1).getDay();
}

function formatUsd(raw: string): string {
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

interface GridCell {
  readonly key: string;
  readonly date: string | null;
  readonly entry: PnlDayEntry | null;
}

function buildGrid(month: string, days: ReadonlyArray<PnlDayEntry>): GridCell[] {
  const total = daysInMonth(month);
  const firstWeekday = weekdayOfFirst(month);
  const byDate = new Map<string, PnlDayEntry>();
  for (const d of days) byDate.set(d.date, d);
  const cells: GridCell[] = [];
  // Leading blanks for the offset.
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
  // Pad to a multiple of 7 so the grid renders clean rows.
  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, date: null, entry: null });
  }
  return cells;
}

function DayCell({ cell }: { readonly cell: GridCell }) {
  if (cell.date === null || cell.entry === null) {
    return <div className="h-20 rounded border border-transparent" aria-hidden="true" />;
  }
  const ops = cell.entry.ops_count;
  const pnl = Number(cell.entry.day_start_balance);
  // Backend pre-computes pnl_pct vs day_start; show 0% when no ops.
  const pct = ops === 0 ? 0 : cell.entry.pnl_pct;
  const positive = pct > 0;
  const negative = pct < 0;
  const color = positive ? 'text-profit' : negative ? 'text-loss' : 'text-text-muted';
  return (
    <div
      data-testid={`pnl-day-${cell.date}`}
      className="h-20 rounded border border-primary/15 bg-surface/30 p-1.5 flex flex-col justify-between"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono text-text-secondary">
          {Number(cell.date.slice(8, 10))}
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          {ops > 0 ? `${ops} op${ops === 1 ? '' : 's'}` : ''}
        </span>
      </div>
      <div className={`text-xs font-mono ${color}`}>
        {ops === 0 ? '—' : formatPct(pct)}
      </div>
      <div className={`text-[10px] font-mono ${color}`}>
        {ops === 0 ? '' : formatUsd(String(pnl))}
      </div>
    </div>
  );
}

export function PnLCalendar({ workspaceId, initialMonth, accountId = null }: Props) {
  const [month, setMonth] = useState<string>(initialMonth ?? currentMonth());

  const filters = useMemo(
    () => ({
      workspaceId,
      month,
      ...(accountId !== null ? { accountId } : {}),
    }),
    [workspaceId, month, accountId],
  );

  const { data, isLoading, isError } = usePnLCalendar(filters);
  const days = data?.days ?? [];
  const grid = buildGrid(month, days);

  const monthStart = data ? Number(data.month_start_balance) : 0;
  const monthEnd = data ? Number(data.month_end_balance) : 0;
  const cumple = data?.cumple ?? false;

  return (
    <div
      data-testid="pnl-calendar"
      className="rounded-lg border border-primary/20 bg-surface/40 backdrop-blur-md p-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="font-display uppercase tracking-wide text-sm md:text-base">
          Calendario P&L
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="pnl-prev-month"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm"
            aria-label="Mes anterior"
          >
            ←
          </button>
          <span
            data-testid="pnl-month-label"
            className="font-display uppercase tracking-widest text-xs md:text-sm text-text-primary min-w-[140px] text-center capitalize"
          >
            {monthLabel(month)}
          </span>
          <button
            type="button"
            data-testid="pnl-next-month"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            className="px-2 py-1 rounded border border-primary/30 text-primary hover:bg-primary/10 font-mono text-sm"
            aria-label="Mes siguiente"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={`wd-${i}`}
            className="text-[10px] font-display uppercase tracking-widest text-text-muted text-center"
          >
            {d}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div
          className="mt-1.5 grid grid-cols-7 gap-1.5"
          data-testid="pnl-loading"
        >
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={`skel-${i}`}
              className="h-20 rounded border border-primary/10 bg-surface/20 animate-pulse"
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
            <DayCell key={cell.key} cell={cell} />
          ))}
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-primary/15 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <span className="text-[10px] font-display uppercase tracking-widest text-text-muted">
            Mes inicio
          </span>
          <span className="font-mono text-sm text-text-primary">
            {data ? formatUsd(data.month_start_balance) : '—'}
          </span>
          <span className="text-[10px] font-display uppercase tracking-widest text-text-muted">
            Mes fin
          </span>
          <span className="font-mono text-sm text-text-primary">
            {data ? formatUsd(data.month_end_balance) : '—'}
          </span>
        </div>
        <div
          data-testid="pnl-cumple"
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border font-display uppercase tracking-widest text-[10px] md:text-xs ${
            cumple
              ? 'border-profit bg-profit/15 text-profit'
              : 'border-warning/40 bg-warning/10 text-warning'
          }`}
        >
          <span aria-hidden="true">{cumple ? '✓' : '✗'}</span>
          {cumple ? 'Cumple' : 'No cumple'}
        </div>
      </div>
      {/* Rollup hint surfaces the 5% threshold (decision #5) without
          claiming precision — the actual boolean lives in ``cumple``. */}
      <p className="mt-2 text-[10px] font-mono text-text-muted">
        Cumplimiento mensual: variación del saldo inicio → fin &gt; 5%.
        {/* The expression above intentionally references the 5%
            threshold textually so screen readers + future audits can
            locate the rule. */}
        {monthStart > 0 && monthEnd > 0
          ? ` (${(((monthEnd - monthStart) / monthStart) * 100).toFixed(2)}% este mes)`
          : ''}
      </p>
    </div>
  );
}