/*
 * jarvis-ui-redesign (T-03) — HudPanel primitive tests.
 *
 * Pins the visual contract for the JARVIS HUD panel:
 *   - container: rounded-glass border + bg-glass-surface + backdrop-blur
 *     + border cyan rgba
 *   - variants:
 *     - default  : rounded-glass + glow-sm
 *     - elevated : default + shadow-glass-panel
 *     - frame    : elevated + corner brackets (top-left + bottom-right)
 *   - padding: none | sm | md | lg
 *     - sm  : p-3
 *     - md  : p-4
 *     - lg  : p-6
 *   - children render
 *   - className custom appended
 *   - data-testid forwarded
 *   - as prop (polymorphic, default 'div')
 *
 * Class-name assertions mirror the project convention used by
 * `Badge`/`Button`/`Input` tests.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HudPanel } from '../HudPanel';

describe('HudPanel', () => {
  describe('container + children', () => {
    it('renders children inside a div with the JARVIS HUD container classes', () => {
      render(<HudPanel>contenido</HudPanel>);
      const panel = screen.getByText('contenido');

      expect(panel.tagName).toBe('DIV');
      expect(panel).toHaveClass('rounded-glass');
      expect(panel).toHaveClass('backdrop-blur-glass');
      expect(panel).toHaveClass('bg-[var(--glass-surface)]');
      expect(panel).toHaveClass('border');
      expect(panel).toHaveClass('border-[var(--color-jade-border-line)]');
    });

    it('applies the JARVIS glow shadow by default', () => {
      render(<HudPanel>contenido</HudPanel>);
      const panel = screen.getByText('contenido');

      expect(panel).toHaveClass('shadow-[0_0_24px_rgba(0,212,216,0.18)]');
    });

    it('renders multiple children stacked', () => {
      render(
        <HudPanel>
          <span data-testid="first">uno</span>
          <span data-testid="second">dos</span>
        </HudPanel>,
      );

      expect(screen.getByTestId('first')).toBeInTheDocument();
      expect(screen.getByTestId('second')).toBeInTheDocument();
    });
  });

  describe('variants (REQ-HP-001)', () => {
    it('default variant: glow-sm + rounded-glass + padding md (p-4)', () => {
      render(<HudPanel variant="default">x</HudPanel>);
      const panel = screen.getByText('x');

      expect(panel).toHaveClass('rounded-glass');
      expect(panel).toHaveClass('p-4');
      expect(panel).toHaveClass('shadow-[0_0_24px_rgba(0,212,216,0.18)]');
      // No elevated shadow on default.
      expect(panel.className).not.toMatch(/shadow-glass-panel/);
    });

    it('elevated variant: glow-sm + shadow-glass-panel + padding md', () => {
      render(<HudPanel variant="elevated">x</HudPanel>);
      const panel = screen.getByText('x');

      expect(panel).toHaveClass('rounded-glass');
      expect(panel).toHaveClass('p-4');
      expect(panel).toHaveClass('shadow-glass-panel');
      expect(panel).toHaveClass('shadow-[0_0_24px_rgba(0,212,216,0.18)]');
    });

    it('frame variant: elevated + relative + corner brackets (data-corner attr or corner children)', () => {
      const { container } = render(<HudPanel variant="frame">x</HudPanel>);
      const panel = screen.getByText('x');

      expect(panel).toHaveClass('rounded-glass');
      expect(panel).toHaveClass('shadow-glass-panel');
      expect(panel).toHaveClass('relative');
      // Frame must render corner brackets. We assert by structural
      // shape (two corner elements with the corner class inside the panel).
      const corners = container.querySelectorAll('[data-jarvis-corner]');
      expect(corners.length).toBe(4); // 4 L-shape corners (TL, TR, BL, BR).
    });
  });

  describe('padding scale (REQ-HP-002)', () => {
    it('padding none: no padding utility', () => {
      render(<HudPanel padding="none">x</HudPanel>);
      const panel = screen.getByText('x');

      expect(panel.className).not.toMatch(/\bp-3\b/);
      expect(panel.className).not.toMatch(/\bp-4\b/);
      expect(panel.className).not.toMatch(/\bp-6\b/);
    });

    it('padding sm: p-3', () => {
      render(<HudPanel padding="sm">x</HudPanel>);
      expect(screen.getByText('x')).toHaveClass('p-3');
    });

    it('padding md (default): p-4', () => {
      render(<HudPanel padding="md">x</HudPanel>);
      expect(screen.getByText('x')).toHaveClass('p-4');
    });

    it('padding lg: p-6', () => {
      render(<HudPanel padding="lg">x</HudPanel>);
      expect(screen.getByText('x')).toHaveClass('p-6');
    });
  });

  describe('className + data-testid pass-through (REQ-HP-003)', () => {
    it('appends custom className after the base classes', () => {
      render(<HudPanel className="custom-class">x</HudPanel>);
      const panel = screen.getByText('x');

      expect(panel).toHaveClass('custom-class');
      expect(panel).toHaveClass('rounded-glass'); // base still applied
    });

    it('forwards data-testid to the panel root', () => {
      render(<HudPanel data-testid="my-panel">x</HudPanel>);
      const panel = screen.getByTestId('my-panel');

      expect(panel).toHaveClass('rounded-glass');
    });
  });

  describe('polymorphic as prop (REQ-HP-004)', () => {
    it('renders as the default div when no `as` is given', () => {
      render(<HudPanel>x</HudPanel>);
      expect(screen.getByText('x').tagName).toBe('DIV');
    });

    it('renders as section when as="section"', () => {
      render(<HudPanel as="section">x</HudPanel>);
      expect(screen.getByText('x').tagName).toBe('SECTION');
    });

    it('renders as article when as="article"', () => {
      render(<HudPanel as="article">x</HudPanel>);
      expect(screen.getByText('x').tagName).toBe('ARTICLE');
    });
  });

  describe('TRIANGULATE — edge cases (REQ-HP-005)', () => {
    it('forwards arbitrary HTML attrs (id, role, aria-label)', () => {
      render(
        <HudPanel id="kpi-1" role="region" aria-label="KPI panel">
          x
        </HudPanel>,
      );
      const panel = screen.getByRole('region', { name: 'KPI panel' });
      expect(panel).toHaveAttribute('id', 'kpi-1');
      expect(panel).toHaveClass('rounded-glass');
    });

    it('renders empty children without crashing', () => {
      const { container } = render(<HudPanel>{''}</HudPanel>);
      const panel = container.firstChild;
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('rounded-glass');
    });

    it('default and elevated variants render NO corner brackets', () => {
      const { container: c1 } = render(<HudPanel variant="default">x</HudPanel>);
      const { container: c2 } = render(<HudPanel variant="elevated">x</HudPanel>);
      expect(c1.querySelectorAll('[data-jarvis-corner]').length).toBe(0);
      expect(c2.querySelectorAll('[data-jarvis-corner]').length).toBe(0);
    });

    it('frame variant renders exactly 4 corner brackets (TL/TR/BL/BR)', () => {
      const { container } = render(<HudPanel variant="frame">x</HudPanel>);
      const corners = container.querySelectorAll('[data-jarvis-corner]');
      expect(corners.length).toBe(4);
      const positions = [...corners].map(
        (n) => n.getAttribute('data-jarvis-corner') ?? '',
      );
      expect(positions.sort()).toEqual([
        'bottom-left',
        'bottom-right',
        'top-left',
        'top-right',
      ]);
    });

    it('className ordering: base classes preserved + custom appended at end', () => {
      render(<HudPanel className="mt-4">x</HudPanel>);
      const panel = screen.getByText('x');
      // Base classes still present.
      expect(panel).toHaveClass('rounded-glass');
      expect(panel).toHaveClass('shadow-[0_0_24px_rgba(0,212,216,0.18)]');
      // Custom at the end so Tailwind merge precedence favors base.
      // (We don't pin the exact string concat — just that both are
      // present in the className attribute.)
      expect(panel).toHaveClass('mt-4');
    });
  });
});
