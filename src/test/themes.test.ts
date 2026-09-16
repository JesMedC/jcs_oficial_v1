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
  describe('dark mode cyan ladder', () => {
    it('--color-jade is the Core Interface cyan #00D4D8 (REQ-CIT-001)', () => {
      expect(darkBlock).toMatch(/--color-jade:\s*#00d4d8\s*;/i);
    });

    it('--color-jade-dk is the mid-tone cyan #00A8B8 (REQ-CIT-002)', () => {
      expect(darkBlock).toMatch(/--color-jade-dk:\s*#00a8b8\s*;/i);
    });

    it('--color-jade-light is the highlight cyan #7CE8EC (REQ-CIT-002)', () => {
      expect(darkBlock).toMatch(/--color-jade-light:\s*#7ce8ec\s*;/i);
    });

    it('--color-jade-glow seeds the cyan glow rgba (REQ-CIT-002)', () => {
      expect(darkBlock).toMatch(/--color-jade-glow:\s*#00d4d8\s*;/i);
    });

    it('--color-jade-fg stays dark for contrast on cyan surfaces (REQ-CIT-006)', () => {
      expect(darkBlock).toMatch(/--color-jade-fg:\s*#060b10\s*;/i);
    });
  });

  describe('dark mode separation (REQ-CIT-005)', () => {
    it('--color-jade-profit shifts to cyan-green #3CE0B8', () => {
      expect(darkBlock).toMatch(/--color-jade-profit:\s*#3ce0b8\s*;/i);
    });

    it('--color-jade-loss shifts to #FF3D5F (lift for dark-bg contrast)', () => {
      expect(darkBlock).toMatch(/--color-jade-loss:\s*#ff3d5f\s*;/i);
    });

    it('--color-jade-info stays #00B8FF (cousin cyan)', () => {
      expect(darkBlock).toMatch(/--color-jade-info:\s*#00b8ff\s*;/i);
    });

    it('--color-jade-warning stays #F3B94E', () => {
      expect(darkBlock).toMatch(/--color-jade-warning:\s*#f3b94e\s*;/i);
    });
  });

  describe('dark mode border + HUD decor (cyan rgba family)', () => {
    it('--color-jade-border uses cyan rgba(0, 212, 216, 0.08)', () => {
      expect(darkBlock).toMatch(/--color-jade-border:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.08\s*\)/i);
    });

    it('--color-jade-border-line uses cyan rgba(0, 212, 216, 0.10)', () => {
      expect(darkBlock).toMatch(
        /--color-jade-border-line:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.10\s*\)/i,
      );
    });

    it('--hud-ring-track uses cyan rgba(0, 212, 216, 0.08)', () => {
      expect(darkBlock).toMatch(
        /--hud-ring-track:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.08\s*\)/i,
      );
    });

    it('--hud-ring-value uses cyan rgba(0, 212, 216, 0.85)', () => {
      expect(darkBlock).toMatch(
        /--hud-ring-value:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.85\s*\)/i,
      );
    });

    it('--scanline-color uses cyan rgba(0, 212, 216, 0.12)', () => {
      expect(darkBlock).toMatch(
        /--scanline-color:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.12\s*\)/i,
      );
    });

    it('--selection-bg uses cyan rgba(0, 212, 216, 0.35)', () => {
      expect(darkBlock).toMatch(
        /--selection-bg:\s*rgba\(\s*0\s*,\s*212\s*,\s*216\s*,\s*0\.35\s*\)/i,
      );
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
