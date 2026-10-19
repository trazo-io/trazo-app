import crypto from 'node:crypto';

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * The half of the crew-note flow that only a browser can answer.
 *
 * `06-field-note-crew-reply.spec.ts` proves a signed message ARRIVES. This proves what happens
 * when a supervisor acts on it, and the assertions here are properties of the rendered page that
 * no server test can reach:
 *
 *   * the crew's words are shown as EVIDENCE, never in an editable box. A record that quotes
 *     somebody is a record about what they said, so the words must not be rewritable by a
 *     different person.
 *   * the wizard holds the suggestion OUTSIDE the form until a human taps. This is the whole
 *     difference between a suggestion and a record, and it is invisible server-side.
 *   * THE DATE QUESTION IS UNANSWERED. A message that states no day must not arrive with one
 *     filled in. Writing dated, grower-attributed events from a machine reading is the
 *     backdated-glyphosate class, and it prints into a certifier packet indistinguishable from
 *     observed practice.
 *   * the saved record carries the OPERATOR's date and `created_by`, not the sender's.
 *
 * The messages are taken from `trazo-back/fieldnotes/corpus/crew_messages.json` by id rather than
 * invented here, so the UI and the extraction audit are talking about the same sentences.
 *
 * PREREQUISITES, which differ from 06 only in pointing at an isolated database so a hundred
 * audit notes never land in a shared dev DB:
 *
 *   cd trazo-back && DATABASE_NAME=trazo_fnaudit \
 *     TWILIO_AUTH_TOKEN=e2e-field-note-token \
 *     FIELD_NOTES_WEBHOOK_URL=http://localhost:8010/api/field-notes/inbound/twilio/ \
 *     poetry run python manage.py runserver 8010
 *
 *   cd trazo-app && VITE_API_PROXY_TARGET=http://localhost:8010 npm run start -- --port 3010
 *
 *   cd trazo-app && E2E_FIELD_NOTE_TOKEN=e2e-field-note-token \
 *     E2E_BASE_URL=http://app.localhost:3010 \
 *     E2E_FIELD_NOTE_WEBHOOK_URL=http://localhost:8010/api/field-notes/inbound/twilio/ \
 *     npx playwright test 07-field-note
 *
 * Seed the database first with:
 *   DATABASE_NAME=trazo_fnaudit poetry run python manage.py audit_crew_messages --seed --limit 0
 */

const TOKEN = process.env.E2E_FIELD_NOTE_TOKEN ?? '';

const WEBHOOK_URL =
  process.env.E2E_FIELD_NOTE_WEBHOOK_URL ?? 'http://localhost:8010/api/field-notes/inbound/twilio/';

/** The roster row the seeder creates. Fixed, because the seeder attests consent on it. */
const CREW_PHONE = '+15095550123';

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
  // URLSearchParams, not `form`: the signature is computed over the raw values, and 06 measured
  // that `form` and this disagree on encoding, which surfaces as a rejected signature.
  return request.post(WEBHOOK_URL, {
    data: new URLSearchParams(params).toString(),
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'X-Twilio-Signature': sign(WEBHOOK_URL, params)
    }
  });
}

/**
 * The card for ONE note, scoped by its own words.
 *
 * ⛔ NOT `locator('div').filter({ hasText: words }).last()`, which is what this file had.
 * `hasText` matches every ANCESTOR div whose descendant text contains the string, and `.last()`
 * takes the innermost of those: the bare text wrapper holding the quote and nothing else. A
 * privacy assertion scoped there could never fail, because the element contains no phone number,
 * no buttons and no selects whatever the product does (review of app #150).
 *
 * Narrowing by a control the card owns pins it to the card itself. Every test then drives its own
 * note rather than `.first()` on a shared inbox: these tests leave notes behind for each other,
 * so an unscoped `.first()` acts on whichever note happens to sort first.
 */
/**
 * ⛔ NEVER `getByLabel(/farm/i)` HERE. The sidebar renders each establishment as an accordion
 * button whose aria-label is "<farm name> navigation section", so a label query for /farm/ starts
 * matching a BUTTON the moment the account has a second farm, and `selectOption` then fails with
 * "Element is not a <select> element". MEASURED when the seeder gained "Audit Ranch (no blocks)".
 * `combobox` is the select's own role and cannot drift onto a button.
 */
