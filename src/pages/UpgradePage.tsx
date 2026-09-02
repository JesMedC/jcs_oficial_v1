import { useState } from 'react';

import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';
import { ErrorBanner } from '../components/ErrorBanner';
import { RouteFallback } from '../components/RouteFallback';
import { useAuth } from '../features/auth/useAuth';
import { upgradeSubscription } from '../features/subscription/api';
import { UpgradeCard } from '../features/subscription/UpgradeCard';
import type { ErrorEnvelope, UpgradeTier } from '../features/auth/types';

/*
 * p0c — UpgradePage.
 *
 * /dashboard/upgrade presents the two paid tiers (Plus / Elite).
 * Each card fires POST /api/v1/subscriptions/upgrade with the chosen
 * tier + las back_urls (success/failure/pending) que apuntan a
 * /payment/{success,failure}. La respuesta contiene un ``checkout_url``
 * real de MercadoPago al que redirigimos al usuario.
 *
 * Loading: cyan spinner via RouteFallback mientras la API está en
 * vuelo. Errors: envelope ``message`` renderizado via ErrorBanner.
 */
const TIERS: ReadonlyArray<{
  readonly id: UpgradeTier;
  readonly priceUsd: number;
  readonly tagline: string;
  readonly features: ReadonlyArray<string>;
}> = [
  {
    id: 'PLUS',
    priceUsd: 9.99,
    tagline: 'Para traders que quieren crecer.',
    features: [
      'Hasta 5 cuentas',
      'Metricas avanzadas y filtros',
      'Reportes personalizados',
      'Exportacion de datos (CSV)',
      'Soporte prioritario',
    ],
  },
  {
    id: 'ELITE',
    priceUsd: 29.99,
    tagline: 'Para traders exigentes.',
    features: [
      'Cuentas ilimitadas',
      'Analisis avanzado de rendimiento',
      'Backtesting de estrategias',
      'Alertas y objetivos personalizados',
      'Soporte VIP',
    ],
  },
];

function buildBackUrls(): { success: string; failure: string; pending: string } {
  if (typeof window === 'undefined') {
    return { success: '', failure: '', pending: '' };
  }
  const base = window.location.origin;
  return {
    success: `${base}/payment/success`,
    failure: `${base}/payment/failure`,
    pending: `${base}/payment/success`,
  };
}

export function UpgradePage() {
  const { loading: authLoading } = useAuth();
  const [pending, setPending] = useState<UpgradeTier | null>(null);
  const [error, setError] = useState<ErrorEnvelope | null>(null);

  const handleSelect = async (tier: UpgradeTier) => {
    setError(null);
    setPending(tier);
    try {
      const urls = buildBackUrls();
      const res = await upgradeSubscription(tier, urls);
      if (typeof window !== 'undefined' && res.checkout_url !== '') {
        window.location.href = res.checkout_url;
        return;
      }
      throw {
        code: 'INTERNAL_ERROR',
        message: 'No pudimos obtener el link de pago. Intenta de nuevo.',
        correlation_id: 'unavailable',
      } satisfies ErrorEnvelope;
    } catch (err) {
      const envelope = err as ErrorEnvelope;
      if (envelope && typeof envelope === 'object' && 'code' in envelope) {
        setError(envelope);
      } else {
        setError({
          code: 'INTERNAL_ERROR',
          message: 'Error inesperado al iniciar el pago.',
          correlation_id: 'unavailable',
        });
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <SeoHead
        title="Elegir plan"
        description="Sube de plan en cualquier momento. Cancela cuando quieras."
        canonicalPath="/portal/upgrade"
        noindex
      />
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <header className="text-center max-w-2xl mx-auto">
          <h1
            className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
          >
            Elige tu plan
          </h1>
          <p className="text-text-secondary font-body text-sm md:text-base mt-4">
            Sube de plan en cualquier momento. Cancela cuando quieras.
          </p>
        </header>

        {authLoading ? (
          <div className="mt-10">
            <RouteFallback label="Cargando planes" />
          </div>
        ) : (
          <>
            {error !== null ? (
              <div className="mt-8 max-w-xl mx-auto">
                <ErrorBanner error={error} onDismiss={() => setError(null)} />
              </div>
            ) : null}

            <section className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {TIERS.map((tier) => (
                <UpgradeCard
                  key={tier.id}
                  tier={tier.id}
                  priceUsd={tier.priceUsd}
                  tagline={tier.tagline}
                  features={tier.features}
                  loading={pending === tier.id}
                  onSelect={(t) => void handleSelect(t)}
                />
              ))}
            </section>

            <GlassCard variant="default" className="mt-10 max-w-2xl mx-auto">
              <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
                Pago seguro
              </h2>
              <p className="text-text-secondary font-body text-sm mt-2">
                Procesamos los pagos con MercadoPago. Vas a ser redirigido a su sitio para completar
                la transaccion y volver automaticamente a tu portal.
              </p>
            </GlassCard>
          </>
        )}
      </div>
    </>
  );
}
