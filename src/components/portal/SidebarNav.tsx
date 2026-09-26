/*
 * jarvis-ui-redesign (T-11 refactor, post-deploy polish) —
 * SidebarNav with JARVIS HUD pill buttons.
 *
 * Each nav item renders as a rectangular pill with a cyan border,
 * uppercase tracked-wide label, and a glow halo on the active
 * state. Items that open drawers (Cuentas / Operaciones /
 * Playbook) get a small `+` glyph anchored to the right edge as a
 * visual hint.
 */
import { NavLink } from 'react-router-dom';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: JSX.Element;
  readonly end?: boolean;
  readonly showAdd?: boolean;
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

function OperacionesIcon() {
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

function LogIcon() {
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
        d="M5 4a2 2 0 012-2h10a2 2 0 012 2v16a1 1 0 01-1 1H6a2 2 0 01-2-2V4zM9 7h6M9 11h6M9 15h4"
      />
    </svg>
  );
}

function RiskIcon() {
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
        d="M12 3l7.5 3.5v5.2c0 4.3-2.9 7.7-7.5 9.3-4.6-1.6-7.5-5-7.5-9.3V6.5L12 3z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5h.01" />
    </svg>
  );
}

function PlaybookIcon() {
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
        d="M12 3a6 6 0 00-4 10.9c.8.7 1.5 1.6 1.5 2.6h5c0-1 .7-1.9 1.5-2.6A6 6 0 0012 3zM10 21h4M9 18h6"
      />
    </svg>
  );
}

function SettingsIcon() {
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

const NAV_ITEMS: ReadonlyArray<NavItem> = [
  { to: '/portal/dashboard', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/portal/cuentas', label: 'Cuentas', icon: <CuentasIcon />, showAdd: true },
  { to: '/portal/operaciones', label: 'Operaciones', icon: <OperacionesIcon />, showAdd: true },
  { to: '/portal/riesgo', label: 'Riesgo', icon: <RiskIcon /> },
  { to: '/portal/diario', label: 'Diario', icon: <LogIcon /> },
  { to: '/portal/playbook', label: 'Playbook', icon: <PlaybookIcon />, showAdd: true },
  { to: '/portal/configuracion', label: 'Configuración', icon: <SettingsIcon /> },
];

export interface SidebarNavProps {
  readonly isCollapsed: boolean;
}

export function SidebarNav({ isCollapsed }: SidebarNavProps) {
  return (
    <nav className="flex-1 py-4 px-2.5 space-y-1.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end ?? false}
          title={isCollapsed ? item.label : undefined}
          className={({ isActive }) =>
            [
              'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl',
              'border transition-all duration-150 font-display uppercase tracking-[0.14em] text-[11px]',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/70',
              isActive
                ? 'border-primary bg-primary/15 text-primary shadow-[0_0_18px_rgba(0,212,216,0.38)] animate-jarvis-active-pulse'
                : 'border-[var(--portal-border)] text-text-secondary bg-[var(--portal-surface-soft)] hover:border-primary/70 hover:text-primary hover:bg-primary/10',
              isCollapsed ? 'justify-center px-2' : '',
            ].join(' ')
          }
        >
          {item.icon}
          {!isCollapsed ? <span className="truncate flex-1">{item.label}</span> : null}
          {!isCollapsed && item.showAdd ? (
            <span
              aria-hidden="true"
              className="ml-auto text-primary/70 group-hover:text-primary text-base leading-none"
            >
              +
            </span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  );
}
