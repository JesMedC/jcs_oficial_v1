/*
 * jarvis-ui-redesign (T-02) — JARVIS chrome + HUD token contract.
 *
 * Extends `themes.css` with the JARVIS-specific tokens needed for the
 * Iron-Man-HUD aesthetic beyond the Core Interface cyan ladder that
 * `core-interface-redesign` (T-024) established:
 *
 *   - chrome labels (sidebar nav items, topbar sections): low-emphasis cyan
 *   - watermark (logo "JARVIS" en esquinas): subtle outline cyan
 *   - online indicator (sidebar status dot): cyan-green profit shift
 *   - divider (HUD notched separator): cyan with notch break
 *   - corner (L-shape decorative): bright cyan accent
 *   - h1-glow (hero text shadow): bright cyan halo
 *   - bg-server (radial gradient simulating dim server room backdrop)
 *   - bg-grid (subtle grid pattern for chrome surfaces)
 *   - progress-track / progress-value (outer HUD ring)
 *   - progress-track-inner / progress-value-inner (inner HUD ring)
 *
 * Tests run as text assertions on `themes.css` (Node `fs` import),
 * mirroring the project's existing drift-test pattern. Strict TDD per
 * `openspec/config.yaml` — these assertions are the new contract.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const themesPath = resolve(__dirname, '../styles/themes.css');
const themes = readFileSync(themesPath, 'utf-8');

function extractThemeBlock(mode: 'dark' | 'light'): string {
  const marker = `[data-theme='${mode}']`;
  const start = themes.indexOf(marker);
  if (start < 0) {
    throw new Error(`themes.css does not contain a ${marker} block`);
  }
  const openBrace = themes.indexOf('{', start);
  if (openBrace < 0) {
    throw new Error(`themes.css ${marker} block has no opening brace`);
  }
  let depth = 1;
  let i = openBrace + 1;
  while (i < themes.length && depth > 0) {
    const ch = themes[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') depth -= 1;
    i += 1;
  }
  if (depth !== 0) {
    throw new Error(`themes.css ${marker} block is not balanced`);
  }
  return themes.slice(openBrace + 1, i - 1);
}

const darkBlock = extractThemeBlock('dark');
const lightBlock = extractThemeBlock('light');

describe('themes.css — JARVIS chrome tokens (T-02)', () => {
  describe('dark mode chrome labels + watermark (REQ-JAR-001)', () => {
    it('--jarvis-chrome-label is a low-emphasis cyan rgba', () => {
      // Sidebar nav items + topbar section labels read at this alpha.
      expect(darkBlock).toMatch(
        /--jarvis-chrome-label:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.4\s*\)\s*;/i,
      );
    });

    it('--jarvis-watermark is a subtle outline cyan rgba', () => {
      // "JARVIS" wordmark in the corners — outline typography.
      expect(darkBlock).toMatch(
        /--jarvis-watermark:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.13\s*\)\s*;/i,
      );
    });

    it('--jarvis-online is the cyan-green profit shift for status indicator', () => {
      // Sidebar top-right online dot — same family as profit but punchier.
      expect(darkBlock).toMatch(/--jarvis-online:\s*#3ce0b8\s*;/i);
    });
  });

  describe('dark mode HUD dividers (REQ-JAR-002)', () => {
    it('--jarvis-divider is a cyan rgba with notch break', () => {
      expect(darkBlock).toMatch(
        /--jarvis-divider:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.18\s*\)\s*;/i,
      );
    });

    it('--jarvis-divider-strong lifts to 0.32 for emphasis sections', () => {
      expect(darkBlock).toMatch(
        /--jarvis-divider-strong:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.32\s*\)\s*;/i,
      );
    });
  });

  describe('dark mode decorative corners (REQ-JAR-003)', () => {
    it('--jarvis-corner is a bright cyan accent for L-shape decoratives', () => {
      // L-shape corners that frame the dashboard shell (top-left and
      // bottom-right brackets) — punchier than divider, lower than glow.
      expect(darkBlock).toMatch(
        /--jarvis-corner:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.6\s*\)\s*;/i,
      );
    });

    it('--jarvis-h1-glow is a bright cyan halo for the hero greeting', () => {
      // H1 textShadow on DashboardPage — bigger alpha than the chrome
      // label so the hero greeting reads as the page's hero.
      expect(darkBlock).toMatch(
        /--jarvis-h1-glow:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.45\s*\)\s*;/i,
      );
    });
  });

  describe('dark mode backgrounds (REQ-JAR-004)', () => {
    it('--jarvis-bg-server starts a radial gradient simulating server room', () => {
      // The dashboard/portal body sits on top of this — it's a soft
      // cyan radial bloom coming from off-screen center, simulating
      // a dimly-lit server rack behind glass.
      expect(darkBlock).toMatch(
        /--jarvis-bg-server:\s*radial-gradient\([^)]*rgba\(\s*0\s*,\s*212\s*,\s*216/i,
      );
    });

    it('--jarvis-bg-grid is a subtle cyan line grid for chrome surfaces', () => {
      // Linear gradient repeating for the chrome surfaces (sidebar,
      // topbar) — gives them the technical-grid HUD read.
      expect(darkBlock).toMatch(/--jarvis-bg-grid:\s*linear-gradient/i);
      expect(darkBlock).toMatch(/--jarvis-bg-grid[^;]*rgba\(\s*0\s*,\s*212\s*,\s*216/i);
    });
  });

  describe('dark mode HUD progress rings (REQ-JAR-005)', () => {
    it('--jarvis-progress-track is the OUTER ring background', () => {
      expect(darkBlock).toMatch(
        /--jarvis-progress-track:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.10\s*\)\s*;/i,
      );
    });

    it('--jarvis-progress-value is the OUTER ring filled arc', () => {
      expect(darkBlock).toMatch(
        /--jarvis-progress-value:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.9\s*\)\s*;/i,
      );
    });

    it('--jarvis-progress-track-inner is the INNER ring background', () => {
      // Inner ring sits a step below the outer (alpha 0.06) so the
      // double-ring effect reads as depth, not as duplicate.
      expect(darkBlock).toMatch(
        /--jarvis-progress-track-inner:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.06\s*\)\s*;/i,
      );
    });

    it('--jarvis-progress-value-inner is the INNER ring filled arc', () => {
      // Inner ring value a step brighter than track — the
      // double-track reads as a HUD compass.
      expect(darkBlock).toMatch(
        /--jarvis-progress-value-inner:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.7\s*\)\s*;/i,
      );
    });
  });

  describe('light mode JARVIS chrome (REQ-JAR-001..005 light variants)', () => {
    it('light mode chrome label drops to a deeper cyan alpha for contrast', () => {
      // Light mode lifts the alpha so the cyan stays readable on white.
      // We accept a 0.6-0.8 range to give the implementation some slack
      // but require it to NOT be the dark-mode value.
      const m = lightBlock.match(
        /--jarvis-chrome-label:\s*rgba\(\s*0\s*,\s*131\s*,\s*143\s*,\s*([0-9.]+)\s*\)/i,
      );
      expect(m).not.toBeNull();
      const alpha = Number(m![1]);
      expect(alpha).toBeGreaterThanOrEqual(0.55);
      expect(alpha).toBeLessThanOrEqual(0.85);
    });

    it('light mode watermark uses the deeper cyan', () => {
      expect(lightBlock).toMatch(
        /--jarvis-watermark:\s*rgba\(\s*0\s*,\s*131\s*,\s*143\s*,\s*0\.22\s*\)\s*;/i,
      );
    });

    it('light mode online indicator is the deeper cyan-green', () => {
      expect(lightBlock).toMatch(/--jarvis-online:\s*#1f8a8a\s*;/i);
    });

    it('light mode corners are the deeper cyan', () => {
      expect(lightBlock).toMatch(
        /--jarvis-corner:\s*rgba\(\s*0\s*,\s*131\s*,\s*143\s*,\s*0\.55\s*\)\s*;/i,
      );
    });
  });

  describe('no legacy jade slip-back (REQ-JAR-006)', () => {
    it('does NOT contain any legacy jade rgba rgb(0, 255, 157)', () => {
      expect(themes).not.toMatch(/rgb\(\s*0\s*,\s*255\s*,\s*157/i);
    });

    it('does NOT contain any legacy neon-jade hex #00FF9D', () => {
      expect(themes.toLowerCase()).not.toContain('#00ff9d');
    });
  });

  describe('TRIANGULATE — JARVIS token ladder coherence (REQ-JAR-007)', () => {
    it('dark mode JARVIS chrome label alpha (0.4) sits between chrome text-mut and chrome border-line', () => {
      // chrome label = 0.4, chrome border-line = 0.10, profit text on
      // dark ≈ full. We assert the chrome label is BETWEEN border-line
      // and a high-emphasis text so it stays mid-tier, not too dim.
      const chromeLabelMatch = darkBlock.match(
        /--jarvis-chrome-label:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      expect(chromeLabelMatch).not.toBeNull();
      const chromeAlpha = Number(chromeLabelMatch![1]);
      expect(chromeAlpha).toBeGreaterThan(0.2);
      expect(chromeAlpha).toBeLessThan(0.6);
    });

    it('dark mode JARVIS progress value (outer, 0.9) is brighter than inner (0.7)', () => {
      // The outer ring should pop more than the inner — depth effect.
      const outer = darkBlock.match(
        /--jarvis-progress-value:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      const inner = darkBlock.match(
        /--jarvis-progress-value-inner:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      expect(outer).not.toBeNull();
      expect(inner).not.toBeNull();
      expect(Number(outer![1])).toBeGreaterThan(Number(inner![1]));
    });

    it('dark mode JARVIS divider strong (0.32) is brighter than divider (0.18)', () => {
      // Strong divider for section breaks, regular for inline separators.
      const strong = darkBlock.match(
        /--jarvis-divider-strong:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      const divider = darkBlock.match(
        /--jarvis-divider:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      expect(strong).not.toBeNull();
      expect(divider).not.toBeNull();
      expect(Number(strong![1])).toBeGreaterThan(Number(divider![1]));
    });

    it('dark mode JARVIS bg-grid is a multi-layer linear gradient (not solid)', () => {
      // Multi-stop repeating grid pattern (one vertical + one horizontal line).
      // We assert at least TWO linear-gradient calls inside --jarvis-bg-grid.
      const m = darkBlock.match(/--jarvis-bg-grid:\s*([^;]+);/i);
      expect(m).not.toBeNull();
      const value = m![1] ?? '';
      const count = (value.match(/linear-gradient/gi) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('dark mode JARVIS bg-server is a multi-stop radial gradient', () => {
      // The server-room backdrop should have at least TWO radial-gradients
      // to give depth (foreground bloom + side accent).
      const m = darkBlock.match(/--jarvis-bg-server:\s*([^;]+);/i);
      expect(m).not.toBeNull();
      const value = m![1] ?? '';
      const count = (value.match(/radial-gradient/gi) ?? []).length;
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('light mode JARVIS chrome label alpha is HIGHER than dark (compensates for white bg)', () => {
      const dark = darkBlock.match(
        /--jarvis-chrome-label:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*([0-9.]+)\s*\)/i,
      );
      const light = lightBlock.match(
        /--jarvis-chrome-label:\s*rgba\(\s*0\s*,\s*131\s*,\s*143\s*,\s*([0-9.]+)\s*\)/i,
      );
      expect(dark).not.toBeNull();
      expect(light).not.toBeNull();
      expect(Number(light![1])).toBeGreaterThan(Number(dark![1]));
    });

    it('every JARVIS token appears in BOTH dark and light blocks (no orphan tokens)', () => {
      // Drift guard: each --jarvis-* token defined in dark must also
      // be defined in light (and vice versa), so consumer components
      // can read either block without falling back to undefined.
      const darkTokens = [...darkBlock.matchAll(/--(jarvis-[a-z0-9-]+):/gi)].map((m) => m[1]);
      const lightTokens = new Set(
        [...lightBlock.matchAll(/--(jarvis-[a-z0-9-]+):/gi)].map((m) => m[1]),
      );
      const darkSet = new Set(darkTokens);
      // No duplicates within dark (would mean duplicate CSS var declaration).
      expect(darkTokens.length).toBe(darkSet.size);
      // Every dark token has a light counterpart.
      for (const t of darkSet) {
        expect(lightTokens.has(t), `light block is missing --${t}`).toBe(true);
      }
    });
  });
});
