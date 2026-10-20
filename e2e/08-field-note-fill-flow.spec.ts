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

/**
 * Every control keyed by its ACCESSIBLE NAME, never by `name`, and never collapsed.
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
 * ⛔ AND LABELS ARE NOT UNIQUE. A value and its companion unit select share one `StandardField`,
 * so Chakra gives both controls the same id from the one `FormControl` and
 * `label[for=...]` answers the same text for each: `irrigation_depth` + `irrigation_depth_unit`
 * (ProductionTab.jsx:5464), `yield_total` + `yield_total_unit` (:3502). `Object.fromEntries`
 * keeps the LAST pair for a repeated key, so the unit select, which always carries a default
 * like `lbs`, silently overwrote the number it belongs to. A test reading a value+unit field
 * would have read the unit and called it the value (review of app #157).
 *
 * Repeats therefore keep their own entry, suffixed by the control's `name` when it has one. The
 * FIRST control under a label keeps the plain label, because that is the value and the unit
 * follows it in DOM order.
 *
 * The lesson is not "use labels". It is that a measurement which cannot see the thing it is
 * measuring reports its own blind spot as a product defect, and reads exactly like a finding.
 * Both versions of this helper did that, in two different ways.
 */
async function fields(page: Page): Promise<Record<string, string>> {
  const raw = await page.locator('input, select, textarea').evaluateAll((els) =>
    els.map((e) => {
      const el = e as HTMLInputElement;
      let label = el.getAttribute('aria-label') ?? '';
      if (!label && el.id) {
        label = document.querySelector(`label[for="${el.id}"]`)?.textContent?.trim() ?? '';
      }
      if (!label) label = el.closest('div')?.querySelector('label')?.textContent?.trim() ?? '';
      return [label || el.name || '(unnamed)', String(el.value ?? ''), el.name ?? ''];
    })
  );
  const out: Record<string, string> = {};
  for (const [label, value, name] of raw as [string, string, string][]) {
    // UNTIL IT IS UNIQUE, not once, and `name` is not a tiebreaker on its own: a radio group's
    // inputs share one `name` by design, so a third control under the same label and name would
    // have collided on the computed key and overwritten the second. That is the same silent
    // misread one level down (review of app #157). Nothing on the irrigation form does this
    // today; the point is that this reader cannot lose a control whatever form it is given.
    let key = label;
    for (let n = 2; key in out; n += 1) {
      const tag = name ? (n === 2 ? name : `${name} ${n}`) : String(n);
      key = `${label} [${tag}]`;
    }
    out[key] = value;
  }
  return out;
}

test.describe('a note that is allowed to fill', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see spec 07');

  test('irrigation: the offer is held, then written on a tap', async ({ page, request }) => {
    const words = `Regamos el bloque 4 por goteo, tres horas ${Date.now()}`;
    await openDetails(page, request, words, /^irrigation$|^riego$/i);

    // HELD, not merged. Nothing from the message is in the form until a person asks.
    const before = await fields(page);
    // THE HARNESS MEASURES ITSELF FIRST, because both of this file's wrong answers came from the
    // reader and not from the product. MEASURED on this form: 25 controls, and four of them share
    // a label with another, `Irrigation Depth` with its own unit select among them. Keyed by
    // label alone and collapsed with `Object.fromEntries`, those 25 became 21 and
    // `before['Irrigation Depth']` answered the unit, never the number (review of app #157).
    const controls = await page.locator('input, select, textarea').count();
    expect(
      Object.keys(before).length,
      'fields() collapsed controls that share a label, so it is reading the wrong one'
    ).toBe(controls);
    // The collision itself, named: the value keeps the plain label, the unit is suffixed.
    expect(Object.keys(before)).toContain('Irrigation Depth [irrigation_depth_unit]');
    expect(before['Irrigation Depth'], 'the depth read as its own unit select').toBe('');
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
});

/**
 * ⚠️ RETRIED, and deliberately. The offer this asserts comes from a live model, and its recall
 * varies: MEASURED 2026-10-20, the same sentence ("Cosechamos 85 bines del bloque 1") produced
 * "Would fill: Yield: 85 bins" on one run and no amount at all on the next, with identical code.
 * A real regression fails every attempt; a parse that simply did not return the amount this
 * minute does not. Without this, the file reports model variance as a product defect, which is
 * the mistake this whole spec exists to stop making.
 */
test.describe('a harvest counted in bins', () => {
  test.describe.configure({ retries: 2 });
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see spec 07');

  test('offers the yield, and the tap writes it', async ({ page, request }) => {
    // THIS TEST CARRIED `test.fail()` AND THE DEFECT IS NOW FIXED (app #159), so it reads as a
    // plain assertion. What it recorded, measured 2026-10-19:
    //
    //   "Cosechamos 85 bines del bloque 1" -> "Nothing on this activity to fill from those
    //   words." No offer at all, because bins were in no dimension `categoryForUnit` knew.
    //
    //   "Cosechamos 120 bines ... el camion llevo 14 toneladas a la empacadora"
    //   -> "Would fill: Yield: 14 toneladas". The truck's load to the packer offered as the
    //   harvest yield, on a figure a certifier reads for lot traceability and mass balance.
    //
    // And once those were right, the tap still answered "0 fields filled": `mergeOfferedValues`
    // read the tab's DEFAULT unit as a filled field and skipped the whole pair.
    //
    // The last one is why this is a browser test and not three more unit tests: it only exists
    // once a real form has supplied its own defaults.
    test.setTimeout(240_000);
    const words = `Cosechamos 85 bines del bloque 1, variedad Chandler ${Date.now()}`;
    await openDetails(page, request, words, /^harvest$|^cosecha$/i);

    const offer = page.getByRole('button', { name: /fill in |completar /i }).first();
    await expect(
      offer,
      'a harvest stated in bins offered nothing: the yield the crew reported is not captured'
    ).toBeVisible({ timeout: 90_000 });

    // NAMED IN THE BANNER, in the unit the crew used. "85" with no unit, or 85 under the form's
    // default pounds, would be a different number. Read from the chips rather than from a
    // sentence: the label and the value are separate elements since app #160.
    await expect(page.getByTestId('crew-note-offered')).toContainText(/85 bins/i);

    const before = await fields(page);
    expect(before['Quantity harvested'], 'the message wrote a value before any tap').toBe('');
    await offer.click();
    await page.waitForTimeout(1500);
    const after = await fields(page);

    expect(after['Quantity harvested'], 'the tap did not write the yield it offered').toBe('85');
    // The unit travels with the number. It arrives as the tab default ("lbs"), and a default is
    // not an answer, so the offer is allowed to replace it.
    const unitKey = Object.keys(after).find((k) => /^unit/i.test(k) && after[k] === 'bins');
    expect(unitKey, `no unit select reads "bins": ${JSON.stringify(after)}`).toBeTruthy();
  });
});
