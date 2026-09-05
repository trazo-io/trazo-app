/**
 * WHICH FIELDS VOICE MAY ASK THE MODEL FOR, PER ACTIVITY.
 *
 * ─── Why this file exists ───────────────────────────────────────────────────
 *
 * MEASURED 2026-08-30, before it did. Voice could write eight fields, and the SAME eight on
 * every activity: the transcript into `observation`, plus area / fuel / duration / product /
 * method / yield where the legacy mapper happened to have a branch. Against what the forms
 * actually render that is:
 *
 *   fertilization      8 of 45      transport        1 of 18   (notes only)
 *   pesticide          8 of 45      pollination      1 of  9   (notes only)
 *   harvest            8 of 34      general          1 of 13   (notes only)
 *   soil_management    6 of 27      frost_protection 6 of 12
 *
 * The two fields a frost-protection record exists FOR — `protection_method` and
 * `low_temperature` — were unreachable. A farmer could say "we ran the wind machines, it got
 * down to twenty eight" and neither fact could land anywhere, because the parse response
 * carried a fixed set of ~12 generic keys and nothing else survived the boundary.
 *
 * ─── The shape of the fix ───────────────────────────────────────────────────
 *
 * The list below is the ONLY hand-maintained part. Everything else about a field — its label,
 * its value type, its enum options — is read from the display registry at request time, so a
 * field cannot be described to the model in terms the form does not use.
 *
 * ⛔ ALLOWLIST, never a denylist. A field that nobody has listed here is simply not requested,
 * which means a new form field's worst case is "voice does not fill it yet". Under a denylist
 * the worst case would be "voice fills a field nobody assessed", and on a certifier record
 * that is a fabricated answer. `.claude/rules/compliance.md` and the consumer-claim incidents
 * both point the same way: a denylist encodes only the last mistake.
 *
 * ─── What is deliberately NOT here ──────────────────────────────────────────
 *
 * VOICE_NEVER_FILLS below is not the mechanism (omission is), it is the WRITTEN REASON, and
 * the guard test asserts no entry above ever appears in it. Four groups:
 *
 *  1. ATTESTATIONS. `organic_approved`, `restricted_use_pesticide`, `rinse_step_documented`,
 *     `certifier_notified`, `reviewed`, every `seed_*` compliance status. These are claims a
 *     certifier reads as the operator's word. A mis-heard boolean is a false attestation, and
 *     `organic_approved` in particular resets the § 205.202(b) 36-month clock — it was already
 *     stripped out of the voice template defaults once for exactly that reason.
 *  2. PAPERWORK IDENTIFIERS. Lot numbers, invoice numbers, EPA registration numbers, contract
 *     and document references. Speech-to-text on a string of digits is the least reliable thing
 *     the pipeline does, and these are the fields an inspector traces.
 *  3. PEOPLE AND PLACES OF RECORD. `performed_by` (step 1 owns it), applicator, reviewer,
 *     supplier, lab, `site_id`. Names are transcribed badly and attributed permanently.
 *
 *     `block_id` WAS in this group and has moved out, because the objection was to free text and
 *     the field is not free text to voice. The parcel serves `known_block_ids` — the blocks this
 *     parcel has actually used — so voice picks from a closed vocabulary the same way the chips
 *     under the input do. A spoken block that is not in that list fills nothing.
 *     ⛔ EXACT matching only, never fuzzy. MEASURED 2026-08-30: "in the VGA block" against a
 *     parcel whose only block is BGA. One edit apart, and "correcting" it would invent the lot a
 *     record belongs to — this value becomes CA PUR box 22 and is what links the record to a lot
 *     in the certifier packet.
 *  4. DATES OTHER THAN THE EVENT'S OWN. Purchase dates, placement/removal dates, review dates.
 *     The record's date is collected in step 1; a second spoken date parsed loosely lands on a
 *     § 205.103 traceback.
 *
 * Booleans are absent from every list on purpose: there is no such thing as a low-confidence
 * yes/no on a form the farmer will not re-read.
 */

