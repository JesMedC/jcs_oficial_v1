/*
 * p0b.2 — PlanRow.
 *
 * One of the three live plan cards (Starter / Plus / Elite). Owns its
 * own edit-mode state: clicking "Editar precio" toggles into an input
 * + Save/Cancel pair. Save calls the page-level onSave callback and
 * disables the buttons while the request is in flight.
 */
import { useState } from 'react';
import type { FormEvent } from 'react';

import { GlassCard } from '../../components/GlassCard';
import { TIER_LABELS, type PlanTierPrice, type UpdatePlanPrice } from '../../features/admin/types';
import type { SubscriptionTier } from '../../features/auth/types';

interface PlanRowProps {
  readonly tier: SubscriptionTier;
  readonly plan: PlanTierPrice | null;
  readonly loading: boolean;
  readonly saving: boolean;
  readonly onSave: (payload: UpdatePlanPrice) => void;
}

export function PlanRow({ tier, plan, loading, saving, onSave }: PlanRowProps) {
  const [editing, setEditing] = useState<boolean>(false);
  const [draft, setDraft] = useState<string>(plan?.price_usd ?? '0.00');

  const handleEdit = () => {
    setDraft(plan?.price_usd ?? '0.00');
    setEditing(true);
  };

  const handleCancel = () => {
    setDraft(plan?.price_usd ?? '0.00');
    setEditing(false);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleaned = draft.trim();
    if (cleaned === '') return;
    onSave({ price_usd: cleaned });
    setEditing(false);
  };

  return (
    <GlassCard variant="default" className="flex flex-col gap-4">
      <h3 className="font-display uppercase tracking-wide text-2xl">
        {TIER_LABELS[tier]}
      </h3>
      {loading ? (
        <p className="text-text-muted font-body text-sm">Cargando...</p>
      ) : plan === null ? (
        <p className="text-text-muted font-body text-sm">Sin precio vigente.</p>
      ) : editing ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="font-display uppercase tracking-wide text-text-secondary text-xs">
              Precio USD
            </span>
            <div className="flex items-center gap-2">
              <span className="text-text-muted font-body" aria-hidden="true">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                aria-label="Precio USD"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={saving}
                required
                className="flex-1 bg-surface/60 border border-primary/30 rounded-lg px-3 py-2 text-text-primary font-mono text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-primary text-bg font-display uppercase tracking-wide px-3 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="border border-primary/40 text-primary font-display uppercase tracking-wide px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors text-sm disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <>
          <span className="font-display text-primary text-3xl md:text-4xl">${plan.price_usd}</span>
          <span className="text-text-muted font-body text-xs">
            Vigente desde {new Date(plan.effective_from).toLocaleDateString('es-ES')}
          </span>
          <button
            type="button"
            onClick={handleEdit}
            className="self-start border-2 border-primary text-primary font-display uppercase tracking-wide px-3 py-1.5 rounded-lg hover:bg-primary hover:text-bg transition-colors text-xs"
          >
            Editar precio
          </button>
        </>
      )}
    </GlassCard>
  );
}
