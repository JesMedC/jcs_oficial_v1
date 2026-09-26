import { SeoHead } from '../../components/SeoHead';
import { MetricCard, type MetricCardTone } from '../../components/ui/MetricCard';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { useRiskSummary } from '../../features/trades/hooks';
import type { RiskLevel } from '../../features/trades/types';

const LEVEL_COPY: Record<RiskLevel, { label: string; tone: MetricCardTone; detail: string }> = {
  green: {
    label: 'Riesgo bajo',
    tone: 'positive',
    detail: 'Condiciones dentro del plan operativo.',
  },
  yellow: {
    label: 'Riesgo medio',
    tone: 'warning',
    detail: 'Bajá exposición y validá cada entrada.',
  },
  red: {
    label: 'Riesgo alto',
    tone: 'risk',
    detail: 'Stop recomendado: protegé capital antes de seguir.',
  },
};

function formatUsd(value: string | undefined): string {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatWinRate(value: number | undefined): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function RiskGlyph() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3l7.5 3.5v5.2c0 4.3-2.9 7.7-7.5 9.3-4.6-1.6-7.5-5-7.5-9.3V6.5L12 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5h.01" />
    </svg>
  );
}

export function RiesgoPage() {
  const riskQuery = useRiskSummary();
  const summary = riskQuery.data;
  const level = summary?.level ?? 'green';
  const levelCopy = LEVEL_COPY[level];

  return (
    <>
      <SeoHead
        title="Riesgo"
        description="Resumen de riesgo operativo de JadeCapitalSuite."
        canonicalPath="/portal/riesgo"
        noindex
      />
      <div data-testid="riesgo-page" className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-2 sm:p-4 lg:p-6">
        <SurfacePanel as="section" variant="elevated" padding="lg" className="motion-reveal overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <span data-portal-kicker className="text-[10px] md:text-xs">
                Risk Control
              </span>
              <h1 className="mt-2 font-display text-2xl uppercase tracking-wide text-text-primary md:text-4xl">
                Riesgo
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary md:text-base">
                Monitoreá el semáforo de la sesión, el P&L del día y la exposición abierta antes de tomar la próxima decisión.
              </p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-3 text-primary shadow-[0_0_24px_rgba(0,212,216,0.20)]">
              <RiskGlyph />
            </div>
          </div>
        </SurfacePanel>

        {riskQuery.isLoading ? (
          <SurfacePanel as="section" variant="default" padding="md" className="motion-reveal">
            <p className="text-sm text-text-secondary">Cargando resumen de riesgo...</p>
          </SurfacePanel>
        ) : null}

        {riskQuery.isError ? (
          <SurfacePanel as="section" variant="outline" padding="md" className="motion-reveal border-loss/50">
            <p className="text-sm text-loss">No pudimos cargar el resumen de riesgo. Intentá nuevamente en unos segundos.</p>
          </SurfacePanel>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Métricas de riesgo">
          <MetricCard
            label="Nivel actual"
            value={levelCopy.label}
            detail={summary?.message ?? levelCopy.detail}
            tone={levelCopy.tone}
            variant="elevated"
            icon={<RiskGlyph />}
          />
          <MetricCard
            label="P&L hoy"
            value={formatUsd(summary?.daily_pnl_usd)}
            detail="Resultado neto de la sesión actual."
            tone={Number(summary?.daily_pnl_usd ?? 0) < 0 ? 'risk' : 'positive'}
          />
          <MetricCard
            label="Operaciones abiertas"
            value={`${summary?.open_trades_count ?? 0}`}
            detail="Exposición viva que todavía puede mover el día."
            tone={(summary?.open_trades_count ?? 0) > 0 ? 'warning' : 'default'}
          />
          <MetricCard
            label="Win rate hoy"
            value={formatWinRate(summary?.win_rate_today)}
            detail="Ratio de operaciones ganadoras del día."
            tone={(summary?.win_rate_today ?? 0) >= 0.5 ? 'positive' : 'warning'}
          />
        </section>

        <SurfacePanel as="section" variant="default" padding="lg" className="motion-reveal">
          <div className="flex flex-col gap-2">
            <span data-portal-kicker className="text-[10px]">
              Protocolo
            </span>
            <h2 className="font-display text-lg uppercase tracking-wide text-text-primary">
              Decisión antes que impulso
            </h2>
            <p className="max-w-3xl text-sm leading-relaxed text-text-secondary">
              Si el semáforo sube a amarillo, reducí tamaño y esperá confirmación. Si llega a rojo, cerrá el ciclo operativo y registrá la lectura en tu diario antes de volver al mercado.
            </p>
          </div>
        </SurfacePanel>
      </div>
    </>
  );
}
