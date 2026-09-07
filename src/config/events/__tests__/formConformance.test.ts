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
 *
 * 🔴 2026-09-06 — THE OTHER DIRECTION. Everything above guards
 * "registry promises a form field that does not exist". Nothing guarded the inverse, which is
 * the one that loses the farmer's work: the FORM collects a field, the value saves, and no
 * registry entry declares it, so it renders on no surface at all.
 *
 * Found live on a production tillage record. SoilManagementTab collected `tillage_type`,
 * `tillage_intensity`, `tillage_direction` and `residue_management`; NewEvent wrote all four to
 * `extra_data`; the certifier packet printed them and the carbon calculator read them — and
 * soilEvent.ts declared none of them. The producer's own detail modal and the buyer card both
 * showed the pass as a date, a label and an acreage. The grower answered the question and the
 * two screens that quote the record back said nothing. resolver.ts falls back to `extra_data`
 * only for fields it already knows, so an undeclared key fails silently and permanently.
 *
 * The second `describe` below is that check. It is the same crude text match, run backwards.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { businessEventRegistry } from '../businessEvent';
import { chemicalEventRegistry } from '../chemicalEvent';
import { equipmentEventRegistry } from '../equipmentEvent';
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
  'performed_by',
  // FSMA § 112.161(b) sign-off, collected by the SHARED `components/Forms/SupervisorSignOff`
  // component that ProductionTab, SoilManagementTab and PestManagementTab all mount — so the
  // names never appear in the tab source this test greps. (ChemicalTab-ENHANCED is the odd one
  // out: it has its own inline inputs, which is why chemical passed without this entry.)
  //
  // Added 2026-08-31 with the registry declarations. The three fields were declared in
  // chemicalEvent.ts only, so a grower who signed off a production, soil or pest record saw
  // nothing of it in their own modal even though the certifier packet prints it.
  'reviewed',
  'reviewer_name',
  'review_date'
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

// ============================================================================
// Reverse direction: the form collects it → the registry must declare it
// ============================================================================

/**
 * Names bound by a tab that render OUTSIDE the registry's fact grid, so having no field
 * config is correct. Each was checked against EventDetailsModal.tsx, not assumed.
 */
const RENDERED_OUTSIDE_THE_FACT_GRID: Record<string, string> = {
  name: 'the record title — getEventDisplayName() reads it (and extra_data.name/event_name)',
  type: 'the SUBTYPE selector; it picks which fields resolve, it is not one of them',
  is_summary: 'drives the "N activities" header badge (EventDetailsModal)',
  event_count: 'the number inside that badge',
  date_start: 'summary date RANGE in the modal header, printed instead of the single date',
  date_end: 'the other half of that range'
};

/**
 * Form-local input names that are deliberately different from the registry/serializer name.
 * These are the same aliases KNOWN_GAPS documents from the registry side — listed again here
 * because this direction reads the FORM's vocabulary, and neither list can see the other's.
 * Renaming either half means editing both.
 */
const FORM_ONLY_ALIASES: Record<string, string> = {
  production_method: 'registry `method` (production)',
  area_numeric: 'registry `area_treated` (chemical)',
  volume_numeric: 'registry `volume_applied` (chemical)',
  depth: 'registry `working_depth` (soil)',
  amendment_amount: 'registry `amendment_amount_numeric` (soil, legacy pair)',
  crop_growth_stage:
    'registry `growth_stage` (pest) — PestManagementTab writes the CommonEvent column from it ' +
    'since 2026-09-06; the pest registry also reads the legacy extra_data key for older rows',
  duration_hours: 'registry `duration` (general), remapped in NewEvent.onSubmit',
  participants: 'registry `people_involved` (general), remapped in NewEvent.onSubmit',
  // Rendered through a companion the read serializer derives, not through the raw input.
  equipment_cleaning_event:
    'a FK id; the modal renders `equipment_cleaning_event_label` (history/serializers.py)',
  receipt_document:
    'a FK id; the modal renders `receipt_document_title` (chemical + soil registries)',
  water_test_summary:
    'ProductionTab derives `water_test_results` from it at submit; the registry renders those'
};

