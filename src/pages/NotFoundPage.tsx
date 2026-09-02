import { Link } from 'react-router-dom';
import { SeoHead } from '../components/SeoHead';

/*
 * p1c — 404 page.
 *
 * Friendly Spanish copy + CTA "Volver al inicio". Uses the same
 * Hero typography pattern (Orbitron jade glow) for visual consistency.
 */
export function NotFoundPage() {
  return (
    <>
      <SeoHead
        title="404 - Esta ruta no existe"
        description="La ruta que buscás no existe en JadeCapitalSuite."
        canonicalPath="/404"
        noindex
      />
      <section className="max-w-3xl mx-auto px-4 py-20 md:py-32 text-center">
        <p className="font-mono text-text-muted text-sm">404</p>
        <h1
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-4xl mt-2"
          style={{ textShadow: '0 0 20px rgba(46,220,140,0.4)' }}
        >
          Esta ruta no existe
        </h1>
        <p className="text-text-secondary font-body text-base md:text-lg mt-4">
          Es posible que el enlace haya cambiado o que la pagina ya no este disponible.
        </p>
        <Link
          to="/"
          className="inline-flex mt-8 bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(46,220,140,0.5)] transition-shadow text-sm"
        >
          Volver al inicio
        </Link>
      </section>
    </>
  );
}
