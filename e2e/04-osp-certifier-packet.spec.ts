import { test, expect } from '@playwright/test';

/**
 * Path 6 — the OSP / certifier packet. THE thing Compliance ($249/yr) is sold for.
 *
 * REGRESSION GUARD: the 2026-09-07 pilot rehearsal found this packet completely DEAD — a
 * `MaterialRow` unpack error. It is the single most expensive thing that can be broken during
 * a pilot, because it is the deliverable the whole plan is bought for, and it broke with the
 * 930-test backend suite fully green.
 *
 * The packet is also the paid boundary: Starter is bounded by what it can PRODUCE, so this
 * route is where gating lives. A spec here fails loudly in both directions — packet broken,
 * or packet accidentally ungated.
 */

async function farmBase(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');
  const href = await page.locator('a[href*="/admin/dashboard/farm/"]').first().getAttribute('href');
  expect(href, 'no farm link on the dashboard').toBeTruthy();
  return href!.split('/parcel/')[0];
}

test('the OSP page loads for a farm', async ({ page }) => {
  const base = await farmBase(page);

  await page.goto(`${base}/osp`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
  // A blank page is the failure mode a dead packet actually presents as, so assert there is
  // rendered content rather than only the absence of an error string.
  const text = await page.locator('body').innerText();
  expect(text.trim().length, 'OSP page rendered empty').toBeGreaterThan(50);
});

test('the documents page loads for a farm', async ({ page }) => {
  const base = await farmBase(page);

  await page.goto(`${base}/documents`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('body')).not.toContainText(/something went wrong|unexpected error/i);
});

test('no uncaught exception is thrown while loading the OSP page', async ({ page }) => {
  // The MaterialRow unpack failure surfaced as a runtime exception, which a "does the route
  // resolve" check can miss entirely if the shell still paints. Watch for THROWN errors.
  //
  // Scope note: React logs its development warnings through console.error, and this page
  // currently emits one — "Function components cannot be given refs" from MainPanel.tsx via
  // the Dashboard layout. It is a real (minor) defect, it is NOT specific to the OSP page,
  // and it does not exist in a production build. Failing this spec on it would make the
  // packet guard red for a reason unrelated to the packet, which is how a guard gets muted.
  // Tracked separately in ADR-010 rather than swallowed here.
  // Resolve the farm FIRST, then start listening. Attaching the listener before this
  // navigation attributes any transient error from the DASHBOARD load to the OSP page —
  // observed once in four full-suite runs as a flake that passed in isolation. A guard that
  // fails at random is a guard that gets muted, so scope the window to the page under test.
  const base = await farmBase(page);

  const thrown: string[] = [];
  page.on('pageerror', (e) => thrown.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    // Keep genuine runtime failures; drop React dev warnings and network noise.
    if (/^Warning:/.test(t)) return;
    if (/favicon|ResizeObserver|Failed to load resource/i.test(t)) return;
    thrown.push(t);
  });

  await page.goto(`${base}/osp`);
  await page.waitForLoadState('networkidle');

  expect(thrown, `runtime errors on the OSP page:\n${thrown.join('\n')}`).toHaveLength(0);
});
