/*
 * FASE 4A — TradeTable.
 *
 * Dense, monochrome-table log of the user's trades. Backed by the
 * ``useTrades`` hook (TanStack Query, ``placeholderData:
 * keepPreviousData``) so filter changes don't blank the table.
 *
 * Render states:
 *   - loading: text-only skeleton (no skeleton-row component yet —
 *     kept simple until the design system grows one in Ola 5).
 *   - error: friendly retry prompt with a ``text-loss`` accent.
 *   - empty: copy explaining the current filter combination.
 *   - ready: 10-column dense grid, sticky header, hover row tint.
 *
 * Inline row actions (close, edit, delete) belong to Ola 5; the
 * row component intentionally has no buttons.
 */
import { useTrades } from './hooks';
import { TradeTableRow } from './TradeTableRow';
import type { ListTradesParams } from './types';

interface Props {
  readonly filters?: ListTradesParams;
}

export function TradeTable({ filters = {} }: Props) {
  const { data, isLoading, isError } = useTrades(filters);

  if (isLoading) {
    return (
      <div
        data-testid="trade-table-loading"
        className="p-8 text-center text-text-secondary"
      >
        Cargando operaciones…
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="trade-table-error"
        className="p-8 text-center text-loss"
      >
        Error al cargar operaciones. Reintentá.
      </div>
    );
  }

  const items = data?.items ?? [];

  if (items.length === 0) {
    return (
      <div
        data-testid="trade-table-empty"
        className="p-8 text-center text-text-secondary"
      >
        No hay operaciones para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-primary/20">
      <table className="w-full font-mono text-sm" data-testid="trade-table">
        <thead className="bg-surface/60 border-b border-primary/20">
          <tr className="text-xs uppercase tracking-wide text-text-secondary">
            <th className="px-3 py-2 text-left">Fecha</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Instrumento</th>
            <th className="px-3 py-2 text-left">Dirección</th>
            <th className="px-3 py-2 text-right">Entrada</th>
            <th className="px-3 py-2 text-right">Salida</th>
            <th className="px-3 py-2 text-right">Tamaño</th>
            <th className="px-3 py-2 text-right">P&amp;L</th>
            <th className="px-3 py-2 text-right">R</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <TradeTableRow key={t.id} trade={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
