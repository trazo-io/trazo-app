/**
 * Soil Management Event Registry Tests — consumer_card coverage.
 *
 * Validates that every Soil Management subtype resolves a non-empty
 * consumer_card field set and that every labelKey referenced by those fields
 * (and by the subtype entries) resolves to an en-US i18n message. Mirrors
 * chemicalEvent.test.ts style.
 */

import { describe, expect, it } from 'vitest';

// Import triggers registry initialization
import { getFieldsForSurface, getSubtypes } from '../index';
import type { ResolvedFieldSet, SoilManagementSubtype } from '../index';

import enUSJson from '../../../i18n/lang/en-US.json';

const enUS = enUSJson as Record<string, string>;

const allFields = (result: ResolvedFieldSet) => [
  ...result.hero,
  ...result.immediate,
  ...result.secondary,
  ...result.details
];

// ============================================================================
// Test data: representative Soil Management events per subtype
// ============================================================================

const base = {
  event_type: 5,
  area_covered: 8,
  area_unit: 'acres',
  observation: 'Soil program activity'
};

const SAMPLE_EVENTS: Record<SoilManagementSubtype, Record<string, unknown>> = {
  ST: {
    ...base,
    name: 'Annual Soil Test',
    soil_management_type: 'ST',
    soil_ph: 6.8,
    organic_matter_percentage: 3.2,
    soil_texture: 'loam',
    block_id: 'B-12'
  },
  PA: {
    ...base,
    name: 'Lime Application',
    soil_management_type: 'PA',
    amendment_type: 'limestone',
    amendment_amount_numeric: 500,
    amendment_amount_unit: 'lbs',
    amendment_organic_approved: 'omri_listed'
  },
  OM: {
    ...base,
    name: 'Compost Spread',
    soil_management_type: 'OM',
    amendment_type: 'manure',
    amendment_amount_numeric: 2,
    amendment_amount_unit: 'tons',
    manure_harvest_interval: '120',
    manure_application_date: '2026-03-01'
  },
  CC: {
    ...base,
    name: 'Cover Crop Seeding',
    soil_management_type: 'CC',
    amendment_type: 'compost'
  },
  TI: {
    ...base,
    name: 'Shallow Tillage',
    soil_management_type: 'TI',
    working_depth: 4,
    depth_unit: 'inches',
    // The four TI practice facts persist in extra_data (SoilManagementEvent has no columns
    // for them), which is where the resolver has to find them.
    extra_data: {
      tillage_type: 'minimum_till',
      tillage_intensity: 'medium',
      tillage_direction: 'across_slope',
      residue_management: 'incorporated'
    }
  },
  CO: {
    ...base,
    name: 'Compost Windrow',
    soil_management_type: 'CO',
    compost_method: 'windrow',
    compost_peak_temp_f: 155,
    compost_duration_days_at_temp: 21,
    compost_turning_count: 7,
    compost_initial_cn_ratio: 30
  },
  GR: {
    ...base,
    name: 'Sheep Grazing',
    soil_management_type: 'GR',
    animal_type: 'sheep',
    animal_count: 50,
    grazing_duration_days: 14,
    grazing_purpose: 'weed_control'
  }
};

const SUBTYPE_CODES = Object.keys(SAMPLE_EVENTS) as SoilManagementSubtype[];

// ============================================================================
// consumer_card: every subtype resolves a non-empty field set
// ============================================================================

describe('Soil Management: consumer_card field sets per subtype', () => {
  for (const code of SUBTYPE_CODES) {
    it(`returns a non-empty consumer_card field set for ${code}`, () => {
      const result = getFieldsForSurface(
        'soil_management',
        code,
        'consumer_card',
        SAMPLE_EVENTS[code]
      );
      expect(allFields(result).length).toBeGreaterThan(0);
    });
  }
});

// ============================================================================
// i18n: every labelKey referenced on consumer_card resolves in en-US
// ============================================================================

describe('Soil Management: labelKeys resolve in en-US.json', () => {
  it('resolves every consumer_card field labelKey across all subtypes', () => {
    for (const code of SUBTYPE_CODES) {
      const result = getFieldsForSurface(
        'soil_management',
        code,
        'consumer_card',
        SAMPLE_EVENTS[code]
      );
      for (const field of allFields(result)) {
        expect(
          enUS[field.labelKey],
          `missing en-US key: ${field.labelKey} (subtype ${code})`
        ).toBeTypeOf('string');
        expect(enUS[field.labelKey].length).toBeGreaterThan(0);
      }
    }
  });

  it('resolves every Soil Management subtype labelKey', () => {
    const subtypes = getSubtypes('soil_management');
    // The explicit set rather than a count: it says WHICH subtypes exist, so adding one is a
    // conscious edit here and a missing one fails loudly. This now matches
    // history/models.py SOIL_TYPE_CHOICES exactly — D4 closed the HD/NS gap.
    expect(subtypes.map((s) => s.code).sort()).toEqual([
      'CC',
      'CO',
      'GR',
      'HD',
      'LA',
      'NS',
      'OM',
      'PA',
      'ST',
      'TI'
    ]);
    for (const subtype of subtypes) {
      expect(enUS[subtype.labelKey], `missing en-US key: ${subtype.labelKey}`).toBeTypeOf('string');
    }
  });
});

// ============================================================================
// Subtype gating sanity checks
// ============================================================================

