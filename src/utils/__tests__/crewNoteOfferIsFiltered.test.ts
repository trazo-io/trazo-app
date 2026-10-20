/**
 * The crew-note offer in the activity wizard is filtered where it is BUILT, and a manual-review
 * banner never reads as a success (review of app #63). `NewEvent.jsx` has no render harness, so
 * these hold its source to the rule the way `fieldNoteSeedsTheWizard.test.ts` does.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const src = readFileSync(
  join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
  'utf8'
);

describe('crew-note offer in the wizard', () => {
  it('builds every seeded offer through the application filter', () => {
    const built = src.match(/seededPending: \{ kept[,:]/g) || [];
    const filtered = src.match(/seededPending: \{ kept: offer\.allowed,/g) || [];
    expect(filtered.length).toBe(3);
    expect(built.length).toBe(filtered.length);
  });

  it('names the values it held back', () => {
    expect(src).toMatch(/withheldFields: offer\.withheld/);
    expect(src).toMatch(/events\.voice\.crewNoteWithheld/);
  });

  it('shows the banner as labelled rows, not as stacked sentences', () => {
    // The banner was six full-width sentences, and on a phone a farmer could not tell at a glance
    // what the message would write, what it refused to write, or which day it would file under
    // (Oscar, 2026-10-20). Same facts, as a label and its values.
    for (const key of [
      'events.voice.row.wouldFill',
      'events.voice.row.filled',
      'events.voice.row.heldBack',
      'events.voice.row.block',
      'events.voice.row.activity',
      'events.voice.row.date'
    ]) {
      expect(src, `${key} is not rendered`).toContain(`'${key}'`);
    }
  });

  it('names the fields an application held back, and counts them the same way', () => {
    // The reason was two lines of prose in the middle of the banner while the fields it was about
    // were never named. The chips name them; the count beside the reason is taken from the same
    // filtered list, because the raw list carries unit companions and said "4 values" over three
    // chips.
    expect(src).toMatch(/testId="crew-note-withheld"/);
    expect(src).toMatch(/values=\{voiceWithheldLabels\}/);
    expect(src).toMatch(/\{ count: voiceWithheldCount \}/);
    expect(src).not.toMatch(/\{ count: voiceBanner\.withheldFields\.length \}/);
  });

  it('keeps the reason on the same screen, one tap away', () => {
    // ⛔ NOT deleted and NOT moved to a help centre. A farmer told that four values were held back
    // is owed the reason where they are standing. Collapsed by default, expanded by a control that
    // says what it does.
    expect(src).toMatch(/aria-expanded=\{showCrewNoteWhy\}/);
    expect(src).toMatch(/events\.voice\.row\.why/);
    expect(src).toMatch(/showCrewNoteWhy && \(/);
    expect(src).toMatch(/events\.voice\.crewNoteApplicationMode/);
  });

  it('gives manual review no success colour', () => {
    // WHICH headline manual review gets, and that it outranks the others, is a truth table and is
    // tested as one in `voiceBannerHeadline.test.ts`. What stays here is the part that only exists
    // in the render: a banner that needs a person to read it must not come up in success green.
    expect(src).toMatch(
      /bg=\{\s*voiceBanner\.seededPending \|\| voiceBanner\.manualReview\s*\?\s*'white'\s*:\s*'green\.50'\s*\}/
    );
  });
});

describe('build and apply use one rule (review of app #64)', () => {
  it('filters by record type alone, never only when a crew note is attached', () => {
    expect(src).not.toMatch(/activeFieldNote\s*&&\s*isApplicationRecord/);
    expect(src).toMatch(
      /const crewNoteOffer = \(kept, eventType, form\) =>[\s\S]{0,400}?isApplicationRecord\(eventType, form\)/
    );
  });
});

/**
 * The apply button says WHICH value, not just how many.
 *
 * Reported from the Spanish UI on 2026-10-19: "it says Completar 1 dato, but which dato?". The
 * line that names the value is real, but it sits above the application paragraph and the date
 * question, so a reader reaching the button finds the answer several lines back behind a wall of
 * text. The grouping of offered values is deliberate and stays; the button carries the name.
 */
