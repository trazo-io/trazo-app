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
/**
 * Every control keyed by its ACCESSIBLE NAME, never by `name`.
 *
 * ⛔ A CHAKRA NumberInput CARRIES AN EMPTY `name`. The first version of this helper keyed on
 * `name` and filtered out everything without one, so every numeric field in the form was
 * invisible to it: Equipment Hours, Quantity harvested, Area, Rate. It then reported that a tap
 * had written fewer values than the banner promised, and this file shipped a `test.fail()`
 * recording a defect that does not exist, with a root-cause analysis to match.
 *
 * MEASURED 2026-10-19, same message, read by label: "Regamos el bloque 4 por goteo, tres horas"
 * promises 2 and writes 2, Equipment Hours = 3 and Irrigation Method = drip.
 *
 * The lesson is not "use labels". It is that a measurement which cannot see the thing it is
 * measuring reports its own blind spot as a product defect, and reads exactly like a finding.
 */
async function fields(page: Page): Promise<Record<string, string>> {
  const pairs = await page.locator('input, select, textarea').evaluateAll((els) =>
    els.map((e) => {
      const el = e as HTMLInputElement;
      let label = el.getAttribute('aria-label') ?? '';
      if (!label && el.id) {
        label = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ?? '';
      }
      if (!label) label = el.closest('div')?.querySelector('label')?.textContent?.trim() ?? '';
      return [label || el.name || '(unnamed)', String(el.value ?? '')];
    })
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
    // Keyed by LABEL now, like the reader. The old `name` keys silently read `undefined`,
    // which is the same blind spot that produced the false defect this file used to carry.
    expect(before['Irrigation Method'], 'the message wrote a value before any tap').toBe('');
    expect(before['Equipment Hours'], 'the message wrote a value before any tap').toBe('');

    const fill = page.getByRole('button', { name: /fill in \d+ value|completar/i }).first();
    await expect(fill, 'a non-application record offered nothing to fill').toBeVisible({
      timeout: 90_000
    });
    await fill.click();
    await page.waitForTimeout(1500);

    const after = await fields(page);
    expect(after['Irrigation Method'], 'the tap did not write the method it offered').toBe('drip');
    // The numeric field the old reader could not see at all.
    expect(after['Equipment Hours'], 'the tap did not write the hours it offered').toBe('3');
  });

  test('the banner keeps its promise: what it names, the tap writes', async ({ page, request }) => {
    // THIS TEST PREVIOUSLY CARRIED `test.fail()` AND WAS WRONG. It reported that irrigation
    // promises 2 values and writes 1, which was an artifact of reading controls by `name` while
    // Chakra NumberInputs carry none. Read by label, the same message writes both.
    const words = `Regamos el bloque 4 por goteo, tres horas ${Date.now()}`;
    await openDetails(page, request, words, /^irrigation$|^riego$/i);

    const offer = page.getByRole('button', { name: /fill in |completar /i }).first();
    await expect(offer, 'no offer button was rendered at all').toBeVisible({ timeout: 90_000 });
    const label = (await offer.textContent()) ?? '';
    const digits = label.match(/\d+/);
    const count = digits ? Number(digits[0]) : 1;

    const before = await fields(page);
    await offer.click();
    await page.waitForTimeout(1500);
    const after = await fields(page);

    const written = Object.keys(after).filter((k) => after[k] && after[k] !== before[k]);
    expect(
      written.length,
      `the banner promised ${count} and the tap wrote ${written.length} (${written.join(', ')})`
    ).toBe(count);
  });

  test('a harvest counted in bins offers the yield', async ({ page, request }) => {
    // MEASURED 2026-10-19, and this one IS a defect. Bins are the unit tree fruit is harvested
    // in, which is the crop this product is sold for.
    //
    //   "Cosechamos 85 bines del bloque 1" -> "Nothing on this activity to fill from those
    //   words." No offer at all.
    //
    // `categoryForUnit` in voiceDataMapper.ts recognises weight, volume, area, time and depth.
    // Bins are in none of them, so the amount is categorised `count`, and the harvest mapper
    // (:1501) looks for `category === 'weight'` and finds nothing.
    //
    // WORSE, when the message carries a weight for something else:
    //   "Cosechamos 120 bines ... el camion llevo 14 toneladas a la empacadora"
    //   -> "Would fill: Yield: 14 toneladas"
    // The truck's load to the packer is offered as the harvest yield. The form's own help text
    // says a certifier reads that figure for lot traceability and mass balance.
    //
    // ⛔ DO NOT "fix" the promise without fixing this. Today the wrong number is saved from
    // landing only because the unit companion rule refuses it. Make the promise keepable first
    // and 14 tonnes files itself as a 120-bin harvest.
    test.fail();
    const words = `Cosechamos 85 bines del bloque 1, variedad Chandler ${Date.now()}`;
    await openDetails(page, request, words, /^harvest$|^cosecha$/i);

    // Wait for the BANNER, which does appear, then assert on the offer with a short timeout.
    // Waiting 90s for an element that never arrives ends the test as a TIMEOUT, and Playwright
    // treats a timeout as a harness failure rather than the expected one, so `test.fail()` does
    // not accept it and the suite goes red for the wrong reason.
    await expect(
      page.getByText(/from the crew message|del mensaje de la cuadrilla/i).first()
    ).toBeVisible({ timeout: 90_000 });

    const offer = page.getByRole('button', { name: /fill in |completar /i });
    await expect(
      offer,
      'a harvest stated in bins offered nothing: the yield the crew reported is not captured'
    ).toHaveCount(1);
  });
});
