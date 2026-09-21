/*
 * portal-fase0a-base — store: useActiveWorkspace.
 *
 * Tracks which `workspace_id` is currently active for the
 * multi-tenant MVP. Persisted to sessionStorage so a hard reload
 * (or coming back from a sub-route) keeps the user on the same
 * workspace — but does NOT bleed across browser tabs.
 *
 * The string union is intentionally simple: any non-empty string is
 * a valid workspaceId. The JWT carries the canonical list of
 * workspaces the user has access to; we use that list to drive the
 * WorkspaceSelector dropdown (see src/components/portal/WorkspaceSelector.tsx)
 * and we let the active id be set to any uuid-shaped string the user
 * picks. The server-side `X-Workspace-Id` header emission is
 * deferred — see the `workspace-selection` spec open question.
 */
import { create } from 'zustand';

const STORAGE_KEY = 'jcs.active.workspace_id';

function readStored(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    return value === null || value === '' ? null : value;
  } catch {
    return null;
  }
}

function writeStored(value: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === null) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, value);
    }
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
}

interface ActiveWorkspaceState {
  readonly workspaceId: string | null;
  readonly setWorkspaceId: (id: string | null) => void;
  readonly clear: () => void;
}

export const useActiveWorkspace = create<ActiveWorkspaceState>((set) => ({
  workspaceId: readStored(),
  setWorkspaceId: (id) => {
    writeStored(id);
    set({ workspaceId: id });
  },
  clear: () => {
    writeStored(null);
    set({ workspaceId: null });
  },
}));
