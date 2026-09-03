/*
 * design-system-v1 (Wave 3b, T3b.1) — Components drift cleanup contract.
 *
 * Wave 1+2 swapped the hex tokens + keyframes in `tailwind.config.ts`
 * and `src/styles/index.css`, and Wave 3a retired the residual cyan +
 * old-jade rgba literals in the 4 layout files. Wave 3b does the same
 * for the 8 component files that ship jade chrome to the user:
 * the portal sidebar + header, the modal/dialog chrome, the GlassCard
 * primitive, and the admin sidebar.
 *
 * The forbidden patterns are:
 *   - cyan rgba `rgba(0,255,255,*)`
 *   - pre-pivot old-jade rgba `rgba(46,220,140,*)`
 *   - cyan hex `#00FFFF`
 *   - old-jade hex `#2EDC8C`
 *   - inline SVG stroke `stroke="#00FFFF"`
 *
 * Each match is swapped for the new neon Cyber-Jade `rgba(0,255,157,*)`
 * triplet (alpha preserved per instance). These tests pin the
 * post-migration contract so a future drift cannot re-introduce the
 * old colours without tripping CI — mirroring the Wave 3a
 * `layout-drift.test.ts` pattern.
 *
 * The assertions read each component file as plain text. They are
 * migration-contract pins, not behavioural tests — the goal is to
 * keep the colour tokens in sync with the Cyber-Jade spec, not to
 * re-verify React's render behaviour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const COMPONENTS_DIR = resolve(__dirname, '..', 'components');

function readComponentSource(relativePath: string): string {
  return readFileSync(resolve(COMPONENTS_DIR, relativePath), 'utf8');
}

const SIDEBAR_NAV = readComponentSource('portal/SidebarNav.tsx');
const SIDEBAR_HEADER = readComponentSource('portal/SidebarHeader.tsx');
const MODAL = readComponentSource('portal/Modal.tsx');
const FUND_WITHDRAW = readComponentSource('portal/FundWithdrawModal.tsx');
const DELETE_ACCOUNT = readComponentSource('portal/DeleteAccountDialog.tsx');
const GLASS_CARD = readComponentSource('GlassCard.tsx');
const ADMIN_SIDEBAR = readComponentSource('admin/AdminSidebar.tsx');
const ROUTE_FALLBACK = readComponentSource('RouteFallback.tsx');

const OLD_CYAN_RGBA = 'rgba(0,255,255';
const OLD_JADE_RGBA = 'rgba(46,220,140';
const HEX_CYAN = '#00FFFF';
const HEX_OLD_JADE = '#2EDC8C';
const STROKE_CYAN = 'stroke="#00FFFF"';
const NEW_JADE_RGBA = 'rgba(0,255,157';

describe('src/components — Wave 3b drift cleanup contract', () => {
  describe('portal/SidebarNav.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(SIDEBAR_NAV).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(SIDEBAR_NAV).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(SIDEBAR_NAV).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(SIDEBAR_NAV).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade glow on the active NavLink border-l treatment', () => {
      // The active state must carry the new neon-jade shadow at 0.25
      // alpha (the original old-jade rgba).
      expect(SIDEBAR_NAV).toContain(
        'shadow-[0_0_12px_rgba(0,255,157,0.25)]',
      );
    });

    it('keeps the active-state border-l-primary shorthand (NOT border-primary)', () => {
      // Per design §11.2 the active line uses `border-l-4 border-l-primary`
      // (border-left-color only), NOT the `border-primary` shorthand which
      // would set all four sides.
      expect(SIDEBAR_NAV).toMatch(/border-l-primary/);
      expect(SIDEBAR_NAV).not.toMatch(/(^|\s)border-primary(\s|$)/);
    });
  });

  describe('portal/SidebarHeader.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(SIDEBAR_HEADER).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(SIDEBAR_HEADER).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(SIDEBAR_HEADER).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(SIDEBAR_HEADER).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade brand-dot shadow on the SidebarHeader', () => {
      expect(SIDEBAR_HEADER).toContain(
        'shadow-[0_0_12px_rgba(0,255,157,0.6)]',
      );
    });
  });

  describe('portal/Modal.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(MODAL).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(MODAL).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(MODAL).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(MODAL).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade modal-card shadow', () => {
      // The reusable Modal renders a glassmorphic card with a soft jade
      // glow halo; the alpha is 0.18 (preserved from the old-jade value).
      expect(MODAL).toContain(
        'shadow-[0_0_40px_rgba(0,255,157,0.18)]',
      );
    });
  });

  describe('portal/FundWithdrawModal.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(FUND_WITHDRAW).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(FUND_WITHDRAW).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(FUND_WITHDRAW).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(FUND_WITHDRAW).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade hover shadow on the primary submit button', () => {
      // The primary action button (Fondear / Retirar) had a cyan shadow
      // at 0.5 alpha; the migration swaps it to neon jade at the same
      // alpha so the hover-state visual weight is preserved.
      expect(FUND_WITHDRAW).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('portal/DeleteAccountDialog.tsx (already clean — no edits expected)', () => {
    it('contains NO cyan rgba literals (verification only)', () => {
      expect(DELETE_ACCOUNT).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (verification only)', () => {
      expect(DELETE_ACCOUNT).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (verification only)', () => {
      expect(DELETE_ACCOUNT).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (verification only)', () => {
      expect(DELETE_ACCOUNT).not.toContain(HEX_OLD_JADE);
    });
  });

  describe('GlassCard.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(GLASS_CARD).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(GLASS_CARD).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(GLASS_CARD).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(GLASS_CARD).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade hover shadow on the interactive variant', () => {
      // The `interactive` GlassCard variant had a cyan hover glow at
      // 0.15 alpha; the migration swaps it to neon jade at the same
      // alpha.
      expect(GLASS_CARD).toContain(
        'hover:shadow-[0_0_32px_rgba(0,255,157,0.15)]',
      );
    });
  });

  describe('admin/AdminSidebar.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(ADMIN_SIDEBAR).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(ADMIN_SIDEBAR).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(ADMIN_SIDEBAR).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(ADMIN_SIDEBAR).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade brand-dot shadow on the AdminSidebar', () => {
      // Mirrors the SidebarHeader brand-dot treatment — neon jade at
      // 0.6 alpha (the original cyan value).
      expect(ADMIN_SIDEBAR).toContain(
        'shadow-[0_0_12px_rgba(0,255,157,0.6)]',
      );
    });

    it('pins the neon-jade example in the file-header docstring', () => {
      // The file's docstring at L12 carries a backtick-wrapped code
      // example for the active nav underline shadow. The literal in
      // the example was cyan (and matched the forbidden grep); the
      // migration swaps it to neon jade so the comment stays accurate
      // and the grep stays clean.
      expect(ADMIN_SIDEBAR).toContain(
        'after:shadow-[0_0_8px_rgba(0,255,157,0.8)]',
      );
    });
  });

  describe('RouteFallback.tsx (already clean — no edits expected)', () => {
    it('contains NO cyan rgba literals (verification only)', () => {
      expect(ROUTE_FALLBACK).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (verification only)', () => {
      expect(ROUTE_FALLBACK).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (verification only)', () => {
      expect(ROUTE_FALLBACK).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (verification only)', () => {
      expect(ROUTE_FALLBACK).not.toContain(HEX_OLD_JADE);
    });

    it('still uses the Wave 1 renamed status-dot-pulse keyframe', () => {
      // Wave 1 renamed the keyframe from `pulse-cyan` to
      // `status-dot-pulse`; the rename was completed at L13 during T1.4.
      // This pins that the rename sticks (no regression to the cyan name).
      expect(ROUTE_FALLBACK).toContain('animate-status-dot-pulse');
      expect(ROUTE_FALLBACK).not.toContain('animate-pulse-cyan');
    });
  });

  describe('whole src/components — final guard', () => {
    it('the five forbidden literal patterns collectively return zero matches across the 8 files', () => {
      const all =
        SIDEBAR_NAV +
        SIDEBAR_HEADER +
        MODAL +
        FUND_WITHDRAW +
        DELETE_ACCOUNT +
        GLASS_CARD +
        ADMIN_SIDEBAR +
        ROUTE_FALLBACK;
      expect(all).not.toContain(OLD_CYAN_RGBA);
      expect(all).not.toContain(OLD_JADE_RGBA);
      expect(all).not.toContain(HEX_CYAN);
      expect(all).not.toContain(HEX_OLD_JADE);
      expect(all).not.toContain(STROKE_CYAN);
    });

    it('the 8 files contain at least one neon-jade rgba literal after migration', () => {
      const all =
        SIDEBAR_NAV +
        SIDEBAR_HEADER +
        MODAL +
        FUND_WITHDRAW +
        DELETE_ACCOUNT +
        GLASS_CARD +
        ADMIN_SIDEBAR +
        ROUTE_FALLBACK;
      expect(all).toContain(NEW_JADE_RGBA);
    });
  });
});