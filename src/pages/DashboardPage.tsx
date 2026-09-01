/*
 * p0a.2 — Dashboard placeholder.
 *
 * The real dashboard lands in p0e+. For now this page is the
 * authenticated landing zone so a successful login has somewhere
 * to go. It surfaces the user name, a "what's coming" teaser, and
 * a "Cerrar sesion" CTA wired to the auth context.
 */
import { useAuth } from '../features/auth/useAuth';
import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';

export function DashboardPage() {
  const { user, logout } = useAuth();

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
          Bienvenido, {user?.name ?? 'trader'}
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-2xl">
          Tu portal de usuario esta en construccion. Pronto: registro de operaciones, journal,
          metricas.
        </p>

        <GlassCard variant="default" className="mt-8">
          <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
            Proximamente
          </h2>
          <ul className="text-text-secondary font-body text-sm mt-3 space-y-2 list-disc list-inside">
            <li>Registro de operaciones (forex, binarias, cripto).</li>
            <li>Journal con notas, screenshots y tags.</li>
            <li>Metricas avanzadas: P&amp;L, drawdown, R:R, expectancia.</li>
            <li>Suscripciones y pagos (Fase 0b — MercadoPago).</li>
          </ul>
        </GlassCard>

        <button
          type="button"
          onClick={() => void logout()}
          className="mt-8 inline-flex items-center justify-center bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
        >
          Cerrar sesion
        </button>
      </div>
    </>
  );
}
