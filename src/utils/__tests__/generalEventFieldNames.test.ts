/**
 * The General tab's field names and the model's, held together.
 *
 * 🔴 MEASURED IN PRODUCTION 2026-10-20. A crew message ("Fixed the leak in the drip line")
 * offered "Activity Type: Maintenance", the operator tapped, the banner said "1 field filled",
 * and the select underneath still read "Select activity type...". The merge wrote
 * `activity_type`, which is the MODEL's name and the registry's; the tab's select is
 * `name="type"`. All three General fields a message can fill were landing in keys nothing reads,
 * and the record saved without them.
 *
 * The rename existed in one direction only (submit). These assertions hold the table against the
 * two files it has to agree with, because a rename that is right on the way out and missing on
 * the way in is invisible to every test that only POSTs.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import { GENERAL_FORM_TO_MODEL, GENERAL_MODEL_TO_FORM } from '../cleanEventPayload';

const read = (p: string) => readFileSync(join(__dirname, p), 'utf8');
const TAB = read('../../views/Dashboard/Dashboard/components/forms/GeneralTab.jsx');
const REGISTRY = read('../../config/events/generalEvent.ts');
const WIZARD = read('../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
const VOICE_FIELDS = read('../../config/events/voiceFields.ts');

describe('General events: form names and model names', () => {
  it('names every field the tab actually binds', () => {
    for (const formName of Object.keys(GENERAL_FORM_TO_MODEL)) {
      expect(TAB, `GeneralTab has no control named "${formName}"`).toContain(`name="${formName}"`);
    }
  });

  it('names every field the registry declares', () => {
    for (const modelName of Object.values(GENERAL_FORM_TO_MODEL)) {
      expect(REGISTRY, `the registry declares no field "${modelName}"`).toContain(
        `name: '${modelName}'`
      );
    }
  });

  it('is the same table read both ways', () => {
    for (const [form, model] of Object.entries(GENERAL_FORM_TO_MODEL)) {
      expect(GENERAL_MODEL_TO_FORM[model]).toBe(form);
    }
    expect(Object.keys(GENERAL_MODEL_TO_FORM)).toHaveLength(
      Object.keys(GENERAL_FORM_TO_MODEL).length
    );
  });

  it('covers every General field a crew message is allowed to fill', () => {
    // `voiceFields.ts` is what the parse is asked for. Anything in that list whose name differs
    // between the registry and the tab has to be in the table, or it silently fails to land.
    const asked = (VOICE_FIELDS.match(/general: \[([^\]]*)\]/)?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().replace(/'/g, ''))
      .filter(Boolean);
    expect(asked.length).toBeGreaterThan(0);
    for (const modelName of asked) {
      const formName = GENERAL_MODEL_TO_FORM[modelName] ?? modelName;
      expect(
        TAB,
        `nothing in GeneralTab binds "${formName}" (asked for as "${modelName}")`
      ).toContain(`name="${formName}"`);
    }
  });

  it('renames on the way INTO the form, at every place the wizard merges', () => {
    // Four merge sites: the spoken merge, the seeded apply, the late re-offer and the activity
    // switch. A rename missing from any one of them is the production defect again, on that path.
    expect(WIZARD).toMatch(/const asFormFields = useCallback/);
    expect(WIZARD.match(/asFormFields\(/g)?.length, 'a merge site writes raw model names').toBe(4);
    expect(WIZARD).not.toMatch(/\.\.\.prev, \.\.\.written \}/);
  });

  it('declares duration as the number of hours the form collects', () => {
    // The input is `type="number"`, so a string with a unit ("3 hours") is discarded by the
    // browser and the field stays empty. As a number the voice sanitiser reads 3 out of it and
    // drops what it cannot read.
    const block = REGISTRY.slice(REGISTRY.indexOf("name: 'duration'"));
    expect(block.slice(0, 1200)).toMatch(/valueType: 'number'/);
    expect(TAB).toMatch(/name="duration_hours"[\s\S]{0,400}type="number"/);
  });
});
