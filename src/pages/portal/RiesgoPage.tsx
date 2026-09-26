import { useContext, useEffect, useMemo, useState, type FormEvent } from 'react';

import { SeoHead } from '../../components/SeoHead';
import { PageHeader } from '../../components/ui/PageHeader';
import { MetricCard, type MetricCardTone } from '../../components/ui/MetricCard';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { AuthContext } from '../../features/auth/AuthProvider';
import { useRiskSummary } from '../../features/trades/hooks';
import type { RiskLevel } from '../../features/trades/types';
import {
  useRiskControls,
  useUpdateRiskControls,
  type RiskControls,
} from '../../features/workspace-discipline/useRiskControls';

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

type DraftField = 'session_ops_cap' | 'daily_loss_pct' | 'weekly_loss_pct' | 'monthly_loss_pct';

type RiskControlDraft = Record<DraftField, string>;

const EMPTY_DRAFT: RiskControlDraft = {
  session_ops_cap: '',
  daily_loss_pct: '',
  weekly_loss_pct: '',
  monthly_loss_pct: '',
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

function formatPct(value: string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Sin límite';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Sin límite';
  return `${amount.toFixed(2)}%`;
}

function draftFromControls(controls: RiskControls | undefined): RiskControlDraft {
  if (!controls) return EMPTY_DRAFT;
  return {
    session_ops_cap: controls.session_ops_cap?.toString() ?? '',
    daily_loss_pct: controls.daily_loss_pct ?? '',
    weekly_loss_pct: controls.weekly_loss_pct ?? '',
    monthly_loss_pct: controls.monthly_loss_pct ?? '',
  };
}

function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalPct(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed.replace(',', '.'));
  if (!Number.isFinite(parsed)) return null;
  return parsed.toFixed(2);
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
  const authCtx = useContext(AuthContext);
  const workspace = authCtx?.user?.workspaces[0];
  const workspaceId = workspace?.id;
  const riskQuery = useRiskSummary();
  const controlsQuery = useRiskControls(workspaceId);
  const updateControls = useUpdateRiskControls();
  const [draft, setDraft] = useState<RiskControlDraft>(EMPTY_DRAFT);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const summary = riskQuery.data;
  const controls = controlsQuery.data;
  const level = summary?.level ?? 'green';
  const levelCopy = LEVEL_COPY[level];

  useEffect(() => {
    setDraft(draftFromControls(controls));
  }, [controls]);

  const effectiveSessionCap = controls?.session_ops_cap ?? controls?.ceiling;
  const hasWorkspace = Boolean(workspaceId);
  const canSave = hasWorkspace && !controlsQuery.isLoading && !updateControls.isPending;

  const currentLimitCards = useMemo(
    () => [
      {
        label: 'Ops por sesión',
        value: effectiveSessionCap === undefined ? '—' : `${effectiveSessionCap}`,
        detail:
          controls?.session_ops_cap === null
            ? `Usa el techo del plan (${controls.ceiling})`
            : 'Límite operativo personalizado',
      },
      { label: 'Pérdida diaria', value: formatPct(controls?.daily_loss_pct), detail: 'Corte máximo del día' },
      { label: 'Pérdida semanal', value: formatPct(controls?.weekly_loss_pct), detail: 'Control de drawdown semanal' },
      { label: 'Pérdida mensual', value: formatPct(controls?.monthly_loss_pct), detail: 'Presupuesto mensual de riesgo' },
    ],
    [controls, effectiveSessionCap],
  );

  function updateDraft(field: DraftField, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveMessage(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workspaceId) return;
    setSaveMessage(null);
    await updateControls.mutateAsync({
      workspaceId,
      session_ops_cap: parseOptionalNumber(draft.session_ops_cap),
      daily_loss_pct: parseOptionalPct(draft.daily_loss_pct),
      weekly_loss_pct: parseOptionalPct(draft.weekly_loss_pct),
      monthly_loss_pct: parseOptionalPct(draft.monthly_loss_pct),
    });
    setSaveMessage('Controles de riesgo guardados.');
  }

  return (
    <>
      <SeoHead
        title="Riesgo"
        description="Resumen de riesgo operativo y controles de disciplina de JadeCapitalSuite."
        canonicalPath="/portal/riesgo"
        noindex
      />
      <div data-testid="riesgo-page" className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-2 sm:p-4 lg:p-6">
        <PageHeader
          subLabel="Risk Control"
          title="Riesgo"
          subtitle="Goberná la exposición antes de operar: semáforo, métricas activas y límites editables del workspace."
          actions={
            <SurfacePanel as="div" variant="outline" padding="sm" className="text-xs text-text-secondary">
              Workspace: <span className="font-mono text-text-primary">{workspace?.name ?? 'Sin workspace'}</span>
            </SurfacePanel>
          }
        />

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

        <SurfacePanel as="section" variant="elevated" padding="lg" className="motion-reveal">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <span data-portal-kicker className="text-[10px]">Límites actuales</span>
                <h2 className="mt-2 font-display text-xl uppercase tracking-wide text-text-primary">
                  Controles del workspace
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-secondary">
                  Estos valores impactan la disciplina operativa del workspace. Dejá un campo vacío para usar el límite por defecto o desactivar ese corte porcentual.
                </p>
              </div>
              {controlsQuery.isLoading ? <span className="text-sm text-text-secondary">Cargando límites...</span> : null}
            </div>

            {!hasWorkspace ? (
              <SurfacePanel as="div" variant="outline" padding="md" className="border-warning/50">
                <p className="text-sm text-warning">Necesitás un workspace activo para editar controles de riesgo.</p>
              </SurfacePanel>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {currentLimitCards.map((card) => (
                <MetricCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  Ops por sesión
                  <input
                    type="number"
                    min="1"
                    max={controls?.ceiling}
                    value={draft.session_ops_cap}
                    onChange={(event) => updateDraft('session_ops_cap', event.target.value)}
                    placeholder={controls?.ceiling ? `Plan: ${controls.ceiling}` : 'Plan'}
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-text-primary outline-none transition focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  Pérdida diaria (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.daily_loss_pct}
                    onChange={(event) => updateDraft('daily_loss_pct', event.target.value)}
                    placeholder="Ej. 2.00"
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-text-primary outline-none transition focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  Pérdida semanal (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.weekly_loss_pct}
                    onChange={(event) => updateDraft('weekly_loss_pct', event.target.value)}
                    placeholder="Ej. 5.00"
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-text-primary outline-none transition focus:border-primary"
                  />
                </label>
                <label className="flex flex-col gap-2 text-sm text-text-secondary">
                  Pérdida mensual (%)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.monthly_loss_pct}
                    onChange={(event) => updateDraft('monthly_loss_pct', event.target.value)}
                    placeholder="Ej. 10.00"
                    className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 py-2 font-mono text-text-primary outline-none transition focus:border-primary"
                  />
                </label>
              </div>
              <button
                type="submit"
                disabled={!canSave}
                className="rounded-lg border border-primary/50 bg-primary/15 px-5 py-2.5 font-display text-xs uppercase tracking-[0.22em] text-primary transition hover:bg-primary/25 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updateControls.isPending ? 'Guardando...' : 'Guardar límites'}
              </button>
            </form>

            {saveMessage ? <p className="text-sm text-profit">{saveMessage}</p> : null}
            {updateControls.isError ? (
              <p className="text-sm text-loss">{updateControls.error?.message ?? 'No pudimos guardar los controles.'}</p>
            ) : null}
          </div>
        </SurfacePanel>

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
