/*
 * design-system-v1 — NeuralNetwork decor primitive unit tests
 * (Wave 6, T6.2).
 *
 * Pins the visual + behavioural contract from
 * `specs/decorative-system/spec.md` Requirement: NeuralNetwork
 * component + design.md §5.2:
 *   - container: `<div>` with `pointer-events-none -z-10`
 *     (decorative chrome sits behind content and never intercepts
 *     clicks)
 *   - inline `<svg>` sized to fill its parent
 *   - nodeCount=30 default → renders 30 `<circle>` elements
 *   - edgeDensity=0.3 default → edge count ≈
 *     nodeCount * (nodeCount-1) / 2 * edgeDensity (±20% to
 *     accommodate the seeded RNG's rounding)
 *   - edges rendered as `<line stroke="#00FF9D" stroke-opacity="0.03">`
 *   - deterministic layout: same seed produces the same node positions
 *     across re-renders; different seeds produce different positions
 *   - drift animation: when `animate=true` AND `prefers-reduced-motion`
 *     is NOT set, the wrapper gets the `jcs-neural-drift` animation
 *     class (defined inline in the component — not in
 *     `tailwind.config.ts`, which is out of scope for Wave 6)
 *   - `animate=false` → animation class is NOT applied
 *   - reduced-motion → animation class is NOT applied regardless of prop
 *   - custom props propagate (color → line stroke, opacity →
 *     stroke-opacity, nodeRadius → circle r)
 *
 * Implementation note: the component defines its keyframes in an
 * inline `<style>` tag (same pattern as ToastContainer). The keyframe
 * name is namespaced (`jcs-neural-drift`) to avoid collisions with
 * anything else in the bundle.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { NeuralNetwork } from '../NeuralNetwork';

afterEach(() => {
  // Reset matchMedia so tests not specifically checking reduced motion
  // see motion enabled by default.
  Object.defineProperty(globalThis, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

/**
 * Capture the rendered SVG markup so determinism + structural
 * assertions don't depend on fragile DOM-tree queries across every
 * individual `<circle>` / `<line>`.
 */
function svgMarkup(nodeCount = 30, edgeDensity = 0.3, seed = 42): string {
  const { container } = render(
    <NeuralNetwork nodeCount={nodeCount} edgeDensity={edgeDensity} seed={seed} />,
  );
  const svg = container.querySelector('svg');
  return svg?.innerHTML ?? '';
}

