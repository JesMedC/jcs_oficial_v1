/* eslint-disable react-hooks/rules-of-hooks */
// `use()` here is Playwright's fixture lifecycle helper, NOT React's Hooks API.
// The react-hooks plugin can't tell them apart because both share the `use`
// identifier. We disable the rule for this file only.
import { test as base, expect } from '@playwright/test';
import { createTestUserAndLogin, type TestUser } from './helpers';

/**
 * Playwright fixtures — auto-provision an authenticated session per test.
 *
 * Why sessionStorage and not storageState? storageState JSON only carries
 * cookies + localStorage, but the SPA stores its JWT in `sessionStorage`
 * (see src/lib/api/client.ts: `sessionStorage.setItem(ACCESS_TOKEN_KEY, …)`).
 * We use `page.addInitScript` so the token is injected BEFORE the SPA's
 * first paint, avoiding a flicker through /login.
 */
type AuthFixtures = {
  testUser: TestUser;
  authenticatedPage: import('@playwright/test').Page;
};

export const test = base.extend<AuthFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testUser: async ({}, use) => {
    const user = await createTestUserAndLogin();
    await use(user);
  },

  page: async ({ page, testUser }, use) => {
    // Runs before any document script on every navigation in this page.
    // AuthProvider's bootstrap needs BOTH tokens: refresh → mint new
    // access → load /me. Missing refresh → user stays anonymous → /login.
    // (See src/features/auth/AuthProvider.tsx: `tokenStore.getRefresh()`.)
    await page.addInitScript(
      ({ access, refresh }) => {
        try {
          sessionStorage.setItem('jcs.auth.access_token', access);
          sessionStorage.setItem('jcs.auth.refresh_token', refresh);
        } catch {
          /* sessionStorage not available — fail later in the SPA. */
        }
      },
      { access: testUser.accessToken, refresh: testUser.refreshToken },
    );
    await use(page);
  },
});

export { expect };
