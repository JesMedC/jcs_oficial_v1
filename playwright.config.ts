import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config — Portal JCS FASE 4A polish.
 *
 * - testDir: tests/e2e (sibling of src/, isolated from vitest unit tests).
 * - baseURL: vite dev server.
 * - webServer: arranca `pnpm dev` si no hay nada escuchando en :5173.
 *   reuseExistingServer=true permite reuso en local con `pnpm dev` manual.
 * - Single project: chromium desktop (suficiente para smoke E2E FASE 4A).
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
