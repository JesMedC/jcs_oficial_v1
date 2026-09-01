import { useState } from 'react';
import { GlassCard } from '../GlassCard';

/*
 * p1c — Pricing FAQ accordion.
 *
 * Local state for which question is open. The Angular reference
 * snapshot only captured question titles, not answers. Real answer
 * copy is filled in p1f; for now we render a TODO placeholder so
 * the layout is exercisable end-to-end.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
      {questions.map((q, i) => {
        const isOpen = openIndex === i;
        return (
          <GlassCard key={q} variant="default" className="p-0 overflow-hidden" as="div">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-body text-text-primary hover:text-primary transition-colors"
            >
              <span className="font-body text-sm md:text-base">{q}</span>
              <span
                aria-hidden="true"
                className={`text-primary transition-transform ${isOpen ? 'rotate-45' : ''}`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </span>
            </button>
            {isOpen ? (
              <div className="px-5 pb-5 -mt-1 text-text-secondary font-body text-sm">
                {/* TODO(p1f): replace placeholder answer with the real answer copy. */}
                <span>
                  Respuesta en preparacion. Escrbenos a hola@jadecapitalsuite.com y te respondemos
                  personalmente.
                </span>
              </div>
            ) : null}
          </GlassCard>
        );
      })}
    </div>
  );
}

const questions: ReadonlyArray<string> = [
  'Que tipos de operaciones puedo registrar?',
  'Puedo usar el plan en mas de un dispositivo?',
  'Mis datos estan seguros?',
  'Puedo cancelar mi suscripcion cuando quiera?',
];
