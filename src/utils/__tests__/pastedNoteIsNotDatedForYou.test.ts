/**
 * A pasted note must not inherit the wizard's date, and its held values must stay reachable.
 *
 * WHAT THIS PROVES, STATED HONESTLY. NewEvent.jsx is ~4000 lines with no render harness in the
 * tree, so this asserts on its SOURCE, the way `voiceMounted.test.ts` guards that voice is
 * reachable at all. A source assertion cannot prove behaviour. Its one job is to fail when a
 * guard is DELETED, so every assertion below is written against a specific deletion that a
 * reviewer demonstrated would otherwise keep this file green:
 *
 *   - removing the `return;` from the seeded re-offer, which drops execution into the spoken
 *     merge and writes a third party's values onto a 205.201(a) record with no farmer tap;
 *   - removing the `return;` from the dateless-save refusal, which leaves the toast and the step
 *     jump in place while the request still goes out with no date;
 *   - carrying `keptFields` forward on the re-offer instead of recomputing it, which leaves the
 *     re-offered values with no Apply button.
 *
 * The date predicate itself is a pure function and is tested for real in
 * `calendarDateRendering.test.ts`.
 *
 * THE TWO DEFECTS BEHIND ALL OF IT:
 *
 * 1. The date. Step 0 seeds `date` with `nowLocalDateTimeInput()` before the paste box is
 *    reachable, so three notes from Tuesday's spray, pasted on Friday, became three records dated
 *    Friday: wrong pre-harvest interval, wrong CA PUR day (it files strictly on `event.date`), and
 *    a packet asserting an application on a day nobody sprayed.
 *
 * 2. The hold. On soil, pest and business the subtype is a select INSIDE the tab, so at parse time
 *    there is nothing to gate against. Acreage is gated on 9 of the 10 soil subtypes.
 */
import { parse } from '@babel/parser';
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

const NEW_EVENT = join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
const src = readFileSync(NEW_EVENT, 'utf8');

/**
 * The body of a `{ ... }` block, brace-balanced from a unique opening snippet.
 *
 * A fixed character window cannot express "inside this block": the reviewer's breaking edits all
 * survived one, because the window either swallowed unrelated code or stopped short of the line
 * that mattered. Balancing braces makes "the guard is inside its own block" assertable.
 */
function blockAfter(snippet: string): string {
  const at = src.indexOf(snippet);
  expect(at, `snippet not found: ${snippet}`).toBeGreaterThan(-1);
  expect(src.split(snippet).length - 1, `snippet is not unique: ${snippet}`).toBe(1);
  const open = src.indexOf('{', at + snippet.length - 1);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error(`unbalanced block for: ${snippet}`);
}

describe('the file these guards read still compiles', () => {
  it('parses as JSX', () => {
    // MEASURED 2026-09-25: this suite went green over a NewEvent.jsx carrying a SyntaxError, and
    // so did 1511 tests across 124 files. Every assertion here reads the file as a STRING, and no
    // test in the tree imports this component, so nothing in vitest ever asked whether it
    // compiles. The repo's typecheck gate is also known-dead. One parse is the cheapest possible
    // floor under every other assertion in this file: a guard that is present in a file that
    // cannot build is not a guard.
    // @babel/parser rather than esbuild: esbuild refuses to start inside jsdom, and this suite
    // cannot leave jsdom because the shared `src/test/setup.ts` stubs window.matchMedia.
    expect(() =>
      parse(src, { sourceType: 'module', plugins: ['jsx'], errorRecovery: false })
    ).not.toThrow();
  });
});

