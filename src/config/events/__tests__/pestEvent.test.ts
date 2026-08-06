/**
 * Pest Management Event Registry Tests — consumer_card coverage.
 *
 * Validates that every Pest Management subtype resolves a non-empty
 * consumer_card field set and that every labelKey referenced by those fields
 * (and by the subtype entries) resolves to an en-US i18n message. Mirrors
 * chemicalEvent.test.ts style.
 */

import { describe, expect, it } from 'vitest';

// Import triggers registry initialization
import { getFieldsForSurface, getSubtypes } from '../index';
import type { PestManagementSubtype, ResolvedFieldSet } from '../index';

import enUSJson from '../../../i18n/lang/en-US.json';

const enUS = enUSJson as Record<string, string>;

const allFields = (result: ResolvedFieldSet) => [
  ...result.hero,
  ...result.immediate,
  ...result.secondary,
  ...result.details
];

// ============================================================================
// Test data: representative Pest Management events per subtype
// ============================================================================

const base = {
  event_type: 6,
  area_covered: 10,
  area_unit: 'acres',
  observation: 'IPM program activity'
};

const SAMPLE_EVENTS: Record<PestManagementSubtype, Record<string, unknown>> = {
  SC: {
    ...base,
    pest_species: 'Aphids',
    pest_pressure_level: 'low',
    damage_percentage: 3,
    action_threshold_met: false,
    threshold_rationale: 'Below UC IPM threshold of 5 trap catches/week',
    identified_by: 'farmer',
    identification_method: 'Visual inspection'
  },
  BR: {
    ...base,
    pest_species: 'Aphids',
    beneficial_species: 'Ladybugs (Hippodamia convergens)',
    release_quantity: '1500 adults'
  },
  TM: {
    ...base,
    pest_species: 'Codling moth',
    pest_pressure_level: 'moderate',
    trap_count: 12
  },
  PI: {
    ...base,
    pest_species: 'Spider mites',
    identified_by: 'lab',
    identification_method: 'Laboratory analysis of leaf samples'
  },
  TA: {
    ...base,
    pest_species: 'Thrips',
    action_threshold_met: true,
    threshold_rationale: '8 thrips per bloom exceeds UC Davis action threshold',
    ipm_strategy: 'Release beneficials before considering sprays'
  },
  IP: {
    ...base,
    pest_species: 'Aphids',
    ipm_strategy: 'Beneficial insects plus trap cropping',
    beneficial_insects_used: 'yes',
    chemical_free_period_days: 30
  }
};

const SUBTYPE_CODES = Object.keys(SAMPLE_EVENTS) as PestManagementSubtype[];

// ============================================================================
// consumer_card: every subtype resolves a non-empty field set
// ============================================================================

describe('Pest Management: consumer_card field sets per subtype', () => {
  for (const code of SUBTYPE_CODES) {
    it(`returns a non-empty consumer_card field set for ${code}`, () => {
      const result = getFieldsForSurface(
        'pest_management',
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

describe('Pest Management: labelKeys resolve in en-US.json', () => {
  it('resolves every consumer_card field labelKey across all subtypes', () => {
    for (const code of SUBTYPE_CODES) {
      const result = getFieldsForSurface(
        'pest_management',
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

  it('resolves every Pest Management subtype labelKey', () => {
    const subtypes = getSubtypes('pest_management');
    // The explicit set rather than a count: it says WHICH subtypes exist, so adding one is a
    // conscious edit here and a missing one fails loudly.
    expect(subtypes.map((s) => s.code).sort()).toEqual(['BR', 'CU', 'IP', 'PI', 'SC', 'TA', 'TM']);
    for (const subtype of subtypes) {
      expect(enUS[subtype.labelKey], `missing en-US key: ${subtype.labelKey}`).toBeTypeOf('string');
    }
  });
});

// ============================================================================
// Subtype gating sanity checks
// ============================================================================

describe('Pest Management: subtype gating on consumer_card', () => {
  it('shows beneficial release fields only for BR (hero placement)', () => {
    const brResult = getFieldsForSurface(
      'pest_management',
      'BR',
      'consumer_card',
      SAMPLE_EVENTS.BR
    );
    const brHeroNames = brResult.hero.map((f) => f.name);
    expect(brHeroNames).toContain('beneficial_species');

    const scNames = allFields(
      getFieldsForSurface('pest_management', 'SC', 'consumer_card', {
        ...SAMPLE_EVENTS.SC,
        beneficial_species: 'Ladybugs',
        release_quantity: '500 adults'
      })
    ).map((f) => f.name);
    expect(scNames).not.toContain('beneficial_species');
    expect(scNames).not.toContain('release_quantity');
  });

  it('shows trap_count only for TM', () => {
    const tmNames = allFields(
      getFieldsForSurface('pest_management', 'TM', 'consumer_card', SAMPLE_EVENTS.TM)
    ).map((f) => f.name);
    const scNames = allFields(
      getFieldsForSurface('pest_management', 'SC', 'consumer_card', {
        ...SAMPLE_EVENTS.SC,
        trap_count: 12
      })
    ).map((f) => f.name);

    expect(tmNames).toContain('trap_count');
    expect(scNames).not.toContain('trap_count');
  });

  it('suppresses action_threshold_met on BR/TM/PI (NOP noise reduction)', () => {
    for (const code of ['BR', 'TM', 'PI'] as const) {
      const names = allFields(
        getFieldsForSurface('pest_management', code, 'consumer_card', {
          ...SAMPLE_EVENTS[code],
          action_threshold_met: true
        })
      ).map((f) => f.name);
      expect(names, `action_threshold_met should be hidden for ${code}`).not.toContain(
        'action_threshold_met'
      );
    }
  });

  it('formats identified_by with NOP display labels (Bug Pattern #16)', () => {
    const result = getFieldsForSurface('pest_management', 'PI', 'consumer_card', SAMPLE_EVENTS.PI);
    const identifiedBy = allFields(result).find((f) => f.name === 'identified_by');
    expect(identifiedBy).toBeDefined();
    expect(identifiedBy?.formattedValue).toBe('Laboratory Analysis');
  });
});
