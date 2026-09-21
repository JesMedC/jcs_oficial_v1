/*
 * jarvis-ui-redesign (T-08) — HudButton primitive tests.
 *
 * Pins the visual contract for the JARVIS outlined button (the
 * hero CTA + sidebar action button pattern from the reference).
 * Distinct from the existing `Button` primitive — `HudButton` is
 * the chrome-strong variant: outlined cyan border + glow halo on
 * hover/focus, used for the "+ NUEVO TRADE" CTA and the active
 * sidebar items' CTA buttons.
 *
 * Contract:
 *   - default: outlined (border cyan + transparent bg) + uppercase
 *     + display font + tracking-wide + cyan glow halo on hover
 *   - size sm | md | lg
 *   - variant primary | ghost | danger
 *   - onClick handler runs when clicked
 *   - disabled state prevents click
 *   - data-jarvis-hud-btn attribute for E2E selection
 *   - children render as label
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HudButton } from '../HudButton';

describe('HudButton', () => {
  describe('container + label (REQ-HB-001)', () => {
    it('renders children as the visible label', () => {
      render(<HudButton>+ Nuevo trade</HudButton>);
      expect(screen.getByText('+ Nuevo trade')).toBeInTheDocument();
    });

    it('data-jarvis-hud-btn attribute marks the root', () => {
      render(<HudButton>Click</HudButton>);
      expect(screen.getByRole('button')).toHaveAttribute('data-jarvis-hud-btn');
    });

    it('applies outlined JARVIS container classes (border cyan + transparent bg + uppercase + display font)', () => {
      render(<HudButton>+ Nuevo trade</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('border');
      expect(btn).toHaveClass('border-primary');
      expect(btn).toHaveClass('bg-transparent');
      expect(btn).toHaveClass('font-display');
      expect(btn).toHaveClass('uppercase');
      expect(btn).toHaveClass('tracking-wide');
    });
  });

  describe('size variants (REQ-HB-002)', () => {
    it('sm: smaller padding + text-xs', () => {
      render(<HudButton size="sm">sm</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('text-xs');
      expect(btn).toHaveClass('px-3');
      expect(btn).toHaveClass('py-1.5');
    });

    it('md (default): text-sm + px-4 py-2', () => {
      render(<HudButton>md</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('text-sm');
      expect(btn).toHaveClass('px-4');
      expect(btn).toHaveClass('py-2');
    });

    it('lg: text-base + px-6 py-3', () => {
      render(<HudButton size="lg">lg</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('text-base');
      expect(btn).toHaveClass('px-6');
      expect(btn).toHaveClass('py-3');
    });
  });

  describe('variants (REQ-HB-003)', () => {
    it('primary: border + text in cyan (text-primary)', () => {
      render(<HudButton variant="primary">x</HudButton>);
      expect(screen.getByRole('button')).toHaveClass('text-primary');
    });

    it('ghost: text-secondary + border-border (subtle)', () => {
      render(<HudButton variant="ghost">x</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('text-text-secondary');
    });

    it('danger: border + text-loss', () => {
      render(<HudButton variant="danger">x</HudButton>);
      const btn = screen.getByRole('button');
      expect(btn).toHaveClass('text-loss');
    });
  });

  describe('hover glow (REQ-HB-004)', () => {
    it('has hover:shadow-glow-cyan utility for the halo', () => {
      render(<HudButton>x</HudButton>);
      expect(screen.getByRole('button')).toHaveClass('hover:shadow-glow-cyan');
    });

    it('has hover:bg-primary/10 utility for the subtle fill on hover', () => {
      render(<HudButton>x</HudButton>);
      expect(screen.getByRole('button')).toHaveClass('hover:bg-primary/10');
    });
  });

  describe('behaviour (REQ-HB-005)', () => {
    it('runs onClick handler when clicked', async () => {
      const handler = vi.fn();
      render(<HudButton onClick={handler}>click</HudButton>);
      await userEvent.click(screen.getByRole('button'));
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('disabled: prevents onClick + applies disabled attribute + dimmed classes', async () => {
      const handler = vi.fn();
      render(
        <HudButton onClick={handler} disabled>
          click
        </HudButton>,
      );
      const btn = screen.getByRole('button');
      expect(btn).toBeDisabled();
      await userEvent.click(btn);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('type attribute (REQ-HB-006)', () => {
    it('default type is "button" (prevents accidental form submit)', () => {
      render(<HudButton>x</HudButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('explicit type="submit" forwarded', () => {
      render(<HudButton type="submit">submit</HudButton>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });
});
