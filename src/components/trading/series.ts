/*
 * Cyber-Jade — Trading series helpers.
 *
 * Deterministic pseudo-random series derived from a numeric seed
 * (e.g. an account balance). Same seed → same series on every render
 * and across sessions, which means the UI doesn't flicker between
 * renders and we don't need to ship a chart library just to draw a
 * sparkline.
 *
 * Kept in its own file so the React Fast Refresh plugin doesn't flag
 * Sparkline.tsx for exporting non-component values.
 */

/**
 * Build a deterministic pseudo-random series of `length` points
 * around a baseline of 100, with a gentle upward trend and ~15% noise.
 */
export function seedSeries(seed: number, length = 12): ReadonlyArray<number> {
  const out: number[] = [];
  let s = Math.abs(Math.round(seed * 1000)) || 1;
  for (let i = 0; i < length; i++) {
    // simple LCG
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    const noise = ((s / 2 ** 32) - 0.5) * 0.15;
    const trend = (i / (length - 1)) * 0.5;
    out.push(100 + trend * 100 + noise * 100);
  }
  return out;
}
