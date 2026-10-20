/**
 * `mergeOfferedValues`: the rule behind "Would fill" and "Fill in N values" on a pasted note.
 *
 * The pasted-note path holds its values OUTSIDE the form and the farmer taps to write them. While
 * the offer sits there they are invited to read the quoted note and type. So the tap must fill
 * empties, never replace their entries: the words on the button promise filling.
 *
 * The first version of this shipped inline in the wizard and was wrong: it read
 * `VOICE_UNIT_COMPANIONS[key]` as a single partner when it is an ARRAY of owner fields, so
 * `String(['volume_applied'])` was truthy and it blocked pairs it should have written, while the
 * reverse lookup compared an array to a string and never matched at all. Hence this file.
 */
import { describe, expect, it } from 'vitest';

import { mergeOfferedValues } from '../voiceDataMapper';

describe('mergeOfferedValues fills empties only', () => {
  it('writes an offered value into an empty field', () => {
    expect(mergeOfferedValues({}, { commercial_name: 'Entrust SC' })).toEqual({
      commercial_name: 'Entrust SC'
    });
  });

  it('refuses to overwrite what the farmer typed after the parse', () => {
    const current = { commercial_name: 'the product actually in the tank' };
    expect(mergeOfferedValues(current, { commercial_name: 'Entrust SC' })).toEqual({});
  });

  it("protects the farmer's own prose, which is published on the buyer page", () => {
    const current = { observation: 'I checked the block myself before spraying.' };
    expect(mergeOfferedValues(current, { observation: 'crew note text' })).toEqual({});
  });

  it('treats blank, whitespace, null and undefined as empty', () => {
    const offered = { block_id: 'Block 4' };
    for (const current of [{}, { block_id: '' }, { block_id: '   ' }, { block_id: null }]) {
      expect(mergeOfferedValues(current, offered)).toEqual(offered);
    }
  });

  it('writes an amount and its unit together when both sides are empty', () => {
    const offered = { yield_quantity: 40, yield_unit: 'lb' };
    expect(mergeOfferedValues({}, offered)).toEqual(offered);
  });

  it('writes an amount beside the tab unit default when the note stated the unit too', () => {
    // NARROWED 2026-10-20, and the defect the old rule exists for is pinned in the test below.
    //
    // The old rule blocked the whole pair whenever ANY member was filled, and a form arrives
    // with its unit selects already on a default. MEASURED on the running stack: a crew note
    // reading "Cosechamos 85 bines del bloque 1" offered "Would fill: Yield: 85 bins", the
    // operator tapped, and the banner answered "0 fields filled", because `yield_unit` sat at
    // the tab's "lbs". That silently cost every value+unit field on every activity.
    //
    // Writing both halves cannot invent a figure: they are coherent with each other and the
    // banner names them in words before the tap. A unit alone states nothing.
    const current = { volume_unit: 'gal' };
    expect(mergeOfferedValues(current, { volume_applied: 40, volume_unit: 'lb' })).toEqual({
      volume_applied: 40,
      volume_unit: 'lb'
    });
  });

  it('writes NOTHING when the amount is offered and its unit is not', () => {
    // THE ORIGINAL DEFECT, and it is the half that stays blocked: 40 written beside somebody
    // else's "gal" when the note said pounds invents an application rate that prints on a
    // certifier packet and a CA PUR export. The unit can be absent because the render gate
    // dropped it or because nobody said one.
    const current = { volume_unit: 'gal' };
    expect(mergeOfferedValues(current, { volume_applied: 40 })).toEqual({});
  });

  it('writes an amount whose unit nobody has chosen and nobody offered', () => {
    expect(mergeOfferedValues({}, { volume_applied: 40 })).toEqual({ volume_applied: 40 });
  });

  it('writes NEITHER half when the farmer typed the amount and the unit is on offer', () => {
    const current = { yield_quantity: 12 };
    expect(mergeOfferedValues(current, { yield_quantity: 40, yield_unit: 'lb' })).toEqual({});
  });

  it('handles a unit with TWO owner fields without blocking the wrong one', () => {
    // area_unit is owned by area_treated (chemical) and area_covered (production).
    const offered = { area_covered: 5, area_unit: 'acres' };
    expect(mergeOfferedValues({ area_treated: 99 }, offered)).toEqual(offered);
    expect(mergeOfferedValues({ area_covered: 99 }, offered)).toEqual({});
  });

  it('decides each fact independently, one filled field does not block the rest', () => {
    const current = { commercial_name: 'mine' };
    const offered = {
      commercial_name: 'theirs',
      block_id: 'Block 4',
      application_method: 'ground'
    };
    expect(mergeOfferedValues(current, offered)).toEqual({
      block_id: 'Block 4',
      application_method: 'ground'
    });
  });

  it('is idempotent: applying its own output again writes nothing', () => {
    const offered = { block_id: 'Block 4', yield_quantity: 40, yield_unit: 'lb' };
    const first = mergeOfferedValues({}, offered);
    expect(mergeOfferedValues({ ...first }, offered)).toEqual({});
  });

  it('never mutates either argument', () => {
    const current = { block_id: 'Block 1' };
    const offered = { block_id: 'Block 4', commercial_name: 'Entrust SC' };
    mergeOfferedValues(current, offered);
    expect(current).toEqual({ block_id: 'Block 1' });
    expect(offered).toEqual({ block_id: 'Block 4', commercial_name: 'Entrust SC' });
  });

  it('writes a legitimate zero, which is an answer and not an absence', () => {
    expect(mergeOfferedValues({}, { fuel_consumed: 0, fuel_unit: 'gal' })).toEqual({
      fuel_consumed: 0,
      fuel_unit: 'gal'
    });
  });
});
