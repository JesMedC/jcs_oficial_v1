/*
 * design-system-v1 — useToastStore unit tests (Wave 4c, T4.11-store).
 *
 * Pins the Zustand slice contract from
 * `specs/primitive-library/spec.md` (Requirement: Toast Scenario:
 * "Push appends and auto-dismisses") + design.md §4.11 +
 * orchestrator's per-primitive brief:
 *   - state: `queue: Toast[]`
 *   - `push(toast)` generates a uuid, appends to queue, schedules
 *     auto-dismiss via `setTimeout`, and returns the new id
 *   - `dismiss(id)` removes the toast from the queue and clears its
 *     pending auto-dismiss timer
 *   - `clear()` empties the queue and clears all pending timers
 *   - default durations: success 3000ms, info 4000ms, warning
 *     4000ms, error 6000ms (overridable via `durationMs`)
 *   - no persistence (toasts are session-only)
 *
 * Auto-dismiss is verified with `vi.useFakeTimers()` +
 * `vi.advanceTimersByTime(duration)` per the spec scenario. The
 * tests reset the store state in `beforeEach` so each test
 * starts from an empty queue.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useToastStore } from '../useToastStore';

function resetStore(): void {
  // Drop any in-flight timers first so they don't fire across tests.
  useToastStore.getState().clear();
  useToastStore.setState({ queue: [] });
}

beforeEach(() => {
  resetStore();
  // Use real timers by default. Individual tests opt into fake
  // timers via `vi.useFakeTimers()` so the rest of the suite is
  // not slowed down by real-time waits.
});

afterEach(() => {
  resetStore();
  vi.useRealTimers();
});

describe('useToastStore', () => {
  describe('initial state', () => {
    it('starts with an empty queue', () => {
      expect(useToastStore.getState().queue).toEqual([]);
    });
  });

  describe('push', () => {
    it('appends to the queue and returns the new id', () => {
      const id = useToastStore.getState().push({
        severity: 'info',
        message: 'Hola',
      });

      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
      expect(useToastStore.getState().queue).toHaveLength(1);
      expect(useToastStore.getState().queue[0]?.id).toBe(id);
      expect(useToastStore.getState().queue[0]?.message).toBe('Hola');
      expect(useToastStore.getState().queue[0]?.severity).toBe('info');
    });

    it('push with the same message twice creates TWO entries (no dedup)', () => {
      useToastStore.getState().push({ severity: 'info', message: 'A' });
      useToastStore.getState().push({ severity: 'info', message: 'A' });

      expect(useToastStore.getState().queue).toHaveLength(2);
      const ids = useToastStore.getState().queue.map((t) => t.id);
      // The two ids are distinct.
      expect(new Set(ids).size).toBe(2);
    });

    it('preserves the order of pushes (FIFO)', () => {
      useToastStore.getState().push({ severity: 'info', message: 'first' });
      useToastStore.getState().push({ severity: 'info', message: 'second' });
      useToastStore.getState().push({ severity: 'info', message: 'third' });

      const messages = useToastStore.getState().queue.map((t) => t.message);
      expect(messages).toEqual(['first', 'second', 'third']);
    });
  });

  describe('dismiss', () => {
    it('removes the toast with the given id', () => {
      const id = useToastStore.getState().push({
        severity: 'info',
        message: 'X',
      });

      expect(useToastStore.getState().queue).toHaveLength(1);

      useToastStore.getState().dismiss(id);

      expect(useToastStore.getState().queue).toEqual([]);
    });

    it('is a no-op when the id is not in the queue', () => {
      useToastStore.getState().push({ severity: 'info', message: 'Y' });

      // dismiss with an unknown id — should NOT throw, queue stays.
      expect(() =>
        useToastStore.getState().dismiss('not-a-real-id'),
      ).not.toThrow();
      expect(useToastStore.getState().queue).toHaveLength(1);
    });

    it('cancels the pending auto-dismiss timer for the dismissed id', () => {
      vi.useFakeTimers();
      const id = useToastStore.getState().push({
        severity: 'info',
        message: 'Z',
      });

      // Advance time to just before the default 4000ms dismiss.
      vi.advanceTimersByTime(3999);
      expect(useToastStore.getState().queue).toHaveLength(1);

      // Manually dismiss before the timer fires.
      useToastStore.getState().dismiss(id);
      expect(useToastStore.getState().queue).toHaveLength(0);

      // Advancing past the original dismiss time should not re-add
      // or re-fire anything (timer was cancelled).
      vi.advanceTimersByTime(10);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('empties the entire queue', () => {
      useToastStore.getState().push({ severity: 'info', message: '1' });
      useToastStore.getState().push({ severity: 'info', message: '2' });
      useToastStore.getState().push({ severity: 'info', message: '3' });

      expect(useToastStore.getState().queue).toHaveLength(3);

      useToastStore.getState().clear();

      expect(useToastStore.getState().queue).toEqual([]);
    });

    it('cancels every pending auto-dismiss timer', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({ severity: 'info', message: '1' });
      useToastStore.getState().push({ severity: 'info', message: '2' });

      // Clear before any auto-dismiss fires.
      useToastStore.getState().clear();
      expect(useToastStore.getState().queue).toEqual([]);

      // Advancing well past the longest default duration should not
      // re-fire anything (all timers were cancelled).
      vi.advanceTimersByTime(10000);
      expect(useToastStore.getState().queue).toEqual([]);
    });
  });

  describe('auto-dismiss timing', () => {
    it('uses success default of 3000ms when no durationMs is provided', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({ severity: 'success', message: 'S' });

      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(2999);
      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });

    it('uses info default of 4000ms when no durationMs is provided', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({ severity: 'info', message: 'I' });

      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(3999);
      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });

    it('uses warning default of 4000ms when no durationMs is provided', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({ severity: 'warning', message: 'W' });

      vi.advanceTimersByTime(3999);
      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });

    it('uses error default of 6000ms when no durationMs is provided', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({ severity: 'error', message: 'E' });

      vi.advanceTimersByTime(5999);
      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });

    it('respects an explicit durationMs override', () => {
      vi.useFakeTimers();
      useToastStore.getState().push({
        severity: 'info',
        message: 'fast',
        durationMs: 500,
      });

      vi.advanceTimersByTime(499);
      expect(useToastStore.getState().queue).toHaveLength(1);

      vi.advanceTimersByTime(1);
      expect(useToastStore.getState().queue).toHaveLength(0);
    });

    it('dismisses only the targeted toast when multiple are queued', () => {
      vi.useFakeTimers();
      const id1 = useToastStore.getState().push({
        severity: 'success',
        message: 'first',
        durationMs: 1000,
      });
      useToastStore.getState().push({
        severity: 'info',
        message: 'second',
        durationMs: 1000,
      });
      useToastStore.getState().push({
        severity: 'info',
        message: 'third',
        durationMs: 1000,
      });

      vi.advanceTimersByTime(1000);

      // All three toasts share the same duration here — they all
      // auto-dismiss in the same tick.
      expect(useToastStore.getState().queue).toHaveLength(0);

      // Re-arm with different durations to confirm per-toast timing.
      const id2 = useToastStore.getState().push({
        severity: 'info',
        message: 'short',
        durationMs: 500,
      });
      const id3 = useToastStore.getState().push({
        severity: 'info',
        message: 'long',
        durationMs: 2000,
      });

      vi.advanceTimersByTime(500);
      // Only the short one is gone.
      expect(useToastStore.getState().queue.map((t) => t.id)).toEqual([id3]);

      vi.advanceTimersByTime(1500);
      // The long one is gone too.
      expect(useToastStore.getState().queue).toEqual([]);

      // Touch id2 to silence the unused-var lint; the assertion
      // above proves the per-toast timing.
      expect(id2).toBeTruthy();
      expect(id1).toBeTruthy();
    });
  });
});
