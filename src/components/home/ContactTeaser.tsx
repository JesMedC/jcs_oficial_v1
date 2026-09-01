import { Link } from 'react-router-dom';
import { GlassCard } from '../GlassCard';

/*
 * p1c — Home "Contacto" teaser card linking to the full Contact page.
 * The full Contact page renders the form 4R in p1d; this is the
 * static home entry point that previews the channel.
 */
export function ContactTeaser() {
  return (
    <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
      <GlassCard className="p-6 md:p-8">
        <div className="grid md:grid-cols-2 gap-6 items-center">
          <div className="flex flex-col gap-3">
            <h2 className="font-display uppercase tracking-wide text-primary text-2xl md:text-3xl">
              Hablemos
            </h2>
            <p className="text-text-secondary font-body text-sm md:text-base leading-relaxed">
              Escrbenos a hola@jadecapitalsuite.com o solicita un recorrido personalizado de 30
              minutos con un especialista de producto.
            </p>
            <div className="flex flex-wrap gap-3 mt-1">
              <Link
                to="/contact"
                className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-5 py-2.5 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
              >
                Contactar
              </Link>
              <Link
                to="/demo"
                className="inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-5 py-2.5 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
              >
                Solicitar demo
              </Link>
            </div>
          </div>
          <ul className="font-mono text-text-secondary text-xs md:text-sm space-y-1">
            <li>hola@jadecapitalsuite.com</li>
            <li>+34 911 23 45 67</li>
            <li>WhatsApp +34 644 12 34 56</li>
          </ul>
        </div>
      </GlassCard>
    </section>
  );
}
