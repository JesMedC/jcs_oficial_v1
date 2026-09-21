/*
 * design-system-v1 — Skeleton primitive unit tests (Wave 4c, T4.8).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` (Requirement: Skeleton) +
 * design.md §4.10 + the orchestrator's per-primitive brief:
 *   - variants: 'text' | 'circle' | 'rect' | 'card' (default 'text')
 *   - base: `bg-white/5 rounded animate-pulse`
 *   - text: `h-4 w-full`; when `count > 1`, render N lines wrapped
 *     in `space-y-2`; last line in the stack has `w-3/4` to mimic
 *     text wrapping
 *   - circle: `rounded-full`; defaults to `w-8 h-8` (32x32) when no
 *     width/height provided
 *   - rect: `rounded-lg`; defaults to `w-full h-24`
 *   - card: `rounded-lg`; defaults to `w-full h-40` with
 *     `bg-white/[0.06]`
 *   - `prefers-reduced-motion`: `animate-pulse` is omitted when the
 *     user prefers reduced motion (mocked via matchMedia)
 *   - accessibility: `aria-hidden="true"` on every rendered line —
 *     the consumer provides the loading text label
 *
 * Why no `clsx`: same Wave 1 read-only rule. Class composition is
 * a `[...].filter(Boolean).join(' ')` chain.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { Skeleton } from '../Skeleton';

afterEach(() => {
  // Reset matchMedia to its test default after each reduced-motion
  // assertion so the other tests see motion enabled.
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
 * Helper that returns the first skeleton element for the rendered
 * DOM tree. The Skeleton primitive renders a single <div> for
 * non-text variants and a <div> wrapper containing N lines for
 * `text` + `count > 1`. This helper walks the tree to find the
 * innermost leaf <div> for assertion targets.
 */
function getRoot(container: HTMLElement): HTMLElement {
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error('Skeleton did not render an HTMLElement root');
  }
  return root;
}

