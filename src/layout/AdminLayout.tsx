/*
 * p0b.2 — AdminLayout.
 *
 * Three-column shell for the admin portal:
 *   - AdminSidebar (left, collapsible)
 *   - AdminTopBar (top of main content)
 *   - <Outlet /> (main content)
 *
 * The sidebar collapse state is local to the layout (collapsed on
 * mobile by default, expanded on desktop) and survives navigation
 * within the admin section. The auth guard runs ABOVE this layout in
 * the route tree (see router/config.tsx) so we don't repeat the role
 * check here.
 *
 * Per mem #70 (cyan + Orbitron visual language), the layout uses the
 * same Tailwind tokens as the public site (`text-primary`,
 * `bg-surface-el`, `font-display uppercase tracking-wide`).
 */
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';

import { AdminAuthGuard } from '../features/admin/AdminAuthGuard';
import { AdminSidebar } from '../components/admin/AdminSidebar';
import { AdminTopBar } from '../components/admin/AdminTopBar';

const COLLAPSE_KEY = 'jcs.admin.sidebar.collapsed';

function readStoredCollapsed(): boolean {
  try {
    return sessionStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
}

export function AdminLayout() {
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
    <AdminAuthGuard>
      <div className="min-h-dvh flex flex-col bg-bg text-text-primary">
        <div className="flex-1 flex">
          <AdminSidebar collapsed={collapsed} onToggle={() => setCollapsed((prev) => !prev)} />
          <div className="flex-1 flex flex-col min-w-0">
            <AdminTopBar />
            <main className="flex-1 px-4 md:px-8 py-4 overflow-x-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </AdminAuthGuard>
  );
}