/**
 * ⚠️ REAL GAPS, of the same class as the tillage block — a form collects the value and no
 * display surface declares it, so the farmer's answer renders nowhere. Surfaced by this test
 * on the day it was written and left listed rather than fixed blind: each needs its own
 * consumer/producer decision, and a wrong `consumer_card` is worse than a missing one.
 *
 * ⛔ This list only shrinks. An entry here is an admission, not a category.
 */
const UNDECLARED_OPEN: Record<string, string> = {
  // 2026-09-06: emptied. The summary-mode totals (chemical ×7, soil ×2, pest ×4), ffm_code,
  // action_recommended, pest variety, total_grazing_days and operation_efficiency are now
  // declared; economic_threshold_met was a second ask for the same fact as
  // action_threshold_met and the input was removed; the four FK / derived inputs are
  // FORM_ONLY_ALIASES. Add an entry here only with the fix that will remove it.
};

/** Every field name the registry knows about, across ALL event types. */
const ALL_DECLARED_NAMES = new Set(
  [
    businessEventRegistry,
    chemicalEventRegistry,
    equipmentEventRegistry,
    generalEventRegistry,
    pestEventRegistry,
    productionEventRegistry,
    soilEventRegistry,
    weatherEventRegistry
  ].flatMap((r) => r.fields.map((f) => f.name))
);

/**
 * Names a tab binds an input to. Same two shapes `collectsField` matches, and the same
 * comment strip — a commented-out input is not an input.
 */
const boundFieldNames = (source: string): string[] => {
  const code = stripComments(source);
  const names = new Set<string>();
  for (const re of [
    /register\(\s*['"`]([A-Za-z0-9_]+)['"`]/g,
    /name=\{?\s*['"`]([A-Za-z0-9_]+)['"`]/g
  ]) {
    for (const m of code.matchAll(re)) names.add(m[1]);
  }
  return [...names];
};

describe('every field a form tab collects is declared in the registry', () => {
  for (const tab of TABS) {
    it(`${tab.name} (${tab.file})`, () => {
      const source = readFileSync(join(FORMS_DIR, tab.file), 'utf8');

      const undeclared = boundFieldNames(source)
        // Companion units never render as their own row — `unitField` /
        // makeUnitPairFormatter append them to the value they belong to.
        .filter((name) => !name.endsWith('_unit'))
        .filter((name) => !RENDERED_OUTSIDE_THE_FACT_GRID[name])
        .filter((name) => !FORM_ONLY_ALIASES[name])
        .filter((name) => !ALL_DECLARED_NAMES.has(name))
        .filter((name) => !UNDECLARED_OPEN[`${tab.name}.${name}`])
        .sort();

      expect(
        undeclared,
        `${tab.file} collects these fields and no event registry declares them: ` +
          `${undeclared.join(', ')}. The value will save and render on NO surface — not the ` +
          `producer's detail modal, not the buyer card — because resolver.ts only falls back ` +
          `to extra_data for fields it already knows. Declare the field (choose its surfaces ` +
          `deliberately: a consumer_card tier is a publishing decision), or, if it really is ` +
          `form-internal, say so in FORM_ONLY_ALIASES / RENDERED_OUTSIDE_THE_FACT_GRID with ` +
          `the reason.`
      ).toEqual([]);
    });
  }

  it('every UNDECLARED_OPEN entry is still an actual gap', () => {
    // The list only shrinks. An entry that got declared, or whose input was deleted, must
    // leave — otherwise it stops being an admission and becomes camouflage.
    const stale: string[] = [];
    for (const key of Object.keys(UNDECLARED_OPEN)) {
      const [tabName, fieldName] = key.split(/\.(.*)/);
      const tab = TABS.find((t) => t.name === tabName);
      if (!tab) {
        stale.push(`${key} (no such tab)`);
        continue;
      }
      const source = readFileSync(join(FORMS_DIR, tab.file), 'utf8');
      if (ALL_DECLARED_NAMES.has(fieldName)) stale.push(`${key} (now declared — remove)`);
      else if (!collectsField(source, fieldName)) stale.push(`${key} (no longer collected)`);
    }

    expect(stale, `UNDECLARED_OPEN entries that are no longer gaps: ${stale.join(', ')}`).toEqual(
      []
    );
  });
});
