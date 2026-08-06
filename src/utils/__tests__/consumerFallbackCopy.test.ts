/**
 * The generic fallback sentences must stay in sync across three files, or the consumer card
 * silently starts rendering boilerplate again.
 *
 * `getConsumerEventDescription()` returns two generic sentences for any subtype it has no
 * specific copy for. ConsumerEventCard suppresses them (`GENERIC_FALLBACK_COPY` /
 * `isGenericCopy`) because they say nothing AND are unqualified general environmental-benefit
 * claims — "sustainable", "responsible", "stewardship" asserted about, e.g., an
 * equipment-cleaning record, which is what FTC 16 CFR 260.6 warns against.
 *
 * Three-way coupling, all by exact string:
 *   eventDescriptions.ts      — produces the English fallback
 *   eventDescriptions.es.ts   — translates it (the card localizes BEFORE suppressing)
 *   ConsumerEventCard.tsx     — suppresses both locales
 *
 * Edit any one of them and the suppression silently stops working in at least one locale.
 * This test is the tripwire.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const UTILS = join(__dirname, '..');
const CARD = join(UTILS, '..', 'components', 'Events', 'ConsumerEventCard.tsx');

const descriptionsSrc = readFileSync(join(UTILS, 'eventDescriptions.ts'), 'utf8');
const esSrc = readFileSync(join(UTILS, 'eventDescriptions.es.ts'), 'utf8');
const cardSrc = readFileSync(CARD, 'utf8');

/**
 * Derived from the SOURCE rather than hand-listed, so a newly added family fallback cannot
 * slip past this test the way seven of the eight did originally: the first version of the
 * suppression only covered the production pair, and nobody noticed the other families were
 * still rendering theirs until the DB was measured.
 */
const EN_FALLBACKS = [
  ...descriptionsSrc.matchAll(
    /let (?:consumerImpact|sustainabilityBenefit)\s*=\s*\n?\s*'((?:[^'\\]|\\.)+)'/g
  )
].map((m) => m[1]);

/** Their es-419 translations, looked up in the dictionary the card actually sees. */
const ES_FALLBACKS = EN_FALLBACKS.map((en) => {
  const m = esSrc.match(
    new RegExp(
      `^  '${en.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}':\\s*\\n?\\s*'((?:[^'\\\\]|\\\\.)+)'`,
      'm'
    )
  );
  return m ? m[1] : null;
}).filter((s): s is string => Boolean(s));

describe('generic consumer fallback copy stays in sync', () => {
  it('finds all eight family fallback pairs in the source', () => {
    // 8 families x (consumerImpact + sustainabilityBenefit). If this drops, the regex above
    // stopped matching and every other assertion here would pass vacuously.
    expect(EN_FALLBACKS.length).toBe(16);
    expect(ES_FALLBACKS.length).toBe(16);
  });

  it.each(EN_FALLBACKS)('eventDescriptions.ts still emits: %s', (sentence) => {
    expect(
      descriptionsSrc.includes(sentence),
      'The English fallback changed. Update GENERIC_FALLBACK_COPY in ConsumerEventCard.tsx and ' +
        'the CONSUMER_DESCRIPTION_ES key in eventDescriptions.es.ts, or the card will start ' +
        'rendering boilerplate again.'
    ).toBe(true);
  });

  it.each(EN_FALLBACKS)('eventDescriptions.es.ts still keys on: %s', (sentence) => {
    expect(
      esSrc.includes(sentence),
      'The es dictionary lost its key for this fallback, so the Spanish page would render the ' +
        'English sentence (dict[s] || s falls back silently).'
    ).toBe(true);
  });

  it.each([...EN_FALLBACKS, ...ES_FALLBACKS])('ConsumerEventCard suppresses: %s', (sentence) => {
    expect(
      cardSrc.includes(sentence),
      'ConsumerEventCard.GENERIC_FALLBACK_COPY is missing this sentence. The card localizes ' +
        'BEFORE suppressing, so BOTH the en-US and es-419 strings must be listed.'
    ).toBe(true);
  });

  it('lists both locales, not just English', () => {
    // Guards the specific mistake this nearly shipped as: an English-only list that silently
    // stops suppressing anything once the page is in Spanish.
    for (const sentence of ES_FALLBACKS) {
      expect(cardSrc).toContain(sentence);
    }
  });
});
