/**
 * Production Event Registry Tests — consumer_card coverage.
 *
 * Validates that every Production subtype resolves a non-empty consumer_card
 * field set and that every labelKey referenced by those fields (and by the
 * subtype entries themselves) resolves to an en-US i18n message. Mirrors
 * chemicalEvent.test.ts style.
 */

import { describe, expect, it } from 'vitest';

// Import triggers registry initialization
import { getFieldsForSurface, getSubtypes } from '../index';
import type { ProductionSubtype, ResolvedFieldSet } from '../index';

import enUSJson from '../../../i18n/lang/en-US.json';

const enUS = enUSJson as Record<string, string>;

const allFields = (result: ResolvedFieldSet) => [
  ...result.hero,
  ...result.immediate,
  ...result.secondary,
  ...result.details
];

// ============================================================================
// Test data: representative Production events per subtype
// ============================================================================

const base = {
  event_type: 1,
  name: 'Field Operation',
  area_covered: 5,
  area_unit: 'acres',
  observation: 'Routine seasonal pass',
  production_efficiency: 'normal'
};

const SAMPLE_EVENTS: Record<ProductionSubtype, Record<string, unknown>> = {
  PL: {
    ...base,
    name: 'Spring Planting',
    seeds_source: 'commercial',
    seed_certification_status: 'certified_organic',
    seed_supplier_name: 'Johnny Seeds',
    seed_lot_number: 'LOT-2026-001',
    variety: 'Hass'
  },
  HA: {
    ...base,
    name: 'Main Harvest',
    yield_quantity: 1200,
    yield_unit: 'kg',
    harvest_quality_grade: 'grade_a',
    harvest_method: 'hand_picking',
    brix_level: 12,
    method: 'Hand picking crews',
    variety: 'Hass'
  },
  IR: {
    ...base,
    name: 'Drip Irrigation',
    water_source: 'well_groundwater',
    irrigation_method: 'drip',
    irrigation_depth: 2,
    irrigation_depth_unit: 'inches',
    pump_depth_ft: 150,
    electricity_source: 'solar'
  },
  PR: { ...base, name: 'Winter Pruning', method: 'Hand pruning shears' },
  TR: { ...base, name: 'Seedling Transplant', method: 'Manual transplanting' },
  EM: {
    ...base,
    name: 'Tractor Service',
    equipment_type: 'tractor',
    equipment_operation_type: 'MN',
    fuel_consumed: 5,
    fuel_unit: 'gal',
    fuel_type: 'diesel'
  },
  CU: { ...base, name: 'Row Cultivation', method: 'Mechanical cultivation' },
  TH: { ...base, name: 'Fruit Thinning', method: 'Hand thinning' },
  PO: { ...base, name: 'Bee Pollination' },
  PH: {
    ...base,
    name: 'Washing and Packing',
    processing_type: 'washing',
    processing_duration_hours: 4,
    yield_quantity: 1100,
    yield_unit: 'kg'
  },
  CM: { ...base, name: 'Canopy Hedging', method: 'Mechanical hedging' }
};

const SUBTYPE_CODES = Object.keys(SAMPLE_EVENTS) as ProductionSubtype[];

// ============================================================================
// consumer_card: every subtype resolves a non-empty field set
// ============================================================================

describe('Production: consumer_card field sets per subtype', () => {
  for (const code of SUBTYPE_CODES) {
    it(`returns a non-empty consumer_card field set for ${code}`, () => {
      const result = getFieldsForSurface('production', code, 'consumer_card', SAMPLE_EVENTS[code]);
      expect(allFields(result).length).toBeGreaterThan(0);
    });
  }
});

// ============================================================================
// i18n: every labelKey referenced on consumer_card resolves in en-US
// ============================================================================