function noteCard(page: Page, words: string) {
  return page
    .locator('div')
    .filter({ hasText: words })
    .filter({ has: page.getByRole('button', { name: /log this/i }) })
    .last();
}

test.describe('a supervisor turns a crew message into a record', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see the file header');

  test('the words are evidence, not an editable field', async ({ page, request }) => {
    const words = `Regamos River Block esta manana, dos horas con el goteo ${Date.now()}`;
    expect((await deliver(request, words, `SM-ui-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await expect(page.getByText(words)).toBeVisible();

    // Nothing may offer to rewrite what somebody else said. Checked by VALUE across every input
    // and textarea, because Playwright has no getByDisplayValue and a control holding the words
    // would not match a text query at all: that is exactly how this would be missed.
    const editable = await page
      .locator('input, textarea')
      .evaluateAll(
        (els, needle) =>
          els.filter((el) => ((el as HTMLInputElement).value ?? '').includes(needle)).length,
        words
      );
    expect(editable, "the crew's words appeared in an editable field").toBe(0);
    // The NOTE shows the sender by its last four digits only. Scoped to the card, because the
    // roster section above legitimately prints the full number: it is the operator's own list of
    // who may send, and a page-wide assertion would fail there and read as a privacy defect that
    // is not there.
    const card = noteCard(page, words);
    // A POSITIVE ANCHOR FIRST. Without it the next line passes when the locator resolves to
    // nothing at all, which is how the previous version of this assertion could never fail.
    await expect(card.getByText(CREW_PHONE.slice(-4))).toBeVisible();
    await expect(card.getByText(CREW_PHONE)).toHaveCount(0);
  });

  test('the date question is unanswered when the message states no day', async ({
    page,
    request
  }) => {
    // Corpus es-nodate-001 in shape: an activity with no day anywhere in it.
    const words = `Aplicamos cal al bloque 8 ${Date.now()}`;
    expect((await deliver(request, words, `SM-nodate-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');

    // FARM AND BLOCK FIRST, because "Log this" stays disabled until both are answered and the
    // hint above it says so. That is the product working: the block a certifier traces is the
    // operator's choice, never inferred from a phone number. A test that clicked straight
    // through would be asserting a flow no supervisor can perform.
    //
    // SCOPED TO THIS TEST'S OWN NOTE. The tests above leave notes pending in the same inbox, so
    // `.first()` drove whichever note happened to sort first (review of app #150).
    const card = noteCard(page, words);
    await expect(card).toBeVisible();
    await card
      .getByRole('combobox', { name: /farm|finca/i })
      .selectOption({ label: 'Audit Ranch' });
    // BY NAME, not by index. The seeder opens a season on River Block only, and a block with no
    // season stops at "No open season on this parcel" before the form ever renders. Picking by
    // index made this test pass against a page that had no form on it at all.
    await card
      .getByRole('combobox', { name: /^block|^bloque/i })
      .selectOption({ label: 'River Block' });

    const logThis = card.getByRole('button', { name: /log this/i });
    await expect(logThis).toBeEnabled();
    await logThis.click();
    await page.waitForURL(/field_note=/);

    // THE ASSERTION THIS FILE EXISTS FOR.
    //
    // MEASURED: the control is `input[name="date"]`, type `datetime-local`. An earlier version of
    // this test looked for `input[type="date"]`, matched nothing, looped zero times and passed
    // green against a page with no form on it. A date assertion that cannot fail is worse than
    // none, because it reports the backdated-record guard as covered. So the control is asserted
    // to EXIST before its value is read.
    const dateInput = page.locator('input[name="date"]');
    await expect(dateInput, 'the wizard rendered no date control to check').toHaveCount(1);
    await expect(
      dateInput,
      'a date arrived pre-filled from a message that stated no day'
    ).toHaveValue('');
  });

  test('a named crew member does not arrive in performed_by', async ({ page, request }) => {
    // Corpus who-001. `Establishment.show_full_performer_names` has readers and no writer, so the
    // consent it represents cannot be collected, so the name must not be collected either.
    const words = `Miguel rego el bloque 4 esta manana ${Date.now()}`;
    expect((await deliver(request, words, `SM-who-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await page
      .getByRole('combobox', { name: /farm|finca/i })
      .first()
      .selectOption({ index: 1 });
    await page
      .getByRole('combobox', { name: /^block|^bloque/i })
      .first()
      .selectOption({ label: 'River Block' });
    await page
      .getByRole('button', { name: /log this/i })
      .first()
      .click();
    await page.waitForURL(/field_note=/);

    const performer = page.locator('input[name="performed_by"]');
    await expect(performer, 'the wizard rendered no performer field to check').toHaveCount(1);
    await expect(performer, "a crew member's name was lifted out of the message").toHaveValue('');
  });

  test('the whole walk: message to saved record, and what the message is NOT allowed to fill', async ({
    page,
    request
  }) => {
    // THE FLOW END TO END, because the assertions above each prove one property and none of them
    // prove the thing a grower actually cares about: that the record which lands is theirs.
    //
    // MEASURED on this walk, and it is the answer to "how much does the machine decide":
    //   * the activity is NOT pre-selected. All 17 verb tiles report aria-pressed="false" and the
    //     page says "Those are their words. The record is yours: you choose the activity, the day
    //     and what gets written." So the parser's `type` does not steer the form.
    //   * for an APPLICATION the panel says, in words: "The product, rate, quantity and area come
    //     from your own records, not from the message, so the message does not fill them."
    //     Those four are also REQUIRED, so the operator types them.
    //   * the offer sits behind "Fill in N value(s)" and fills only facts about the named product
    //     (urea -> N 46, P 0, K 0), never a quantity claimed in the message.
    const words = `Aplique 200 libras de urea en River Block, dos horas con el tractor ${Date.now()}`;
    expect((await deliver(request, words, `SM-walk-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await page
      .getByRole('combobox', { name: /farm|finca/i })
      .first()
      .selectOption({ index: 1 });
    await page
      .getByRole('combobox', { name: /^block|^bloque/i })
      .first()
      .selectOption({ label: 'River Block' });
    await page
      .getByRole('button', { name: /log this/i })
      .first()
      .click();
    await page.waitForURL(/field_note=/);

    // Nothing is chosen for the operator.
    const pressed = await page
      .locator('button[aria-pressed]')
      .evaluateAll((els) => els.filter((e) => e.getAttribute('aria-pressed') === 'true').length);
    expect(pressed, 'an activity was pre-selected from the message').toBe(0);

    await page.getByRole('button', { name: /input application/i }).click();
    await page.getByRole('button', { name: /^fertilizer$/i }).click();

    // The operator's own date. 2026-10-14 is deliberately NOT today, so a record carrying today
    // would prove the form answered for them.
    await page.locator('input[name="date"]').fill('2026-10-14T09:30');
    await page
      .getByRole('button', { name: /^continue$/i })
      .first()
      .click();

    const held = page.getByText(/come from your own records, not from the message/i);
    await expect(
      held,
      'the form no longer says what it refuses to take from a message'
    ).toBeVisible({
      timeout: 60_000
    });

    const fillBtn = page.getByRole('button', { name: /fill in \d+ value/i }).first();
    await expect(fillBtn, 'the suggestion was not held behind a tap').toBeVisible();
    await fillBtn.click();

    // What the tap filled: a fact about the product, not a quantity from the message.
    await expect(page.locator('input[name="nitrogen_percentage"]')).toHaveValue('46');
    await expect(
      page.locator('input[name="volume_numeric"]'),
      'a quantity from the message reached the form'
    ).toHaveValue('');

    // The four the message may not fill, typed by the operator.
    await page.locator('input[name="commercial_name"]').fill('Urea 46-0-0');
    await page.locator('input[name="volume_numeric"]').fill('200');
    await page.locator('input[name="area_numeric"]').fill('4');
    await page.locator('input[name="application_rate"]').fill('50');
    await page.locator('select[name="application_method"]').selectOption({ index: 1 });

    await page
      .getByRole('button', { name: /^continue$/i })
      .first()
      .click();
    await page
      .getByRole('button', { name: /create event/i })
      .first()
      .click();
    await page.waitForURL(/\/parcel\/\d+$/, { timeout: 30_000 });

    // The note leaves the queue once it became a record.
    await page.goto('/admin/dashboard/field-notes');
    await expect(page.getByText(words)).toHaveCount(0);
  });

  test('a block with no season says so and keeps the note waiting', async ({ page, request }) => {
    // Good behaviour, pinned. The same shape as the no-blocks dead end: name the obstacle, say
    // what to do, and state that nothing was lost. A silent empty form would be the defect.
    const words = `Regamos el bloque sin temporada ${Date.now()}`;
    expect((await deliver(request, words, `SM-noseason-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await page
      .getByRole('combobox', { name: /farm|finca/i })
      .first()
      .selectOption({ index: 1 });
    await page
      .getByRole('combobox', { name: /^block|^bloque/i })
      .first()
      .selectOption({ label: 'block 1' });
    await page
      .getByRole('button', { name: /log this/i })
      .first()
      .click();

    await expect(page.getByText(/no open season on this parcel/i)).toBeVisible();
    await expect(page.getByText(/still waiting in field notes/i)).toBeVisible();
  });

  test('the wizard refuses a hand-edited note id rather than inventing one', async ({ page }) => {
    // `NewEvent.jsx` fetches the note by id instead of trusting the URL, so a made-up id must
    // produce nothing rather than a blank offer that looks like a real one.
    await page.goto(
      '/admin/dashboard/farm/1/parcel/1/event/add?field_note=00000000-0000-0000-0000-000000000000'
    );

    // A POSITIVE ANCHOR FIRST. The only assertion used to be "these words are absent", which a
    // 404, an auth redirect, a server error or a blank render all satisfy: the test passed on
    // every failure it was meant to catch (review of app #150). Proving the wizard rendered at
    // all is what makes the absence below mean anything.
    await expect(
      page.getByRole('heading', { name: /add a new event|registrar actividad|log activity/i })
    ).toBeVisible({ timeout: 30_000 });

    // No crew banner, because there is no such note.
    await expect(page.getByText(/from the crew message|del mensaje de la cuadrilla/i)).toHaveCount(
      0
    );
    await expect(page.getByText(/Regamos|Aplicamos/)).toHaveCount(0);
  });

  test('a message that is not work does not arrive as a ready-to-log activity', async ({
    page,
    request
  }) => {
    // MEASURED 2026-10-19 by the corpus audit: "ok gracias", an emoji and "the truck has a flat"
    // all return type=general with manual_review false, one of them at confidence 100. If the
    // inbox presents that as a normal suggestion, noise is one tap from a compliance record.
    const words = `ok gracias ${Date.now()}`;
    expect((await deliver(request, words, `SM-nonwork-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await expect(page.getByText(words)).toBeVisible();
    // Documented as the current behaviour, not asserted as correct: this test is here to make the
    // defect visible in the UI layer and to fail loudly if the handling changes either way.
    await expect(page.getByRole('button', { name: /log this/i }).first()).toBeVisible();
  });
});

test.describe('a farm with no blocks', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see the file header');

  test('says so and offers the way out instead of an empty required select', async ({
    page,
    request
  }) => {
    // THE DEAD END, ASSERTED RATHER THAN HOPED FOR.
    //
    // This was `if ((await deadEnd.count()) > 0)` with no else and no fallback, so it passed
    // whether the message appeared or not: if the regression came back, or the page simply had
    // not rendered, the test stayed green (review of app #150). `count()` is a one-shot,
    // non-retrying query, so on a slow render it answered 0 and the test asserted nothing at all.
    //
    // The seeder now provisions "Audit Ranch (no blocks)" with zero parcels, which is a
    // deterministic way into the state. The behaviour under test is trazo-app #125.
    const words = `Regamos algo en la finca sin bloques ${Date.now()}`;
    expect((await deliver(request, words, `SM-noblocks-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    const card = noteCard(page, words);
    await card
      .getByRole('combobox', { name: /farm|finca/i })
      .selectOption({ label: 'Audit Ranch (no blocks)' });

    await expect(card.getByText(/has no blocks yet|todav[ií]a no tiene bloques/i)).toBeVisible();
    await expect(
      card.getByRole('button', { name: /add a block|agregar un bloque/i })
    ).toBeVisible();
    // The empty required select is not left open to be tabbed into.
    await expect(card.getByRole('combobox', { name: /^block|^bloque/i })).toBeDisabled();
    // And nothing may be logged from it.
    await expect(card.getByRole('button', { name: /log this|registrar esto/i })).toBeDisabled();
  });
});
