/*
 * portal-fase0a-base — extracted footer row of PortalSidebar.
 *
 * Hosts the active-workspace WorkspaceSelector (above the toggle so
 * the workspace name stays vertically aligned with the rest of the
 * sidebar even when the sidebar is collapsed to 64px wide — in that
 * case the workspace chip hides behind an icon-only badge).
 *
 * Below the selector sits the collapse/expand toggle button, which
 * writes to the useSidebarCollapsed store and persists to
 * sessionStorage.
 */
import { useSidebarCollapsed } from '../../stores/useSidebarCollapsed';
import { WorkspaceSelector } from './WorkspaceSelector';

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

export interface SidebarFooterProps {
  readonly isCollapsed: boolean;
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  const toggle = useSidebarCollapsed((state) => state.toggle);

  return (
    <div className="border-t border-primary/20 p-3 space-y-2">
      <WorkspaceSelector isCollapsed={isCollapsed} />
      <button
        type="button"
        onClick={toggle}
        aria-label={isCollapsed ? 'Expandir menu' : 'Colapsar menu'}
        className={[
          'w-full flex items-center gap-3 px-3 py-2 rounded-lg',
          'text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors',
          isCollapsed ? 'justify-center' : '',
        ].join(' ')}
      >
        <CollapseIcon isCollapsed={isCollapsed} />
        {!isCollapsed ? <span className="font-body text-sm">Colapsar</span> : null}
      </button>
    </div>
  );
}
