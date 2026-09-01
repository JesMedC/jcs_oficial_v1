/*
 * p0b.1b — Dashboard page (authenticated landing zone).
 *
 * Renders a personalized greeting (`Hola, {first_name}`) plus the
 * SubscriptionCard that surfaces the current subscription status,
 * renewal date, remaining trial days, and a contextual CTA. The real
 * trade journal / metrics UI lands in p0e+.
 */
import { Link } from 'react-router-dom';

import { useAuth } from '../features/auth/useAuth';
import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';
import { SubscriptionCard } from '../features/subscription/SubscriptionCard';
import { cancelSubscription } from '../features/subscription/api';
import type { ErrorEnvelope } from '../features/auth/types';

export function DashboardPage() {
  const { user, subscription, logout } = useAuth();

  const handleCancel = async () => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm('Seguro que queres cancelar tu suscripcion?')
    ) {
      return;
    }
    try {
      await cancelSubscription();
      // Force a re-fetch via auth refresh so the dashboard re-renders
      // with the new CANCELED status without a full page reload.
      window.location.reload();
    } catch (err) {
      const envelope = err as ErrorEnvelope;
      // Surface the envelope message via console for now; a real
      // toast banner lands in p0b.2 alongside the management UI.
      if (typeof window !== 'undefined') {
        const message =
          envelope && typeof envelope === 'object' && 'message' in envelope
            ? envelope.message
            : 'No pudimos cancelar la suscripcion. Intenta de nuevo.';
        window.alert(message);
      }
    }
  };

  return (
    <>
      <SeoHead
        title="Dashboard"
        description="Tu portal de usuario en JadeCapitalSuite. Modulo en construccion — Fase 0e."
        canonicalPath="/dashboard"
        noindex
      />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1
          className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Hola, {user?.first_name ?? 'trader'}
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-2xl">
          Tu portal de usuario esta en construccion. Pronto: registro de operaciones, journal,
          metricas.
        </p>

        <div className="mt-8">
          <SubscriptionCard subscription={subscription} />
        </div>

        <GlassCard variant="default" className="mt-8">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
            Proximamente
          </h2>
          <ul className="text-text-secondary font-body text-sm mt-3 space-y-2 list-disc list-inside">
            <li>Registro de operaciones (forex, binarias, cripto).</li>
            <li>Journal con notas, screenshots y tags.</li>
            <li>Metricas avanzadas: P&amp;L, drawdown, R:R, expectancia.</li>
            <li>Suscripciones y pagos (Fase 0c — MercadoPago en vivo).</li>
          </ul>
        </GlassCard>

        <div className="mt-8 flex flex-wrap gap-3">
          {subscription !== null && subscription.status === 'ACTIVE' ? (
            <button
              type="button"
              onClick={() => void handleCancel()}
              className="inline-flex items-center justify-center border border-loss/40 text-loss font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-loss/10 transition-colors text-sm"
            >
              Cancelar suscripcion
            </button>
          ) : null}
          <Link
            to="/dashboard/upgrade"
            className="inline-flex items-center justify-center border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
          >
            Ver planes
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
          >
            Cerrar sesion
          </button>
        </div>
      </div>
    </>
  );
}
