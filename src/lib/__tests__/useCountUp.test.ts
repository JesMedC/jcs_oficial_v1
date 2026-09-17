/*
 * useCountUp — animate a numeric value from 0 (or a previous value) to a
 * target over a short duration.
 *
 * TDD contract:
 *   - Returns a numeric `value` that smoothly approaches `target`.
 *   - Animation duration is bounded (<= 2000 ms by default).
 *   - Honours `prefers-reduced-motion` by snapping to the target.
 *   - Edge cases:
 *       * target = 0          → returns 0 immediately.
 *       * target negative     → reaches it.
 *       * target decimal      → reaches it.
 *       * target changes      → restarts from the current displayed value.
 *
 * Implementation lives in `useCountUp.ts`; this test file is the contract.
 *
 * NOTE: we do NOT use fake timers here — the hook uses
 * `requestAnimationFrame` which Vitest's fake timers don't advance. The
 * hook already has a `duration` cap so we can keep tests fast by passing
 * a short duration and waiting for real frames.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCountUp } from '../useCountUp';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('useCountUp', () => {
  it('returns the target immediately when target is 0', () => {
    const { result } = renderHook(() => useCountUp({ target: 0 }));
    expect(result.current).toBe(0);
  });

  it('starts at 0 and reaches the positive target within the duration', async () => {
    const { result } = renderHook(() => useCountUp({ target: 100, duration: 80 }));
    expect(result.current).toBe(0);
    await act(async () => {
      await wait(150);
    });
    expect(result.current).toBe(100);
  });

  it('reaches a negative target', async () => {
    const { result } = renderHook(() => useCountUp({ target: -250, duration: 80 }));
    await act(async () => {
      await wait(150);
    });
    expect(result.current).toBe(-250);
  });

  it('reaches a decimal target', async () => {
    const { result } = renderHook(() => useCountUp({ target: 71.42, duration: 80 }));
    await act(async () => {
      await wait(150);
    });
    expect(result.current).toBeCloseTo(71.42, 2);
  });

  it('restarts the animation when the target changes (no flash to 0)', async () => {
    const { result, rerender } = renderHook(
      ({ t }) => useCountUp({ target: t, duration: 80 }),
      { initialProps: { t: 100 } },
    );
    await act(async () => {
      await wait(40);
    });
    const midValue = result.current;
    expect(midValue).toBeGreaterThan(0);
    expect(midValue).toBeLessThan(100);

    rerender({ t: 200 });
    // First render after rerender should still be near midValue (the
    // animation is seeded from the previous display value, not 0).
    expect(result.current).toBeGreaterThanOrEqual(midValue - 1);

    await act(async () => {
      await wait(150);
    });
    expect(result.current).toBeCloseTo(200, 0);
  });

  it('honours prefers-reduced-motion by snapping to the target', () => {
    const match = vi.fn().mockReturnValue(true);
    const stub = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    vi.stubGlobal('matchMedia', (() => stub) as unknown as typeof window.matchMedia);

    const { result: r } = renderHook(() =>
      useCountUp({ target: 50, duration: 600 }),
    );
    // No timer advance — the hook should snap on first render.
    expect(r.current).toBe(50);
    vi.unstubAllGlobals();
  });

  it('uses the default 600 ms duration when none is provided', async () => {
    const { result } = renderHook(() => useCountUp({ target: 10 }));
    // Mid-flight (after ~200ms) the value should be partway to 10, not 0.
    await act(async () => {
      await wait(200);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThanOrEqual(10);
  });
});