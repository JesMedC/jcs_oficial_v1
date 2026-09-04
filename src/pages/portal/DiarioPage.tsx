/*
 * one-by-one-thousand-discipline (PR-2) — DiarioPage.
 *
 * Now mounts the month-grid ``PnLCalendar`` as the body of the
 * Diario (Journal) page. The previous stub shipped in
 * ``portal-fase0a-base`` so the sidebar navigation was complete;
 * this replaces that placeholder with the actual analytics surface.
 *
 * Workspace id resolution: read from auth context via
 * ``useContext(AuthContext)`` directly (not the strict useAuth hook)
 * so the page still renders when the test harness doesn't mount an
 * AuthProvider — workspaceId falls back to '' and the PnLCalendar's
 * ``enabled`` guard keeps the fetch silent.
 */
import { useContext } from 'react';

import { PnLCalendar } from '../../components/dashboard/PnLCalendar';
import { AuthContext } from '../../features/auth/AuthProvider';

export function DiarioPage() {
  const authCtx = useContext(AuthContext);
  const workspaceId = authCtx?.user?.workspaces[0]?.id ?? '';

  if (workspaceId === '') {
    return (
      <div className="w-full px-2 md:px-4 py-3 md:py-4">
        <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl">
          Diario
        </h1>
        <p className="mt-3 text-text-secondary font-body text-sm md:text-base">
          Necesitás un workspace activo para ver el calendario.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-2 md:px-4 py-3 md:py-4">
      <h1 className="font-display uppercase tracking-wide text-2xl md:text-3xl">
        Diario
      </h1>
      <p className="mt-1 text-text-muted font-body text-sm">
        Mes a mes: cantidad de operaciones, P&L diario y cumplimiento.
      </p>
      <div className="mt-4">
        <PnLCalendar workspaceId={workspaceId} />
      </div>
    </div>
  );
}