describe('a pasted note is not dated for the farmer', () => {
  it('asks whether the operator chose the date, not whether it happens to be today', () => {
    expect(src).toMatch(/import \{[^}]*isOperatorChosenDate[^}]*\} from 'utils\/dateOnly'/);
    expect(src).not.toMatch(/isTodayLocalDateTimeInput/);
    // Compared against the form's OWN default, so a time the operator set today survives.
    const reclaim = blockAfter('const reclaimGuessedDate = useCallback(() => {');
    expect(reclaim).toMatch(/isOperatorChosenDate\(inherited, wizardDefaultDate\)/);
    expect(src).toMatch(/basicMethods\.formState\.defaultValues\?\.date/);
    // It must read the FORM, not only the wizard's state. MEASURED in a browser 2026-09-26:
    // arriving from the field-notes inbox, `eventFormData.date` is unset (it is written when step 0
    // is submitted) while the input on screen already shows the wizard's seeded default, so a
    // predicate fed only from `eventFormData` returned early and left today on screen.
    expect(reclaim, 'reads only the wizard state, so it cannot see the seeded input').toMatch(
      /basicMethods\.getValues\('date'\)/
    );
  });

  it('clears the inherited date instead of leaving it on the record', () => {
    // Since 2026-09-26 the clearing lives in ONE named function, because the field-notes inbox
    // needs the same rule on arrival and two spellings of one rule is how the roster's may-send
    // gate drifted from its own property earlier in the same work. So this asserts both halves:
    // the function still clears, and each path still calls it. Either deletion is the defect.
    const reclaim = blockAfter('const reclaimGuessedDate = useCallback(() => {');
    expect(reclaim).toMatch(/delete next\.date/);
    expect(reclaim).toMatch(/basicMethods\.setValue\('date', ''\)/);
    expect(blockAfter('if (eventData.seeded) {')).toMatch(/reclaimGuessedDate\(\)/);
    // One writer. A second inline copy is the drift this consolidation removed.
    expect(src.match(/delete next\.date/g), 'more than one place clears the date').toHaveLength(1);
  });

  it('derives the date question from the form, so answering it anywhere ends it', () => {
    // The defect this replaces: the question was banner state (`dateSuggestion`), so answering on
    // step 0 left the flag set. The question came back with "It happened today" live over the day
    // the operator had just chosen, and one tap overwrote it.
    expect(src).toMatch(
      /const seededDateUnanswered = Boolean\(voiceBanner\?\.seeded\) && !eventFormData\.date/
    );
    expect(src).toMatch(
      /const seededDateAnswered = Boolean\(voiceBanner\?\.seeded\) && Boolean\(eventFormData\.date\)/
    );
    // Code shapes, not bare words: the comment above the fix names both removed fields on
    // purpose, so a bare-word assertion would fail on its own explanation.
    expect(src).not.toMatch(/dateSuggestion:/);
    expect(src).not.toMatch(/voiceBanner\.dateSuggestion/);
    expect(src).not.toMatch(/confirmedDate:/);
    expect(src).not.toMatch(/voiceBanner\.confirmedDate/);
  });

  it('offers today rather than writing it, and states the time it wrote', () => {
    expect(src).toMatch(/events\.voice\.pastedNoteDateUseToday/);
    const useToday = blockAfter('const handleVoiceSeededUseToday = () => {');
    expect(useToday).toMatch(/nowLocalDateTimeInput\(\)/);
    // Both the button and the confirmation show date AND time: the field is a datetime-local, so
    // stating only the day hides half of what was written.
    expect(src).toMatch(/localDateTimeLabel\(nowLocalDateTimeInput\(\)\)/);
    expect(src).toMatch(/localDateTimeLabel\(eventFormData\.date\)/);
  });

  it('keeps step 0 as the only editor of the date', () => {
    const another = blockAfter('const handleVoiceSeededPickAnotherDay = () => {');
    expect(another).toMatch(/setActiveStep\(0\)/);
    expect(another).not.toMatch(/setEventFormData|setValue/);
  });

  it('refuses a dateless save AND returns, rather than only warning', () => {
    // The reviewer's breaking edit: delete this `return;`. The toast still fires and the wizard
    // still jumps to step 0 while the payload goes out with no date, and a retry can double-post.
    const submit = blockAfter('const onSubmitMedia = async () => {');
    const guard = submit.slice(submit.indexOf('if (!eventFormData.date)'));
    const guardBlock = guard.slice(0, guard.indexOf('\n    }') + 6);
    expect(guardBlock).toMatch(/setActiveStep\(0\)/);
    expect(guardBlock).toMatch(/\breturn;/);
  });
});

