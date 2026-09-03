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
const boxShadow = resolved.theme.boxShadow as unknown as Record<string, string>;
const backgroundImage = resolved.theme.backgroundImage as unknown as Record<string, string>;

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

  /*
   * design-system-v1 (Wave 2, T2.1) — config drift cleanup.
   *
   * Pin the post-cleanup contract: legacy `glow-cyan*` aliases are gone,
   * all decorative rgba values use the neon Cyber-Jade palette
   * (rgba(0,255,157,*)) or the new info cyan (rgba(0,184,255,*)), and
   * the auth-pulse keyframe halo tracks jade instead of legacy cyan.
   */
  describe('boxShadow — glow-cyan aliases removed (Wave 2, T2.1)', () => {
    it('does NOT expose a glow-cyan boxShadow alias', () => {
      expect(boxShadow['glow-cyan']).toBeUndefined();
    });

    it('does NOT expose a glow-cyan-sm boxShadow alias', () => {
      expect(boxShadow['glow-cyan-sm']).toBeUndefined();
    });

    it('keeps glow-jade at the neon Cyber-Jade value', () => {
      expect(boxShadow['glow-jade']).toBe('0 0 40px rgba(0,255,157,0.30)');
    });

    it('keeps glow-jade-sm at the neon Cyber-Jade value', () => {
      expect(boxShadow['glow-jade-sm']).toBe('0 0 20px rgba(0,255,157,0.20)');
    });
  });

  describe('backgroundImage — cyan rgba values retired (Wave 2, T2.1)', () => {
    it('aurora-static uses jade + info rgba (no cyan)', () => {
      const value = backgroundImage['aurora-static'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,255,157,0.18)');
      expect(value).toContain('rgba(0,184,255,0.12)');
    });

    it('site-gradient uses jade rgba (no cyan)', () => {
      const value = backgroundImage['site-gradient'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,255,157,0.10)');
    });

    it('portal-selector uses jade + info rgba (no cyan)', () => {
      const value = backgroundImage['portal-selector'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,255,157,0.16)');
      expect(value).toContain('rgba(0,184,255,0.10)');
    });
  });

  describe('keyframes.auth-pulse — jade halo (Wave 2, T2.1)', () => {
    it('animates boxShadow with jade rgba (not legacy cyan)', () => {
      const kf = keyframes['auth-pulse'] as Record<string, { boxShadow: string }> | undefined;
      expect(kf).toBeDefined();
      const start = kf?.['0%, 100%'];
      const mid = kf?.['50%'];
      expect(start).toBeDefined();
      expect(mid).toBeDefined();
      expect(start?.boxShadow).toContain('rgba(0,255,157,');
      expect(start?.boxShadow).not.toContain('0,255,255');
      expect(mid?.boxShadow).toContain('rgba(0,255,157,');
      expect(mid?.boxShadow).not.toContain('0,255,255');
    });
  });
});
