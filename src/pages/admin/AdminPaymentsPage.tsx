/*
 * p0c — AdminPaymentsPage.
 *
 * Tabla paginada de pagos reportados por MercadoPago. Filtro por
 * status (Todos / Aprobados / Rechazados / Cancelados / Pendientes),
 * paginación prev/next, badges con colores semánticos (profit/loss/
 * warning/primary).
 */
import { useCallback, useEffect, useState } from 'react';

import { SeoHead } from '../../components/SeoHead';
import { GlassCard } from '../../components/GlassCard';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PaymentRow } from '../../components/admin/PaymentRow';
import { listPaymentsApi } from '../../features/payments/api';
import {
  PAYMENT_STATUS_BADGE,
  type PaymentList,
  type PaymentOut,
  type PaymentStatusLiteral,
} from '../../features/payments/types';
import type { ErrorEnvelope } from '../../features/auth/types';

const PAGE_LIMIT = 25;

const STATUS_FILTERS: ReadonlyArray<{
  readonly value: PaymentStatusLiteral | 'ALL';
  readonly label: string;
}> = [
  { value: 'ALL', label: 'Todos' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'CANCELLED', label: 'Cancelados' },
  { value: 'PENDING', label: 'Pendientes' },
];

export function AdminPaymentsPage() {
  const [data, setData] = useState<PaymentList | null>(null);
  const [error, setError] = useState<ErrorEnvelope | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatusLiteral | 'ALL'>('ALL');
  const [skip, setSkip] = useState<number>(0);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params: { status?: PaymentStatusLiteral; skip: number; limit: number } = {
        skip,
        limit: PAGE_LIMIT,
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const result = await listPaymentsApi(params);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err as ErrorEnvelope);
    } finally {
      setLoading(false);
    }
  }, [skip, statusFilter]);

  useEffect(() => {
    void fetchPayments();
  }, [fetchPayments]);

  const handleStatusChange = (value: PaymentStatusLiteral | 'ALL') => {
    setStatusFilter(value);
    setSkip(0);
  };

  const items: readonly PaymentOut[] = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasNext = skip + PAGE_LIMIT < total;
  const hasPrev = skip > 0;

  return (
    <>
      <SeoHead
        title="Pagos"
        description="Historial de pagos de JadeCapitalSuite."
        canonicalPath="/admin/payments"
        noindex
      />
      <div className="max-w-6xl mx-auto">
        <h1
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl mb-2"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          Pagos
        </h1>
        <p className="text-text-secondary font-body text-sm md:text-base mb-6 max-w-2xl">
          Historial de pagos procesados por MercadoPago. Cada fila representa un pago reportado por
          webhook.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <label className="font-display uppercase tracking-wide text-xs text-text-muted">
            <span className="mr-2">Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as PaymentStatusLiteral | 'ALL')}
              className="bg-surface-el border border-primary/30 text-text-primary font-body text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {STATUS_FILTERS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <div className="font-body text-xs text-text-muted">
            {loading ? 'Cargando...' : `${total} pago${total === 1 ? '' : 's'}`}
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} className="mb-4" />

        <GlassCard variant="default" className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/60 text-text-muted font-display uppercase tracking-wide text-xs">
              <tr>
                <th scope="col" className="px-4 py-3">
                  MP ID
                </th>
                <th scope="col" className="px-4 py-3">
                  Payer
                </th>
                <th scope="col" className="px-4 py-3">
                  Monto (USD)
                </th>
                <th scope="col" className="px-4 py-3">
                  Estado
                </th>
                <th scope="col" className="px-4 py-3">
                  Fecha MP
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted font-body">
                    Cargando pagos...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-text-muted font-body">
                    Sin pagos para mostrar.
                  </td>
                </tr>
              ) : (
                items.map((p) => <PaymentRow key={p.id} payment={p} />)
              )}
            </tbody>
          </table>
        </GlassCard>

        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => setSkip(Math.max(0, skip - PAGE_LIMIT))}
            className={[
              'font-display uppercase tracking-wide text-xs px-4 py-2 rounded-lg transition-colors',
              'border border-primary/30 text-primary hover:bg-primary/10',
              !hasPrev ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            Anterior
          </button>
          <span className="font-body text-xs text-text-muted">
            Pagina {Math.floor(skip / PAGE_LIMIT) + 1}
          </span>
          <button
            type="button"
            disabled={!hasNext}
            onClick={() => setSkip(skip + PAGE_LIMIT)}
            className={[
              'font-display uppercase tracking-wide text-xs px-4 py-2 rounded-lg transition-colors',
              'border border-primary/30 text-primary hover:bg-primary/10',
              !hasNext ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            Siguiente
          </button>
        </div>

        {/* Mantener referencia viva para el badge map (TS checkea el import). */}
        <span className="hidden">{Object.keys(PAYMENT_STATUS_BADGE).join(',')}</span>
      </div>
    </>
  );
}
