/**
 * A spray's buffer zone in feet for a US farm, stored as metres (`buffer_zone_meters`).
 *
 * The column stays in metres with one decimal; the certifier packet already prints both ("49 ft
 * (15 m)"). A US grower measures a buffer in feet, so the spray form shows feet and converts only
 * when the grower types: an untouched record keeps the metres it was saved with, to the decimal.
 *
 * Whole feet on display: one stored decimal of a metre is 0.33 ft, so a whole number typed in
 * feet always reads back as itself (50 ft -> 15.2 m -> 50 ft).
 */
const METRES_PER_FOOT = 0.3048;

const parse = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : parseFloat(String(value));
  return Number.isNaN(numeric) ? null : numeric;
};

/** Stored metres as whole feet for the input, or '' when nothing is stored. */
export const metresToFeet = (metres: unknown): string => {
  const value = parse(metres);
  return value == null ? '' : String(Math.round(value / METRES_PER_FOOT));
};

/** Typed feet as the metres the column stores (one decimal), or '' when the box is empty. */
export const feetToMetres = (feet: unknown): string => {
  const value = parse(feet);
  return value == null ? '' : (value * METRES_PER_FOOT).toFixed(1);
};
