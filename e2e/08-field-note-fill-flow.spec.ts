import crypto from 'node:crypto';

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * What a crew note is allowed to FILL, per record type.
 *
 * `07-field-note-confirm-flow.spec.ts` walks a fertilizer application, and that is the one record
 * type that WITHHOLDS: `isApplicationRecord` covers CHEMICAL, SOIL with PA/OM and PEST with BR,
 * and for those the product, rate, quantity and area come from the grower's own records. So the
 * whole filling half of the feature had no coverage: for irrigation, pruning, mowing and harvest
 * the offer is allowed to write, and nothing asserted what it writes.
 *
 * THE RULE THIS FILE HOLDS. The banner names what it would fill and the button counts it, so what
 * the tap writes has to match what the banner promised. A promise the tap does not keep is worse
 * than no offer: the operator reads "2 values" and believes a number was recorded.
 *
 * Prerequisites are the same isolated stack as spec 07; see its header.
 */

const TOKEN = process.env.E2E_FIELD_NOTE_TOKEN ?? '';
const WEBHOOK_URL =
  process.env.E2E_FIELD_NOTE_WEBHOOK_URL ?? 'http://localhost:8010/api/field-notes/inbound/twilio/';
const CREW_PHONE = '+15095550123';
const FARM = 'Audit Ranch';
const BLOCK_WITH_SEASON = 'River Block';

function sign(url: string, params: Record<string, string>): string {
  const payload =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  return crypto.createHmac('sha1', TOKEN).update(payload).digest('base64');
}

async function deliver(request: APIRequestContext, body: string, id: string) {
  const params: Record<string, string> = {
    MessageSid: id,
    From: `whatsapp:${CREW_PHONE}`,
    To: 'whatsapp:+15092045054',
    Body: body,
    NumMedia: '0'
  };
  return request.post(WEBHOOK_URL, {
    data: new URLSearchParams(params).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': sign(WEBHOOK_URL, params)
    }
  });
}

/** See spec 07 for why this is not `locator('div').filter({ hasText }).last()`. */
function noteCard(page: Page, words: string) {
  return page
    .locator('div')
    .filter({ hasText: words })
    .filter({ has: page.getByRole('button', { name: /log this/i }) })
    .last();
}

/** Deliver one note and take it to the details step with the date answered. */
async function openDetails(page: Page, request: APIRequestContext, words: string, verb: RegExp) {
  expect((await deliver(request, words, `SM-fill-${Date.now()}`)).status()).toBe(200);
  await page.goto('/admin/dashboard/field-notes');
  const card = noteCard(page, words);
  await card.getByRole('combobox', { name: /farm|finca/i }).selectOption({ label: FARM });
  await card
    .getByRole('combobox', { name: /^block|^bloque/i })
    .selectOption({ label: BLOCK_WITH_SEASON });
  await card.getByRole('button', { name: /log this/i }).click();
  await page.waitForURL(/field_note=/);
  // Identity: the wizard must be on the note this test delivered, not a stale one.
  await expect(page.getByText(words)).toBeVisible();

  await page.getByRole('button', { name: verb }).first().click();
  // The operator's own day, deliberately not today.
  await page.locator('input[name="date"]').fill('2026-10-14T09:30');
  await page
    .getByRole('button', { name: /^continue$|^continuar$/i })
    .first()
    .click();

  // WAIT FOR THE OUTCOME, NOT FOR A SPINNER TO VANISH.
  //
  // This was a `for` loop breaking when `getByText(/analyz/i).count()` hit 0. `count()` does not
  // retry: it reads the DOM at the instant it is called, and right after Continue the parse panel
  // has not mounted, so it answered 0 on the first iteration and the loop exited immediately. The
  // tests then passed on the trailing `waitForTimeout` alone, which is luck with a timer on it
  // (review of app #154).
  //
  // The real signal that the parse finished is the offer itself, so that is what is awaited, with
  // a timeout long enough for a live model call.
  await expect(
    page.getByText(/from the crew message|del mensaje de la cuadrilla/i),
    'the crew-note banner never appeared, so the parse did not finish'
  ).toBeVisible({ timeout: 90_000 });
  // ⛔ NOT "wait for the spinner to disappear". MEASURED: the crew banner renders WHILE the parse
  // is still running, so asserting the analysing text is gone fails on a page that is working
  // correctly. Each test waits for the thing it actually needs (the offer button), which is the
  // only signal that means the parse finished.
}

/** Every named form control and its value, including the empty ones. */
async function fields(page: Page): Promise<Record<string, string>> {
  const pairs = await page
    .locator('input, select, textarea')
    .evaluateAll((els) =>
      els
        .map((e) => [(e as HTMLInputElement).name, String((e as HTMLInputElement).value ?? '')])
        .filter(([n]) => n)
    );
  return Object.fromEntries(pairs as [string, string][]);
}

