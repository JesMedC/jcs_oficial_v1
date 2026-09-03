/*
 * FASE 4A / FASE 4E — TradeFilters.
 *
 * Controlled filter row for the Operations table. Three selects
 * (status, type, account_id) plus two date inputs (from / to) and
 * an inline "clear all" affordance. The export button is rendered
 * alongside so the user has a single place to apply filters and
 * dump the result.
 *
 * Scope notes:
 * - Status, type and account_id are sent to the backend.
 * - The date range is filtered CLIENT-SIDE because the public
 *   ``GET /trades`` endpoint doesn't expose ``opened_after`` /
 *   ``closed_after`` (only the risk-summary endpoint takes
 *   ``from`` / ``to``). We still surface the date inputs because
 *   they feel natural alongside the other filters and let the
 *   user narrow the table before exporting CSV.
 */
import { useAccounts } from '../accounts/hooks';
import type { ListTradesParams, TradeStatus, TradeType } from './types';

type StatusFilter = TradeStatus | 'ALL';
type TypeFilter = TradeType | 'ALL';

export interface DateRangeFilter {
  readonly from: string; // YYYY-MM-DD or ''
  readonly to: string; // YYYY-MM-DD or ''
}

interface Props {
  filters: ListTradesParams;
  /** Optional client-side date window. Empty strings mean "no bound". */
  dateRange: DateRangeFilter;
  onChange: (next: ListTradesParams) => void;
  onDateRangeChange: (next: DateRangeFilter) => void;
  /** Total trades that match the current filters (for the export label). */
  matchCount: number;
  /** Triggered with the currently visible rows when the user clicks export. */
  onExport: () => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'CLOSED_WIN', label: 'Cerrados Win' },
  { value: 'CLOSED_LOSS', label: 'Cerrados Loss' },
  { value: 'CLOSED_BREAK', label: 'Cerrados Break' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'FOREX', label: 'FOREX' },
  { value: 'BINARY', label: 'BINARY' },
  { value: 'FUND', label: 'Deposito' },
  { value: 'WITHDRAW', label: 'Retiro' },
];

export function TradeFilters({
  filters,
  dateRange,
  onChange,
  onDateRangeChange,
  matchCount,
  onExport,
}: Props) {
  const { data: accountsData } = useAccounts();

  const update = (patch: {
    status?: StatusFilter | undefined;
    type?: TypeFilter | undefined;
    account_id?: string | undefined;
  }) => {
    const next = { ...filters, ...patch } as {
      status?: StatusFilter;
      type?: TypeFilter;
      account_id?: string;
    };
    if (next.status === 'ALL') delete next.status;
    if (next.type === 'ALL') delete next.type;
    if (!next.account_id) delete next.account_id;
    onChange(next as ListTradesParams);
  };

  const hasActiveFilter = Boolean(
    filters.status ||
      filters.type ||
      filters.account_id ||
      dateRange.from ||
      dateRange.to,
  );

  return (
    <div
      data-testid="trade-filters"
      className="flex flex-wrap items-end gap-3 p-4 rounded-lg border border-primary/20 bg-surface/40"
    >
      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Status
        </label>
        <select
          data-testid="filter-status"
          className="bg-bg border border-primary/30 rounded px-2 py-1 text-sm font-mono"
          value={filters.status ?? 'ALL'}
          onChange={(e) => update({ status: e.target.value as StatusFilter })}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Tipo
        </label>
        <select
          data-testid="filter-type"
          className="bg-bg border border-primary/30 rounded px-2 py-1 text-sm font-mono"
          value={filters.type ?? 'ALL'}
          onChange={(e) => update({ type: e.target.value as TypeFilter })}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Cuenta
        </label>
        <select
          data-testid="filter-account"
          className="bg-bg border border-primary/30 rounded px-2 py-1 text-sm font-mono"
          value={filters.account_id ?? ''}
          onChange={(e) =>
            update({ account_id: e.target.value || undefined })
          }
        >
          <option value="">Todas</option>
          {(accountsData?.items ?? []).map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Desde
        </label>
        <input
          type="date"
          data-testid="filter-from"
          className="bg-bg border border-primary/30 rounded px-2 py-1 text-sm font-mono"
          value={dateRange.from}
          max={dateRange.to || undefined}
          onChange={(e) => onDateRangeChange({ ...dateRange, from: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Hasta
        </label>
        <input
          type="date"
          data-testid="filter-to"
          className="bg-bg border border-primary/30 rounded px-2 py-1 text-sm font-mono"
          value={dateRange.to}
          min={dateRange.from || undefined}
          onChange={(e) => onDateRangeChange({ ...dateRange, to: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <span className="font-mono text-[11px] text-text-muted">
          {matchCount} resultado{matchCount === 1 ? '' : 's'}
        </span>
        {hasActiveFilter ? (
          <button
            type="button"
            data-testid="filter-clear"
            onClick={() => {
              onChange({});
              onDateRangeChange({ from: '', to: '' });
            }}
            className="text-xs text-primary hover:text-primary/80 underline"
          >
            Limpiar filtros
          </button>
        ) : null}
        <button
          type="button"
          data-testid="trade-export-csv"
          onClick={onExport}
          disabled={matchCount === 0}
          className="btn-cyber-jade px-3 py-1.5 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Exportar CSV
        </button>
      </div>
    </div>
  );
}
