/**
 * California county-restricted materials (3 CCR 6400 et seq.): the products for which the spray form
 * asks a county Ag Commissioner permit, even when NOP-allowed under 7 CFR 205.601.
 *
 * One list for every product the form asks about: product 1 and each product line of a tank mix
 * (config/events/tankMix.ts). The section is shown only on a California farm, or on a record that
 * already holds a permit value (see ChemicalTab-ENHANCED, the CA permit section).
 */
export const CA_RESTRICTED_KEYWORDS: readonly string[] = [
  'copper hydroxide',
  'copper sulfate',
  'copper oxychloride',
  'bordeaux',
  'kocide',
  'sulfur',
  'pyrethrin',
  'spinosad',
  'entrust',
  'rotenone'
];

/** Does this product name match a California county-restricted material? */
export const isCaCountyRestricted = (name: unknown): boolean => {
  const text = String(name ?? '').toLowerCase();
  return CA_RESTRICTED_KEYWORDS.some((keyword) => text.includes(keyword));
};
