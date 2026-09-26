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
        'flex items-center gap-3 px-4 py-4 border-b border-[var(--portal-border)]',
        'bg-[linear-gradient(135deg,var(--portal-surface-strong),transparent)]',
        isCollapsed ? 'justify-center' : '',
      ].join(' ')}
    >
      <span className="inline-flex w-9 h-9 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary shadow-[0_0_18px_var(--color-jade-glow)] shrink-0 font-display text-xs">
        JC
      </span>
      {!isCollapsed ? (
        <div className="flex flex-col leading-tight min-w-0">
          {/*
           * dashboard-jarvis-fidelity (Slice A, T-031, REQ-CWM-002) —
           * `text-text-primary` + cyan textShadow replace `text-white`
           * so the brand row stays readable on top of the glass surface
           * (T-030 swaps the opaque bg for `bg-surface/40`). The cyan
           * shadow mirrors the H1 greeting on DashboardPage.
           */}
          <span
            className="font-display uppercase tracking-[0.18em] text-text-primary text-xs truncate"
            style={{ textShadow: '0 0 8px rgba(0,212,216,0.35)' }}
          >
            JadeCapitalSuite
          </span>
          <span className="font-display uppercase tracking-widest text-text-muted text-[9px] mt-1">
            USUARIO
          </span>
        </div>
      ) : null}
    </div>
  );
}
