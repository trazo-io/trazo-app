/**
 * One harvest-grade vocabulary, crop-aware, carrying the USDA grade families.
 *
 * ## What was wrong (F5, Calapooia Bend rehearsal, 2026-08-21)
 *
 * There were TWO vocabularies for one fact, and neither was a grade anyone uses:
 *
 *   - the harvest EVENT offered Export Quality / Grade A / Grade B / Grade C / Domestic
 *     Market / Processing;
 *   - the season HEADER — the lot's own identity — offered a DIFFERENT list: Premium /
 *     Grade A / Grade B / Standard / Processing.
 *
 * So a lot header and the picks underneath it could not agree with each other, and the
 * certifier packet printed both. A previous rehearsal's reviewer found "Premium Grade" on a
 * header beside "WA Extra Fancy" on the picks and said the obvious thing: *"Grade A is not an
 * apple grade."* Real packing records read "U.S. No. 1", "U.S. Commercial", "WA Extra Fancy",
 * "U.S. Fancy" — none of which was offered, so the farmer picked the least-wrong option and
 * the packet printed a grade the certifier cannot match to the packing record.
 *
 * ## The rules
 *
 * **Crop-aware, never a flat list.** One list of every USDA grade offers an apple grower
 * "U.S. Commercial" (an onion grade) and an onion grower "WA Extra Fancy", which is how a
 * wrong grade reaches a packing record in the first place.
 *
 * **No grade is better than a wrong grade.** A crop with no USDA standard — hops,
 * pomegranates, avocados, cotton — gets an EMPTY list and only the free-text escape.
 *
 * **The stored value IS the printed value.** These are display strings, not slugs. The packet
 * reproduces anything containing a capital verbatim, so what the operator picked is what the
 * reviewer reads.
 *
 * ⚠️ Mirrors `trazo-back/history/harvest_grades.py`, which is what the model columns and the
 * packet use. `history/tests/test_harvest_grade_vocabulary.py` fails if the two drift.
 */

/**
 * Column width for both grade columns, mirroring `MAX_GRADE_LENGTH` in
 * `history/harvest_grades.py`.
 *
 * Bound the INPUT, not just the API: `History.finish()` assigns straight off the QueryDict
 * with no serializer in the way, so an over-long typed grade would reach a varchar(60) as a
 * database error rather than a field message.
 */
export const MAX_GRADE_LENGTH = 60;

/** Selecting this reveals a text box; the value stored is what the operator types. */
export const OTHER_GRADE = '__other__';
export const OTHER_GRADE_LABEL = 'Other — as stated on the packing record';

export const GRADE_FAMILIES: Record<string, readonly string[]> = {
  apple: [
    'U.S. Extra Fancy',
    'U.S. Fancy',
    'U.S. No. 1',
    'U.S. Utility',
    // State marks. Washington packs to its own and a WA reviewer reads them as the grade.
    'WA Extra Fancy',
    'WA Fancy',
    'Processing'
  ],
  pear: ['U.S. No. 1', 'U.S. Combination', 'U.S. No. 2', 'Processing'],
  citrus: ['U.S. Fancy', 'U.S. No. 1', 'U.S. Combination', 'U.S. No. 2', 'Juice'],
  stone_fruit: ['U.S. Extra No. 1', 'U.S. No. 1', 'U.S. Combination', 'U.S. No. 2', 'Processing'],
  berry: ['U.S. No. 1', 'U.S. Combination', 'U.S. No. 2', 'Processing'],
  table_grape: [
    'U.S. Extra Fancy Table',
    'U.S. Fancy Table',
    'U.S. No. 1 Table',
    'U.S. No. 1 Institutional',
    'Juice / Processing'
  ],
  // Roots and bulbs — carrots, onions, potatoes.
  root_bulb: ['U.S. Extra No. 1', 'U.S. No. 1', 'U.S. Commercial', 'U.S. No. 2', 'Processing'],
  leafy: ['U.S. Fancy', 'U.S. Extra No. 1', 'U.S. No. 1', 'U.S. Commercial', 'Processing'],
  fruiting_vegetable: ['U.S. No. 1', 'U.S. Combination', 'U.S. No. 2', 'U.S. No. 3', 'Processing'],
  tree_nut: [
    'U.S. Fancy',
    'U.S. Extra No. 1',
    'U.S. No. 1',
    'U.S. Select Sheller Run',
    'U.S. Standard Sheller Run',
    'Manufacturing'
  ],
  grain: [
    'U.S. No. 1',
    'U.S. No. 2',
    'U.S. No. 3',
    'U.S. No. 4',
    'U.S. No. 5',
    'U.S. Sample grade'
  ],
  olive: ['U.S. Grade A (Fancy)', 'U.S. Grade B (Choice)', 'U.S. Grade C (Standard)', 'Oil stock'],
  date: ['U.S. Grade A', 'U.S. Grade B', 'U.S. Grade C'],
  fig: ['U.S. No. 1', 'U.S. No. 2', 'Processing'],
  // Deliberately EMPTY — see the file header.
  none: []
};

