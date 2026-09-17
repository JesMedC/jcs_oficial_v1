/*
 * design-system-v1 (Wave 1, T1.4) + core-interface-redesign (Slice 1, T-025).
 *
 * The tailwind.config.ts is the single source of truth for the design
 * system tokens. These tests pin the structural contract so a future
 * refactor that drops a keyframe, animation, or color breaks loudly in
 * CI instead of silently regressing pages.
 *
 * Tests run against the RESOLVED config (`resolveConfig`), which merges
 * user overrides with Tailwind defaults. That mirrors what the CSS
 * compiler emits at build time.
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

describe('tailwind.config.ts — Core Interface cyan contract', () => {
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

  describe('borderJade color utility (Wave 5 — CSS var-backed)', () => {
    it('exposes borderJade as a CSS var so the theme switch swaps the rgba alpha', () => {
      // Wave 5 mapped borderJade to ``var(--color-jade-border-line)``
      // so light mode uses the deeper-jade rgba (0.28 alpha) instead
      // of the dark-mode neon rgba (0.20 alpha). The resolved value
      // is a CSS var reference — the actual hex/rgba is applied by
      // ``src/styles/themes.css`` based on ``[data-theme="..."]``.
      expect(colors.borderJade).toBe('var(--color-jade-border-line)');
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
   * core-interface-redesign (Slice 1, T-025) — Cyan Core Interface contract.
   *
   * Pins the cyan pivot landed in this slice:
   *   - glow-jade / glow-jade-sm use cyan rgba(0,212,216,*) at the
   *     retuned alphas (0.25 / 0.16 — tightened from the jade-era
   *     0.30 / 0.20 because cyan reads brighter than jade at equal
   *     alpha, and un-tightened glows blow out into halos).
   *   - glow-cyan is the new semantic alias of glow-jade so consumers
   *     can write the cyan-intent name explicitly (the old `glow-jade`
   *     name stays valid for one release cycle for backward compat).
   *   - All decorative rgba values (aurora-static, site-gradient,
   *     portal-selector, auth-pulse halo) use the cyan family plus the
   *     pre-existing info cyan (rgba(0,184,255,*)) for the secondary
   *     blue accent.
   *   - The legacy `glow-cyan*` aliases from the pre-DS-v1 era are
   *     gone; the new `glow-cyan` is the alias-of-glow-jade, not a
   *     separate primitive.
   */
  describe('boxShadow — JARVIS HUD cyan glow (v2, REQ-DCF-JV2-003)', () => {
    // dashboard-jarvis-fidelity-v2 — rgba migrated from (0,212,216) to
    // (0,229,255) to match the new #00E5FF primary. The 0.25 / 0.16
    // alphas stay (already tuned for cyan at the JARVIS intensity).
    it('glow-jade uses the JARVIS cyan rgba at 0.25 alpha', () => {
      expect(boxShadow['glow-jade']).toBe('0 0 40px rgba(0,229,255,0.25)');
    });

    it('glow-jade-sm uses the JARVIS cyan rgba at 0.16 alpha', () => {
      expect(boxShadow['glow-jade-sm']).toBe('0 0 20px rgba(0,229,255,0.16)');
    });

    it('exposes glow-cyan as the semantic alias of glow-jade', () => {
      expect(boxShadow['glow-cyan']).toBeDefined();
      expect(boxShadow['glow-cyan']).toBe(boxShadow['glow-jade']);
    });

    it('does NOT expose a separate glow-cyan-sm (only one cyan glow utility)', () => {
      // The alias family is intentional: one canonical glow value, two
      // semantic names. If a future change needs a smaller cyan glow,
      // add `glow-cyan-sm` and remove this guard.
      expect(boxShadow['glow-cyan-sm']).toBeUndefined();
    });

    it('does NOT contain the previous Slice-1 rgba(0, 212, 216) family (regression guard)', () => {
      for (const value of Object.values(boxShadow)) {
        expect(value).not.toMatch(/rgba\(\s*0\s*,\s*212\s*,\s*216/);
      }
    });
  });

  describe('glass.border — JARVIS cyan rgba (v2, REQ-DCF-JV2-003)', () => {
    // Slice 1 used rgba(0, 212, 216); v2 pivots to rgba(0, 229, 255).
    // Strong bumped from 0.22 → 0.30 so the chamfered cards read as
    // crisp frames on the new radial navy bg.
    const colors = resolved.theme.colors as unknown as Record<
      string,
      string | Record<string, string | Record<string, string>>
    >;
    const glass = colors.glass as Record<string, Record<string, string>>;
    const glassBorder = glass.border;

    it('glass.border.subtle uses cyan rgba(0, 229, 255, 0.14)', () => {
      expect(glassBorder!.subtle).toBe('rgba(0, 229, 255, 0.14)');
    });

    it('glass.border.DEFAULT uses cyan rgba(0, 229, 255, 0.22)', () => {
      expect(glassBorder!.DEFAULT).toBe('rgba(0, 229, 255, 0.22)');
    });

    it('glass.border.strong uses cyan rgba(0, 229, 255, 0.30)', () => {
      expect(glassBorder!.strong).toBe('rgba(0, 229, 255, 0.30)');
    });

    it('glass.border is NOT translucent white (regression guard)', () => {
      expect(glassBorder!.subtle).not.toMatch(/rgb\(255\s+255\s+255/);
      expect(glassBorder!.DEFAULT).not.toMatch(/rgb\(255\s+255\s+255/);
      expect(glassBorder!.strong).not.toMatch(/rgb\(255\s+255\s+255/);
    });
  });

  describe('backgroundImage — JARVIS cyan rgba (v2)', () => {
    it('aurora-static uses the new cyan + info rgba (no legacy jade)', () => {
      const value = backgroundImage['aurora-static'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,157');
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,229,255,0.18)');
      expect(value).toContain('rgba(0,184,255,0.12)');
    });

    it('site-gradient uses the new cyan rgba (no legacy jade)', () => {
      const value = backgroundImage['site-gradient'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,157');
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,229,255,0.10)');
    });

    it('portal-selector uses the new cyan + info rgba (no legacy jade)', () => {
      const value = backgroundImage['portal-selector'];
      expect(value).toBeDefined();
      expect(value).not.toContain('0,255,157');
      expect(value).not.toContain('0,255,255');
      expect(value).toContain('rgba(0,229,255,0.16)');
      expect(value).toContain('rgba(0,184,255,0.10)');
    });
  });

  describe('keyframes.auth-pulse — JARVIS cyan halo (v2)', () => {
    it('animates boxShadow with the new cyan rgba (not legacy jade)', () => {
      const kf = keyframes['auth-pulse'] as Record<string, { boxShadow: string }> | undefined;
      expect(kf).toBeDefined();
      const start = kf?.['0%, 100%'];
      const mid = kf?.['50%'];
      expect(start).toBeDefined();
      expect(mid).toBeDefined();
      expect(start?.boxShadow).toContain('rgba(0,229,255,');
      expect(start?.boxShadow).not.toContain('0,255,157');
      expect(start?.boxShadow).not.toContain('0,255,255');
      expect(mid?.boxShadow).toContain('rgba(0,229,255,');
      expect(mid?.boxShadow).not.toContain('0,255,157');
      expect(mid?.boxShadow).not.toContain('0,255,255');
    });
  });

  /*
   * dashboard-jarvis-fidelity-v2 — new Tailwind utilities:
   *   - text-shadow-glow: `text-shadow: 0 0 8px rgba(0, 229, 255, 0.6)`
   *     for titles + big numbers (per spec).
   *   - bg-radial-hud: a 2-stop radial gradient from --color-bg-deep
   *     to --color-bg-mid for the page background (REQ-DCF-JV2-004).
   *   - hud-glass + border-hud-cyan: chrome utilities that consumers
   *     can layer onto existing Tailwind cards without opting into the
   *     full HudPanel component.
   */
  describe('JARVIS v2 utilities', () => {
    // Tailwind's resolved theme type doesn't declare `textShadow` as a
    // top-level key (it inherits through `extend.textShadow`), so we
    // cast through `unknown` to read the value.
    const textShadow = (resolved.theme as unknown as Record<string, unknown>)['textShadow'] as
      | Record<string, string>
      | undefined;
    const bgImage = backgroundImage;

    it('exposes text-shadow-glow utility', () => {
      expect(textShadow).toBeDefined();
      expect(textShadow!['glow']).toContain('rgba(0, 229, 255, 0.6)');
    });

    it('exposes bg-radial-hud backgroundImage utility', () => {
      const v = bgImage['radial-hud'];
      expect(v).toBeDefined();
      expect(v).toContain('radial-gradient');
      expect(v).toContain('#030c14');
      expect(v).toContain('#0a192f');
    });
  });
});
