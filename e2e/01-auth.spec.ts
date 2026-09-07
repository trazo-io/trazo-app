import { test, expect } from '@playwright/test';

/**
 * Path 1 — the session. Everything else in the suite is meaningless if this is wrong.
 *
 * Auth here is pure httpOnly cookies; the frontend never touches tokens in JS. That means
 * the only honest assertion is "the server accepts this session", never "a token exists in
 * localStorage" — there is nothing in localStorage to find, by design.
 */

test('an authenticated session is accepted by the API', async ({ page }) => {
  await page.goto('/admin/dashboard');
  const me = await page.request.get('/api/users/me/');
  expect(me.ok()).toBeTruthy();
});

test('the dashboard renders the farm navigation for a company member', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');

  // The E2E user is Company Admin of a seeded company, so at least one farm link must exist.
  // Asserting on the LINK rather than on a heading keeps this stable across dashboard
  // redesigns while still failing if farm scoping breaks.
  const farmLinks = page.locator('a[href*="/admin/dashboard/farm/"]');
  await expect(farmLinks.first()).toBeVisible();
});

// EMPTY_STATE must be passed explicitly. `browser.newContext()` and
// `playwright.request.newContext()` INHERIT the project's `use.storageState` (verified on
// Playwright 1.63: a context created with no options came back holding access/refresh/
// logged_in/csrftoken). Omitting it does not give you an anonymous context — it gives you a
// signed-in one that reads as anonymous, which makes an auth test pass while proving nothing.
// This bit once already: the first draft of these two specs reported a fake auth hole.
const EMPTY_STATE = { cookies: [], origins: [] };

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://app.localhost:3000';

test('an anonymous visitor cannot reach the dashboard', async ({ browser }) => {
  const context = await browser.newContext({ storageState: EMPTY_STATE });
  const page = await context.newPage();

  // Prove the context really is anonymous before asserting anything about the redirect.
  expect(
    (await context.cookies(BASE_URL)).map((c) => c.name),
    'context was supposed to be anonymous but carries cookies'
  ).toHaveLength(0);

  await page.goto(`${BASE_URL}/admin/dashboard`);
  await expect(page).toHaveURL(/\/auth\/signin/, { timeout: 30_000 });

  await context.close();
});

test('the API refuses an anonymous request for user data', async ({ playwright }) => {
  const api = await playwright.request.newContext({
    baseURL: BASE_URL,
    storageState: EMPTY_STATE
  });
  const res = await api.get('/api/users/me/');
  expect(res.status(), 'anonymous /api/users/me/ must not return data').toBeGreaterThanOrEqual(401);
  await api.dispose();
});
