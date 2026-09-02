/*
 * FASE 4A — TradeFilters.
 *
 * Controlled filter row for the Operations table. Three selects
 * (status, type, account_id) plus an inline "clear all" affordance.
 *
 * Scope notes:
 * - State is fully controlled via the ``filters`` + ``onChange`` props
 *   (no URL sync in FASE 4A — the page that mounts this component
 *   owns the canonical state and feeds it into ``useTrades``).
 * - The "ALL" pseudo-value is normalised to an absent field before
 *   the patch is emitted, so the backend never receives an invalid
 *   status/type literal.
 * - Date range is intentionally omitted: ``ListTradesParams`` does
 *   not expose ``opened_after`` / ``closed_after`` (see
 *   ``backend/app/api/trades.py``), so a date picker would either
 *   be a no-op or require extending the contract — out of scope for
 *   FASE 4A. The "today" KPI is already covered by
 *   ``OperationsKPIsHeader`` via ``useRiskSummary``.
 */
import { useAccounts } from '../accounts/hooks';
import type { ListTradesParams, TradeStatus, TradeType } from './types';

type StatusFilter = TradeStatus | 'ALL';
type TypeFilter = TradeType | 'ALL';

interface Props {
  filters: ListTradesParams;
  onChange: (next: ListTradesParams) => void;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'OPEN', label: 'Abiertos' },
  { value: 'CLOSED_WIN', label: 'Cerrados Win' },
  { value: 'CLOSED_LOSS', label: 'Cerrados Loss' },
  { value: 'CLOSED_BREAK', label: 'Cerrados Break' },
];

const TYPE_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: 'ALL', label: 'Ambos' },
  { value: 'FOREX', label: 'FOREX' },
  { value: 'BINARY', label: 'BINARY' },
];

export function TradeFilters({ filters, onChange }: Props) {
  const { data: accountsData } = useAccounts();

  // Patch type is intentionally wider than ``Partial<ListTradesParams>``
  // so callers can pass the 'ALL' pseudo-value for status/type and an
  // ``undefined`` account_id (which the empty-option select emits).
  // The normalisation below strips both back to "absent" before the
  // patch is forwarded to ``onChange``.
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
    // Normalise pseudo-values to absence so the backend never sees
    // ``status=ALL`` (which would 400 — the enum has no ALL member).
    if (next.status === 'ALL') delete next.status;
    if (next.type === 'ALL') delete next.type;
    if (!next.account_id) delete next.account_id;
    onChange(next as ListTradesParams);
  };

  const hasActiveFilter = Boolean(
    filters.status || filters.type || filters.account_id,
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

      {hasActiveFilter && (
        <button
          type="button"
          data-testid="filter-clear"
          onClick={() => onChange({})}
          className="text-xs text-primary hover:text-primary/80 underline"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
