/*
 * p0c — PaymentFailurePage.
 *
 * Ruta pública ``/payment/failure?payment_id=...`` — MercadoPago redirige
 * acá cuando el pago fue rechazado o cancelado. Muestra el motivo y
 * ofrece "Reintentar pago" (lleva a /portal/upgrade) + "Volver al
 * portal" (lleva a /portal/dashboard).
 *
 * Per mem #70: cyan + Orbitron. Per mem #68: copy 100% en español.
 */
import { Link, useSearchParams } from 'react-router-dom';

import { GlassCard } from '../components/GlassCard';
import { SeoHead } from '../components/SeoHead';

export function PaymentFailurePage() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('payment_id') ?? '';

  return (
    <>
      <SeoHead
        title="Pago no completado"
        description="Tu pago fue cancelado o rechazado. Podes intentar de nuevo."
        noindex
      />
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <GlassCard variant="elevated" className="max-w-xl w-full text-center border-loss/40">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full bg-loss/15 border-2 border-loss flex items-center justify-center"
              style={{ boxShadow: '0 0 32px rgba(255,92,92,0.35)' }}
            >
              <svg
                className="w-10 h-10 text-loss"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <h1 className="font-display uppercase tracking-wide text-loss text-3xl md:text-4xl">
            Pago no completado
          </h1>
          <p className="text-text-secondary font-body text-base mt-4">
            El pago fue cancelado o rechazado. Podes intentar de nuevo.
          </p>
          {paymentId !== '' ? (
            <p className="text-text-muted font-mono text-xs mt-3">Ref: {paymentId.slice(0, 16)}</p>
          ) : null}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/portal/upgrade"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-display uppercase tracking-wide text-xs border border-primary/50 text-primary hover:bg-primary/15 transition-colors"
            >
              Reintentar pago
            </Link>
            <Link
              to="/portal/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-display uppercase tracking-wide text-xs border border-primary/20 text-text-secondary hover:bg-primary/10 transition-colors"
            >
              Volver al portal
            </Link>
          </div>
        </GlassCard>
      </div>
    </>
  );
}
