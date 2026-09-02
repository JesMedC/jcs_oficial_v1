import { Link } from 'react-router-dom';

import { GlassCard } from '../../components/GlassCard';
import type { SubscriptionOut, SubscriptionStatus, SubscriptionTier } from '../auth/types';

/*
 * p0b.1b — SubscriptionCard.
 *
 * Renders the user's current subscription in a single panel: tier
 * label, status badge, formatted `current_period_end` date and
 * remaining days (when relevant), plus the contextual CTA per
 * status.
 *
 * CTA mapping (per spec):
 *   TRIAL      → "Actualizar a Plus o Elite"  → /portal/upgrade
 *   ACTIVE     → "Gestionar suscripcion"     → /portal/upgrade
 *                 (placeholder link until real management UI in p0b.2)
 *   CANCELED   → "Reactivar suscripcion"     → /portal/upgrade
 *   EXPIRED    → "Renovar suscripcion"       → /portal/upgrade
 *   no sub     → "Activar suscripcion"       → /portal/upgrade (the
 *                 `null` case is handled by the parent DashboardPage
 *                 passing `subscription={null}`).
 */
interface SubscriptionCardProps {
  readonly subscription: SubscriptionOut | null;
}

interface BadgeStyle {
  readonly label: string;
  readonly className: string;
}

const TIER_LABELS: Record<SubscriptionTier, string> = {
  STARTER: 'Starter',
  PLUS: 'Plus',
  ELITE: 'Elite',
};

const STATUS_BADGE: Record<SubscriptionStatus, BadgeStyle> = {
  TRIAL: {
    label: 'Periodo de prueba',
    className: 'bg-primary/15 text-primary border-primary/40',
  },
  ACTIVE: {
    label: 'Activo',
    className: 'bg-profit/15 text-profit border-profit/40',
  },
  CANCELED: {
    label: 'Cancelado',
    className: 'bg-warning/15 text-warning border-warning/40',
  },
  EXPIRED: {
    label: 'Expirado',
    className: 'bg-loss/15 text-loss border-loss/40',
  },
};

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  if (subscription === null) {
    return (
      <GlassCard variant="elevated" className="p-6 md:p-8">
        <div className="flex flex-col gap-4">
          <Badge
            label="Sin suscripcion"
            className="bg-text-muted/15 text-text-secondary border-text-muted/30"
          />
          <h2 className="font-display uppercase tracking-wide text-primary text-xl md:text-2xl">
            Activa tu suscripcion
          </h2>
          <p className="font-body text-text-secondary text-sm md:text-base">
            Tu cuenta todavia no tiene una suscripcion activa. Empieza con el trial gratuito de 7
            dias o elegi un plan Plus/Elite para empezar de una.
          </p>
          <Link
            to="/portal/upgrade"
            className="self-start inline-flex bg-primary text-bg font-display uppercase tracking-wide px-5 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            Activar suscripcion
          </Link>
        </div>
      </GlassCard>
    );
  }

  const { tier, status, current_period_end } = subscription;
  const badge = STATUS_BADGE[status];
  const endsAt = parsePeriodEnd(current_period_end);
  const daysLeft = computeDaysRemaining(endsAt);
  const periodLabel =
    status === 'TRIAL' && daysLeft > 0
      ? `${daysLeft} ${daysLeft === 1 ? 'dia restante' : 'dias restantes'}`
      : null;
  const cta = ctaForStatus(status);

  return (
    <GlassCard variant="elevated" className="p-6 md:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge label={badge.label} className={badge.className} />
          {periodLabel !== null ? (
            <span className="font-mono text-xs text-text-secondary">{periodLabel}</span>
          ) : null}
        </div>

        <div>
          <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
            Plan {TIER_LABELS[tier]}
          </h2>
          <p className="font-body text-text-secondary text-sm md:text-base mt-2">
            {descriptionFor(tier, status)}
          </p>
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <Field label="Fecha de renovacion" value={formatPeriodEnd(endsAt)} />
          {periodLabel !== null ? (
            <Field label="Tiempo restante" value={periodLabel} />
          ) : (
            <Field label="Estado" value={badge.label} />
          )}
        </dl>

        <div className="flex flex-wrap gap-3 mt-2">
          <Link
            to={cta.to}
            className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-5 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            {cta.label}
          </Link>
        </div>
      </div>
    </GlassCard>
  );
}

function Badge({ label, className }: { readonly label: string; readonly className: string }) {
  return (
    <span
      className={[
        'inline-flex items-center px-3 py-1 rounded-full font-display uppercase tracking-wide text-[10px] md:text-xs border',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}

function Field({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="bg-surface/40 border border-primary/15 rounded-lg px-3 py-2">
      <dt className="font-display uppercase tracking-wide text-text-muted text-[10px] md:text-xs">
        {label}
      </dt>
      <dd className="font-mono text-text-primary text-sm mt-1">{value}</dd>
    </div>
  );
}

function ctaForStatus(status: SubscriptionStatus): { readonly label: string; readonly to: string } {
  switch (status) {
    case 'TRIAL':
      return { label: 'Actualizar a Plus o Elite', to: '/portal/upgrade' };
    case 'ACTIVE':
      return { label: 'Gestionar suscripcion', to: '/portal/upgrade' };
    case 'CANCELED':
      return { label: 'Reactivar suscripcion', to: '/portal/upgrade' };
    case 'EXPIRED':
      return { label: 'Renovar suscripcion', to: '/portal/upgrade' };
  }
}

function descriptionFor(tier: SubscriptionTier, status: SubscriptionStatus): string {
  if (status === 'TRIAL') {
    return `Estas probando el plan ${TIER_LABELS[tier]} gratis. Cuando termine el trial, tu suscripcion se pondra en pausa hasta que elijas un plan de pago.`;
  }
  if (status === 'ACTIVE') {
    return `Tu plan ${TIER_LABELS[tier]} esta activo. Podes gestionarlo desde aqui o cambiar a otro tier en cualquier momento.`;
  }
  if (status === 'CANCELED') {
    return `Tu plan ${TIER_LABELS[tier]} fue cancelado. Podes reactivarlo cuando quieras para volver a disfrutar de las funciones pagas.`;
  }
  return `Tu plan ${TIER_LABELS[tier]} expiro. Renuevalo para volver a operar con metricas avanzadas y soporte prioritario.`;
}

function parsePeriodEnd(raw: string): Date | null {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatPeriodEnd(d: Date | null): string {
  if (d === null) return 'Fecha no disponible';
  return d.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function computeDaysRemaining(d: Date | null): number {
  if (d === null) return 0;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
