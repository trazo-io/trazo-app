/**
 * Spoken fuel reaches the fuel field, and only fuel does.
 *
 * MEASURED 2026-10-25 by pasting notes into the activity wizard against the live parser
 * (gpt-4o-mini via process-voice-event). The amounts and `fuel_amount: null` in both replies below
 * are as measured, trimmed to the keys the mapper reads; the mowing note is verbatim, and only the
 * tail of the spray note ("about 2 hours of tractor time, used 6 gallons of diesel") was recorded,
 * so its opening is reconstructed. Before the fix neither filled a fuel field, and on the spray the
 * diesel was one rate-less sentence away from becoming the amount of fungicide applied.
 */
import { describe, expect, it } from 'vitest';

import {
  gateVoiceOverridesToForm,
  mapVoiceDataToFieldValues,
  spokenFuelAmount
} from '../voiceDataMapper';

const MOWING_NOTE =
  'Mowed the cover crop between rows on both blocks, flail mower, 3 hours each, 5 gallons of diesel.';

const mowingReply = {
  type: 'mowing',
  description: 'Mowed cover crop between rows with a flail mower.',
  confidence: 90,
  detected_amounts: [
    { value: 5, unit: 'gallons', category: 'fuel' },
    { value: 3, unit: 'hours', category: 'time' }
  ],
  detected_products: [],
  detected_systems: ['flail mower'],
  fuel_amount: null,
  original_transcript: MOWING_NOTE
};

const SPRAY_NOTE =
  'Sprayed copper on the walnuts for blight, airblast, about 2 hours of tractor time, used 6 gallons of diesel.';

const sprayReply = {
  type: 'fungicide',
  description: 'Copper fungicide spray for walnut blight.',
  confidence: 90,
  detected_amounts: [
    { value: 2, unit: 'hours', category: 'time' },
    { value: 6, unit: 'gallons', category: 'volume' }
  ],
  detected_products: ['copper'],
  detected_systems: ['airblast'],
  application_method: 'air_blast',
  fuel_amount: null,
  original_transcript: SPRAY_NOTE
};

describe('spoken fuel on a mowing pass', () => {
  it('fills fuel_consumed from "5 gallons of diesel" although fuel_amount came back null', () => {
    const { values } = mapVoiceDataToFieldValues(mowingReply as never, 'mowing');
    expect(values.fuel_consumed).toBe(5);
    expect(values.fuel_unit).toBe('gal');
    expect(values.equipment_hours).toBe(3);
  });

  it('survives the render gate on the Mowing form', () => {
    const { values } = mapVoiceDataToFieldValues(mowingReply as never, 'mowing');
    const { kept } = gateVoiceOverridesToForm(values, 1, 'MO' as never);
    expect(kept.fuel_consumed).toBe(5);
    expect(kept.fuel_unit).toBe('gal');
  });
});

describe('spoken fuel on a spray', () => {
  it('fills application_fuel_consumed from "used 6 gallons of diesel"', () => {
    const { values } = mapVoiceDataToFieldValues(sprayReply as never, 'fungicide');
    expect(values.application_fuel_consumed).toBe(6);
    expect(values.application_fuel_unit).toBe('gal');
  });

  it('never offers the diesel as the amount of fungicide applied', () => {
    const { values } = mapVoiceDataToFieldValues(sprayReply as never, 'fungicide');
    expect(values.volume_applied).toBeUndefined();
    expect(values.volume_unit).toBeUndefined();
  });

  it('survives the render gate on the Fungicide form, unit and all', () => {
    const { values } = mapVoiceDataToFieldValues(sprayReply as never, 'fungicide');
    const { kept } = gateVoiceOverridesToForm(values, 2, 'FU' as never);
    expect(kept.application_fuel_consumed).toBe(6);
    expect(kept.application_fuel_unit).toBe('gal');
  });
});

describe('a volume that is not fuel stays out of fuel', () => {
  it('keeps "100 gallons of water" as the spray volume, not fuel', () => {
    const note = 'Sprayed sulfur on the vines, 100 gallons of water, airblast.';
    const { values } = mapVoiceDataToFieldValues(
      {
        ...sprayReply,
        detected_amounts: [{ value: 100, unit: 'gallons', category: 'volume' }],
        original_transcript: note
      } as never,
      'fungicide'
    );
    expect(values.application_fuel_consumed).toBeUndefined();
    expect(values.volume_applied).toBe(100);
  });

  it('keeps a "100 gallon tank mix" out of fuel on a cultivation pass too', () => {
    // The old guess read ANY gallons as diesel on cultivation.
    const note = 'Disked the east block, then filled the 100 gallon tank mix for tomorrow.';
    const { values } = mapVoiceDataToFieldValues(
      {
        ...mowingReply,
        type: 'cultivation',
        detected_amounts: [{ value: 100, unit: 'gallons', category: 'volume' }],
        original_transcript: note
      } as never,
      'cultivation'
    );
    expect(values.fuel_consumed).toBeUndefined();
  });

  it('distrusts a model that put the tank volume in fuel_amount', () => {
    const note = 'Sprayed sulfur, 100 gallons of water, airblast.';
    const { values } = mapVoiceDataToFieldValues(
      {
        ...sprayReply,
        detected_amounts: [{ value: 100, unit: 'gallons', category: 'volume' }],
        fuel_amount: { value: 100, unit: 'gallons' },
        original_transcript: note
      } as never,
      'fungicide'
    );
    expect(values.application_fuel_consumed).toBeUndefined();
  });
});

