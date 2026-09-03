/*
 * p0b.2 — AdminTopBar.
 *
 * Top of the admin main column. Renders:
 *   - Page title (resolved from the current route — the dashboard,
 *     users or plans page sets an outlet context with the title, but
 *     we fall back to a constant default if no page provides one).
 *   - Right side: avatar + name dropdown with the "Ir al portal
 *     usuario" link (BOTH-role only) and "Cerrar sesion".
 *
 * Uses the same avatar pattern as TopNav (initial of first_name inside
 * a cyan ring). The dropdown closes on outside click via a backdrop
 * overlay — same minimal pattern as TopNav so the surface stays
 * consistent.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../features/auth/useAuth';
import { writeStoredPortal } from '../../features/auth/authStorage';
import { ADMIN_ROLES, UserRoles } from '../../features/auth/types';

interface AdminTopBarProps {
  readonly title?: string;
}

export function AdminTopBar({ title = 'Panel de administracion' }: AdminTopBarProps) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  if (user === null) return null;

  const displayName = `${user.first_name} ${user.last_name}`.trim() || user.email;
  const initials = (user.first_name ?? '?').trim().slice(0, 1).toUpperCase();
  const canSwitchPortal = user.role === UserRoles.BOTH && ADMIN_ROLES.includes(user.role);

  const handlePortalSwitch = () => {
    setMenuOpen(false);
    writeStoredPortal('user');
    navigate('/portal/dashboard');
  };

  return (
    <header className="sticky top-0 z-30 bg-surface/40 backdrop-blur-xl backdrop-saturate-150 border-b border-primary/30 h-16 flex items-center px-4 md:px-8 gap-4">
      <h1 className="font-display uppercase tracking-[0.2em] text-sm md:text-base truncate">
        {title}
      </h1>
      <div className="ml-auto flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`Menu de ${displayName}`}
          >
            <span className="hidden md:inline text-text-secondary font-body text-sm max-w-[160px] truncate">
              {displayName}
            </span>
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary/15 border border-primary/40 text-primary font-display uppercase text-sm">
              {initials}
            </span>
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                tabIndex={-1}
                aria-hidden="true"
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div
                role="menu"
                className="absolute right-0 top-12 z-40 min-w-[220px] bg-surface-el/95 backdrop-blur-md border border-primary/30 rounded-xl py-2 shadow-elevated"
              >
                <div className="px-4 py-4 text-text-muted font-body text-xs uppercase tracking-wide">
                  {user.email}
                </div>
                {canSwitchPortal ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handlePortalSwitch}
                    className="w-full text-left px-4 py-2 text-text-primary font-body text-sm hover:bg-primary/10"
                  >
                    Ir al portal usuario
                  </button>
                ) : null}
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    void logout();
                  }}
                  className="w-full text-left px-4 py-2 text-text-primary font-body text-sm hover:bg-primary/10"
                >
                  Cerrar sesion
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
