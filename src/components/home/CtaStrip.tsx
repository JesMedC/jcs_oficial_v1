import { Link } from 'react-router-dom';

/*
 * p1c — Home CTA strip (full-width band).
 * H2 Orbitron cyan + single cyan filled CTA to /demo.
 */
export function CtaStrip() {
  return (
    <section className="bg-primary-dk/20 border-y border-primary/20 my-8 md:my-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-14 flex flex-col md:flex-row items-center justify-between gap-6">
        <h2
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
          style={{ textShadow: '0 0 16px rgba(0,255,255,0.35)' }}
        >
          Listo para tomar el control?
        </h2>
        <Link
          to="/demo"
          className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-6 py-3 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
        >
          Solicitar demo
        </Link>
      </div>
    </section>
  );
}
