import crypto from 'node:crypto';

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * A crew message becomes a note, and the roster says whether the sender was told.
 *
 * WHAT IS ACTUALLY END TO END HERE. The browser adds a number through the real roster form, a
 * correctly SIGNED provider webhook is delivered to the real backend, and the browser is then
 * asked what it shows. Nothing is stubbed on the way: Django verifies the HMAC itself, does its own
 * roster lookup, writes its own row, and the page reads it back through the real API.
 *
 * WHAT PLAYWRIGHT CANNOT TEST, said plainly so nobody later believes this covers it: the reply
 * itself. A WhatsApp message arriving on somebody's phone is not in a browser, and there is no
 * surface for it. What IS in the browser is the CONSEQUENCE of the reply, which is the roster's
 * notice state, and that is what these assertions are about.
 *
 * THE FAILURE STATE IS THE ONE ASSERTED, and it is not a compromise. A test backend has no
 * `FIELD_NOTES_WHATSAPP_FROM`, so the notice genuinely cannot go out, the claim on
 * `first_contact_at` is genuinely released, and the roster must genuinely say so. That is the row
 * an operator most needs to see: they ticked "I told this person" and Trazo did not manage to.
 * Asserting the success path would mean sending a real WhatsApp message to a real human from a
 * test suite, which is not something a test run should do.
 *
 * PREREQUISITES beyond the ones in playwright.config.ts. The webhook fails CLOSED when no token is
 * configured, and dev has none, so the backend must be started with one:
 *
 *   cd trazo-back && TWILIO_AUTH_TOKEN=e2e-field-note-token \
 *     FIELD_NOTES_WEBHOOK_URL=http://localhost:8000/api/field-notes/inbound/twilio/ \
 *     poetry run python manage.py runserver
 *
 *   cd trazo-app && E2E_FIELD_NOTE_TOKEN=e2e-field-note-token npx playwright test 06-field-note
 *
 * Without `E2E_FIELD_NOTE_TOKEN` the whole file skips rather than reporting a red that only means
 * "you did not export a variable".
 */

const TOKEN = process.env.E2E_FIELD_NOTE_TOKEN ?? '';

/**
 * The backend DIRECTLY, not through the Vite proxy.
 *
 * Twilio HMACs the exact URL it called, so the signature and `FIELD_NOTES_WEBHOOK_URL` have to name
 * the same string. Going through `app.localhost:3000/api` would have the server reconstruct a
 * different URL than the one signed here, and the failure would look like a rejected signature
 * rather than a proxy detail. The webhook is `@csrf_exempt`, so plain `localhost` is fine for it.
 */
const WEBHOOK_URL =
  process.env.E2E_FIELD_NOTE_WEBHOOK_URL ?? 'http://localhost:8000/api/field-notes/inbound/twilio/';

/**
 * Twilio's documented scheme, written out rather than imported.
 *
 * base64(HMAC-SHA1(token, url + concat(sorted(key + value)))). Rebuilding it with the backend's own
 * helper would pass even if that helper were wrong, which is the same reason the Django tests carry
 * an independently computed vector.
 */
function sign(url: string, params: Record<string, string>): string {
  const payload =
    url +
    Object.keys(params)
      .sort()
      .map((key) => key + params[key])
      .join('');
  return crypto.createHmac('sha1', TOKEN).update(payload).digest('base64');
}

async function deliver(
  request: APIRequestContext,
  params: Record<string, string>,
  signature?: string
) {
  /*
   * THE BODY IS ENCODED HERE, not handed to the `form` helper.
   *
   * MEASURED: with `form: params` every signed delivery came back 400 while the identical payload
   * sent through `URLSearchParams` verified. The signature is computed over the RAW values, so any
   * difference between what this signs and what the server decodes is a mismatch, and `From`
   * carries both a `+` and a `:` in `whatsapp:+14155551234`. In
   * `application/x-www-form-urlencoded` an unescaped `+` decodes to a SPACE, so one encoder's
   * politeness is the whole failure. Building the string here means the bytes on the wire are the
   * bytes this file chose.
   */
  return request.post(WEBHOOK_URL, {
    data: new URLSearchParams(params).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': signature ?? sign(WEBHOOK_URL, params)
    },
    failOnStatusCode: false
  });
}

