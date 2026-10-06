/**
 * A generated description may only say what the record establishes.
 *
 * Found 2026-09-16 on Calapooia Bend's CARROT lots. `eventDescriptions.ts` takes no crop
 * argument anywhere, and its copy was written for tree fruit, so carrot records read:
 *
 *   irrigation   "…how it reached the trees."
 *   harvest      "the week this fruit came off the block"
 *   thinning     "Fewer per branch means more of everything for each one."
 *   mowing       title "Orchard-Floor Management"
 *   transplant   "Transplanting seedlings … to their permanent growing location" on direct-seeded stock
 *   cover crop   "A cover crop was sown between the rows" on a TERMINATION record
 *
 * ⛔ WHY THIS FILE DOES NOT BAN VOCABULARY.
 *
 * The obvious guard — "no description may contain the word tree" — is wrong twice. It forbids
 * accurate copy on an actual orchard lot, and it would have to be deleted the day crop-aware
 * copy ships, which is a follow-up we intend to do. So the tests here pin the two properties
 * that actually distinguish right from wrong:
 *
 *   1. CROP-INDEPENDENCE. While the generator takes no crop, the same event must produce the
 *      same sentence under any crop. That is what makes crop-blind copy safe, and it is exactly
 *      what crop-aware copy would deliberately break — so the test names the decision instead of
 *      outlawing a word.
 *   2. EVIDENCE-GATED SPECIFICS. A word naming a plant part or a site type may appear only when
 *      a field on the record establishes it. `EVIDENCE_GATED_STEMS` below is that gate: a term
 *      with no required field must not appear at all.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { getConsumerEventDescription } from '../eventDescriptions';

/**
 * Words that assert a crop form or a site type rather than a documented practice.
 *
 * ⚠️ Matched as STEMS, not whole words. The first cut of this list held the singular 'nursery'
 * and tested `\bnursery\b`, which does not match "Nurseries" — and the planting copy said
 * "Nurseries and varieties are logged", the exact direct-seeding defect this file exists to
 * catch. The guard passed while the defect was live.
 */
const EVIDENCE_GATED_STEMS = [
  'tree',
  'fruit',
  'orchard',
  'branch',
  'nurser',
  'vine',
  'seedling'
];

function containsGatedTerm(text: string): string | null {
  for (const stem of EVIDENCE_GATED_STEMS) {
    // Stem + optional plural/inflection, still anchored at a word start so 'vine' does not
    // match 'vinegar' and 'tree' does not match 'street'.
    const m = new RegExp(`\\b${stem}\\w*`, 'i').exec(text);
    if (m) return m[0];
  }
  return null;
}

function allText(result: ReturnType<typeof getConsumerEventDescription>): string {
  return [
    result.title,
    result.description,
    (result as any).shortDescription,
    (result as any).consumerMessage,
    (result as any).consumerImpact,
    (result as any).sustainabilityBenefit
  ]
    .filter(Boolean)
    .join(' | ');
}

/**
 * EVERY key the production `typeMap` answers to, not just the subtype codes.
 *
 * ⚠️ The first cut of this file drove only `production_type: 'MO'` and friends. Restoring the
 * old 'Orchard-Floor Management' title then produced ZERO failures, because `MO` resolves
 * through a different branch and the four `MO`/`production.MO`/`event.production.mowing`/
 * `mowing` entries were never reached. A table with 58 keys needs 58 inputs; a spot check of
 * the codes is how the orchard copy survived the fix that was written to remove it.
 *
 * Transcribed from the literal in `eventDescriptions.ts`. `typeMapKeysAreAllCovered` below
 * fails if the map grows a key this list does not carry.
 */
const PRODUCTION_TYPE_KEYS = [
  'event.production.planting', 'planting', 'PL',
  'production.general', 'production', 'production.planting',
  'production.harvesting', 'production.irrigation', 'production.pruning',
  'production.transplanting', 'production.TR', 'production.operation',
  'event.production.harvesting', 'harvesting', 'HA',
  'event.production.irrigation', 'irrigation', 'IR',
  'event.production.pruning', 'pruning', 'transplanting', 'TR',
  'PR', 'CU', 'TH', 'EM', 'EQ', 'equipment',
  'production.CU', 'production.cultivation', 'event.production.cultivation',
  'production.TH', 'production.thinning', 'event.production.thinning',
  'production.EM', 'production.EQ', 'production.equipment', 'event.production.equipment',
  'PO', 'production.PO', 'event.production.pollination', 'pollination',
  'PH', 'production.PH', 'event.production.post_harvest', 'post_harvest',
  'CM', 'production.CM', 'event.production.canopy_management', 'canopy_management',
  'FP', 'production.FP', 'event.production.frost_protection', 'frost_protection',
  'MO', 'production.MO', 'event.production.mowing', 'mowing'
];