describe('Skeleton', () => {
  describe('base classes', () => {
    it('applies bg-white/5 rounded animate-pulse to every variant', () => {
      const { container } = render(<Skeleton variant="rect" />);
      const root = getRoot(container);

      expect(root).toHaveClass('bg-white/5');
      expect(root).toHaveClass('rounded');
      expect(root).toHaveClass('animate-pulse');
    });
  });

  describe('text variant', () => {
    it('default (count=1) renders a single div with h-4 w-full', () => {
      const { container } = render(<Skeleton variant="text" />);
      const root = getRoot(container);

      // Single line — wrapper is the line itself.
      expect(root.tagName).toBe('DIV');
      expect(root).toHaveClass('h-4');
      expect(root).toHaveClass('w-full');
    });

    it('count=3 renders 3 divs wrapped in a space-y-2 container', () => {
      const { container } = render(<Skeleton variant="text" count={3} />);
      const wrapper = getRoot(container);

      // Wrapper has the space-y-2 class to space the lines.
      expect(wrapper).toHaveClass('space-y-2');

      // Three child divs.
      const lines = wrapper.querySelectorAll(':scope > div');
      expect(lines.length).toBe(3);

      // Each line has h-4.
      lines.forEach((line) => {
        expect(line).toHaveClass('h-4');
      });
    });

    it('text with count=3: first two lines are w-full, last line is w-3/4', () => {
      const { container } = render(<Skeleton variant="text" count={3} />);
      const wrapper = getRoot(container);
      const lines = Array.from(wrapper.querySelectorAll(':scope > div'));

      const line1 = lines[0];
      const line2 = lines[1];
      const line3 = lines[2];
      if (!line1 || !line2 || !line3) {
        throw new Error('Expected 3 text lines');
      }

      expect(line1).toHaveClass('w-full');
      expect(line2).toHaveClass('w-full');
      // Last line has the shorter width to mimic text wrapping.
      expect(line3).toHaveClass('w-3/4');
      expect(line3).not.toHaveClass('w-full');
    });
  });

  describe('circle variant', () => {
    it('default is w-8 h-8 (32x32) with rounded-full', () => {
      const { container } = render(<Skeleton variant="circle" />);
      const root = getRoot(container);

      expect(root).toHaveClass('rounded-full');
      expect(root).toHaveClass('w-8');
      expect(root).toHaveClass('h-8');
    });
  });

  describe('rect variant', () => {
    it('default is w-full h-24 with rounded-lg', () => {
      const { container } = render(<Skeleton variant="rect" />);
      const root = getRoot(container);

      expect(root).toHaveClass('rounded-lg');
      expect(root).toHaveClass('w-full');
      expect(root).toHaveClass('h-24');
    });
  });

  describe('card variant', () => {
    it('default is w-full h-40 with rounded-lg and bg-white/[0.06]', () => {
      const { container } = render(<Skeleton variant="card" />);
      const root = getRoot(container);

      expect(root).toHaveClass('rounded-lg');
      expect(root).toHaveClass('w-full');
      expect(root).toHaveClass('h-40');
      // Card variant uses a slightly heavier surface tint (bg-white/[0.06])
      // than the base bg-white/5 to set it apart from inline text
      // skeletons.
      expect(root).toHaveClass('bg-white/[0.06]');
    });
  });

  describe('custom dimensions', () => {
    it('applies custom width as inline style on the root element', () => {
      const { container } = render(
        <Skeleton variant="rect" width="120px" />,
      );
      const root = getRoot(container);

      expect(root.style.width).toBe('120px');
    });

    it('applies custom height as inline style on the root element', () => {
      const { container } = render(
        <Skeleton variant="rect" height="48px" />,
      );
      const root = getRoot(container);

      expect(root.style.height).toBe('48px');
    });

    it('applies both width and height together', () => {
      const { container } = render(
        <Skeleton variant="circle" width="64px" height="64px" />,
      );
      const root = getRoot(container);

      expect(root.style.width).toBe('64px');
      expect(root.style.height).toBe('64px');
    });
  });

  describe('className passthrough', () => {
    it('appends custom className to the root element', () => {
      const { container } = render(
        <Skeleton variant="rect" className="my-4 mx-auto" />,
      );
      const root = getRoot(container);

      expect(root).toHaveClass('my-4');
      expect(root).toHaveClass('mx-auto');
      // Base classes still present.
      expect(root).toHaveClass('bg-white/5');
      expect(root).toHaveClass('animate-pulse');
    });
  });

  describe('reduced motion', () => {
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

    it('does NOT apply animate-pulse when prefers-reduced-motion is reduce', () => {
      mockReducedMotion(true);
      const { container } = render(<Skeleton variant="rect" />);
      const root = getRoot(container);

      expect(root).not.toHaveClass('animate-pulse');
      // Static fallback tint is applied so the skeleton still reads
      // as a placeholder even without the pulse animation.
      expect(root).toHaveClass('bg-white/10');
    });

    it('applies animate-pulse when prefers-reduced-motion is NOT reduce (default)', () => {
      mockReducedMotion(false);
      const { container } = render(<Skeleton variant="rect" />);
      const root = getRoot(container);

      expect(root).toHaveClass('animate-pulse');
    });

    it('reduced-motion suppression applies to multi-line text stacks too', () => {
      mockReducedMotion(true);
      const { container } = render(<Skeleton variant="text" count={3} />);
      const wrapper = getRoot(container);
      const lines = Array.from(wrapper.querySelectorAll(':scope > div'));

      lines.forEach((line) => {
        expect(line).not.toHaveClass('animate-pulse');
      });
    });
  });

  describe('accessibility', () => {
    it('marks the root element aria-hidden="true" (decorative)', () => {
      const { container } = render(<Skeleton variant="rect" />);
      const root = getRoot(container);

      expect(root).toHaveAttribute('aria-hidden', 'true');
    });

    it('marks every line in a text stack aria-hidden="true"', () => {
      const { container } = render(<Skeleton variant="text" count={3} />);
      const wrapper = getRoot(container);
      const lines = Array.from(wrapper.querySelectorAll(':scope > div'));

      lines.forEach((line) => {
        expect(line).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });
});
