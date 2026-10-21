/**
 * Which production-form keys may travel, given the subtype on the record.
 *
 * ## The rule
 *
 * A mutation payload sends ONLY fields its UI renders (`.claude/rules/frontend.md`). The
 * production wizard breaks it structurally: `onSubmit` starts `{ ...data }`, and `data` is
 * react-hook-form's whole `defaultValues` object — every key for every subtype, several of
 * them seeded with a NON-EMPTY literal (`|| 'gallons'`, `|| 'lbs'`, `|| 'false'`). So a
 * pruning record, whose form shows none of these controls, posted:
 *
 *     is_summary: 'false'  ·  yield_total_unit: 'lbs'  ·  water_volume_unit: 'gallons'
 *     temperature_control: 'false'
 *
 * ## Why it is not harmless
 *
 * The backend does NOT drop them. `ProductionEventSerializer.to_internal_value` lifts exactly
 * these names out of the top level and writes them into `extra_data` (`summary_only_fields`
 * plus `EXTRA_DATA_FIELDS`), so the phantom values landed ON the record — a pruning event
 * carrying "temperature control: false" and a yield unit for a yield it never had. Nothing
 * renders `extra_data` generically today, which is the only reason no output was wrong; that
 * is one iteration of a "show everything recorded" panel away from being a false statement in
 * a certifier packet. Recorded as F9 in the Calapooia Bend rehearsal.
 *
 * ## The shape of the fix
 *
 * A pure function, not another inline ternary in a 4,000-line component: the gates have to be
 * testable against the actual pruning-record payload, and the 2026-08 lesson from this project
 * is that a test which supplies its own vocabulary passes forever while the feature does
 * nothing. Spread the result immediately after `...data` in `processedData`.
 */

/** Subtypes whose form renders the aggregate/summary toggle (the `isSummaryMode` sections). */
export const SUBTYPES_WITH_SUMMARY_MODE = ['HA', 'PR', 'IR'];

/** Keys the summary toggle owns. Present for every summary-capable subtype, never otherwise. */
const SUMMARY_KEYS = ['is_summary', 'date_start', 'date_end', 'event_count'];

/**
 * Which subtype's section actually renders each control — and whether the control lives
 * INSIDE the summary toggle.
 *
 * `summaryOnly` is not a refinement, it is the difference between a gate that works and one
 * that half-works: `yield_total_unit` renders in the Harvest Summary section, so a plain
 * (non-aggregate) harvest never shows it, and gating on `HA` alone would keep posting
 * `yield_total_unit: 'lbs'` on every ordinary pick. The same for the two irrigation-volume
 * keys. `temperature_control` is not summary-gated: the Post-Harvest section renders it for
 * every PH record.
 */
const SUBTYPE_ONLY_KEYS: Record<string, { subtypes: string[]; summaryOnly: boolean }> = {
  // Irrigation Summary Mode
  water_volume_total: { subtypes: ['IR'], summaryOnly: true },
  water_volume_unit: { subtypes: ['IR'], summaryOnly: true },
  // Harvest Summary Mode
  yield_total: { subtypes: ['HA'], summaryOnly: true },
  yield_total_unit: { subtypes: ['HA'], summaryOnly: true },
  // Post-Harvest Processing section — rendered for every PH record, summary or not.
  temperature_control: { subtypes: ['PH'], summaryOnly: false }
};

/**
 * A unit is only a fact when its quantity is one. `fuel_unit: 'gal'` on a record with no fuel
 * reading states a unit for a measurement that was never taken — the same reasoning
 * `history/amendments.py:has_value` uses when it refuses to offer `area_unit` as a populated
 * field on a record whose `area_covered` is blank.
 */
const UNIT_KEYS: Record<string, string> = {
  fuel_unit: 'fuel_consumed',
  transportation_unit: 'transportation_distance',
  irrigation_depth_unit: 'irrigation_depth'
};

/**
 * Units whose amount is asked per parcel when one activity covers several (the cards), and the
 * subtypes whose form asks that amount at all (null: any). The depth unit is irrigation's only:
 * every other subtype carries an `irrigation_depth_unit` default it never renders. The fuel unit
 * may stay for any subtype: the multi-parcel save takes it out of the shared body and sends it
 * only beside a fuel amount (`perParcelUnitKeys`).
 */
const PER_PARCEL_AMOUNT_UNITS: Record<string, string[] | null> = {
  fuel_unit: null,
  irrigation_depth_unit: ['IR']
};

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'string' && value.trim() === '');

type FormData = Record<string, unknown>;

/**
 * `{key: undefined}` for every key this subtype's form does not render.
 *
 * Returns the keys explicitly rather than deleting them, so the caller spreads the result and
 * the omission is visible in the payload object rather than hidden in a mutation.
 */
export function unrenderedProductionKeys(
  data: FormData,
  {
    amountsPerParcel = false
  }: {
    /**
     * Several parcels: fuel used and irrigation depth are entered on each parcel's card, so they
     * are always blank in this form while their units are still the grower's answer. Dropping
     * the unit there let the model default ("gal", "inches") stand against figures entered in
     * litres or centimetres. The multi-parcel save moves each unit beside its amount.
     */
    amountsPerParcel?: boolean;
  } = {}
): Record<string, undefined> {
  const subtype = String(data?.type ?? '');
  // The toggle stores 'true'/'false' STRINGS. `data.is_summary === true` alone reads a saved
  // "true" as false — the mistake the comment on the field's own defaultValue warns about
  // ("string 'false' is truthy in JS!").
  const inSummaryMode = data?.is_summary === 'true' || data?.is_summary === true;
  const out: Record<string, undefined> = {};

  if (!SUBTYPES_WITH_SUMMARY_MODE.includes(subtype)) {
    for (const key of SUMMARY_KEYS) out[key] = undefined;
  }
  for (const [key, { subtypes, summaryOnly }] of Object.entries(SUBTYPE_ONLY_KEYS)) {
    const rendered = subtypes.includes(subtype) && (!summaryOnly || inSummaryMode);
    if (!rendered) out[key] = undefined;
  }
  for (const [unitKey, quantityKey] of Object.entries(UNIT_KEYS)) {
    const askedOn = PER_PARCEL_AMOUNT_UNITS[unitKey];
    if (
      amountsPerParcel &&
      askedOn !== undefined &&
      (askedOn === null || askedOn.includes(subtype))
    )
      continue;
    if (isBlank(data?.[quantityKey])) out[unitKey] = undefined;
  }
  return out;
}

/** True when this subtype's form offers the aggregate/summary toggle. */
export const offersSummaryMode = (subtype: unknown): boolean =>
  SUBTYPES_WITH_SUMMARY_MODE.includes(String(subtype ?? ''));
