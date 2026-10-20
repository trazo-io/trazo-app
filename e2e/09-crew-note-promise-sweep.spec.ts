import crypto from 'node:crypto';

import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * ONE INVARIANT, ACROSS EVERY TAB: what the banner promises, the tap writes.
 *
 * 🔴 WHY THIS FILE EXISTS. Specs 07 and 08 walk irrigation and harvest, which are both the
 * PRODUCTION tab. A crew message in production offered "Activity Type: Maintenance" on a General
 * event, the operator tapped, the banner said "1 field filled", and the select underneath still
 * read "Select activity type...". The value was valid and the merge did write it: under the
 * MODEL's name (`activity_type`), while that tab's select is `name="type"`. Every General field a
 * message can fill was landing in a key nothing reads, and no test could see it because no test
 * left the production tab.
 *
 * The form field names are per-TAB, so the coverage has to be per-tab. Each case below lands on a
 * different tab component or a different subtype within one.
 *
 * ⚠️ THE PARSE IS NONDETERMINISTIC. The same sentence returns an offer on one run and nothing on
 * the next (MEASURED 2026-10-20). So each case asserts the IMPLICATION — if something was
 * promised, it was written — and the run as a whole asserts a coverage floor, which is what fails
 * if the parser quietly stops offering anything at all. A per-case "it offered something"
 * assertion would be flaky; a floor over a dozen cases is not.
 *
 * Prerequisites: the isolated stack from spec 07's header.
 */

const TOKEN = process.env.E2E_FIELD_NOTE_TOKEN ?? '';
const WEBHOOK_URL =
  process.env.E2E_FIELD_NOTE_WEBHOOK_URL ?? 'http://localhost:8010/api/field-notes/inbound/twilio/';
const CREW_PHONE = '+15095550123';
const FARM = 'Audit Ranch';
const BLOCK_WITH_SEASON = 'River Block';

/** Each case lands on a different tab, or a different subtype of one. */
const CASES: {
  name: string;
  verb: RegExp;
  subtype?: RegExp;
  words: string;
  /** This tab has no crew-note panel at all. Asserted, not skipped: see the weather case. */
  noPanel?: boolean;
}[] = [
  {
    name: 'general / other activity',
    verb: /^other activity$/i,
    words: 'Fixed the leak in the drip line, two of us, about three hours'
  },
  {
    name: 'production / irrigation',
    verb: /^irrigation$/i,
    words: 'Regamos el bloque 4 por goteo, tres horas'
  },
  {
    name: 'production / harvest',
    verb: /^harvest$/i,
    words: 'Cosechamos 85 bines del bloque 1, variedad Chandler'
  },
  {
    name: 'production / pruning',
    verb: /^pruning & canopy$/i,
    words: 'Podamos el bloque 1 toda la mañana, dos personas'
  },
  {
    name: 'production / field work',
    verb: /^field work$/i,
    words: 'Pasamos la rastra en 12 acres del bloque 1, cuatro horas de tractor'
  },
  {
    name: 'production / transport',
    verb: /^transport$/i,
    words: 'Llevamos la fruta a la empacadora, 40 kilometros'
  },
  {
    name: 'chemical / pesticide',
    verb: /^input application$/i,
    subtype: /^pesticide$/i,
    words: 'Sprayed Entrust 6 fl oz per acre on block 1 for codling moth'
  },
  {
    name: 'chemical / fertilizer',
    verb: /^input application$/i,
    subtype: /^fertilizer$/i,
    words: 'Aplicamos 200 libras de urea en el bloque 1 con la aspersora'
  },
  {
    name: 'soil & amendments',
    verb: /^soil & amendments$/i,
    words: 'Aplicamos compost en el bloque 1, 5 toneladas en 10 acres'
  },
  {
    name: 'pest & scouting',
    verb: /^pest & scouting$/i,
    words: 'Revisamos trampas en el bloque 1, encontramos gusano de la manzana'
  },
  {
    // ⚠️ NO PANEL, BY CONSTRUCTION. `NewEvent.jsx` gates the whole accelerator on
    // `activeEventType !== 0`, and Weather is 0, so a crew message about last night's frost
    // reaches a form that cannot read a word of it. Asserted rather than skipped: the day
    // somebody opens that gate, this line fails and the case gets real coverage instead of
    // sitting here as a comment nobody re-checks.
    name: 'weather event',
    verb: /^weather event$/i,
    words: 'Helada anoche en el bloque 1, bajo a menos dos grados',
    noPanel: true
  },
  {
    name: 'frost protection',
    verb: /^frost protection$/i,
    words: 'Prendimos los ventiladores anoche en el bloque 1, cuatro horas'
  }
];

