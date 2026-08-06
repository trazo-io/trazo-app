/**
 * Which measurement system should a form DEFAULT to?
 *
 * Trazo's event forms shipped metric-first defaults — area in hectares, fuel in litres,
 * production in kilograms — on a product whose crop catalogue, emission factors (EPA
 * eGRID / 40 CFR Part 98) and entire ICP are United States. A CA walnut grower entering
 * a season had to convert 42.5 acres to 17.2 ha by hand, and every fuel figure from
 * gallons to litres, on every form, forever. That is friction on the single most
 * repeated action in the product.
 *
 * This is deliberately about DEFAULTS ONLY. Every unit remains a dropdown the farmer can
 * change, and the chosen unit is stored per event — so a metric grower changes it once
 * per form and nothing is lost. The cost of guessing wrong is one dropdown; the cost of
 * the previous metric-always default was a unit conversion on every entry.
 *
 * Resolution order:
 *   1. Explicit country on the establishment (the authoritative signal).
 *   2. A US state/territory code, because `Establishment.country` is nullable and is in
 *      fact NULL on real records while `state` is populated ("CA").
 *   3. Imperial. Trazo's crops, factors and go-to-market are US; when we know nothing,
 *      the US default is the one that is right most often.
 *
 * Note the storage layer is unaffected: areas are still persisted in hectares and carbon
 * maths still runs metric. This governs what the farmer types and reads, nothing else.
 */
import { useSelector } from 'react-redux';

import { US_STATE_CODES, normalizeState } from 'utils/usStates';

export type MeasurementSystem = 'imperial' | 'metric';

const US_COUNTRY_NAMES = new Set([
  'us',
  'usa',
  'u.s.',
  'u.s.a.',
  'united states',
  'united states of america',
  'eeuu',
  'ee.uu.',
  'estados unidos'
]);

// State/territory code set now lives in utils/usStates.ts so the dropdowns,
// the backend contract and this hook cannot drift apart.

export const resolveMeasurementSystem = (
  country?: string | null,
  state?: string | null
): MeasurementSystem => {
  const c = (country ?? '').trim().toLowerCase();
  if (c) return US_COUNTRY_NAMES.has(c) ? 'imperial' : 'metric';
  const s = (state ?? '').trim().toUpperCase();
  if (s && US_STATE_CODES.has(s)) return 'imperial';
  return 'imperial';
};

/** Default units for the active establishment. */
export const useMeasurementSystem = (
  establishmentId?: string | number | null
): MeasurementSystem => {
  const establishment = useSelector((state: any) => {
    const list = state?.company?.currentCompany?.establishments;
    if (!Array.isArray(list) || list.length === 0) return null;
    if (establishmentId == null) return list[0];
    return list.find((e: any) => String(e?.id) === String(establishmentId)) ?? list[0];
  });
  return resolveMeasurementSystem(establishment?.country, establishment?.state);
};

/**
 * The establishment identified by `establishmentId`, or null.
 *
 * Unlike `useMeasurementSystem`, this deliberately does NOT fall back to
 * `establishments[0]`. That fallback is defensible for unit defaults — guessing
 * wrong costs one dropdown — but not for anything derived from WHERE the farm
 * is. Reading the first farm on the company gave a Texas event California
 * emission factors and a Uruguayan farm northern-hemisphere seasons whenever a
 * US farm happened to sort first. Callers must handle null.
 */
export const useFarm = (establishmentId?: string | number | null): any => {
  return useSelector((state: any) => {
    const list = state?.company?.currentCompany?.establishments;
    if (!Array.isArray(list) || list.length === 0) return null;
    if (establishmentId == null) return null;
    return list.find((e: any) => String(e?.id) === String(establishmentId)) ?? null;
  });
};

/**
 * The active establishment's canonical US state code, or null.
 *
 * Never substitutes a default: an unknown state must fall through to national
 * factors and hide state-specific compliance surfaces, not silently become CA.
 */
export const useFarmState = (establishmentId?: string | number | null): string | null => {
  const establishment = useFarm(establishmentId);
  return normalizeState(establishment?.state);
};

/** Convenience: the unit codes the event forms should preselect. */
export const useDefaultUnits = (establishmentId?: string | number | null) => {
  const system = useMeasurementSystem(establishmentId);
  return system === 'imperial'
    ? { system, area: 'acres', fuel: 'gal', mass: 'lb', yieldUnit: 'lbs', depth: 'inches' }
    : { system, area: 'ha', fuel: 'L', mass: 'kg', yieldUnit: 'kg', depth: 'cm' };
};
