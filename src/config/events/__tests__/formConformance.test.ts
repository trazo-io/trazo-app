/**
 * Registry ↔ form conformance guard.
 *
 * ARCHITECTURE: the event field registry is the SSOT for DISPLAY surfaces (consumer card,
 * event modal, timeline row). The seven event form tabs stay hand-written, because their
 * NOP-driven section grouping is what makes the audit export complete and a generic
 * renderer flattens it. That trade is deliberate — but without enforcement it produced
 * exactly the drift this test now blocks: fields declared in the registry with a `form`
 * surface that no form ever collects, so they are permanently empty everywhere downstream.
 *
 * The check is deliberately crude — does the field NAME appear anywhere in the tab source?
 * That is enough to catch "declared but never collected", which is the failure mode, and it
 * needs no AST or render.
 *
 * WHEN THIS FAILS you have two honest options:
 *   1. Add the field to the form tab (it was supposed to be collected), or
 *   2. Drop `form` from that field's `surfaces` (it is display-only).
 * Adding it to KNOWN_GAPS is only for drift already scheduled for a named fix.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { businessEventRegistry } from '../businessEvent';
import { chemicalEventRegistry } from '../chemicalEvent';
import { generalEventRegistry } from '../generalEvent';
import { pestEventRegistry } from '../pestEvent';
import { productionEventRegistry } from '../productionEvent';
import { soilEventRegistry } from '../soilEvent';
import { weatherEventRegistry } from '../weatherEvent';

const FORMS_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  'views',
  'Dashboard',
  'Dashboard',
  'components',
  'forms'
);

const TABS = [
  { name: 'weather', registry: weatherEventRegistry, file: 'WeatherTab.jsx' },
  { name: 'production', registry: productionEventRegistry, file: 'ProductionTab.jsx' },
  { name: 'chemical', registry: chemicalEventRegistry, file: 'ChemicalTab-ENHANCED.jsx' },
  { name: 'general', registry: generalEventRegistry, file: 'GeneralTab.jsx' },
  { name: 'soil_management', registry: soilEventRegistry, file: 'SoilManagementTab.jsx' },
  { name: 'pest_management', registry: pestEventRegistry, file: 'PestManagementTab.jsx' },
  { name: 'business', registry: businessEventRegistry, file: 'BusinessTab-SIMPLIFIED.jsx' }
];

/**
 * Fields collected somewhere other than the per-type tab, so their absence from the tab
 * source is correct rather than drift.
 */
const COLLECTED_ELSEWHERE = new Set([
  // Wizard step 0 collects this once for every event type (NewEvent.jsx).
  'performed_by'
]);

/**
 * Accepted drift, each with the phase that closes it. Anything added here MUST name a fix.
 * An entry that outlives its fix is worse than a failing test — review this list whenever
 * the referenced phase lands.
 */
