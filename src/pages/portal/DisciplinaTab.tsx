/*
 * sessions-configurable-cap (Slice B, T-016) — DisciplinaTab.
 *
 * After the per-account risk-control move, this tab surfaces the cap
 * for the user's first active trading account (the legacy workspaces
 * fallback is gone — the discipline engine already buckets trades per
 * account, so each account owns its own cap).
 *
 * UX:
 *   - Plan ceiling is read-only helper text so the user always knows
 *     the hard cap.
 *   - Numeric input bound by ``min=1, max=ceiling``. The ceiling comes
 *     from the shared ``ceilingFor(planTier)`` map and tracks the
 *     account's workspace plan.
 *   - "Guardar" calls ``useUpdateSessionCap`` (T-017). On success the
 *     cache invalidation refreshes the account payload on the next
 *     render so the ceiling / input stay in sync with the server.
 *   - 422 ``DISCIPLINE_CAP_OUT_OF_RANGE`` renders a localized error
 *     pill whose message includes the ceiling.
 *
 * If the user has zero accounts (which is invalid for the portal
 * flow), the tab renders the same defensive empty state it used to
 * for missing workspaces.
 */
import { useMemo, useState } from 'react';

import { PageHeader } from '../../components/ui/PageHeader';
import { useAccounts } from '../../features/accounts/hooks';
import { useAuth } from '../../features/auth/useAuth';
import { useUpdateSessionCap } from '../../features/workspace-discipline/useUpdateSessionCap';
import { ceilingFor } from '../../features/sessions/plan';

export function DisciplinaTab() {
  const { user } = useAuth();
  const accountsQuery = useAccounts();
  const accounts = accountsQuery.data?.items ?? [];
  const activeAccount = accounts[0];

  // The plan ceiling is the hard upper bound on the input. We
  // resolve it from the shared PLAN_CEILING map (mirrors the
  // backend `_PLAN_CEILING_BY_TIER`). All accounts in a workspace
  // share the same plan tier, so the active workspace's plan_tier
  // is the right source — no need to round-trip it via the account.
  const planTier = user?.workspaces[0]?.plan_tier ?? 'NONE';
  const ceiling = useMemo(() => ceilingFor(planTier), [planTier]);

  // Seed the input from the account's persisted cap when present;
  // otherwise fall back to the plan ceiling so the input never opens
  // blank.
  const initialValue = activeAccount?.session_ops_cap ?? ceiling;
  const [value, setValue] = useState<number>(initialValue);

  const mutation = useUpdateSessionCap();

  if (activeAccount === undefined) {
    return (
      <div
        data-testid="tab-disciplina"
        className="border border-[rgba(0,255,157,0.15)] rounded-xl bg-[rgba(13,21,30,0.7)] backdrop-blur-[12px] p-6"
      >
        <p className="font-body text-sm text-text-secondary">
          Necesitás una cuenta activa para ajustar la disciplina.
        </p>
      </div>
    );
  }

  const handleSubmit = () => {
    mutation.mutate({
      accountId: activeAccount.id,
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
        <PageHeader
          subLabel="Configuración · Plan"
          title="Disciplina"
          subtitle="Ajusta el tope de operaciones por sesión dentro del máximo de tu plan."
        />
      </div>

      <div
        data-testid="disciplina-ceiling"
        className="font-body text-sm text-text-secondary"
      >
        Plan actual:{' '}
        <span className="text-text-primary font-display uppercase">{planTier}</span>
        {' — '}
        tope <span className="text-primary font-display">{ceiling}</span> ops/sesión/día
        {' · '}
        cuenta{' '}
        <span className="text-text-primary font-display uppercase">
          {activeAccount.name}
        </span>
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
