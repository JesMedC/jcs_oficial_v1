/*
 * p0b.2 — AdminDashboardPage (real).
 *
 * Replaces the p0a.2 placeholder. Renders the four KPI cards driven
 * by `listUsersApi()` + `listPlansApi()`:
 *
 *   1. Usuarios activos — `items.filter(u => u.is_active).length`
 *   2. Usuarios totales — `total`
 *   3. Suscripciones activas — count of items where
 *      current_subscription.status === 'ACTIVE'
 *   4. Pagos del mes — proxy: sum of `price_usd` of the active plan
 *      per user with an active subscription (we don't have real MP
 *      payments yet so this is the best approximation; documented as
 *      such in the card label).
 *
 * The page is lazy-loaded by the router config; the AdminLayout
 * already mounted AdminAuthGuard above so we don't repeat the role
 * check here.
 *
 * Loading + error states use the same ErrorBanner pattern as the
 * other dashboard pages — keeps the 4R Resilience visible to users.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { listPlansApi, listUsersApi } from '../../features/admin/api';
import type { PlanTierPrice, UserWithSubscription } from '../../features/admin/types';
import type { ErrorEnvelope } from '../../features/auth/types';

interface KpiCardProps {
  readonly icon: JSX.Element;
  readonly label: string;
  readonly value: string;
  readonly note: string;
}

function KpiCard({ icon, label, value, note }: KpiCardProps) {
  return (
    <GlassCard variant="default" className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="font-display uppercase tracking-wide text-text-secondary text-xs">
          {label}
        </span>
      </div>
      <span className="font-display text-primary text-3xl md:text-4xl">{value}</span>
      <span className="text-text-muted font-body text-xs">{note}</span>
    </GlassCard>
  );
}

function UsersIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21a7 7 0 0114 0M21 21a5 5 0 00-3.535-4.778"
      />
    </svg>
  );
}
function ActiveSubIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
function MoneyIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9M9 14h5a2.5 2.5 0 010 5H9"
      />
    </svg>
  );
}
function TotalIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3z" />
    </svg>
  );
}

interface DashboardMetrics {
  readonly totalUsers: number;
  readonly activeUsers: number;
  readonly activeSubscriptions: number;
  readonly monthlyRevenueUsd: string;
}

function computeMetrics(
  users: readonly UserWithSubscription[],
  plans: readonly PlanTierPrice[],
): DashboardMetrics {
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.is_active).length;
  const activeSubs = users.filter(
    (u) => u.current_subscription !== null && u.current_subscription.status === 'ACTIVE',
  ).length;

  const priceByTier = new Map<string, number>();
  for (const plan of plans) {
    if (plan.is_active) priceByTier.set(plan.tier, Number(plan.price_usd));
  }
  let totalRevenue = 0;
  for (const user of users) {
    const sub = user.current_subscription;
    if (sub !== null && sub.status === 'ACTIVE') {
      const price = priceByTier.get(sub.tier) ?? 0;
      totalRevenue += price;
    }
  }
  return {
    totalUsers,
    activeUsers,
    activeSubscriptions: activeSubs,
    monthlyRevenueUsd: totalRevenue.toFixed(2),
  };
}

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [users, plans] = await Promise.all([listUsersApi({ limit: 200 }), listPlansApi()]);
        if (cancelled) return;
        setMetrics(computeMetrics(users.items, plans));
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const envelope = err as ErrorEnvelope;
        setError(envelope);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <SeoHead
        title="Panel de Administrador"
        description="Vista general de usuarios y planes en JadeCapitalSuite."
        canonicalPath="/admin"
        noindex
      />
      <div className="max-w-6xl mx-auto">
        <h1
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl mb-2"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Panel de administracion
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mb-8 max-w-2xl">
          Vista general de la plataforma. Las metricas de pagos del mes son una estimacion basada en
          los precios vigentes hasta que conectemos MercadoPago en vivo (p0c).
        </p>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <KpiCard
            icon={<ActiveSubIcon />}
            label="Usuarios activos"
            value={metrics === null ? '—' : String(metrics.activeUsers)}
            note="Usuarios con is_active = true."
          />
          <KpiCard
            icon={<TotalIcon />}
            label="Usuarios totales"
            value={metrics === null ? '—' : String(metrics.totalUsers)}
            note="Todos los usuarios registrados."
          />
          <KpiCard
            icon={<UsersIcon />}
            label="Suscripciones activas"
            value={metrics === null ? '—' : String(metrics.activeSubscriptions)}
            note="Usuarios con suscripcion ACTIVE."
          />
          <KpiCard
            icon={<MoneyIcon />}
            label="Pagos del mes"
            value={metrics === null ? '—' : `$${metrics?.monthlyRevenueUsd ?? '0.00'} USD`}
            note={
              loading ? 'Cargando...' : 'Proxy: suma de precios activos por suscripcion ACTIVE.'
            }
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            Ver usuarios
          </Link>
          <Link
            to="/admin/plans"
            className="inline-flex items-center justify-center border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
          >
            Ver planes
          </Link>
        </div>
      </div>
    </>
  );
}
