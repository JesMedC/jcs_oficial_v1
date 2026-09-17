/*
 * jarvis-ui-redesign (T-10 / T-11 refactor, post-deploy polish) —
 * PortalHeader tests, updated for the new centered brand layout.
 *
 * The header now shows a single centered brand line "JARDE CAPITAL
 * SUITE - CORE INTERFACE" with a small marquee sub-header and the
 * online status pill anchored to the left edge. Side status text
 * ("SESIÓN ACTIVA") is a separate span next to the indicator.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PortalHeader } from '../PortalHeader';

describe('PortalHeader', () => {
  describe('brand block (REQ-PH-001)', () => {
    it('renders the brand "JARDE CAPITAL SUITE - CORE INTERFACE" in display uppercase', () => {
      const { container } = render(<PortalHeader />);
      const brand = container.querySelector('h1');
      expect(brand).not.toBeNull();
      expect(brand?.textContent).toMatch(/JARDE CAPITAL SUITE.*CORE INTERFACE/);
      expect(brand).toHaveClass('font-display');
      expect(brand).toHaveClass('uppercase');
      expect(brand).toHaveClass('tracking-[0.25em]');
    });

    it('brand contains the literal dash separator + "CORE INTERFACE" on the same line', () => {
      const { container } = render(<PortalHeader />);
      const brand = container.querySelector('h1');
      expect(brand?.textContent).toMatch(/JARDE CAPITAL SUITE.*CORE INTERFACE/);
    });

    it('renders the marquee sub-header with the brand repeated', () => {
      render(<PortalHeader />);
      // Marquee text appears twice (we duplicate the string so the
      // -50% translateX loop is seamless). The aria-hidden attribute
      // hides it from the accessibility tree.
      const marquee = document.querySelector('[aria-hidden="true"] .animate-jarvis-marquee');
      expect(marquee).not.toBeNull();
      const text = marquee?.textContent ?? '';
      expect(text).toMatch(/DATA HIERARCHY/);
    });
  });

  describe('status pill (REQ-PH-002)', () => {
    it('renders the cyan-green online dot with the JARVIS OnlineIndicator primitive', () => {
      const { container } = render(<PortalHeader />);
      const dot = container.querySelector('[data-jarvis-online-dot]');
      expect(dot).not.toBeNull();
      expect(dot).toHaveClass('bg-[var(--jarvis-online)]');
    });

    it('renders the session label "SESIÓN ACTIVA" alongside the indicator', () => {
      render(<PortalHeader />);
      expect(screen.getByText(/sesi[oó]n activa/i)).toBeInTheDocument();
    });
  });

  describe('structure (REQ-PH-003)', () => {
    it('data-jarvis-portal-header attribute marks the root', () => {
      const { container } = render(<PortalHeader />);
      expect(container.querySelector('[data-jarvis-portal-header]')).not.toBeNull();
    });

    it('is sticky at the top of the main area (sticky + top-0)', () => {
      const { container } = render(<PortalHeader />);
      const root = container.querySelector('[data-jarvis-portal-header]');
      expect(root).toHaveClass('sticky');
      expect(root).toHaveClass('top-0');
    });

    it('z-30 so the header sits above dashboard content but below modals', () => {
      const { container } = render(<PortalHeader />);
      const root = container.querySelector('[data-jarvis-portal-header]');
      expect(root).toHaveClass('z-30');
    });
  });

  describe('chrome styling (REQ-PH-004)', () => {
    it('applies the glass surface + bottom border', () => {
      const { container } = render(<PortalHeader />);
      const root = container.querySelector('[data-jarvis-portal-header]');
      expect(root).toHaveClass('bg-[var(--glass-surface)]');
      expect(root).toHaveClass('backdrop-blur-glass');
      expect(root).toHaveClass('border-b');
    });
  });
});
