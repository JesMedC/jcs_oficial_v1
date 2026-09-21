/*
 * jarvis-ui-redesign (T-11) — OnlineIndicator primitive tests.
 *
 * Reusable dot + label composite for the JARVIS HUD online/status
 * indicator pattern. Mounted in:
 *   - PortalHeader (top-right): "SESIÓN ACTIVA"
 *   - SidebarFooter (collapsed): just the dot
 *
 * Contract:
 *   - renders a filled cyan-green dot (--jarvis-online) with a
 *     glow halo
 *   - subtle pulse animation (animate-status-dot-pulse, already
 *     defined in tailwind.config.ts)
 *   - optional label rendered next to the dot
 *   - size sm | md | lg controls dot diameter
 *   - aria-label defaults to "En línea" (Spanish context)
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { OnlineIndicator } from '../OnlineIndicator';

describe('OnlineIndicator', () => {
  describe('dot rendering (REQ-OI-001)', () => {
    it('renders a dot with the cyan-green background from --jarvis-online', () => {
      const { container } = render(<OnlineIndicator />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).not.toBeNull();
      expect(dot).toHaveClass('bg-[var(--jarvis-online)]');
    });

    it('dot has a glow halo (shadow with var(--jarvis-online))', () => {
      const { container } = render(<OnlineIndicator />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).not.toBeNull();
      expect(dot!.className).toMatch(/shadow-\[0_0_10px_var\(--jarvis-online\)\]/);
    });

    it('dot pulses (animate-status-dot-pulse utility)', () => {
      const { container } = render(<OnlineIndicator />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).toHaveClass('animate-status-dot-pulse');
    });

    it('dot is rounded-full + inline-block', () => {
      const { container } = render(<OnlineIndicator />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).toHaveClass('rounded-full');
      expect(dot).toHaveClass('inline-block');
    });
  });

  describe('sizes (REQ-OI-002)', () => {
    it('sm: w-1.5 h-1.5 (6px)', () => {
      const { container } = render(<OnlineIndicator size="sm" />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).toHaveClass('w-1.5');
      expect(dot).toHaveClass('h-1.5');
    });

    it('md (default): w-2 h-2 (8px)', () => {
      const { container } = render(<OnlineIndicator />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).toHaveClass('w-2');
      expect(dot).toHaveClass('h-2');
    });

    it('lg: w-3 h-3 (12px)', () => {
      const { container } = render(<OnlineIndicator size="lg" />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).toHaveClass('w-3');
      expect(dot).toHaveClass('h-3');
    });
  });

  describe('label (REQ-OI-003)', () => {
    it('renders no label by default', () => {
      render(<OnlineIndicator />);
      // No text rendered.
      expect(screen.queryByText(/.+/)).toBeNull();
    });

    it('renders the optional label next to the dot', () => {
      render(<OnlineIndicator label="SESIÓN ACTIVA" />);
      expect(screen.getByText('SESIÓN ACTIVA')).toBeInTheDocument();
    });

    it('label uses display font + uppercase + tracking-wide', () => {
      render(<OnlineIndicator label="SESIÓN ACTIVA" />);
      const label = screen.getByText('SESIÓN ACTIVA');
      expect(label).toHaveClass('font-display');
      expect(label).toHaveClass('uppercase');
      expect(label).toHaveClass('tracking-wide');
    });

    it('label is hidden from assistive tech (dot is the aria-label source)', () => {
      render(<OnlineIndicator label="SESIÓN ACTIVA" />);
      const label = screen.getByText('SESIÓN ACTIVA');
      expect(label).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('a11y (REQ-OI-004)', () => {
    it('root wrapper has role="status" + aria-label="En línea"', () => {
      const { container } = render(<OnlineIndicator />);
      const root = container.querySelector('[role="status"]');
      expect(root).not.toBeNull();
      expect(root).toHaveAttribute('aria-label', 'En línea');
    });

    it('custom ariaLabel overrides the default', () => {
      const { container } = render(<OnlineIndicator ariaLabel="Conectado al broker" />);
      const root = container.querySelector('[role="status"]');
      expect(root).toHaveAttribute('aria-label', 'Conectado al broker');
    });
  });
});
