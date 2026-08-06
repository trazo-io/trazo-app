/**
 * PHASE 3 SAFETY NET — every consumer sentence the app can render must have a Spanish entry.
 *
 * `localizeConsumerDescription()` (eventDescriptions.ts) translates by EXACT ENGLISH STRING
 * against `CONSUMER_DESCRIPTION_ES`, and its lookup is `dict[s] || s` — a miss falls back to
 * the English input with no throw, no warning and no log. So changing one character of an
 * English consumer sentence makes that sentence render **in English on the Spanish page,
 * permanently, with every existing test still green.**
 *
 * The three i18n gates (parity / used-keys / default-message-keys) only cover the JSON
 * catalogs. They never see these dictionaries. Before the 2026-07-31 review the only coverage
 * was ~15 hand-picked strings in eventDescriptions.consumerCopy.test.ts — about 6% of the 259
 * entries.
 *
 * This test drives `getConsumerEventDescription()` across every event type and subtype in the
 * registry, collects the five fields `localizeConsumerDescription` actually translates, and
 * asserts the dictionary can translate each one. It is the prerequisite for any consumer copy
 * rewrite: with it, breaking Spanish fails the build; without it, it fails silently in front
 * of Spanish-speaking shoppers.
 */
import { describe, it, expect } from 'vitest';

import { getConsumerEventDescription, localizeConsumerDescription } from '../eventDescriptions';
import { enumerateConsumerCopy } from './consumerCopyMatrix';
import { CONSUMER_DESCRIPTION_ES } from '../eventDescriptions.es';
import { getSubtypes } from '../../config/events/index';

/** The exact fields localizeConsumerDescription() passes through the dictionary. */
const LOCALIZED_FIELDS = [
  'title',
  'description',
  'shortDescription',
  'consumerMessage',
  'consumerImpact',
  'sustainabilityBenefit'
] as const;

/** The 8 event families, with the numeric event_type the descriptions branch on. */
const EVENT_TYPES: ReadonlyArray<{ name: string; code: number }> = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

/**
 * Build a minimal but realistic event for a (type, subtype) pair. Values are deliberately
 * plain so we exercise the STATIC copy paths — the 2026-06 R1 Stage 2 work rewrote the
 * dynamic templates into static sentences precisely so they could be dictionary keys.
 */
function makeEvent(code: number, subtype?: string): Record<string, unknown> {
  return {
    event_type: code,
    type: subtype ?? undefined,
    production_type: code === 1 ? subtype : undefined,
    chemical_type: code === 2 ? subtype : undefined,
    soil_management_type: code === 5 ? subtype : undefined,
    pest_management_type: code === 6 ? subtype : undefined,
    // NOT the subtype code. `business_type` is a separate vocabulary
    // ('certification' | 'carbon_credits' | 'verification' | ...), and passing the subtype
    // ('CE') meant every business branch fell to the family default — so the certification
    // copy, the strongest evidence on the page, was never exercised by this coverage gate.
    // See the per-branch sweep in the business describe block below.
    business_type: code === 7 ? 'certification' : undefined,
    description: 'Sample event',
    date: '2026-05-01T08:00:00Z'
  };
}

/** Collect every distinct localizable sentence the app can produce. */
function collectReachableSentences(): Map<string, string[]> {
  // Enumeration lives in consumerCopyMatrix so every gate sweeps the same shapes — including
  // the chemical organic fork and each business_type, both of which this gate used to miss.
  const found = new Map<string, string[]>();
  const record = (sentence: unknown, origin: string) => {
    if (typeof sentence !== 'string') return;
    const trimmed = sentence.trim();
    if (!trimmed) return;
    const origins = found.get(trimmed) ?? [];
    origins.push(origin);
    found.set(trimmed, origins);
  };
  for (const { key, info } of enumerateConsumerCopy()) {
    for (const field of LOCALIZED_FIELDS) {
      record((info as Record<string, unknown>)[field], `${key}/${field}`);
    }
  }
  return found;
}

const REACHABLE = collectReachableSentences();

