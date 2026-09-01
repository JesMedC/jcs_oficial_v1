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
        primary: {
          DEFAULT: '#00FFFF',
          dk: '#00B8B8',
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
      borderRadius: { '2xl': '1.25rem' },
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
      boxShadow: {
        'glow-cyan': '0 0 40px rgba(0,255,255,0.30)',
        'glow-cyan-sm': '0 0 20px rgba(0,255,255,0.20)',
        glass: '0 8px 32px 0 rgba(8,13,18,0.45)',
        elevated: '0 12px 48px 0 rgba(8,13,18,0.60)',
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
