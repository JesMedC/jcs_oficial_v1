/*
 * jarvis-ui-redesign (T-09) — HudDivider primitive tests.
 *
 * Pins the visual + a11y contract for the JARVIS HUD divider:
 *   - horizontal line with cyan rgba color (--jarvis-divider by
 *     default; --jarvis-divider-strong when strong)
 *   - optional label rendered as a centered HUD-style chip with a
 *     notch break in the line on either side
 *   - tone subtle | default | strong maps to the cyan rgba alpha
 *   - role=separator + aria-orientation=horizontal for a11y
 *   - data-jarvis-divider attribute for E2E selection
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { HudDivider } from '../HudDivider';

describe('HudDivider', () => {
  describe('a11y + structure (REQ-HD-001)', () => {
    it('renders role=separator with aria-orientation=horizontal', () => {
      const { container } = render(<HudDivider />);
      const divider = container.querySelector('[role="separator"]');
      expect(divider).not.toBeNull();
      expect(divider).toHaveAttribute('aria-orientation', 'horizontal');
    });

    it('data-jarvis-divider attribute marks the root', () => {
      const { container } = render(<HudDivider />);
      expect(
        container.querySelector('[data-jarvis-divider]'),
      ).toBeInTheDocument();
    });
  });

  describe('line rendering (REQ-HD-002)', () => {
    it('renders an inner horizontal line element', () => {
      const { container } = render(<HudDivider />);
      const line = container.querySelector('[data-jarvis-divider]');
      // The line is a child div (or hr) styled with height 1px + width full.
      expect(line).toHaveClass('h-px');
      expect(line).toHaveClass('w-full');
    });

    it('default tone uses --jarvis-divider (cyan rgba 0.18)', () => {
      const { container } = render(<HudDivider />);
      const line = container.querySelector('[data-jarvis-divider]');
      expect(line).toHaveClass('bg-[var(--jarvis-divider)]');
    });

    it('strong tone uses --jarvis-divider-strong (cyan rgba 0.32)', () => {
      const { container } = render(<HudDivider tone="strong" />);
      const line = container.querySelector('[data-jarvis-divider]');
      expect(line).toHaveClass('bg-[var(--jarvis-divider-strong)]');
    });

    it('subtle tone drops the bg to muted (chromeless)', () => {
      const { container } = render(<HudDivider tone="subtle" />);
      const line = container.querySelector('[data-jarvis-divider]');
      expect(line).toHaveClass('bg-border');
    });
  });

  describe('with label (REQ-HD-003)', () => {
    it('renders the label text centered in a HUD chip', () => {
      render(<HudDivider label="HOY · Sesión en curso" />);
      expect(
        screen.getByText('HOY · Sesión en curso'),
      ).toBeInTheDocument();
    });

    it('with label: the chip has display font + uppercase + tracking', () => {
      render(<HudDivider label="HOY · Sesión en curso" />);
      const chip = screen.getByText('HOY · Sesión en curso');
      expect(chip).toHaveClass('font-display');
      expect(chip).toHaveClass('uppercase');
      expect(chip).toHaveClass('tracking-wide');
    });

    it('with label: the line splits into TWO halves with a gap (notch)', () => {
      const { container } = render(<HudDivider label="MID" />);
      // Two halves: before and after the chip. We assert by counting
      // line elements with h-px + flex-1.
      const lines = container.querySelectorAll('div.h-px.flex-1');
      expect(lines.length).toBe(2);
    });
  });
});
