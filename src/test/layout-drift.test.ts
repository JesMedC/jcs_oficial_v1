/*
 * design-system-v1 (Wave 3a, T3a.1) — Layout drift cleanup contract.
 *
 * Wave 1+2 swapped the hex tokens + keyframes in `tailwind.config.ts`
 * and `src/styles/index.css`, but file-level rgba literals still
 * leaked through: cyan `rgba(0,255,255,*)` strings in AuroraBackground
 * and the mobile drawer "Iniciar sesion" hover shadow, and pre-pivot
 * soft-jade `rgba(46,220,140,*)` strings on the TopNav brand dot,
 * active-link underline, and login hover shadow.
 *
 * Wave 3a retires those literals in the 4 layout files
 * (TopNav / AuroraBackground / TopNavMobileDrawer / Footer) and
 * swaps them for the new neon Cyber-Jade `rgba(0,255,157,*)`. These
 * tests pin the post-migration contract so a future drift cannot
 * re-introduce the old colours without tripping CI.
 *
 * The assertions read each layout file as plain text (similar to how
 * `tailwind.config.test.ts` pins the resolved Tailwind config). They
 * are migration-contract pins, not behavioural tests — the goal is to
 * keep the colour tokens in sync with the Cyber-Jade spec, not to
 * re-verify Tailwind's CSS-emit behaviour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const LAYOUT_DIR = resolve(__dirname, '..', 'layout');

function readLayoutSource(filename: string): string {
  return readFileSync(resolve(LAYOUT_DIR, filename), 'utf8');
}

const TOPNAV = readLayoutSource('TopNav.tsx');
const AURORA = readLayoutSource('AuroraBackground.tsx');
const DRAWER = readLayoutSource('TopNavMobileDrawer.tsx');
const FOOTER = readLayoutSource('Footer.tsx');

const OLD_CYAN_RGBA = 'rgba(0,255,255';
const OLD_JADE_RGBA = 'rgba(46,220,140';
const HEX_CYAN = '#00FFFF';
const HEX_OLD_JADE = '#2EDC8C';
const NEW_JADE_RGBA = 'rgba(0,255,157';

describe('src/layout — Wave 3a drift cleanup contract', () => {
  describe('TopNav.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(TOPNAV).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(TOPNAV).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(TOPNAV).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(TOPNAV).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade brand-dot shadow on both the authenticated + public brand mark', () => {
      // The brand dot is rendered twice (signed-in span + public Link);
      // each instance must carry the new jade glow shadow.
      const occurrences = TOPNAV.match(
        /shadow-\[0_0_12px_rgba\(0,255,157,0\.6\)\]/g,
      );
      expect(occurrences).not.toBeNull();
      expect(occurrences?.length).toBe(2);
    });

    it('pins the neon-jade underline shadow on the active NavLink', () => {
      expect(TOPNAV).toContain('after:shadow-[0_0_8px_rgba(0,255,157,0.8)]');
    });

    it('pins the neon-jade hover shadow on the public "Iniciar sesion" link', () => {
      expect(TOPNAV).toContain('hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]');
    });
  });

  describe('AuroraBackground.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(AURORA).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(AURORA).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(AURORA).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(AURORA).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade blob gradient stops (inner + outer fade)', () => {
      expect(AURORA).toContain("gradient.addColorStop(0, 'rgba(0,255,157,0.18)')");
      expect(AURORA).toContain("gradient.addColorStop(1, 'rgba(0,255,157,0)')");
    });

    it('pins the neon-jade particle fillStyle', () => {
      expect(AURORA).toContain("ctx.fillStyle = 'rgba(0,255,157,0.4)'");
    });
  });

  describe('TopNavMobileDrawer.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(DRAWER).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(DRAWER).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(DRAWER).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(DRAWER).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade hover shadow on the "Iniciar sesión" link', () => {
      expect(DRAWER).toContain('hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]');
    });
  });

  describe('Footer.tsx (already clean — no edits expected)', () => {
    it('contains NO cyan rgba literals (verification only)', () => {
      expect(FOOTER).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (verification only)', () => {
      expect(FOOTER).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (verification only)', () => {
      expect(FOOTER).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (verification only)', () => {
      expect(FOOTER).not.toContain(HEX_OLD_JADE);
    });
  });

  describe('whole src/layout — final guard', () => {
    it('the four legacy literal patterns collectively return zero matches', () => {
      const all = TOPNAV + AURORA + DRAWER + FOOTER;
      expect(all).not.toContain(OLD_CYAN_RGBA);
      expect(all).not.toContain(OLD_JADE_RGBA);
      expect(all).not.toContain(HEX_CYAN);
      expect(all).not.toContain(HEX_OLD_JADE);
    });

    it('the layout contains at least one neon-jade rgba literal after migration', () => {
      const all = TOPNAV + AURORA + DRAWER + FOOTER;
      expect(all).toContain(NEW_JADE_RGBA);
    });
  });
});
