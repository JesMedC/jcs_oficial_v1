/*
 * one-by-one-thousand-discipline (PR-2) — DiarioPage.
 *
 * FASE 6 rediseño: el "Diario" ahora muestra el Calendario P&L con
 * KPIs mensuales prominentes, día seleccionable y panel de detalle
 * con las operaciones del día. El panel usa los trades ya en cache
 * (``useTradesAll``) — filtramos client-side por fecha.
 *
 * Scope:
 * - Workspace id se resuelve desde la primera cuenta activa del
 *   usuario (NO desde ``workspaces[0]`` del auth context — el demo
 *   seed tiene dos workspaces por usuario y el vacío cae en el index
 *   0).
 * - El AccountSelector maneja el alcance (single o todas).
 */
import { useMemo, useState } from 'react';

import { PnLCalendar } from '../../components/dashboard/PnLCalendar';
import { AccountSelector } from '../../components/dashboard/AccountSelector';
import { useAccounts } from '../../features/accounts/hooks';
import { useTradesAll } from '../../features/trades/useTradesAll';
import { AuthContext } from '../../features/auth/AuthProvider';
import { useContext } from 'react';

export function DiarioPage() {
  const authCtx = useContext(AuthContext);
  const accountsQuery = useAccounts();
  const firstAccountWorkspaceId = accountsQuery.data?.items[0]?.workspace_id;
  const workspaceId =
    firstAccountWorkspaceId ?? authCtx?.user?.workspaces[0]?.id ?? '';

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(
    null,
  );

  // Fetch the trade history for the active account scope. The
  // calendar's day-detail panel filters this client-side by the
  // selected YYYY-MM-DD — no per-day refetch needed.
  const tradesAll = useTradesAll(
    selectedAccountId !== null ? { account_id: selectedAccountId } : {},
  );

  // Defense-in-depth: only show trades whose account is in the
  // user's active set, same contract as ``OperacionesPage``.
  const tradesForDayPanel = useMemo(() => {
    const ids = new Set<string>();
    for (const a of accountsQuery.data?.items ?? []) ids.add(a.id);
    return (tradesAll.trades ?? []).filter((t) => ids.has(t.account_id));
  }, [tradesAll.trades, accountsQuery.data]);

  if (workspaceId === '') {
    return (
      <div className="w-full px-2 md:px-4 py-3 md:py-4">
        <h1
          className="font-display uppercase tracking-wide text-2xl md:text-3xl"
          style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}
        >
          Calendario P&L
        </h1>
        <p className="mt-3 text-text-secondary font-body text-sm md:text-base">
          Necesitás un workspace activo para ver el calendario.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4 py-3 md:py-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <span className="font-display uppercase tracking-widest text-[10px] md:text-xs text-text-muted">
            Diario · Calendario
          </span>
          <h1
            className="font-display uppercase tracking-wide text-2xl md:text-3xl mt-1"
            style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}
          >
            Calendario P&L
          </h1>
          <p className="mt-1 text-text-muted font-body text-sm">
            Mes a mes: cantidad de operaciones, P&L diario y cumplimiento.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <AccountSelector
            value={selectedAccountId}
            onChange={setSelectedAccountId}
          />
        </div>
      </div>

      <div className="mt-5">
        <PnLCalendar
          workspaceId={workspaceId}
          accountId={selectedAccountId}
          tradesForDayPanel={tradesForDayPanel}
        />
      </div>
    </div>
  );
}