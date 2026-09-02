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
    // Dev proxy: forward `/api/v1` to the FastAPI backend on :8000.
    // Mirrors the nginx prod reverse-proxy at `infra/nginx/nginx.conf`
    // so the SPA uses the same relative `/api/v1` base URL in both
    // environments. Without this, the dev bundle (which points at
    // `/api/v1` after the p0infra.4 fix) would 404 against Vite
    // itself.
    proxy: {
      '/api/v1': {
        // In this Docker setup the FastAPI backend is ONLY reachable via
        // nginx (container `jcs_oficial-backend-1`, port :8000 not published
        // to the host). Proxying to host:8000 returns ECONNREFUSED.
        // Routing through nginx (https://localhost:443) mirrors production
        // exactly — browser → nginx → backend — so dev is 1:1 with prod.
        // `secure: false` because nginx terminates TLS with a self-signed
        // cert in dev. No path rewrite: the relative `/api/v1/...` URLs
        // baked into the SPA pass through unchanged.
        target: 'https://localhost',
        changeOrigin: true,
        secure: false,
      },
    },
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
