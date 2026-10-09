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
