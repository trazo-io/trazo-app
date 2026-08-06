/**
 * Unit tests for the Event Field Registry resolver.
 *
 * These tests use fixture registry entries (not the real chemical/weather/etc.
 * entries) to verify resolver behavior in isolation from event-type-specific
 * data. Phase 3 adds parity tests for the real Chemical registry.
 */

import { describe, expect, it, beforeAll } from 'vitest';

import type { EventRegistry, FieldConfig } from '../registry';
import { _setRegistry } from '../resolver';
import {
  getFieldNamesForSurface,
  getFieldsForSurface,
  getPhotoTier,
  isFieldOnSurface,
  isFieldVisible
} from '../resolver';

// ============================================================================
// Test fixtures
// ============================================================================

const baseField: FieldConfig = {
  name: 'always_visible',
  labelKey: 'test.alwaysVisible',
  valueType: 'string',
  surfaces: { modal: 'immediate', consumer_card: 'immediate' }
};

const subtypeGatedField: FieldConfig = {
  name: 'npk_ratio',
  labelKey: 'test.npk',
  valueType: 'string',
  visibleForSubtypes: ['FE'] as const,
  surfaces: { modal: 'immediate', form: 'immediate' }
};

const multiSubtypeGatedField: FieldConfig = {
  name: 'target_pest',
  labelKey: 'test.targetPest',
  valueType: 'string',
  visibleForSubtypes: ['PE', 'FU', 'HE'] as const,
  surfaces: { modal: 'hero', form: 'hero' }
};

const predicateGatedField: FieldConfig = {
  name: 'applicator_cert',
  labelKey: 'test.applicatorCert',
  valueType: 'string',
  visibleForSubtypes: ['PE', 'FU', 'HE'] as const,
  visibleWhen: (event) => Boolean(event.restricted_use_pesticide),
  surfaces: { modal: 'secondary', form: 'secondary' }
};

const dependencyField: FieldConfig = {
  name: 'phi_days',
  labelKey: 'test.phi',
  valueType: 'number',
  dependsOn: { field: 'restricted_use_pesticide', equals: true },
  surfaces: { modal: 'secondary' }
};

const carbonField: FieldConfig = {
  name: 'carbon_impact',
  labelKey: 'test.carbon',
  valueType: 'number',
  carbonRelevant: true,
  surfaces: { modal: 'immediate', consumer_card: 'details' } // 'details' on consumer = FTC-compliant
};

const groupedField: FieldConfig = {
  name: 'nitrogen_percentage',
  labelKey: 'test.npk',
  valueType: 'number',
  groupWith: ['phosphorus_percentage', 'potassium_percentage'] as const,
  surfaces: { modal: 'immediate' },
  formatter: (_v, e) =>
    `${e.nitrogen_percentage}-${e.phosphorus_percentage}-${e.potassium_percentage}`
};

const phosphorusField: FieldConfig = {
  name: 'phosphorus_percentage',
  labelKey: 'test.phosphorus',
  valueType: 'number',
  surfaces: { modal: 'immediate' }
};

const potassiumField: FieldConfig = {
  name: 'potassium_percentage',
  labelKey: 'test.potassium',
  valueType: 'number',
  surfaces: { modal: 'immediate' }
};

const testRegistry: EventRegistry = {
  weather: {
    eventType: 0,
    eventTypeName: 'weather',
    labelKey: 'events.types.weather',
    subtypes: [],
    defaultPhotoTier: 'optional',
    fields: []
  },
  production: {
    eventType: 1,
    eventTypeName: 'production',
    labelKey: 'events.types.production',
    subtypes: [],
    defaultPhotoTier: 'recommended',
    fields: []
  },
  chemical: {
    eventType: 2,
    eventTypeName: 'chemical',
    labelKey: 'events.types.chemical',
    subtypes: [
      { code: 'FE', labelKey: 'events.subtypes.fertilizer', photoTier: 'essential' },
      { code: 'PE', labelKey: 'events.subtypes.pesticide', photoTier: 'essential' },
      { code: 'FU', labelKey: 'events.subtypes.fungicide', photoTier: 'essential' },
      { code: 'HE', labelKey: 'events.subtypes.herbicide', photoTier: 'essential' }
    ],
    defaultPhotoTier: 'essential',
    fields: [
      baseField,
      subtypeGatedField,
      multiSubtypeGatedField,
      predicateGatedField,
      dependencyField,
      carbonField,
      groupedField,
      phosphorusField,
      potassiumField
    ]
  },
  general: {
    eventType: 3,
    eventTypeName: 'general',
    labelKey: 'events.types.general',
    subtypes: [],
    defaultPhotoTier: 'optional',
    fields: []
  },
  equipment: {
    eventType: 4,
    eventTypeName: 'equipment',
    labelKey: 'events.types.equipment',
    subtypes: [],
    defaultPhotoTier: 'optional',
    fields: []
  },
  soil_management: {
    eventType: 5,
    eventTypeName: 'soil_management',
    labelKey: 'events.types.soilManagement',
    subtypes: [],
    defaultPhotoTier: 'recommended',
    fields: []
  },
  pest_management: {
    eventType: 6,
    eventTypeName: 'pest_management',
    labelKey: 'events.types.pestManagement',
    subtypes: [],
    defaultPhotoTier: 'recommended',
    fields: []
  },
  business: {
    eventType: 7,
    eventTypeName: 'business',
    labelKey: 'events.types.business',
    subtypes: [],
    defaultPhotoTier: 'optional',
    fields: []
  }
};

