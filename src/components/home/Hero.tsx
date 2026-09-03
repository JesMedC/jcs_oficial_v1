import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/*
 * p1c — Home hero.
 *
 * portal-fase0a-base — primary pivoted to jade, kept visual rhythm.
 * H1 uses Orbitron uppercase tracking-wide with a jade glow per mem #70.
 * Body uses Inter (readability per design tokens). Dual CTA: filled jade
 * + outline jade. Bullets list with jade check SVG.
 *
 * The right-hand slot (DashboardPreview on desktop, below on mobile)
 * is provided by the HomePage so the Hero stays a pure presentational
 * component.
 */
interface HeroProps {
  readonly preview?: ReactNode;
}

export function Hero({ preview }: HeroProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-4 pb-4 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="order-last md:order-first flex flex-col gap-6">
          <h1
            className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl lg:text-5xl"
            style={{ textShadow: '0 0 28px rgba(0,255,157,0.65)' }} // Wave 6.5 (Nivel 1 bump): spread 20→28px, opacity 0.4→0.65 for stronger jade glow on the hero H1.
          >
            Convierte cada operacion en una decision mas inteligente
          </h1>
          <p className="text-text-secondary font-body text-base md:text-lg leading-relaxed max-w-xl">
            Registra tus operaciones de Forex y binarias, controla los saldos de tus cuentas y
            analiza tu P&amp;L para operar con mas claridad, confianza y disciplina.
          </p>
          <div className="flex flex-wrap items-center gap-3 md:gap-4 mt-2">
            <Link
              to="/register"
              className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,157,0.5)] transition-shadow text-sm" // Wave 3c (T3c.1): old-jade CTA hover shadow → neon jade rgba(0,255,157,*).
            >
              Registrarse
            </Link>
            <Link
              to="/pricing"
              className="inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
            >
              Ver planes
            </Link>
          </div>
          <ul className="flex flex-col gap-2 mt-4">
            <Bullet text="Sin tarjeta de credito" />
            <Bullet text="Prueba 7 dias gratis" />
            <Bullet text="Cancela cuando quieras" />
          </ul>
        </div>
        <div className="order-first md:order-none">{preview}</div>
      </div>
    </section>
  );
}

function Bullet({ text }: { readonly text: string }) {
  return (
    <li className="flex items-center gap-2 text-text-secondary font-body text-sm">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-primary shrink-0"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{text}</span>
    </li>
  );
}
