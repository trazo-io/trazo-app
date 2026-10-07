/**
 * `eventDescriptions.es.ts` is KEYED BY THE ENGLISH SOURCE STRING.
 *
 * That means editing a sentence in `eventDescriptions.ts` silently orphans its translation: the
 * lookup misses, and a Spanish reader gets English on the consumer page. Nothing fails, nothing
 * logs, and the only symptom is a shopper in Spanish reading English prose about their food.
 *
 * 🔴 MEASURED 2026-09-08, while fixing three consumer-prose overclaims (T10): my own edit
 * orphaned FOUR keys in one step, and I only noticed because a grep for the retired phrases
 * came back non-zero in the ES file. A sweep then found 115 of 447 ES keys with no matching
 * English string. Three sampled at random existed nowhere in `src/`. Some are legitimately dead
 * entries for retired surfaces (the carbon-credits copy went with the blockchain surface); the
 * rest are live strings whose translation stopped resolving when the English was reworded.
 *
 * This guard does NOT demand those 115 be cleaned today — that is a separate content pass, and a
 * test that fails on arrival gets skipped. It pins the number so it cannot GROW: reword an
 * English string without moving its key and this fails, naming the key you orphaned.
 *
 * ⚠️ When you legitimately delete a retired entry, this baseline goes DOWN. Lower it. Never raise
 * it to make a failure go away — raising it is the failure.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const UTILS = join(__dirname, '..');

/** Keys in the ES map are quoted English sentences at one indent level. */
const esKeys = (source: string): string[] =>
  Array.from(source.matchAll(/^ {2}'((?:[^'\\]|\\.){12,})':/gm)).map((m) => m[1]);

const unescape = (s: string): string => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');

describe('Spanish consumer prose keys still resolve', () => {
  const en = readFileSync(join(UTILS, 'eventDescriptions.ts'), 'utf8');
  const es = readFileSync(join(UTILS, 'eventDescriptions.es.ts'), 'utf8');
  const keys = esKeys(es);

  //: Orphans present on 2026-09-08, immediately after the T10 fix. MUST NOT GROW.
  const BASELINE_ORPHANS = 115;

  const orphans = keys.filter((k) => !unescape(en).includes(unescape(k)));

  it('finds the ES map and parses its keys', () => {
    // A regex that silently matches nothing would make every assertion below vacuous — the
    // failure mode this repo has hit repeatedly.
    expect(keys.length).toBeGreaterThan(300);
  });

  it('does not orphan any MORE translations than the recorded baseline', () => {
    expect(
      orphans.length,
      orphans.length > BASELINE_ORPHANS
        ? `You reworded an English string in eventDescriptions.ts without moving its key in ` +
            `eventDescriptions.es.ts, so the Spanish translation no longer resolves and Spanish ` +
            `readers get English. Newly orphaned:\n  ` +
            orphans.slice(-(orphans.length - BASELINE_ORPHANS)).join('\n  ')
        : `Orphan count dropped to ${orphans.length}. Good — lower BASELINE_ORPHANS to match.`
    ).toBeLessThanOrEqual(BASELINE_ORPHANS);
  });

  it('keeps the four keys repaired in the T10 fix resolving', () => {
    // Named explicitly because these are the ones I broke and then fixed; a regression here means
    // the English was reworded again without the key.
    const repaired = [
      'The block was irrigated',
      // Reworded 2026-09-16: "between the rows" asserted a planting geometry no field records
      // (see consumerDescriptionEvidence.test.ts). The key this test exists to protect moved
      // with it; the sentence it protects is the CURRENT one.
      'Vegetation on this block was mown',
      'You can see when the ground under this crop was mowed.',
      'Weeds were flamed with a propane burner.'
    ];
    for (const sentence of repaired) {
      expect(en, `${sentence} is no longer in the English module`).toContain(sentence);
      expect(es, `${sentence} has no ES key — Spanish will fall back to English`).toContain(
        sentence
      );
    }
  });

  it('does not reintroduce the three claims T10 removed', () => {
    // Each asserted something the record does not carry: that a water source WAS recorded, that
    // the crop has tree rows, and that its fruit is picked up off the floor.
    for (const retired of [
      'from a recorded water source',
      'mown between the tree rows',
      'picked up off the floor',
      'flamer along the tree rows'
    ]) {
      expect(en, `retired claim is back in the English prose: ${retired}`).not.toContain(retired);
      expect(es, `retired claim is back as an ES key: ${retired}`).not.toContain(retired);
    }
  });
});
