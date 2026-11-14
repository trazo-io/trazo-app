/**
 * What an event's carbon figure is, read from the served payload (run 8, R8-04).
 *
 * Unknown is not zero. When a record holds nothing to count from (no fuel or energy, and no
 * area on area-driven field work) the backend stores no figure and serves
 * `calculation_method: 'not_estimated'` with `co2e: null`; the live preview answers
 * `not_estimated: true`. Every surface shows "Not estimated" for that, never "0 kg".
 *
 * The provenance badge belongs only to a figure computed from recorded inputs. A per-hectare
 * figure (`verification_status: 'area_estimate'`) is an estimate from the recorded area, and a
 * zero or a missing figure has no factor behind it.
 */
export interface CarbonStatusLike {
  co2e?: number | null;
  calculation_method?: string | null;
  verification_status?: string | null;
  not_estimated?: boolean;
  usda_factors_based?: boolean;
  usda_factors_used?: boolean;
  /** Why an input figure is an estimate, as codes (`CHEMICAL_ESTIMATE_REASONS` in trazo-back). */
  estimate_reasons?: string[] | null;
}

/**
 * Statuses that say a figure is an estimate. `estimate` (2026-11-13) is an input figure (spray or
 * fertilizer) with any part estimated or left out: application fuel from the area treated, a Trazo
 * estimate factor, a weight from a typical density, or a missing amount, concentration or N-P-K.
 */
const ESTIMATE_STATUSES = new Set(['area_estimate', 'estimate']);

export function isNotEstimated(c?: CarbonStatusLike | null): boolean {
  if (!c) return false;
  return c.not_estimated === true || String(c.calculation_method || '').includes('not_estimated');
}

export function showsInputsBadge(c?: CarbonStatusLike | null): boolean {
  if (!c || isNotEstimated(c)) return false;
  if (ESTIMATE_STATUSES.has(String(c.verification_status || ''))) return false;
  if (typeof c.co2e !== 'number' || !(c.co2e > 0)) return false;
  return Boolean(c.usda_factors_based || c.usda_factors_used);
}

/**
 * A positive input figure that is an estimate in some part (`verification_status: 'estimate'`).
 * Until 2026-11-13 these were stored as published-factor figures and wore the "From recorded
 * inputs" badge, an application pass estimated from the area included. Mutually exclusive with
 * `showsInputsBadge` and `showsAreaEstimateLabel`.
 */
export function showsEstimateLabel(c?: CarbonStatusLike | null): boolean {
  if (!c || isNotEstimated(c)) return false;
  if (c.verification_status !== 'estimate') return false;
  return typeof c.co2e === 'number' && c.co2e > 0;
}

/**
 * Every reason code the backend can send. Mirrors `CHEMICAL_ESTIMATE_REASONS` in
 * trazo-back/carbon/services/verified_emission_factors.py (parity:
 * `chemicalEstimateReasonsHaveCopy.test.tsx`); each is worded by `carbon.estimateReason.<code>`.
 */
export const ESTIMATE_REASON_CODES = [
  'application_fuel_estimated_from_area',
  'fuel_costed_as_diesel',
  'trazo_estimate_factor',
  'product_mass_from_typical_density',
  'amount_not_recorded',
  'concentration_not_recorded',
  'npk_not_recorded',
  'nitrogen_not_recorded',
  'application_not_estimated'
] as const;

/** The message ids for the reasons a payload carries, known codes only, in the order sent. */
export function estimateReasonMessageIds(reasons?: string[] | null): string[] {
  const known = new Set<string>(ESTIMATE_REASON_CODES);
  return (reasons || [])
    .filter((code) => known.has(code))
    .map((code) => `carbon.estimateReason.${code}`);
}

/**
 * A positive figure that came from the recorded AREA, not from a recorded fuel, energy or input
 * amount (`verification_status: 'area_estimate'`). It is a per-area default, so the surface says
 * so beside the figure (Astra follow-up, 2026-10-28: pH and tillage lost the "from recorded
 * inputs" badge on resave but gained no explanation of where the number came from).
 *
 * Mutually exclusive with `showsInputsBadge`: that one returns false for `area_estimate`, and this
 * one returns true only for it, so a record never carries both labels.
 */
export function showsAreaEstimateLabel(c?: CarbonStatusLike | null): boolean {
  if (!c || isNotEstimated(c)) return false;
  if (c.verification_status !== 'area_estimate') return false;
  return typeof c.co2e === 'number' && c.co2e > 0;
}

/**
 * Event types Trazo does not estimate carbon for: weather (0), general activity (3) and
 * business (7). A weather record documents conditions, and general and business records are
 * admin or observation; any fuel burned in response is logged on its own activity. The backend
 * stores no figure for them (`history/signals.py`).
 *
 * AC-14 (2026-10-26): the detail modal and the timeline row used to fill these in with
 * `co2e: 0`, and the modal then printed "No emissions estimated" beside "0 kg CO2e" and a
 * "Minimal" level. A zero nobody computed is not an answer, so these read as not estimated.
 */
const NO_CARBON_CALCULATION_EVENT_TYPES = new Set([0, 3, 7]);

export function hasNoCarbonCalculation(eventType?: number | null): boolean {
  return typeof eventType === 'number' && NO_CARBON_CALCULATION_EVENT_TYPES.has(eventType);
}

/** The status a surface shows for a type with no calculation: no figure, not a zero. */
export const NO_CARBON_CALCULATION_STATUS = {
  co2e: null,
  calculation_method: 'not_estimated_no_calculation',
  verification_status: 'not_estimated',
  usda_factors_based: false,
  not_estimated: true
} as const;
