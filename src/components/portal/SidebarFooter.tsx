/*
 * portal-fase0a-base — extracted footer row of PortalSidebar.
 * jarvis-ui-redesign (T-11 refactor, post-deploy polish) —
 *
 * The footer now mirrors the reference image: bottom-right block
 * with the user identity card (avatar + name + meta info), the
 * "Cerrar sesion" pill, the "Ocultar" rail toggle, and the giant
 * "JARVIS" wordmark anchored to the corner. We keep the collapsed
 * state readable by collapsing the meta lines and keeping the
 * avatar + logout icon.
 */
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useSidebarCollapsed } from '../../stores/useSidebarCollapsed';
import { OnlineIndicator } from '../ui/OnlineIndicator';

function CollapseIcon({ isCollapsed }: { readonly isCollapsed: boolean }) {
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
        d={isCollapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'}
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12H4m0 0l3-3m-3 3l3 3M14 4h5a1 1 0 011 1v14a1 1 0 01-1 1h-5"
      />
    </svg>
  );
}

function buildDisplayName(user: { first_name: string; last_name: string; email: string }): string {
  const full = `${user.first_name} ${user.last_name}`.trim();
  return full.length > 0 ? full : user.email;
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export interface SidebarFooterProps {
  readonly isCollapsed: boolean;
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  const toggle = useSidebarCollapsed((state) => state.toggle);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    void logout().catch(() => {
      navigate('/');
    });
  };

  const displayName = user ? buildDisplayName(user) : null;
  const email = user?.email ?? '';
  const role = (user?.role ?? 'USER').toUpperCase();
  const workspace = user?.workspaces?.[0]?.name ?? 'Principal';

  return (
    <div
      className={[
        'border-t border-[var(--portal-border)] p-3 space-y-3 bg-[var(--portal-surface-strong)]/70',
        isCollapsed ? 'flex flex-col items-center' : '',
      ].join(' ')}
    >
      {/* User identity card — bigger + with online dot + meta info */}
      {user && displayName ? (
        <div
          className={['flex items-start gap-3', isCollapsed ? 'justify-center flex-col' : ''].join(
            ' ',
          )}
        >
          <div className="relative shrink-0">
            <div
              className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/40 text-[var(--color-jade)] font-display uppercase text-sm shadow-[0_0_18px_rgba(0,212,216,0.18)]"
              aria-hidden="true"
            >
              {initials(displayName)}
            </div>
            <OnlineIndicator
              size="sm"
              ariaLabel="Sesión activa"
              className="absolute -bottom-0.5 -right-0.5"
            />
          </div>
          {!isCollapsed ? (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-display uppercase tracking-wide text-text-primary text-xs truncate">
                {displayName}
              </span>
              <span className="font-mono text-[10px] text-text-muted truncate">{email}</span>
              <span className="font-display uppercase tracking-[0.15em] text-[9px] text-primary mt-0.5">
                {role} · {workspace}
              </span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Logout pill + collapse toggle in a row */}
      <div
        className={['flex gap-2', isCollapsed ? 'flex-col items-center' : 'items-stretch'].join(
          ' ',
        )}
      >
        <button
          type="button"
          data-testid="sidebar-logout"
          onClick={handleLogout}
          aria-label="Cerrar sesion"
          className={[
            'flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md',
            'border border-primary/60 text-primary bg-transparent',
            'font-display uppercase tracking-[0.15em] text-[10px]',
            'hover:bg-primary/15 hover:shadow-glow-cyan transition-colors',
          ].join(' ')}
        >
          <LogoutIcon />
          {!isCollapsed ? <span>Cerrar sesion</span> : null}
        </button>
        <button
          type="button"
          onClick={toggle}
          aria-label={isCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
          className={[
            'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-md',
            'border border-[var(--portal-border)] text-text-secondary bg-[var(--portal-surface-soft)]',
            'font-display uppercase tracking-[0.15em] text-[10px]',
            'hover:border-primary/70 hover:text-primary transition-colors',
            isCollapsed ? '' : '',
          ].join(' ')}
        >
          <CollapseIcon isCollapsed={isCollapsed} />
          {!isCollapsed ? <span>Ocultar</span> : null}
        </button>
      </div>
    </div>
  );
}
