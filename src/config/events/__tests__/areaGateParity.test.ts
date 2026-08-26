/**
 * Area is a question for field operations only. The registry gated it correctly
 * (`AREA_SUBTYPES`) while the form's hand-written gate was `!['EM','PO']` — so
 * Seed Search, Transport and Buffer Use demanded an "Area Covered*" that no
 * display surface would ever show and that the backend refuses as <= 0 for
 * exactly those subtypes (history/models.py ProductionEvent.clean()).
 *
 * This test pins the two ends that cannot drift apart again:
 *  1. the registry's area_covered field uses AREA_SUBTYPES verbatim;
 *  2. ProductionTab renders the area section through AREA_SUBTYPES — the source
 *     must not reintroduce a literal subtype list around the area field.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { AREA_SUBTYPES, productionEventRegistry } from 'config/events/productionEvent';
import { ACTIVITY_VERBS, subtypeChoicesFor } from 'config/activityVerbs';

const TAB_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'views',
  'Dashboard',
  'Dashboard',
  'components',
  'forms',
  'ProductionTab.jsx'
);

describe('area_covered gate parity (form ↔ registry ↔ backend)', () => {
  it('registry area_covered field is gated by AREA_SUBTYPES', () => {
    const field = productionEventRegistry.fields.find((f) => f.name === 'area_covered');
    expect(field).toBeDefined();
    expect(field?.visibleForSubtypes).toBe(AREA_SUBTYPES);
  });

  it('AREA_SUBTYPES excludes the no-area subtypes', () => {
    for (const subtype of ['EM', 'PO', 'TP', 'BU', 'SS']) {
      expect(AREA_SUBTYPES).not.toContain(subtype);
    }
  });

  it('ProductionTab renders the area section through AREA_SUBTYPES', () => {
    const source = readFileSync(TAB_PATH, 'utf-8');
    expect(source).toContain('{AREA_SUBTYPES.includes(productionType) && (');
    // The old hand-written gate must not come back around the area field.
    expect(source).not.toContain("{!['EM', 'PO'].includes(productionType) && (");
  });

  it('every subtype a verb tile can reach is either an area subtype or a known no-area one', () => {
    // If a new production subtype ships, it must be classified — silence here
    // means someone added a subtype without deciding whether area applies.
    const NO_AREA = ['EM', 'PO', 'TP', 'BU', 'SS'];
    const reachable = new Set<string>();
    for (const verb of ACTIVITY_VERBS) {
      if (verb.eventType !== 1) continue;
      for (const choice of subtypeChoicesFor(verb)) reachable.add(choice);
    }
    for (const subtype of reachable) {
      expect(
        AREA_SUBTYPES.includes(subtype as (typeof AREA_SUBTYPES)[number]) ||
          NO_AREA.includes(subtype),
        `subtype ${subtype} is unclassified for the area question`
      ).toBe(true);
    }
  });
});
