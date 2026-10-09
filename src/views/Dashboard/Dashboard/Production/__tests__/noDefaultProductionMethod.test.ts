/**
 * A new season starts with NO production method. The grower (or the farm's own farming_method)
 * supplies it; nothing else may.
 *
 * Found by the 2026-10-01 onboarding rehearsal: four seasons started on a WSDA-certified farm all
 * came up "Conventional", because the form preselected it and a pilot farm has no farming_method
 * to inherit. The value prints on certifier records and the buyer page, so a preselected option is
 * a claim nobody made.
 *
 * Source-reading, like templateSortReactsToMethod.test.ts beside it: the form needs a live
 * session, crop types and a parcel to render, and what has to stay true is a few lines of it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'QuickStartProduction.tsx'), 'utf8');

describe('QuickStartProduction never chooses the production method', () => {
  it('starts the field empty', () => {
    const defaults = source.slice(source.indexOf('defaultValues: {'));
    expect(defaults.slice(0, 300)).toMatch(/production_method: ''/);
  });

  it('requires a choice before the season can be saved', () => {
    expect(source).toMatch(/production_method: string\(\)\.min\(1,/);
  });

  it('has no fallback that turns a missing method into conventional', () => {
    expect(source).not.toMatch(/production_method[^\n]*\|\|\s*'conventional'/);
    expect(source).not.toMatch(/productionMethod[^\n]*\|\|\s*'conventional'/);
  });

  it('never takes the method from a crop template', () => {
    expect(source).not.toMatch(/setValue\(\s*'production_method',\s*methodMap/);
  });

  it('offers an empty, unselectable prompt instead of a first real option', () => {
    expect(source).toMatch(/<option value="" disabled>/);
  });
});

const en = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'i18n', 'lang', 'en-US.json'), 'utf8')
);
const es = JSON.parse(
  readFileSync(join(__dirname, '..', '..', '..', '..', '..', 'i18n', 'lang', 'es-419.json'), 'utf8')
);

describe('the input-application form names its public field the way every other form does', () => {
  // `observation` is the PUBLIC note (it reaches the buyer page once a season is published). The
  // irrigation, harvest and general forms call it "Public note"; the input-application form called
  // it "Observations & Notes", so the rehearsal put setup notes ("sprayer type ASSUMED") in it.
  it.each([
    ['en-US', en],
    ['es-419', es]
  ])('%s', (_locale, messages) => {
    expect(messages['events.chemical.form.observations']).toBe(
      messages['events.common.fields.observation']
    );
  });
});