beforeAll(() => {
  _setRegistry(testRegistry);
});

// ============================================================================
// Subtype gate tests
// ============================================================================

describe('Subtype-conditional visibility', () => {
  it('shows single-subtype field only for matching subtype', () => {
    expect(isFieldVisible(subtypeGatedField, 'FE', {})).toBe(true);
    expect(isFieldVisible(subtypeGatedField, 'PE', {})).toBe(false);
    expect(isFieldVisible(subtypeGatedField, 'HE', {})).toBe(false);
  });

  it('shows multi-subtype field for any listed subtype', () => {
    expect(isFieldVisible(multiSubtypeGatedField, 'PE', {})).toBe(true);
    expect(isFieldVisible(multiSubtypeGatedField, 'FU', {})).toBe(true);
    expect(isFieldVisible(multiSubtypeGatedField, 'HE', {})).toBe(true);
    expect(isFieldVisible(multiSubtypeGatedField, 'FE', {})).toBe(false);
  });

  it('hides subtype-gated field when subtype is null', () => {
    expect(isFieldVisible(subtypeGatedField, null, {})).toBe(false);
  });

  it('shows field with no subtype gate for any subtype', () => {
    expect(isFieldVisible(baseField, 'FE', {})).toBe(true);
    expect(isFieldVisible(baseField, null, {})).toBe(true);
  });
});

// ============================================================================
// Predicate visibility tests
// ============================================================================

describe('Predicate-based visibility', () => {
  it('shows field when predicate returns true', () => {
    expect(isFieldVisible(predicateGatedField, 'PE', { restricted_use_pesticide: true })).toBe(
      true
    );
  });

  it('hides field when predicate returns false', () => {
    expect(isFieldVisible(predicateGatedField, 'PE', { restricted_use_pesticide: false })).toBe(
      false
    );
    expect(isFieldVisible(predicateGatedField, 'PE', {})).toBe(false);
  });

  it('applies subtype AND predicate gates together', () => {
    // PE subtype + predicate true = visible
    expect(isFieldVisible(predicateGatedField, 'PE', { restricted_use_pesticide: true })).toBe(
      true
    );
    // FE subtype + predicate true = hidden (subtype not in list)
    expect(isFieldVisible(predicateGatedField, 'FE', { restricted_use_pesticide: true })).toBe(
      false
    );
  });

  it('hides field when predicate throws', () => {
    const throwingField: FieldConfig = {
      ...baseField,
      visibleWhen: () => {
        throw new Error('boom');
      }
    };
    expect(isFieldVisible(throwingField, 'FE', {})).toBe(false);
  });
});

// ============================================================================
// Dependency gate tests
// ============================================================================

describe('Dependency-based visibility', () => {
  it('shows field when dependency equals expected value', () => {
    expect(isFieldVisible(dependencyField, null, { restricted_use_pesticide: true })).toBe(true);
  });

  it('hides field when dependency does not match', () => {
    expect(isFieldVisible(dependencyField, null, { restricted_use_pesticide: false })).toBe(false);
    expect(isFieldVisible(dependencyField, null, {})).toBe(false);
  });
});

// ============================================================================
// Surface membership tests
// ============================================================================

describe('Surface membership', () => {
  it('returns true when field declared on surface and visible', () => {
    expect(isFieldOnSurface(baseField, 'modal', 'FE', {})).toBe(true);
    expect(isFieldOnSurface(baseField, 'consumer_card', 'FE', {})).toBe(true);
  });

  it('returns false when field not declared on surface', () => {
    expect(isFieldOnSurface(baseField, 'timeline', 'FE', {})).toBe(false);
    expect(isFieldOnSurface(subtypeGatedField, 'consumer_card', 'FE', {})).toBe(false);
  });

  it('combines subtype gate with surface membership', () => {
    // Declared on modal + matching subtype
    expect(isFieldOnSurface(subtypeGatedField, 'modal', 'FE', {})).toBe(true);
    // Declared on modal but wrong subtype
    expect(isFieldOnSurface(subtypeGatedField, 'modal', 'PE', {})).toBe(false);
  });
});

