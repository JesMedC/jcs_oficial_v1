import type { Config } from 'tailwindcss';

// Tokens pivoted per core-interface-redesign: primary cyan #00D4D8,
// display font Orbitron + Rajdhani + Space Grotesk (500/700/900),
// 3-tier pricing structure. The previous design-system-v1 jade
// primary (#00FF9D) was retired at Slice 1 of core-interface-redesign;
// all hex values now live in `src/styles/themes.css` and this config
// reads them via the brand-token CSS vars defined there.
//
// Wave 5 (design-system-v1) agrega soporte para modo light. Los
// tokens light viven en `src/styles/themes.css` como CSS vars
// (`--color-jade`, `--color-bg`, etc.) y se aplican vía
// `[data-theme="light"]` en el `<html>`. Esta config de Tailwind
// mantiene los valores dark como default — los hex actuales son los
// que el sistema sigue emitiendo — y deja que el theme store
// (`useThemeStore`) cambie el set activo de CSS vars.
//
// Por qué NO invertimos los tokens base a light + dark: variants:
//   - El contrato de `components-drift.test.ts` pinnea los hex
//     dark exactos. Cambiar el default los rompería.
//   - Los 121 componentes ya usan `bg-jade`, `text-text-primary`,
//     etc. Invertir el esquema requeriría un refactor masivo.
//   - Los componentes duales simplemente leen CSS vars
//     (`bg-[var(--color-bg)]`) cuando necesitan cambiar con el tema.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // design-system-v1 (Wave 5) — All brand tokens below now read
        // from CSS vars (defined in `src/styles/themes.css`) so a
        // single `[data-theme="light"]` / `[data-theme="dark"]` on
        // the `<html>` swaps every utility class automatically. The
        // hex values that used to live here are now in the CSS vars
        // (dark = Core Interface cyan per Slice 1 of
        // core-interface-redesign; light = WCAG-AA cyan variants).
        // Box shadows still carry the cyan rgba literals because the
        // glow is aesthetic-only — it stays cyan in both modes.
        bg: 'var(--color-bg)',
        abyssal: 'var(--color-abyssal)',
        jade: 'var(--color-jade)',
        surface: 'var(--color-surface)',
        'surface-el': 'var(--color-surface-el)',
        border: 'var(--color-border)',
        // design-system-v1 — form control background. Distinct from
        // `surface` so inputs sit visibly below cards on the same
        // surface stack (surface = cards, input = controls).
        input: 'var(--color-input)',
        // design-system-v1 — primary pivoted to neon Cyber-Jade.
        // Same five-step ladder as the jade era (#00FF9D +
        // mid-tone, lighter highlight, glow fallback) plus a
        // foreground token for text/iconography that sits on top of
        // primary surfaces.
        primary: {
          DEFAULT: 'var(--color-jade)',
          dk: 'var(--color-jade-dk)',
          light: 'var(--color-jade-light)',
          glow: 'var(--color-jade-glow)',
        },
        // Foreground color used for text/icons rendered ON primary
        // surfaces (buttons, badges, etc.). Dark in dark mode (contrast
        // over neon jade) / white in light mode (contrast over deep
        // jade).
        'primary-fg': 'var(--color-jade-text-on-primary)',
        // design-system-v1 — default jade border utility. Maps to the
        // border-line CSS var so light mode swaps the rgba alpha
        // (0.20 → 0.28) without breaking the contract that consumers
        // can write `border-borderJade` as a single utility.
        borderJade: 'var(--color-jade-border-line)',
        // Glassmorphism tokens (p0ui.1) — translucent surfaces with
        // backdrop blur. Applied selectively to chrome (sidebar,
        // modals, account cards, topbar). NEVER on financial tables,
        // P&L calendars, charts, or scanner alerts. Three opacities
        // (subtle/default/strong) plus matching border strengths.
        //
        // NOTE on the nested `border` object: the spec called for
        // flat hyphenated keys ('border-DEFAULT', 'border-subtle',
        // 'border-strong'), but Tailwind treats a hyphen in a key
        // literally — `'border-DEFAULT'` would emit
        // `border-glass-border-DEFAULT`, not the intended
        // `border-glass-border`. Nested objects with a `DEFAULT` key
        // collapse the suffix and emit the bare class name, which is
        // what the spec's intent requires.
        glass: {
          subtle: 'rgb(255 255 255 / 0.06)',
          DEFAULT: 'rgb(255 255 255 / 0.10)',
          strong: 'rgb(255 255 255 / 0.16)',
          border: {
            subtle: 'rgba(0, 212, 216, 0.08)',
            DEFAULT: 'rgba(0, 212, 216, 0.14)',
            strong: 'rgba(0, 212, 216, 0.22)',
          },
        },
        // Semantic finance colors (pivoted to cyan variants in dark,
        // deeper cyan variants in light for WCAG AA contrast on
        // white surfaces). Profit shifted from jade-green to
        // cyan-green for separation from the cyan primary.
        profit: 'var(--color-jade-profit)',
        loss: 'var(--color-jade-loss)',
        warning: 'var(--color-jade-warning)',
        info: 'var(--color-jade-info)',
        text: {
          primary: 'var(--color-jade-text-pri)',
          secondary: 'var(--color-jade-text-sec)',
          muted: 'var(--color-jade-text-mut)',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'Rajdhani', 'Space Grotesk', 'ui-monospace', 'monospace'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'monospace',
        ],
      },
      keyframes: {
        'aurora-drift': {
          '0%, 100%': { transform: 'translate3d(-10%, -5%, 0) scale(1)' },
          '50%': { transform: 'translate3d(10%, 5%, 0) scale(1.05)' },
        },
        'particle-drift': {
          '0%': { transform: 'translate3d(0,0,0)' },
          '100%': { transform: 'translate3d(40px,-30px,0)' },
        },
        // design-system-v1 (Wave 1, T1.4) — replaces the legacy
        // cyan-era spinner keyframe and is tightened per the
        // decorative-system spec: opacity 0.5 -> 1.0 -> 0.5 in a
        // 1.5s ease-in-out infinite loop. The predecessor keyframe
        // used a 0.6 minimum and a 2.4s cycle; both are gone. This
        // new keyframe is the halo animation inside <StatusDot>
        // (Wave 4) and the route-fallback spinner (consumed via the
        // generated `animate-status-dot-pulse` utility).
        'status-dot-pulse': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'shimmer-glass': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'auth-pulse': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0,212,216,0.5)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(0,212,216,0)' },
        },
        // design-system-v1 (Wave 5) — Jarvis HUD primitives.
        'hud-rotate': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
        'hud-scanline': {
          '0%': { top: '-2%' },
          '100%': { top: '102%' },
        },
        // jarvis-ui-redesign (T-11 refactor, post-deploy polish) —
        // subtle border pulse for the active sidebar nav item so it
        // reads as 'live / online' without blooming into the chrome.
        'jarvis-active-pulse': {
          '0%, 100%': { boxShadow: '0 0 12px rgba(0,212,216,0.35)' },
          '50%': { boxShadow: '0 0 20px rgba(0,212,216,0.55)' },
        },
        // Subtle marquee for the brand sub-header in PortalHeader.
        'jarvis-marquee': {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'particle-drift': 'particle-drift 12s ease-in-out infinite alternate',
        'status-dot-pulse': 'status-dot-pulse 1.5s ease-in-out infinite',
        'shimmer-glass': 'shimmer-glass 8s linear infinite',
        'auth-pulse': 'auth-pulse 1.2s ease-in-out infinite',
        // design-system-v1 (Wave 5) — Jarvis HUD primitives.
        'hud-rotate': 'hud-rotate 24s linear infinite',
        'hud-scanline': 'hud-scanline 4s linear infinite',
        'jarvis-active-pulse': 'jarvis-active-pulse 2.4s ease-in-out infinite',
        'jarvis-marquee': 'jarvis-marquee 30s linear infinite',
      },
      backgroundImage: {
        'aurora-static':
          'radial-gradient(60% 50% at 20% 30%, rgba(0,212,216,0.18), transparent 70%), radial-gradient(50% 40% at 80% 70%, rgba(0,184,255,0.12), transparent 70%)',
        'site-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,212,216,0.10) 50%, rgba(255,255,255,0.03) 100%)',
        'portal-selector':
          'radial-gradient(60% 50% at 50% 30%, rgba(0,212,216,0.16), transparent 70%), radial-gradient(50% 40% at 80% 80%, rgba(0,184,255,0.10), transparent 70%)',
      },
      backdropBlur: {
        'glass-sm': '8px',
        glass: '16px',
        'glass-lg': '24px',
        'glass-xl': '40px',
      },
      borderRadius: {
        '2xl': '1.25rem',
        glass: '1rem',
        'glass-lg': '1.25rem',
      },
      boxShadow: {
        // core-interface-redesign (Slice 1, T-025) — Core Interface
        // cyan glow utilities. The rgba values track primary.DEFAULT
        // (#00D4D8 = 0,212,216). Alphas tightened from the jade-era
        // 0.30 / 0.20 to 0.25 / 0.16 because cyan reads brighter than
        // jade at equal alpha and un-tightened glows blow out into
        // halos. `glow-cyan` is the new semantic alias of `glow-jade`;
        // the legacy name stays valid for one release cycle so the
        // 121+ existing call sites don't break.
        'glow-jade': '0 0 40px rgba(0,212,216,0.25)',
        'glow-jade-sm': '0 0 20px rgba(0,212,216,0.16)',
        'glow-cyan': '0 0 40px rgba(0,212,216,0.25)',
        glass: '0 8px 32px 0 rgba(6,11,16,0.45)',
        elevated: '0 12px 48px 0 rgba(6,11,16,0.60)',
        'glass-panel':
          '0 8px 32px 0 rgba(6,11,16,0.55), inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      fontSize: {
        'display-2xl': [
          '72px',
          { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'display-xl': ['56px', { lineHeight: '1.10', letterSpacing: '-0.01em', fontWeight: '700' }],
        'display-lg': ['44px', { lineHeight: '1.15', fontWeight: '600' }],
        'display-md': ['32px', { lineHeight: '1.20', fontWeight: '600' }],
      },
    },
  },
  plugins: [],
};

export default config;
