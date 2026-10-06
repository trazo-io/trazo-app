/**
 * A template accelerator may suggest HOW. It may never answer a compliance question, or
 * supply a measurement, on the operator's behalf.
 *
 * Until 2026-08-19 the prefill merged every quickEventFields default except `*_unit`, and the
 * chemical templates carry defaults that are regulatory assertions, not operational ones. The
 * worst was `organic_approved: 'no'`: 'no' is in ORGANIC_PROHIBITED_VALUES on the backend, so
 * a grower who picked the "Fungicide" template and did not notice that field saved a record
 * asserting a PROHIBITED SUBSTANCE was applied — which resets the § 205.202(b) 36-month clock
 * and prints the parcel as in-transition on the packet that goes to the certifier.
 *
 * `cleanEventData` in the activity wizard is a passthrough with no allowlist, so anything
 * merged here lands on the saved record whether the form renders the field or not.
 */
import { describe, expect, it } from 'vitest';

import { TEMPLATE_ACCELERATORS, templatePrefillValues } from '../templateAccelerators';

/** Every field whose value is a claim about compliance, classification, or an observation. */
const NEVER_PREFILLED = [
  'organic_approved',
  'amendment_organic_approved',
  'beneficial_organic_approved',
  'chemical_subtype',
  'restricted_use_pesticide',
  'concentration',
  'weather_conditions',
  'application_timing',
  'compost_temperature_reached_131f',
  'seed_certification_status',
  'seed_treatment_allowed_basis',
  'previous_use',
  'cleaning_protocol',
  'national_list_substance',
  'omri_product'
];

describe('template accelerators never prefill an attestation', () => {
  it.each(TEMPLATE_ACCELERATORS.map((t) => [t.id, t] as const))(
    '%s prefills no compliance claim',
    (_id, tpl) => {
      const prefill = templatePrefillValues(tpl);
      for (const field of NEVER_PREFILLED) {
        expect(prefill).not.toHaveProperty(field);
      }
    }
  );

  it('still prefills the operational values the accelerator exists for', () => {
    const fungicide = TEMPLATE_ACCELERATORS.find((t) => t.id === 'fungicide')!;
    const prefill = templatePrefillValues(fungicide);
    expect(prefill.type).toBe('FU');
    // Run 8 (R8-03): the method is suggested; the volume is the grower's to state.
    expect(prefill.volume_applied).toBeUndefined();
    expect(prefill.application_method).toBeDefined();
  });

  it('drops any field not on the allow-list, so a new one fails safe', () => {
    const irrigation = TEMPLATE_ACCELERATORS.find((t) => t.id === 'irrigation')!;
    const keys = Object.keys(templatePrefillValues(irrigation));
    // `type` plus allow-listed fields only — nothing else may appear.
    const allowed = new Set([
      'type',
      'application_method',
      'irrigation_method',
      'water_source',
      'equipment_type',
      'equipment_operation_type',
      'amendment_type',
      'seeds_source',
      'production_efficiency',
      'operation_efficiency'
    ]);
    for (const key of keys) expect(allowed.has(key)).toBe(true);
  });
});

/**
 * Run 8 (R8-03, Astra 2026-10-05): picking the Harvest template filled 1 acre, 100 lb and 5 km
 * before the grower supplied any of them. A measurement on a record is an observation, so no
 * template may supply one. Every template is driven, not a sample.
 */
describe('no template supplies a measurement', () => {
  const MEASUREMENTS = [
    'area_covered',
    'area_treated',
    'volume_applied',
    'yield_quantity',
    'amendment_amount_numeric',
    'irrigation_depth',
    'transportation_distance',
    'fuel_consumed',
    'equipment_hours',
    'application_fuel_consumed',
    'fuel_type',
    'application_fuel_type'
  ];

  it.each(TEMPLATE_ACCELERATORS.map((t) => [t.id, t] as const))('%s', (_id, tpl) => {
    const prefill = templatePrefillValues(tpl);
    for (const key of MEASUREMENTS) {
      expect(prefill[key], `${tpl.id} prefilled ${key}`).toBeUndefined();
    }
  });

  it('drives at least the harvest template (anti-vacuity)', () => {
    expect(TEMPLATE_ACCELERATORS.some((t) => t.id === 'harvest')).toBe(true);
  });
});
