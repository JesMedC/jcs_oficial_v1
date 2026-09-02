/*
 * FASE 4A — Portal OperacionesPage (Trade Station real).
 *
 * El stub p0e.1 quedó obsoleto cuando aterrizaron los componentes de la
 * feature `trades` (Ola 5/6). Esta página ahora monta la Trade Station
 * completa:
 *   - `OperationsKPIsHeader` — 3 KPI cards (P&L diario, % win, riesgo)
 *     driven por `useRiskSummary`.
 *   - `TradeFilters` — 3 selects controlados (status, type, account_id).
 *   - `TradeTable` — tabla densa de 11 columnas, incluyendo "Acción"
 *     con el botón Cerrar que abre `CloseTradeModal` portal-level.
 *   - Botón `+ Nuevo trade` que dispara `useNewTradeDrawer.open()`.
 *   - `NewTradeDrawer` montado acá (page-level) para que cualquier
 *     trigger del store (topbar, command palette, este botón) lo abra.
 *
 * El `CloseTradeModal` NO se monta acá: es portal-level y se renderiza
 * dentro de `PortalShell` (ver `src/components/portal/PortalShell.tsx`)
 * porque su ciclo de vida depende del `useCloseTrade` store, no de esta
 * página. Eso evita re-mounts cuando naveguemos a otras pestañas.
 *
 * El estado de filtros vive en la página (no en URL ni en store) — FASE
 * 4A es local-first; si la URL sync aparece en FASE 5, se mueve a
 * `useSearchParams` sin tocar los componentes hijos.
 */
import { useState } from 'react';
import { OperationsKPIsHeader } from '../../features/trades/OperationsKPIsHeader';
import { TradeFilters } from '../../features/trades/TradeFilters';
import { TradeTable } from '../../features/trades/TradeTable';
import { NewTradeDrawer } from '../../features/trades/NewTradeDrawer';
import { useNewTradeDrawer } from '../../stores/useNewTradeDrawer';
import type { ListTradesParams } from '../../features/trades/types';

export function OperacionesPage() {
  const [filters, setFilters] = useState<ListTradesParams>({});
  const openDrawer = useNewTradeDrawer((s) => s.open);

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

      <OperationsKPIsHeader />

      <TradeFilters filters={filters} onChange={setFilters} />

      <TradeTable filters={filters} />

      <NewTradeDrawer />
    </div>
  );
}