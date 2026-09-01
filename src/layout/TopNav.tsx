import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { TopNavMobileDrawer } from './TopNavMobileDrawer';

const navItems: ReadonlyArray<{ label: string; to: string }> = [
  { label: 'Inicio', to: '/' },
  { label: 'Características', to: '/' },
  { label: 'Precios', to: '/' },
  { label: 'Nosotros', to: '/' },
  { label: 'Demo', to: '/' },
];

export function TopNav() {
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/40 backdrop-blur-xl backdrop-saturate-150 border-b border-primary/30">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-6">
          <Link
            to="/"
            className="font-display uppercase tracking-[0.2em] text-primary text-sm md:text-base flex items-center gap-2 shrink-0"
          >
            <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.6)]" />
            JadeCapitalSuite
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'relative font-body text-sm transition-colors',
                    isActive
                      ? 'font-display tracking-wide text-primary after:content-[""] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-0.5 after:bg-primary after:shadow-[0_0_8px_rgba(0,255,255,0.8)]'
                      : 'text-text-primary hover:text-primary',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <Link
              to="/demo"
              className="hidden md:inline-flex border-2 border-primary text-primary font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:bg-primary hover:text-bg transition-colors text-sm"
            >
              Solicitar demo
            </Link>
            <Link
              to="/login"
              className="inline-flex bg-primary text-bg font-display uppercase tracking-wide px-4 py-2 rounded-lg hover:shadow-[0_0_24px_rgba(0,255,255,0.5)] transition-shadow text-sm"
            >
              Iniciar sesión
            </Link>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
              aria-label="Abrir menú"
              aria-expanded={drawerOpen}
            >
              <span className="block w-5 h-0.5 bg-current relative before:content-[''] before:absolute before:left-0 before:-top-1.5 before:w-5 before:h-0.5 before:bg-current after:content-[''] after:absolute after:left-0 after:top-1.5 after:w-5 after:h-0.5 after:bg-current" />
            </button>
          </div>
        </div>
      </header>

      <TopNavMobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
