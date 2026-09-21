/*
 * design-system-v1 — Skeleton primitive (Wave 4c, T4.8).
 *
 * Decorative placeholder block used while real content loads.
 * Replaces the inline shimmer rows in DataTable's `loading` branch
 * (currently an inline `<div className="h-3 w-full max-w-[180px]
 * rounded bg-white/[0.06]" />` per the Wave 4b retrospective) and
 * the 5+ ad-hoc shimmer blocks scattered across pages and features.
 * Wave 5 owns the migration commits.
 *
 * Composition (per orchestrator brief + design.md §4.10 +
 * `specs/primitive-library/spec.md` Requirement: Skeleton):
 *   - base: `bg-white/5 rounded animate-pulse`
 *   - variants:
 *     - text: `h-4 w-full`; last line in a stack has `w-3/4` to
 *       mimic text wrapping (per design.md)
 *     - circle: `rounded-full`; defaults to `w-8 h-8` (32x32)
 *     - rect: `rounded-lg`; defaults to `w-full h-24`
 *     - card: `rounded-lg` with `bg-white/[0.06]`; defaults to
 *       `w-full h-40`
 *   - `count > 1` wraps the lines in a `space-y-2` container so
 *     multi-line text stacks read as a paragraph placeholder
 *   - `width` / `height` props apply as inline styles (CSS strings
 *     like `'120px'` or `'60%'`) and override the variant defaults
 *   - `prefers-reduced-motion`: when the user prefers reduced
 *     motion, `animate-pulse` is omitted and the static fallback
 *     tint `bg-white/10` is applied so the placeholder still
 *     reads as a placeholder even without the keyframe animation
 *
 * Accessibility:
 *   - `aria-hidden="true"` on every rendered element (the consumer
 *     provides their own loading text label, e.g. wrapping the
 *     Skeleton in a region with `aria-busy="true"` and an
 *     `<span className="sr-only">Cargando…</span>`)
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import type { CSSProperties } from 'react';

export type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

export interface SkeletonProps {
  readonly variant?: SkeletonVariant;
  /** CSS width value (e.g. `'120px'` or `'100%'`). Overrides the variant default. */
  readonly width?: string;
  /** CSS height value. Overrides the variant default. */
  readonly height?: string;
  /**
   * For the `text` variant: number of lines to render stacked with
   * `space-y-2`. The last line gets `w-3/4` to mimic text wrapping.
   * Defaults to `1` (single line).
   */
  readonly count?: number;
  /** Optional className appended to the rendered root element. */
  readonly className?: string;
}

const BASE_CLASSES = 'bg-white/5 rounded';

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full',
  circle: 'rounded-full w-8 h-8',
  rect: 'rounded-lg w-full h-24',
  card: 'rounded-lg w-full h-40 bg-white/[0.06]',
};

/**
 * Read the prefers-reduced-motion media query at render time.
 * jsdom does not implement `window.matchMedia` natively — the test
 * setup stubs one with `matches: false` (motion enabled by default),
 * and the Skeleton test suite overrides it per case to assert the
 * reduced-motion branch.
 */
function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Build the inline style for a skeleton line. Width/height props
 * become CSS properties; absent props contribute nothing so the
 * variant's default class (`w-8`, `h-4`, etc.) takes effect.
 */
function buildStyle(
  width: string | undefined,
  height: string | undefined,
): CSSProperties {
  const style: CSSProperties = {};
  if (width !== undefined) style.width = width;
  if (height !== undefined) style.height = height;
  return style;
}

export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className,
}: SkeletonProps): JSX.Element {
  const reducedMotion = prefersReducedMotion();
  const motionClass = reducedMotion ? 'bg-white/10' : 'animate-pulse';

  // Variant defaults — only `text` applies a stack; every other
  // variant renders a single element.
  if (variant !== 'text' || count <= 1) {
    const classes = [
      BASE_CLASSES,
      VARIANT_CLASSES[variant],
      motionClass,
      // `text` variant's default is `w-full`; `circle`/`rect`/`card`
      // each ship their own default in VARIANT_CLASSES. We still pass
      // the width/height through as inline style so a consumer can
      // pin exact dimensions.
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div
        aria-hidden="true"
        className={classes}
        style={buildStyle(width, height)}
      />
    );
  }

  // `text` + `count > 1` — render N lines wrapped in a `space-y-2`
  // container. The first (count-1) lines get the full-width variant;
  // the last line gets the shorter `w-3/4` to mimic text wrapping.
  const wrapperClasses = [
    BASE_CLASSES,
    motionClass,
    'space-y-2',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const lineClasses = (isLast: boolean) =>
    [BASE_CLASSES, isLast ? 'h-4 w-3/4' : 'h-4 w-full', motionClass]
      .filter(Boolean)
      .join(' ');

  return (
    <div
      aria-hidden="true"
      className={wrapperClasses}
      style={buildStyle(width, undefined)}
    >
      {Array.from({ length: count }, (_, idx) => {
        const isLast = idx === count - 1;
        return (
          <div
            key={idx}
            aria-hidden="true"
            className={lineClasses(isLast)}
            style={buildStyle(width, height)}
          />
        );
      })}
    </div>
  );
}
