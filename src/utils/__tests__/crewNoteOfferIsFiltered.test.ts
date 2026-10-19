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

  it('gives manual review its own headline and no success colour', () => {
    expect(src).toMatch(
      /id: voiceBanner\.manualReview\s*\?\s*'events\.voice\.crewNoteManualReviewHeadline'/
    );
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
