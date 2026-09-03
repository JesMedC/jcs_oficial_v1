/*
 * design-system-v1 — DotGrid decor primitive unit tests (Wave 6, T6.1).
 *
 * Pins the visual + behavioural contract from
 * `specs/decorative-system/spec.md` Requirement: DotGrid component
 * + design.md §5.1:
 *   - container: `<div>` with `pointer-events-none -z-10` (decorative
 *     chrome must never intercept clicks; must sit behind content)
 *   - inline `<svg with `<defs><pattern>` defining a tiled dot
 *   - pattern id is generated via `useId()` so multiple DotGrids on
 *     the same page don't collide on the same `url(#dot-grid)`
 *   - pattern contains a `<circle>` at the centre of each tile with
 *     the requested `cx`/`cy`/`fill`
 *   - `<rect width="100%" height="100%" fill="url(#...)">` covers
 *     the full SVG canvas; opacity (or fill-opacity) is the configured
 *     value
 *   - defaults: spacing=24, dotRadius=1.5, opacity=0.04, color='#00FF9D'
 *   - custom props propagate (spacing → pattern width/height + circle
 *     cx/cy; dotRadius → circle r; color → circle fill;
 *     opacity → fill-opacity or rect opacity)
 *
 * The component is presentational only — no `useEffect`, no state,
 * no side effects beyond what React render produces.
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { DotGrid } from '../DotGrid';

describe('DotGrid', () => {
  describe('container', () => {
    it('renders a wrapping <div> with pointer-events-none and -z-10 so it sits behind content and never intercepts clicks', () => {
      const { container } = render(<DotGrid />);
      const root = container.firstElementChild;

      expect(root?.tagName).toBe('DIV');
      expect(root).toHaveClass('pointer-events-none');
      expect(root).toHaveClass('-z-10');
    });

    it('renders an inline <svg inside the wrapper so it can be sized by its parent', () => {
      const { container } = render(<DotGrid />);
      const svg = container.querySelector('svg');

      expect(svg).not.toBeNull();
    });
  });

  describe('defaults', () => {
    it('default spacing=24 produces a pattern width/height of 24 and a circle centred at (12,12)', () => {
      const { container } = render(<DotGrid />);
      const pattern = container.querySelector('pattern');

      expect(pattern).toHaveAttribute('width', '24');
      expect(pattern).toHaveAttribute('height', '24');
      const circle = pattern?.querySelector('circle');
      expect(circle).toHaveAttribute('cx', '12');
      expect(circle).toHaveAttribute('cy', '12');
    });

    it('default dotRadius=1.5 produces a circle r="1.5"', () => {
      const { container } = render(<DotGrid />);
      const circle = container.querySelector('pattern circle');

      expect(circle).toHaveAttribute('r', '1.5');
    });

    it('default color="#00FF9D" produces a jade circle fill', () => {
      const { container } = render(<DotGrid />);
      const circle = container.querySelector('pattern circle');

      expect(circle).toHaveAttribute('fill', '#00FF9D');
    });

    it('default opacity=0.04 produces a fill-opacity of 0.04 on the circle', () => {
      const { container } = render(<DotGrid />);
      const circle = container.querySelector('pattern circle');

      // fillOpacity is the canonical SVG attribute for circle opacity;
      // both spellings render the same in jsdom. We accept either
      // `fill-opacity="0.04"` (preferred) or `opacity="0.04"` on the
      // circle, but the test pins the fill-opacity form.
      expect(circle?.getAttribute('fill-opacity')).toBe('0.04');
    });
  });

  describe('custom props', () => {
    it('custom spacing=48 propagates to pattern width/height and centres the circle at (24,24)', () => {
      const { container } = render(<DotGrid spacing={48} />);
      const pattern = container.querySelector('pattern');
      const circle = pattern?.querySelector('circle');

      expect(pattern).toHaveAttribute('width', '48');
      expect(pattern).toHaveAttribute('height', '48');
      expect(circle).toHaveAttribute('cx', '24');
      expect(circle).toHaveAttribute('cy', '24');
    });

    it('custom dotRadius=2.5 propagates to circle r="2.5"', () => {
      const { container } = render(<DotGrid dotRadius={2.5} />);
      const circle = container.querySelector('pattern circle');

      expect(circle).toHaveAttribute('r', '2.5');
    });

    it('custom color propagates to the fill attribute', () => {
      const { container } = render(<DotGrid color="#FF0000" />);
      const circle = container.querySelector('pattern circle');

      expect(circle).toHaveAttribute('fill', '#FF0000');
    });

    it('custom opacity=0.10 propagates to fill-opacity="0.1"', () => {
      const { container } = render(<DotGrid opacity={0.1} />);
      const circle = container.querySelector('pattern circle');

      expect(circle?.getAttribute('fill-opacity')).toBe('0.1');
    });
  });

  describe('rect fill', () => {
    it('renders a <rect width="100%" height="100%"> whose fill references the pattern id', () => {
      const { container } = render(<DotGrid />);
      const rect = container.querySelector('svg rect');
      const pattern = container.querySelector('pattern');

      expect(rect).toHaveAttribute('width', '100%');
      expect(rect).toHaveAttribute('height', '100%');
      const patternId = pattern?.getAttribute('id') ?? '';
      expect(rect?.getAttribute('fill')).toBe(`url(#${patternId})`);
    });

    it('uses a stable pattern id generated per DotGrid instance (no shared "dot-grid" literal)', () => {
      // Two separate mounts should produce two distinct pattern ids —
      // proves the `useId()` collision-safety contract.
      const first = render(<DotGrid />).container;
      const second = render(<DotGrid />).container;
      const firstPatternId = first.querySelector('pattern')?.getAttribute('id') ?? '';
      const secondPatternId = second.querySelector('pattern')?.getAttribute('id') ?? '';

      expect(firstPatternId).not.toBe('');
      expect(secondPatternId).not.toBe('');
      expect(firstPatternId).not.toBe(secondPatternId);
      // The pattern id is auto-generated by React's useId() and is
      // prefixed with a colon (e.g. ":r0:"). It must NOT be the
      // bare "dot-grid" string (which would collide when two
      // DotGrids mount on the same page).
      expect(firstPatternId).not.toBe('dot-grid');
    });
  });

  describe('className passthrough', () => {
    it('merges a consumer-provided className onto the wrapping <div>', () => {
      const { container } = render(<DotGrid className="opacity-50 mix-blend-screen" />);
      const root = container.firstElementChild;

      expect(root).toHaveClass('opacity-50');
      expect(root).toHaveClass('mix-blend-screen');
      // The base classes still apply.
      expect(root).toHaveClass('pointer-events-none');
    });
  });
});