const KNOWN_GAPS: Record<string, string> = {
  // D2 CLOSED — the FE section now collects the structured NPK trio.
  // D5 CLOSED — these are PERMANENT, intentional aliases, not pending work.
  //
  // Each form uses a local input name that differs from the registry/serializer name (the form
  // says `volume_numeric`, the API says `volume_applied`). The plan chose to bridge rather than
  // rename, because renaming would need a data migration for no user-visible gain. Every name
  // below was checked end to end: it exists in history/serializers.py AND in the
  // eventDataNormalizer allow-list, so the value reaches the card and the PDF.
  //
  // They stay listed only because this test is a TEXT match against the tab file and cannot see
  // through an alias. Do NOT read them as unfinished — but do re-verify the pair if you rename
  // either side.
  'production.method': 'alias — form collects production_method, mapped to extra_data.method',
  'chemical.volume_applied': 'alias — form collects volume_numeric',
  'chemical.area_treated': 'alias — form collects area_numeric',
  'soil_management.working_depth': 'alias — form collects depth',
  'soil_management.amendment_amount_numeric':
    'alias — form collects amendment_amount (legacy pair)',
  'soil_management.amendment_amount_unit': 'alias — form collects amendment_unit (legacy pair)',
  'pest_management.growth_stage': 'alias — form collects crop_growth_stage',
  'general.activity_type': 'alias — form submits `type`, remapped in NewEvent.onSubmit',
  'general.duration': 'alias — form submits `duration_hours`, remapped in NewEvent.onSubmit',
  'general.people_involved': 'alias — form submits `participants`, remapped in NewEvent.onSubmit',

  // ---- Detector limits, not gaps (2026-08-15) --------------------------------------
  // Each of these IS bound, in a shape the binding matcher cannot see. Verified by hand.
  // They are listed rather than loosened-for, because widening the regex to catch them
  // would re-admit the substring matching that let three real gaps through for months.
  'production.block_id':
    'bound by <BlockIdField control={...}/>, which defaults name="block_id" internally',
  'chemical.block_id': 'same — <BlockIdField/> component binding',
  'soil_management.block_id': 'same — <BlockIdField/> component binding',
  'pest_management.block_id': 'same — <BlockIdField/> component binding',
  'production.seed_search_attempts':
    'repeating row widget driven by methods.setValue(), not register()/Controller',
  'chemical.nitrogen_percentage':
    'bound via a .map() over an NPK field array — dynamic name={f.name}',
  'chemical.phosphorus_percentage': 'same — dynamic NPK map binding',
  'chemical.potassium_percentage': 'same — dynamic NPK map binding'
};

/**
 * Does this form file actually BIND an input to `name`?
 *
 * 🔴 2026-08-15. This used to be `source.includes(name)` — a raw substring match over the
 * whole file, which a COMMENT satisfies. The only three occurrences of `soil_moisture` in
 * SoilManagementTab.jsx are the comments recording its removal:
 *
 *     // Sprint 2 Epic 2.1.3: Removed soil_moisture (duplicates Weather event)
 *
 * so the comment announcing that a field was deleted is what kept this test green after it
 * was deleted — while the registry still declared `form` for it and the certifier packet
 * still printed a column. The same shield covered `weather_conditions` and
 * `transportation_distance`.
 *
 * A binding is one of the shapes these forms actually use:
 *     register('x')            <Controller name="x"          name="x"
 * Comments are stripped first so a mention can never stand in for an input.
 */
const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const collectsField = (source: string, name: string): boolean => {
  const code = stripComments(source);
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`register\\(\\s*['"\`]${esc}['"\`]|name=\\{?\\s*['"\`]${esc}['"\`]`, 'm').test(
    code
  );
};

describe('every registry field with a `form` surface is collected by its form tab', () => {
  for (const tab of TABS) {
    it(`${tab.name} (${tab.file})`, () => {
      const source = readFileSync(join(FORMS_DIR, tab.file), 'utf8');

      const missing = tab.registry.fields
        .filter((field) => Boolean(field.surfaces?.form))
        .map((field) => field.name)
        .filter((name) => !COLLECTED_ELSEWHERE.has(name))
        .filter((name) => !collectsField(source, name))
        .filter((name) => !KNOWN_GAPS[`${tab.name}.${name}`]);

      expect(
        missing,
        `${tab.file} declares a \`form\` surface for these registry fields but never collects them: ` +
          `${missing.join(', ')}. Either add the input, or drop \`form\` from the field's surfaces.`
      ).toEqual([]);
    });
  }

  it('every KNOWN_GAPS entry still refers to a real registry field', () => {
    // Stops the allowlist rotting into a set of names nothing checks any more.
    const declared = new Set(
      TABS.flatMap((tab) =>
        tab.registry.fields
          .filter((f) => Boolean(f.surfaces?.form))
          .map((f) => `${tab.name}.${f.name}`)
      )
    );
    const stale = Object.keys(KNOWN_GAPS).filter((key) => !declared.has(key));

    expect(stale, `KNOWN_GAPS entries no longer in the registry: ${stale.join(', ')}`).toEqual([]);
  });
});
