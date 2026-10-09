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