describe('spokenFuelAmount', () => {
  it.each([
    ['5 gallons of diesel', { value: 5, unit: 'gal' }],
    ['used 6 gallons of off-road diesel', { value: 6, unit: 'gal' }],
    ['burned 12 gal diesel', { value: 12, unit: 'gal' }],
    ['diesel, about 4 gallons', { value: 4, unit: 'gal' }],
    ['propane 20 gallons for the heaters', { value: 20, unit: 'gal' }],
    ['gastamos 18 litros de gasoil', { value: 18, unit: 'L' }],
    ['5 galones de combustible', { value: 5, unit: 'gal' }],
    ['2,5 litros de gasolina', { value: 2.5, unit: 'L' }],
    // The water is not fuel because a liquid word ends the search; the diesel after it still is.
    ['50 gallons of water, diesel 3 gallons', { value: 3, unit: 'gal' }]
  ])('reads fuel from "%s"', (note, expected) => {
    expect(spokenFuelAmount(note)).toEqual(expected);
  });

  it.each([
    '100 gallons of water',
    'a 100 gallon tank mix',
    'sprayed 100 gallons, used diesel for the tractor',
    '40 gallons total',
    '20 litros de agua',
    'filled the diesel tank'
  ])('reads no fuel from "%s"', (note) => {
    expect(spokenFuelAmount(note)).toBeNull();
  });

  it.each([
    ['five gallons of diesel', { value: 5, unit: 'gal' }],
    ['twenty five gallons of diesel', { value: 25, unit: 'gal' }],
    ['a hundred gallons of diesel', { value: 100, unit: 'gal' }],
    ['treinta y cinco litros de gasoil', { value: 35, unit: 'L' }]
  ])('reads a number said in words from the transcript: "%s"', (note, expected) => {
    expect(spokenFuelAmount(note)).toEqual(expected);
  });

  it('reads "1,200" as twelve hundred, not 1.2 (review of app #205)', () => {
    expect(spokenFuelAmount('filled the tank, 1,200 gallons of diesel')).toEqual({
      value: 1200,
      unit: 'gal'
    });
  });

  it('a liquid word vetoes the amount even with a fuel word before it (review of app #205)', () => {
    expect(spokenFuelAmount('Sprayed copper, airblast, diesel, 200 gallons of water.')).toBeNull();
    expect(spokenFuelAmount('diesel, 100 gallon tank mix')).toBeNull();
  });
});

describe('the spray volume survives next to spoken fuel (review of app #205)', () => {
  it('never takes the water as fuel when the fuel is said in words', () => {
    // Only the 300 was detected. The old candidate fallback found exactly one gallon amount,
    // the WATER, filed it as fuel and then stripped it from the product total.
    const note =
      'Sprayed copper, 300 gallons of water, airblast, the tractor burned five gallons of diesel.';
    const { values } = mapVoiceDataToFieldValues(
      {
        ...sprayReply,
        detected_amounts: [{ value: 300, unit: 'gallons', category: 'volume' }],
        original_transcript: note
      } as never,
      'fungicide'
    );
    expect(values.application_fuel_consumed).toBe(5);
    expect(values.volume_applied).toBe(300);
  });

  it('fills the fuel when the model reports it in both fuel_amount and detected_amounts', () => {
    const { values } = mapVoiceDataToFieldValues(
      {
        ...mowingReply,
        detected_amounts: [{ value: 5, unit: 'gallons', category: 'fuel' }],
        fuel_amount: { value: 5, unit: 'gallons' },
        original_transcript: 'Mowed both blocks, five gallons of diesel.'
      } as never,
      'mowing'
    );
    expect(values.fuel_consumed).toBe(5);
  });

  it('keeps a water volume when diesel is named just before it', () => {
    const { values } = mapVoiceDataToFieldValues(
      {
        ...sprayReply,
        detected_amounts: [{ value: 200, unit: 'gallons', category: 'volume' }],
        original_transcript: 'Sprayed copper, airblast, diesel, 200 gallons of water.'
      } as never,
      'fungicide'
    );
    expect(values.application_fuel_consumed).toBeUndefined();
    expect(values.volume_applied).toBe(200);
  });
});
