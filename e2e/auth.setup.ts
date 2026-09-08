import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const AUTH_FILE = 'e2e/.auth/producer.json';

const E2E_EMAIL = process.env.E2E_EMAIL ?? 'e2e@trazo.test';
const E2E_PASSWORD = process.env.E2E_PASSWORD ?? 'E2Epass!2026';

/**
 * Sign in through the real form and persist the cookie jar.
 *
 * Deliberately NOT minting JWTs directly. A previous session tried that (2026-09-01) and it
 * broke on 2026-09-07 — the minted cookies stopped matching what the server issues, and the
 * failure looked like a product bug for an hour. Signing in through the form is both simpler
 * and more faithful: it exercises the cookie flags, the CSRF path and the redirect the
 * product actually uses.
 */
setup('authenticate as producer', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });

  await page.goto('/auth/signin');

  // driver.js product tours render an overlay that swallows clicks. Kill them before the
  // first interaction rather than fighting the overlay in every spec.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('tour_completed', 'true');
      window.localStorage.setItem('hasSeenTour', 'true');
      window.localStorage.setItem('driver_tour_done', 'true');
    } catch {
      /* private mode / blocked storage — the tour is cosmetic, carry on */
    }
  });

  await page.getByRole('textbox', { name: /email/i }).fill(E2E_EMAIL);
  await page.locator('input[type="password"]').first().fill(E2E_PASSWORD);
  await page
    .getByRole('button', { name: /sign in|log in|iniciar/i })
    .first()
    .click();

  // Success is defined as leaving /auth/signin, not as any one dashboard widget appearing —
  // the landing route differs by company/onboarding state and asserting a widget here makes
  // the auth setup fail for reasons that are not auth.
  await expect(page).not.toHaveURL(/\/auth\/signin/, { timeout: 30_000 });

  // The product uses httpOnly cookies and never touches tokens in JS, so the only proof the
  // session is real is that the server accepts it. Assert that, not localStorage.
  const me = await page.request.get('/api/users/me/');
  expect(
    me.ok(),
    `Signed-in session was rejected by the API (HTTP ${me.status()}). ` +
      'Check that the backend is running and that ensure_e2e_user has been run.'
  ).toBeTruthy();

  await page.context().storageState({ path: AUTH_FILE });
});
