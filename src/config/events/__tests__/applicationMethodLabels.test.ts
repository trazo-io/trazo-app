/**
 * Every application method a form can write must have a display label.
 *
 * There are TWO maps: `APPLICATION_METHODS_BY_CHEMICAL_TYPE` in `enums.ts` drives the form's
 * <option> list, and `APPLICATION_METHOD_LABELS` in `chemicalEvent.ts` renders the stored value.
 * `formatApplicationMethod` falls through to `?? v`, so any value present in the first and absent
 * from the second renders its RAW ENUM KEY to a shopper.
 *
 * That is exactly what happened: 2026-08-02 added `air_blast`/`aerial` to the form lists to fix
 * this very symptom, but not to the label map — so an orchard airblast spray still displayed
 * "air_blast" on the live consumer card, verified 2026-08-03.
 */
import { describe, expect, it } from 'vitest';

import { APPLICATION_METHOD_LABELS, formatApplicationMethod } from '../chemicalEvent';
import { APPLICATION_METHODS_BY_CHEMICAL_TYPE } from '../enums';

describe('application method labels', () => {
  it('covers every value any chemical subtype can write', () => {
    const missing: string[] = [];
    for (const [subtype, options] of Object.entries(APPLICATION_METHODS_BY_CHEMICAL_TYPE)) {
      for (const option of options) {
        if (!APPLICATION_METHOD_LABELS[option.value]) {
          missing.push(`${subtype}:${option.value}`);
        }
      }
    }
    expect(missing, `these would render their raw enum key to a shopper: ${missing.join(', ')}`).toEqual([]);
  });

  it('never returns a value that looks like a raw enum key', () => {
    for (const options of Object.values(APPLICATION_METHODS_BY_CHEMICAL_TYPE)) {
      for (const option of options) {
        const rendered = formatApplicationMethod(option.value);
        expect(rendered, option.value).toBeTruthy();
        // Raw keys are snake_case; a display label never is.
        expect(rendered, `${option.value} rendered as a raw key`).not.toMatch(/^[a-z]+(_[a-z]+)+$/);
      }
    }
  });

  it('covers the stored-only values the PUR exporter also knows', () => {
    // No current form writes these, but they exist in stored data and in
    // `pur_export_service._METHOD_TO_DPR`, so the card must still render words.
    for (const value of ['banding', 'injection', 'drip', 'fumigation']) {
      expect(APPLICATION_METHOD_LABELS[value], value).toBeTruthy();
    }
  });

  it('returns null for an empty or non-string value rather than a stray label', () => {
    expect(formatApplicationMethod('')).toBeNull();
    expect(formatApplicationMethod(undefined)).toBeNull();
    expect(formatApplicationMethod(42)).toBeNull();
  });
});
