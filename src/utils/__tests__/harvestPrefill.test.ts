/**
 * The Finish Production pre-fill must be the season's harvest, and nothing else.
 *
 * Found 2026-08-21 finishing Duke 2025 on the Calapooia Bend rehearsal: the form offered
 * 2,150 lb — the buffer-row `BU` event, picked separately and sold CONVENTIONAL — as the
 * production amount of a 118,750 lb certified-organic lot. The old logic took the latest event
 * with any yield. This pins what it must do instead.
 */

import { describe, expect, it } from 'vitest';

import { computeHarvestPrefill } from '../harvestPrefill';

const duke2025 = [
  { type: 'PR', date: '2025-02-10T08:00:00Z' },
  {
    type: 'HA',
    date: '2025-06-24T06:00:00Z',
    yield_quantity: 35600,
    yield_unit: 'lbs',
    harvest_method: 'manual'
  },
  {
    type: 'HA',
    date: '2025-06-28T06:00:00Z',
    yield_quantity: 35600,
    yield_unit: 'lbs',
    harvest_method: 'manual'
  },
  {
    type: 'HA',
    date: '2025-07-02T06:00:00Z',
    yield_quantity: 29700,
    yield_unit: 'lbs',
    harvest_method: 'manual'
  },
  {
    type: 'HA',
    date: '2025-07-08T06:00:00Z',
    yield_quantity: 17850,
    yield_unit: 'lbs',
    harvest_method: 'mechanical'
  },
  // The regression: a buffer-row pick, AFTER the last harvest, with a yield — sold conventional.
  { type: 'BU', date: '2025-07-09T10:00:00Z', yield_quantity: 2150, yield_unit: 'lbs' },
  { type: 'PH', date: '2025-07-08T09:30:00Z' },
  { type: 'TP', date: '2025-07-09T07:00:00Z' }
];

/**
 * The same season as `duke2025`, spelled the way `current_history/` actually serializes it —
 * property paths, not short codes. The first version of this helper matched only `HA` and so
 * offered nothing at all on the real endpoint while every test here passed.
 */
const spinach2026ApiShape = [
  { type: 'event.production.planting' },
  { type: 'event.production.harvesting', yield_quantity: '44600.00', yield_unit: 'lbs' },
  {
    type: 'event.production.post_harvest_processing',
    yield_quantity: '44600.00',
    yield_unit: 'lbs'
  },
  { type: 'event.production.transport', yield_quantity: '44600.00', yield_unit: 'lbs' },
  { type: 'event.production.harvesting', yield_quantity: '39000.00', yield_unit: 'lbs' },
  { type: 'event.production.harvesting', yield_quantity: '28000.00', yield_unit: 'lbs' },
  { type: 'event.production.buffer_use', yield_quantity: '2150.00', yield_unit: 'lbs' }
];

describe('computeHarvestPrefill — serializer vocabularies', () => {
  it('sums harvest records spelled as property paths (the current_history shape)', () => {
    const p = computeHarvestPrefill(spinach2026ApiShape);
    expect(p?.production_amount).toBe('111600');
    expect(p?.production_unit).toBe('lb');
    expect(p?.pick_count).toBe(3);
  });

  it('does not count post-harvest, transport or buffer rows that carry the same quantity', () => {
    // 44,600 counted once, not three times; 2,150 of buffer fruit never counted.
    expect(computeHarvestPrefill(spinach2026ApiShape)?.production_amount).not.toBe('158350');
    expect(computeHarvestPrefill(spinach2026ApiShape)?.production_amount).not.toBe('113750');
  });

  it('accepts the bare verb and the short code too', () => {
    expect(
      computeHarvestPrefill([{ type: 'harvesting', yield_quantity: 10, yield_unit: 'lbs' }])
        ?.production_amount
    ).toBe('10');
    expect(
      computeHarvestPrefill([{ type: 'HA', yield_quantity: 10, yield_unit: 'lbs' }])
        ?.production_amount
    ).toBe('10');
  });
});

describe('computeHarvestPrefill', () => {
  it('sums the harvest picks and ignores the buffer-row event that followed them', () => {
    const p = computeHarvestPrefill(duke2025);
    expect(p?.production_amount).toBe('118750');
    expect(p?.production_unit).toBe('lb');
    expect(p?.pick_count).toBe(4);
    // The number that used to win:
    expect(p?.production_amount).not.toBe('2150');
    // The "latest pick" that the old logic would have offered on a clean season:
    expect(p?.production_amount).not.toBe('17850');
  });

  it('reports mixed when hand picks and a machine pick are both on the season', () => {
    expect(computeHarvestPrefill(duke2025)?.harvest_method).toBe('mixed');
  });

  it('reports the single method when every pick used it', () => {
    const manualOnly = duke2025.filter((e) => e.type !== 'HA' || e.harvest_method === 'manual');
    expect(computeHarvestPrefill(manualOnly)?.harvest_method).toBe('manual');
  });

  it('offers nothing, rather than a fabricated total, when picks disagree on a unit', () => {
    const mixedUnits = [
      { type: 'HA', yield_quantity: 620, yield_unit: 'bins' },
      { type: 'HA', yield_quantity: 413100, yield_unit: 'lbs' }
    ];
    expect(computeHarvestPrefill(mixedUnits)).toBeUndefined();
  });

  it('offers nothing when there is no harvest record at all', () => {
    expect(
      computeHarvestPrefill([{ type: 'BU', yield_quantity: 2150, yield_unit: 'lbs' }])
    ).toBeUndefined();
    expect(computeHarvestPrefill([])).toBeUndefined();
    expect(computeHarvestPrefill(undefined)).toBeUndefined();
  });

  it('maps event yield units onto the form vocabulary', () => {
    expect(
      computeHarvestPrefill([{ type: 'HA', yield_quantity: 5, yield_unit: 'kgs' }])?.production_unit
    ).toBe('kg');
    expect(
      computeHarvestPrefill([{ type: 'HA', yield_quantity: 5, yield_unit: 'Tons' }])
        ?.production_unit
    ).toBe('tons');
  });

  it('does not print float noise', () => {
    const p = computeHarvestPrefill([
      { type: 'HA', yield_quantity: 0.1, yield_unit: 'tons' },
      { type: 'HA', yield_quantity: 0.2, yield_unit: 'tons' }
    ]);
    expect(p?.production_amount).toBe('0.3');
  });
});
