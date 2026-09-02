/*
 * p0c — AdminAnalyticsPage.
 *
 * Dashboard de analítica: 3 KPI cards (total views, unique users,
 * unique anon) + tabla de top páginas con un selector de días
 * (7 / 30 / 90).
 *
 * Per mem #70: cyan + Orbitron. Per mem #68: copy 100% en español.
 */
import { useCallback, useEffect, useState } from 'react';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { TopPageRow } from '../../components/admin/TopPageRow';
import { getAnalyticsSummaryApi, getTopPagesApi } from '../../features/analytics/api';
import type { AnalyticsSummaryOut, TopPageOut } from '../../features/analytics/types';
import type { ErrorEnvelope } from '../../features/auth/types';

const DAY_OPTIONS: ReadonlyArray<{ readonly value: number; readonly label: string }> = [
  { value: 7, label: 'Ultimos 7 dias' },
  { value: 30, label: 'Ultimos 30 dias' },
  { value: 90, label: 'Ultimos 90 dias' },
];

// Module-level: Intl.NumberFormat is more reliable than Number.toLocaleString in jsdom+Node,
// where toLocaleString can fall back to bare digits depending on ICU data resolution.
// `useGrouping: 'always'` is required because the spec default `'auto'` only groups 5+ digit numbers
// (so 1234 would otherwise render as "1234" instead of "1.234").
const NUMBER_FORMAT = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

export function AdminAnalyticsPage() {
  const [days, setDays] = useState<number>(30);
  const [summary, setSummary] = useState<AnalyticsSummaryOut | null>(null);
  const [topPages, setTopPages] = useState<readonly TopPageOut[]>([]);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, topRes] = await Promise.all([
        getAnalyticsSummaryApi({ days }),
        getTopPagesApi({ days, limit: 20 }),
      ]);
      setSummary(summaryRes);
      setTopPages(topRes);
      setError(null);
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <>
      <SeoHead
        title="Analitica"
        description="Analitica de uso de JadeCapitalSuite."
        canonicalPath="/admin/analytics"
        noindex
      />
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1
              className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
              style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
            >
              Analitica
            </h1>
            <p className="text-text-secondary font-body text-sm md:text-base mt-1 max-w-2xl">
              Visitas y uso de la plataforma en el periodo seleccionado.
            </p>
          </div>
          <label className="font-display uppercase tracking-wide text-xs text-text-muted">
            <span className="mr-2">Periodo:</span>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-surface-el border border-primary/30 text-text-primary font-body text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {DAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-4" />

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <KpiCard
            label="Vistas totales"
            value={summary?.total_views ?? 0}
            loading={loading && summary === null}
          />
          <KpiCard
            label="Usuarios unicos"
            value={summary?.unique_users ?? 0}
            loading={loading && summary === null}
          />
          <KpiCard
            label="Anonimos unicos"
            value={summary?.unique_anonymous ?? 0}
            loading={loading && summary === null}
          />
        </section>

        <section className="mt-10">
          <h2 className="font-display uppercase tracking-wide text-primary text-xl mb-3">
            Paginas mas visitadas
          </h2>
          <GlassCard variant="default" className="overflow-x-auto p-0">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface/60 text-text-muted font-display uppercase tracking-wide text-xs">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Ruta
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Vistas
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Usuarios
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Anonimos
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ultima visita
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && topPages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-text-muted font-body">
                      Cargando...
                    </td>
                  </tr>
                ) : topPages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-text-muted font-body">
                      Sin datos para este periodo.
                    </td>
                  </tr>
                ) : (
                  topPages.map((p) => <TopPageRow key={p.page_path} page={p} />)
                )}
              </tbody>
            </table>
          </GlassCard>
        </section>
      </div>
    </>
  );
}

interface KpiCardProps {
  readonly label: string;
  readonly value: number;
  readonly loading: boolean;
}

function KpiCard({ label, value, loading }: KpiCardProps) {
  return (
    <GlassCard variant="default" className="border-primary/30">
      <p className="font-display uppercase tracking-wide text-text-muted text-xs">{label}</p>
      <p
        className="font-display text-primary text-3xl md:text-4xl mt-2"
        style={{ textShadow: '0 0 16px rgba(0,255,255,0.3)' }}
      >
        {loading ? '...' : NUMBER_FORMAT.format(value)}
      </p>
    </GlassCard>
  );
}