test.describe('a note that is allowed to fill', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see spec 07');

  test('irrigation: the offer is held, then written on a tap', async ({ page, request }) => {
    const words = `Regamos el bloque 4 por goteo, tres horas ${Date.now()}`;
    await openDetails(page, request, words, /^irrigation$|^riego$/i);

    // HELD, not merged. Nothing from the message is in the form until a person asks.
    const before = await fields(page);
    expect(before.irrigation_method, 'the message wrote a value before any tap').toBe('');

    const fill = page.getByRole('button', { name: /fill in \d+ value|completar/i }).first();
    await expect(fill, 'a non-application record offered nothing to fill').toBeVisible({
      timeout: 90_000
    });
    await fill.click();
    await page.waitForTimeout(1500);

    const after = await fields(page);
    expect(after.irrigation_method, 'the tap did not write the method it offered').toBe('drip');
  });

  // `test.fail()`, NOT `skip` and NOT deleted. This asserts the defect is STILL THERE: Playwright
  // reports a failure if it ever starts passing, so the day somebody fixes it this file says so
  // instead of sitting green and stale. Documenting a known defect as "expected to fail" keeps CI
  // honest without hiding it.
  //
  // ROOT CAUSE, traced 2026-10-19:
  //   productionEvent.ts  equipment_hours.visibleForSubtypes = PL HA IR PR TR CU TH EM PH CM FP MO
  //   ProductionTab.jsx:4424 renders it for                    HA PL PR TR CU TH CM MO
  //   declared but never rendered: IR, EM, PH, FP
  // The crew-note offer is built from the REGISTRY, so it offers `equipment_hours` for an
  // irrigation note and the form has nowhere to put it.
  //
  // Two possible fixes, and which one is right is a product call rather than a test call:
  //   (a) add the missing subtypes to the render gate, matching what the registry declares; or
  //   (b) build the offer from what the form will actually render, which is what
  //       `crewNoteApplication.ts` already does for application records.
  test('the banner never promises a value the tap cannot write', async ({ page, request }) => {
    // INSIDE the test body, deliberately. At describe scope `test.fail()` applies to EVERY test
    // in the scope, so placing it above this one marked the passing test as expected-to-fail and
    // reported "Expected to fail, but passed" against the wrong test.
    test.fail();
    // MEASURED 2026-10-19, and this test FAILS on the current build.
    //
    // "Regamos el bloque 4 por goteo, tres horas" offers two values:
    //   Would fill: Equipment Hours: 3 hours, Irrigation Method: Drip Irrigation
    // and the button reads "Fill in 2 values". The tap writes ONE. `equipment_hours` is declared
    // for subtype IR in productionEvent.ts and carries `carbonRelevant: true`, but no input for
    // it is rendered on the irrigation form: a DOM scan of every control, with every collapsible
    // section expanded, finds no hours field, while `fuel_type` (identical `visibleForSubtypes`)
    // renders fine.
    //
    // The operator reads "2 values", taps once, and believes the three hours were recorded. Pump
    // runtime is a carbon input, so the number does not merely go missing: the figure computed
    // without it is wrong and nothing on screen says so.
    //
    // `crewNoteApplication.ts` already enforces this promise for APPLICATION records ("so the
    // banner never promises values the tap will not write"). There is no equivalent check that an
    // offered key has a rendered field on the records that are allowed to fill.
    const words = `Regamos el bloque 4 por goteo, tres horas ${Date.now()}`;
    await openDetails(page, request, words, /^irrigation$|^riego$/i);

    // THE BUTTON HAS TWO SHAPES, and the first version only matched one of them. A multi-value
    // offer reads "Fill in 2 values"; a SINGLE-value offer reads "Fill in Relación NPK" with no
    // digit at all (`events.voice.pastedNoteApplyNamed`, added in app #151). Matching only the
    // digit form meant a single-value offer failed on a locator timeout rather than reporting
    // anything useful.
    //
    // The old `expect(count).toBeGreaterThan(0)` could also never fail: the locator already
    // required a digit in the accessible name, so by the time the count was read it was
    // guaranteed present (review of app #154).
    const offer = page.getByRole('button', { name: /fill in |completar /i }).first();
    await expect(offer, 'no offer button was rendered at all').toBeVisible({ timeout: 90_000 });
    const label = (await offer.textContent()) ?? '';
    const digits = label.match(/\d+/);
    // No digit means the named single-value shape, which promises exactly one.
    const count = digits ? Number(digits[0]) : 1;

    const before = await fields(page);
    await page
      .getByRole('button', { name: /fill in \d+ value|completar/i })
      .first()
      .click();
    await page.waitForTimeout(1500);
    const after = await fields(page);

    const written = Object.keys(after).filter((k) => after[k] && after[k] !== before[k]);
    expect(
      written.length,
      `the banner promised ${count} values and the tap wrote ${written.length} (${written.join(
        ', '
      )}). ` + 'A promise the tap does not keep reads to the operator as a value that was recorded.'
    ).toBe(count);
  });
});