describe('Soil Management: subtype gating on consumer_card', () => {
  it('shows grazing fields only for GR', () => {
    const grNames = allFields(
      getFieldsForSurface('soil_management', 'GR', 'consumer_card', SAMPLE_EVENTS.GR)
    ).map((f) => f.name);
    const stNames = allFields(
      getFieldsForSurface('soil_management', 'ST', 'consumer_card', {
        ...SAMPLE_EVENTS.ST,
        animal_type: 'sheep',
        animal_count: 50
      })
    ).map((f) => f.name);

    expect(grNames).toContain('animal_type');
    expect(grNames).toContain('animal_count');
    expect(stNames).not.toContain('animal_type');
    expect(stNames).not.toContain('animal_count');
  });

  it('shows NOP compost fields only for CO', () => {
    const coNames = allFields(
      getFieldsForSurface('soil_management', 'CO', 'consumer_card', SAMPLE_EVENTS.CO)
    ).map((f) => f.name);
    const tiNames = allFields(
      getFieldsForSurface('soil_management', 'TI', 'consumer_card', {
        ...SAMPLE_EVENTS.TI,
        compost_peak_temp_f: 155,
        compost_method: 'windrow'
      })
    ).map((f) => f.name);

    expect(coNames).toContain('compost_peak_temp_f');
    expect(coNames).toContain('compost_method');
    expect(tiNames).not.toContain('compost_peak_temp_f');
    expect(tiNames).not.toContain('compost_method');
  });

  it('shows NOP manure harvest interval for OM (7 CFR 205.203(c)(1))', () => {
    const result = getFieldsForSurface('soil_management', 'OM', 'consumer_card', SAMPLE_EVENTS.OM);
    const names = allFields(result).map((f) => f.name);
    expect(names).toContain('manure_harvest_interval');
  });
});

// ============================================================================
// Tillage (TI) practice fields — 2026-09-06
// ============================================================================

/**
 * All four were collected by SoilManagementTab, written to extra_data by NewEvent, printed in
 * the certifier packet and read by the carbon calculator — and declared in no registry, so
 * the producer detail modal and the buyer card both rendered a tillage pass as a date, a
 * label and an acreage. Found live in production.
 *
 * The consumer split is a publishing decision, not a layout one, which is why it is pinned
 * here and not left to whichever surface happens to be looked at:
 *   PUBLIC   tillage_type, residue_management — named, checkable practice facts
 *   WITHHELD tillage_intensity (grower-assigned rating of their own disturbance),
 *            tillage_direction (meaningless without slope the page does not publish)
 */
describe('Soil Management: tillage practice fields (TI)', () => {
  const modalNames = () =>
    allFields(getFieldsForSurface('soil_management', 'TI', 'modal', SAMPLE_EVENTS.TI)).map(
      (f) => f.name
    );
  const consumerFields = () =>
    allFields(getFieldsForSurface('soil_management', 'TI', 'consumer_card', SAMPLE_EVENTS.TI));

  it('puts all four practice facts on the producer modal', () => {
    const names = modalNames();
    for (const name of [
      'tillage_type',
      'tillage_intensity',
      'tillage_direction',
      'residue_management'
    ]) {
      expect(names, `${name} missing from the tillage detail modal`).toContain(name);
    }
  });

  it('reads the values out of extra_data and labels them without the benefit half', () => {
    const byName = Object.fromEntries(
      allFields(getFieldsForSurface('soil_management', 'TI', 'modal', SAMPLE_EVENTS.TI)).map(
        (f) => [f.name, f.formattedValue]
      )
    );
    // The form's <option> text is "Minimum Till - Conservation" / "Incorporated - Mixed into
    // soil". The trailing benefit clause is a self-assigned environmental verdict and is
    // stripped here exactly as audit_export_service.TILLAGE_PRACTICE_LABELS strips it.
    expect(byName.tillage_type).toBe('Minimum till');
    expect(byName.residue_management).toBe('Incorporated into soil');
    expect(byName.tillage_intensity).toBe('Medium');
    expect(byName.tillage_direction).toBe('Across slope');
  });

  it("publishes the practice facts to shoppers in the shopper's words", () => {
    const byName = Object.fromEntries(consumerFields().map((f) => [f.name, f.formattedValue]));
    expect(byName.tillage_type).toBe('Minimum till');
    expect(byName.residue_management).toBe('Mixed back into the soil');
  });

  it('withholds the self-assigned rating and the direction from the buyer page', () => {
    const names = consumerFields().map((f) => f.name);
    expect(
      names,
      'tillage_intensity is a grower-assigned rating (high/medium/low/CONSERVATION) of their ' +
        'own soil disturbance — the production_efficiency shape this registry withholds'
    ).not.toContain('tillage_intensity');
    expect(
      names,
      'tillage_direction is unreadable without the slope the buyer page does not publish'
    ).not.toContain('tillage_direction');
  });

  it('shows tillage fields only for TI', () => {
    const stNames = allFields(
      getFieldsForSurface('soil_management', 'ST', 'modal', {
        ...SAMPLE_EVENTS.ST,
        extra_data: { tillage_type: 'no_till', residue_management: 'removed' }
      })
    ).map((f) => f.name);
    expect(stNames).not.toContain('tillage_type');
    expect(stNames).not.toContain('residue_management');
  });
});
