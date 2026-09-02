/*
 * p0c — PaymentSuccessPage.
 *
 * Ruta pública ``/payment/success?payment_id=...`` — MercadoPago redirige
 * acá tras un pago aprobado. Polling corto contra ``GET /subscriptions/me``
 * (max 5 intentos, 1s c/u) para detectar el momento en que el webhook
 * confirma la subscription. Si en 3s no se confirma, redirige a
 * ``/portal/dashboard`` igual — el webhook puede llegar tarde.
 *
 * Per mem #70: cyan + Orbitron, glassmorphism. Per mem #68: copy 100%
 * en español.
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { GlassCard } from '../components/GlassCard';
import { SeoHead } from '../components/SeoHead';
import { getMySubscriptionApi } from '../features/auth/api';
import type { SubscriptionStatus } from '../features/auth/types';

const POLL_INTERVAL_MS = 1000;
const MAX_POLLS = 5;
const REDIRECT_AFTER_MS = 3000;

function isConfirmedActive(status: SubscriptionStatus): boolean {
  return status === 'ACTIVE';
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('payment_id') ?? '';
  const [polls, setPolls] = useState<number>(0);

  // Polling al backend para detectar el momento en que el webhook
  // confirmó la sub.
  useEffect(() => {
    if (polls >= MAX_POLLS) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const sub = await getMySubscriptionApi();
          if (sub !== null && isConfirmedActive(sub.status)) {
            navigate('/portal/dashboard', { replace: true });
            return;
          }
        } catch {
          // Silencioso — el polling termina igual.
        }
        setPolls((prev) => prev + 1);
      })();
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [polls, navigate]);

  // Failsafe: si en REDIRECT_AFTER_MS no se confirmó, mandamos a
  // /portal/dashboard igual — el webhook puede llegar tarde.
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/portal/dashboard', { replace: true });
    }, REDIRECT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <SeoHead title="Pago exitoso" description="Tu pago fue procesado correctamente." noindex />
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <GlassCard variant="elevated" className="max-w-xl w-full text-center border-primary/40">
          <div className="flex justify-center mb-4">
            <div
              className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary flex items-center justify-center"
              style={{ boxShadow: '0 0 32px rgba(0,255,255,0.45)' }}
            >
              <svg
                className="w-10 h-10 text-primary"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <h1
            className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
            style={{ textShadow: '0 0 20px rgba(0,255,255,0.5)' }}
          >
            Pago exitoso
          </h1>
          <p className="text-text-secondary font-body text-base mt-4">
            Tu suscripcion esta activa. Redirigiendo al portal...
          </p>
          {paymentId !== '' ? (
            <p className="text-text-muted font-mono text-xs mt-3">Ref: {paymentId.slice(0, 16)}</p>
          ) : null}
          <div
            className="mt-6 mx-auto w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-[pulse-cyan_1.2s_ease-in-out_infinite]"
            role="status"
            aria-label="Verificando el pago"
          />
        </GlassCard>
      </div>
    </>
  );
}