export const CROP_GRADE_FAMILY: Record<string, string> = {
  // tree fruit
  apples: 'apple',
  pears: 'pear',
  citrus_oranges: 'citrus',
  stone_fruit: 'stone_fruit',
  grapes: 'table_grape',
  olives: 'olive',
  dates: 'date',
  figs: 'fig',
  // No USDA grade standard exists for these, so none is offered.
  avocados: 'none',
  // Singular alias — the seeder's practice data carries both spellings.
  avocado: 'none',
  pomegranates: 'none',
  hops: 'none',
  cotton: 'none',
  hay_alfalfa: 'none',
  // berries
  blueberries: 'berry',
  strawberries: 'berry',
  // tree nuts
  almonds: 'tree_nut',
  walnuts: 'tree_nut',
  pecans: 'tree_nut',
  pistachios: 'tree_nut',
  hazelnuts: 'tree_nut',
  // vegetables
  carrots: 'root_bulb',
  onions: 'root_bulb',
  potatoes: 'root_bulb',
  spinach: 'leafy',
  lettuce: 'leafy',
  tomatoes: 'fruiting_vegetable',
  mixed_vegetables: 'none',
  // grains, oilseeds, legumes — graded on the federal grain standards.
  corn_field: 'grain',
  wheat: 'grain',
  rice: 'grain',
  soybeans: 'grain',
  sunflowers: 'grain',
  peanuts: 'grain'
};

/** Values written before this change. Rendered as-is so an old record still reads sensibly. */
export const LEGACY_GRADE_LABELS: Record<string, string> = {
  export_quality: 'Export Quality (legacy)',
  grade_a: 'Grade A (legacy)',
  grade_b: 'Grade B (legacy)',
  grade_c: 'Grade C (legacy)',
  domestic: 'Domestic Market (legacy)',
  processing: 'Processing (legacy)',
  premium: 'Premium Grade (legacy)',
  standard: 'Standard (legacy)'
};

/**
 * Normalise whatever a caller has — a crop slug, a CropType name, a product name — to a slug
 * this catalogue can look up. Callers hold different things: the harvest form has the
 * production's crop_type, the Finish form has only `productName`.
 */
const toSlug = (crop?: string | null): string =>
  (crop ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * "Citrus" → citrus_oranges, "Pear" → pears: a display name does not always slugify to its own
 * key, so a near-miss is resolved before giving up.
 *
 * ⛔ NOT a bare `startsWith`. That was the first version of this line and it is a live trap: a
 * crop called "Peas" slugifies to `pea`, and `pea` is a prefix of `peanuts` — so a pea grower
 * would have been offered the federal GRAIN grades. Only two shapes count as the same
 * commodity: the plural of the slug, and the slug followed by a qualifier
 * (`citrus` → `citrus_oranges`). Anything else is a different crop and gets nothing, which is
 * this module's whole rule.
 */
const nearMissKey = (slug: string): string | undefined =>
  Object.keys(CROP_GRADE_FAMILY).find(
    (key) => key === `${slug}s` || key === `${slug}es` || key.startsWith(`${slug}_`)
  );

export const gradesForCrop = (crop?: string | null): readonly string[] => {
  const slug = toSlug(crop);
  if (!slug) return [];
  const family = CROP_GRADE_FAMILY[slug] ?? CROP_GRADE_FAMILY[nearMissKey(slug) ?? ''];
  return GRADE_FAMILIES[family ?? 'none'] ?? [];
};

export interface GradeOption {
  value: string;
  label: string;
}

/**
 * The options one crop's grade select renders. The free-text escape is ALWAYS last and always
 * present: private buyer grades and state marks are real, and a farmer must never be forced to
 * state a grade their packing record does not.
 *
 * `currentValue` keeps an already-stored value selectable even when it is not in this crop's
 * family — an imported record, a legacy slug, or a grade typed through the escape.
 */
export const harvestGradeOptions = (crop?: string | null, currentValue?: string): GradeOption[] => {
  const options: GradeOption[] = gradesForCrop(crop).map((grade) => ({
    value: grade,
    label: grade
  }));
  const stored = (currentValue ?? '').trim();
  if (stored && stored !== OTHER_GRADE && !options.some((o) => o.value === stored)) {
    options.push({ value: stored, label: LEGACY_GRADE_LABELS[stored] ?? stored });
  }
  options.push({ value: OTHER_GRADE, label: OTHER_GRADE_LABEL });
  return options;
};
