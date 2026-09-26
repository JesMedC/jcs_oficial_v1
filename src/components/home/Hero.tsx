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
    <section
      data-public-hero
      className="relative isolate overflow-hidden border-b border-[var(--color-border-subtle)]"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-10 h-64 w-64 rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl motion-reveal" />
        <div className="absolute right-[12%] top-1/3 h-80 w-80 rounded-full bg-info/10 blur-3xl motion-reveal [animation-delay:180ms]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--color-bg-canvas)] to-transparent" />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 grid md:grid-cols-2 gap-10 md:gap-16 items-center">
        <div className="order-last md:order-first flex flex-col gap-6 motion-reveal">
          <h1
            className="font-display uppercase tracking-wide text-[var(--color-text-primary)] text-3xl md:text-5xl lg:text-6xl leading-tight"
            style={{ textShadow: '0 0 28px color-mix(in srgb, var(--color-brand-primary) 45%, transparent)' }}
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
              className="motion-surface inline-flex bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] font-display uppercase tracking-wide px-5 py-3 rounded-lg hover:shadow-[var(--portal-glow)] text-sm"
            >
              Registrarse
            </Link>
            <Link
              to="/pricing"
              className="motion-surface inline-flex border border-[var(--color-brand-primary)] text-[var(--color-brand-primary)] font-display uppercase tracking-wide px-5 py-3 rounded-lg hover:bg-[var(--color-brand-primary)] hover:text-[var(--color-text-on-primary)] text-sm"
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
        <div className="order-first md:order-none motion-reveal [animation-delay:120ms]">{preview}</div>
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
