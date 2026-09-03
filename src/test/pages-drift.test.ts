/*
 * design-system-v1 (Wave 3d, T3d.1) — Pages / Auth / landing drift
 * cleanup contract.
 *
 * Wave 1+2 swapped the hex tokens + keyframes in `tailwind.config.ts`
 * and `src/styles/index.css`. Wave 3a retired the residual cyan +
 * old-jade rgba literals in the 4 layout files. Wave 3b did the same
 * for the 8 component files that ship jade chrome to the user
 * (portal sidebar, modal/dialog chrome, GlassCard, admin sidebar).
 * Wave 3c handled the 10 home / pricing / features / subscription
 * files that ship jade SVG-bearing chrome on the public landing page
 * and the registered-user upgrade path.
 *
 * Wave 3d retires the same literal families in the 14 files that
 * ship jade chrome on every authenticated page surface (dashboard,
 * upgrade, accounts, login, register, portal stubs), the public auth
 * surfaces (PortalSelector, RegisterPage, LoginPage, UpgradePage,
 * NotFoundPage, FeaturesPage, PricingPage), and the standalone
 * SubscriptionCard + about/MissionSection SVGs that ship on the
 * public About landing.
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
 * instance) or at the `#00FF9D` hex (for inline SVG stroke / stopColor
 * / fill attributes that do not accept rgba alpha). These tests pin
 * the post-migration contract so a future drift cannot re-introduce
 * the old colours without tripping CI — mirroring the Wave 3a
 * `layout-drift.test.ts`, Wave 3b `components-drift.test.ts`, and
 * Wave 3c `home-svg-drift.test.ts` patterns.
 *
 * The assertions read each file as plain text. They are migration-
 * contract pins, not behavioural tests — the goal is to keep the
 * colour tokens in sync with the Cyber-Jade spec, not to re-verify
 * React's render behaviour.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// `src/test/` is the anchor; `..` lands at `src/`. From there, the
// 14 files in scope are reachable via:
//   `pages/<file>.tsx` (5 files)
//   `pages/portal/<file>.tsx` (5 files)
//   `features/auth/PortalSelector.tsx`
//   `features/subscription/SubscriptionCard.tsx`
//   `components/about/MissionSection.tsx`
const SRC_DIR = resolve(__dirname, '..');
const PAGES_DIR = resolve(SRC_DIR, 'pages');
const PORTAL_PAGES_DIR = resolve(PAGES_DIR, 'portal');
const FEATURES_AUTH_DIR = resolve(SRC_DIR, 'features', 'auth');
const FEATURES_SUB_DIR = resolve(SRC_DIR, 'features', 'subscription');
const COMPONENTS_ABOUT_DIR = resolve(SRC_DIR, 'components', 'about');

function readSource(dir: string, relativePath: string): string {
  return readFileSync(resolve(dir, relativePath), 'utf8');
}

const PRICING_PAGE = readSource(PAGES_DIR, 'PricingPage.tsx');
const REGISTER_PAGE = readSource(PAGES_DIR, 'RegisterPage.tsx');
const DASHBOARD_PAGE = readSource(PORTAL_PAGES_DIR, 'DashboardPage.tsx');
const UPGRADE_PAGE = readSource(PAGES_DIR, 'UpgradePage.tsx');
const PORTAL_SELECTOR = readSource(FEATURES_AUTH_DIR, 'PortalSelector.tsx');
const DIARIO_PAGE = readSource(PORTAL_PAGES_DIR, 'DiarioPage.tsx');
const PLAYBOOK_PAGE = readSource(PORTAL_PAGES_DIR, 'PlaybookPage.tsx');
const LOGIN_PAGE = readSource(PAGES_DIR, 'LoginPage.tsx');
const CUENTAS_PAGE = readSource(PORTAL_PAGES_DIR, 'CuentasPage.tsx');
const CUENTAS_DETAIL_PAGE = readSource(PORTAL_PAGES_DIR, 'CuentasDetailPage.tsx');
const FEATURES_PAGE = readSource(PAGES_DIR, 'FeaturesPage.tsx');
const NOT_FOUND_PAGE = readSource(PAGES_DIR, 'NotFoundPage.tsx');
const MISSION_SECTION = readSource(COMPONENTS_ABOUT_DIR, 'MissionSection.tsx');
const SUBSCRIPTION_CARD = readSource(FEATURES_SUB_DIR, 'SubscriptionCard.tsx');

const OLD_CYAN_RGBA = 'rgba(0,255,255';
const OLD_JADE_RGBA = 'rgba(46,220,140';
const HEX_CYAN = '#00FFFF';
const HEX_OLD_JADE = '#2EDC8C';
const STROKE_CYAN = 'stroke="#00FFFF"';
const NEW_JADE_RGBA = 'rgba(0,255,157';
const NEW_JADE_HEX = '#00FF9D';

describe('pages / auth / about — Wave 3d drift cleanup contract', () => {
  describe('src/pages/PricingPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(PRICING_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(PRICING_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(PRICING_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(PRICING_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      // The page hero carried a cyan text-shadow on the H1; the migration
      // swaps it to neon jade at the same alpha.
      expect(PRICING_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/RegisterPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(REGISTER_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(REGISTER_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(REGISTER_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(REGISTER_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(REGISTER_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/portal/DashboardPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(DASHBOARD_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(DASHBOARD_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(DASHBOARD_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(DASHBOARD_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(DASHBOARD_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });

    it('pins the neon-jade "Cerrar sesion" CTA hover shadow (0.5 alpha)', () => {
      // The dashboard "Cerrar sesion" button carried a cyan hover shadow;
      // the migration swaps it to neon jade at the same alpha.
      expect(DASHBOARD_PAGE).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/pages/UpgradePage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(UPGRADE_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(UPGRADE_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(UPGRADE_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(UPGRADE_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(UPGRADE_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/features/auth/PortalSelector.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(PORTAL_SELECTOR).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(PORTAL_SELECTOR).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(PORTAL_SELECTOR).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(PORTAL_SELECTOR).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      // The BOTH-role portal selector H1 carried a cyan text-shadow; the
      // migration swaps it to neon jade at the same alpha.
      expect(PORTAL_SELECTOR).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/portal/DiarioPage.tsx (portal stub)', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(DIARIO_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(DIARIO_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(DIARIO_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(DIARIO_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      // The Diario stub H1 carried an old-jade text-shadow; migrated to
      // neon jade at the same alpha.
      expect(DIARIO_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/portal/PlaybookPage.tsx (portal stub)', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(PLAYBOOK_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(PLAYBOOK_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(PLAYBOOK_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(PLAYBOOK_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(PLAYBOOK_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/LoginPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(LOGIN_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(LOGIN_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(LOGIN_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(LOGIN_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(LOGIN_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/portal/CuentasPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(CUENTAS_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(CUENTAS_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(CUENTAS_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      // The file docstring referenced the pre-pivot hex `#2EDC8C` as a
      // prose note. The migration replaces the literal so the
      // post-cleanup grep guard stays clean. The prose narrative is
      // preserved — only the colour token reference is generalised.
      expect(CUENTAS_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(CUENTAS_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });

    it('pins the neon-jade "Crear cuenta" CTA hover shadow (0.5 alpha)', () => {
      expect(CUENTAS_PAGE).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/pages/portal/CuentasDetailPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(CUENTAS_DETAIL_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(CUENTAS_DETAIL_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(CUENTAS_DETAIL_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(CUENTAS_DETAIL_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade "Cuenta no encontrada" H1 text-shadow (0.4 alpha)', () => {
      // The 404 branch of the detail page carried an old-jade text-shadow.
      expect(CUENTAS_DETAIL_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });

    it('pins the neon-jade account-name H1 text-shadow (0.4 alpha)', () => {
      // The detail header H1 carries the same neon-jade glow.
      const matches = CUENTAS_DETAIL_PAGE.match(
        /style=\{\{ textShadow: '0 0 20px rgba\(0,255,157,0\.4\)' \}\}/g,
      );
      expect(matches).not.toBeNull();
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });

    it('pins the neon-jade balance value text-shadow (0.3 alpha)', () => {
      // The SaldoTab balance display carries a tighter 0.3 alpha glow.
      expect(CUENTAS_DETAIL_PAGE).toContain(
        "style={{ textShadow: '0 0 16px rgba(0,255,157,0.3)' }}",
      );
    });

    it('pins the neon-jade "Fondear" CTA hover shadow (0.5 alpha)', () => {
      expect(CUENTAS_DETAIL_PAGE).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/pages/FeaturesPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(FEATURES_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(FEATURES_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(FEATURES_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(FEATURES_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(FEATURES_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });
  });

  describe('src/pages/NotFoundPage.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(NOT_FOUND_PAGE).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(NOT_FOUND_PAGE).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(NOT_FOUND_PAGE).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(NOT_FOUND_PAGE).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade H1 text-shadow (0.4 alpha)', () => {
      expect(NOT_FOUND_PAGE).toContain(
        "style={{ textShadow: '0 0 20px rgba(0,255,157,0.4)' }}",
      );
    });

    it('pins the neon-jade "Volver al inicio" CTA hover shadow (0.5 alpha)', () => {
      expect(NOT_FOUND_PAGE).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });
  });

  describe('src/components/about/MissionSection.tsx (ChartLine SVG)', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(MISSION_SECTION).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(MISSION_SECTION).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(MISSION_SECTION).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(MISSION_SECTION).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade chart-line SVG stroke on the outer <svg>', () => {
      // The ChartLine outer <svg> carried an old-jade stroke attribute;
      // the migration swaps it to the new neon-jade hex.
      expect(MISSION_SECTION).toContain('stroke="#00FF9D"');
    });

    it('pins the neon-jade linearGradient stopColor (0.4 alpha)', () => {
      // The jadeFill gradient stop at 0% carries stopColor + stopOpacity
      // 0.4. Migration swaps the hex to neon jade while keeping the
      // stopOpacity intact.
      expect(MISSION_SECTION).toContain('stopColor="#00FF9D"');
      expect(MISSION_SECTION).toContain('stopOpacity="0.4"');
    });

    it('pins the neon-jade linearGradient stopColor (0 alpha)', () => {
      // The jadeFill gradient stop at 100% carries stopColor + stopOpacity
      // 0. Migration swaps the hex to neon jade while keeping the
      // stopOpacity intact.
      expect(MISSION_SECTION).toContain('stopColor="#00FF9D"');
      expect(MISSION_SECTION).toContain('stopOpacity="0"');
    });

    it('pins the neon-jade data-point circle fills', () => {
      // The two highlight circles in the SVG carried fill="#2EDC8C"; the
      // migration swaps them to neon jade hex.
      const matches = MISSION_SECTION.match(/fill="#00FF9D"/g);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('src/features/subscription/SubscriptionCard.tsx', () => {
    it('contains NO cyan rgba literals (post-migration)', () => {
      expect(SUBSCRIPTION_CARD).not.toContain(OLD_CYAN_RGBA);
    });

    it('contains NO old-jade rgba literals (post-migration)', () => {
      expect(SUBSCRIPTION_CARD).not.toContain(OLD_JADE_RGBA);
    });

    it('contains NO #00FFFF literals (post-migration)', () => {
      expect(SUBSCRIPTION_CARD).not.toContain(HEX_CYAN);
    });

    it('contains NO #2EDC8C literals (post-migration)', () => {
      expect(SUBSCRIPTION_CARD).not.toContain(HEX_OLD_JADE);
    });

    it('pins the neon-jade "Activar suscripcion" CTA hover shadow (0.5 alpha)', () => {
      // The null-subscription branch CTA carried a cyan hover shadow.
      expect(SUBSCRIPTION_CARD).toContain(
        'hover:shadow-[0_0_24px_rgba(0,255,157,0.5)]',
      );
    });

    it('pins the neon-jade status CTA hover shadow (0.5 alpha)', () => {
      // The status-driven CTA (TRIAL/ACTIVE/CANCELED/EXPIRED) carried
      // the same cyan hover shadow.
      const matches = SUBSCRIPTION_CARD.match(
        /hover:shadow-\[0_0_24px_rgba\(0,255,157,0\.5\)\]/g,
      );
      expect(matches).not.toBeNull();
      expect(matches?.length).toBe(2);
    });
  });

  describe('whole Wave 3d scope — final guard', () => {
    const ALL = [
      PRICING_PAGE,
      REGISTER_PAGE,
      DASHBOARD_PAGE,
      UPGRADE_PAGE,
      PORTAL_SELECTOR,
      DIARIO_PAGE,
      PLAYBOOK_PAGE,
      LOGIN_PAGE,
      CUENTAS_PAGE,
      CUENTAS_DETAIL_PAGE,
      FEATURES_PAGE,
      NOT_FOUND_PAGE,
      MISSION_SECTION,
      SUBSCRIPTION_CARD,
    ].join('\n');

    it('the five forbidden literal patterns collectively return zero matches across the 14 files', () => {
      expect(ALL).not.toContain(OLD_CYAN_RGBA);
      expect(ALL).not.toContain(OLD_JADE_RGBA);
      expect(ALL).not.toContain(HEX_CYAN);
      expect(ALL).not.toContain(HEX_OLD_JADE);
      expect(ALL).not.toContain(STROKE_CYAN);
    });

    it('the 14 files contain at least one neon-jade rgba literal after migration', () => {
      expect(ALL).toContain(NEW_JADE_RGBA);
    });

    it('the 14 files contain at least one neon-jade hex literal after migration', () => {
      expect(ALL).toContain(NEW_JADE_HEX);
    });
  });
});
