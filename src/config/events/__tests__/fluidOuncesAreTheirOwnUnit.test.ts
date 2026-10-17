/**
 * Fluid ounces are a unit of their own, printed "fl oz".
 *
 * 🔴 Pilot rehearsal, 2026-10-17. The chemical form offered one "oz", labelled "Fluid Ounces (oz)"
 * on the application and "Ounces" on the purchase, and stored the same code for both. The
 * certifier packet printed a liquid applied as "36 oz" beside its own "6 fl oz/acre" rate, and
 * "128 oz" purchased against an invoice reading 128 fl oz.
 *
 * New records choose fl oz or oz wt. The old "oz" stays valid for the records that hold it and
 * is offered only to them: it does not say which ounce it means, so it is never chosen anew.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { VOLUME_UNITS } from '../enums';
import { formatVolume } from '../formatters';

const CHEMICAL_TAB = path.resolve(
  __dirname,
  '../../../views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx'
);

/**
 * The JSX of the unit select for `name` that offers the full unit list (the summary-mode selects
 * for the same field offer only L / gal / kg and are not where an ounce is chosen).
 */
function selectBlock(source: string, name: string): string {
  const blocks: string[] = [];
  for (
    let at = source.indexOf(`name="${name}"`);
    at !== -1;
    at = source.indexOf(`name="${name}"`, at + 1)
  ) {
    blocks.push(source.slice(at, source.indexOf('</StandardSelect>', at)));
  }
  const full = blocks.filter((b) => b.includes('app.unit.milliliters'));
  expect(full).toHaveLength(1);
  return full[0];
}

describe('fluid and weight ounces', () => {
  it('the volume enum offers fl oz and oz wt, and keeps oz only for records that hold it', () => {
    const byValue = Object.fromEntries(VOLUME_UNITS.map((u) => [u.value, u]));
    expect(byValue.fl_oz).toBeDefined();
    expect(byValue.oz_wt).toBeDefined();
    expect(byValue.oz?.legacyOnly).toBe(true);
  });

  for (const name of ['volume_unit', 'quantity_purchased_unit']) {
    it(`the chemical form's ${name} offers fl oz and oz wt, and gates the old oz`, () => {
      const block = selectBlock(fs.readFileSync(CHEMICAL_TAB, 'utf8'), name);
      expect(block).toContain('value="fl_oz"');
      expect(block).toContain('value="oz_wt"');
      // The old code appears only behind the record's own value.
      expect(block).toMatch(/field\.value === 'oz' && \(\s*<option value="oz">/);
    });
  }

  it('a record view prints fl oz, never the stored code', () => {
    expect(formatVolume(36, { volume_unit: 'fl_oz' } as never)).toBe('36 fl oz');
    expect(formatVolume(2, { volume_unit: 'oz_wt' } as never)).toBe('2 oz wt');
    // The old code is printed as recorded.
    expect(formatVolume(36, { volume_unit: 'oz' } as never)).toBe('36 oz');
  });
});
