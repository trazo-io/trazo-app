/**
 * Boolean coercion for wizard form defaults.
 *
 * The event wizard round-trips its state through `initialValues` as STRINGS. The string 'false'
 * is truthy in JavaScript, so the natural-looking `initialValues.x ? 'true' : 'false'` evaluated
 * to 'true' the moment a step re-rendered.
 *
 * That was not cosmetic. ProductionTab used the idiom for `shared_with_conventional` and
 * `rinse_step_documented`, so every production event silently claimed the farm shares equipment
 * with a conventional operation and that a rinse step was documented — two factual § 205.272
 * assertions the farmer never made, on the record a certifier reads.
 *
 * Use this for any Chakra Switch / radio bound to a react-hook-form string field.
 */
export const asToggle = (v: unknown): 'true' | 'false' =>
  v === true || v === 'true' || v === 1 || v === '1' ? 'true' : 'false';
