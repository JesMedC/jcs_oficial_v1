/*
 * portal-fase0a-base — extracted footer row of PortalSidebar.
 *
 * After p0d.2 the workspace selector + collapse toggle lived here.
 * FASE 4B rolled the user identity (first/last name + logout) into
 * the same panel since the public TopNav is no longer mounted on
 * /portal/* — the footer is now the only place where "who am I" and
 * "sign out" surface.
 *
 * FASE 4C simplified the footer further:
 *   - Workspace selector was removed (workspace chrome lives in the
 *     account-level screens, not on the global chrome).
 *   - Toggle label changed from "Colapsar" to "Ocultar" to match the
 *     common "show/hide rail" mental model.
 *
 * Order from top to bottom:
 *   1. User identity block (avatar + display name + logout button)
 *   2. Hide / Show rail toggle
 *
 * On a collapsed 64px sidebar the user block collapses to an
 * icon-only logout button to keep the rail readable.
 */
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { useSidebarCollapsed } from '../../stores/useSidebarCollapsed';

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

function buildDisplayName(user: {
  first_name: string;
  last_name: string;
  email: string;
}): string {
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

  return (
    <div className="border-t border-[rgba(0,255,157,0.15)] p-3 space-y-3">
      {/* User identity + logout */}
      <div
        className={[
          'flex items-center gap-3',
          isCollapsed ? 'justify-center flex-col' : '',
        ].join(' ')}
      >
        {user && displayName ? (
          <>
            {!isCollapsed ? (
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-[rgba(0,255,157,0.12)] border border-[rgba(0,255,157,0.35)] text-[#00FF9D] font-display uppercase text-xs"
                  aria-hidden="true"
                >
                  {initials(displayName)}
                </div>
                <span
                  className="font-body text-sm text-text-primary truncate min-w-0"
                  title={displayName}
                >
                  {displayName}
                </span>
              </div>
            ) : (
              <div
                className="inline-flex shrink-0 items-center justify-center w-8 h-8 rounded-full bg-[rgba(0,255,157,0.12)] border border-[rgba(0,255,157,0.35)] text-[#00FF9D] font-display uppercase text-xs"
                aria-hidden="true"
                title={displayName}
              >
                {initials(displayName)}
              </div>
            )}
            <button
              type="button"
              data-testid="sidebar-logout"
              onClick={handleLogout}
              aria-label="Cerrar sesion"
              className="btn-cyber-jade px-2 py-1 rounded-md text-xs flex items-center gap-1.5 shrink-0"
            >
              <LogoutIcon />
              {!isCollapsed ? <span>Cerrar sesion</span> : null}
            </button>
          </>
        ) : null}
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={isCollapsed ? 'Mostrar menu' : 'Ocultar menu'}
        className={[
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
          'text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors',
          isCollapsed ? 'justify-center' : '',
        ].join(' ')}
      >
        <CollapseIcon isCollapsed={isCollapsed} />
        {!isCollapsed ? <span className="font-body text-sm">Ocultar</span> : null}
      </button>
    </div>
  );
}
