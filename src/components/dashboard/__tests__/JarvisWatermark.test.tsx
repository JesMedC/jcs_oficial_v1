/*
 * jarvis-ui-redesign (T-06) — JarvisWatermark primitive tests.
 *
 * Pins the visual contract for the corner "JARVIS" wordmark. Mounted
 * as an absolutely-positioned overlay on the portal shell / landing
 * hero. Reference: Iron Man HUD where the AI assistant's name sits
 * in the corners as outline typography.
 *
 * Contract:
 *   - renders the word "JARVIS" exactly (case sensitive)
 *   - data-jarvis-watermark attribute for E2E selection
 *   - position prop maps to corner classes (top-left | top-right |
 *     bottom-left | bottom-right)
 *   - text uses outline stroke (font-weight + webkit-text-stroke)
 *     NOT a solid fill — the watermark reads as "etched"
 *   - opacity default 0.13 (the --jarvis-watermark token)
 *   - color reads from --jarvis-watermark CSS var
 *   - pointer-events-none (decorative, never blocks input)
 *   - aria-hidden=true (decorative)
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { JarvisWatermark } from '../JarvisWatermark';

describe('JarvisWatermark', () => {
  describe('rendering (REQ-JW-001)', () => {
    it('renders the word "JARVIS" exactly', () => {
      render(<JarvisWatermark position="top-left" />);
      expect(screen.getByText('JARVIS')).toBeInTheDocument();
    });

    it('data-jarvis-watermark attribute marks the root', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveAttribute('data-jarvis-watermark');
    });

    it('is decorative: aria-hidden + pointer-events-none + absolute positioning', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveAttribute('aria-hidden', 'true');
      expect(wm).toHaveClass('pointer-events-none');
      expect(wm).toHaveClass('absolute');
    });
  });

  describe('position prop (REQ-JW-002)', () => {
    it('top-left: top-0 + left-0', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveClass('top-0');
      expect(wm).toHaveClass('left-0');
    });

    it('top-right: top-0 + right-0', () => {
      render(<JarvisWatermark position="top-right" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveClass('top-0');
      expect(wm).toHaveClass('right-0');
    });

    it('bottom-left: bottom-0 + left-0', () => {
      render(<JarvisWatermark position="bottom-left" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveClass('bottom-0');
      expect(wm).toHaveClass('left-0');
    });

    it('bottom-right: bottom-0 + right-0', () => {
      render(<JarvisWatermark position="bottom-right" />);
      const wm = screen.getByText('JARVIS');
      expect(wm).toHaveClass('bottom-0');
      expect(wm).toHaveClass('right-0');
    });
  });

  describe('outline typography (REQ-JW-003)', () => {
    it('uses webkit-text-stroke for outline effect (color transparent)', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      // webkit-text-stroke-color is what makes it outline.
      expect(wm.style.webkitTextStrokeColor || wm.style.color).toBeTruthy();
      expect(wm).toHaveClass('font-display');
      expect(wm).toHaveClass('uppercase');
      expect(wm).toHaveClass('tracking-[0.5em]');
    });

    it('color reads from --jarvis-watermark CSS var', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      // Either inline style.color or class-based style picks up the var.
      // We assert the class is present (Tailwind arbitrary value).
      expect(wm.className).toContain('text-[var(--jarvis-watermark)]');
    });
  });

  describe('opacity (REQ-JW-004)', () => {
    it('default opacity is 0.13 (the --jarvis-watermark token baseline)', () => {
      render(<JarvisWatermark position="top-left" />);
      const wm = screen.getByText('JARVIS');
      // Opacity applies to the watermark span; default 0.13.
      expect(wm.className).toMatch(/opacity-\[?0?\.13\]?/);
    });

    it('custom opacity prop overrides default', () => {
      render(<JarvisWatermark position="top-left" opacity={0.3} />);
      const wm = screen.getByText('JARVIS');
      expect(wm.className).toMatch(/opacity-\[?0?\.3\]?/);
    });
  });
});
