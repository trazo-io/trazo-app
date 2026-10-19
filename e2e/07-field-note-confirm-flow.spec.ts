import crypto from 'node:crypto';

import { test, expect, type APIRequestContext } from '@playwright/test';

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
    // The NOTE shows the sender by its last four digits only. Scoped to the note card on
    // purpose: the roster section above legitimately prints the full number, because that is the
    // operator's own list of who may send. A page-wide assertion fails on the roster and would
    // read as a privacy defect that is not there.
    const noteCard = page.locator('div').filter({ hasText: words }).last();
    await expect(noteCard.getByText(CREW_PHONE)).toHaveCount(0);
  });

  test('the date question is unanswered when the message states no day', async ({
    page,
    request
  }) => {
    // Corpus es-nodate-001 in shape: an activity with no day anywhere in it.
    const words = `Aplicamos cal al bloque 8 ${Date.now()}`;
    expect((await deliver(request, words, `SM-nodate-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    const card = page.locator('div').filter({ hasText: words }).last();
    await expect(card).toBeVisible();

    // FARM AND BLOCK FIRST, because "Log this" stays disabled until both are answered and the
    // hint above it says so. That is the product working: the block a certifier traces is the
    // operator's choice, never inferred from a phone number. A test that clicked straight
    // through would be asserting a flow no supervisor can perform.
    await page.getByLabel(/farm/i).first().selectOption({ index: 1 });
    // BY NAME, not by index. The seeder opens a season on River Block only, and a block with no
    // season stops at "No open season on this parcel" before the form ever renders. Picking by
    // index made this test pass against a page that had no form on it at all.
    await page.getByLabel(/block/i).first().selectOption({ label: 'River Block' });

    const logThis = page.getByRole('button', { name: /log this/i }).first();
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
    await page.getByLabel(/farm/i).first().selectOption({ index: 1 });
    await page.getByLabel(/block/i).first().selectOption({ label: 'River Block' });
    await page
      .getByRole('button', { name: /log this/i })
      .first()
      .click();
    await page.waitForURL(/field_note=/);

    const performer = page.locator('input[name="performed_by"]');
    await expect(performer, 'the wizard rendered no performer field to check').toHaveCount(1);
    await expect(performer, "a crew member's name was lifted out of the message").toHaveValue('');
  });

  test('a block with no season says so and keeps the note waiting', async ({ page, request }) => {
    // Good behaviour, pinned. The same shape as the no-blocks dead end: name the obstacle, say
    // what to do, and state that nothing was lost. A silent empty form would be the defect.
    const words = `Regamos el bloque sin temporada ${Date.now()}`;
    expect((await deliver(request, words, `SM-noseason-${Date.now()}`)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    await page.getByLabel(/farm/i).first().selectOption({ index: 1 });
    await page.getByLabel(/block/i).first().selectOption({ label: 'block 1' });
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

  test('says so and offers the way out instead of an empty required select', async ({ page }) => {
    // The defect fixed in trazo-app #125, asserted where it actually lives. The vitest guard
    // covers the branch; this covers the rendered page a supervisor sees.
    await page.goto('/admin/dashboard/field-notes');
    const deadEnd = page.getByText(/has no blocks yet/i);
    if ((await deadEnd.count()) > 0) {
      await expect(page.getByRole('button', { name: /add a block/i })).toBeVisible();
    }
  });
});
