import type { Config } from 'tailwindcss';

// Tokens locked per design override (mem #70): primary cyan #00FFFF,
// display font Orbitron (500/700/900), 3-tier pricing structure.
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#080D12',
        surface: '#0D141B',
        'surface-el': '#111B24',
        border: '#1C2A35',
        // portal-fase0a-base — primary pivoted cyan -> jade.
        // Same five-step ladder as the cyan theme had (#2EDC8C +
        // mid-tone, lighter highlight, glow fallback) plus a
        // foreground token for text/iconography that sits on top of
        // primary surfaces.
        primary: {
          DEFAULT: '#2EDC8C',
          dk: '#25B070',
          light: '#7FE9B5',
          glow: '#2EDC8C',
        },
        // Foreground color used for text/icons rendered ON primary
        // surfaces (buttons, badges, etc.). Dark to keep contrast
        // acceptable against the bright jade.
        'primary-fg': '#080D12',
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
        // Semantic finance colors (kept):
        profit: '#35D07F',
        loss: '#FF5C5C',
        warning: '#F3B94E',
        info: '#4DA3FF',
        text: {
          primary: '#E9F1F7',
          secondary: '#8FA1B2',
          muted: '#607080',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'ui-monospace', 'monospace'],
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
        'pulse-cyan': {
          '0%, 100%': { opacity: '0.6' },
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
        'pulse-cyan': 'pulse-cyan 2.4s ease-in-out infinite',
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
        // portal-fase0a-base — jade glow utilities. Old `glow-cyan*`
        // entries are intentionally retained as visual-equivalent
        // aliases; they are removed in Waves 1c/1d when their consumers
        // (styleguide + page-level CTA hooks) pivot to jade tokens.
        'glow-jade': '0 0 40px rgba(46,220,140,0.30)',
        'glow-jade-sm': '0 0 20px rgba(46,220,140,0.20)',
        'glow-cyan': '0 0 40px rgba(46,220,140,0.30)',
        'glow-cyan-sm': '0 0 20px rgba(46,220,140,0.20)',
        glass: '0 8px 32px 0 rgba(8,13,18,0.45)',
        elevated: '0 12px 48px 0 rgba(8,13,18,0.60)',
        'glass-panel':
          '0 8px 32px 0 rgba(8,13,18,0.55), inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
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
