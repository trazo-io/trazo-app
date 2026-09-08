import { test, expect } from '@playwright/test';

/**
 * Paths 3-5 — the recordkeeping spine a pilot farm walks on day one:
 * farm page -> parcel page -> activity wizard.
 *
 * These are deliberately SMOKE tests, not full form submissions. A spec that fills the whole
 * activity wizard has to encode every conditional-render rule in it, and when the wizard
 * changes it fails for a reason that is not a bug. What is worth guarding automatically is
 * the part that broke silently before: that the route resolves, the shell renders, and the
 * page is not a blank error boundary.
 *
 * Farm/parcel ids are DISCOVERED from the dashboard, never hardcoded, so a reseeded database
 * does not turn the suite red.
 */

async function firstFarmHref(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');
  const href = await page.locator('a[href*="/admin/dashboard/farm/"]').first().getAttribute('href');
  expect(
    href,
    'no farm link on the dashboard — is the E2E user attached to a company?'
  ).toBeTruthy();
  return href!;
}

test('a farm page renders without an error boundary', async ({ page }) => {
  const href = await firstFarmHref(page);
  const farmBase = href!.split('/parcel/')[0];

  await page.goto(farmBase);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
  expect(page.url()).toContain('/admin/dashboard/farm/');
});

test('a parcel page renders and is reachable from the farm', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');

  // WAIT for the link rather than skipping when it has not painted yet. A `test.skip` here
  // made this spec silently vanish on 1 of 4 runs — the dashboard simply had not rendered the
  // parcel list at the moment of the query, and a spec that disappears reads exactly like a
  // spec that passed.
  const parcelLink = page.locator('a[href*="/parcel/"]').first();
  // ATTACHED, not VISIBLE. The parcel links live inside a collapsible sidebar section, so
  // they are in the DOM but not on screen — `toBeVisible()` failed on every run. What this
  // test needs is the href, and `getAttribute` reads a hidden element fine.
  await parcelLink.waitFor({ state: 'attached', timeout: 15_000 });
  const parcelHref = await parcelLink.getAttribute('href');
  expect(parcelHref, 'no parcel link in the dashboard DOM').toBeTruthy();

  await page.goto(parcelHref!);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
});

test('the activity list page loads for a farm', async ({ page }) => {
  const href = await firstFarmHref(page);
  const farmBase = href!.split('/parcel/')[0];

  await page.goto(`${farmBase}/activities`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
});

test('the add-event wizard opens on step one', async ({ page }) => {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');

  // WAIT for the link rather than skipping when it has not painted yet. A `test.skip` here
  // made this spec silently vanish on 1 of 4 runs — the dashboard simply had not rendered the
  // parcel list at the moment of the query, and a spec that disappears reads exactly like a
  // spec that passed.
  const parcelLink = page.locator('a[href*="/parcel/"]').first();
  // ATTACHED, not VISIBLE. The parcel links live inside a collapsible sidebar section, so
  // they are in the DOM but not on screen — `toBeVisible()` failed on every run. What this
  // test needs is the href, and `getAttribute` reads a hidden element fine.
  await parcelLink.waitFor({ state: 'attached', timeout: 15_000 });
  const parcelHref = await parcelLink.getAttribute('href');
  expect(parcelHref, 'no parcel link in the dashboard DOM').toBeTruthy();

  await page.goto(`${parcelHref}/event/add`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);

  // The wizard must offer a way forward. Asserting on "a control exists" rather than on a
  // specific label keeps this alive across copy and i18n changes — both locales must pass.
  const controls = page.getByRole('button');
  await expect(controls.first()).toBeVisible();
});
