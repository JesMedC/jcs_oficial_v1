import { Link } from 'react-router-dom';

/*
 * p0b.1b — Home CTA strip (full-width band).
 * H2 Orbitron jade + single jade filled CTA to /register.
 */
export function CtaStrip() {
  return (
    <section className="bg-primary-dk/20 border-y border-primary/20 my-8 md:my-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-6">
        <h2
          className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl"
          style={{ textShadow: '0 0 16px rgba(0,255,157,0.35)' }} // Wave 3c (T3c.1): old-jade text-shadow → neon jade rgba(0,255,157,*).
        >
          Listo para tomar el control?
        </h2>
        <Link
          to="/register"
          className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,157,0.5)] transition-shadow text-sm" // Wave 3c (T3c.1): old-jade CTA hover shadow → neon jade rgba(0,255,157,*).
        >
          Registrarse
        </Link>
      </div>
    </section>
  );
}
