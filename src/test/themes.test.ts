/*
 * core-interface-redesign (T-024) — Core Interface cyan token contract.
 *
 * `src/styles/themes.css` is the single source of truth for brand color
 * values. These tests pin the cyan "Core Interface" ladder per
 * `openspec/changes/core-interface-redesign/specs/core-interface-tokens/spec.md`
 * (REQ-CIT-001..REQ-CIT-007) and the color-system spec delta.
 *
 * Tests run as text assertions on the file contents because the project
 * has no CSS-in-JS layer; this mirrors the project's existing drift-test
 * pattern (e.g. `tailwind.config.test.ts`).
 *
 * Implementation note: we read the file via Node's `fs` API (Vitest's
 * default jsdom env does NOT provide `window.fs`; we use the Node
 * import directly via top-level await pattern OR vi.hoisted. To keep
 * things simple we import from `node:fs` and `node:path`).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const themesPath = resolve(__dirname, '../styles/themes.css');
const themes = readFileSync(themesPath, 'utf-8');

/**
 * Extract the `[data-theme='<mode>'] { ... }` block from `themes.css`.
 * Returns the substring between the opening `{` and the matching closing
 * `}`. The file has exactly two such blocks (dark + light).
 */
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
  // Walk to the matching close brace (top-level only).
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

