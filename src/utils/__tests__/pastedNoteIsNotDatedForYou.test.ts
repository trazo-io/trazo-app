/**
 * A pasted note must not inherit the wizard's guess of today, and its held values must not
 * vanish (2026-09-25).
 *
 * WHAT THIS PROVES AND WHAT IT DOES NOT. NewEvent.jsx is ~4000 lines with no render test in the
 * tree, so this asserts on its SOURCE, the same way `voiceMounted.test.ts` guards that voice is
 * reachable at all. A source assertion cannot prove the behaviour runs; it proves the guard has
 * not been deleted, which is the regression that actually happens. The behaviour of the date
 * predicate itself is tested for real in `calendarDateRendering.test.ts`.
 *
 * THE TWO DEFECTS BEHIND IT:
 *
 * 1. The date. Step 0 seeds `date` with `nowLocalDateTimeInput()` before the paste box is ever
 *    reached, so three notes from Tuesday's spray, pasted on Friday, became three records dated
 *    Friday. Wrong pre-harvest interval, wrong CA PUR day (it files strictly on `event.date`),
 *    and a packet asserting an application on a day nobody sprayed. The spoken path never had
 *    this problem: a farmer speaks about what they just did.
 *
 * 2. The hold. On soil, pest and business the subtype lives in a select INSIDE the tab, so at
 *    parse time there is no subtype to gate against. The spoken path holds those values and
 *    re-gates them when the subtype arrives. The seeded path dropped the hold while still
 *    zeroing `droppedCount`, so the values were discarded AND the "not filled in" notice was
 *    suppressed with them. Acreage is gated on 9 of the 10 soil subtypes.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const NEW_EVENT = join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
const src = readFileSync(NEW_EVENT, 'utf8');

/** The seeded branch of `handleVoiceEventDetected`, from its guard to its early return. */
const seededBranch = (() => {
  const start = src.indexOf('if (eventData.seeded) {');
  expect(start).toBeGreaterThan(-1);
  return src.slice(start, src.indexOf('\n    }', start));
})();

describe('a pasted note is not dated for the farmer', () => {
  it('asks the date predicate whether the value is merely inherited', () => {
    expect(src).toMatch(/import \{[^}]*isTodayLocalDateTimeInput[^}]*\} from 'utils\/dateOnly'/);
    expect(seededBranch).toMatch(/isTodayLocalDateTimeInput\(inheritedDate\)/);
  });

  it('clears the inherited date instead of leaving it on the record', () => {
    expect(seededBranch).toMatch(/delete next\.date/);
    expect(seededBranch).toMatch(/basicMethods\.setValue\('date', ''\)/);
  });

  it('offers today back as a suggestion rather than writing it', () => {
    // Suggest-then-confirm: the value sits on the banner until a tap moves it to the form.
    expect(seededBranch).toMatch(/dateSuggestion:/);
    expect(src).toMatch(/const handleVoiceSeededUseToday = \(\) => \{/);
    expect(src).toMatch(/events\.voice\.pastedNoteDateUseToday/);
  });

  it('keeps step 0 as the only editor of the date', () => {
    // A second date input inside the banner would be a second editor for a 205.103(b)(2)
    // value, which is the shape that produced the buffer and OFPP clobbers.
    const another = src.slice(src.indexOf('const handleVoiceSeededPickAnotherDay'));
    expect(another.slice(0, 200)).toMatch(/setActiveStep\(0\)/);
    expect(src).not.toMatch(/type="datetime-local"[^>]*voiceBanner/);
  });

  it('refuses to save a record with no day at all', () => {
    // The consequence of clearing: step 0's schema is the only thing that demands a date, and
    // the paste box lives on step 1.
    const submit = src.slice(src.indexOf('const onSubmitMedia = async () => {'));
    expect(submit.slice(0, 1200)).toMatch(/if \(!eventFormData\.date\)/);
    expect(submit.slice(0, 1200)).toMatch(/setActiveStep\(0\)/);
  });
});

describe('a held pasted note is re-offered, never dropped and never merged', () => {
  it('keeps the hold on the seeded path', () => {
    expect(seededBranch).toMatch(/pendingVoiceRef\.current = holding/);
    expect(seededBranch).toMatch(/seeded: true/);
  });

  it('carries the transcript so the re-offer can still quote the note', () => {
    // Picking a verb tile nulls the banner, so the rebuilt offer has no words of its own.
    expect(seededBranch).toMatch(/transcript: banner\.transcript/);
  });

  it('only zeroes droppedCount while something is actually holding the values', () => {
    expect(seededBranch).toMatch(/droppedCount: holding \? 0 : banner\.droppedCount/);
  });

  it('re-OFFERS on subtype arrival instead of merging into the form', () => {
    // Anchor on the `pending.detected` call, which is unique. The bare
    // `const { kept, dropped } = gateVoiceOverridesToForm` line appears twice in this file and
    // the first hit is a different function, which is how this test failed on its first run.
    const anchor = 'gateVoiceOverridesToForm(pending.detected, activeEventType, subtype)';
    expect(src.split(anchor).length - 1).toBe(1);
    const body = src.slice(src.indexOf(anchor), src.indexOf(anchor) + 2600);
    expect(body).toMatch(/if \(pending\.seeded\) \{/);
    expect(body).toMatch(/seededPending: \{ kept, eventType: activeEventType, subtype \}/);
    // The merge must stay behind the seeded early return, not run before it.
    expect(body.indexOf('if (pending.seeded) {')).toBeLessThan(body.indexOf('setEventFormData'));
  });
});

describe('the offer is announced and dismissable', () => {
  it('is a live region, so a set of values waiting for a decision is not silent', () => {
    expect(src).toMatch(/role="status"\n\s+aria-live="polite"/);
  });

  it('takes focus when an offer appears, and only for a seeded one', () => {
    expect(src).toMatch(/voiceOfferRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
    expect(src).toMatch(/const hasSeededOffer = Boolean\(/);
  });

  it('names its dismiss control and gives it a thumb-sized target', () => {
    const dismiss = src.slice(src.indexOf('events.voice.dismissPastedNote') - 600);
    expect(dismiss.slice(0, 800)).toMatch(/minH="44px"/);
    expect(dismiss.slice(0, 800)).toMatch(/aria-label=/);
  });
});
