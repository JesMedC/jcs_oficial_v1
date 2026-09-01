/*
 * p0a.2 — portal selector.
 *
 * Renders ONLY when the signed-in user has role = BOTH (admin and
 * user surfaces are both available). Two GlassCards let the user
 * pick which portal to enter; the choice is persisted in
 * sessionStorage as `jcs.portal` so subsequent reloads land on the
 * same surface (until they log out).
 */
import { useNavigate } from 'react-router-dom';

import { GlassCard } from '../../components/GlassCard';
import { useAuth } from './useAuth';
import type { Portal } from './authStorage';

interface PortalOption {
  readonly id: Portal;
  readonly title: string;
  readonly description: string;
  readonly target: string;
}

const PORTAL_OPTIONS: ReadonlyArray<PortalOption> = [
  {
    id: 'user',
    title: 'Portal de Usuario',
    description: 'Registra operaciones, journal, metricas',
    target: '/dashboard',
  },
  {
    id: 'admin',
    title: 'Portal de Administrador',
    description: 'Gestiona usuarios, pagos y metricas',
    target: '/admin',
  },
];

export function PortalSelector() {
  const { user, setPortal } = useAuth();
  const navigate = useNavigate();

  if (user === null || user.role !== 'BOTH') {
    return null;
  }

  const pick = (option: PortalOption) => {
    setPortal(option.id);
    navigate(option.target, { replace: true });
  };

  return (
    <div className="portal-selector-bg min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-3xl w-full">
        <h1
          className="font-display uppercase tracking-wide text-primary text-3xl md:text-4xl text-center mb-3"
          style={{ textShadow: '0 0 20px rgba(0,255,255,0.4)' }}
        >
          A donde queres entrar?
        </h1>
        <p className="text-text-secondary text-center font-body text-sm md:text-base mb-10">
          Hola, {user.first_name}. Tu cuenta tiene acceso a ambos portales.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PORTAL_OPTIONS.map((option) => (
            <GlassCard
              key={option.id}
              variant="interactive"
              as="button"
              type="button"
              onClick={() => pick(option)}
              className="text-left w-full"
              aria-label={`Entrar al ${option.title}`}
            >
              <h2 className="font-display uppercase tracking-wide text-primary text-xl md:text-2xl">
                {option.title}
              </h2>
              <p className="text-text-secondary font-body text-sm md:text-base mt-3">
                {option.description}
              </p>
              <p className="text-primary font-display uppercase tracking-wide text-xs mt-6">
                Entrar →
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