describe('Spanish coverage of consumer event copy', () => {
  it('reaches a meaningful number of distinct sentences (guards the harness itself)', () => {
    // If the enumeration silently stops working, every other assertion passes vacuously.
    expect(REACHABLE.size).toBeGreaterThan(20);
  });

  it('translates every reachable sentence', () => {
    const missing: string[] = [];
    for (const [sentence, origins] of REACHABLE) {
      if (!CONSUMER_DESCRIPTION_ES[sentence]) {
        missing.push(`  • [${origins[0]}] "${sentence}"`);
      }
    }
    expect(
      missing,
      `${missing.length} consumer sentence(s) have no CONSUMER_DESCRIPTION_ES entry, so they ` +
        `render in ENGLISH on the Spanish page (the dict lookup is \`dict[s] || s\` — it fails ` +
        `silently). Add each to src/utils/eventDescriptions.es.ts:\n${missing.join('\n')}`
    ).toEqual([]);
  });

  it('actually changes the text when localizing to es-419', () => {
    // End-to-end proof the wiring works, not just that keys exist.
    const sample = [...REACHABLE.keys()].find((s) => CONSUMER_DESCRIPTION_ES[s]);
    expect(sample, 'no translatable sentence found to sample').toBeDefined();

    const localized = localizeConsumerDescription(
      { consumerImpact: sample } as never,
      'es-419'
    ) as unknown as { consumerImpact: string };
    expect(localized.consumerImpact).toBe(CONSUMER_DESCRIPTION_ES[sample as string]);
    expect(localized.consumerImpact).not.toBe(sample);
  });

  it('leaves English untouched for en-US', () => {
    const sample = [...REACHABLE.keys()][0];
    const localized = localizeConsumerDescription(
      { consumerImpact: sample } as never,
      'en-US'
    ) as unknown as { consumerImpact: string };
    expect(localized.consumerImpact).toBe(sample);
  });
});

describe('Spanish dictionary hygiene', () => {
  it('has no entry whose translation is identical to the English key', () => {
    // An untranslated passthrough is indistinguishable from a miss at runtime, so it hides
    // real gaps. Proper nouns / program names are excluded by convention (they stay English).
    const PROPER_NOUN_ALLOWLIST = /OMRI|USDA|NOP|GlobalG\.A\.P\.|CCOF|EPA|Brix|pH|IPM/i;
    const identical = Object.entries(CONSUMER_DESCRIPTION_ES)
      .filter(([en, es]) => en === es && !PROPER_NOUN_ALLOWLIST.test(en))
      .map(([en]) => en);
    expect(identical, `untranslated dictionary entries: ${identical.join(' | ')}`).toEqual([]);
  });
});

describe('Spanish coverage of business-type branches', () => {
  // `business_type` drives its own branch chain, independent of the CE/CM/IN subtype codes.
  // The main sweep can only pass one value, so cover the rest explicitly — otherwise a
  // branch (e.g. carbon_credits) can ship untranslated with every test green.
  const BUSINESS_TYPES = [
    'certification',
    'carbon_credits',
    'verification',
    'transparency',
    'compliance'
  ];

  it.each(BUSINESS_TYPES)('translates the copy for business_type=%s', (businessType) => {
    const info = getConsumerEventDescription('Sample', {
      event_type: 7,
      type: 'CE',
      business_type: businessType,
      description: 'Sample'
    }) as unknown as Record<string, unknown>;

    // `title` is excluded: for business events it is COMPOSED ("Certification Event:
    // Carbon Credits" = base + business-type name), and a composed string can never be an
    // exact dictionary key — that is the documented limitation of CONSUMER_DESCRIPTION_ES,
    // noted on localizeConsumerDescription. Both PARTS are translated individually, and this
    // is a Priority-4 title fallback that a farmer's own event name usually replaces.
    // Asserting on it would force 3 x 6 combinatorial dict entries for no reader benefit.
    const CHECKED = LOCALIZED_FIELDS.filter((f) => f !== 'title');

    const missing = CHECKED.filter((f) => {
      const v = info[f];
      return typeof v === 'string' && v.trim() && !CONSUMER_DESCRIPTION_ES[v.trim()];
    }).map((f) => `${f}: "${String(info[f])}"`);

    expect(
      missing,
      `business_type="${businessType}" has untranslated copy — it would render in English ` +
        `on the Spanish page:\n${missing.join('\n')}`
    ).toEqual([]);
  });
});
