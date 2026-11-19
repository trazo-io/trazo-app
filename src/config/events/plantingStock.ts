/**
 * Which planting-stock fields a planting or transplant asks for, by the season's crop.
 *
 * Rootstock and "Trees / Plants Planted" were asked on every planting, so an onion transplant
 * asked for a rootstock and counted trees (recordkeeping checklist run 2026-11-16, VID-14). They
 * are orchard questions. A crop whose category is clearly annual does not get the rootstock field
 * and counts plants; tree fruit, tree nuts, berries, "other" and an unknown crop keep both, so
 * nothing is hidden from a crop that might be grafted.
 */
export const ANNUAL_CROP_CATEGORIES: ReadonlySet<string> = new Set([
  'vegetable',
  'grain',
  'herb',
  'legume',
  'forage',
  'oilseed'
]);

export const isAnnualCropCategory = (category?: string | null): boolean =>
  !!category && ANNUAL_CROP_CATEGORIES.has(category);
