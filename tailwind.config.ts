import type { Config } from 'tailwindcss';

// Tokens locked per Cyber-Jade spec (design-system-v1): primary #00FF9D,
// display font Orbitron + Rajdhani + Space Grotesk (500/700/900),
// 3-tier pricing structure.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#060B10',
        surface: '#0D151E',
        'surface-el': '#111B24',
        border: '#1C2A35',
        // design-system-v1 — form control background. Distinct from
        // `surface` so inputs sit visibly below cards on the same
        // surface stack (surface = cards, input = controls).
        input: '#0A1017',
        // design-system-v1 — primary pivoted to neon Cyber-Jade.
        // Same five-step ladder as the jade era (#00FF9D +
        // mid-tone, lighter highlight, glow fallback) plus a
        // foreground token for text/iconography that sits on top of
        // primary surfaces.
        primary: {
          DEFAULT: '#00FF9D',
          dk: '#00CC7E',
          light: '#5CFFBE',
          glow: '#00FF9D',
        },
        // Foreground color used for text/icons rendered ON primary
        // surfaces (buttons, badges, etc.). Dark to keep contrast
        // acceptable against the bright neon jade.
        'primary-fg': '#060B10',
        // design-system-v1 — default jade border utility. The
        // camelCase key emits the Tailwind utility `border-borderJade`
        // (Tailwind 3's nested-key trap would mangle a flat hyphen
        // key like `border-jade` into `border-glass-border-jade`).
        // See design.md §9.8 / §11.7 for the rationale.
        borderJade: 'rgba(0, 255, 157, 0.2)',
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
            subtle: 'rgb(255 255 255 / 0.08)',
            DEFAULT: 'rgb(255 255 255 / 0.14)',
            strong: 'rgb(255 255 255 / 0.22)',
          },
        },
        // Semantic finance colors (pivoted to neon variants):
        profit: '#35D07F',
        loss: '#FF2A55',
        warning: '#F3B94E',
        info: '#00B8FF',
        text: {
          primary: '#E0E6ED',
          secondary: '#8A9BA8',
          muted: '#607080',
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
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0,255,255,0.5)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(0,255,255,0)' },
        },
      },
      animation: {
        'aurora-drift': 'aurora-drift 18s ease-in-out infinite',
        'particle-drift': 'particle-drift 12s ease-in-out infinite alternate',
        'status-dot-pulse': 'status-dot-pulse 1.5s ease-in-out infinite',
        'shimmer-glass': 'shimmer-glass 8s linear infinite',
        'auth-pulse': 'auth-pulse 1.2s ease-in-out infinite',
      },
      backgroundImage: {
        'aurora-static':
          'radial-gradient(60% 50% at 20% 30%, rgba(0,255,255,0.18), transparent 70%), radial-gradient(50% 40% at 80% 70%, rgba(77,163,255,0.12), transparent 70%)',
        'site-gradient':
          'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(0,255,255,0.10) 50%, rgba(255,255,255,0.03) 100%)',
        'portal-selector':
          'radial-gradient(60% 50% at 50% 30%, rgba(0,255,255,0.16), transparent 70%), radial-gradient(50% 40% at 80% 80%, rgba(77,163,255,0.10), transparent 70%)',
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
        // design-system-v1 — neon Cyber-Jade glow utilities. The rgba
        // values track the new primary.DEFAULT (#00FF9D = 0,255,157),
        // not the pre-pivot soft-jade (rgb 46,220,140). The legacy
        // `glow-cyan*` aliases are visual-equivalent duplicates scheduled
        // for removal in Wave 2 (T2.1) — left in place here so consumers
        // migrate first.
        'glow-jade': '0 0 40px rgba(0,255,157,0.30)',
        'glow-jade-sm': '0 0 20px rgba(0,255,157,0.20)',
        'glow-cyan': '0 0 40px rgba(46,220,140,0.30)',
        'glow-cyan-sm': '0 0 20px rgba(46,220,140,0.20)',
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
