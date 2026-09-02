/*
 * p0d.2 — PortalShell.
 *
 * Layout wrapper for the authenticated user portal (/portal/*).
 * Mirrors AdminLayout's three-column structure: collapsible left rail
 * (PortalSidebar) + main content area. The collapse state is local to
 * the layout — default collapsed on small viewports, expanded on
 * desktop — and persisted in sessionStorage so navigation within
 * /portal/* keeps the preference.
 *
 * The auth guard sits ABOVE this shell in the route tree
 * (router/config.tsx) so we don't repeat the role check here. By the
 * time we render, `useAuth().user` is guaranteed non-null.
 *
 * No aurora background: portal pages are dense data surfaces, not
 * landing pages, so the bg-bg fill matches AdminLayout's calm style
 * (per mem #70 — same visual language as admin).
 */
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { PortalSidebar } from './PortalSidebar';

const COLLAPSE_KEY = 'jcs.portal.sidebar.collapsed';

function readStoredCollapsed(): boolean {
  try {
    return sessionStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function PortalShell() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    // Default: collapsed on small viewports, expanded on desktop.
    if (window.innerWidth < 768) return true;
    return readStoredCollapsed();
  });

  // Persist collapse preference whenever the user toggles it.
  useEffect(() => {
    try {
      sessionStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
    } catch {
      /* sessionStorage unavailable — non-fatal, ignore */
    }
  }, [collapsed]);

  return (
    <div className="min-h-dvh flex flex-col bg-bg text-text-primary">
      <div className="flex-1 flex">
        <PortalSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 overflow-x-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
