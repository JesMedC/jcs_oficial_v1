/*
 * p0d.2 — PortalSidebar.
 *
 * Left rail for the authenticated user portal (/portal/*). Collapsible
 * with the same width transition AdminSidebar uses (240px expanded,
 * 64px collapsed). Active item gets a cyan left-border + cyan glow,
 * matching the spec ("cyan border-left + cyan text + cyan glow").
 *
 * Reuses the AdminSidebar layout pattern (sticky rail, h-dvh, brand
 * row at the top, nav in the middle, collapse toggle at the bottom)
 * but drops the BOTH-only "Volver al portal usuario" link — that's
 * admin-specific.
 *
 * Visual language per mem #70 (cyan + Orbitron, glassmorphism). UI
 * labels per mem #68 are Spanish (Dashboard, Cuentas, Movimientos,
 * Configuracion). Code identifiers stay English.
 */
import { NavLink } from 'react-router-dom';

interface PortalSidebarProps {
  readonly collapsed: boolean;
  readonly onToggle: () => void;
}

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: JSX.Element;
  readonly end?: boolean;
}

function DashboardIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h4v-7h4v7h4a1 1 0 001-1V10"
      />
    </svg>
  );
}

function CuentasIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7.5A2.5 2.5 0 015.5 5h13A2.5 2.5 0 0121 7.5v9a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 16.5v-9zM3 10h18"
      />
    </svg>
  );
}

function MovimientosIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 6h16M4 12h16M4 18h16M8 3l-3 3 3 3M16 21l3-3-3-3"
      />
    </svg>
  );
}

function ConfiguracionIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"
      />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { readonly collapsed: boolean }) {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
      />
    </svg>
  );
}

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/portal/cuentas', label: 'Cuentas', icon: <CuentasIcon /> },
  { to: '/portal/movimientos', label: 'Movimientos', icon: <MovimientosIcon /> },
  { to: '/portal/configuracion', label: 'Configuracion', icon: <ConfiguracionIcon /> },
];

export function PortalSidebar({ collapsed, onToggle }: PortalSidebarProps) {
  return (
    <aside
      className={[
        'shrink-0 sticky top-0 self-start h-dvh border-r border-primary/20',
        'bg-surface-el/40 backdrop-blur-md',
        'flex flex-col transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
      aria-label="Menu lateral del portal de usuario"
    >
      <div
        className={[
          'flex items-center gap-2 px-4 py-5 border-b border-primary/20',
          collapsed ? 'justify-center' : '',
        ].join(' ')}
      >
        <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,255,0.6)] shrink-0" />
        {!collapsed ? (
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-display uppercase tracking-[0.2em] text-primary text-xs truncate">
              JadeCapitalSuite
            </span>
            <span className="font-display uppercase tracking-widest text-text-muted text-[9px] mt-0.5">
              USUARIO
            </span>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end ?? false}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              [
                'group flex items-center gap-3 pl-3 pr-3 py-2 rounded-r-lg',
                'border-l-4 transition-colors font-body text-sm',
                isActive
                  ? 'border-l-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(0,255,255,0.25)]'
                  : 'border-l-transparent text-text-secondary hover:bg-primary/10 hover:text-primary',
                collapsed ? 'justify-center pl-2 pr-2' : '',
              ].join(' ')
            }
          >
            {item.icon}
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-primary/20 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
          className={[
            'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
            'text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed ? <span className="font-body text-sm">Colapsar</span> : null}
        </button>
      </div>
    </aside>
  );
}
