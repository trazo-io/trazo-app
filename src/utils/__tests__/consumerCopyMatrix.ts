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
  // chemicalEvent: organic-approved inputs get their own sentences.
  2: [
    {
      label: 'organic',
      patch: { chemical_subtype: 'organic_pesticide', organic_approved: 'omri_listed' }
    }
  ],
  // businessEvent: business_type selects the branch; the subtype code does not.
  7: [
    { label: 'certification', patch: { business_type: 'certification' } },
    { label: 'carbon_credits', patch: { business_type: 'carbon_credits' } },
    { label: 'verification', patch: { business_type: 'verification' } },
    { label: 'transparency', patch: { business_type: 'transparency' } },
    { label: 'sustainability_audit', patch: { business_type: 'sustainability_audit' } }
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
