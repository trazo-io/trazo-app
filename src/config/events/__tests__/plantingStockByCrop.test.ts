/**
 * An onion transplant was asked for a rootstock and counted "Trees / Plants Planted"
 * (recordkeeping checklist run 2026-11-16, VID-14). The orchard questions follow the season's
 * crop: hidden only for a clearly annual category, kept for anything that might be grafted.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { isAnnualCropCategory, plantingSeasonCategory } from '../plantingStock';

const TAB = readFileSync(
  resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'),
  'utf8'
);
const NEW_EVENT = readFileSync(
  resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
  'utf8'
);

describe('planting stock fields by crop', () => {
  it('treats only clearly annual categories as annual', () => {
    for (const c of ['vegetable', 'grain', 'herb', 'legume', 'forage', 'oilseed']) {
      expect(isAnnualCropCategory(c), c).toBe(true);
    }
    for (const c of ['tree_fruit', 'tree_nut', 'berry', 'other', '', null, undefined]) {
      expect(isAnnualCropCategory(c), String(c)).toBe(false);
    }
  });

  it('NewEvent passes the category of the season the save binds', () => {
    expect(NEW_EVENT).toMatch(/seasonCropCategory=\{plantingCropCategory\}/);
    expect(TAB).toMatch(/isAnnualCropCategory\(seasonCropCategory\)/);
  });

  describe('plantingSeasonCategory', () => {
    const onions = { id: 7, finish_date: null, crop_type: { category: 'vegetable' } };
    const apples = {
      id: 3,
      public_id: 'a-uuid',
      finish_date: null,
      crop_type: { category: 'tree_fruit' }
    };
    const walnuts2025 = { id: 2, finish_date: '2025-10-01', crop_type: { category: 'tree_nut' } };
    const base = { isEdit: false, multiTarget: false, seasons: [onions, apples, walnuts2025] };

    it('reads the season the form was opened from, not the newest open one', () => {
      expect(plantingSeasonCategory({ ...base, productionFromUrl: '3' })).toBe('tree_fruit');
      expect(plantingSeasonCategory({ ...base, productionFromUrl: 'a-uuid' })).toBe('tree_fruit');
      expect(plantingSeasonCategory(base)).toBe('vegetable');
    });

    it('a plan item outranks the link, and the link outranks the post-harvest season', () => {
      expect(plantingSeasonCategory({ ...base, planHistoryId: 7, productionFromUrl: '3' })).toBe(
        'vegetable'
      );
      expect(
        plantingSeasonCategory({ ...base, productionFromUrl: '3', postHarvestTarget: walnuts2025 })
      ).toBe('tree_fruit');
      expect(plantingSeasonCategory({ ...base, postHarvestTarget: walnuts2025 })).toBe('tree_nut');
    });

    it('edit reads the record’s own season; several parcels read none', () => {
      expect(plantingSeasonCategory({ ...base, isEdit: true, editSeason: walnuts2025 })).toBe(
        'tree_nut'
      );
      expect(plantingSeasonCategory({ ...base, isEdit: true })).toBeNull();
      expect(plantingSeasonCategory({ ...base, multiTarget: true })).toBeNull();
    });
  });

  it('counts plants in both languages', () => {
    expect(
      (enUS as Record<string, string>)['events.production.fields.plantsEstablishedAnnual']
    ).toBe('Plants Planted');
    expect(
      (es419 as Record<string, string>)['events.production.fields.plantsEstablishedAnnual']
    ).toBe('Plantas plantadas');
  });
});
