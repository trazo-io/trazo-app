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
}

export function isNotEstimated(c?: CarbonStatusLike | null): boolean {
  if (!c) return false;
  return c.not_estimated === true || String(c.calculation_method || '').includes('not_estimated');
}

export function showsInputsBadge(c?: CarbonStatusLike | null): boolean {
  if (!c || isNotEstimated(c)) return false;
  if (c.verification_status === 'area_estimate') return false;
  if (typeof c.co2e !== 'number' || !(c.co2e > 0)) return false;
  return Boolean(c.usda_factors_based || c.usda_factors_used);
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
