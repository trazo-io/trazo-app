/**
 * Guard: the Event Preview modal tells the truth, and uses ONE notice component.
 *
 * OBSERVED 2026-08-27. The modal stacked FOUR notices around a single preview card, built
 * three different ways:
 *
 *   1. "… Preview"                 hand-rolled <Box>  blue.50 / blue.200 / blue.500 icon
 *   2. "Certifier-only record"     real StandardAlert  ← the only correct one
 *   3. "Your notes will be public" hand-rolled <Box>  gray, or ORANGE when the scan hit
 *   4. "💡 Tip: …"                 hand-rolled <Box>  green.50, emoji, centred text
 *
 * ── Why the hand-rolled ones were wrong, in numbers ──────────────────────────────────
 * MEASURED against `blue.50`, the ground block 1 painted:
 *     heading blue.600  3.22  (needs 4.5)  ✗
 *     body    blue.700  4.03  (needs 4.5)  ✗
 *     icon    blue.500  2.74  (needs 3.0)  ✗
 * `theme/components/alert.js` records the SAME 2.74 for blue.500 as its reason for moving the
 * real alert to the `.700` step. The imitation used exactly the values the theme had rejected.
 *
 * Block 3 swapped in `orange.50`/`orange.200` for its warning state. `orange` is not a Trazo
 * scale — the theme defines green, gray, red, blue and amber — so it silently rendered
 * CHAKRA's orange, a different accent from every other warning in the app.
 *
 * ── The part that mattered more than colour ──────────────────────────────────────────
 * The banner promised "how consumers will see your event" UNCONDITIONALLY, including for the
 * four production subtypes the backend withholds from the buyer page entirely (BU/SS/EM/TP).
 * So the modal opened by saying consumers would see the activity and, two blocks later, said
 * it is "not shown on your buyer page". For a seed search the whole consumer framing is wrong.
 *
 * These assertions read SOURCE rather than rendering: reaching this modal needs a parcel with
 * an open season plus a full wizard pass, and the defects are all in the markup — a colour
 * literal, an emoji, and a banner that renders unconditionally.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { CONSUMER_WITHHELD_PRODUCTION_SUBTYPES } from '../../../utils/consumerDisplay';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const MODAL = join(__dirname, '..', 'EventPreviewModal.tsx');

/** Blank comments, keeping newlines — the note above quotes every literal it bans. */
const code = readFileSync(MODAL, 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^(\s*)\/\/.*$/gm, '$1');

describe('EventPreviewModal', () => {
  it('has a modal to check', () => {
    // Renamed or moved, every assertion below passes by scanning nothing.
    expect(code.length).toBeGreaterThan(2000);
    expect(code, 'the modal no longer renders a preview card').toContain('ConsumerEventCard');
  });

  it('paints no notice by hand', () => {
    /*
     * A tinted `bg` next to a matching `border`/`borderColor` is the shape of every one of
     * the three imitations. `StandardAlert` owns the ground, the accent bar and the icon —
     * a call site that sets them is a second definition that outranks the theme.
     */
    const offenders = [...code.matchAll(/bg=\{?[^\n]*?(blue|orange|green|gray)\.\d{2,3}/g)].map(
      (m) => m[0].trim()
    );
    expect(
      offenders,
      `Use <StandardAlert>. MEASURED on the ground these painted: blue.600 heading 3.22, ` +
        `blue.700 body 4.03, blue.500 icon 2.74 — all below their floors, and the theme had ` +
        `already rejected blue.500 for exactly this:\n${JSON.stringify(offenders, null, 2)}`
    ).toEqual([]);
  });

  it('never reaches for a palette the theme does not define', () => {
    // `orange` is not a Trazo scale; it resolves to Chakra's, a different accent from amber.
    expect(code, '`orange.*` is Chakra`s palette leaking in — warning maps to amber').not.toMatch(
      /orange\.\d{2,3}/
    );
    expect(code, 'Badge colorScheme is inert in this theme — use `variant="warning"`').not.toMatch(
      /colorScheme="orange"/
    );
  });

  it('uses no emoji, in the markup OR in its copy', () => {
    /*
     * The tip block was the only emoji in the modal, and the only centred text.
     *
     * ⚠️ Checking the component alone is not enough, and the first version of this did exactly
     * that: a mutation putting 💡 into `events.preview.incomplete` — a TRANSLATED string, which
     * is where copy actually lives — sailed straight through. The rendered glyph does not care
     * which file it came from.
     */
    const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(code, 'an emoji is back in the markup — the design system uses react-icons').not.toMatch(
      EMOJI
    );
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    for (const [locale, dict] of [
      ['en-US', en],
      ['es-419', es]
    ] as const) {
      for (const [key, value] of Object.entries(dict)) {
        if (!key.startsWith('events.preview.')) continue;
        expect(EMOJI.test(value), `${locale} ${key} carries an emoji: ${value}`).toBe(false);
      }
    }
  });

  it('keeps the section glyph on a step that passes', () => {
    /*
     * `green.500` is 2.78 on white against the 3.0 a graphical mark owes; `.700` is 5.13.
     * `.claude/rules/frontend.md` bans the .500 step for anything that renders marks, and it
     * keeps coming back because the value arrives through a prop rather than a variable.
     */
    expect(code, 'the heading icon dropped back to the failing green.500 step').not.toMatch(
      /<Icon[^>]*color="green\.500"/
    );
  });

  it('only promises a consumer preview when the activity reaches a shopper', () => {
    /*
     * THE defect. `buyerPageWithheldReasonId` returns a reason for BU/SS/EM/TP, which the
     * backend drops from the public serializer. The banner must not render then.
     */
    expect(Object.keys(CONSUMER_WITHHELD_PRODUCTION_SUBTYPES).length).toBeGreaterThanOrEqual(4);
    expect(code, 'the withheld check must be hoisted so the banner can read it').toMatch(
      /const isWithheld = Boolean\(withheldReasonId\)/
    );
    expect(code, 'the opening banner must be gated on it').toMatch(/\{!isWithheld && \(/);
    // …and the section heading must change with it, not claim "consumers" either way.
    expect(code, 'the heading must switch between the shopper and certifier wording').toMatch(
      /isWithheld\s*\?\s*'events\.preview\.headingCertifier'/
    );
  });

  it('makes no verification claim', () => {
    /*
     * The banner used to read "actual verification will be applied when the event is saved".
     * `.claude/rules/compliance.md`: Trazo DOCUMENTS, it does not verify. Saying verification
     * "will be applied" states that Trazo performs it.
     */
    const en = enUS as Record<string, string>;
    for (const key of ['events.preview.banner.body', 'events.preview.banner.title']) {
      expect(en[key], `${key} is missing`).toBeTruthy();
      expect(en[key], `${key} claims Trazo verifies — see .claude/rules/compliance.md`).not.toMatch(
        /verif(y|ied|ication)/i
      );
    }
  });

  it('ships every new string in both locales', () => {
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    for (const key of [
      'events.preview.banner.title',
      'events.preview.banner.body',
      'events.preview.incomplete',
      'events.preview.headingConsumer',
      'events.preview.headingCertifier'
    ]) {
      expect(en[key], `${key} missing from en-US`).toBeTruthy();
      expect(es[key], `${key} missing from es-419`).toBeTruthy();
      expect(es[key], `${key} was never translated`).not.toBe(en[key]);
    }
    // and nothing hard-coded back into the markup
    for (const literal of ['How consumers will see this event', 'Fill in more details']) {
      expect(code.includes(literal), `"${literal}" is hard-coded again`).toBe(false);
    }
  });
});
