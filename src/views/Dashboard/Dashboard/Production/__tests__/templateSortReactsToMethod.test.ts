/**
 * The organic-first template sort must recompute when the production method changes.
 *
 * This guard exists because the sort was silently INERT. `filteredTemplates` read the method via
 * `getValues('production_method')` and listed `getValues` in the `useMemo` dependency array — but
 * `getValues` is a STABLE function reference in react-hook-form, so the memo never invalidated.
 * The order was computed once at first render and never again.
 *
 * The consequence was not cosmetic: selecting "Organic" left the CONVENTIONAL template first, and
 * the conventional list is where the prohibited inputs live. The whole mitigation for the
 * glyphosate problem did nothing, and nothing about the UI said so.
 *
 * Verified live before the fix (`Conventional, Organic`) and after (`Organic, Conventional`).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(
  join(__dirname, '..', 'QuickStartProduction.tsx'),
  'utf8'
);

/** The `filteredTemplates` memo, from its declaration to its dependency array. */
const memoBlock = (() => {
  const start = source.indexOf('const filteredTemplates = useMemo(');
  expect(start, 'filteredTemplates memo not found — was it renamed?').toBeGreaterThan(-1);
  const end = source.indexOf('farmDefaultMethod]', start);
  expect(end, 'memo dependency array not found').toBeGreaterThan(-1);
  return source.slice(start, end + 'farmDefaultMethod]'.length);
})();

describe('template sort reacts to the production method', () => {
  it('does not read the method through getValues', () => {
    // getValues returns the value at call time but never triggers a re-render or invalidates a
    // memo, so a sort keyed on it silently freezes.
    expect(memoBlock).not.toContain("getValues('production_method')");
  });

  it('does not list getValues as a dependency', () => {
    // The specific defect: a stable reference in the deps array means the memo never recomputes.
    expect(memoBlock).not.toMatch(/\[\s*templatesData\s*,\s*getValues/);
  });

  it('reads the method from a watched value', () => {
    expect(memoBlock).toContain('watchedProductionMethod');
  });

  it('lists the watched value as a dependency so the sort recomputes', () => {
    expect(memoBlock).toMatch(/watchedProductionMethod\s*,\s*farmDefaultMethod\]/);
  });

  it('still falls back to the farm default when no method is chosen', () => {
    // A farm that has declared itself organic should get organic-first before the grower touches
    // the dropdown at all.
    expect(memoBlock).toContain('farmDefaultMethod');
  });

  it('still compares against system_type, which is the template farming_approach', () => {
    expect(memoBlock).toContain('system_type');
  });
});

describe('the sort itself', () => {
  // Mirrors the comparator so the ordering rule is asserted, not just its wiring.
  const sortBy = (method: string, templates: Array<{ name: string; system_type: string }>) =>
    [...templates].sort((a, b) => {
      const aMatch = String(a?.system_type || '').toLowerCase() === method ? 0 : 1;
      const bMatch = String(b?.system_type || '').toLowerCase() === method ? 0 : 1;
      return aMatch - bMatch;
    });

  const templates = [
    { name: 'Pistachios - Conventional Production', system_type: 'conventional' },
    { name: 'Pistachios - Organic Production', system_type: 'organic' }
  ];

  it('puts the organic template first for an organic grower', () => {
    expect(sortBy('organic', templates).map((t) => t.system_type)).toEqual([
      'organic',
      'conventional'
    ]);
  });

  it('puts the conventional template first for a conventional grower', () => {
    expect(sortBy('conventional', templates).map((t) => t.system_type)).toEqual([
      'conventional',
      'organic'
    ]);
  });

  it('does not drop the non-matching template', () => {
    // Sorting, not filtering, is deliberate: hard-filtering would show an EMPTY picker for a crop
    // that has no template in the grower's method, which is worse than showing a second option.
    expect(sortBy('organic', templates)).toHaveLength(2);
  });
});
