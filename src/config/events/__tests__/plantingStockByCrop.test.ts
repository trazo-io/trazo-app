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
import { isAnnualCropCategory } from '../plantingStock';

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

  it('hides the rootstock on an annual crop unless the record holds one', () => {
    expect(TAB).toMatch(/\(!annualCrop \|\| initialValues\.rootstock\) &&/);
    expect(TAB).toMatch(
      /annualCrop\s*\?\s*\{\s*id: 'events\.production\.fields\.plantsEstablishedAnnual'/
    );
  });

  it('gives an annual crop a row-crop spacing example, not trees per acre', () => {
    expect(TAB).toMatch(/id: 'events\.production\.fields\.plantSpacingPlaceholderAnnual'/);
  });

  it('gets the crop from the season the record is logged against', () => {
    expect(NEW_EVENT).toMatch(
      /seasonCropCategory=\{\(postHarvestTarget \|\| openSeason\)\?\.crop_type\?\.category\}/
    );
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
