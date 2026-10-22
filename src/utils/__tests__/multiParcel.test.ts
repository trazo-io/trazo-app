import { describe, expect, it } from 'vitest';

import { specRulesFor, type MultiParcelRules } from '../../config/events/multiParcel';
import {
  buildMultiTargetBody,
  derivedValue,
  fieldValue,
  multiParcelMode,
  newTarget,
  restorableDraftParcels,
  voiceFieldsAskedPerParcel,
  planAlsoSeed,
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
    // A summary toggled on before parcels were picked: one record of many applications.
    is_summary: 'true',
    date_start: '2026-03-01',
    event_count: '6',
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
    expect(chemical.hiddenKeys.has('is_summary')).toBe(true);
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

describe('restorableDraftParcels: what a days-old draft may put back', () => {
  const parcels = [
    { id: 1, name: 'North', open_season_count: 1 },
    { id: 2, name: 'South', open_season_count: 0 },
    { id: 3, name: 'East', open_season_count: 2 },
    { id: 4, name: 'Uncounted', open_season_count: null }
  ];

  it('keeps parcels that can still join, names the ones whose season changed, forgets the rest', () => {
    // 99 left the farm since the draft; 2 and 3 would come back ticked AND locked.
    expect(restorableDraftParcels([1, 2, 3, 4, 99], parcels)).toEqual({
      ids: [1, 4],
      droppedNames: ['South', 'East']
    });
  });
});

describe('planAlsoSeed: the parcels the Activities page passed', () => {
  const parcels = [
    { id: 1, name: 'North', open_season_count: 1 },
    { id: 2, name: 'South', open_season_count: 1 },
    { id: 3, name: 'Fallow', open_season_count: 0 },
    { id: 4, name: 'Two seasons', open_season_count: 2 },
    { id: 5, name: 'Uncounted', open_season_count: null }
  ];
  const base = {
    routeId: 1,
    parcels,
    eligible: true,
    singleActivity: false,
    routeCannotShare: false
  };

  it('seeds the parcels that can share the record, and names the ones that cannot', () => {
    expect(planAlsoSeed({ ...base, also: '2,3,4,5' })).toEqual({
      kind: 'done',
      ids: [2, 5],
      notice: {
        id: 'events.multiParcel.alsoDropped',
        values: { names: 'Fallow, Two seasons' }
      }
    });
  });

  it("ignores ids off this farm, the form's own parcel, duplicates and junk", () => {
    expect(planAlsoSeed({ ...base, also: '1,2,2,99,abc,' })).toEqual({ kind: 'done', ids: [2] });
  });

  it('waits while the activity may still go either way (a subtype not yet chosen)', () => {
    expect(planAlsoSeed({ ...base, eligible: false, also: '2' })).toEqual({ kind: 'wait' });
  });

  it('an activity logged one parcel at a time says so and seeds nothing', () => {
    expect(planAlsoSeed({ ...base, eligible: false, singleActivity: true, also: '2,3' })).toEqual({
      kind: 'done',
      ids: [],
      notice: { id: 'events.multiParcel.alsoSingleOnly', values: { name: 'North' } }
    });
  });

  it('a form parcel with no open production is named as the blocker, not the others', () => {
    // North and South each have one open production: the notice must not blame them.
    expect(
      planAlsoSeed({ ...base, routeId: 3, eligible: false, routeCannotShare: true, also: '1,2' })
    ).toEqual({
      kind: 'done',
      ids: [],
      notice: {
        id: 'events.multiParcel.alsoRouteNoSeason',
        values: { name: 'Fallow', names: 'North, South' }
      }
    });
  });

  it('nothing passed, nothing to do', () => {
    expect(planAlsoSeed({ ...base, also: null })).toEqual({ kind: 'done', ids: [] });
  });
});

describe('multiParcel: production on several parcels', () => {
  it('a unit travels with its amount, only on the parcel that has one', () => {
    const body = buildMultiTargetBody(
      {
        event_type: 1,
        type: 'IR',
        irrigation_method: 'drip',
        // What the single-parcel payload carries: units shared, gated on a blank shared amount.
        irrigation_depth_unit: 'cm',
        fuel_unit: 'L',
        extra_data: { fuel_unit: 'L' }
      },
      [
        parcel({ scope: 'all', values: { irrigation_depth: '3', fuel_consumed: '20' } }),
        {
          ...newTarget({ id: 12, name: 'South', area: 2 }),
          scope: 'part' as const,
          partArea: '1.5',
          values: { irrigation_depth: '1' }
        }
      ],
      irrigation,
      { area_unit: 'ha', irrigation_depth_unit: 'cm', fuel_unit: 'L' },
      'group-3'
    );
    // Sent shared AND per parcel would be refused (`either`); the parcel is where it belongs.
    expect(body).not.toHaveProperty('irrigation_depth_unit');
    expect(body).not.toHaveProperty('fuel_unit');
    expect(body.extra_data).toEqual({});
    expect(body.targets).toEqual([
      {
        parcel: 11,
        area_covered: '5.02',
        irrigation_depth: '3',
        irrigation_depth_unit: 'cm',
        fuel_consumed: '20',
        fuel_unit: 'L'
      },
      { parcel: 12, area_covered: '1.5', irrigation_depth: '1', irrigation_depth_unit: 'cm' }
    ]);
  });

  it('a unit whose amount the cards do not ask is not left in the shared body either', () => {
    // Electric pump: the wizard drops the fuel field from the cards. Its unit must go too,
    // or the records state a unit for fuel nobody measured.
    const electric = {
      ...irrigation,
      fields: irrigation.fields.filter((field) => field.key !== 'fuel_consumed')
    };
    const body = buildMultiTargetBody(
      { event_type: 1, type: 'IR', fuel_unit: 'kWh', irrigation_depth_unit: 'cm' },
      [parcel({ scope: 'all', values: { irrigation_depth: '2' } })],
      electric,
      { area_unit: 'ha', fuel_unit: 'kWh', irrigation_depth_unit: 'cm' },
      'group-4'
    );
    expect(body).not.toHaveProperty('fuel_unit');
    expect(body.targets).toEqual([
      { parcel: 11, area_covered: '5.02', irrigation_depth: '2', irrigation_depth_unit: 'cm' }
    ]);
  });

  it('pollination asks no area per parcel; irrigation does', () => {
    expect(specRulesFor(1, 'PO')!.areaKey).toBeNull();
    expect(specRulesFor(1, 'IR')!.areaKey).toBe('area_covered');
    const hives = specRulesFor(1, 'PO')!;
    expect(targetIssues(newTarget({ id: 1, name: 'A', area: 2 }), hives, {})).toEqual([]);
  });
});

describe('multiParcelMode: where the form stands with several parcels', () => {
  const base = { open: true, eventType: 5, subtype: '', hasRules: false, pickedCount: 0 };

  it('soil before its subtype is answered: the picker is offered', () => {
    expect(multiParcelMode(base)).toBe('picking');
    expect(multiParcelMode({ ...base, pickedCount: 2 })).toBe('picking');
  });

  it('a subtype that covers several parcels: picking, then active', () => {
    expect(multiParcelMode({ ...base, subtype: 'PA', hasRules: true })).toBe('picking');
    expect(multiParcelMode({ ...base, subtype: 'PA', hasRules: true, pickedCount: 2 })).toBe(
      'active'
    );
  });

  it('a subtype logged one parcel at a time: the picked parcels are paused, never dropped', () => {
    expect(multiParcelMode({ ...base, subtype: 'ST', pickedCount: 2 })).toBe('paused');
    expect(multiParcelMode({ ...base, subtype: 'ST' })).toBe('off');
  });

  it('off whenever the wizard rules it out, or the type never covers several', () => {
    expect(multiParcelMode({ ...base, open: false, hasRules: true, pickedCount: 2 })).toBe('off');
    expect(multiParcelMode({ ...base, eventType: 7 })).toBe('off');
    // Harvest: production covers several, harvest does not, and its subtype is always known.
    expect(multiParcelMode({ ...base, eventType: 1, subtype: 'HA' })).toBe('off');
  });
});

describe('voiceFieldsAskedPerParcel: a spoken value for a per-parcel field is named, not lost', () => {
  it('picks the heard fields the cards ask per parcel, and nothing shared', () => {
    const heard = {
      filledFields: ['irrigation_method', 'fuel_consumed'],
      keptFields: ['area_covered', 'fuel_consumed', 'water_source']
    };
    expect(voiceFieldsAskedPerParcel(irrigation, heard).sort()).toEqual([
      'area_covered',
      'fuel_consumed'
    ]);
  });

  it('nothing to say without rules or a voice result', () => {
    expect(voiceFieldsAskedPerParcel(null, { filledFields: ['fuel_consumed'] })).toEqual([]);
    expect(voiceFieldsAskedPerParcel(irrigation, null)).toEqual([]);
  });
});
