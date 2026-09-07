/**
 * Gaps closed by the 2026-09-06 per-activity end-to-end sweep.
 *
 * One record per wizard tile was created on the demo farm with every rendered input filled,
 * then read back through the API, the producer's detail modal, the buyer card and the season
 * audit PDF. Each block below pins a display gap that sweep found: a value the form collected,
 * the API returned, and the producer's own record view did not show.
 */
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { getFieldsForSurface } from '../index';
import type { ResolvedFieldSet } from '../index';

const names = (r: ResolvedFieldSet) =>
  [...r.hero, ...r.immediate, ...r.secondary, ...r.details].map((f) => f.name);
const labelKeys = (r: ResolvedFieldSet) =>
  [...r.hero, ...r.immediate, ...r.secondary, ...r.details].map((f) => f.labelKey);

const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

describe('production: variety renders on the modal for every subtype', () => {
  // EM (cleanout) is the one production form that asks no variety, so it is not expected here.
  const nonSeedSubtypes = ['IR', 'PR', 'CU', 'TH', 'PO', 'CM', 'FP', 'MO', 'TP', 'BU'] as const;
  for (const st of nonSeedSubtypes) {
    it(`${st} shows the variety the form asked for`, () => {
      const r = getFieldsForSurface(1, st, 'modal', { type: st, variety: 'Duke' });
      expect(names(r).filter((n) => n === 'variety')).toHaveLength(1);
    });
    it(`${st} keeps variety off the buyer card (unchanged policy)`, () => {
      const r = getFieldsForSurface(1, st, 'consumer_card', { type: st, variety: 'Duke' });
      expect(names(r)).not.toContain('variety');
    });
  }
  it('HA still shows variety exactly once (two entries, disjoint gates)', () => {
    const r = getFieldsForSurface(1, 'HA', 'modal', { type: 'HA', variety: 'Duke' });
    expect(names(r).filter((n) => n === 'variety')).toHaveLength(1);
  });
});

describe('production: equipment rating and the covering cleanout', () => {
  it('operation_efficiency renders a chosen rating, never the seeded default, never on the card', () => {
    // The API always carries the column default "normal" alongside the grower's own rating.
    const chosen = { type: 'IR', production_efficiency: 'normal', operation_efficiency: 'high' };
    expect(names(getFieldsForSurface(1, 'IR', 'modal', chosen))).toContain('operation_efficiency');
    expect(names(getFieldsForSurface(1, 'IR', 'consumer_card', chosen))).not.toContain(
      'operation_efficiency'
    );
    const untouched = {
      type: 'IR',
      production_efficiency: 'normal',
      operation_efficiency: 'normal'
    };
    expect(names(getFieldsForSurface(1, 'IR', 'modal', untouched))).not.toContain(
      'operation_efficiency'
    );
    const legacy = { type: 'PR', extra_data: { operation_efficiency: 'low' } };
    expect(names(getFieldsForSurface(1, 'PR', 'modal', legacy))).toContain('operation_efficiency');
  });
  it('does not print the rating twice when HA copied it into production_efficiency', () => {
    const ev = { type: 'HA', production_efficiency: 'high', operation_efficiency: 'high' };
    const n = names(getFieldsForSurface(1, 'HA', 'modal', ev));
    expect(n).toContain('production_efficiency');
    expect(n).not.toContain('operation_efficiency');
  });
  it('the cleanout link renders as its label, producer surfaces only', () => {
    const ev = {
      type: 'CU',
      equipment_cleaning_event: 5258,
      equipment_cleaning_event_label: '2026-09-03 · Sprayer cleanout'
    };
    const modal = getFieldsForSurface(1, 'CU', 'modal', ev);
    expect(names(modal)).toContain('equipment_cleaning_event_label');
    expect(names(getFieldsForSurface(1, 'CU', 'consumer_card', ev))).not.toContain(
      'equipment_cleaning_event_label'
    );
  });
});

describe('production: the buyer card says what the copy promises', () => {
  it('a canopy pass names its operation', () => {
    const r = getFieldsForSurface(1, 'CM', 'consumer_card', {
      type: 'CM',
      canopy_operation: 'leaf_pulling',
      area_covered: 4
    });
    expect(names(r)).toContain('canopy_operation');
  });
  it('a frost night shows the low temperature beside the method', () => {
    const r = getFieldsForSurface(1, 'FP', 'consumer_card', {
      type: 'FP',
      protection_method: 'wind_machine',
      low_temperature: -2
    });
    expect(names(r)).toContain('low_temperature');
  });
});

