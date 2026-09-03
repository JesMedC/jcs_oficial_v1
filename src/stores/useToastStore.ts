/*
 * design-system-v1 — useToastStore Zustand slice (Wave 4c, T4.11-store).
 *
 * Session-scoped toast queue consumed by `<ToastContainer>` (Wave 4c)
 * and mounted-once in `AppShell` / `PortalShell` during Wave 7. The
 * store is intentionally NOT in the UI barrel — consumers import it
 * directly from `src/stores/useToastStore` because the container is
 * mounted separately (the container is NOT in the barrel either).
 *
 * Shape (per orchestrator brief + design.md §4.11 +
 * `specs/primitive-library/spec.md` Requirement: Toast):
 *   - `queue: Toast[]` — FIFO ordered; consumers re-render on append
 *   - `push(toast)` — generates a uuid, appends to queue, schedules
 *     auto-dismiss via `setTimeout` for `durationMs` (or severity
 *     default), returns the new id
 *   - `dismiss(id)` — removes the toast and cancels its pending
 *     auto-dismiss timer
 *   - `clear()` — empties the queue and cancels every pending timer
 *
 * Severity-driven default durations (the orchestrator's brief, which
 * overrides design.md's older `default 4000; danger 6000; success
 * 3000` rule because the orchestrator drops `danger` in favour of
 * `error` and re-tables info/warning explicitly):
 *   - success: 3000ms
 *   - info:    4000ms
 *   - warning: 4000ms
 *   - error:   6000ms
 *
 * Persistence: NONE. Toasts are session-only — closing the tab drops
 * the queue. The pending-timer Map is module-scoped (not part of
 * Zustand state) because:
 *   1. Functions / handles cannot be JSON-serialized for
 *      `persist` middleware
 *   2. Timer state is purely an implementation detail of the
 *      auto-dismiss lifecycle; exposing it would invite consumers
 *      to interact with it
 *
 * `crypto.randomUUID()` is available in Node 19+ and the project's
 * Node 20 baseline. Vitest's jsdom environment inherits Node's
 * globalThis.crypto so the call works directly. We defensively
 * check for the function and fall back to a Math.random-based id
 * for environments without WebCrypto (e.g. legacy jsdom).
 */
import { create } from 'zustand';

export type ToastSeverity = 'success' | 'info' | 'warning' | 'error';

export interface Toast {
  readonly id: string;
  readonly message: string;
  readonly severity: ToastSeverity;
  /**
   * Auto-dismiss delay in milliseconds. Defaults to the severity
   * default (success 3000 / info 4000 / warning 4000 / error 6000).
   */
  readonly durationMs?: number;
}

export interface ToastStore {
  readonly queue: ReadonlyArray<Toast>;
  push: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const DEFAULT_DURATIONS: Record<ToastSeverity, number> = {
  success: 3000,
  info: 4000,
  warning: 4000,
  error: 6000,
};

/**
 * Generate a UUID for a toast. Prefers the WebCrypto API (available
 * in Node 19+, all modern browsers, and vitest's jsdom env which
 * inherits Node globals). Falls back to a Math.random-based id for
 * environments without WebCrypto so the primitive degrades gracefully.
 */
function generateId(): string {
  if (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.randomUUID === 'function'
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback — collision probability is negligible for the lifetime
  // of a single browser session and the queue is bounded by user
  // activity. Not RFC 4122 compliant but unique enough for React keys.
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Pending auto-dismiss timers keyed by toast id. Module-scoped so
 * we can cancel them on `dismiss(id)` / `clear()` without exposing
 * them through the Zustand store API.
 */
const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useToastStore = create<ToastStore>((set, get) => ({
  queue: [],

  push: (toast) => {
    const id = generateId();
    const durationMs = toast.durationMs ?? DEFAULT_DURATIONS[toast.severity];

    set((state) => ({
      queue: [...state.queue, { ...toast, id }],
    }));

    // Schedule the auto-dismiss. The callback re-reads the store via
    // `get()` so a stale closure doesn't accidentally drop a
    // different toast when the id collides (extremely unlikely but
    // safe under the right edge cases).
    const timer = setTimeout(() => {
      pendingTimers.delete(id);
      get().dismiss(id);
    }, durationMs);
    pendingTimers.set(id, timer);

    return id;
  },

  dismiss: (id) => {
    const timer = pendingTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      pendingTimers.delete(id);
    }
    set((state) => ({
      queue: state.queue.filter((t) => t.id !== id),
    }));
  },

  clear: () => {
    pendingTimers.forEach((timer) => clearTimeout(timer));
    pendingTimers.clear();
    set({ queue: [] });
  },
}));
