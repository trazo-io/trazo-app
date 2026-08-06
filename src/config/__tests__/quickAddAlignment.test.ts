/**
 * Phase 5 / D12 — Quick-Add must write what the manual form writes.
 *
 * Quick-Add is the path a farmer uses in the field, on a phone, in a hurry. When it diverges
 * from the manual form the same operation is recorded two different ways, and only one of them
 * reaches the certifier packet.
 *
 * Two divergences fixed here:
 *
 *   `eventType: 'MN'` — an EquipmentEvent code. EquipmentEvent is deprecated; equipment work is
 *   a ProductionEvent 'EM' subtype, and every seeded template says so
 *   (backend_event_type=1, type='EM'). 'MN' is not among ProductionEvent's choices, so the
 *   subtype this config declared could not be stored by the model its own template creates.
 *
 *   `brix_levels` — a legacy free-text extra_data key. `brix_level` is the real DecimalField
 *   with a 0–45 validator and explicit serializer validation, so Quick-Add was storing an
 *   unvalidated string somewhere other than where the manual form puts a validated number.
 */

import { describe, expect, it } from 'vitest';

import { equipmentMaintenanceFields, harvestFields } from '../quickEventFields';

// history/models.py ProductionEvent subtype codes.
const PRODUCTION_SUBTYPES = ['PL', 'HA', 'IR', 'PR', 'TR', 'EM', 'CU', 'TH', 'PO', 'PH', 'CM', 'FP', 'MO'];

describe('D12 — Quick-Add equipment maintenance targets a storable subtype', () => {
  it('declares EM, not the deprecated EquipmentEvent code', () => {
    expect(equipmentMaintenanceFields.eventType).toBe('EM');
  });

  it('declares a subtype ProductionEvent can actually store', () => {
    expect(PRODUCTION_SUBTYPES).toContain(equipmentMaintenanceFields.eventType);
  });
});

describe('D12 — Quick-Add harvest records Brix in the validated column', () => {
  const brixField = harvestFields.quickFields.find((f) => f.name?.startsWith('brix'));

  it('uses the real column name', () => {
    expect(brixField?.name).toBe('brix_level');
  });

  it('collects it as a number so the 0-45 validator can apply', () => {
    // As free text the backend validator never saw a comparable value.
    expect(brixField?.type).toBe('number');
  });
});
