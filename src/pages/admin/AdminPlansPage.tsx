/*
 * p0b.2 — AdminPlansPage.
 *
 * Lists the three active plan prices (Starter / Plus / Elite) with
 * inline edit forms. Below the live rows, the page renders the
 * deactivated history rows (effective_until !== null) so admins can
 * audit the price evolution.
 *
 * Each PlanRow component owns its own edit form (Save/Cancel). The
 * page only re-fetches after a save success.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PlanHistoryRow } from '../../components/admin/PlanHistoryRow';
import { PlanRow } from '../../components/admin/PlanRow';
import { listPlansApi, updatePlanPriceApi } from '../../features/admin/api';
import type { PlanTierPrice, UpdatePlanPrice } from '../../features/admin/types';
import type { ErrorEnvelope, SubscriptionTier } from '../../features/auth/types';

const ACTIVE_TIERS: ReadonlyArray<SubscriptionTier> = ['STARTER', 'PLUS', 'ELITE'];

export function AdminPlansPage() {
  const [plans, setPlans] = useState<readonly PlanTierPrice[] | null>(null);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [success, setSuccess] = useState<string | null>(null);
  const [savingTier, setSavingTier] = useState<SubscriptionTier | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listPlansApi();
      setPlans(rows);
      setError(null);
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlans();
  }, [fetchPlans]);

  const activeByTier = useMemo(() => {
    const map = new Map<SubscriptionTier, PlanTierPrice>();
    if (plans === null) return map;
    for (const plan of plans) {
      if (plan.is_active && !map.has(plan.tier)) {
        map.set(plan.tier, plan);
      }
    }
    return map;
  }, [plans]);

  const history = useMemo(
    () =>
      (plans ?? [])
        .filter((p) => p.effective_until !== null)
        .sort((a, b) => {
          const at = new Date(a.effective_until ?? 0).getTime();
          const bt = new Date(b.effective_until ?? 0).getTime();
          return bt - at;
        }),
    [plans],
  );

  const handleSave = async (tier: SubscriptionTier, payload: UpdatePlanPrice) => {
    setSavingTier(tier);
    try {
      await updatePlanPriceApi(tier, payload.price_usd);
      setSuccess(`Precio de ${tier} actualizado a $${payload.price_usd}`);
      setError(null);
      await fetchPlans();
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setSavingTier(null);
    }
  };

  return (
    <>
      <SeoHead
        title="Planes"
        description="Gestion de precios de planes en JadeCapitalSuite."
        canonicalPath="/admin/plans"
        noindex
      />
      <div className="max-w-5xl mx-auto">
        <h1
          className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl mb-2"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Planes
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mb-6 max-w-2xl">
          Cambia el precio vigente de cada plan. El sistema crea una fila nueva con la fecha
          efectiva actual y desactiva la fila anterior — la historia queda abajo para auditoria.
        </p>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-4" />
        {success !== null ? (
          <div
            role="status"
            className="mb-4 bg-profit/10 border border-profit/40 rounded-xl px-4 py-3 text-profit font-body text-sm"
          >
            {success}
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Cerrar mensaje"
              className="ml-3 text-profit/80 hover:text-profit"
            >
              ×
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {ACTIVE_TIERS.map((tier) => {
            const plan = activeByTier.get(tier) ?? null;
            return (
              <PlanRow
                key={tier}
                tier={tier}
                plan={plan}
                loading={loading && plan === null}
                saving={savingTier === tier}
                onSave={(payload) => void handleSave(tier, payload)}
              />
            );
          })}
        </div>

        <section className="mt-10">
          <h2 className="font-display uppercase tracking-wide text-primary text-xl mb-3">
            Historial de precios
          </h2>
          <GlassCard variant="default" className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/60 text-text-muted font-display uppercase tracking-wide text-xs">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Plan
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Precio
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Vigente desde
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Vigente hasta
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-text-muted font-body">
                      Sin cambios previos.
                    </td>
                  </tr>
                ) : (
                  history.map((plan) => <PlanHistoryRow key={plan.id} plan={plan} />)
                )}
              </tbody>
            </table>
          </GlassCard>
        </section>
      </div>
    </>
  );
}
