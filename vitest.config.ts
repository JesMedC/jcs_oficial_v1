import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
      },
      exclude: [
        'scripts/**',
        'src/test/**',
        '**/*.d.ts',
        'src/main.tsx',
        // Router is a runtime manifest + lazy wrappers; not unit-testable in jsdom.
        'src/router/**',
        // Sitemap is consumed by the postbuild script (which inlines its own copy).
        'src/lib/seo/sitemap.ts',
        // Static placeholder assets (no executable code).
        'public/**/*.placeholder',
      ],
    },
    server: {
      deps: {
        inline: ['@testing-library/react'],
      },
    },
  },
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
