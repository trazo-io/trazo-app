/**
 * Gate: `shortDescription` and `consumerImpact` must not say the same thing.
 *
 * WHY (2026-08-01 consumer editorial review): the collapsed card shows the title, then
 * `shortDescription`, then `consumerImpact`. On the live avocado page the nest-box card read:
 *
 *   "Wildlife structures — owl and songbird boxes, raptor perches, native-bee blocks — that
 *    invite natural pest control"
 *   "Nesting and shelter structures — owl and songbird boxes, raptor perches, native-bee
 *    blocks — invite wildlife that controls pests naturally."
 *
 * The same sentence twice, in two stacked blocks. A sweep found 9 subtypes like it. The
 * inline `consumerImpact` line was re-enabled on the strength of Phase B having split the two
 * fields — this test is what keeps that split true, because the failure mode is silent: the
 * card still renders, it just wastes half of a shopper's 20 seconds.
 *
 * Contract:
 *   shortDescription = WHAT HAPPENED on the farm.
 *   consumerImpact   = WHY IT MATTERS to the person holding the food.
 *
 * Family fallbacks are exempt: they are intentionally near-paraphrases, and `isGenericCopy`
 * in ConsumerEventCard suppresses the impact line whenever one is in play, so a shopper never
 * sees the pair. The exemption is derived from the fallback copy itself, not a hand-list, so a
 * new fallback cannot quietly widen it.
 */
import { describe, expect, it } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';
import { enumerateConsumerCopy } from './consumerCopyMatrix';
import { getSubtypes } from '../../config/events';

const EVENT_TYPES = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

/** Content words only — shared glue ("that", "with") must not read as overlap. */
const STOPWORDS = new Set([
  'that',
  'this',
  'with',
  'from',
  'they',
  'them',
  'were',
  'been',
  'have',
  'into',
  'than',
  'when',
  'what',
  'their',
  'there'
]);

/**
 * Crude suffix stripping. Without it the Heat Wave card sailed through at 0.11 while reading
 * "High temperature conditions monitored to protect crops" over "Heat stress management
 * protects crops during extreme temperatures" — `temperature`/`temperatures` and
 * `protect`/`protects` counted as different words, which is the opposite of what a reader
 * experiences. Not a real stemmer; it only has to make inflections of one word collide.
 */
function stem(word: string): string {
  return word
    .replace(/(ies)$/, 'y')
    .replace(/(ing|ies|ed|es|s)$/, '')
    .replace(/(ment|tion|sion)$/, '');
}

function contentWords(s: string): Set<string> {
  return new Set(
    (s || '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w))
      .map(stem)
      .filter((w) => w.length > 2)
  );
}

/** Containment, not Jaccard: a short sentence fully echoed by a long one still scores 1. */
function overlapRatio(a: string, b: string): number {
  const A = contentWords(a);
  const B = contentWords(b);
  if (!A.size || !B.size) return 0;
  let shared = 0;
  A.forEach((w) => {
    if (B.has(w)) shared++;
  });
  return shared / Math.min(A.size, B.size);
}

/**
 * The family fallbacks, read from the source rather than hand-listed. An event with a subtype
 * the copy layer does not know falls back to these, and the card suppresses the impact line.
 */
const FALLBACK_IMPACTS = new Set(
  EVENT_TYPES.map(({ code }) => {
    const info = getConsumerEventDescription('Sample event', {
      event_type: code,
      type: '__no_such_subtype__',
      description: 'Sample event',
      date: '2026-05-01T08:00:00Z'
    } as never);
    return info.consumerImpact;
  })
);

/**
 * 0.4, tightened from 0.6 after the live page proved the looser bar too forgiving: the manure
 * card read "Enhanced soil health through organic matter incorporation for improved fertility"
 * over "Organic matter enhancement builds soil fertility and supports beneficial microbial
 * activity" — obvious repetition to any reader, and it scored 0.44.
 *
 * Word overlap is a proxy for the thing that actually matters (is the second sentence a new
 * thought?), so it will always be approximate. Where it flagged copy that was genuinely
 * explaining rather than repeating — pruning → "an open canopy dries faster after rain" — the
 * fix was to make the first sentence more concrete, not to widen the bar. Every one of the
 * seven subtypes this caught ended up with better copy, so the tighter bar is doing real work.
 */
const THRESHOLD = 0.4;

describe('shortDescription and consumerImpact stay distinct', () => {
  const rows: Array<{
    key: string;
    short: string;
    impact: string;
    benefit: string;
    ratio: number;
  }> = [];

  for (const { key, info } of enumerateConsumerCopy()) {
    if (FALLBACK_IMPACTS.has(info.consumerImpact)) continue; // suppressed on the card
    rows.push({
      key,
      short: info.shortDescription,
      impact: info.consumerImpact,
      benefit: info.sustainabilityBenefit,
      ratio: overlapRatio(info.shortDescription, info.consumerImpact)
    });
  }

  it('enumerates a meaningful number of subtypes (guards the harness itself)', () => {
    expect(rows.length).toBeGreaterThan(40);
  });

  it('has no subtype where the impact line merely restates the description', () => {
    const offenders = rows
      .filter((r) => r.ratio > THRESHOLD)
      .map(
        (r) =>
          `  • [${r.ratio.toFixed(2)}] ${r.key}\n      SHORT:  ${r.short}\n      IMPACT: ${
            r.impact
          }`
      );
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  /**
   * Same rule one layer down. `sustainabilityBenefit` renders in the EXPANDED card under
   * "Environmental Benefit", so a reader who taps through gets description, then impact, then
   * benefit — three paraphrases of one idea if nobody is watching. Two of them were exactly
   * that on the habitat cards before this gate existed.
   */
  it('has no subtype where the environmental benefit merely restates the impact line', () => {
    const offenders = rows
      .filter((r) => overlapRatio(r.impact, r.benefit) > THRESHOLD)
      .map(
        (r) =>
          `  • [${overlapRatio(r.impact, r.benefit).toFixed(2)}] ${r.key}\n      IMPACT:  ${
            r.impact
          }\n      BENEFIT: ${r.benefit}`
      );
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });
});