import { getEnumOptions } from './enums';
import { APPLICATION_TIMING_LABELS, WEATHER_CONDITIONS_LABELS } from './chemicalEvent';
import {
  EQUIPMENT_OPERATION_TYPE_LABELS,
  FLOOR_MANAGEMENT_LABELS,
  PROCESSING_TYPE_LABELS,
  PROTECTION_METHOD_LABELS
} from './productionEvent';
import { SOIL_TEXTURE_LABELS } from './soilEvent';
import { getFieldConfig, getFieldNamesForSurface } from './resolver';
import type { AnySubtype, EventTypeCode } from './registry';

/**
 * Fields voice may ask about, keyed by VOICE_TYPE_MAP slug.
 *
 * Every entry is a measurement or a category a farmer says out loud while doing the work.
 * Fields the legacy structured mapping already fills (area_covered, fuel_consumed,
 * equipment_hours, yield_quantity, commercial_name, application_method, irrigation_method,
 * water_source, concentration, observation) are NOT repeated here — one source per field.
 */
export const VOICE_ACTIVITY_FIELDS: Record<string, readonly string[]> = {
  // ── Chemical family ────────────────────────────────────────────────────────
  // `application_purpose` is NOT here — see VOICE_NEVER_FILLS. It is answered from the ACTIVITY
  // rather than from the words, every single run.
  fertilization: ['nitrogen_percentage', 'phosphorus_percentage', 'potassium_percentage'],
  fertilizer: ['nitrogen_percentage', 'phosphorus_percentage', 'potassium_percentage'],
  pesticide: ['target_pest_disease'],
  herbicide: ['target_pest_disease'],
  fungicide: ['target_pest_disease'],
  // ⛔ `application_rate` is NOT here and must not be added. It pairs with
  // `application_rate_unit`, so `buildVoiceFieldRequests` would skip it anyway (see the
  // unitField rule below) — but the deeper reason is that it does not need asking. The mapper
  // already detects a rate DETERMINISTICALLY, from the words: `spokenRateDenominator` finds the
  // "an acre" that makes six fluid ounces a rate, and `rateUnitCode` turns the pair into one
  // catalogue value. Asking the model for the same fact would replace a test over the transcript
  // with a second opinion about it, on the field whose whole existence is a rate being mistaken
  // for a total.

  // ── Production family ──────────────────────────────────────────────────────
  // `water_volume_total` is NOT here: it renders only in Irrigation Summary Mode
  // (`visibleWhen: is_summary`), and a field the farmer cannot see is a field they cannot
  // correct. Summary mode is a different way of logging — several irrigations at once — and the
  // farmer turns it on deliberately; voice describing one pass has no business filling it.
  // `irrigation_depth` is NOT here, and neither are `transportation_distance` or
  // `working_depth` below: each pairs with a separate unit field, and a request cannot carry the
  // pair (see the `unitField` skip in buildVoiceFieldRequests). Depth still fills from the spoken
  // amount when the farmer names a unit the mapper recognises — that path keeps them together.
  irrigation: ['electricity_source'],
  // `storage_location` and `storage_temperature_f` are NOT here: both render only once
  // `harvest_destination` says the crop was stored. Voice fills a whole payload at once, so they
  // MIGHT become visible — and might not, if the model reads the destination differently. A
  // field whose reviewability depends on the model getting a second field right is not reviewable.
  harvest: [
    'harvest_quality_grade',
    'brix_level',
    'dry_matter_percentage',
    'grain_moisture',
    'harvest_destination'
  ],
  // `temperature_control` is deliberately absent: it is a boolean, and there is no such thing
  // as a low-confidence yes/no on a certifier record.
  post_harvest: ['processing_type', 'processing_duration_hours'],
  planting: ['plants_established', 'plant_spacing', 'rootstock', 'variety', 'method'],
  transplanting: ['plants_established', 'plant_spacing', 'rootstock', 'variety', 'method'],
  // `pruning_passes` is summary-mode only (`visibleWhen: is_summary`), like water volume.
  pruning: ['method'],
  cultivation: ['method'],
  thinning: ['method'],
  mowing: ['floor_management_type', 'method'],
  // The whole point of the record, and both were unreachable until now.
  frost_protection: ['protection_method', 'low_temperature'],
  // Placement and removal DATES are excluded on purpose — see group 4 above. The count and the
  // kind of pollinator are what a grower says; the dates get typed.
  pollination: ['pollinator_type', 'hive_count'],
  // `quantity_sent_to_handler` renders conditionally; see the visibleWhen rule above.
  transport: ['harvest_destination'],
  // Four cleaning fields are gone from this list — `cleaning_method`, `cleaning_materials_used`,
  // `purge_material`, `purge_quantity` — because each renders only for the matching operation
  // type. That leaves equipment thin on purpose: a cleanout record's details are worth typing
  // where the farmer can see the form decide what to ask.
  equipment: ['equipment_type', 'equipment_operation_type', 'sanitizer_name', 'sanitizer_ppm'],

  // ── Soil ───────────────────────────────────────────────────────────────────
  soil_management: ['soil_ph', 'organic_matter_percentage', 'soil_texture'],

  // ── General ────────────────────────────────────────────────────────────────
  general: ['activity_type', 'duration', 'people_involved']
};

