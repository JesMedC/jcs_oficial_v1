/*
 * portal-fase0a-base — store: useSidebarCollapsed.
 *
 * 240px expanded / 64px collapsed preference for the portal sidebar.
 * Persisted to sessionStorage under the spec key
 * `jcs.portal.sidebar.collapsed` so navigation within /portal/*
 * survives a route change but does NOT bleed across browser tabs —
 * the user's collapse preference is per-tab and per-session.
 *
 * Why sessionStorage (not localStorage)? Tabs can be opened from
 * different devices, with different screen sizes; promoting collapse
 * state to local storage would force one tab's preference onto the
 * other.
 *
 * SSR-safe: storage access is gated behind a try/catch and falls
 * back to defaults if storage is unavailable (private browsing,
 * quota exhaustion, etc.).
 */
import { create } from 'zustand';

const STORAGE_KEY = 'jcs.portal.sidebar.collapsed';

function readStored(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeStored(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* sessionStorage unavailable — non-fatal */
  }
}

interface SidebarCollapsedState {
  readonly isCollapsed: boolean;
  readonly toggle: () => void;
  readonly set: (next: boolean) => void;
}

export const useSidebarCollapsed = create<SidebarCollapsedState>((set) => ({
  isCollapsed: readStored(),
  toggle: () => {
    set((state) => {
      const next = !state.isCollapsed;
      writeStored(next);
      return { isCollapsed: next };
    });
  },
  set: (next) => {
    writeStored(next);
    set({ isCollapsed: next });
  },
}));
