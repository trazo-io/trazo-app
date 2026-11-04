/**
 * The one place a category of farm work gets a colour on the consumer journey (2026-11-04).
 *
 * A category hue is WAYFINDING: it helps a shopper tell "Water & Care" from "Crop Inputs" at a
 * glance. It is not a status, so it may never use a status colour. Red and orange mean
 * "something is wrong" and "caution" everywhere else in Trazo, and on this page orange is the
 * restricted-use pesticide badge, a real regulatory warning. Pest & Disease used to be RED (an
 * alarm, on routine scouting) and Crop Inputs ORANGE (the same colour as that warning), so
 * they moved to teal and purple. Oscar chose this palette from rendered options.
 *
 * Farm records (business events) stay gray: they are the farm's own filings, stated as the
 * farm's, after the crop's story (Run 8, R8-15).
 *
 * Guard: consumerJourneyColourIsMeaning.test.ts (no status hue here, and no hue literal in the
 * journey or card outside this file).
 */
import { STATUS_TONE_TOKENS } from 'components/Design/StandardComponents';

export type CategoryHue = 'yellow' | 'blue' | 'purple' | 'teal' | 'green' | 'gray';

export const CHAPTER_HUE: Record<
  'soil' | 'care' | 'inputs' | 'pest' | 'harvest' | 'trust',
  CategoryHue
> = {
  soil: 'yellow',
  care: 'blue',
  inputs: 'purple',
  pest: 'teal',
  harvest: 'green',
  trust: 'gray'
};

/** By backend `event_type`. Weather routes into Water & Care, so it shares its hue. */
export const EVENT_TYPE_HUE: Record<number, CategoryHue> = {
  0: 'blue', // Weather
  1: 'green', // Production
  2: 'purple', // Chemical (crop inputs)
  3: 'gray', // General
  4: 'gray', // Equipment
  5: 'yellow', // Soil management
  6: 'teal', // Pest management
  7: 'gray' // Business (farm records)
};

export function categoryTone(hue: CategoryHue | undefined): { circle: string; glyph: string } {
  if (!hue || hue === 'gray') return STATUS_TONE_TOKENS.neutral;
  return { circle: `${hue}.50`, glyph: `${hue}.600` };
}

export const eventTypeTone = (eventType: unknown) =>
  categoryTone(typeof eventType === 'number' ? EVENT_TYPE_HUE[eventType] : undefined);
