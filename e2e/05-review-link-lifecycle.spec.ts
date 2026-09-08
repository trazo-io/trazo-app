import { test, expect } from '@playwright/test';

/**
 * Path 7 — the certifier review link, end to end: create → open anonymously → revoke → refuse.
 *
 * REGRESSION GUARD for the 2026-09-06 audit's T04. A link created in the app failed to open
 * MINUTES LATER, while its own card showed it active and unexpired, and the page told the
 * reviewer "This link is no longer available … It may have expired or been withdrawn."
 *
 * The root cause was never established, and the audit was right not to guess. What was
 * established is that the page could not tell a dead link from a transport failure: every
 * error rendered as a withdrawn link. Two things therefore need proving on a real browser
 * against a real server, and neither was covered by any test:
 *
 *   1. the happy path actually works — mint, open anonymously, see the operation; and
 *   2. a revoked link refuses, and says so.
 *
 * The anonymous half runs in its own browser CONTEXT with no storage state. ⛔ `newContext()`
 * inherits `use.storageState` from the config, which is how a previous session "proved" an
 * anonymous 200 while signed in — so the context here is created with `storageState: undefined`
 * explicitly rather than relying on the default.
 */

const REVIEW_TITLE = /no longer available|could not load just now/i;

async function farmBase(page: import('@playwright/test').Page): Promise<string> {
  await page.goto('/admin/dashboard');
  await page.waitForLoadState('networkidle');
  const href = await page.locator('a[href*="/admin/dashboard/farm/"]').first().getAttribute('href');
  expect(href, 'no farm link on the dashboard').toBeTruthy();
  return href!.split('/parcel/')[0];
}

test('a minted certifier link opens anonymously, and stops opening once revoked', async ({
  page,
  browser,
  baseURL
}) => {
  const base = await farmBase(page);
  await page.goto(`${base}/profile`);
  await page.waitForLoadState('networkidle');

  // The card lives on the farm profile. If the operation cannot mint (Starter plan, or a
  // readiness blocker), skip rather than fail: this spec is about the LIFECYCLE, and the
  // gating has its own coverage in the door-inventory suite.
  // Exact control names, read off CertifierLinkCard rather than guessed: creating is a
  // `StandardButton` labelled "Create link" and fires `handleCreate` directly — there is no
  // confirmation step.
  const createButton = page.getByRole('button', { name: 'Create link' }).first();
  if ((await createButton.count()) === 0) {
    test.skip(true, 'no certifier-link control on this farm (plan gate or missing card)');
  }
  // ⚠️ The control is DISABLED when the operation has a submission blocker — `perform_create`
  // refuses to mint over one, deliberately ("the moment to stop them is BEFORE sharing"). That
  // gate has its own coverage in the readiness suite; skipping keeps this spec honest about
  // what it did and did not exercise instead of failing on correct product behaviour.
  if (await createButton.isDisabled()) {
    test.skip(
      true,
      'minting is blocked on this farm (open readiness blocker) — lifecycle not exercised'
    );
  }

  // Capture the link from the API response rather than scraping the DOM: the card shows a
  // copyable URL, and reading the wire is both stabler and closer to what the certifier gets.
  const created = page.waitForResponse(
    (r) => r.url().includes('/certifier-links/') && r.request().method() === 'POST' && r.ok()
  );
  await createButton.click();
  const createResponse = await created;
  // The POST url IS the collection url, so it already carries the company and establishment ids
  // the cleanup DELETE needs. Deriving them from the page route instead would mean rebuilding a
  // path the app owns.
  const collectionUrl = createResponse.url();
  const link = (await createResponse.json()) as { id: number; token: string };
  expect(link.token, 'the create response carried no token').toBeTruthy();

  // ⛔ Everything after this point runs inside try/finally. A failure between minting and
  // revoking would otherwise leave a LIVE dossier link on the farm — this spec runs against a
  // real dev database, and a previous session's leftover links are exactly the kind of debris
  // that makes the next person distrust the fixture. The finally block revokes through the
  // authenticated API, so it works even if the UI is the thing that broke.
  const anon = await browser.newContext({ storageState: undefined });
  try {
    // --- anonymous open -----------------------------------------------------------------
    const anonPage = await anon.newPage();
    await anonPage.goto(`${baseURL}/certifier-review/${link.token}`);
    await anonPage.waitForLoadState('networkidle');

    const openedText = await anonPage.locator('body').innerText();
    expect(openedText, 'a freshly minted link did not open — this is T04').not.toMatch(
      REVIEW_TITLE
    );
    expect(openedText.trim().length, 'review page rendered empty').toBeGreaterThan(40);

    // --- revoke -------------------------------------------------------------------------
    // Revoke is a text LINK, not a button (the card deliberately uses text actions so the two
    // 44px buttons per row do not dominate its height), and `handleRevoke` fires immediately
    // with no confirmation dialog. Newest link renders first (`-created_at`), which is the one
    // just minted.
    const revoked = page.waitForResponse(
      (r) => r.url().includes('/certifier-links/') && r.request().method() === 'DELETE'
    );
    await page.getByText('Revoke', { exact: true }).first().click();
    await revoked;

    // --- refuses after revocation -------------------------------------------------------
    const afterPage = await anon.newPage();
    await afterPage.goto(`${baseURL}/certifier-review/${link.token}`);
    await afterPage.waitForLoadState('networkidle');
    await expect(afterPage.locator('body')).toContainText(/no longer available/i);
    // And specifically NOT the transient message: a revoked link is genuinely gone.
    await expect(afterPage.locator('body')).not.toContainText(/could not load just now/i);
  } finally {
    await anon.close();
    // Revoke through the authenticated API so cleanup works even when the UI is what broke.
    // Idempotent: `destroy` revokes rather than deletes and is a no-op on an already-revoked
    // link, so this is safe on the happy path too.
    await page.request
      .delete(`${collectionUrl.replace(/\/?$/, '/')}${link.id}/`)
      .catch(() => undefined);
  }
});

test('an unknown token is refused, and never reported as a transient error', async ({
  browser,
  baseURL
}) => {
  const anon = await browser.newContext({ storageState: undefined });
  const anonPage = await anon.newPage();
  await anonPage.goto(`${baseURL}/certifier-review/not-a-real-token-000000000000`);
  await anonPage.waitForLoadState('networkidle');
  await expect(anonPage.locator('body')).toContainText(/no longer available/i);
  await anon.close();
});
