/**
 * Audit T05: "grain moisture, fruit Brix and avocado/nut dry matter on a carrot form".
 *
 * All three maturity measures rendered on every harvest form, gated only by subtype, with the
 * placeholder "Leave blank if N/A" — which the audit correctly read as evidence the interface
 * should be hiding them by context rather than asking the farmer to work it out.
 */
import { describe, expect, it } from 'vitest';
import { maturityMeasuresForCrop } from '../harvestMaturity';

describe('maturityMeasuresForCrop', () => {
  it('offers a carrot pick none of the three — the audit’s example', () => {
    expect(maturityMeasuresForCrop('carrots')).toEqual({
      brix: false,
      grainMoisture: false,
      dryMatter: false
    });
  });

  it('offers avocado dry matter and nothing else', () => {
    // Avocado has no USDA grade standard, so it sits in the `none` grade family — but dry
    // matter IS its maturity test. Deriving from the grade family alone would drop it.
    expect(maturityMeasuresForCrop('avocados')).toEqual({
      brix: false,
      grainMoisture: false,
      dryMatter: true
    });
  });

  it('offers tree nuts dry matter', () => {
    expect(maturityMeasuresForCrop('almonds').dryMatter).toBe(true);
    expect(maturityMeasuresForCrop('walnuts').dryMatter).toBe(true);
    expect(maturityMeasuresForCrop('almonds').brix).toBe(false);
  });

  it('offers grain crops moisture and nothing else', () => {
    expect(maturityMeasuresForCrop('wheat')).toEqual({
      brix: false,
      grainMoisture: true,
      dryMatter: false
    });
    expect(maturityMeasuresForCrop('corn_field').grainMoisture).toBe(true);
  });

  it.each(['blueberries', 'strawberries', 'grapes', 'apples', 'citrus_oranges', 'stone_fruit'])(
    'offers %s a Brix reading',
    (crop) => {
      expect(maturityMeasuresForCrop(crop).brix).toBe(true);
      expect(maturityMeasuresForCrop(crop).grainMoisture).toBe(false);
    }
  );

  it('offers leafy greens none of the three', () => {
    expect(maturityMeasuresForCrop('spinach').brix).toBe(false);
    expect(maturityMeasuresForCrop('lettuce').dryMatter).toBe(false);
  });

  it('keeps every measure for a family whose maturity profile is NOT settled', () => {
    // olives, dates and figs are in CROP_GRADE_FAMILY but I cannot state what their growers
    // measure at harvest. Narrowing them would be hiding a field on a guess — the same failure
    // this change exists to remove, pointed at a different farmer.
    for (const crop of ['olives', 'dates', 'figs', 'pomegranates', 'hops', 'cotton']) {
      expect(maturityMeasuresForCrop(crop)).toEqual({
        brix: true,
        grainMoisture: true,
        dryMatter: true
      });
    }
  });

  it('keeps EVERY measure for a crop it cannot classify', () => {
    // Fail open. Hiding a field on an unknown crop would silently drop a measurement the
    // grower needs; the audit's complaint is about crops we DO know.
    expect(maturityMeasuresForCrop('dragonfruit')).toEqual({
      brix: true,
      grainMoisture: true,
      dryMatter: true
    });
    expect(maturityMeasuresForCrop('')).toEqual({
      brix: true,
      grainMoisture: true,
      dryMatter: true
    });
    expect(maturityMeasuresForCrop(null)).toEqual({
      brix: true,
      grainMoisture: true,
      dryMatter: true
    });
    expect(maturityMeasuresForCrop(undefined)).toEqual({
      brix: true,
      grainMoisture: true,
      dryMatter: true
    });
  });

  it('is tolerant of spacing and case in the crop name', () => {
    expect(maturityMeasuresForCrop('  Carrots ')).toEqual(maturityMeasuresForCrop('carrots'));
    expect(maturityMeasuresForCrop('Corn Field').grainMoisture).toBe(true);
  });
});
