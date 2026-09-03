/*
 * design-system-v1 (Wave 1, T1.4) — Cyber-Jade token contract.
 *
 * The tailwind.config.ts is the single source of truth for the
 * Cyber-Jade design system. These tests pin the structural contract
 * so a future refactor that drops a keyframe, animation, or color
 * breaks loudly in CI instead of silently regressing pages.
 *
 * Tests run against the RESOLVED config (`resolveConfig`), which
 * merges user overrides with Tailwind defaults. That mirrors what
 * the CSS compiler emits at build time.
 */
import { describe, expect, it } from 'vitest';
import resolveConfig from 'tailwindcss/resolveConfig';

import tailwindConfig from '../../tailwind.config';

const resolved = resolveConfig(tailwindConfig);

// ResolveConfig unwraps the `theme.extend` into the top-level theme,
// but Tailwind's generated `DefaultTheme` already has its own
// `keyframes`/`animation` maps. The user-extended values merge into
// the same maps.
const keyframes = resolved.theme.keyframes as unknown as Record<string, unknown>;
const animation = resolved.theme.animation as unknown as Record<string, string>;
const colors = resolved.theme.colors as unknown as Record<string, string | Record<string, string>>;
const fontFamily = resolved.theme.fontFamily as unknown as Record<string, string[]>;

describe('tailwind.config.ts — Cyber-Jade token contract', () => {
  describe('statusDotPulse keyframe', () => {
    it('defines a status-dot-pulse keyframe (decorative-system spec)', () => {
      expect(keyframes['status-dot-pulse']).toBeDefined();
    });

    it('animates opacity 0.5 -> 1.0 -> 0.5 (tightened from legacy 0.6)', () => {
      const kf = keyframes['status-dot-pulse'] as Record<string, { opacity: string }>;
      expect(kf['0%, 100%']).toEqual({ opacity: '0.5' });
      expect(kf['50%']).toEqual({ opacity: '1' });
    });
  });

  describe('animate-status-dot-pulse utility', () => {
    it('exposes the animation at 1.5s ease-in-out infinite', () => {
      expect(animation['status-dot-pulse']).toBe('status-dot-pulse 1.5s ease-in-out infinite');
    });
  });

  describe('legacy pulse-cyan removal', () => {
    it('does NOT expose a pulse-cyan keyframe (renamed to status-dot-pulse)', () => {
      expect(keyframes['pulse-cyan']).toBeUndefined();
    });

    it('does NOT expose a pulse-cyan animation', () => {
      expect(animation['pulse-cyan']).toBeUndefined();
    });
  });

  describe('borderJade color utility', () => {
    it('exposes borderJade at the rgba(0, 255, 157, 0.2) opacity', () => {
      expect(colors.borderJade).toBe('rgba(0, 255, 157, 0.2)');
    });
  });

  describe('fontFamily.display stack', () => {
    it('uses Orbitron -> Rajdhani -> Space Grotesk -> monospace fallback', () => {
      expect(fontFamily.display).toEqual([
        'Orbitron',
        'Rajdhani',
        'Space Grotesk',
        'ui-monospace',
        'monospace',
      ]);
    });
  });
});