describe('chemical: FFM code and summary-mode totals', () => {
  it('ffm_code reaches the modal', () => {
    const r = getFieldsForSurface(2, 'FU', 'modal', { type: 'FU', ffm_code: '1201' });
    expect(names(r)).toContain('ffm_code');
  });
  const totals = {
    area_treated_total: '42.00',
    volume_applied_total: '180.00',
    active_ingredient_total_kg: '3.2',
    nitrogen_total_kg: '12',
    phosphorus_total_kg: '4',
    potassium_total_kg: '6',
    fuel_consumption_total: '30'
  };
  it('a summary record shows every season total on the modal', () => {
    const ev = {
      type: 'FE',
      is_summary: 'true',
      area_unit: 'acres',
      volume_unit: 'gal',
      application_fuel_unit: 'gal',
      ...totals
    };
    const n = names(getFieldsForSurface(2, 'FE', 'modal', ev));
    for (const key of Object.keys(totals)) expect(n).toContain(key);
  });
  it('a single application never shows a season total', () => {
    const ev = { type: 'FE', is_summary: 'false', ...totals };
    const n = names(getFieldsForSurface(2, 'FE', 'modal', ev));
    for (const key of Object.keys(totals)) expect(n).not.toContain(key);
  });
  it('the totals stay off the buyer card (the aggregate tile already prints them)', () => {
    const ev = { type: 'FE', is_summary: true, ...totals };
    const n = names(getFieldsForSurface(2, 'FE', 'consumer_card', ev));
    for (const key of Object.keys(totals)) expect(n).not.toContain(key);
  });
});

describe('pest: stage, variety, recommendation, scouting totals', () => {
  it('a legacy row keeps its stage from extra_data.crop_growth_stage', () => {
    const r = getFieldsForSurface(6, 'SC', 'modal', {
      type: 'SC',
      extra_data: { crop_growth_stage: 'seedling' }
    });
    expect(names(r)).toContain('crop_growth_stage');
    expect(names(r)).not.toContain('growth_stage');
  });
  it('a row with the column shows the stage once', () => {
    const r = getFieldsForSurface(6, 'SC', 'modal', {
      type: 'SC',
      growth_stage: 'seedling',
      extra_data: { crop_growth_stage: 'seedling' }
    });
    const stageRows = names(r).filter((n) => n === 'growth_stage' || n === 'crop_growth_stage');
    expect(stageRows).toEqual(['growth_stage']);
  });
  it('variety and the recommendation render on the modal, not the card', () => {
    const ev = {
      type: 'SC',
      variety: 'Draper',
      extra_data: { action_recommended: 'continue monitoring' }
    };
    const modal = names(getFieldsForSurface(6, 'SC', 'modal', ev));
    expect(modal).toContain('variety');
    expect(modal).toContain('action_recommended');
    const card = names(getFieldsForSurface(6, 'SC', 'consumer_card', ev));
    expect(card).not.toContain('action_recommended');
  });
  it('scouting summary totals render only in summary mode', () => {
    const agg = {
      pest_species_observed: 'SWD, aphid',
      average_pest_pressure: 'low',
      area_covered_total: 15,
      fuel_consumed_total: 4
    };
    const on = names(
      getFieldsForSurface(6, 'SC', 'modal', {
        type: 'SC',
        is_summary: true,
        area_unit: 'acres',
        fuel_unit: 'gal',
        ...agg
      })
    );
    for (const key of Object.keys(agg)) expect(on).toContain(key);
    const off = names(getFieldsForSurface(6, 'SC', 'modal', { type: 'SC', ...agg }));
    for (const key of Object.keys(agg)) expect(off).not.toContain(key);
  });
});

describe('soil: grazing summary totals', () => {
  it('render for a GR summary record and for nothing else', () => {
    const ev = {
      type: 'GR',
      is_summary: 'true',
      total_grazing_days: 21,
      area_covered_total: 9,
      area_unit: 'acres'
    };
    const on = names(getFieldsForSurface(5, 'GR', 'modal', ev));
    expect(on).toContain('total_grazing_days');
    expect(on).toContain('area_covered_total');
    const single = names(getFieldsForSurface(5, 'GR', 'modal', { ...ev, is_summary: 'false' }));
    expect(single).not.toContain('total_grazing_days');
    const otherType = names(getFieldsForSurface(5, 'OM', 'modal', { ...ev, type: 'OM' }));
    expect(otherType).not.toContain('total_grazing_days');
  });
});

describe('every label the new declarations use exists in both locales', () => {
  const samples: Array<[0 | 1 | 2 | 5 | 6, string, Record<string, unknown>]> = [
    [
      1,
      'IR',
      {
        type: 'IR',
        variety: 'x',
        extra_data: { operation_efficiency: 'high' },
        equipment_cleaning_event_label: 'y'
      }
    ],
    [
      2,
      'FE',
      {
        type: 'FE',
        is_summary: true,
        ffm_code: '1',
        area_treated_total: 1,
        volume_applied_total: 1,
        active_ingredient_total_kg: 1,
        nitrogen_total_kg: 1,
        phosphorus_total_kg: 1,
        potassium_total_kg: 1,
        fuel_consumption_total: 1
      }
    ],
    [
      6,
      'SC',
      {
        type: 'SC',
        is_summary: true,
        variety: 'x',
        pest_species_observed: 'a',
        average_pest_pressure: 'low',
        area_covered_total: 1,
        fuel_consumed_total: 1,
        extra_data: { action_recommended: 'r', crop_growth_stage: 'seedling' }
      }
    ],
    [5, 'GR', { type: 'GR', is_summary: true, total_grazing_days: 1, area_covered_total: 1 }]
  ];
  for (const [et, st, ev] of samples) {
    it(`${et}/${st}`, () => {
      const keys = labelKeys(getFieldsForSurface(et, st as never, 'modal', ev));
      expect(keys.length).toBeGreaterThan(0);
      const missing = keys.filter((k) => !en[k] || !es[k]);
      expect(missing).toEqual([]);
    });
  }
});
