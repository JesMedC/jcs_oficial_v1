/*
 * sessions-configurable-cap (Slice B, T-016) — DisciplinaTab.
 *
 * The 4th tab on ConfiguracionPage that surfaces the per-workspace
 * session-ops cap (REQ-DSC-007). Lets the user tighten (never
 * loosen) the discipline engine's per-session trade limit within
 * the plan-tier ceiling.
 *
 * UX:
 *   - Plan ceiling is read-only helper text (Asia / Europa / NY_AM
 *     style — design.md §4.3) so the user always knows the hard cap.
 *   - Numeric input bound by ``min=1, max=ceiling``. The ceiling
 *     comes from the shared ``PLAN_CEILING`` map; when the active
 *     workspace's ``session_ops_cap`` is non-null we seed the input
 *     with that value so the tab is round-trip safe.
 *   - "Guardar" button calls ``useUpdateSessionCap`` (T-017). On
 *     success the cache invalidation in that hook refreshes the
 *     workspace payload on the next render so the ceiling / input
 *     stay in sync with the server.
 *   - 422 ``DISCIPLINE_CAP_OUT_OF_RANGE`` renders a localized error
 *     pill whose message includes the ceiling (the backend bakes
 *     the ceiling into the error message — see
 *     ``backend/app/api/v1/workspace_discipline.py``).
 *
 * The tab reads the active workspace via ``useAuth().workspaces[0]``
 * — Slice B doesn't introduce a workspace switcher; if/when one
 * ships, this becomes the selector-driven workspace.
 */
import { useMemo, useState } from 'react';

import { useAuth } from '../../features/auth/useAuth';
import { useUpdateSessionCap } from '../../features/workspace-discipline/useUpdateSessionCap';
import { ceilingFor } from '../../features/sessions/plan';

export function DisciplinaTab() {
  const { user } = useAuth();
  // Slice B: the active workspace is the first one in the auth
  // payload. The portal doesn't yet ship a workspace switcher;
  // when it does, this becomes the selector-driven value.
  const workspace = user?.workspaces[0];

  // The plan ceiling is the hard upper bound on the input. We
  // resolve it from the shared PLAN_CEILING map (mirrors the
  // backend `_PLAN_CEILING_BY_TIER`).
  const ceiling = useMemo(
    () => (workspace !== undefined ? ceilingFor(workspace.plan_tier) : 4),
    [workspace],
  );

  // Seed the input from the workspace's persisted cap; if the
  // cap is null (the default after the migration backfill is the
  // ceiling but the API returns null for explicit-resets), the
  // ceiling itself becomes the initial value so the input never
  // opens blank.
  const initialValue = workspace?.session_ops_cap ?? ceiling;
  const [value, setValue] = useState<number>(initialValue);

  const mutation = useUpdateSessionCap();

  if (workspace === undefined) {
    // Defensive — `useAuth` throws when used outside the provider,
    // so reaching this branch implies the auth payload has zero
    // workspaces (which is genuinely invalid for the portal flow).
    return (
      <div
        data-testid="tab-disciplina"
        className="border border-[rgba(0,255,157,0.15)] rounded-xl bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-6"
      >
        <p className="font-body text-sm text-text-secondary">
          Necesitas un workspace activo para ajustar la disciplina.
        </p>
      </div>
    );
  }

  const handleSubmit = () => {
    mutation.mutate({
      workspaceId: workspace.id,
      session_ops_cap: value,
    });
  };

  // The error envelope from the axios interceptor has a `code`
  // discriminator — surface it as a localized pill when it's the
  // canonical DISCIPLINE_CAP_OUT_OF_RANGE.
  const errorCode =
    mutation.error !== null && typeof mutation.error === 'object' && 'code' in mutation.error
      ? (mutation.error as { code?: string }).code
      : undefined;
  const errorMessage =
    mutation.error !== null && typeof mutation.error === 'object' && 'message' in mutation.error
      ? (mutation.error as { message?: string }).message
      : undefined;

  return (
    <div
      data-testid="tab-disciplina"
      className="flex flex-col gap-4 border border-[rgba(0,255,157,0.15)] rounded-xl bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-5 md:p-6"
    >
      <div>
        <h2 className="font-display uppercase tracking-wide text-base md:text-lg text-text-primary">
          Disciplina
        </h2>
        <p className="text-text-secondary font-body text-sm mt-2 max-w-2xl">
          Ajusta el tope de operaciones por sesión dentro del máximo de tu plan.
        </p>
      </div>

      <div
        data-testid="disciplina-ceiling"
        className="font-body text-sm text-text-secondary"
      >
        Plan actual: <span className="text-text-primary font-display uppercase">{workspace.plan_tier}</span>
        {' — '}
        tope <span className="text-primary font-display">{ceiling}</span> ops/sesión/día
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <label className="flex flex-col gap-1">
          <span className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Operaciones por sesión
          </span>
          <input
            type="number"
            min={1}
            max={ceiling}
            value={value}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isFinite(next)) {
                setValue(next);
              }
            }}
            data-testid="disciplina-cap-input"
            className="w-32 px-3 py-2 bg-surface-el/50 border border-primary/30 rounded-lg text-text-primary font-mono text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          data-testid="disciplina-save"
          className="px-4 py-2 bg-primary text-primary-fg font-display uppercase tracking-wide text-sm rounded-lg hover:shadow-glow-jade transition-shadow disabled:opacity-60"
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      {errorCode === 'DISCIPLINE_CAP_OUT_OF_RANGE' ? (
        <div
          role="alert"
          data-testid="disciplina-error"
          className="px-3 py-2 bg-loss/15 border border-loss/40 rounded-lg text-loss font-body text-sm"
        >
          <span className="font-display uppercase text-[10px] tracking-widest mr-2">
            {errorCode}
          </span>
          {errorMessage ?? `Valor fuera de rango (techo ${ceiling}).`}
        </div>
      ) : null}
    </div>
  );
}