describe('the apply button names a single offered value', () => {
  it('uses the named label when exactly one value is offered', () => {
    expect(src).toMatch(/voiceFilledLabels\.length === 1/);
    expect(src).toMatch(/events\.voice\.pastedNoteApplyNamed/);
    expect(src).toMatch(/field: voiceFilledLabels\[0\]/);
  });

  it('keeps the count past one, because a button is not a list', () => {
    expect(src).toMatch(
      /events\.voice\.pastedNoteApply'\s*\},\s*\{\s*count: voiceFilledLabels\.length/
    );
  });

  it('puts the label in the button and leaves the value to the line that prints it', () => {
    // The value is already shown in full as "Would fill: Relación NPK: 46-0-0". Repeating it in
    // the button would put the same number in two places that can drift apart.
    expect(src).not.toMatch(/pastedNoteApplyNamed'\s*\},\s*\{\s*field: voiceOfferedSummary/);
  });
});

/**
 * The banner's ORDER and its headline, reported from a Spanish screen on 2026-10-19 carrying six
 * stacked statements and two buttons: "is not too much UI and UX trazo aligned I think, and
 * difficult for the farmer".
 */
describe('the crew-note banner says the important thing first', () => {
  it('puts the wrong-activity offer above the values it would fill', () => {
    // If the farmer is logging the wrong kind of activity, nothing below it matters: every value
    // they review belongs to a record about to be filed under the wrong verb. It used to sit LAST,
    // under the offered values, the block suggestion, the date question and the dropped-value note.
    const suggestion = src.indexOf('{voiceBanner.suggestion && (');
    const wouldFill = src.indexOf('{voiceFilledLabels.length > 0 && (');
    expect(suggestion).toBeGreaterThan(-1);
    expect(wouldFill).toBeGreaterThan(-1);
    expect(suggestion).toBeLessThan(wouldFill);
  });

  it('keeps the Switch button a button, not a wrapper around half the banner', () => {
    // THE BUG THE FIRST ATTEMPT AT THIS REORDER SHIPPED. Moving the block by searching for the
    // first `)}` after `events.voice.switchTo` cut inside the Button: that `)}` closes the
    // formatMessage, not the block. The Button then never closed and swallowed the date
    // question, the manual-review text and the Fill/Discard controls, nesting interactive
    // controls inside a <button>.
    //
    // It rendered the SAME TEXT, which is why reading the screen did not catch it. Structure
    // needs a structural assertion.
    const open = src.indexOf('onClick={handleVoiceSwitchType}');
    expect(open).toBeGreaterThan(-1);
    const close = src.indexOf('</Button>', open);
    const span = src.slice(open, close);
    expect(
      span.split('\n').length,
      'the Switch button swallowed the rest of the banner again'
    ).toBeLessThan(20);
    // Nothing interactive may live inside it.
    expect(span).not.toMatch(/pastedNoteApply|pastedNoteDiscard|handleVoiceSeededApply/);
  });

  it('chooses the headline through the tested truth table, not a ternary here', () => {
    // The two assertions that used to sit here were regexes over this file's source, and both
    // defects they were written for were asymmetries between the crew-note path and the pasted /
    // live-dictation paths, which a regex for the crew branch cannot see. The choice now lives in
    // `utils/voiceBannerHeadline.ts` with a truth table over all three sources; this only keeps it
    // from being re-inlined.
    expect(src).toMatch(/voiceBannerHeadlineId\(\{/);
    expect(src).toMatch(/source: voiceNoteSource\(\{/);
    // No branch on the source may come back into the headline itself.
    const call = src.slice(
      src.indexOf('const voiceBannerHeadline ='),
      src.indexOf('const seededDateUnanswered')
    );
    expect(call).not.toMatch(
      /crewNoteOffered|pastedNoteOffered|HeadlinePlain|ManualReviewHeadline/
    );
  });
});
