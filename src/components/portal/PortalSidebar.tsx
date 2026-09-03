/*
 * p0d.2 — PortalSidebar.
 * p0e.1 — Extend nav: rename Movimientos → Operaciones, add Diario
 *         (Diario de Trading) + Playbook. Final 6-item order:
 *         Dashboard, Cuentas, Operaciones, Diario, Playbook,
 *         Configuracion.
 * portal-fase0a-base — restore vertical sidebar on desktop.
 *         Drops the previous `hidden lg:hidden` desktop-hide (the
 *         horizontal PortalNav was archived by this same wave, see
 *         PortalNav.tsx) and composes three extracted pieces:
 *         SidebarHeader / SidebarNav / SidebarFooter. Collapsed
 *         state now reads from the useSidebarCollapsed Zustand
 *         store (sessionStorage-backed). The footer also mounts
 *         WorkspaceSelector.
 *
 * Left rail for the authenticated user portal (/portal/*). Collapsible
 * with the same width transition AdminSidebar uses (240px expanded,
 * 64px collapsed). Active item gets a jade left-border + jade glow,
 * matching the spec.
 *
 * Reuses the AdminSidebar layout pattern (sticky rail, h-dvh, brand
 * row at the top, nav in the middle, collapse toggle at the bottom).
 *
 * Visual language per mem #70 (jade + Orbitron, glassmorphism). UI
 * labels per mem #68 are Spanish (Dashboard, Cuentas, Operaciones,
 * Diario, Playbook, Configuracion). Code identifiers stay English.
 */
import { SidebarHeader } from './SidebarHeader';
import { SidebarNav } from './SidebarNav';
import { SidebarFooter } from './SidebarFooter';
import { useSidebarCollapsed } from '../../stores/useSidebarCollapsed';

export function PortalSidebar() {
  const isCollapsed = useSidebarCollapsed((state) => state.isCollapsed);

  return (
    <aside
      className={[
        // Vertical sidebar restored on desktop per portal-fase0a-base —
        // previously hidden lg:hidden while PortalNav drew the horizontal
        // nav; PortalNav is archived now, so this rail is visible on
        // lg+ screens (240px expanded / 64px collapsed).
        // Cyber-Jade: sidebar plana, fondo #060B10 puro, sin glass fuerte.
        'shrink-0 sticky top-0 self-start h-dvh border-r border-[rgba(0,255,157,0.15)]',
        'bg-[#060B10]',
        'flex flex-col transition-[width] duration-200',
        isCollapsed ? 'w-16' : 'w-60',
      ].join(' ')}
      aria-label="Menu lateral del portal de usuario"
    >
      <SidebarHeader isCollapsed={isCollapsed} />
      <SidebarNav isCollapsed={isCollapsed} />
      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
}