/**
 * The written reasons. NOT the enforcement — omission from VOICE_ACTIVITY_FIELDS is what
 * actually keeps these out — but `voiceFieldRequests.test.ts` asserts the two never overlap,
 * so adding one of these to an activity list fails the build rather than shipping quietly.
 *
 * Grouped by why, because "why not" is the part that has to survive the next person.
 */
export const VOICE_NEVER_FILLS: Record<string, string> = {
  // 1. Attestations — a mis-heard yes/no is a false statement on a certifier record
  organic_approved: 'compliance claim; drives the § 205.202(b) 36-month clock',
  restricted_use_pesticide: 'regulatory status, not an observation',
  applicator_certification: 'regulatory status of a person',
  rinse_step_documented: 'attestation that a cleaning step happened',
  shared_with_conventional: 'split-operation attestation',
  certifier_notified: 'attestation about contacting the certifier',
  reviewed: 'internal review attestation',
  is_contamination_incident: 'opens a § 205.202 contamination record',
  contamination_source: 'part of a contamination finding',
  contamination_affected_area: 'part of a contamination finding',
  corrective_action_taken: 'part of a contamination finding',
  corrective_action_date: 'part of a contamination finding',
  seeds_source: '§ 205.204 organic-seed status',
  seed_non_gmo_status: '§ 205.105 exclusion claim',
  seed_certification_status: '§ 205.204 certification claim',
  seed_treatment: '§ 205.204 treatment claim',
  seed_treatment_allowed_basis: '§ 205.204 allowance basis',
  seed_nonavailability_reason: '§ 205.204 commercial-availability justification',
  stock_organic_management_start: 'starts a transition clock',
  buffer_disposition: '§ 205.202 buffer-crop disposition claim',
  buffer_disposition_quantity: '§ 205.202 buffer-crop disposition claim',
  buffer_disposition_evidence: '§ 205.202 buffer-crop disposition evidence',
  sanitizer_nop_reference: 'cites a National List entry',
  cleaning_protocol_reference: 'cites a written protocol',

  // 1b. Values the MODEL knows and the farmer did not say.
  //
  // MEASURED 2026-09-01, twice, on the same demo utterance ("Sprayed Kocide 3000-O on the east
  // block, three and a half pounds an acre, air-blast, for walnut blight"): the parser returned
  // rei_hours=24, phi_days=0 on one run and phi_days=14 on the next — from a sentence containing
  // no interval at all. It recognised the product and recalled its label, helpfully and wrongly,
  // and disagreed with itself between runs. A prompt rule forbidding it ("do not use product
  // knowledge") fixed one run and not the other, which is the whole argument: an instruction is
  // not a control.
  //
  // These are the fields where that recall is most dangerous, because each is read as the
  // operator's own statement: REI and PHI are regulatory intervals an inspector checks, weather
  // is what a drift complaint turns on, and the active ingredient decides whether a material is
  // restricted under § 205.601. A farmer who does say "twelve hour REI" now types it — that is
  // the cost, and it is smaller than a remembered number on a spray record.
  rei_hours: "label value the model recalls; regulatory interval read as the operator's statement",
  phi_days: "label value the model recalls; regulatory interval read as the operator's statement",
  weather_conditions:
    'invented on every run from sentences with no weather in them; drift-relevant',
  application_timing: 'inferred from the practice rather than heard',
  // MEASURED 2026-09-02, five utterances, three activities, zero variation: the answer is the
  // ACTIVITY SLUG restated as an enum value. "Sprayed Entrust on the east block. Six fluid
  // ounces an acre, airblast." — a sentence containing no reason at all — returned
  // `pest_management`; the same sentence under `fungicide` returned `disease_management`, under
  // `herbicide` `weed_management`. The model is not hearing a purpose, it is reading the tile
  // the farmer already tapped in step 1 and echoing it back.
  //
  // Two reasons that is worse than leaving it blank. It carries NO information from the farmer,
  // so the "N fields filled" count overstates what voice actually heard — and the farmer skims
  // that list instead of the form. And on a § 205.601 material this field is the operator's
  // stated JUSTIFICATION for using a restricted input, which a certifier reads as their word.
  // What the farmer genuinely says about why lands in `target_pest_disease` ("for walnut
  // blight", "for codling moth"), which is still requested and still fills from the words.
  application_purpose:
    "restates the chosen activity, not the words; read as the operator's § 205.601 justification",
  active_ingredient:
    'a property of the product, not of the event — the input catalogue is the verified source',

  // 2. Paperwork identifiers — speech-to-text is least reliable exactly here
  chemical_lot_number: 'identifier an inspector traces',
  seed_lot_number: 'identifier an inspector traces',
  harvest_lot_code: 'identifier an inspector traces',
  harvest_contract_number: 'identifier an inspector traces',
  handler_document_reference: 'identifier an inspector traces',
  purchase_invoice: 'identifier an inspector traces',
  seed_purchase_invoice: 'identifier an inspector traces',
  epa_registration_number: 'regulatory identifier',
  lab_sample_id: 'identifier an inspector traces',
  lab_report_date: 'date on a document, not an observation',

  // 3. People and places of record
  performed_by: 'collected in step 1, and names transcribe badly',
  applicator_name: 'attributes a regulated act to a person',
  authorizer_name: 'attributes authorisation to a person',
  reviewer_name: 'attributes a review to a person',
  cleaned_by: 'attributes a cleaning to a person',
  supplier_name: 'trading partner of record',
  seed_supplier_name: 'trading partner of record',
  manufacturer: 'trading partner of record',
  lab_name: 'trading partner of record',
  operator_id: 'regulatory identifier (CA PUR)',
  site_id: 'regulatory identifier (CA PUR)',
  application_county: 'regulatory jurisdiction (CA PUR)',
  operator_is_custom: 'who ran the pass — see the custom-operator section of the form',
  applied_by_pcb:
    'attributes a regulated act to a pest control business, and it changes who files the CA PUR',
  pcb_name: 'trading partner of record, and it changes who files the CA PUR',
  name: 'auto-generated from the activity; not dictated',

  // 4. Dates other than the event's own
  purchase_date: 'second date; the record already has one from step 1',
  seed_purchase_date: 'second date; the record already has one from step 1',
  review_date: 'second date; the record already has one from step 1',
  placement_date: 'second date; the record already has one from step 1',
  removal_date: 'second date; the record already has one from step 1',
  cleaning_date: 'second date; the record already has one from step 1',
  harvest_date_end: 'second date; the record already has one from step 1',
  sent_to_handler_date: 'second date; the record already has one from step 1',
  water_test_date: 'second date; the record already has one from step 1',
  application_start: 'second timestamp; the record already has one from step 1',
  application_end: 'second timestamp; the record already has one from step 1'
};

