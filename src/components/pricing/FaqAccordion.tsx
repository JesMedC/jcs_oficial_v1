import { useState } from 'react';
import { GlassCard } from '../GlassCard';

/*
 * p1c — Pricing FAQ accordion.
 *
 * Local state for which question is open. Real Spanish answers are
 * filled in now (was a TODO placeholder). Copy lives in the `items`
 * array below as a single source of truth for both question + answer.
 */
export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <GlassCard key={item.q} variant="default" className="p-0 overflow-hidden" as="div">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left font-body text-text-primary hover:text-primary transition-colors"
            >
              <span className="font-body text-sm md:text-base">{item.q}</span>
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
                <span>{item.a}</span>
              </div>
            ) : null}
          </GlassCard>
        );
      })}
    </div>
  );
}

const items: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: 'Que tipos de operaciones puedo registrar?',
    a: 'Podes registrar operaciones de Forex (pares de divisas con entrada, salida, stop loss y take profit), opciones binarias y digitales (CALL/PUT, strike, expiracion, stake y payout), criptomonedas (Bitcoin, Ethereum y demas), acciones, indices, futuros, commodities, CFDs y cuentas de prop firms. Cada mercado tiene sus campos especificos para reflejar su mecanica real.',
  },
  {
    q: 'Puedo usar el plan en mas de un dispositivo?',
    a: 'Si. Tu cuenta se sincroniza automaticamente entre todos tus dispositivos. Podes usar la plataforma en simultaneo desde el escritorio, tablet o celular, y todos tus registros, journal y metricas quedan siempre actualizados y disponibles.',
  },
  {
    q: 'Mis datos estan seguros?',
    a: 'Tus credenciales se guardan con hashing PBKDF2 y sal aleatoria. La comunicacion viaja sobre HTTPS con JWT firmado HS256 (15 minutos) y refresh tokens rotativos (14 dias). Auditoria continua sobre acciones sensibles y backups automaticos para que nada se pierda.',
  },
  {
    q: 'Puedo cancelar mi suscripcion cuando quiera?',
    a: 'Si, sin contratos ni permanencia. Podes cancelar desde Configuracion cuando quieras. Si elegiste plan anual, mantenemos el acceso hasta el fin del periodo pagado. No hacemos reembolsos parciales; una vez finalizado el periodo, la suscripcion no se renueva automaticamente.',
  },
];
