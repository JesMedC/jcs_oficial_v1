/*
 * jarvis-ui-redesign (T-10) — PortalHeader primitive tests.
 *
 * Pins the visual contract for the persistent portal header that
 * sits above the routed content. The header carries the JARVIS
 * brand identity:
 *
 *   - left: brand mark "JARDE CAPITAL SUITE" + tagline "CORE INTERFACE"
 *   - right: live status pill (online indicator + session label)
 *
 * The header is the JARVIS HUD equivalent of the Iron Man status
 * bar at the top of the main panel.
 *
 * Contract:
 *   - renders the brand block with the uppercase display font
 *   - tagline sits below the brand as a smaller subtitle
 *   - online indicator renders as a filled cyan-green dot + label
 *   - header is sticky at the top of the main area
 *   - data-jarvis-portal-header attribute for E2E selection
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PortalHeader } from '../PortalHeader';

describe('PortalHeader', () => {
  describe('brand block (REQ-PH-001)', () => {
    it('renders the brand "JARDE CAPITAL SUITE" in display uppercase', () => {
      render(<PortalHeader />);
      const brand = screen.getByText('JARDE CAPITAL SUITE');
      expect(brand).toBeInTheDocument();
      expect(brand).toHaveClass('font-display');
      expect(brand).toHaveClass('uppercase');
      expect(brand).toHaveClass('tracking-[0.25em]');
    });

    it('renders the tagline "CORE INTERFACE" below the brand', () => {
      render(<PortalHeader />);
      const tagline = screen.getByText('CORE INTERFACE');
      expect(tagline).toBeInTheDocument();
      expect(tagline).toHaveClass('font-display');
      expect(tagline).toHaveClass('uppercase');
      expect(tagline).toHaveClass('text-text-muted');
    });
  });

  describe('online indicator (REQ-PH-002)', () => {
    it('renders the cyan-green online dot', () => {
      const { container } = render(<PortalHeader />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).not.toBeNull();
      expect(dot).toHaveClass('bg-[var(--jarvis-online)]');
    });

    it('renders the session label "SESIÓN ACTIVA" or similar status text', () => {
      render(<PortalHeader />);
      // The label is fixed-text for now (could be made dynamic later).
      expect(screen.getByText(/sesi[oó]n activa/i)).toBeInTheDocument();
    });
  });

  describe('structure (REQ-PH-003)', () => {
    it('data-jarvis-portal-header attribute marks the root', () => {
      render(<PortalHeader />);
      expect(screen.getByText('JARDE CAPITAL SUITE').closest('[data-jarvis-portal-header]')).not.toBeNull();
    });

    it('is sticky at the top of the main area (sticky + top-0)', () => {
      render(<PortalHeader />);
      const root = screen.getByText('JARDE CAPITAL SUITE').closest(
        '[data-jarvis-portal-header]',
      ) as HTMLElement | null;
      expect(root).not.toBeNull();
      expect(root).toHaveClass('sticky');
      expect(root).toHaveClass('top-0');
    });

    it('z-30 so the header sits above dashboard content but below modals', () => {
      render(<PortalHeader />);
      const root = screen.getByText('JARDE CAPITAL SUITE').closest(
        '[data-jarvis-portal-header]',
      );
      expect(root).toHaveClass('z-30');
    });
  });

  describe('chrome styling (REQ-PH-004)', () => {
    it('applies the glass surface + bottom border', () => {
      render(<PortalHeader />);
      const root = screen.getByText('JARDE CAPITAL SUITE').closest(
        '[data-jarvis-portal-header]',
      );
      expect(root).toHaveClass('bg-[var(--glass-surface)]');
      expect(root).toHaveClass('backdrop-blur-glass');
      expect(root).toHaveClass('border-b');
    });
  });
});