describe('Production: labelKeys resolve in en-US.json', () => {
  it('resolves every consumer_card field labelKey across all subtypes', () => {
    for (const code of SUBTYPE_CODES) {
      const result = getFieldsForSurface('production', code, 'consumer_card', SAMPLE_EVENTS[code]);
      for (const field of allFields(result)) {
        expect(
          enUS[field.labelKey],
          `missing en-US key: ${field.labelKey} (subtype ${code})`
        ).toBeTypeOf('string');
        expect(enUS[field.labelKey].length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves every Production subtype labelKey', () => {
    const subtypes = getSubtypes('production');
    // A floor, not the exact count: the count itself is asserted against
    // history/models.py PRODUCTION_EVENTS in productionSubtypeCoverage.test.ts, so it lives
    // in one place and a new backend subtype fails THAT guard with a useful message instead
    // of this one with "expected 16 to be 13".
    expect(subtypes.length).toBeGreaterThan(10);
    for (const subtype of subtypes) {
      expect(enUS[subtype.labelKey], `missing en-US key: ${subtype.labelKey}`).toBeTypeOf('string');
    }
  });
});

// ============================================================================
// Subtype gating sanity checks
// ============================================================================

describe('Production: subtype gating on consumer_card', () => {
  it('shows irrigation fields only for IR', () => {
    const irNames = allFields(
      getFieldsForSurface('production', 'IR', 'consumer_card', SAMPLE_EVENTS.IR)
    ).map((f) => f.name);
    const haNames = allFields(
      getFieldsForSurface('production', 'HA', 'consumer_card', {
        ...SAMPLE_EVENTS.HA,
        water_source: 'well_groundwater',
        irrigation_method: 'drip'
      })
    ).map((f) => f.name);

    expect(irNames).toContain('water_source');
    expect(irNames).toContain('irrigation_method');
    expect(haNames).not.toContain('water_source');
    expect(haNames).not.toContain('irrigation_method');
  });

  it('shows EM cleaning fields only for cleaning operations', () => {
    const cleaningEvent = {
      ...SAMPLE_EVENTS.EM,
      equipment_operation_type: 'CL',
      cleaning_date: '2026-05-01',
      cleaning_method: 'Pressure wash',
      cleaning_materials_used: 'Hot water',
      cleaned_by: 'Miguel Ramirez'
    };
    const cleaningNames = allFields(
      getFieldsForSurface('production', 'EM', 'consumer_card', cleaningEvent)
    ).map((f) => f.name);
    const maintenanceNames = allFields(
      getFieldsForSurface('production', 'EM', 'consumer_card', {
        ...cleaningEvent,
        equipment_operation_type: 'MN'
      })
    ).map((f) => f.name);

    // Cleaning EVIDENCE is legitimate consumer transparency and stays subtype-gated.
    expect(cleaningNames).toContain('cleaning_method');
    expect(maintenanceNames).not.toContain('cleaning_method');

    // But the PERSON who did it never reaches a consumer. `cleaned_by` is free text
    // holding real worker names ("Miguel Ramirez (Farm Manager)" in live data) and it
    // rendered on the public product page until 2026-07-31. This assertion was inverted
    // then: `performed_by` is masked to initials and `applicator_name` is stripped for
    // exactly this reason, so surfacing `cleaned_by` was an inconsistency, not a policy.
    // It remains on modal/form (producer) and in the certifier PDF.
    expect(cleaningNames).not.toContain('cleaned_by');
    expect(maintenanceNames).not.toContain('cleaned_by');

    // Same pass: an internal SOP id and a raw CFR citation are operator vocabulary.
    expect(cleaningNames).not.toContain('cleaning_protocol_reference');
    expect(cleaningNames).not.toContain('sanitizer_nop_reference');
  });

  it('keeps carbon fields out of consumer_card hero/immediate tiers', () => {
    const result = getFieldsForSurface('production', 'EM', 'consumer_card', SAMPLE_EVENTS.EM);
    const heroImmediate = [...result.hero, ...result.immediate];
    expect(heroImmediate.filter((f) => f.isCarbonRelevant)).toHaveLength(0);
  });
});