describe('NeuralNetwork', () => {
  describe('container', () => {
    it('wraps the SVG in a <div> with pointer-events-none and -z-10', () => {
      const { container } = render(<NeuralNetwork />);
      const root = container.firstElementChild;

      expect(root?.tagName).toBe('DIV');
      expect(root).toHaveClass('pointer-events-none');
      expect(root).toHaveClass('-z-10');
    });

    it('renders an inline <svg> sized to fill the wrapper', () => {
      const { container } = render(<NeuralNetwork />);
      const svg = container.querySelector('svg');

      expect(svg).not.toBeNull();
      expect(svg).toHaveAttribute('width', '100%');
      expect(svg).toHaveAttribute('height', '100%');
    });
  });

  describe('nodes', () => {
    it('default nodeCount=30 renders exactly 30 <circle> elements', () => {
      const { container } = render(<NeuralNetwork />);
      const circles = container.querySelectorAll('svg circle');

      expect(circles).toHaveLength(30);
    });

    it('custom nodeCount=12 renders exactly 12 <circle> elements', () => {
      const { container } = render(<NeuralNetwork nodeCount={12} />);
      const circles = container.querySelectorAll('svg circle');

      expect(circles).toHaveLength(12);
    });
  });

  describe('edges', () => {
    it('default nodeCount=30 + edgeDensity=0.3 renders ~135 edges (±20% tolerance)', () => {
      const { container } = render(<NeuralNetwork />);
      const lines = container.querySelectorAll('svg line');

      // nodeCount * (nodeCount-1) / 2 = 435 max; * 0.3 = 130.5; round = 131
      const expected = Math.round((30 * 29) / 2 * 0.3);
      const lowerBound = Math.floor(expected * 0.8);
      const upperBound = Math.ceil(expected * 1.2);

      expect(lines.length).toBeGreaterThanOrEqual(lowerBound);
      expect(lines.length).toBeLessThanOrEqual(upperBound);
    });

    it('custom nodeCount=20 + edgeDensity=0.5 renders ~95 edges (±20%)', () => {
      const { container } = render(
        <NeuralNetwork nodeCount={20} edgeDensity={0.5} seed={1} />,
      );
      const lines = container.querySelectorAll('svg line');

      const expected = Math.round((20 * 19) / 2 * 0.5);
      const lowerBound = Math.floor(expected * 0.8);
      const upperBound = Math.ceil(expected * 1.2);

      expect(lines.length).toBeGreaterThanOrEqual(lowerBound);
      expect(lines.length).toBeLessThanOrEqual(upperBound);
    });

    it('edges are rendered as <line stroke="#00FF9D" stroke-opacity="0.03"> by default', () => {
      const { container } = render(<NeuralNetwork />);
      const lines = container.querySelectorAll('svg line');

      // Spot-check the first line carries the jade stroke + default opacity.
      expect(lines[0]).toHaveAttribute('stroke', '#00FF9D');
      expect(lines[0]).toHaveAttribute('stroke-opacity', '0.03');
    });
  });

  describe('determinism', () => {
    it('same seed produces identical SVG markup across two renders', () => {
      const first = svgMarkup(30, 0.3, 42);
      const second = svgMarkup(30, 0.3, 42);

      expect(first).toBe(second);
    });

    it('different seeds produce DIFFERENT SVG markup (proves the seed drives the layout)', () => {
      const seed42 = svgMarkup(30, 0.3, 42);
      const seed99 = svgMarkup(30, 0.3, 99);

      expect(seed42).not.toBe(seed99);
    });
  });

  describe('custom props', () => {
    it('custom color propagates to line stroke attribute', () => {
      const { container } = render(<NeuralNetwork color="#FF00FF" />);
      const lines = container.querySelectorAll('svg line');

      expect(lines[0]).toHaveAttribute('stroke', '#FF00FF');
    });

    it('custom opacity=0.08 propagates to line stroke-opacity', () => {
      const { container } = render(<NeuralNetwork opacity={0.08} />);
      const lines = container.querySelectorAll('svg line');

      expect(lines[0]).toHaveAttribute('stroke-opacity', '0.08');
    });

    it('custom nodeRadius=4 propagates to circle r attribute', () => {
      const { container } = render(<NeuralNetwork nodeRadius={4} />);
      const circles = container.querySelectorAll('svg circle');

      expect(circles[0]).toHaveAttribute('r', '4');
    });
  });

  describe('animation', () => {
    function mockReducedMotion(matches: boolean): void {
      Object.defineProperty(globalThis, 'matchMedia', {
        configurable: true,
        value: (query: string) => ({
          matches,
          media: query,
          onchange: null,
          addListener: () => {},
          removeListener: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          dispatchEvent: () => false,
        }),
      });
    }

    it('animate=true (default) + motion enabled → wrapper gets the jcs-neural-drift animation class', () => {
      const { container } = render(<NeuralNetwork />);
      const root = container.firstElementChild;

      expect(root).toHaveClass('jcs-neural-drift');
    });

    it('animate=false → wrapper does NOT get the jcs-neural-drift class', () => {
      const { container } = render(<NeuralNetwork animate={false} />);
      const root = container.firstElementChild;

      expect(root).not.toHaveClass('jcs-neural-drift');
    });

    it('animate=true + reduced-motion → wrapper does NOT get the animation class', () => {
      mockReducedMotion(true);
      const { container } = render(<NeuralNetwork animate />);
      const root = container.firstElementChild;

      expect(root).not.toHaveClass('jcs-neural-drift');
    });

    it('animate=false + reduced-motion → wrapper does NOT get the animation class', () => {
      mockReducedMotion(true);
      const { container } = render(<NeuralNetwork animate={false} />);
      const root = container.firstElementChild;

      expect(root).not.toHaveClass('jcs-neural-drift');
    });
  });

  describe('inline <style> for the keyframes', () => {
    it('renders a <style> tag inside the wrapper containing the @keyframes jcs-neural-drift block', () => {
      const { container } = render(<NeuralNetwork />);
      const style = container.querySelector('style');

      expect(style).not.toBeNull();
      expect(style?.innerHTML ?? '').toContain('@keyframes jcs-neural-drift');
    });
  });

  describe('className passthrough', () => {
    it('merges a consumer-provided className onto the wrapper', () => {
      const { container } = render(<NeuralNetwork className="opacity-50 mix-blend-screen" />);
      const root = container.firstElementChild;

      expect(root).toHaveClass('opacity-50');
      expect(root).toHaveClass('mix-blend-screen');
      expect(root).toHaveClass('pointer-events-none');
    });
  });
});