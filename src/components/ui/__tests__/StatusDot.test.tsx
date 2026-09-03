/*
 * design-system-v1 — StatusDot primitive unit tests (Wave 4b, T4.6).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` + `specs/decorative-system/spec.md`
 * + design.md §4.6:
 *   - container: `<span>` with `inline-block rounded-full`
 *   - sizes: sm (w-1.5 h-1.5), md (w-2 h-2), lg (w-3 h-3)
 *   - variants: jade (bg-primary), cyan (bg-info), amber (bg-warning),
 *     red (bg-loss)
 *   - pulse applies the `animate-status-dot-pulse` class when true
 *   - pulse defaults: jade=true, others=false (variant-driven default)
 *   - respects `prefers-reduced-motion`: when user prefers reduced
 *     motion, the pulse animation class is NOT applied (we mock
 *     matchMedia to assert the branch)
 *   - accessibility: `role="status"` when label is provided,
 *     `aria-label` always (default "Status" when no label)
 *   - `title` attribute mirrors `label` for hover tooltip
 */
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StatusDot } from '../StatusDot';

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

describe('StatusDot', () => {
  describe('variants', () => {
    it('variant=jade (default) applies bg-primary', () => {
      render(<StatusDot />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('bg-primary');
    });

    it('variant=cyan applies bg-info', () => {
      render(<StatusDot variant="cyan" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('bg-info');
    });

    it('variant=amber applies bg-warning', () => {
      render(<StatusDot variant="amber" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('bg-warning');
    });

    it('variant=red applies bg-loss', () => {
      render(<StatusDot variant="red" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('bg-loss');
    });
  });

  describe('sizes', () => {
    it('size=sm applies w-1.5 h-1.5 (6x6)', () => {
      render(<StatusDot variant="cyan" size="sm" pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('w-1.5');
      expect(dot).toHaveClass('h-1.5');
    });

    it('size=md (default) applies w-2 h-2 (8x8)', () => {
      render(<StatusDot variant="cyan" pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('w-2');
      expect(dot).toHaveClass('h-2');
    });

    it('size=lg applies w-3 h-3 (12x12)', () => {
      render(<StatusDot variant="cyan" size="lg" pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('w-3');
      expect(dot).toHaveClass('h-3');
    });
  });

  describe('container', () => {
    it('always applies inline-block rounded-full', () => {
      render(<StatusDot pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('inline-block');
      expect(dot).toHaveClass('rounded-full');
    });
  });

  describe('pulse', () => {
    it('pulse=true applies the animate-status-dot-pulse class', () => {
      render(<StatusDot variant="cyan" pulse />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('animate-status-dot-pulse');
    });

    it('pulse=false does NOT apply the animate-status-dot-pulse class', () => {
      render(<StatusDot variant="cyan" pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('variant=jade defaults pulse to true (positive status signal)', () => {
      // No explicit pulse prop — jade defaults to animated.
      render(<StatusDot variant="jade" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('animate-status-dot-pulse');
    });

    it('variant=cyan defaults pulse to false (neutral color, no motion)', () => {
      render(<StatusDot variant="cyan" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('variant=red defaults pulse to false', () => {
      render(<StatusDot variant="red" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('variant=amber defaults pulse to false', () => {
      render(<StatusDot variant="amber" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('explicit pulse=false overrides the jade default (true)', () => {
      render(<StatusDot variant="jade" pulse={false} />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('explicit pulse=true overrides the cyan default (false)', () => {
      render(<StatusDot variant="cyan" pulse />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).toHaveClass('animate-status-dot-pulse');
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

    it('does NOT apply the pulse animation class when prefers-reduced-motion is reduce (jade default)', () => {
      mockReducedMotion(true);
      render(<StatusDot variant="jade" />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });

    it('does NOT apply the pulse animation class even when pulse=true and reduced-motion is set', () => {
      mockReducedMotion(true);
      render(<StatusDot variant="jade" pulse />);
      const dot = screen.getByRole('status', { name: 'Status' });

      expect(dot).not.toHaveClass('animate-status-dot-pulse');
    });
  });

  describe('accessibility', () => {
    it('default aria-label is "Status" when no label is provided', () => {
      render(<StatusDot pulse={false} />);
      // Default label → "Status"; role is "status".
      expect(screen.getByRole('status', { name: 'Status' })).toBeInTheDocument();
    });

    it('label prop sets the aria-label for screen readers', () => {
      render(<StatusDot variant="jade" label="Conectado" />);
      const dot = screen.getByRole('status', { name: 'Conectado' });

      expect(dot).toHaveAttribute('aria-label', 'Conectado');
    });

    it('label prop is also rendered as the title attribute (hover tooltip)', () => {
      render(<StatusDot variant="jade" label="Conectado" />);
      const dot = screen.getByRole('status', { name: 'Conectado' });

      expect(dot).toHaveAttribute('title', 'Conectado');
    });

    it('renders with role="status" so the screen reader announces state changes', () => {
      render(<StatusDot variant="cyan" label="Sincronizando" />);
      const dot = screen.getByRole('status', { name: 'Sincronizando' });

      expect(dot).toHaveAttribute('role', 'status');
    });

    it('uses a <span> as the root element so screen readers land on the aria-label', () => {
      const { container } = render(<StatusDot label="Online" />);
      const root = container.firstElementChild;

      expect(root?.tagName).toBe('SPAN');
    });
  });

  describe('passthrough props', () => {
    it('accepts additional className and merges it into the root', () => {
      render(<StatusDot label="X" className="ml-2" />);
      const dot = screen.getByRole('status', { name: 'X' });

      expect(dot).toHaveClass('ml-2');
      // Still has the base classes.
      expect(dot).toHaveClass('inline-block');
    });

    it('forwards a data-testid to the root span (consumer-driven selector)', () => {
      render(<StatusDot label="Online" data-testid="status-pill" />);
      expect(screen.getByTestId('status-pill')).toBeInTheDocument();
    });
  });

});
