import { describe, expect, it } from 'vitest';

import {
  buildMultiTargetBody,
  derivedAmount,
  newTarget,
  PER_TARGET_KEYS,
  targetAmount,
  targetArea,
  targetIssues,
  type ParcelTarget
} from '../multiParcel';

const galPerAcre = { rate: '2', rateUnit: 'gal_ac', volumeUnit: 'gal', areaUnit: 'acres' };

const block = (overrides: Partial<ParcelTarget> = {}): ParcelTarget => ({
  // 5.0181 ha = 12.4 ac
  ...newTarget({ id: 11, name: 'Block A', area: 5.0181 }),
  ...overrides
});

describe('multiParcel: area and amount per block', () => {
  it('starts with no scope, so nothing is claimed until the grower answers', () => {
    const target = newTarget({ id: 1, name: 'A', area: 2 });
    expect(target.scope).toBeNull();
    expect(targetArea(target, 'acres')).toBeNull();
    expect(targetIssues(target, galPerAcre)).toEqual(['scope']);
  });

  it('whole block: the stored hectares, in the form unit', () => {
    expect(targetArea(block({ scope: 'all' }), 'acres')).toBe(12.4);
    expect(targetArea(block({ scope: 'all' }), 'ha')).toBe(5.02);
  });

  it('part of a block: the area the grower typed', () => {
    expect(targetArea(block({ scope: 'part', partArea: '3.5' }), 'acres')).toBe(3.5);
    expect(targetArea(block({ scope: 'part', partArea: '' }), 'acres')).toBeNull();
    expect(targetIssues(block({ scope: 'part', partArea: '' }), galPerAcre)).toEqual([
      'area',
      'amount'
    ]);
  });

  it('derives rate × area when the units line up, converting the area basis', () => {
    expect(derivedAmount(block({ scope: 'all' }), galPerAcre)).toBe(24.8);
    // 2 L/ha over a block entered in acres: 12.4 ac = 5.018 ha → 10.036 L
    expect(
      derivedAmount(block({ scope: 'all' }), {
        rate: '2',
        rateUnit: 'L_ha',
        volumeUnit: 'L',
        areaUnit: 'acres'
      })
    ).toBeCloseTo(10.036, 2);
  });

  it('derives nothing when the rate and the product unit disagree', () => {
    // qt/ac has no matching product unit in the form; gal/ac with a product unit of fl oz needs
    // a conversion the grower never saw. Both leave the amount to the grower.
    expect(derivedAmount(block({ scope: 'all' }), { ...galPerAcre, rateUnit: 'qt_ac' })).toBeNull();
    expect(
      derivedAmount(block({ scope: 'all' }), { ...galPerAcre, volumeUnit: 'fl_oz' })
    ).toBeNull();
    expect(derivedAmount(block({ scope: 'all' }), { ...galPerAcre, rate: '' })).toBeNull();
    expect(targetIssues(block({ scope: 'all' }), { ...galPerAcre, rate: '' })).toEqual(['amount']);
  });

  it('what the grower typed wins over the derived amount', () => {
    expect(targetAmount(block({ scope: 'all', amountTyped: '20' }), galPerAcre)).toBe(20);
    expect(targetAmount(block({ scope: 'all', amountTyped: '0' }), galPerAcre)).toBeNull();
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
    is_summary: 'false',
    extra_data: { volume_applied_total: '300', active_ingredient: 'copper' }
  };

  const targets = [
    block({ scope: 'all' }),
    {
      ...newTarget({ id: 12, name: 'Block B', area: 2.4281 }),
      scope: 'part' as const,
      partArea: '3.5',
      partDetail: 'rows 1-9'
    }
  ];

  const body = buildMultiTargetBody(single, targets, galPerAcre, 'group-1');

  it('sends no per-parcel, refused or single-record key in the shared body', () => {
    [
      ...PER_TARGET_KEYS,
      'parcels',
      'history',
      'plan_item_id',
      'tank_mix_partners',
      'application_fuel_consumed',
      'is_summary'
    ].forEach((key) => expect(body).not.toHaveProperty(key));
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

  it('carries each block its own amount, area and scope', () => {
    expect(body.targets).toEqual([
      { parcel: 11, volume_applied: '24.8', area_treated: '12.4', applied_scope: 'all' },
      {
        parcel: 12,
        volume_applied: '7',
        area_treated: '3.5',
        applied_scope: 'part',
        applied_scope_detail: 'rows 1-9'
      }
    ]);
  });
});
