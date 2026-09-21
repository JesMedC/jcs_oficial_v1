/*
 * jarvis-ui-redesign (T-04) — HudRing primitive tests.
 *
 * Pins the visual + behavioural contract for the JARVIS HUD ring:
 *   - Double ring (outer + inner) — the inner ring sits concentric
 *     inside the outer at a smaller radius.
 *   - value 0-100 prop drives both rings' arc length.
 *   - size sm | md | lg controls outer-ring radius.
 *   - tone primary | profit | loss | warning determines the
 *     filled-arc color via CSS vars.
 *   - children render centered inside the rings (typically a label).
 *   - data-jarvis-ring attribute + role=progressbar for accessibility.
 *
 * SVG stroke-dasharray + stroke-dashoffset pin the math; tests
 * verify the offset reflects the value at 0/50/100 edges.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HudRing } from '../HudRing';

describe('HudRing', () => {
  describe('container + a11y (REQ-HR-001)', () => {
    it('renders a role=progressbar with aria-valuenow / min / max', () => {
      render(<HudRing value={75}>75%</HudRing>);
      const ring = screen.getByRole('progressbar');

      expect(ring).toHaveAttribute('aria-valuenow', '75');
      expect(ring).toHaveAttribute('aria-valuemin', '0');
      expect(ring).toHaveAttribute('aria-valuemax', '100');
    });

    it('data-jarvis-ring attribute marks the root for E2E selection', () => {
      render(<HudRing value={50}>x</HudRing>);
      expect(screen.getByRole('progressbar')).toHaveAttribute(
        'data-jarvis-ring',
      );
    });

    it('renders children inside the inner ring center', () => {
      render(<HudRing value={50}>+12 trades</HudRing>);
      expect(screen.getByText('+12 trades')).toBeInTheDocument();
    });
  });

  describe('double-ring structure (REQ-HR-002)', () => {
    it('renders exactly 2 SVG circles (outer track + outer value) when showInner is false', () => {
      const { container } = render(
        <HudRing value={50} showInner={false}>
          x
        </HudRing>,
      );
      const rings = container.querySelectorAll('svg circle');
      expect(rings.length).toBe(2);
    });

    it('outer-value circle is positioned AFTER outer-track in DOM order (drawn on top)', () => {
      const { container } = render(
        <HudRing value={50} showInner={false}>
          x
        </HudRing>,
      );
      const circles = container.querySelectorAll('svg circle');
      // circles[0] = track, circles[1] = value (drawn on top)
      expect(circles[0]).toHaveAttribute('data-ring-role', 'outer-track');
      expect(circles[1]).toHaveAttribute('data-ring-role', 'outer-value');
    });

    it('inner track + inner value exist as separate layered structure (when showInner prop is true)', () => {
      const { container } = render(
        <HudRing value={50} showInner>
          x
        </HudRing>,
      );
      const allCircles = container.querySelectorAll('svg circle');
      // 4 circles: outer-track, outer-value, inner-track, inner-value
      expect(allCircles.length).toBe(4);
    });
  });

  describe('arc math (REQ-HR-003)', () => {
    it('value=0 produces a fully-empty outer arc (dashoffset = circumference)', () => {
      const { container } = render(<HudRing value={0}>x</HudRing>);
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      // stroke-dasharray = C, stroke-dashoffset = C means the entire
      // arc is hidden (empty progress).
      const dasharray = outerValue?.getAttribute('stroke-dasharray') ?? '';
      const dashoffset = outerValue?.getAttribute('stroke-dashoffset') ?? '';
      expect(dasharray).toBeTruthy();
      expect(dasharray).toBe(dashoffset);
    });

    it('value=100 produces a fully-filled outer arc (dashoffset = 0)', () => {
      const { container } = render(<HudRing value={100}>x</HudRing>);
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      const dashoffset = outerValue?.getAttribute('stroke-dashoffset');
      expect(dashoffset).toBe('0');
    });

    it('value=50 produces a halfway-filled outer arc', () => {
      const { container } = render(<HudRing value={50}>x</HudRing>);
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      const dasharray = Number(outerValue?.getAttribute('stroke-dasharray') ?? '0');
      const dashoffset = Number(
        outerValue?.getAttribute('stroke-dashoffset') ?? '0',
      );
      // Half-arc: dashoffset should be half of dasharray (rounded).
      expect(dasharray).toBeGreaterThan(0);
      expect(Math.abs(dashoffset - dasharray / 2)).toBeLessThan(2);
    });
  });

  describe('sizes (REQ-HR-004)', () => {
    it('sm size: smaller radius than md', () => {
      const { container: c1 } = render(
        <HudRing value={50} size="sm">
          x
        </HudRing>,
      );
      const { container: c2 } = render(
        <HudRing value={50} size="md">
          x
        </HudRing>,
      );
      const r1 = Number(
        c1.querySelector('svg circle')?.getAttribute('r') ?? '0',
      );
      const r2 = Number(
        c2.querySelector('svg circle')?.getAttribute('r') ?? '0',
      );
      expect(r1).toBeLessThan(r2);
    });

    it('lg size: larger radius than md', () => {
      const { container: c1 } = render(
        <HudRing value={50} size="md">
          x
        </HudRing>,
      );
      const { container: c2 } = render(
        <HudRing value={50} size="lg">
          x
        </HudRing>,
      );
      const r1 = Number(
        c1.querySelector('svg circle')?.getAttribute('r') ?? '0',
      );
      const r2 = Number(
        c2.querySelector('svg circle')?.getAttribute('r') ?? '0',
      );
      expect(r2).toBeGreaterThan(r1);
    });
  });

  describe('tone (REQ-HR-005)', () => {
    it('primary tone: outer value uses --jarvis-progress-value', () => {
      const { container } = render(
        <HudRing value={50} tone="primary">
          x
        </HudRing>,
      );
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      expect(outerValue).toHaveAttribute('stroke', 'var(--jarvis-progress-value)');
    });

    it('profit tone: outer value uses --color-jade-profit (cyan-green)', () => {
      const { container } = render(
        <HudRing value={50} tone="profit">
          x
        </HudRing>,
      );
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      expect(outerValue).toHaveAttribute('stroke', 'var(--color-jade-profit)');
    });

    it('loss tone: outer value uses --color-jade-loss', () => {
      const { container } = render(
        <HudRing value={50} tone="loss">
          x
        </HudRing>,
      );
      const outerValue = container.querySelector(
        'svg circle[data-ring-role="outer-value"]',
      );
      expect(outerValue).toHaveAttribute('stroke', 'var(--color-jade-loss)');
    });
  });

  describe('value clamping (REQ-HR-006)', () => {
    it('clamps values above 100 to 100', () => {
      render(<HudRing value={150}>x</HudRing>);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    });

    it('clamps values below 0 to 0', () => {
      render(<HudRing value={-25}>x</HudRing>);
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });
  });
});
