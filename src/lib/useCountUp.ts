/*
 * useCountUp — animate a numeric value from 0 (or the previously displayed
 * value) toward `target` over a bounded duration.
 *
 * Used by the JARVIS HUD to "tick" the dashboard's headline numbers in:
 *   - DashboardSummaryStrip: Balance Total, P&L Neto, Win Rate, Operaciones
 *   - RecentActivityFeed: per-row P&L (signed)
 *   - DashboardKPIsGrid: Win Rate Mensual, R/R ratio, etc.
 *
 * Implementation notes:
 *   - ease-out cubic (1 - (1-t)^3) so the count slows into the target.
 *   - requestAnimationFrame for paint-aligned updates; prefers-reduced-motion
 *     snaps to the target on first paint instead.
 *   - Re-renders are forced via `useState` because the value is a continuous
 *     visual tick — `useRef` would skip React's reconciler and break
 *     downstream re-renders that format the number for display.
 *   - When `target` changes mid-flight, the animation seeds from the
 *     previously DISPLAYED value (not 0) so the number keeps moving in the
 *     same direction instead of snapping back to zero.
 */
import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
  /** Final value the counter should reach. */
  readonly target: number;
  /** Animation duration in ms. Capped at 2000; default 600. */
  readonly duration?: number;
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useCountUp({
  target,
  duration = 600,
}: UseCountUpOptions): number {
  const [value, setValue] = useState<number>(() =>
    prefersReducedMotion() ? target : 0,
  );
  const startTimeRef = useRef<number | null>(null);
  const fromRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Reduced-motion path: no animation, just sync.
    if (prefersReducedMotion()) {
      setValue(target);
      return undefined;
    }

    const clampedDuration = Math.max(0, Math.min(2000, duration));
    // Seed the animation from whatever the counter is currently displaying
    // so a target change mid-flight doesn't snap back to 0.
    fromRef.current = value;
    startTimeRef.current = null;

    const tick = (now: number): void => {
      if (startTimeRef.current === null) {
        startTimeRef.current = now;
      }
      const elapsed = now - startTimeRef.current;
      const t = clampedDuration === 0 ? 1 : Math.min(1, elapsed / clampedDuration);
      const eased = easeOutCubic(t);
      const next = fromRef.current + (target - fromRef.current) * eased;
      // Snap at the end so floating-point drift doesn't leave us at 99.9999.
      if (t >= 1) {
        setValue(target);
        rafRef.current = null;
        return;
      }
      setValue(next);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // We intentionally exclude `value` from deps to avoid restarting the
    // animation on every tick — `value` is updated inside the rAF callback
    // and would otherwise produce a feedback loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}