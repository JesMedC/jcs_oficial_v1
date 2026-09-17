/*
 * p0d.2 — PortalShell.
 * portal-fase0a-base — drop <PortalNav> import + usage.
 * jarvis-ui-redesign (T-10) — JARVIS HUD shell.
 *   - Mounts <PortalHeader> above the main content as the persistent
 *     JARVIS status bar (brand "JARDE CAPITAL SUITE · CORE INTERFACE"
 *     + online indicator).
 *   - Mounts <ServerRoomBackground> as the dim server-room backdrop
 *     (z-index -10, absolute inset-0, behind every other layer).
 *   - Mounts <JarvisWatermark> in the top-left and bottom-right
 *     corners of the shell root, so the JARVIS wordmark etches into
 *     the chrome regardless of which /portal/* route is active.
 *
 * Layout: collapsible left rail (PortalSidebar) + sticky header
 * (PortalHeader) + main content area. FloatingActionButton + global
 * modals live shell-level so the shortcut menu + drawers are present
 * on every /portal/* route.
 */
import { Outlet } from 'react-router-dom';

import { PortalSidebar } from './PortalSidebar';
import { PortalHeader } from './PortalHeader';
import { FloatingActionButton } from './FloatingActionButton';
import { NewTradeDrawer } from '../../features/trades/NewTradeDrawer';
import { QuickActionModals } from './QuickActionModals';
import { ThemeToggle } from '../common/ThemeToggle';
import { ServerRoomBackground } from '../decor/ServerRoomBackground';
import { JarvisWatermark } from '../dashboard/JarvisWatermark';

export function PortalShell() {
  return (
    <div className="relative min-h-dvh flex bg-[var(--color-bg)] text-[var(--color-jade-text-pri)]">
      {/* JARVIS chrome backdrop — dim server room + grid pattern. */}
      <ServerRoomBackground />

      {/* JARVIS wordmark in the corners of the chrome (top-left + bottom-right).
          Watermarks are aria-hidden + pointer-events-none (decorative). */}
      <JarvisWatermark position="top-left" />
      <JarvisWatermark position="bottom-right" />

      <PortalSidebar />

      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-x-auto">
        <PortalHeader />
        <main className="flex-1 px-4 md:px-6 py-4 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Theme toggle floating top-right of the content area. */}
      <div className="fixed top-4 right-4 z-30">
        <ThemeToggle />
      </div>
      <NewTradeDrawer />
      <QuickActionModals />
      <FloatingActionButton />
    </div>
  );
}
