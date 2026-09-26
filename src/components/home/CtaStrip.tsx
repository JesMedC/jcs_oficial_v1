import { Link } from 'react-router-dom';

/*
 * p0b.1b — Home CTA strip (full-width band).
 * H2 Orbitron jade + single jade filled CTA to /register.
 */
export function CtaStrip() {
  return (
    <section data-public-cta data-testid="public-cta" className="relative overflow-hidden border-y border-[var(--color-border-subtle)] bg-[var(--color-brand-primary)]/10 my-8 md:my-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 flex flex-col md:flex-row items-center justify-between gap-6 motion-reveal">
        <h2
          className="font-display uppercase tracking-wide text-[var(--color-text-primary)] text-2xl md:text-3xl"
          style={{ textShadow: '0 0 16px color-mix(in srgb, var(--color-brand-primary) 35%, transparent)' }}
        >
          Listo para tomar el control?
        </h2>
        <Link
          to="/register"
          className="motion-surface inline-flex bg-[var(--color-brand-primary)] text-[var(--color-text-on-primary)] font-display uppercase tracking-wide px-5 py-3 rounded-lg hover:shadow-[var(--portal-glow)] text-sm"
        >
          Registrarse
        </Link>
      </div>
    </section>
  );
}
