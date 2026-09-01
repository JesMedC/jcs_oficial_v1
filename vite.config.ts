import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// `vite-plugin-prerender` is installed (see package.json devDependencies) but
// intentionally NOT wired into `plugins[]` during p1a. Two blockers prevent
// its use here:
//   1. The published `dist/index.mjs` ships a broken ESM/CJS hybrid
//      (uses `require()` at the top level) that fails under our
//      `"type": "module"` setup. Loading the CJS build via `createRequire`
//      works for *config load* but the plugin then spawns headless Chrome
//      via puppeteer at build time, which is not available in this env.
//   2. The route components for `/`, `/pricing`, `/features` are not yet
//      implemented — they land in p1c. Any prerender attempt now would
//      produce 404 pages.
//
// In p1c we will reintroduce the plugin (via the createRequire shim or a
// drop-in replacement) once Chrome is available and the routes exist.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: {
    port: 5173,
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers', 'dompurify'],
          'vendor-seo': ['react-helmet-async'],
        },
      },
    },
  },
});
