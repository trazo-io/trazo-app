/**
 * A harvest counted in BINS, and a weight that belongs to something else.
 *
 * MEASURED 2026-10-19 against the live parser, from the crew-message corpus:
 *
 *   "Cosechamos 85 bines del bloque 1"
 *     -> "Nothing on this activity to fill from those words."
 *   "Cosechamos 120 bines ... el camion llevo 14 toneladas a la empacadora"
 *     -> "Would fill: Yield: 14 toneladas"
 *
 * Bins are the unit tree fruit is harvested in, which is the crop this product is sold for, and
 * the second one is the worse half: the truck's load to the packer was offered as the day's
 * yield, under a unit string the yield select has no option for. A certifier reads that figure
 * for lot traceability and mass balance.
 *
 * ⛔ A BIN IS NOT A WEIGHT. Nothing here converts one to the other: 85 bins is 85 bins, and a
 * kilo figure derived from it would be a number nobody said.
 */
import { describe, expect, it } from 'vitest';

import { mapVoiceDataToFieldValues, mapVoiceTypeToTemplate } from '../voiceDataMapper';
import type { ParsedVoiceData } from '../voiceDataMapper';

const parsed = (over: Partial<ParsedVoiceData>): ParsedVoiceData =>
  ({
    type: 'harvest',
    description: '',
    confidence: 0.9,
    detected_amounts: [],
    detected_products: [],
    detected_systems: [],
    ...over
  } as ParsedVoiceData);

function detected(data: ParsedVoiceData): Record<string, unknown> {
  const mapping = mapVoiceTypeToTemplate(data.type);
  const result = mapVoiceDataToFieldValues(data, mapping.templateId);
  return Object.fromEntries(result.overriddenFields.map((k) => [k, result.values[k]]));
}

describe('a harvest stated in containers', () => {
  it('fills the yield from bins', () => {
    const out = detected(parsed({ detected_amounts: ['85 bines'] }));
    expect(out.yield_quantity).toBe(85);
    expect(out.yield_unit).toBe('bins');
  });

  it('fills the yield from boxes, in either language', () => {
    expect(detected(parsed({ detected_amounts: ['300 cajas'] })).yield_unit).toBe('boxes');
    expect(detected(parsed({ detected_amounts: ['300 boxes'] })).yield_quantity).toBe(300);
  });

  it('takes the containers the crew counted, never a weight about something else', () => {
    // THE DEFECT, in the shape it arrived in: two amounts, and the wrong one was offered.
    const out = detected(parsed({ detected_amounts: ['120 bines', '14 toneladas'] }));
    expect(out.yield_quantity, 'the truck load was offered as the harvest').toBe(120);
    expect(out.yield_unit).toBe('bins');
  });

  it('still takes a weight when no container was named', () => {
    const out = detected(parsed({ detected_amounts: ['14 toneladas'] }));
    expect(out.yield_quantity).toBe(14);
    // And in the vocabulary the select carries, not the word that was spoken.
    expect(out.yield_unit).toBe('tons');
  });

  it('fills NEITHER half when the unit is outside the select vocabulary', () => {
    // A quantity under a unit the form cannot show is a different number. Blank is honest.
    //
    // GRAMS, deliberately, and the first version of this test used "cubetas" and proved nothing:
    // an amount whose unit no dimension recognises is dropped before this branch ever sees it, so
    // it passed with the guard removed. Grams ARE a weight, so the amount survives and reaches
    // the branch, and the yield select has no gram option. MEASURED with the guard removed:
    // `yield_unit: 'gramos'`, a value no other surface can read.
    const out = detected(parsed({ detected_amounts: ['500 gramos'] }));
    expect(out.yield_quantity).toBeUndefined();
    expect(out.yield_unit).toBeUndefined();
  });

  it('post-harvest processing follows the same rule', () => {
    const out = detected(parsed({ type: 'post_harvest', detected_amounts: ['40 bins'] }));
    expect(out.yield_quantity).toBe(40);
    expect(out.yield_unit).toBe('bins');
  });
});
