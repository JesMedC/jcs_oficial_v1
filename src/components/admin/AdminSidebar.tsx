/*
 * p0b.2 — AdminSidebar.
 *
 * Collapsible left rail with the four admin destinations and the
 * "Volver al portal usuario" link for BOTH-role staff. The collapse
 * toggle lives at the bottom; the preference is persisted via
 * sessionStorage by AdminLayout.
 *
 * Visual language per mem #70 (cyan + Orbitron, glassmorphism):
 *   - Logo row uses `font-display uppercase tracking-[0.2em] text-primary`.
 *   - Active nav item gets the underline glow via `after:content-[""]
 *     after:bg-primary after:shadow-[0_0_8px_rgba(0,255,255,0.8)]`.
 *   - Inactive items fade to `text-text-secondary` and brighten on hover.
 *
 * Per mem #68, all user-visible labels are Spanish. Code identifiers
 * (props, types, comments) stay English.
 */
import { NavLink, useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { writeStoredPortal } from '../../features/auth/authStorage';
import { ADMIN_ROLES } from '../../features/auth/types';

interface AdminSidebarProps {
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

function UsersIcon() {
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
        d="M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21a7 7 0 0114 0M21 21a5 5 0 00-3.535-4.778"
      />
    </svg>
  );
}

function PlansIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function PaymentsIcon() {
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
        d="M2.25 8.25h19.5M2.25 8.25V18a1.5 1.5 0 001.5 1.5h16.5a1.5 1.5 0 001.5-1.5V8.25M2.25 8.25V6.75A1.5 1.5 0 013.75 5.25h16.5a1.5 1.5 0 011.5 1.5v1.5"
      />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg
      className="w-5 h-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M7 16l4-5 4 3 5-7" />
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
  { to: '/admin', label: 'Dashboard', icon: <DashboardIcon />, end: true },
  { to: '/admin/users', label: 'Usuarios', icon: <UsersIcon /> },
  { to: '/admin/plans', label: 'Planes', icon: <PlansIcon /> },
  { to: '/admin/payments', label: 'Pagos', icon: <PaymentsIcon /> },
  { to: '/admin/analytics', label: 'Analitica', icon: <AnalyticsIcon /> },
];

export function AdminSidebar({ collapsed, onToggle }: AdminSidebarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const showUserPortalLink = user !== null && ADMIN_ROLES.includes(user.role);

  const handlePortalSwitch = () => {
    writeStoredPortal('user');
    navigate('/dashboard');
  };

  return (
    <aside
      className={[
        'shrink-0 sticky top-0 self-start h-dvh border-r border-primary/20',
        'bg-surface-el/40 backdrop-blur-md',
        'flex flex-col transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-60',
      ].join(' ')}
      aria-label="Menu lateral del panel admin"
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
              ADMIN
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
                'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-body text-sm',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
                collapsed ? 'justify-center' : '',
              ].join(' ')
            }
          >
            {item.icon}
            {!collapsed ? <span className="truncate">{item.label}</span> : null}
          </NavLink>
        ))}

        {showUserPortalLink ? (
          <button
            type="button"
            onClick={handlePortalSwitch}
            title={collapsed ? 'Volver al portal usuario' : undefined}
            className={[
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors font-body text-sm',
              'text-text-secondary hover:bg-primary/10 hover:text-primary',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {!collapsed ? <span className="truncate">Volver al portal usuario</span> : null}
          </button>
        ) : null}
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
