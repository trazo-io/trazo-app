/**
 * The season screens say "season" and "activity", in both languages.
 *
 * Until 2026-11-07 the farm home and parcel page said season / activity while the screens they
 * link to said production / event: the breadcrumb read "New season" above a page titled
 * "Quick Start Production", and "Finish season" opened "Finish Production". One thing, two
 * names, depending on the screen. This reads every message key the season screens reference
 * and checks the words, so a new string on these screens is checked without being listed here.
 */
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '../../../../..');
const en: Record<string, string> = JSON.parse(
  readFileSync(join(SRC, 'i18n/lang/en-US.json'), 'utf8')
);
const es: Record<string, string> = JSON.parse(
  readFileSync(join(SRC, 'i18n/lang/es-419.json'), 'utf8')
);

const SCREENS = [
  'views/Dashboard/Dashboard/Production/QuickStartProduction.tsx',
  'views/Dashboard/Dashboard/Production/FinishProduction.tsx',
  'views/Dashboard/Dashboard/Production/ProfileProduction.tsx',
  'views/Dashboard/Dashboard/Production/SeasonDetailsCard.tsx',
  'views/Dashboard/Dashboard/Production/PostHarvestHandlerSection.tsx',
  'components/Forms/StandardFinishProductionForm.tsx',
  'views/Dashboard/Parcel/components/TrackList.jsx',
  'views/Dashboard/Parcel/components/HistoryCard.jsx'
];

// Where the word is the right one. Each entry says why.
const KEEP: Record<string, string> = {
  'quickStart.field.productionMethod':
    'organic / transitional / conventional is the production METHOD (7 CFR 205)',
  'quickStart.field.productionMethod.required': 'same field as above',
  'quickStart.plan.prohibitedBadge':
    '"not allowed in organic production" is the regulation\'s own phrase',
  'production.agriculturalProduction': 'a fallback TYPE value, not the name of the season'
};

const EN_WORDS = /\b(productions?|events?)\b/i;
const ES_WORDS = /\b(producci(ó|o)n|producciones|eventos?)\b/i;

const keysOn = (file: string) => {
  const code = readFileSync(join(SRC, file), 'utf8');
  return [...code.matchAll(/['"`]([a-zA-Z]+(?:\.[a-zA-Z0-9_]+)+)['"`]/g)]
    .map((m) => m[1])
    .filter((k) => k in en);
};

describe('season screens say season and activity', () => {
  it.each(SCREENS)('%s', (file) => {
    const keys = keysOn(file);
    expect(keys.length, 'read no message keys: this would pass vacuously').toBeGreaterThan(0);
    const wrong = keys
      .filter((k) => !(k in KEEP))
      .flatMap((k) => [
        ...(EN_WORDS.test(en[k]) ? [`en ${k}: ${en[k]}`] : []),
        ...(es[k] && ES_WORDS.test(es[k]) ? [`es ${k}: ${es[k]}`] : [])
      ]);
    expect(wrong).toEqual([]);
  });

  it('page titles match the breadcrumb that leads to them', () => {
    expect(en['quickStart.page.title']).toBe(en['parcelPage.newSeason']);
    expect(es['quickStart.page.title']).toBe(es['parcelPage.newSeason']);
    expect(en['finishProduction.page.title']).toBe(en['farmHome.seasons.finish']);
    expect(es['finishProduction.page.title']).toBe(es['farmHome.seasons.finish']);
  });

  it('no hardcoded English title or default name on the start and finish screens', () => {
    const start = readFileSync(join(SRC, SCREENS[0]), 'utf8');
    const finish = readFileSync(join(SRC, SCREENS[5]), 'utf8');
    expect(start).not.toMatch(/['"`](Quick Start|Edit) Production['"`]/);
    expect(start).not.toMatch(/`Production \$\{/);
    expect(finish).not.toMatch(/production cycle/);
  });
});
