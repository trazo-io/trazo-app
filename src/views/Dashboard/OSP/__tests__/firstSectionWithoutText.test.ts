/**
 * The onboarding checklist's OSP item says "{n} of 6 narrative sections have text" and opens the
 * narratives page on the first section that does not count. That section must be picked by the
 * same rule as the count (the backend's `sections_with_text`), or the link opens a section the
 * count already credits.
 */
import { describe, expect, it } from 'vitest';

import { OSP_SECTION_KEYS } from 'types/osp';
import { firstSectionWithoutText } from '../OSPView';
import { FIRST_SECTION_WITHOUT_TEXT, ospFirstSectionWithoutTextPath } from '../ospLinks';

// At least 400 characters and not padding.
const MATERIAL =
  'Sixty acres of certified organic tree crops on three blocks: Hass avocado, Valencia orange, ' +
  'and Nonpareil almond. Fertility comes from composted green waste banded under the canopy ' +
  'each autumn plus fish emulsion through the drip at bloom. Winter cover crops of triticale ' +
  'and crimson clover are drilled into the row middles in October and mowed flat in March. ' +
  'Pest pressure is scouted weekly against UC IPM thresholds before any material is applied.';

const sections = (narratives: Partial<Record<string, string>>) =>
  Object.fromEntries(OSP_SECTION_KEYS.map((k) => [k, { narrative: narratives[k] ?? '' }]));

const allMaterial = Object.fromEntries(OSP_SECTION_KEYS.map((k) => [k, MATERIAL]));

describe('firstSectionWithoutText', () => {
  it('picks the first section in the order of the regulation', () => {
    expect(firstSectionWithoutText(sections({}), 0)).toBe('practices_procedures');
    expect(
      firstSectionWithoutText(
        sections({ ...allMaterial, monitoring_plan: '', commingling_barriers: '' }),
        0
      )
    ).toBe('monitoring_plan');
  });

  it('a brief or padded section does not count, as on the page and the submit gate', () => {
    expect(
      firstSectionWithoutText(sections({ ...allMaterial, practices_procedures: 'x' }), 0)
    ).toBe('practices_procedures');
    expect(
      firstSectionWithoutText(sections({ ...allMaterial, inputs_list: 'Test '.repeat(120) }), 0)
    ).toBe('inputs_list');
  });

  it('holds (a)(2) back while a registered input is missing from its narrative', () => {
    expect(firstSectionWithoutText(sections(allMaterial), 2)).toBe('inputs_list');
  });

  it('is null when all six count', () => {
    expect(firstSectionWithoutText(sections(allMaterial), 0)).toBeNull();
  });
});

describe('the checklist link', () => {
  it('opens the narratives page on that section', () => {
    expect(ospFirstSectionWithoutTextPath('/admin/dashboard/farm/148')).toBe(
      `/admin/dashboard/farm/148/osp/narratives?section=${FIRST_SECTION_WITHOUT_TEXT}`
    );
  });
});
