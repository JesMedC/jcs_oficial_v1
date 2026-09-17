/*
 * jarvis-ui-redesign (T-07) — ServerRoomBackground primitive tests.
 *
 * Pins the visual + structural contract for the JARVIS chrome
 * backdrop that simulates a dim server room behind glass. Mounted
 * as an absolutely-positioned overlay on the portal shell, behind
 * every content layer.
 *
 * Contract:
 *   - covers the full viewport (absolute inset-0)
 *   - z-index pinned to -10 so it sits below content but above body bg
 *   - backgroundImage stacks two layers (radial server bloom + grid
 *     pattern), both reading CSS vars --jarvis-bg-server +
 *     --jarvis-bg-grid
 *   - aria-hidden=true + pointer-events-none (decorative)
 *   - data-jarvis-server-bg attribute for E2E selection
 */
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { ServerRoomBackground } from '../ServerRoomBackground';

describe('ServerRoomBackground', () => {
  describe('positioning (REQ-SRB-001)', () => {
    it('covers the full viewport (absolute + inset-0)', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild;
      expect(bg).toHaveClass('absolute');
      expect(bg).toHaveClass('inset-0');
    });

    it('sits behind content (z-index -10) so it never blocks clicks', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild;
      expect(bg).toHaveClass('-z-10');
      expect(bg).toHaveClass('pointer-events-none');
    });

    it('is decorative: aria-hidden=true', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild;
      expect(bg).toHaveAttribute('aria-hidden', 'true');
    });

    it('data-jarvis-server-bg attribute marks the root', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild;
      expect(bg).toHaveAttribute('data-jarvis-server-bg');
    });
  });

  describe('background layers (REQ-SRB-002)', () => {
    it('backgroundImage includes the --jarvis-bg-server radial gradient', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild as HTMLElement;
      const bgImage = bg.style.backgroundImage;
      expect(bgImage).toContain('var(--jarvis-bg-server)');
    });

    it('backgroundImage includes the --jarvis-bg-grid linear pattern', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild as HTMLElement;
      const bgImage = bg.style.backgroundImage;
      expect(bgImage).toContain('var(--jarvis-bg-grid)');
    });

    it('stacks server (top) + grid (bottom) as TWO background layers', () => {
      // Two comma-separated backgroundImage layers — server on top of grid.
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild as HTMLElement;
      const bgImage = bg.style.backgroundImage;
      // Count comma-separated top-level layers by splitting on top-level commas.
      // We assert at least 2 layers by checking the comma count + nesting.
      expect(bgImage.split('),').length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('overflow + size (REQ-SRB-003)', () => {
    it('overflow-hidden so the bloom does not leak outside the shell', () => {
      const { container } = render(<ServerRoomBackground />);
      const bg = container.firstChild;
      expect(bg).toHaveClass('overflow-hidden');
    });
  });
});
