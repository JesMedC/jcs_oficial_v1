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
 * Cyber-Jade spec — fondo global #060B10 puro. Sin lineas ni redes.
 * La textura de puntos blancos la aporta #root::before.
 *
 * FloatingActionButton + global modals (NewTradeDrawer +
 * QuickActionModals for fund/withdraw with account picker) live
 * here (shell-level) so the shortcut menu and its dialogs are
 * present on every /portal/* route without each page importing them.
 */
import { Outlet } from 'react-router-dom';

import { PortalSidebar } from './PortalSidebar';
import { FloatingActionButton } from './FloatingActionButton';
import { NewTradeDrawer } from '../../features/trades/NewTradeDrawer';
import { QuickActionModals } from './QuickActionModals';

export function PortalShell() {
  return (
    <div className="relative min-h-dvh flex bg-[#060B10] text-text-primary">
      <PortalSidebar />
      <main className="relative z-10 flex-1 px-4 md:px-6 py-4 overflow-x-auto min-w-0">
        <Outlet />
      </main>
      <NewTradeDrawer />
      <QuickActionModals />
      <FloatingActionButton />
    </div>
  );
}
