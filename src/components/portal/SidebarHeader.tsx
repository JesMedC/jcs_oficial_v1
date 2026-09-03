/*
 * portal-fase0a-base — extracted brand row of PortalSidebar.
 *
 * Holds the brand dot + "JadeCapitalSuite / USUARIO" two-line label.
 * Pure presentational; collapse state is read from the local `isCollapsed`
 * prop so the parent can swap based on the global sidebar-collapsed store.
 */
export interface SidebarHeaderProps {
  readonly isCollapsed: boolean;
}

export function SidebarHeader({ isCollapsed }: SidebarHeaderProps) {
  return (
    <div
      className={[
        'flex items-center gap-2 px-4 py-5 border-b border-primary/20',
        isCollapsed ? 'justify-center' : '',
      ].join(' ')}
    >
      <span className="inline-block w-2 h-2 rounded-full bg-primary shadow-[0_0_12px_rgba(0,255,157,0.6)] shrink-0" /> {/* design-system-v1 (Wave 3b, T3b.1) — old-jade rgba swapped for neon jade rgba(0,255,157,*). */}
      {!isCollapsed ? (
        <div className="flex flex-col leading-tight min-w-0">
          <span className="font-display uppercase tracking-[0.2em] text-primary text-xs truncate">
            JadeCapitalSuite
          </span>
          <span className="font-display uppercase tracking-widest text-text-muted text-[9px] mt-0.5">
            USUARIO
          </span>
        </div>
      ) : null}
    </div>
  );
}