function sign(url: string, params: Record<string, string>): string {
  const payload =
    url +
    Object.keys(params)
      .sort()
      .map((k) => k + params[k])
      .join('');
  return crypto.createHmac('sha1', TOKEN).update(payload).digest('base64');
}

async function deliver(request: APIRequestContext, body: string) {
  const params: Record<string, string> = {
    MessageSid: `SM-sweep-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

/**
 * Every control and its value, keyed by its accessible name and never collapsed.
 *
 * Same reader as spec 08, and for the same two reasons: a Chakra NumberInput carries an empty
 * `name`, and a value and its unit select share one label, so neither `name` nor label alone is
 * a usable key. Repeats keep their own entry.
 */
async function controlsByLabel(page: Page): Promise<Record<string, string>> {
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
    let key = label;
    for (let n = 2; key in out; n += 1) {
      const tag = name ? (n === 2 ? name : `${name} ${n}`) : String(n);
      key = `${label} [${tag}]`;
    }
    out[key] = value;
  }
  return out;
}

/** "Yield: 85 bins" -> "Yield". The label is what the form carries. */
const chipLabel = (chip: string) =>
  chip
    .split(':')[0]
    .trim()
    .replace(/\s*\*$/, '');

const normalise = (s: string) =>
  s
    .trim()
    .replace(/\s*\*$/, '')
    .toLowerCase();

test.describe('what the operator chose, the offer leaves alone', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see spec 07');

  test('a General pick survives the tap that fills the rest', async ({ page, request }) => {
    // 🔴 THE REGRESSION THE RENAME NEARLY SHIPPED (review of app #163). Every "is this already
    // filled?" decision reads `eventFormData` by the REGISTRY's names, while a General form
    // stores the operator's answers under the FORM's (`type`, `duration_hours`, `participants`).
    // So those three always read as empty and the offer always counted them writable. While the
    // write landed on a dead key that was harmless; the moment the rename put it on the live key,
    // "Fill in N values" would have replaced an Activity Type the operator picked themselves,
    // with the banner still crediting the note for it.
    test.setTimeout(240_000);
    const words = `Fixed the leak in the drip line, two of us, about three hours (own pick ${Date.now()})`;
    expect((await deliver(request, words)).status()).toBe(200);

    await page.goto('/admin/dashboard/field-notes');
    const card = page
      .locator('div')
      .filter({ hasText: words })
      .filter({ has: page.getByRole('button', { name: /log this/i }) })
      .last();
    await card.getByRole('combobox', { name: /farm|finca/i }).selectOption({ label: FARM });
    await card
      .getByRole('combobox', { name: /^block|^bloque/i })
      .selectOption({ label: BLOCK_WITH_SEASON });
    await card.getByRole('button', { name: /log this/i }).click();
    await page.waitForURL(/field_note=/);
    await page
      .getByRole('button', { name: /^other activity$/i })
      .first()
      .click();
    await page.locator('input[name="date"]').fill('2026-10-14T09:30');
    await page
      .getByRole('button', { name: /^continue$|^continuar$/i })
      .first()
      .click();
    await expect(
      page.getByText(/from (the|a) crew message|mensaje de la cuadrilla/i).first()
    ).toBeVisible({ timeout: 120_000 });

    // The operator disagrees with the note and picks for themselves. The note says maintenance.
    const activityType = page.locator('select[name="type"]');
    await expect(activityType).toBeVisible();
    await activityType.selectOption('inspection');
    await expect(activityType).toHaveValue('inspection');
    // The tab reports upward on a debounce, so a pick and an immediate tap is a race a person can
    // lose too. Give it the moment a human would take; the race itself is measured below.
    await page.waitForTimeout(1500);

    const fill = page.getByRole('button', { name: /fill in |completar /i }).first();
    if (!(await fill.isVisible().catch(() => false))) {
      // No offer on this run; the parse is nondeterministic and there is nothing to tap.
      return;
    }
    await fill.click();
    await page.waitForTimeout(1500);

    await expect(
      activityType,
      'the offer replaced an activity type the operator chose themselves'
    ).toHaveValue('inspection');
  });
});

test.describe('what the banner promises, the tap writes', () => {
  test.skip(!TOKEN, 'set E2E_FIELD_NOTE_TOKEN and run the backend with it; see spec 07');

  test('holds on every tab a crew message can reach', async ({ page, request }) => {
    test.setTimeout(900_000);

    const offered: string[] = [];
    const broken: string[] = [];
    const reachable = CASES.filter((c) => !c.noPanel).length;
    const unmatched: string[] = [];

    for (const testCase of CASES) {
      const words = `${testCase.words} (sweep ${Date.now()})`;
      expect((await deliver(request, words)).status()).toBe(200);

      await page.goto('/admin/dashboard/field-notes');
      const card = page
        .locator('div')
        .filter({ hasText: words })
        .filter({ has: page.getByRole('button', { name: /log this/i }) })
        .last();
      await card.getByRole('combobox', { name: /farm|finca/i }).selectOption({ label: FARM });
      await card
        .getByRole('combobox', { name: /^block|^bloque/i })
        .selectOption({ label: BLOCK_WITH_SEASON });
      await card.getByRole('button', { name: /log this/i }).click();
      await page.waitForURL(/field_note=/);

      await page.getByRole('button', { name: testCase.verb }).first().click();
      if (testCase.subtype) {
        await page.getByRole('button', { name: testCase.subtype }).first().click();
      }
      await page.locator('input[name="date"]').fill('2026-10-14T09:30');
      await page
        .getByRole('button', { name: /^continue$|^continuar$/i })
        .first()
        .click();

      if (testCase.noPanel) {
        await expect(
          page.getByRole('button', { name: /fill by voice|paste a note/i }),
          `${testCase.name}: this tab now HAS a crew-note panel, so give it real coverage`
        ).toHaveCount(0);
        continue;
      }

      // EVERY HEADLINE THIS PANEL CAN SHOW, not just the happy one. Manual review reads "From A
      // crew message: needs a person to read it" (`crewNoteManualReviewHeadline`), with an "a"
      // where the others have "the", so matching only "from the crew message" waits out the full
      // timeout on a banner that is sitting right there. Found by this spec on its first run.
      await expect(
        page.getByText(/from (the|a) crew message|mensaje de la cuadrilla/i).first(),
        `${testCase.name}: the parse never finished`
      ).toBeVisible({ timeout: 120_000 });

      const fill = page.getByRole('button', { name: /fill in |completar /i }).first();
      if (!(await fill.isVisible().catch(() => false))) {
        // Nothing was offered on this run. Not an assertion: see the header.
        continue;
      }

      // ONE CHIP PER ELEMENT. The first version split the row's text on capital letters, which
      // cut "Activity Type" into "Activity" and "Type" and reported both as missing controls.
      // The chips are separate nodes; read them as nodes.
      const chips = await page.getByTestId('crew-note-offered').locator('> *').allTextContents();
      const promised = chips.map(chipLabel).filter(Boolean);
      offered.push(`${testCase.name}: ${promised.join(' | ')}`);

      const before = await controlsByLabel(page);
      await fill.click();
      await page.waitForTimeout(1500);
      const after = await controlsByLabel(page);
      const keys = Object.keys(after);
      const changed = keys.filter((k) => after[k] && after[k] !== before[k]);

      for (const chip of chips) {
        // A CHIP WITH NO VALUE is a promise of nothing: the banner named a field it has no
        // value for, and the farmer is asked to accept a blank.
        if (!chip.includes(':')) {
          broken.push(`${testCase.name}: named "${chipLabel(chip)}" with no value behind it`);
        }
      }

      for (const label of promised) {
        // ⚠️ THE CHIP'S WORDS ARE THE REGISTRY'S LABEL, which is not always the FORM's label for
        // the same field ("Yield" on the chip, "Quantity harvested" on the harvest form). So a
        // label that finds no control is reported for information, never as a failure, and the
        // aggregate check below is what holds those cases.
        const key = keys.find((k) => normalise(k).startsWith(normalise(label)));
        if (!key) {
          unmatched.push(`${testCase.name}: "${label}" (chip label is not a form label)`);
          continue;
        }
        if (!after[key]) {
          broken.push(`${testCase.name}: promised "${label}", the field is still empty`);
        }
      }

      // THE AGGREGATE, which is what the production defect looked like: the banner promised one
      // value, said "1 field filled", and NOTHING on the form changed. Unit companions change
      // alongside their value, so this can only over-count, never under-count.
      if (changed.length < promised.length) {
        broken.push(
          `${testCase.name}: promised ${promised.length} (${promised.join(', ')}) and ` +
            `${changed.length} control(s) changed (${changed.join(', ')})`
        );
      }
    }

    console.log('OFFERED\n' + offered.join('\n'));
    if (unmatched.length)
      console.log('CHIP LABELS WITH NO MATCHING FORM LABEL\n' + unmatched.join('\n'));

    // THE INVARIANT. A promise the tap does not keep reads to the operator as a value that was
    // recorded, and it is what the production defect looked like from the outside.
    expect(broken, `promises the tap did not keep:\n${broken.join('\n')}`).toEqual([]);

    // THE COVERAGE FLOOR, so the file cannot pass by offering nothing anywhere. Deliberately well
    // under the number of cases: the parse is nondeterministic and this is a tripwire for "the
    // offer stopped working", not a measurement of recall.
    expect(
      offered.length,
      `only ${offered.length} of ${reachable} cases produced any offer at all`
    ).toBeGreaterThanOrEqual(Math.ceil(reachable / 2));
  });
});