describe('themes.css — Core Interface cyan contract (T-024)', () => {
  /*
   * dashboard-jarvis-fidelity-v2 — palette pivot to the JARVIS HUD
   * cyan family (#00E5FF) and the new bg gradient stops. The previous
   * Slice-1 cyan #00D4D8 was the "Core Interface" pivot; v2 deepens
   * the saturation so the dashboard reads as a true HUD. Token NAMES
   * are preserved (`--color-jade-*`) so all 121+ consumers keep
   * working — only the values changed.
   */
  describe('dark mode cyan ladder (JARVIS v2)', () => {
    it('--color-jade is the JARVIS HUD cyan #00E5FF (REQ-DCF-JV2-001)', () => {
      expect(darkBlock).toMatch(/--color-jade:\s*#00e5ff\s*;/i);
    });

    it('--color-jade-dk is the mid-tone cyan #00B8D4 (REQ-DCF-JV2-001)', () => {
      expect(darkBlock).toMatch(/--color-jade-dk:\s*#00b8d4\s*;/i);
    });

    it('--color-jade-light is the highlight cyan #66F0FF (REQ-DCF-JV2-001)', () => {
      expect(darkBlock).toMatch(/--color-jade-light:\s*#66f0ff\s*;/i);
    });

    it('--color-jade-glow seeds the HUD glow rgba (REQ-DCF-JV2-001)', () => {
      expect(darkBlock).toMatch(/--color-jade-glow:\s*#00e5ff\s*;/i);
    });

    it('--color-jade-fg flips to the new HUD bg-deep #030C14 (REQ-DCF-JV2-001)', () => {
      // v2 pivots the on-primary text from #060B10 to the deeper
      // #030C14 radial-bg stop so primary buttons stay readable when
      // the page is repainted at the radial gradient's bottom.
      expect(darkBlock).toMatch(/--color-jade-fg:\s*#030c14\s*;/i);
    });
  });

  describe('dark mode separation (JARVIS v2)', () => {
    it('--color-jade-profit shifts to emerald #00FF66 (REQ-DCF-JV2-002)', () => {
      // Profit used to be cyan-green #3CE0B8 (Slice 1). v2 sharpens
      // it to emerald #00FF66 so "winning" reads visually distinct
      // from the cyan primary at a glance.
      expect(darkBlock).toMatch(/--color-jade-profit:\s*#00ff66\s*;/i);
    });

    it('--color-jade-loss shifts to saturated red #FF003C (REQ-DCF-JV2-002)', () => {
      // Loss used to be the softer #FF3D5F. v2 saturates to #FF003C
      // so the "red" signal pops on the new radial bg.
      expect(darkBlock).toMatch(/--color-jade-loss:\s*#ff003c\s*;/i);
    });

    it('--color-jade-info stays #00B8FF (cousin cyan, unchanged)', () => {
      expect(darkBlock).toMatch(/--color-jade-info:\s*#00b8ff\s*;/i);
    });

    it('--color-jade-warning stays #F3B94E (unchanged)', () => {
      expect(darkBlock).toMatch(/--color-jade-warning:\s*#f3b94e\s*;/i);
    });
  });

  describe('dark mode type scale (JARVIS v2)', () => {
    it('--color-jade-text-pri tightens to the cooler off-white #E6F1FF', () => {
      expect(darkBlock).toMatch(/--color-jade-text-pri:\s*#e6f1ff\s*;/i);
    });

    it('--color-jade-text-sec drops to #8892B0', () => {
      expect(darkBlock).toMatch(/--color-jade-text-sec:\s*#8892b0\s*;/i);
    });
  });

  describe('dark mode radial-bg gradient stops (JARVIS v2)', () => {
    it('--color-bg-deep is the radial inner stop #030C14', () => {
      expect(darkBlock).toMatch(/--color-bg-deep:\s*#030c14\s*;/i);
    });

    it('--color-bg-mid is the radial outer stop #0A192F', () => {
      expect(darkBlock).toMatch(/--color-bg-mid:\s*#0a192f\s*;/i);
    });
  });

  describe('dark mode border + HUD decor (cyan rgba family, #00E5FF)', () => {
    // Slice 1 used rgba(0, 212, 216) which corresponds to #00D4D8.
    // v2 shifts the rgba to (0, 229, 255) to match #00E5FF.
    it('--color-jade-border uses cyan rgba(0, 229, 255, 0.30)', () => {
      expect(darkBlock).toMatch(
        /--color-jade-border:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.30\s*\)/i,
      );
    });

    it('--color-jade-border-line uses cyan rgba(0, 229, 255, 0.10)', () => {
      expect(darkBlock).toMatch(
        /--color-jade-border-line:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.10\s*\)/i,
      );
    });

    it('--hud-ring-track uses cyan rgba(0, 229, 255, 0.08)', () => {
      expect(darkBlock).toMatch(
        /--hud-ring-track:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.08\s*\)/i,
      );
    });

    it('--hud-ring-value uses cyan rgba(0, 229, 255, 0.85)', () => {
      expect(darkBlock).toMatch(
        /--hud-ring-value:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.85\s*\)/i,
      );
    });

    it('--scanline-color uses cyan rgba(0, 229, 255, 0.02)', () => {
      // v2 tightened the scanline rgba from 0.12 → 0.02 — the lines
      // should be felt, not read.
      expect(darkBlock).toMatch(
        /--scanline-color:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.02\s*\)/i,
      );
    });

    it('--selection-bg uses cyan rgba(0, 229, 255, 0.35)', () => {
      expect(darkBlock).toMatch(
        /--selection-bg:\s*rgba\(\s*0\s*,\s*229\s*,\s*255\s*,\s*0\.35\s*\)/i,
      );
    });
  });

  describe('JARVIS v2 glow + HUD hex-string guards', () => {
    it('does NOT contain the previous cyan #00D4D8 (regression guard)', () => {
      // If a future change slips the Slice-1 cyan back in, the v2
      // contract breaks. This guard makes that loud.
      expect(themes.toLowerCase()).not.toContain('#00d4d8');
    });

    it('does NOT contain the previous rgba(0, 212, 216) family (regression guard)', () => {
      expect(themes).not.toMatch(/rgba\(\s*0\s*,\s*212\s*,\s*216/i);
    });
  });

  describe('light mode cyan ladder (REQ-CIT-001 light variant)', () => {
    it('--color-jade is the WCAG-AA dark cyan #00838F for white bg contrast', () => {
      expect(lightBlock).toMatch(/--color-jade:\s*#00838f\s*;/i);
    });

    it('--color-jade-dk is the deep cyan #006064', () => {
      expect(lightBlock).toMatch(/--color-jade-dk:\s*#006064\s*;/i);
    });

    it('--color-jade-light is the lighter cyan #4FB3BF', () => {
      expect(lightBlock).toMatch(/--color-jade-light:\s*#4fb3bf\s*;/i);
    });

    it('--color-jade-fg flips to white (text on dark cyan surfaces)', () => {
      expect(lightBlock).toMatch(/--color-jade-fg:\s*#ffffff\s*;/i);
    });
  });

  describe('light mode profit/loss/info/warning (REQ-CIT-005)', () => {
    it('--color-jade-profit is the darker cyan-green #1F8A8A', () => {
      expect(lightBlock).toMatch(/--color-jade-profit:\s*#1f8a8a\s*;/i);
    });

    it('--color-jade-loss stays #C8253D (deep red)', () => {
      expect(lightBlock).toMatch(/--color-jade-loss:\s*#c8253d\s*;/i);
    });

    it('--color-jade-info stays #006BB3 (deep blue)', () => {
      expect(lightBlock).toMatch(/--color-jade-info:\s*#006bb3\s*;/i);
    });

    it('--color-jade-warning stays #B07A2A (deep amber)', () => {
      expect(lightBlock).toMatch(/--color-jade-warning:\s*#b07a2a\s*;/i);
    });
  });

  describe('jade-drift guard (no jade hex literals remain in themes.css)', () => {
    it('does NOT contain jade hex #00FF9D anywhere (REQ-CIT-006 single source of truth)', () => {
      // The OLD jade primary is fully retired. If you see this fail, the
      // cyan pivot slipped a jade literal back into themes.css.
      expect(themes.toLowerCase()).not.toContain('#00ff9d');
    });

    it('does NOT contain legacy jade dark rgba rgb(0, 255, 157)', () => {
      expect(themes).not.toMatch(/rgb\(\s*0\s*,\s*255\s*,\s*157/i);
    });

    it('does NOT contain legacy jade light rgba rgb(0, 168, 107)', () => {
      expect(themes).not.toMatch(/rgb\(\s*0\s*,\s*168\s*,\s*107/i);
    });
  });
});
