/*
 * Scanlines — global JARVIS HUD overlay tests.
 *
 * Pins the contract from the dashboard-jarvis-fidelity-v2 spec:
 *   - fixed inset-0 wrapper
 *   - pointer-events-none (decorative layer must never block clicks)
 *   - z-index >= 50 (sits above chrome, below alerts layer)
 *   - background-image is a `repeating-linear-gradient`
 *   - default opacity 0.02 (subtle HUD scanline)
 *   - default color is the cyan `rgba(0, 229, 255, 0.02)` family
 *   - default spacing 4px (2 line + 2 gap)
 *   - aria-hidden so screen readers skip the overlay
 *   - exposes a default data-testid (`scanlines-overlay`) so the
 *     dashboard can pin-test that the overlay mounted
 *   - honours custom props (spacing / color / opacity / zIndex)
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Scanlines } from '../Scanlines';

describe('Scanlines', () => {
  describe('mount', () => {
    it('renders a fixed-position wrapper (position: fixed)', () => {
      render(<Scanlines />);
      const overlay = screen.getByTestId('scanlines-overlay');
      const style = overlay.getAttribute('style') ?? '';
      expect(style).toContain('position: fixed');
    });

    it('renders with inset: 0 (top/right/bottom/left: 0)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      // `inset: 0` is the canonical shorthand React serializes.
      expect(style).toMatch(/inset:\s*0/);
    });

    it('renders with pointer-events: none (decorative chrome)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toContain('pointer-events: none');
    });

    it('renders with z-index >= 50 (above dashboard chrome)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      const zMatch = style.match(/z-index:\s*(\d+)/);
      expect(zMatch).not.toBeNull();
      const z = Number(zMatch?.[1] ?? '0');
      expect(z).toBeGreaterThanOrEqual(50);
    });

    it('marks itself aria-hidden (skip for screen readers)', () => {
      render(<Scanlines />);
      expect(screen.getByTestId('scanlines-overlay')).toHaveAttribute(
        'aria-hidden',
        'true',
      );
    });

    it('uses the default data-testid `scanlines-overlay`', () => {
      render(<Scanlines />);
      expect(screen.getByTestId('scanlines-overlay')).toBeInTheDocument();
    });

    it('honours a custom data-testid override', () => {
      render(<Scanlines data-testid="my-scanlines" />);
      expect(screen.getByTestId('my-scanlines')).toBeInTheDocument();
    });
  });

  describe('background — repeating-linear-gradient', () => {
    it('paints a repeating-linear-gradient background-image', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toMatch(/background-image:\s*repeating-linear-gradient\(/);
    });

    it('uses the default 4px cycle (2px line + 2px gap)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      // Look for `transparent 2px, <color 2px, <color 4px` cycle.
      expect(style).toMatch(/transparent 2px/);
      expect(style).toMatch(/2px, rgba\(0, 229, 255, 0\.02\) 2px/);
      expect(style).toMatch(/rgba\(0, 229, 255, 0\.02\) 4px/);
    });

    it('uses the default cyan color rgba(0, 229, 255, 0.02)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toContain('rgba(0, 229, 255, 0.02)');
    });

    it('uses the default opacity 0.02 (subtle HUD feel)', () => {
      render(<Scanlines />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toMatch(/opacity:\s*0\.02/);
    });

    it('honours a custom spacing (e.g. 8px cycle)', () => {
      render(<Scanlines spacing={8} />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      // 8px cycle → 4px line + 4px gap.
      expect(style).toMatch(/transparent 4px/);
      expect(style).toMatch(/rgba\(0, 229, 255, 0\.02\) 4px/);
      expect(style).toMatch(/rgba\(0, 229, 255, 0\.02\) 8px/);
    });

    it('honours a custom color', () => {
      render(<Scanlines color="rgba(255, 0, 60, 0.05)" />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toContain('rgba(255, 0, 60, 0.05)');
    });

    it('honours a custom opacity', () => {
      render(<Scanlines opacity={0.1} />);
      const style = screen.getByTestId('scanlines-overlay').getAttribute('style') ?? '';
      expect(style).toMatch(/opacity:\s*0\.1/);
    });
  });
});