describe('a held pasted note is re-offered, never dropped and never merged', () => {
  const seeded = blockAfter('if (eventData.seeded) {');

  it('keeps the hold on the seeded path, tagged as seeded', () => {
    expect(seeded).toMatch(/pendingVoiceRef\.current = holding/);
    expect(seeded).toMatch(/seeded: true/);
    expect(seeded).toMatch(/transcript: banner\.transcript/);
  });

  it('only zeroes droppedCount while something is actually holding the values', () => {
    expect(seeded).toMatch(/droppedCount: holding \? 0 : banner\.droppedCount/);
  });

  it('re-offers with a RECOMPUTED field list, or the values have no Apply button', () => {
    // `voiceFilledLabels` reads `keptFields`, and Apply renders only when it is non-empty. At
    // parse time with no subtype that list is often empty, so inheriting it left the re-offered
    // values unreachable: the hold kept, then silently lost anyway.
    const offer = blockAfter('if (pending.seeded) {');
    expect(offer).toMatch(/keptFields: Object\.keys\(kept\)/);
    expect(offer).toMatch(/seededPending: \{ kept, eventType: activeEventType, subtype \}/);
  });

  it('reports what Apply actually wrote, not what was offered', () => {
    // `mergeOfferedValues` fills empties and never overwrites, because while the offer stands the
    // farmer is invited to read the quoted note and type. So a farmer who distrusts the sender's
    // product name and enters their own keeps it, and that key is skipped by the merge.
    //
    // `keptFields` is the sole source of the "N fields filled / Filled: ..." line. Left at the
    // parse-time offer, the banner credited the pasted note with a value the farmer had typed
    // themselves, which is a false claim about provenance in a wizard that feeds certifier
    // packets. Same recompute the late-subtype re-offer does from `fresh`.
    const apply = blockAfter('const handleVoiceSeededApply = () => {');
    expect(apply).toMatch(/const written = mergeOfferedValues\(eventFormData, kept\)/);
    expect(apply).toMatch(/keptFields: Object\.keys\(written\)/);
    // and the form must be written from that same object, or the two can disagree
    expect(apply).toMatch(/\.\.\.prev, \.\.\.written/);
    expect(apply, 'the offer is still cleared on apply').toMatch(/seededPending: null/);
  });

  it('wears success green only once the values are actually written', () => {
    // Status colour carries meaning: an offer awaiting a tap is in progress, not a success, and
    // in the same green as the applied state it read as more final than it was. Neutral rather
    // than a warning treatment, because nothing has gone wrong and because the theme's amber
    // cannot carry text (amber.900 on amber.50 measures 3.57:1).
    expect(src).toMatch(/bg=\{voiceBanner\.seededPending \? 'white' : 'green\.50'\}/);
    expect(src).toMatch(
      /borderColor=\{voiceBanner\.seededPending \? 'gray\.300' : 'green\.200'\}/
    );
    expect(src).toMatch(/color=\{voiceBanner\.seededPending \? 'gray\.800' : 'green\.700'\}/);
  });

  it('uses the design system textarea for the paste box', () => {
    // StandardComponents first, per CLAUDE.md. This was the only raw Chakra Textarea in the file.
    expect(src).toMatch(/<StandardTextarea/);
    expect(src).not.toMatch(/<Textarea[\s>]/);
    expect(src).not.toMatch(/^\s{2}Textarea,$/m);
  });

  it('returns before the merge, so a re-offer can never write to the form', () => {
    // The reviewer's breaking edit: delete this `return;`. Execution falls into the spoken merge
    // and a third party's acreage, pH and product names land on the record with no farmer tap.
    const offer = blockAfter('if (pending.seeded) {');
    expect(offer).toMatch(/\breturn;/);
    expect(offer).not.toMatch(/setEventFormData/);
  });

  it('drops the hold when the farmer refuses the note', () => {
    // Keeping the ref so the hold could be re-offered opened this: Discard cleared only the
    // banner, so picking the subtype afterwards rebuilt the refused values as a fresh offer.
    const dismiss = blockAfter('const dismissVoiceBanner = () => {');
    expect(dismiss).toMatch(/pendingVoiceRef\.current = null/);
    expect(dismiss).toMatch(/setVoiceBanner\(null\)/);
    expect(blockAfter('const handleVoiceSeededDiscard = () => {')).toMatch(
      /dismissVoiceBanner\(\)/
    );
    // The header X must go through the same door, not its own inline setter.
    expect(src).toMatch(/onClick=\{dismissVoiceBanner\}/);
    expect(src).not.toMatch(/onClick=\{\(\) => setVoiceBanner\(null\)\}/);
  });
});

describe('the offer is announced once, and dismissable by thumb', () => {
  it('scopes the live region to the headline, not the whole banner', () => {
    // role="status" is aria-atomic by default, so on the container every tap re-read the entire
    // banner including the full quoted note, and focusing that same node announced it twice.
    expect(src).toMatch(/role="group"\n\s+aria-label=\{voiceBannerHeadline\}/);
    expect(src).toMatch(/role="status"\n\s+aria-live="polite"\n\s+fontSize="sm"/);
  });

  it('takes focus only for a seeded offer, never on a spoken merge', () => {
    expect(src).toMatch(/voiceOfferRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
    expect(src).toMatch(/const hasSeededOffer = Boolean\(/);
  });

  it('names its dismiss control and gives it a thumb-sized target', () => {
    const dismiss = src.slice(src.indexOf('events.voice.dismissPastedNote') - 600);
    expect(dismiss.slice(0, 800)).toMatch(/minH="44px"/);
    expect(dismiss.slice(0, 800)).toMatch(/aria-label=/);
  });
});