/**
 * Enum catalogues that live beside their FORMATTER rather than in `ENUM_OPTIONS`.
 *
 * Seven of the fields listed above are `valueType: 'enum'` with no `enumSource`: their allowed
 * values sit in a module-local label map next to the formatter that renders them, each one
 * documented as mirroring the form's own `<option>` list. Read from those maps rather than
 * retyped here — a second copy of an option list is how a dropdown and its validator drift.
 *
 * (Moving them into `ENUM_OPTIONS` proper would be the tidier home, but it needs an i18n
 * labelKey per option in both locales, which is a registry change with its own guards. This is
 * the same values, read from the same place the form reads them.)
 */
const FORMATTER_ENUM_VALUES: Record<string, readonly string[]> = {
  protection_method: Object.keys(PROTECTION_METHOD_LABELS),
  floor_management_type: Object.keys(FLOOR_MANAGEMENT_LABELS),
  processing_type: Object.keys(PROCESSING_TYPE_LABELS),
  equipment_operation_type: Object.keys(EQUIPMENT_OPERATION_TYPE_LABELS),
  application_timing: Object.keys(APPLICATION_TIMING_LABELS),
  weather_conditions: Object.keys(WEATHER_CONDITIONS_LABELS),
  soil_texture: Object.keys(SOIL_TEXTURE_LABELS)
};