// ============================================================================
// getFieldsForSurface integration tests
// ============================================================================

describe('getFieldsForSurface', () => {
  it('returns tier-grouped fields for a subtype', () => {
    const event = { always_visible: 'hi', target_pest: 'aphids' };
    const result = getFieldsForSurface('chemical', 'PE', 'modal', event);

    // base field (immediate) + target_pest (hero) should render for PE
    expect(result.hero.length).toBeGreaterThan(0);
    expect(result.immediate.some((f) => f.name === 'always_visible')).toBe(true);
    // npk_ratio is FE-only, should NOT appear for PE
    expect(result.immediate.some((f) => f.name === 'npk_ratio')).toBe(false);
  });

  it('includes FE-specific fields only for FE subtype', () => {
    const event = { npk_ratio: '10-10-10', always_visible: 'hi' };
    const forFE = getFieldsForSurface('chemical', 'FE', 'modal', event);
    const forPE = getFieldsForSurface('chemical', 'PE', 'modal', event);

    expect(forFE.immediate.some((f) => f.name === 'npk_ratio')).toBe(true);
    expect(forPE.immediate.some((f) => f.name === 'npk_ratio')).toBe(false);
  });

  it('skips fields with null formatted values', () => {
    const result = getFieldsForSurface('chemical', 'FE', 'modal', {
      // no always_visible value set
    });

    expect(result.immediate.some((f) => f.name === 'always_visible')).toBe(false);
  });

  it('groups rendered fields: nitrogen pulls phosphorus+potassium', () => {
    const event = {
      always_visible: 'hi',
      nitrogen_percentage: 10,
      phosphorus_percentage: 20,
      potassium_percentage: 30
    };
    const result = getFieldsForSurface('chemical', 'FE', 'modal', event);

    // nitrogen rendered with grouped formatter
    const nField = result.immediate.find((f) => f.name === 'nitrogen_percentage');
    expect(nField).toBeDefined();
    expect(nField?.formattedValue).toBe('10-20-30');

    // phosphorus and potassium should NOT appear separately (consumed by group)
    expect(result.immediate.some((f) => f.name === 'phosphorus_percentage')).toBe(false);
    expect(result.immediate.some((f) => f.name === 'potassium_percentage')).toBe(false);
  });

  it('returns empty buckets for unknown event type', () => {
    // Weather registry has no fields in fixtures
    const result = getFieldsForSurface('weather', 'FR', 'modal', { foo: 'bar' });
    expect(result.hero).toEqual([]);
    expect(result.immediate).toEqual([]);
    expect(result.secondary).toEqual([]);
    expect(result.details).toEqual([]);
  });
});

// ============================================================================
// getFieldNamesForSurface (form rendering)
// ============================================================================

describe('getFieldNamesForSurface', () => {
  it('returns only form-visible fields for a subtype', () => {
    const names = getFieldNamesForSurface('chemical', 'FE', 'form');
    expect(names).toContain('npk_ratio');
    expect(names).not.toContain('target_pest'); // PE/FU/HE only
  });

  it('handles subtypes with exclusion list', () => {
    const forFE = getFieldNamesForSurface('chemical', 'FE', 'form');
    const forPE = getFieldNamesForSurface('chemical', 'PE', 'form');

    expect(forFE).not.toContain('target_pest');
    expect(forPE).toContain('target_pest');
  });
});

// ============================================================================
// Photo tier tests
// ============================================================================

describe('getPhotoTier', () => {
  it('returns the subtype photo tier when subtype matches', () => {
    expect(getPhotoTier('chemical', 'FE')).toBe('essential');
  });

  it('returns default photo tier when subtype is null', () => {
    expect(getPhotoTier('chemical', null)).toBe('essential');
  });

  it('returns default photo tier for unknown subtype', () => {
    expect(getPhotoTier('chemical', 'XX' as any)).toBe('essential');
  });

  it('returns "optional" for unknown event type', () => {
    expect(getPhotoTier('general', null)).toBe('optional');
  });
});

// ============================================================================
// Event type code resolution
// ============================================================================

describe('Event type code resolution', () => {
  it('accepts numeric event type codes', () => {
    const byName = getFieldsForSurface('chemical', 'FE', 'modal', { always_visible: 'x' });
    const byCode = getFieldsForSurface(2, 'FE', 'modal', { always_visible: 'x' });
    expect(byName).toEqual(byCode);
  });
});
