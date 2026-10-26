/**
 * The single enumeration of every sentence `getConsumerEventDescription()` can produce.
 *
 * Four gates walk this space — claim safety, short/impact distinctness, Spanish coverage, and
 * the em-dash ban — and each used to build its own event matrix. That cost us twice:
 *
 *   1. The chemical branch FORKS on organic approval. Every gate passed the default shape, so
 *      the organic-pesticide copy ("provides natural protection without synthetic chemicals,
 *      supporting healthier food production") went unexamined for months.
 *   2. The business branch FORKS on `business_type`. Every gate passed 'certification', so the
 *      verification copy ("Independent verification of sustainable farming practices") was
 *      never swept either — and it asserted a third-party audit from a self-reported record.
 *
 * Same bug, twice, because the matrix lived in four places. It lives here now: add a fork once
 * and all four gates widen together.
 */
import { getSubtypes } from '../../config/events';
import { getConsumerEventDescription } from '../eventDescriptions';

export const EVENT_TYPES = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
] as const;

/**
 * Extra event shapes a family's copy branches on, beyond its subtype code. Keyed by event-type
 * code; `{}` (the default shape) is always swept in addition to these.
 */
const VARIANTS: Record<number, Array<{ label: string; patch: Record<string, unknown> }>> = {
  // Astra AC-02..05 (2026-10-26): sentences that name an act or a detail are gated on the field
  // that holds it, so the copy forks on these fields and each fork is swept here. Forks that
  // interpolate the value into the sentence (fungicide target, certificate number, status) cannot
  // be dictionary keys; consumerNarrativeIsFieldBacked.test.ts covers those.
  0: [
    {
      label: 'damage recorded',
      patch: { damage_assessment: 'Some fruit marked on the south rows' }
    }
  ],
  1: [
    ...['mow', 'mulch', 'cover_crop_mgmt', 'flame_weed'].map((floor_management_type) => ({
      label: `floor/${floor_management_type}`,
      patch: { floor_management_type }
    })),
    { label: 'canopy/leaf_pulling', patch: { canopy_operation: 'leaf_pulling' } },
    { label: 'water source', patch: { water_source: 'well' } }
  ],
  // chemicalEvent: organic-approved inputs get their own sentences.
  2: [
    {
      label: 'organic',
      patch: { chemical_subtype: 'organic_pesticide', organic_approved: 'omri_listed' }
    }
  ],
  5: [
    {
      label: 'amendment applied',
      patch: { amendment_type: 'Agricultural lime', amendment_amount_numeric: 2 }
    },
    { label: 'grazing/cover_crop', patch: { grazing_purpose: 'cover_crop' } }
  ],
  // businessEvent: business_type selects the branch; the subtype code does not.
  7: [
    { label: 'certification', patch: { business_type: 'certification' } },
    { label: 'verification', patch: { business_type: 'verification' } },
    { label: 'transparency', patch: { business_type: 'transparency' } },
    { label: 'sustainability_audit', patch: { business_type: 'sustainability_audit' } },
    // ⚠️ certification_type selects a WHOLE PROSE MAP that nothing here reached before.
    // The sweep fed business_type but never a certification_type, so `certDesc` was never
    // appended and every string in that map was invisible to the claim guard — which is how
    // "USDA Organic certification ensuring chemical-free farming practices" survived a file
    // whose own header describes a 24-claim sweep. One variant per entry, plus an unknown
    // value to exercise the fallback, which was the worst line of the set.
    ...[
      'organic_usda',
      'global_gap',
      'rainforest_alliance',
      'fair_trade',
      'regenerative',
      'cng',
      'non_gmo',
      'sustainable_agriculture',
      'water_stewardship',
      // A REAL type that the prose map does not cover, so the fallback branch is exercised by
      // a state that can actually occur. A made-up label did the same job but fabricated a
      // string no dictionary can ever hold, which then failed the Spanish-coverage sweep for
      // a sentence no shopper can reach.
      'kosher'
    ].map((certification_type) => ({
      label: `certification/${certification_type}`,
      patch: { business_type: 'certification', certification_type }
    }))
  ]
};

export interface ConsumerCopyCase {
  /** "chemical/PE (organic)" — stable enough to paste into a failure message. */
  key: string;
  typeName: string;
  code: number;
  subtype?: string;
  info: Record<string, string>;
}

/** Every (type × subtype × variant) shape, with its rendered copy. */
export function enumerateConsumerCopy(): ConsumerCopyCase[] {
  const cases: ConsumerCopyCase[] = [];

  for (const { name, code } of EVENT_TYPES) {
    let subtypes: string[] = [];
    try {
      subtypes = getSubtypes(code as never).map((s: { code: string }) => s.code);
    } catch {
      subtypes = [];
    }

    const extraVariants = VARIANTS[code] ?? [];

    for (const subtype of [undefined, ...subtypes]) {
      // Business copy is selected by `business_type`, not by the subtype code, and the form
      // writes the two together. Pairing every subtype with every business_type would fabricate
      // states that cannot occur ("Certification Event: Carbon Credits") and force translations
      // for them, so the business forks are swept on the no-subtype shape only.
      const variants =
        code === 7 && subtype !== undefined
          ? [{ label: '', patch: {} as Record<string, unknown> }]
          : [{ label: '', patch: {} as Record<string, unknown> }, ...extraVariants];

      for (const variant of variants) {
        let info: Record<string, string>;
        try {
          info = getConsumerEventDescription('Sample event', {
            event_type: code,
            type: subtype,
            production_type: code === 1 ? subtype : undefined,
            chemical_type: code === 2 ? subtype : undefined,
            soil_management_type: code === 5 ? subtype : undefined,
            pest_management_type: code === 6 ? subtype : undefined,
            description: 'Sample event',
            date: '2026-05-01T08:00:00Z',
            ...variant.patch
          } as never) as unknown as Record<string, string>;
        } catch {
          // A throw is a separate bug; these gates are about the copy that DOES render.
          continue;
        }
        cases.push({
          key: `${name}/${subtype ?? '—'}${variant.label ? ` (${variant.label})` : ''}`,
          typeName: name,
          code,
          subtype,
          info
        });
      }
    }
  }

  return cases;
}

/** The per-family fallbacks, derived from source. ConsumerEventCard suppresses these. */
export function suppressedFallbackSentences(): ReadonlySet<string> {
  const out = new Set<string>();
  for (const { code } of EVENT_TYPES) {
    const info = getConsumerEventDescription('Sample event', {
      event_type: code,
      type: '__no_such_subtype__',
      description: 'Sample event',
      date: '2026-05-01T08:00:00Z'
    } as never) as unknown as Record<string, string>;
    for (const field of ['consumerImpact', 'sustainabilityBenefit'] as const) {
      if (info[field]) out.add(info[field]);
    }
  }
  return out;
}