/**
 * Enums whose VALUE is the farmer's own word, so the word has to be in the sentence.
 *
 * Most enums are CLASSIFICATIONS and paraphrase is the point — "going to the packing house"
 * legitimately becomes `harvest_destination: handler`, and nothing in that answer is echoed in
 * the words. Demanding an echo there would break the feature.
 *
 * These are the other kind: the option list is the vocabulary of the practice itself, so an
 * answer with no trace in the sentence did not come from the farmer.
 *
 * MEASURED 2026-09-02, deterministic across runs and across two utterances chosen to contain no
 * mowing verb at all:
 *
 *   "Went through the middles this morning with the tractor."  -> floor_management_type: "mow"
 *   "Took care of the orchard floor on the east block today."  -> floor_management_type: "mow"
 *
 * The model was answering from the tile tapped in step 1, not from the words. Two prompt rules
 * aimed straight at it changed nothing — the same lesson `block_id` already carries: an
 * instruction is not a control.
 *
 * Retiring the field was the other option and it is the wrong one. Given actual evidence the
 * model is RIGHT, and right about the answers that matter most:
 *
 *   "Mowed down the cover crop between the rows."  -> cover_crop_mgmt   ✓
 *   "Mulched the middles with the chipper."        -> mulch             ✓
 *   "Flail mowed the middles."                     -> mow               ✓
 *
 * ⚠️ `protection_method` is deliberately NOT here, though it looks like the same shape. A
 * grower says "ran the fans", and `wind_machine` shares no word with "fans" — this gate would
 * throw away a correct answer. Its own failure (an invented "other") was fixed by the catalogue
 * rule instead. Add a field here only after measuring that its real phrasings survive.
 */
export const VOICE_ENUMS_MUST_ECHO_WORDS: ReadonlySet<string> = new Set(['floor_management_type']);

/** One field, described to the model in the form's own terms. */
export interface VoiceFieldRequest {
  name: string;
  /** English label, resolved from the registry's labelKey by the caller. */
  label: string;
  /** 'number' | 'text' | 'enum' — narrowed from the registry's valueType. */
  type: 'number' | 'text' | 'enum';
  /** For enums: the ONLY values that will be accepted back. */
  options?: string[];
}

/**
 * Build the field list to send with a voice request.
 *
 * Two filters, both necessary:
 *  1. the activity's allowlist above, and
 *  2. what the FORM actually renders for this exact (event type, subtype) — because a field
 *     the farmer cannot see is a field the render gate would drop on arrival anyway, and
 *     asking for it would spend prompt budget on a value with nowhere to go.
 *
 * Booleans and dates are dropped even if listed: see the header. Anything whose registry entry
 * cannot be resolved is dropped rather than guessed.
 */