describe('the key list stays in step with the map it tests', () => {
  it('covers every key the production typeMap answers to', () => {
    // A hand-typed list silently stops covering the table the day someone adds a row. Read the
    // literal instead: this is the same find-by-walking rule the packet coverage guard uses.
    // ⚠️ cwd-relative, not `import.meta.url`: under vite that resolves to an http:// URL and
    // `readFileSync` rejects it. Vitest runs from the package root.
    const src = readFileSync(resolve(process.cwd(), 'src/utils/eventDescriptions.ts'), 'utf8');
    const start = src.indexOf(
      'const typeMap: Record<string, { title: string; icon: string; description: string }> = {'
    );
    const end = src.indexOf('\n    };', start);
    expect(start).toBeGreaterThan(-1);
    const block = src.slice(start, end);
    const keys = [...block.matchAll(/^      '?([A-Za-z0-9_.]+)'?:\s*\{/gm)].map((m) => m[1]);

    expect(keys.length).toBeGreaterThan(0);
    const uncovered = keys.filter((k) => !PRODUCTION_TYPE_KEYS.includes(k));
    expect(uncovered, `typeMap keys not exercised by this file: ${uncovered.join(', ')}`).toEqual(
      []
    );
  });
});

describe('generated descriptions are crop-independent', () => {
  it.each(PRODUCTION_TYPE_KEYS)(
    'produces the same copy for %s whatever the crop is',
    (subtype) => {
      const base = { event_type: 1, production_type: subtype, date: '2025-09-12T15:00:00Z' };
      const asCarrot = getConsumerEventDescription(subtype, { ...base, crop: 'Carrots' });
      const asApple = getConsumerEventDescription(subtype, { ...base, crop: 'Apples' });

      // ⚠️ When crop-aware copy ships, THIS is the assertion that must be changed, deliberately,
      // together with a decision about the Spanish dictionary (interpolated sentences fall
      // through to English). Do not delete it quietly.
      expect(allText(asCarrot)).toBe(allText(asApple));
    }
  );
});

describe('generated descriptions assert nothing the record does not establish', () => {
  it.each(PRODUCTION_TYPE_KEYS)(
    'uses no crop-form or site-type word for %s, which carries no field establishing one',
    (subtype) => {
      const result = getConsumerEventDescription(subtype, {
        event_type: 1,
        production_type: subtype,
        date: '2025-09-12T15:00:00Z'
      });
      const text = allText(result);
      const found = containsGatedTerm(text);
      expect(found, `${subtype} copy asserts "${found}": ${text}`).toBeNull();
    }
  );

  it.each(PRODUCTION_TYPE_KEYS)(
    'asserts no planting geometry for %s, which carries no field recording one',
    (subtype) => {
      // "between the rows" says the crop is grown in rows with a managed alley — true of an
      // orchard, not of a broadcast cover crop, a bed-grown vegetable or a solid-seeded grain.
      // No field on any production or soil record states row spacing, so no copy may imply it.
      // Kept separate from the vocabulary gate above because it is a PHRASE, not a word, and
      // restoring "Ground cover between the rows was mown" slipped past the word list.
      const text = allText(
        getConsumerEventDescription(subtype, {
          event_type: 1,
          production_type: subtype,
          date: '2025-09-12T15:00:00Z'
        })
      );
      expect(text, `${subtype}: ${text}`).not.toMatch(
        /between the rows|down the rows|per row\b|row middles|alleyway/i
      );
    }
  );

  it('keeps a crop-specific word the OPERATOR wrote into the record', () => {
    // The one legitimate source of a specific word: the farmer's own description text, echoed
    // back as a title. `getTimelineEventTitle`'s irrigation branch reads
    // `desc.includes('fruit development')`. That word is evidence, not an invention, and this
    // test exists so a future vocabulary sweep does not remove it by accident.
    const result = getConsumerEventDescription('Irrigation during fruit development', {
      event_type: 1,
      production_type: 'IR',
      date: '2025-06-02T15:00:00Z'
    });
    expect(result).toBeTruthy();
  });
});

describe('cover crop copy does not invent an operation', () => {
  const soilEvent = (extra: Record<string, unknown> = {}) => ({
    event_type: 5,
    soil_management_type: 'CC',
    date: '2025-11-02T15:00:00Z',
    ...extra
  });

  it('does not say a cover crop was SOWN when the record only says there was one', () => {
    // ⛔ `CC` is ONE subtype covering the whole cover-crop practice, sowing and termination
    // alike, and it carries no field that says which (checked against `SoilManagementEvent`
    // and `config/events/soilEvent.ts`: the only CC-specific field is `cover_crop_species`).
    // So neither verb may be asserted.
    const text = allText(getConsumerEventDescription('Cover Crop', soilEvent()));
    expect(text).not.toMatch(/\bsown\b|\bsowed\b|\bseeded\b/i);
    expect(text).not.toMatch(/\bterminated\b|\bmowed down\b/i);
  });

  it('does not assert a planting geometry no field records', () => {
    const text = allText(getConsumerEventDescription('Cover Crop', soilEvent()));
    expect(text).not.toMatch(/between the rows/i);
  });

  it('naming the species is not evidence of sowing', () => {
    // A termination record names the species too. This is the inference the fix refuses.
    const text = allText(
      getConsumerEventDescription('Cover Crop', soilEvent({ cover_crop_species: 'Common vetch' }))
    );
    expect(text).not.toMatch(/\bsown\b|\bsowed\b|\bseeded\b/i);
  });
});

describe('planting copy does not become transplant copy', () => {
  it('does not describe a direct-seeded planting as moved stock', () => {
    // The legacy alias 'transplanting' CONTAINS 'planting', so the impact chain tests TR first
    // on purpose. This pins that ordering: a carrot `PL` record must not inherit the
    // transplant sentence, which asserts stock raised somewhere else.
    const text = allText(
      getConsumerEventDescription('PL', {
        event_type: 1,
        production_type: 'PL',
        date: '2025-04-02T15:00:00Z'
      })
    );
    expect(text).not.toMatch(/moved into their growing position|transplant/i);
  });
});

/**
 * Run 8 (R8-09, 2026-10-05): the buyer page said an estimated, ungraded harvest was "picked,
 * weighed and graded", that a frost night was the reason there was any crop, that training
 * "ensures" best practices and that an assessment "ensures" treatments are economically
 * necessary. A description chosen by event type knows the TYPE, not what the work achieved, so
 * no generated sentence may claim an outcome. Read from the source rather than sampled, so a
 * branch no test drives is covered too.
 */
describe('generated descriptions claim no outcome', () => {
  const OUTCOME =
    /\bensur\w*|\bguarante\w*|\bbest practices?\b|\boptimal\w*|\boptimiz\w*|economically necessary|weighed and graded|there would be no crop|\bminimiz\w*|\bmaximiz\w*|\bprotect(s|ing)? crops?\b|\bhigh standards\b|\bhigh-quality\b|reduces? (spoilage|waste|runoff|disease)|keep it sound|garantiz\w*|asegura\w*|\bóptim\w*|mejores prácticas/i;

  const literals = (file: string) => {
    const src = readFileSync(resolve(process.cwd(), file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
      .replace(/\s\/\/\s.*$/gm, '');
    return [...src.matchAll(/(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2]);
  };

  it.each(['src/utils/eventDescriptions.ts', 'src/utils/eventDescriptions.es.ts'])(
    '%s has no outcome claim in any string',
    (file) => {
      const all = literals(file);
      expect(all.length).toBeGreaterThan(100); // anti-vacuity: the file was read
      expect(all.filter((l) => OUTCOME.test(l))).toEqual([]);
    }
  );

  it('a harvest reads "graded" nowhere, whatever was recorded', () => {
    for (const key of ['HA', 'harvesting', 'event.production.harvesting']) {
      const text = allText(
        getConsumerEventDescription(key, { event_type: 1, production_type: key, date: '2025-09-12T15:00:00Z' })
      );
      expect(text, key).not.toMatch(/graded|weighed/i);
    }
  });
});
