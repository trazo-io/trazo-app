/**
 * §E-2 / §E-3 — the normalizer allow-list is a mandatory touchpoint.
 *
 * `normalizeBackendEventData` copies a FIXED list of names out of the API payload; anything not
 * on that list is dropped before any card renders. So a backend column, a serializer entry and a
 * registry FieldConfig can all be correct and the consumer card still shows nothing — which is
 * exactly what happened when these fields first shipped: the resolver returned sample_matrix and
 * lab_name when handed the raw payload, but the live page rendered an empty details panel because
 * the normalizer had already stripped them.
 *
 * These tests run the REAL payload shape through the REAL normalizer and then through the REAL
 * resolver, so they fail the way the page fails rather than the way a unit stub does.
 */

import { describe, expect, it } from 'vitest';

import { getFieldsForSurface } from '../../config/events';
import { extractSubtypeCode, normalizeBackendEventData } from '../eventDataNormalizer';

// Captured from PublicHistorySerializer output for a real lab-analysis event.
const LAB_EVENT_PAYLOAD = {
  id: 712,
  type: 'soil_management',
  event_type: 5,
  name: 'July leaf tissue sample - North block',
  date: '2026-07-15T09:00:00Z',
  soil_management_type: 'LA',
  sample_matrix: 'leaf',
  lab_name: 'A&L Western Labs',
  lab_sample_id: '26-04812',
  lab_report_date: '2026-07-18',
  lab_nitrogen: '2.3',
  lab_potassium: '1.4',
  lab_cec: '14.5',
  lab_zinc_ppm: '0.8',
  lab_boron_ppm: '0.4',
  area_covered: '44.50',
  area_unit: 'acres'
};

const MICRONUTRIENT_EVENT_PAYLOAD = {
  id: 996,
  type: 'chemical',
  event_type: 2,
  chemical_type: 'FE',
  commercial_name: 'Zinc Sulfate 36%',
  date: '2026-08-20T07:30:00Z',
  concentration: '36%',
  micronutrient_type: 'zinc',
  micronutrient_rate: '10.000',
  micronutrient_rate_unit: 'lb/ac',
  area_numeric: '44.5',
  area_unit: 'acres'
};

const resolvedNames = (
  eventType: number,
  event: Record<string, unknown>,
  surface: 'consumer_card' | 'modal'
) => {
  const r = getFieldsForSurface(eventType, extractSubtypeCode(event) as never, surface, event);
  return [...r.hero, ...r.immediate, ...r.secondary, ...r.details].map((f) => f.name);
};

describe('§E-2 lab analysis survives normalization', () => {
  const normalized = normalizeBackendEventData(5, LAB_EVENT_PAYLOAD) as Record<string, unknown>;

  it('resolves the LA subtype', () => {
    expect(extractSubtypeCode(normalized)).toBe('LA');
  });

  it('keeps every lab field the form can write', () => {
    for (const field of [
      'sample_matrix',
      'lab_name',
      'lab_sample_id',
      'lab_report_date',
      'lab_nitrogen',
      'lab_potassium',
      'lab_cec',
      'lab_zinc_ppm',
      'lab_boron_ppm'
    ]) {
      expect(normalized[field], `${field} was dropped by the normalizer allow-list`).toBeDefined();
    }
  });

  it('renders the sample type and the laboratory on the consumer card', () => {
    const names = resolvedNames(5, normalized, 'consumer_card');
    expect(names).toContain('sample_matrix');
    expect(names).toContain('lab_name');
  });

  it('keeps the numeric results off the consumer card', () => {
    // N/P/K, CEC and ppm figures are the jargon class transparency-first.md excludes; they
    // belong to the producer and the certifier, and the registry surfaces enforce that.
    const names = resolvedNames(5, normalized, 'consumer_card');
    for (const field of [
      'lab_nitrogen',
      'lab_potassium',
      'lab_cec',
      'lab_zinc_ppm',
      'lab_boron_ppm'
    ]) {
      expect(names, `${field} leaked to the consumer card`).not.toContain(field);
    }
  });

  it('shows the numeric results to the producer', () => {
    const names = resolvedNames(5, normalized, 'modal');
    expect(names).toContain('lab_cec');
    expect(names).toContain('lab_zinc_ppm');
  });
});

describe('§E-3 micronutrients survive normalization', () => {
  const normalized = normalizeBackendEventData(2, MICRONUTRIENT_EVENT_PAYLOAD) as Record<
    string,
    unknown
  >;

  it('keeps the micronutrient fields', () => {
    expect(normalized.micronutrient_type).toBe('zinc');
    expect(normalized.micronutrient_rate).toBeDefined();
    expect(normalized.micronutrient_rate_unit).toBe('lb/ac');
  });

  it('names the nutrient on the consumer card but not the rate', () => {
    const names = resolvedNames(2, normalized, 'consumer_card');
    expect(names).toContain('micronutrient_type');
    expect(names, 'an application rate reached the consumer card').not.toContain(
      'micronutrient_rate'
    );
  });

  it('shows the rate to the producer', () => {
    expect(resolvedNames(2, normalized, 'modal')).toContain('micronutrient_rate');
  });
});