export function buildVoiceFieldRequests(
  eventType: EventTypeCode,
  subtype: AnySubtype | undefined,
  activitySlug: string | null | undefined,
  translate: (labelKey: string) => string,
  options: { knownBlockIds?: readonly string[] } = {}
): VoiceFieldRequest[] {
  // No activity, no context: soil, pest and business ask their subtype inside the tab, and a
  // request built against a guess is worse than no request.
  if (!activitySlug) return [];

  // Two different "nothing"s, and they are not the same answer.
  //
  // An activity this file does not know is one we cannot ask about at all — including its block.
  // But an activity that IS known and simply lists no fields must still get the block question,
  // because `block_id` is appended after the loop below: an early `return []` on an empty list
  // would have silently stopped asking for it the first time somebody emptied a list. That nearly
  // happened this week, when five recall-prone fields were retired from the chemical lists.
  const wanted = VOICE_ACTIVITY_FIELDS[activitySlug];
  if (!wanted) return [];

  const rendered = new Set(getFieldNamesForSurface(eventType, subtype, 'form'));
  const requests: VoiceFieldRequest[] = [];

  for (const name of wanted) {
    if (!rendered.has(name)) continue;
    const cfg = getFieldConfig(eventType, name);
    if (!cfg) continue;

    // ⛔ A field whose visibility depends on OTHER form state cannot be asked for.
    //
    // MEASURED 2026-09-01 against the live form: `water_volume_total` is listed on the `form`
    // surface for irrigation, so `getFieldNamesForSurface` returns it and the render gate keeps
    // it — but its `visibleWhen` predicate is `is_summary`, so it renders only in Irrigation
    // Summary Mode. With the toggle off the model answered it anyway (2, from "two inches of
    // water" — which is a DEPTH, so the value was wrong as well as invisible) and it would have
    // been written to a record the farmer never saw. That is the exact failure the gate exists
    // to prevent, and the gate cannot catch it: `visibleWhen` is a runtime predicate over an
    // event object that does not exist yet at request time.
    //
    // The rule is not about this one field. Anything conditional is unreviewable at the moment
    // we ask, so it is never asked for — `voiceFieldRequests.test.ts` fails if one is listed.
    if (cfg.visibleWhen) continue;

    // ⛔ A bare number is not an amount when the form stores its unit separately.
    //
    // MEASURED 2026-09-01 on a Spanish utterance: "unos cinco centímetros" came back as
    // `irrigation_depth: 5`, with no unit. The form pairs that field with
    // `irrigation_depth_unit`, which defaults to inches — so 5 cm would have been recorded as
    // 5 INCHES, a 2.5x error on a certifier record, and a plausible-looking one.
    //
    // Unit companions have no display-registry entry of their own (the form renders them inline
    // beside the value), so there is nothing to ASK for alongside the number. Until a request can
    // carry the pair, the number is not askable: `irrigation_depth`, `transportation_distance`
    // and `working_depth` are typed, and the farmer sees the unit while they do it.
    if (cfg.unitField) continue;

    let type: VoiceFieldRequest['type'];
    if (cfg.valueType === 'number') type = 'number';
    else if (cfg.valueType === 'enum') type = 'enum';
    else if (cfg.valueType === 'string' || cfg.valueType === 'text') type = 'text';
    else continue; // boolean, date, date-time — never asked for

    const label = cfg.labelKey ? translate(cfg.labelKey) : name;
    const request: VoiceFieldRequest = { name, label: label || name, type };

    if (type === 'enum') {
      const options = cfg.enumSource
        ? getEnumOptions(cfg.enumSource as never)?.map((o) => o.value)
        : FORMATTER_ENUM_VALUES[name];
      // An enum with no catalogue cannot be validated on the way back, and an unvalidated
      // enum is a free-text field wearing a dropdown's name. Drop it.
      if (!options || options.length === 0) continue;
      // Copied, not referenced: FORMATTER_ENUM_VALUES hands back the registry's own array, and
      // this one is serialised into a request body and then read back to validate the answer.
      request.options = [...options];
    }

    requests.push(request);
  }

  // `block_id` is the one field asked for as an ENUM despite being `string` in the registry.
  //
  // It is free text in the form because a block used for the first time has to be typeable. It
  // is NOT free text to voice: the parcel serves `known_block_ids`, the blocks it has actually
  // used, and `history/services/block_ids.py` exists precisely because free text with no
  // vocabulary degrades ("Block 3" in March, "blk 3" in July, and a certifier's question about
  // Block 3 returns a third of the record). Sending that list makes voice pick from the grower's
  // own vocabulary, exactly like the chips under the input.
  //
  // No list, no request — a parcel with no history has nothing to match against, and asking for
  // an open-ended identifier is how a mis-heard letter becomes the lot a record belongs to.
  const knownBlockIds = (options.knownBlockIds ?? []).filter(
    (id) => typeof id === 'string' && id.trim() !== ''
  );
  const alreadyAsked = requests.some((r) => r.name === 'block_id');
  if (!alreadyAsked && knownBlockIds.length > 0 && rendered.has('block_id')) {
    const cfg = getFieldConfig(eventType, 'block_id');
    if (cfg?.labelKey) {
      requests.push({
        name: 'block_id',
        label: translate(cfg.labelKey) || 'block_id',
        type: 'enum',
        options: [...knownBlockIds]
      });
    }
  }

  return requests;
}
