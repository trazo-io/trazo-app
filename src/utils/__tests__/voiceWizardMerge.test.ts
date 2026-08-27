/**
 * WS-4c — voice → wizard merge contract.
 *
 * NewEvent merges ONLY the AI-detected fields (overriddenFields) into
 * eventFormData; template defaults stay out (suggest → confirm red line).
 * These tests pin the two properties that merge depends on:
 *
 *   1. overriddenFields ⊆ keys(values), and every override key is a backend
 *      field name the tabs understand.
 *   2. Template defaults are NOT in overriddenFields — so filtering by
 *      overriddenFields really does exclude everything the farmer never said.
 */

import { describe, expect, it } from 'vitest';

import { mapVoiceDataToFieldValues, mapVoiceTypeToTemplate } from '../voiceDataMapper';
import type { ParsedVoiceData } from '../voiceDataMapper';

const BACKEND_FIELDS = new Set([
  'commercial_name',
  'concentration',
  'application_method',
  'volume_applied',
  'volume_unit',
  'area_treated',
  'area_covered',
  'area_unit',
  'equipment_hours',
  'fuel_consumed',
  'fuel_unit',
  'water_source',
  'irrigation_method',
  'irrigation_depth',
  'irrigation_depth_unit',
  'yield_quantity',
  'yield_unit',
  // 2026-08-26: the transcript now lands in the notes box on every activity, so this is a
  // legitimate override key. The fixtures below set no `original_transcript`, so nothing
  // here exercises it — this entry keeps the allowlist honest rather than letting a future
  // fixture trip a guard that was simply out of date.
  'observation'
]);

const parsed = (over: Partial<ParsedVoiceData>): ParsedVoiceData =>
  ({
    type: 'fertilization',
    description: '',
    confidence: 0.9,
    detected_amounts: [],
    detected_products: [],
    detected_systems: [],
    ...over
  } as ParsedVoiceData);

describe('voice → wizard merge contract', () => {
  it('fertilizer utterance yields only backend-named, actually-detected fields', () => {
    const data = parsed({
      type: 'fertilization',
      commercial_name: 'Zinc Sulfate 36%',
      detected_amounts: ['200 pounds', '5 acres']
    });
    const mapping = mapVoiceTypeToTemplate(data.type);
    const result = mapVoiceDataToFieldValues(data, mapping.templateId);

    const detected: Record<string, unknown> = {};
    result.overriddenFields.forEach((k) => {
      detected[k] = result.values[k];
    });

    expect(detected.commercial_name).toBe('Zinc Sulfate 36%');
    expect(detected.volume_applied).toBe(200);
    expect(detected.volume_unit).toBe('lb');
    expect(detected.area_treated).toBe(5);
    expect(detected.area_unit).toBe('acres');
    Object.keys(detected).forEach((k) => expect(BACKEND_FIELDS.has(k)).toBe(true));
  });

  it('harvest utterance maps weight to yield fields', () => {
    const data = parsed({ type: 'harvest', detected_amounts: ['4200 pounds'] });
    const mapping = mapVoiceTypeToTemplate(data.type);
    const result = mapVoiceDataToFieldValues(data, mapping.templateId);
    const detected = Object.fromEntries(result.overriddenFields.map((k) => [k, result.values[k]]));
    expect(detected.yield_quantity).toBe(4200);
    expect(detected.yield_unit).toBe('lb');
  });

  it('template defaults are never in overriddenFields', () => {
    const data = parsed({ type: 'irrigation', detected_amounts: [] });
    const mapping = mapVoiceTypeToTemplate(data.type);
    const result = mapVoiceDataToFieldValues(data, mapping.templateId);
    // values may carry template defaults; the override list must not
    const defaultsOnly = Object.keys(result.values).filter(
      (k) => !result.overriddenFields.includes(k)
    );
    expect(result.overriddenFields).toHaveLength(0);
    expect(defaultsOnly.length).toBeGreaterThan(0);
  });
});