/**
 * The roster row for one number.
 *
 * NEVER assert the notice text page-wide. This suite runs against the development database and
 * leaves its numbers behind, so by the third run three earlier rows carried the same warning and a
 * page-wide `toHaveCount(0)` failed on somebody else's leftovers. Loosening it to `.first()` would
 * have been worse: a stale row would then satisfy an assertion about the row under test.
 */
function rosterRow(page: Page, phone: string) {
  // BY TEST ID, not by filtering `div`. A text filter on `div` matches every ANCESTOR as well, so
  // an outer container holding this row AND a different row satisfied it: the locator resolved to
  // eleven elements and could not say which row the assertion was about.
  return page.getByTestId('crew-sender-row').filter({ hasText: phone });
}

/** A number nothing else on this database has claimed, so reruns do not collide on the roster. */
function freshNumber(): string {
  const tail = String(Date.now()).slice(-7);
  return `+1415${tail}`;
}

test.describe('a crew message reaches the inbox', () => {
  test.skip(
    !TOKEN,
    'set E2E_FIELD_NOTE_TOKEN and start the backend with the same TWILIO_AUTH_TOKEN; see the header'
  );

  let phone: string;

  test.beforeEach(async ({ page }) => {
    phone = freshNumber();
    await page.goto('/admin/dashboard/field-notes');
    await expect(page.getByRole('heading', { name: /field notes/i })).toBeVisible();
  });

  test('a signed message from a number the operator just added appears in the inbox', async ({
    page,
    request
  }) => {
    // 1. Add the number through the real form. Conditional sections render only after their
    //    trigger, so the panel is opened first and the fields re-queried.
    await page.getByRole('button', { name: /add a number/i }).click();
    await page.getByLabel(/phone number with country code/i).fill(phone);
    await page.getByLabel(/what you call them/i).fill('E2E Crew');
    // The attestation, which the server requires before the number may send at all.
    await page.getByLabel(/they agreed/i).click();
    await page.getByRole('button', { name: /add this number/i }).click();

    await expect(page.getByText(phone)).toBeVisible();
    // Nothing has arrived from THIS number yet, so its row must not claim anything about a notice.
    await expect(rosterRow(page, phone).filter({ hasText: /could not tell them/i })).toHaveCount(0);

    // 2. A real, signed delivery to the real webhook.
    const words = `regamos el bloque 4, e2e ${Date.now()}`;
    const response = await deliver(request, {
      MessageSid: `SM-e2e-${Date.now()}`,
      From: `whatsapp:${phone}`,
      Body: words,
      NumMedia: '0',
      ProfileName: 'E2E Crew'
    });
    expect(
      response.status(),
      'the webhook refused a correctly signed delivery. Is the backend running with the same ' +
        'TWILIO_AUTH_TOKEN and FIELD_NOTES_WEBHOOK_URL this spec signs against?'
    ).toBe(200);

    // 3. The browser, asked again.
    await page.reload();

    /*
     * THE WORDS, VERBATIM, IN THE BROWSER. That single assertion is the whole chain: the HMAC was
     * verified by Django, the roster lookup matched a number this same test created through the
     * form, a row was written, and the page read it back through the real API.
     *
     * Deliberately NOT asserting the disabled "Log this" here. Whether the block was guessed is
     * decided by the component and is covered exhaustively in `FieldNotesInbox.test.tsx`, where
     * the farm and parcel fixtures can be controlled. Reaching for it here meant locating a
     * button relative to arbitrary text on a page that accumulates notes across runs, which is a
     * fragile assertion about something already proven elsewhere.
     */
    await expect(page.getByText(words)).toBeVisible();
  });

  test('the roster says when Trazo could not tell the sender what it does with their words', async ({
    page,
    request
  }) => {
    /*
     * A test backend has no `FIELD_NOTES_WHATSAPP_FROM`, so the notice cannot be sent, the claim on
     * `first_contact_at` is released, and the operator has attested to something that did not
     * happen. Until this slice that was completely invisible: the column was served to the page and
     * rendered by nothing.
     */
    await page.getByRole('button', { name: /add a number/i }).click();
    await page.getByLabel(/phone number with country code/i).fill(phone);
    await page.getByLabel(/they agreed/i).click();
    await page.getByRole('button', { name: /add this number/i }).click();
    await expect(page.getByText(phone)).toBeVisible();

    const response = await deliver(request, {
      MessageSid: `SM-e2e-notice-${Date.now()}`,
      From: `whatsapp:${phone}`,
      Body: 'podamos el bloque 2',
      NumMedia: '0',
      ProfileName: 'E2E Crew'
    });
    expect(response.status()).toBe(200);

    await page.reload();

    /*
     * SCOPED TO THE ROW THIS TEST CREATED. A bare `getByText` broke strict mode as soon as a
     * second run had left another un-notified number on the roster, and loosening it to `.first()`
     * would have let a leftover row from a previous run satisfy the assertion. Asserting that one
     * container holds BOTH this test's phone number and the warning is what ties the two together.
     */
    const row = rosterRow(page, phone).filter({
      hasText: /could not tell them what happens to their messages/i
    });
    await expect(row.first()).toBeVisible();
  });

  test('a forged signature writes nothing, and the page still shows nothing', async ({
    page,
    request
  }) => {
    // The signature is the whole of the access control on this endpoint: the caller is not
    // authenticated at all. A 400 here and an unchanged page is the claim.
    await page.getByRole('button', { name: /add a number/i }).click();
    await page.getByLabel(/phone number with country code/i).fill(phone);
    await page.getByLabel(/they agreed/i).click();
    await page.getByRole('button', { name: /add this number/i }).click();
    await expect(page.getByText(phone)).toBeVisible();

    const words = `forged delivery ${Date.now()}`;
    const response = await deliver(
      request,
      {
        MessageSid: `SM-e2e-forged-${Date.now()}`,
        From: `whatsapp:${phone}`,
        Body: words,
        NumMedia: '0',
        ProfileName: 'E2E Crew'
      },
      'Zm9yZ2VkIHNpZ25hdHVyZQ=='
    );
    expect(response.status(), 'a forged signature was accepted').toBe(400);

    /*
     * AND THE ENDPOINT MUST BE REACHABLE, or this test passes on any 400 from anywhere: a typo in
     * the URL, a backend that is not running, a proxy in the way. A 400 is the expected answer
     * here, which makes it the one status that cannot double as evidence that the request arrived.
     * A correctly signed delivery to the same URL, in the same test, is that evidence.
     */
    /*
     * FROM A DIFFERENT NUMBER, and the review of #49 is why. Sending this probe from `phone`
     * ACCEPTS a delivery for the very row the assertions below call untouched: it stamps
     * `last_note_at` while `first_contact_at` stays null, which is exactly the failed-notice
     * branch, so the final `toHaveCount(0)` contradicted its own comment. It passed anyway, on
     * timing rather than on being true, which is the worse kind of green.
     *
     * An unrostered number proves reachability just as well. The endpoint answers 200 and writes
     * NOTHING for a number on no roster, which is the behaviour the webhook is built around, so
     * this probe cannot dirty any row at all.
     */
    const reachable = await deliver(request, {
      MessageSid: `SM-e2e-reachable-${Date.now()}`,
      From: `whatsapp:${freshNumber()}`,
      Body: 'reachability probe',
      NumMedia: '0',
      ProfileName: 'E2E Crew'
    });
    expect(
      reachable.status(),
      'the forged-signature assertion above proves nothing: a correctly signed delivery to the ' +
        'same URL was also refused, so the 400 may not have come from the signature check at all'
    ).toBe(200);

    await page.reload();
    await expect(page.getByText(words)).toHaveCount(0);
    // And no notice claim against THIS number, because nothing was ever received from it.
    await expect(rosterRow(page, phone).filter({ hasText: /could not tell them/i })).toHaveCount(0);
  });
});
