/*
 * design-system-v1 (Wave 3c, T3c.1) — Home / Pricing / Features drift
 * cleanup contract.
 *
 * Wave 1+2 swapped the hex tokens + keyframes in `tailwind.config.ts`
 * and `src/styles/index.css`. Wave 3a retired the residual cyan +
 * old-jade rgba literals in the 4 layout files. Wave 3b did the same
 * for the 8 component files that ship jade chrome to the user
 * (portal sidebar, modal/dialog chrome, GlassCard, admin sidebar).
 *
 * Wave 3c retires the same literal families in the 10 home / pricing /
 * features / subscription files that ship jade SVG-bearing chrome on
 * the public landing page and the registered-user upgrade path.
 *
 * The forbidden patterns are:
 *   - cyan rgba `rgba(0,255,255,*)`
 *   - pre-pivot old-jade rgba `rgba(46,220,140,*)`
 *   - cyan hex `#00FFFF`
 *   - old-jade hex `#2EDC8C`
 *   - inline SVG stroke `stroke="#00FFFF"`
 *
 * Each match is swapped for the new neon Cyber-Jade either at the
 * equivalent `rgba(0,255,157,*)` triplet (alpha preserved per
 * instance) or at the `#00FF9D` hex (for inline SVG stroke/fill
 * attributes that do not accept rgba alpha). These tests pin the
 * post-migration contract so a future drift cannot re-introduce the
 * old colours without tripping CI — mirroring the Wave 3a
 * `layout-drift.test.ts` and Wave 3b `components-drift.test.ts`
 * patterns.
 *
 * The assertions read each component file as plain text. They are
 * migration-contract pins, not behavioural tests — the goal is to
 * keep the colour tokens in sync with the Cyber-Jade spec, not to
 * re-verify React's render behaviour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// `src/test/` is the anchor; `..` lands at `src/`. From there,
// `components/{home,pricing,features}/<file>.tsx` and
// `features/subscription/<file>.tsx` are reachable.
const SRC_DIR = resolve(__dirname, '..');
const PRICING_DIR = resolve(SRC_DIR, 'components', 'pricing');
const FEATURES_DIR = resolve(SRC_DIR, 'components', 'features');
const HOME_DIR = resolve(SRC_DIR, 'components', 'home');
const SUBSCRIPTION_DIR = resolve(SRC_DIR, 'features', 'subscription');

function readSource(dir: string, filename: string): string {
  return readFileSync(resolve(dir, filename), 'utf8');
}

const PRICING_TIER = readSource(PRICING_DIR, 'PricingTier.tsx');
const COMPARISON_TABLE = readSource(PRICING_DIR, 'ComparisonTable.tsx');
const BILLING_CYCLE_TOGGLE = readSource(PRICING_DIR, 'BillingCycleToggle.tsx');
const FEATURE_CARD = readSource(FEATURES_DIR, 'FeatureCard.tsx');
const UPGRADE_CARD = readSource(SUBSCRIPTION_DIR, 'UpgradeCard.tsx');
const HERO = readSource(HOME_DIR, 'Hero.tsx');
const FEATURES_GRID = readSource(HOME_DIR, 'FeaturesGrid.tsx');
const CTA_STRIP = readSource(HOME_DIR, 'CtaStrip.tsx');
const CONTACT_TEASER = readSource(HOME_DIR, 'ContactTeaser.tsx');
const DASHBOARD_PREVIEW = readSource(HOME_DIR, 'DashboardPreview.tsx');

const OLD_CYAN_RGBA = 'rgba(0,255,255';
const OLD_JADE_RGBA = 'rgba(46,220,140';
const HEX_CYAN = '#00FFFF';
const HEX_OLD_JADE = '#2EDC8C';
const STROKE_CYAN = 'stroke="#00FFFF"';
const NEW_JADE_RGBA = 'rgba(0,255,157';
const NEW_JADE_HEX = '#00FF9D';

describe('home / pricing / features / subscription — Wave 3c drift cleanup contract', () => {
  describe('src/components/pricing/PricingTier.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(PRICING_TIER).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(PRICING_TIER).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(PRICING_TIER).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(PRICING_TIER).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade "Mas elegido" badge shadow on the featured tier', () => {
      // The featured-tier badge carried a cyan shadow at 0.45 alpha; the
      // migration swaps it to neon jade at the same alpha.
      expect(PRICING_TIER).toContain(
        'shadow-[0_0_16px_rgba(0,255,157,0.45)]',
      );
    });

    it('pins the neon-jade featured-tier card shadow (0.30 alpha)', () => {
      expect(PRICING_TIER).toContain(
        'shadow-[0_0_40px_rgba(0,255,157,0.30)]',
      );
    });

    it('pins the neon-jade featured-tier CTA hover shadow (0.5 alpha)', () => {
      expect(PRICING_TIER).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });

    it('pins the neon-jade feature-list Check SVG stroke', () => {
      expect(PRICING_TIER).toContain('stroke="#00FF9D"');
    });
  });

  describe('src/components/pricing/ComparisonTable.tsx (feature grid — NOT a DataTable candidate)', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(COMPARISON_TABLE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(COMPARISON_TABLE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(COMPARISON_TABLE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(COMPARISON_TABLE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade Tick SVG stroke (included)', () => {
      expect(COMPARISON_TABLE).toContain('stroke="#00FF9D"');
    });

    it('pins the neon-jade Cross SVG stroke (NOT included)', () => {
      // The Cross cell also rendered a cyan stroke (with strokeOpacity 0.4).
      // The migration swaps the hex value to neon jade while keeping the
      // strokeOpacity intact at 0.4. This is a separate stroke line from
      // the Tick (each in its own SVG block); a single `#00FF9D` would not
      // appear if the migration were incomplete.
      expect(COMPARISON_TABLE).toContain('stroke="#00FF9D"');
      expect(COMPARISON_TABLE).toContain('strokeOpacity="0.4"');
    });

    it('keeps the underlying <table> element — ComparisonTable is a feature grid, not a DataTable candidate', () => {
      // Per design §11.4 the pricing ComparisonTable is a feature-vs-feature
      // grid and stays a native `<table>`; Wave 5.12 explicitly skips it.
      expect(COMPARISON_TABLE).toMatch(/<table/);
      expect(COMPARISON_TABLE).toMatch(/<thead/);
      expect(COMPARISON_TABLE).toMatch(/<tbody/);
    });
  });

  describe('src/components/pricing/BillingCycleToggle.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(BILLING_CYCLE_TOGGLE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(BILLING_CYCLE_TOGGLE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(BILLING_CYCLE_TOGGLE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(BILLING_CYCLE_TOGGLE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade active-toggle shadow (0.45 alpha)', () => {
      // The active BillingCycle toggle button had a cyan shadow; the
      // migration swaps it to neon jade at the same alpha.
      expect(BILLING_CYCLE_TOGGLE).toContain(
        'shadow-[0_0_16px_rgba(0,255,157,0.45)]',
      );
    });
  });

  describe('src/components/features/FeatureCard.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(FEATURE_CARD).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(FEATURE_CARD).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(FEATURE_CARD).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(FEATURE_CARD).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade icon stroke on the FeatureCard SVG', () => {
      // Per the file comment the icon was "cyan SVG"; the migration
      // swaps it to neon jade hex (no rgba alpha needed — stroke-opacity
      // is inherited from className=utils).
      expect(FEATURE_CARD).toContain('stroke="#00FF9D"');
    });
  });

  describe('src/features/subscription/UpgradeCard.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(UPGRADE_CARD).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(UPGRADE_CARD).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(UPGRADE_CARD).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(UPGRADE_CARD).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade card chrome shadow on the Plus/Elite tier (0.30 alpha)', () => {
      // The upgrade card border glow was cyan at 0.30 alpha; migrated to
      // neon jade at the same alpha.
      expect(UPGRADE_CARD).toContain(
        'shadow-[0_0_40px_rgba(0,255,157,0.30)]',
      );
    });

    it('pins the neon-jade CTA hover shadow on the upgrade button (0.5 alpha)', () => {
      expect(UPGRADE_CARD).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });

    it('pins the neon-jade feature-list Check SVG stroke', () => {
      expect(UPGRADE_CARD).toContain('stroke="#00FF9D"');
    });
  });

  describe('src/components/home/Hero.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(HERO).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(HERO).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(HERO).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(HERO).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade h1 text-shadow (0.4 alpha)', () => {
      // The hero heading carried a soft jade text-shadow at 0.4 alpha; the
      // migration swaps it to neon jade at the same alpha.
      expect(HERO).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });

    it('pins the neon-jade hero CTA hover shadow (0.5 alpha)', () => {
      expect(HERO).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/components/home/FeaturesGrid.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(FEATURES_GRID).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(FEATURES_GRID).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(FEATURES_GRID).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(FEATURES_GRID).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade FeatureIcon SVG stroke', () => {
      // Per the file comment each card carried a "jade SVG icon"; the old
      // hex was #2EDC8C. The migration swaps to the new jade hex.
      expect(FEATURES_GRID).toContain('stroke="#00FF9D"');
    });
  });

  describe('src/components/home/CtaStrip.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(CTA_STRIP).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(CTA_STRIP).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(CTA_STRIP).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(CTA_STRIP).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade h2 text-shadow (0.35 alpha)', () => {
      expect(CTA_STRIP).toContain(
        "style={{ textShadow: '0 0 16px rgba(0,255,157,0.35)' }}",
      );
    });

    it('pins the neon-jade CTA hover shadow (0.5 alpha)', () => {
      expect(CTA_STRIP).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/components/home/ContactTeaser.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(CONTACT_TEASER).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(CONTACT_TEASER).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(CONTACT_TEASER).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(CONTACT_TEASER).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade Contactar CTA hover shadow (0.5 alpha)', () => {
      // The "Contactar" CTA was the only className in the file carrying
      // a literal shadow; the migration swaps it to neon jade.
      expect(CONTACT_TEASER).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/components/home/DashboardPreview.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(DASHBOARD_PREVIEW).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(DASHBOARD_PREVIEW).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(DASHBOARD_PREVIEW).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(DASHBOARD_PREVIEW).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade Sparkline path stroke', () => {
      // The Sparkline SVG path stroke was the only literal hex in the file;
      // the migration swaps it to neon jade.
      expect(DASHBOARD_PREVIEW).toContain('stroke="#00FF9D"');
    });
  });

  describe('whole Wave 3c scope — final guard', () => {
    it('the five forbidden literal patterns collectively return zero matches across the 10 files', () => {
      const all =
        PRICING_TIER +
        COMPARISON_TABLE +
        BILLING_CYCLE_TOGGLE +
        FEATURE_CARD +
        UPGRADE_CARD +
        HERO +
        FEATURES_GRID +
        CTA_STRIP +
        CONTACT_TEASER +
        DASHBOARD_PREVIEW;
      expect(all).not.toContain(OLD_CYAN_RGBA);
      expect(all).not.toContain(OLD_JADE_RGBA);
      expect(all).not.toContain(HEX_CYAN);
      expect(all).not.toContain(HEX_OLD_JADE);
      expect(all).not.toContain(STROKE_CYAN);
    });

    it('the 10 files contain at least one neon-jade rgba literal after migration', () => {
      const all =
        PRICING_TIER +
        COMPARISON_TABLE +
        BILLING_CYCLE_TOGGLE +
        FEATURE_CARD +
        UPGRADE_CARD +
        HERO +
        FEATURES_GRID +
        CTA_STRIP +
        CONTACT_TEASER +
        DASHBOARD_PREVIEW;
      expect(all).toContain(NEW_JADE_RGBA);
    });

    it('the 10 files contain at least one neon-jade hex literal after migration', () => {
      const all =
        PRICING_TIER +
        COMPARISON_TABLE +
        BILLING_CYCLE_TOGGLE +
        FEATURE_CARD +
        UPGRADE_CARD +
        HERO +
        FEATURES_GRID +
        CTA_STRIP +
        CONTACT_TEASER +
        DASHBOARD_PREVIEW;
      expect(all).toContain(NEW_JADE_HEX);
    });
  });
});
