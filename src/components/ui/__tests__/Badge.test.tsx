/*
 * design-system-v1 — Badge primitive unit tests (Wave 4b, T4.5).
 *
 * Pins the visual + behavioural contract from
 * `specs/primitive-library/spec.md` and the orchestrator's per-primitive
 * brief:
 *   - 7 variants: profit | loss | warning | info | neutral | primary | danger
 *   - container: `inline-flex items-center gap-1 rounded-md px-2 py-0.5
 *     text-xs font-display uppercase tracking-wide`
 *   - profit/loss/danger MUST NOT apply glow utilities
 *     (cyber-jade-tokens numeric-context rule)
 *   - sizes: sm (text-[10px] px-1.5 py-0) | md (text-xs px-2 py-0.5)
 *   - icon slot renders when provided (sits before children)
 *   - data-variant attribute reflects the variant prop
 *
 * Class-name assertions mirror the project convention used by the
 * existing Button/Input/Select/Textarea primitive tests in
 * `src/components/ui/__tests__/` — Tailwind class composition is
 * the design contract.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Badge } from '../Badge';

describe('Badge', () => {
  describe('children', () => {
    it('renders the children inside the badge', () => {
      render(<Badge variant="profit">+1.4%</Badge>);
      expect(screen.getByText('+1.4%')).toBeInTheDocument();
    });
  });

  describe('base container', () => {
    it('applies the shared container classes (inline-flex, rounded-md, font-display, uppercase, tracking-wide)', () => {
      render(<Badge variant="info">Hola</Badge>);
      const badge = screen.getByText('Hola');

      expect(badge).toHaveClass('inline-flex');
      expect(badge).toHaveClass('items-center');
      expect(badge).toHaveClass('gap-1');
      expect(badge).toHaveClass('rounded-md');
      expect(badge).toHaveClass('font-display');
      expect(badge).toHaveClass('uppercase');
      expect(badge).toHaveClass('tracking-wide');
    });

    it('md (default) applies text-xs + px-2 + py-0.5', () => {
      render(<Badge variant="info">Md</Badge>);
      const badge = screen.getByText('Md');

      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });
  });

  describe('variants', () => {
    const VARIANT_CASES: ReadonlyArray<{
      readonly variant:
        | 'profit'
        | 'loss'
        | 'warning'
        | 'info'
        | 'neutral'
        | 'primary'
        | 'danger';
      readonly bgClass: string;
      readonly textClass: string;
      readonly borderClass: string;
    }> = [
      {
        variant: 'profit',
        bgClass: 'bg-profit/15',
        textClass: 'text-profit',
        borderClass: 'border-profit/30',
      },
      {
        variant: 'loss',
        bgClass: 'bg-loss/15',
        textClass: 'text-loss',
        borderClass: 'border-loss/30',
      },
      {
        variant: 'warning',
        bgClass: 'bg-warning/15',
        textClass: 'text-warning',
        borderClass: 'border-warning/30',
      },
      {
        variant: 'info',
        bgClass: 'bg-info/15',
        textClass: 'text-info',
        borderClass: 'border-info/30',
      },
      {
        variant: 'neutral',
        bgClass: 'bg-white/5',
        textClass: 'text-text-secondary',
        borderClass: 'border-white/10',
      },
      {
        variant: 'primary',
        bgClass: 'bg-primary/15',
        textClass: 'text-primary',
        borderClass: 'border-primary/30',
      },
      {
        variant: 'danger',
        bgClass: 'bg-loss/15',
        textClass: 'text-loss',
        borderClass: 'border-loss/30',
      },
    ];

    VARIANT_CASES.forEach(({ variant, bgClass, textClass, borderClass }) => {
      it(`variant=${variant} applies the correct bg / text / border classes`, () => {
        render(<Badge variant={variant}>x</Badge>);
        const badge = screen.getByText('x');

        expect(badge).toHaveClass(bgClass);
        expect(badge).toHaveClass(textClass);
        expect(badge).toHaveClass(borderClass);
        // base + border utility
        expect(badge).toHaveClass('border');
      });
    });

    it('profit/loss/danger MUST NOT apply any glow utility (numeric-context rule)', () => {
      // Render each numeric-context variant in isolation and assert
      // no glow classes are present. The orchestrator's spec pins this
      // as a hard rule from cyber-jade-tokens (no glow on P&L / loss /
      // danger surfaces).
      const numericVariants = ['profit', 'loss', 'danger'] as const;

      numericVariants.forEach((variant) => {
        const { unmount } = render(<Badge variant={variant}>x</Badge>);
        const badge = screen.getByText('x');

        expect(badge.className).not.toMatch(/shadow-glow-/);
        expect(badge.className).not.toMatch(/text-shadow-/);
        unmount();
      });
    });

    it('exposes data-variant={variant} for row-level selectors', () => {
      render(<Badge variant="primary">Tag</Badge>);
      const badge = screen.getByText('Tag');

      expect(badge).toHaveAttribute('data-variant', 'primary');
    });
  });

  describe('sizes', () => {
    it('size=sm applies text-[10px] + px-1.5 + py-0 (tighter padding)', () => {
      render(
        <Badge variant="info" size="sm">
          Sm
        </Badge>,
      );
      const badge = screen.getByText('Sm');

      expect(badge).toHaveClass('text-[10px]');
      expect(badge).toHaveClass('px-1.5');
      expect(badge).toHaveClass('py-0');
    });

    it('size=md (default) applies text-xs + px-2 + py-0.5', () => {
      render(
        <Badge variant="info" size="md">
          Md
        </Badge>,
      );
      const badge = screen.getByText('Md');

      expect(badge).toHaveClass('text-xs');
      expect(badge).toHaveClass('px-2');
      expect(badge).toHaveClass('py-0.5');
    });
  });

  describe('icon slot', () => {
    it('renders the icon before the children when provided', () => {
      render(
        <Badge
          variant="info"
          icon={<span data-testid="badge-icon">★</span>}
        >
          Con icono
        </Badge>,
      );

      const icon = screen.getByTestId('badge-icon');

      expect(icon).toBeInTheDocument();
      // The icon should appear inside the badge wrapper, before the
      // children text. Asserting via nextSibling keeps the check
      // robust regardless of the exact container element shape
      // (the icon's next sibling in the badge is the children node).
      expect(icon.nextSibling).not.toBeNull();
      expect(
        (icon.nextSibling?.textContent ?? '').includes('Con icono'),
      ).toBe(true);
      // And the icon is NOT after the children.
      expect(icon.previousSibling).toBeNull();
    });

    it('omits the icon slot when not provided', () => {
      render(<Badge variant="info">Sin icono</Badge>);

      expect(screen.queryByTestId('badge-icon')).toBeNull();
    });
  });
});
