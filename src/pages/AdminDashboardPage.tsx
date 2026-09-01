/*
 * p0a.2 — Admin dashboard placeholder.
 *
 * Real admin endpoints (active users, payments, page likes) land
 * in p0d. For now this page is the authenticated admin landing
 * zone so the portal selector has a destination. It renders three
 * placeholder cards: active users, payments this month, page views.
 */
import { useAuth } from '../features/auth/useAuth';
import { SeoHead } from '../components/SeoHead';
import { GlassCard } from '../components/GlassCard';

const PLACEHOLDER_CARDS: ReadonlyArray<{ title: string; note: string }> = [
  { title: 'Usuarios activos', note: 'Conteo de usuarios con sesion en los ultimos 30 dias.' },
  { title: 'Pagos del mes', note: 'Ingresos confirmados por suscripcion este mes.' },
  { title: 'Paginas vistas', note: 'Eventos de page view desde el portal publico.' },
];

export function AdminDashboardPage() {
  const { user, logout } = useAuth();

  return (
    <>
      <SeoHead
        title="Portal de Administrador"
        description="Vista general de usuarios activos, pagos y paginas vistas. Modulo en construccion — Fase 0d."
        canonicalPath="/admin"
        noindex
      />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h1
          className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Portal de Administrador
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mt-4 max-w-2xl">
          Hola, {user?.name ?? 'admin'}. Vista general de usuarios activos, pagos y likes de pagina.
          Modulo en construccion — Fase 0d.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {PLACEHOLDER_CARDS.map((card) => (
            <GlassCard key={card.title} variant="default">
              <h2 className="font-display uppercase tracking-wide text-primary text-base md:text-lg">
                {card.title}
              </h2>
              <p className="text-text-muted font-mono text-3xl mt-4">—</p>
              <p className="text-text-secondary font-body text-xs md:text-sm mt-3">{card.note}</p>
            </GlassCard>
          ))}
        </div>

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
