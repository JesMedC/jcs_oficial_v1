/*
 * p0d.2 — PortalShell.
 * portal-fase0a-base — drop <PortalNav> import + usage.
 *
 * Layout wrapper for the authenticated user portal (/portal/*).
 * Mirrors AdminLayout's three-column structure: collapsible left rail
 * (PortalSidebar) + main content area. The collapse state lives in
 * the useSidebarCollapsed store so navigation within /portal/*
 * keeps the preference and the value survives a hard reload
 * (sessionStorage per the `zustand-stores` spec).
 *
 * The auth guard sits ABOVE this shell in the route tree
 * (router/config.tsx) so we don't repeat the role check here. By the
 * time we render, `useAuth().user` is guaranteed non-null.
 *
 * No aurora background: portal pages are dense data surfaces, not
 * landing pages, so the bg-bg fill matches AdminLayout's calm style
 * (per mem #70 — same visual language as admin).
 */
import { Outlet } from 'react-router-dom';

import { PortalSidebar } from './PortalSidebar';

export function PortalShell() {
  return (
    <div className="min-h-dvh flex bg-bg text-text-primary">
      <PortalSidebar />
      <main className="flex-1 px-4 md:px-8 py-6 md:py-8 overflow-x-auto min-w-0">
        <Outlet />
      </main>
    </div>
  );
}
