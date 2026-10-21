import { describe, expect, it } from 'vitest';

import { specRulesFor, type MultiParcelRules } from '../../config/events/multiParcel';
import {
  buildMultiTargetBody,
  derivedValue,
  fieldValue,
  newTarget,
  targetArea,
  targetIssues,
  type ParcelTarget
} from '../multiParcel';

const chemical = specRulesFor(2, 'FU') as MultiParcelRules;
const irrigation = specRulesFor(1, 'IR') as MultiParcelRules;
const volume = chemical.fields.find((f) => f.key === 'volume_applied')!;

const galPerAcre = {
  application_rate: '2',
  application_rate_unit: 'gal_ac',
  volume_unit: 'gal',
  area_unit: 'acres'
};

const parcel = (overrides: Partial<ParcelTarget> = {}): ParcelTarget => ({
  // 5.0181 ha = 12.4 ac
  ...newTarget({ id: 11, name: 'North', area: 5.0181 }),
  ...overrides
});

describe('multiParcel: area per parcel', () => {
  it('starts with no scope, so nothing is claimed until the grower answers', () => {
    const target = newTarget({ id: 1, name: 'A', area: 2 });
    expect(target.scope).toBeNull();
    expect(targetArea(target, 'acres')).toBeNull();
    expect(targetIssues(target, chemical, galPerAcre)).toEqual(['scope']);
  });

  it('whole parcel: the stored hectares, in the form unit', () => {
    expect(targetArea(parcel({ scope: 'all' }), 'acres')).toBe(12.4);
    expect(targetArea(parcel({ scope: 'all' }), 'ha')).toBe(5.02);
  });

  it('part of a parcel: the area the grower typed', () => {
    expect(targetArea(parcel({ scope: 'part', partArea: '3.5' }), 'acres')).toBe(3.5);
    expect(targetIssues(parcel({ scope: 'part' }), chemical, galPerAcre)).toEqual([
      'area',
      'field:volume_applied'
    ]);
  });

  it('whole parcel with no size on record: the grower states the size, never a guess', () => {
    const unsized = { ...newTarget({ id: 9, name: 'New', area: 0 }), scope: 'all' as const };
    expect(targetArea(unsized, 'acres')).toBeNull();
    expect(targetArea({ ...unsized, partArea: '8' }, 'acres')).toBe(8);
    expect(derivedValue({ ...unsized, partArea: '8' }, volume, galPerAcre)).toBe(16);
  });
});

describe('multiParcel: derived values', () => {
  it('derives rate × area when the units line up, converting the area basis', () => {
    expect(derivedValue(parcel({ scope: 'all' }), volume, galPerAcre)).toBe(24.8);
    const litresPerHa = { ...galPerAcre, application_rate_unit: 'L_ha', volume_unit: 'L' };
    expect(derivedValue(parcel({ scope: 'all' }), volume, litresPerHa)).toBeCloseTo(10.036, 2);
  });

  it('derives nothing when the rate and the unit disagree, or there is no rate', () => {
    expect(
      derivedValue(parcel({ scope: 'all' }), volume, {
        ...galPerAcre,
        application_rate_unit: 'qt_ac'
      })
    ).toBeNull();
    expect(
      derivedValue(parcel({ scope: 'all' }), volume, { ...galPerAcre, volume_unit: 'fl_oz' })
    ).toBeNull();
    expect(
      targetIssues(parcel({ scope: 'all' }), chemical, { ...galPerAcre, application_rate: '' })
    ).toEqual(['field:volume_applied']);
  });

  it('what the grower typed wins over the derived value', () => {
    const typed = parcel({ scope: 'all', values: { volume_applied: '20' } });
    expect(fieldValue(typed, volume, galPerAcre)).toBe(20);
  });

  it('a field with no rate is only ever what the grower typed', () => {
    const depth = irrigation.fields.find((f) => f.key === 'irrigation_depth')!;
    expect(fieldValue(parcel({ scope: 'all' }), depth, {})).toBeNull();
    expect(
      fieldValue(parcel({ scope: 'all', values: { irrigation_depth: '1.5' } }), depth, {})
    ).toBe(1.5);
  });
});

describe('multiParcel: request body', () => {
  const single = {
    event_type: 2,
    date: '2026-10-10T09:00',
    commercial_name: 'Kocide 3000-O',
    application_rate: '2',
    application_rate_unit: 'gal_ac',
    volume_unit: 'gal',
    area_unit: 'acres',
    quantity_purchased: '48',
    // What the single-parcel form carries and must NOT reach the shared body.
    volume_numeric: '24.8',
    volume_applied: '24.8',
    area_numeric: '12.4',
    block_id: '4',
    applied_scope: 'all',
    parcels: [11],
    history: 301,
    plan_item_id: 9,
    tank_mix_partners: [{ commercial_name: 'x', volume: '2' }],
    application_fuel_consumed: '3',
    extra_data: {
      volume_applied_total: '300',
      active_ingredient: 'copper',
      application_fuel_consumed: '3'
    }
  };

  const targets = [
    parcel({ scope: 'all', section: 'Rows 1-12' }),
    {
      ...newTarget({ id: 12, name: 'South', area: 2.4281 }),
      scope: 'part' as const,
      partArea: '3.5',
      partDetail: 'rows 1-9',
      values: { application_fuel_consumed: '1.5' }
    }
  ];

  const body = buildMultiTargetBody(single, targets, chemical, single, 'group-1');

  it('sends no per-parcel, refused or single-record key in the shared body', () => {
    for (const key of [
      ...chemical.hiddenKeys,
      'parcels',
      'history',
      'plan_item_id',
      'tank_mix_partners'
    ]) {
      expect(body, key).not.toHaveProperty(key);
    }
    // extra_data loses them too: the chemical tab mirrors fuel there.
    expect(body.extra_data).toEqual({ active_ingredient: 'copper' });
  });

  it('keeps the shared application facts', () => {
    expect(body).toMatchObject({
      commercial_name: 'Kocide 3000-O',
      application_rate: '2',
      quantity_purchased: '48',
      application_group: 'group-1'
    });
  });

  it('carries each parcel its own area, scope, section and values', () => {
    expect(body.targets).toEqual([
      {
        parcel: 11,
        area_treated: '12.4',
        applied_scope: 'all',
        block_id: 'Rows 1-12',
        volume_applied: '24.8'
      },
      {
        parcel: 12,
        area_treated: '3.5',
        applied_scope: 'part',
        applied_scope_detail: 'rows 1-9',
        volume_applied: '7',
        application_fuel_consumed: '1.5'
      }
    ]);
  });

  it("keeps another subtype's per-parcel keys out of the shared body too", () => {
    expect(irrigation.hiddenKeys.has('applied_scope')).toBe(true);
    expect(irrigation.hiddenKeys.has('plants_established')).toBe(true);
    expect(irrigation.refusedExtraDataKeys.has('yield_quantity')).toBe(true);
  });

  it('irrigation sends area and depth per parcel, and no scope (IR has none)', () => {
    const irBody = buildMultiTargetBody(
      { event_type: 1, type: 'IR', area_covered: '9', irrigation_method: 'drip' },
      [parcel({ scope: 'all', values: { irrigation_depth: '1.5' } })],
      irrigation,
      { area_unit: 'acres' },
      'group-2'
    );
    expect(irBody).not.toHaveProperty('area_covered');
    expect(irBody).toMatchObject({ irrigation_method: 'drip' });
    expect(irBody.targets).toEqual([{ parcel: 11, area_covered: '12.4', irrigation_depth: '1.5' }]);
  });
});
