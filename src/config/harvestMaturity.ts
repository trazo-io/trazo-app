/**
 * Which harvest MATURITY measure belongs on which crop's form.
 *
 * 🔴 Audit T05, the example it named twice: "grain moisture, fruit Brix and avocado/nut dry
 * matter on a carrot form", and "Instructions telling users to leave irrelevant fields blank
 * are evidence that the interface should hide those fields by context."
 *
 * All three rendered on EVERY harvest, gated only by subtype. The field registry cannot reach
 * crop metadata (`productionEvent.ts` says so in three separate comments), so relevance was
 * enforced only by a display formatter returning null for a zero — which hides a value that was
 * already recorded, and does nothing about the empty box the farmer has to interpret first.
 *
 * ## The rules
 *
 * **Only narrow a crop we actually know.** An unmapped crop keeps every measure. Hiding a field
 * on a crop this table has not heard of would silently drop a measurement the grower needs, and
 * that is a worse failure than one irrelevant box: the audit's complaint is that KNOWN crops
 * (carrots) show measures that cannot apply to them.
 *
 * **Reuse the grade families where they fit, name the exceptions.** `CROP_GRADE_FAMILY` already
 * groups crops for the grade vocabulary, and grain and the sugar-measured fruits map across
 * cleanly. Avocado does NOT: it sits in the `none` grade family because it has no USDA grade
 * standard, while dry matter is precisely its maturity standard (a California maturity
 * requirement). So dry matter is listed by crop, not derived from the grade family.
 */
import { CROP_GRADE_FAMILY } from './harvestGrades';

export interface MaturityMeasures {
  /** Soluble solids. The sugar measure for fruit picked on ripeness. */
  brix: boolean;
  /** Moisture at harvest. A grain and oilseed measure; drives drying and storage. */
  grainMoisture: boolean;
  /** Dry matter percentage. Avocado maturity, and kernel moisture for tree nuts. */
  dryMatter: boolean;
}

const ALL: MaturityMeasures = { brix: true, grainMoisture: true, dryMatter: true };

/**
 * Families whose maturity profile is settled, and what each one carries.
 *
 * ⛔ ONLY families listed here are narrowed. Anything else — `olive`, `date`, `fig`, and the
 * `none` family (pomegranates, hops, cotton, alfalfa, mixed vegetables) — keeps every measure,
 * for the same reason an unmapped crop does: I can state with confidence that a carrot has no
 * Brix reading and that wheat has no dry-matter test, and I cannot state what an olive or a date
 * grower measures at harvest. Hiding a field on a guess is the failure this whole change exists
 * to avoid, only pointed at a different farmer.
 *
 * An earlier cut of this file narrowed every mapped family and asserted dry matter for olives
 * on no evidence at all. That is exactly the "unsourced claim" class the compliance rules
 * forbid, and it is no more acceptable in a form-gating table than in consumer copy.
 */
const SETTLED_FAMILIES: Record<string, MaturityMeasures> = {
  // Picked on sugar; Brix is the standard maturity reading.
  apple: { brix: true, grainMoisture: false, dryMatter: false },
  pear: { brix: true, grainMoisture: false, dryMatter: false },
  citrus: { brix: true, grainMoisture: false, dryMatter: false },
  stone_fruit: { brix: true, grainMoisture: false, dryMatter: false },
  berry: { brix: true, grainMoisture: false, dryMatter: false },
  table_grape: { brix: true, grainMoisture: false, dryMatter: false },
  fruiting_vegetable: { brix: true, grainMoisture: false, dryMatter: false },
  // Moisture at harvest drives drying and storage.
  grain: { brix: false, grainMoisture: true, dryMatter: false },
  // Kernel moisture / dry matter.
  tree_nut: { brix: false, grainMoisture: false, dryMatter: true },
  // The audit's own example: a carrot form asking for grain moisture, Brix and dry matter.
  root_bulb: { brix: false, grainMoisture: false, dryMatter: false },
  leafy: { brix: false, grainMoisture: false, dryMatter: false }
};

/**
 * Crops carrying a measure their GRADE family does not imply.
 *
 * Avocado has no USDA grade standard, so `CROP_GRADE_FAMILY` puts it in `none` — but dry matter
 * is the avocado maturity test (a California maturity requirement). Deriving maturity purely
 * from the grade family would drop the one crop the audit named.
 */
const CROP_OVERRIDES: Record<string, MaturityMeasures> = {
  avocado: { brix: false, grainMoisture: false, dryMatter: true },
  avocados: { brix: false, grainMoisture: false, dryMatter: true }
};

const normalise = (crop?: string | null): string =>
  (crop ?? '').toString().trim().toLowerCase().replace(/\s+/g, '_');

/**
 * Which maturity measures this crop's harvest form should offer.
 *
 * Returns every measure for any crop whose profile is not settled — see the rules above.
 */
export const maturityMeasuresForCrop = (crop?: string | null): MaturityMeasures => {
  const key = normalise(crop);
  if (!key) return ALL;

  const override = CROP_OVERRIDES[key];
  if (override) return override;

  const family = CROP_GRADE_FAMILY[key];
  return (family && SETTLED_FAMILIES[family]) || ALL;
};
