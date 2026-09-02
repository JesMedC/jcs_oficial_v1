/*
 * portal-fase0a-base — WorkspaceSelector.
 *
 * Reads the user's workspace list from useAuth().user.workspaces and
 * drives useActiveWorkspace.setWorkspaceId(...). Disabled with a
 * Spanish-language tooltip when the user has exactly one workspace
 * ("Solo tenés un workspace") — no choice to make.
 *
 * Dropdown UX: a `<details>`/`<summary>` element so the open/close is
 * keyboard-navigable and screen-reader friendly without a JS popover
 * layer. Selection closes the menu by toggling the `<details>` open
 * flag off (we move focus back to the trigger).
 */
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../../features/auth/useAuth';
import { useActiveWorkspace } from '../../stores/useActiveWorkspace';

export interface WorkspaceSelectorProps {
  readonly isCollapsed: boolean;
}

interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly plan_tier: string;
}

export function WorkspaceSelector({ isCollapsed }: WorkspaceSelectorProps) {
  const { user } = useAuth();
  const activeId = useActiveWorkspace((state) => state.workspaceId);
  const setActive = useActiveWorkspace((state) => state.setWorkspaceId);
  const [open, setOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement | null>(null);

  // Auth provider currently exposes `user.workspaces` typed loosely,
  // so cast through unknown. When Auth's User type gains a typed
  // workspaces field this cast goes away. useMemo stabilizes the
  // reference so the useEffect below does not re-fire every render.
  const workspaces = useMemo<ReadonlyArray<WorkspaceSummary>>(
    () => (user?.workspaces as ReadonlyArray<WorkspaceSummary> | undefined) ?? [],
    [user?.workspaces],
  );

  // Sync persisted selection into the auth list on mount so we land
  // on a valid workspace (or fall back to the first one available).
  useEffect(() => {
    if (workspaces.length === 0) return;
    const stored = activeId;
    const known = stored !== null && workspaces.some((w) => w.id === stored);
    const first = workspaces[0];
    if (!known && first !== undefined) {
      setActive(first.id);
    }
  }, [workspaces, activeId, setActive]);

  if (workspaces.length === 0) {
    return null;
  }

  const single = workspaces.length === 1;
  const found = workspaces.find((w) => w.id === activeId);
  const first = workspaces[0];
  if (first === undefined) {
    return null;
  }
  const active = found ?? first;

  if (isCollapsed) {
    return (
      <div
        title={active.name}
        className="flex justify-center"
        aria-label={`Workspace activo: ${active.name}`}
      >
        <span className="inline-flex w-8 h-8 rounded-full bg-primary/15 text-primary items-center justify-center font-display text-[10px] uppercase">
          {active.name.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      open={open}
      onToggle={(event) => setOpen((event.currentTarget as HTMLDetailsElement).open)}
      className="relative"
    >
      <summary
        title={single ? 'Solo tenés un workspace' : 'Cambiar de workspace'}
        className={[
          'flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none list-none',
          'text-text-secondary hover:bg-primary/10 hover:text-primary transition-colors',
          single ? 'opacity-60 cursor-not-allowed hover:bg-transparent hover:text-text-secondary' : '',
        ].join(' ')}
        aria-label={`Workspace activo: ${active.name}`}
      >
        <span className="inline-flex w-6 h-6 rounded-full bg-primary/15 text-primary items-center justify-center font-display text-[10px] uppercase shrink-0">
          {active.name.slice(0, 2)}
        </span>
        <div className="flex flex-col leading-tight min-w-0 flex-1">
          <span className="font-display uppercase tracking-wide text-[10px] text-text-muted">
            Workspace
          </span>
          <span className="font-body text-sm text-text-primary truncate">{active.name}</span>
        </div>
        {!single ? (
          <svg
            className="w-4 h-4 text-text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        ) : null}
      </summary>
      {!single ? (
        <div className="absolute z-40 left-0 right-0 mt-1 p-1 rounded-lg bg-surface-el border border-glass-border shadow-elevated">
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              type="button"
              onClick={() => {
                setActive(ws.id);
                if (detailsRef.current) {
                  detailsRef.current.open = false;
                }
                setOpen(false);
              }}
              className={[
                'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-left',
                'font-body text-sm transition-colors',
                ws.id === active.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-secondary hover:bg-primary/10 hover:text-primary',
              ].join(' ')}
              data-testid={`workspace-option-${ws.id}`}
            >
              <span className="truncate">{ws.name}</span>
              <span className="font-display uppercase tracking-wide text-[10px] text-text-muted">
                {ws.plan_tier}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </details>
  );
}
