/**
 * Voice Data Mapper Utility
 *
 * Maps AI-extracted voice data to form field values compatible with
 * the quickEventFields.ts / TypeAwareFields pipeline.
 *
 * This replaces the hardcoded convertToEventStructure() that was in
 * VoiceEventCapture.tsx, integrating voice events into the standard
 * template-based form flow.
 */

import { getDefaultFieldValues } from '../config/quickEventFields';
import { PREFILLABLE_FIELDS } from '../config/events/templateAccelerators';
import { getFieldNamesForSurface, getSubtypes } from '../config/events';
import type { AnySubtype, EventTypeCode } from '../config/events';

/** Structured amount from AI response */
export interface StructuredAmount {
  value: number;
  unit: string;
  category: 'weight' | 'volume' | 'area' | 'time' | string;
}

/** AI-parsed voice event data (from backend) */
export interface ParsedVoiceData {
  type: string;
  description: string;
  date: string;
  detected_amounts: Array<StructuredAmount | string>;
  detected_products: string[];
  detected_systems?: string[];
  confidence: number;
  npk_ratio?: string | null;
  concentration?: string | null;
  commercial_name?: string | null;
  application_method?: string | null;
  water_source?: string | null;
  area_covered?: { value: number; unit: string } | string | null;
  duration?: { value: number; unit: string } | string | null;
  fuel_amount?: { value: number; unit: string } | null;
  processing_time?: number;
  source?: string;
  original_transcript?: string;
}

/** Voice-to-template mapping result */
export interface VoiceTemplateMapping {
  templateId: string;
  backendEventType: number;
  backendSubtype: string;
  /**
   * Key into `activities.verb.*` — the SAME label the verb picker shows, and the only
   * name this map carries. It replaced a parallel `displayName` set of hardcoded English
   * strings ('Fertilizer Application', 'Harvest', …) that could not be translated and had
   * drifted from the verb tiles the farmer actually picks from. Keys live in ACTIVITY_VERBS.
   */
  verbKey: string;
}

/** Result from mapVoiceDataToFieldValues including which fields were AI-overridden */
export interface VoiceFieldMappingResult {
  values: Record<string, unknown>;
  overriddenFields: string[];
}

// ============================================================================
// TRANSCRIPT POST-PROCESSING
// ============================================================================

/**
 * Fix common speech-to-text transcription errors for agricultural terminology.
 * Applied before sending transcript to backend AI.
 */
export function postProcessTranscript(transcript: string): string {
  let processed = transcript;

  // Word numbers to digits (common in speech)
  const wordNumbers: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60'
  };

  // Fix NPK with word numbers: "NPK ten ten ten" → "NPK 10-10-10"
  processed = processed.replace(
    /\b(?:npk|n\.?p\.?k\.?)\s+(\w+)\s+(\w+)\s+(\w+)\b/gi,
    (match, n, p, k) => {
      const nVal = wordNumbers[n.toLowerCase()] || n;
      const pVal = wordNumbers[p.toLowerCase()] || p;
      const kVal = wordNumbers[k.toLowerCase()] || k;
      if (/^\d+$/.test(nVal) && /^\d+$/.test(pVal) && /^\d+$/.test(kVal)) {
        return `NPK ${nVal}-${pVal}-${kVal}`;
      }
      return match;
    }
  );

  // Fix "NPK 101010" → "NPK 10-10-10" (6 digits)
  processed = processed.replace(/\bNPK\s*(\d{2})(\d{2})(\d{2})\b/gi, 'NPK $1-$2-$3');

  // Fix "NPK 1010" → "NPK 10-10" (4 digits, likely missing last number)
  // But only if not already hyphenated
  processed = processed.replace(/\bNPK\s*(\d{2})(\d{2})\b(?!-)/gi, 'NPK $1-$2-$1');

  // Fix "NPK 10 10 10" → "NPK 10-10-10" (space-separated)
  processed = processed.replace(/\bNPK\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\b/gi, 'NPK $1-$2-$3');

  // Fix "dash" spoken literally: "10 dash 10 dash 10" → "10-10-10"
  processed = processed.replace(/(\d+)\s*dash\s*(\d+)\s*dash\s*(\d+)/gi, '$1-$2-$3');

  return processed;
}

// ============================================================================
// VOICE TYPE TO TEMPLATE MAPPING
// ============================================================================

/** Maps AI-detected voice event types to quickEventFields template IDs */
export const VOICE_TYPE_MAP: Record<string, VoiceTemplateMapping> = {
  fertilization: {
    templateId: 'fertilization',
    backendEventType: 2,
    backendSubtype: 'FE',
    verbKey: 'input_application'
  },
  fertilizer: {
    templateId: 'fertilization',
    backendEventType: 2,
    backendSubtype: 'FE',
    verbKey: 'input_application'
  },
  irrigation: {
    templateId: 'irrigation',
    backendEventType: 1,
    backendSubtype: 'IR',
    verbKey: 'irrigation'
  },
  pesticide: {
    templateId: 'pest_control',
    backendEventType: 2,
    backendSubtype: 'PE',
    verbKey: 'input_application'
  },
  herbicide: {
    templateId: 'herbicide',
    backendEventType: 2,
    backendSubtype: 'HE',
    verbKey: 'input_application'
  },
  fungicide: {
    templateId: 'fungicide',
    backendEventType: 2,
    backendSubtype: 'FU',
    verbKey: 'input_application'
  },
  equipment: {
    templateId: 'cultivation',
    backendEventType: 1,
    backendSubtype: 'EM',
    verbKey: 'cleanout'
  },
  harvest: {
    templateId: 'harvest',
    backendEventType: 1,
    backendSubtype: 'HA',
    verbKey: 'harvest'
  },
  planting: {
    templateId: 'planting',
    backendEventType: 1,
    backendSubtype: 'PL',
    verbKey: 'planting'
  },
  pruning: {
    templateId: 'pruning',
    backendEventType: 1,
    backendSubtype: 'PR',
    verbKey: 'pruning'
  },
  transplanting: {
    templateId: 'transplanting',
    backendEventType: 1,
    backendSubtype: 'TR',
    verbKey: 'planting'
  },
  cultivation: {
    templateId: 'cultivation',
    backendEventType: 1,
    backendSubtype: 'CU',
    verbKey: 'field_work'
  },
  thinning: {
    templateId: 'thinning',
    backendEventType: 1,
    backendSubtype: 'TH',
    verbKey: 'field_work'
  },
  // 2026-08-26 — five subtypes the parser previously could not name, so every utterance
  // about them came back `general` and voice filled nothing at all on those tiles.
  //
  // Field prefill is claimed only where the subtype RENDERS the field (checked against
  // getFieldNamesForSurface, and enforced at merge time by gateVoiceOverridesToForm):
  // FP / MO / PH render area_covered, fuel_consumed and equipment_hours, and PH also renders
  // yield_quantity. TP and PO render neither — a transport records a destination and a
  // handler reference, a pollination records hive counts — so those two ROUTE only, and the
  // transcript reaches the notes box instead. Claiming acreage on a hive placement would be
  // a fabricated measurement, which is the whole point of the gate.
  transport: {
    templateId: 'transport',
    backendEventType: 1,
    backendSubtype: 'TP',
    verbKey: 'transport'
  },
  pollination: {
    templateId: 'pollination',
    backendEventType: 1,
    backendSubtype: 'PO',
    verbKey: 'pollination'
  },
  frost_protection: {
    templateId: 'frost_protection',
    backendEventType: 1,
    backendSubtype: 'FP',
    verbKey: 'frost_protection'
  },
  mowing: {
    templateId: 'mowing',
    backendEventType: 1,
    backendSubtype: 'MO',
    verbKey: 'field_work'
  },
  post_harvest: {
    templateId: 'post_harvest',
    backendEventType: 1,
    backendSubtype: 'PH',
    verbKey: 'harvest'
  },
  soil_management: {
    templateId: 'cultivation',
    backendEventType: 5,
    backendSubtype: 'ST',
    verbKey: 'soil'
  },
  general: {
    templateId: 'general_documentation',
    backendEventType: 3,
    backendSubtype: '',
    verbKey: 'other'
  }
};

/**
 * Normalise a parser-supplied type to a key this map really OWNS.
 *
 * `in` and plain indexing both walk the prototype chain, and the parser's type string is
 * not a trusted enum — it is whatever came back from GPT or a keyword fallback. MEASURED:
 * `'constructor'` survived `normalized in VOICE_TYPE_MAP`, and
 * `VOICE_TYPE_MAP['constructor']` returned the Object CONSTRUCTOR as the mapping, so
 * `templateId`, `backendEventType` and `verbKey` all came back `undefined` — which would
 * have rendered `activities.verb.undefined` as a raw message id. (`'toString'` slipped past
 * only because `.toLowerCase()` turns it into `tostring`, which is nobody's prototype key —
 * the kind of near-miss that makes a bug look absent.)
 *
 * Returns `''` for anything the map does not own itself, so callers can treat unknown and
 * unrecognised as the same thing.
 */
function normalizeVoiceType(voiceType: string): string {
  const normalized = (voiceType || '').toLowerCase().trim();
  return Object.prototype.hasOwnProperty.call(VOICE_TYPE_MAP, normalized) ? normalized : '';
}

/**
 * Maps AI-detected voice type to a quickEventFields template ID.
 *
 * Unrecognised input falls through to `general`. That fallback is load-bearing and easy to
 * misread — see `isRecognizedVoiceType`.
 */
export function mapVoiceTypeToTemplate(voiceType: string): VoiceTemplateMapping {
  return VOICE_TYPE_MAP[normalizeVoiceType(voiceType)] || VOICE_TYPE_MAP['general'];
}

/**
 * i18n key naming the activity the parser heard, for the "Sounds like: …" confirmation.
 *
 * Prefers the SUBTYPE label from the display registry over the verb-tile label, because the
 * verb tile is deliberately broader than the activity: a fertilizer utterance maps to the
 * `input_application` tile, whose label is "Input application" — true, but vaguer than what
 * the farmer just said. The registry knows 'FE' is "Fertilizer Application", and knows it in
 * both locales (pinned by registryLabelKeysExist.test.ts).
 *
 * This replaced a hardcoded English `displayName` on every map entry. Falls back to the verb
 * label for entries with no subtype — `general` is the only one.
 */
export function voiceActivityLabelKey(mapping: VoiceTemplateMapping): string {
  if (mapping.backendSubtype) {
    const entry = getSubtypes(mapping.backendEventType as never)?.find(
      (s) => s.code === mapping.backendSubtype
    );
    if (entry?.labelKey) return entry.labelKey;
  }
  return `activities.verb.${mapping.verbKey}`;
}

/**
 * Did the parser actually RECOGNISE the activity, or fall through to `general`?
 *
 * `general` is both a real event type and this map's default, so it means "I did not
 * recognise that" far more often than it means "the farmer logged a general activity".
 * The backend's GPT prompt enumerates thirteen activities, and the production subtypes
 * added since — PO, PH, CM, FP, MO, TP, BU, SS — are in none of them. So a farmer who
 * correctly picks the Transport tile and says "hauled three bins to the huller" gets
 * `general` back.
 *
 * Treating that as a detected activity made the mismatch notice offer to switch a farmer
 * OFF the right form and onto "Other farm activities" — advice generated from ignorance.
 * A fallback is not a suggestion, so the caller must not raise one from it.
 */
export function isRecognizedVoiceType(voiceType: string): boolean {
  const normalized = normalizeVoiceType(voiceType);
  return normalized !== 'general' && normalized !== '';
}

/**
 * Does what voice heard describe a DIFFERENT ACTIVITY than the one being logged — i.e. does
 * the farmer deserve the "switch to X" offer?
 *
 * MEASURED 2026-08-30. The caller used to ask only `mapping.backendEventType !== eventTypeId`.
 * A farmer on Frost Protection said "irrigated the field for six hours with the drip system":
 * Irrigation (IR) and Frost Protection (FP) are BOTH production, event type 1, so that test
 * was false, no notice appeared, and the panel announced "Sounds like: Irrigation" over a
 * Frost Protection form. The render gate then dropped every irrigation field and the banner
 * said "1 fields filled" — the transcript, in the notes box. Nothing said the activity itself
 * was wrong.
 *
 * Since the activity-verb pivot the farmer picks a VERB, and eleven of the seventeen tiles are
 * production subtypes: the subtype IS the activity, so it has to be part of this comparison.
 *
 * Three cases stay silent, each for its own reason:
 *   - `general` — ignorance, not a detection (see isRecognizedVoiceType above);
 *   - an unknown current subtype — soil, pest and business ask theirs INSIDE the tab, so voice
 *     can run before one exists, and there is nothing yet to disagree with;
 *   - a different subtype under the SAME verb tile (field_work is CU/TH/MO) — the tile is
 *     already right, and the notice would name the activity the farmer is on. Its own subtype
 *     select is where that gets corrected.
 */
/**
 * The INVERSE of VOICE_TYPE_MAP: which voice-type slug names the activity the farmer already
 * picked. Derived from that map rather than written out again, so the two cannot drift.
 *
 * Why this exists: since the voice trigger moved INSIDE step 2, the activity is already known
 * when the microphone opens — the farmer chose a verb tile (and, for production, a subtype) at
 * step 1. The parser was still being asked to work it out from the words alone, and the render
 * gate then threw away everything that did not belong to the activity actually being logged.
 * Telling the model what is being logged turns a classification problem into an extraction one.
 *
 * ⛔ It is passed as CONTEXT, never as the answer — see the backend prompt. The model still
 * reports what it heard, which is what keeps `shouldOfferActivitySwitch` able to catch an
 * irrigation sentence spoken into a frost-protection form.
 *
 * Aliases (fertilization/fertilizer both → FE) resolve to whichever key VOICE_TYPE_MAP declares
 * first; `voiceTypeForActivityIsStable` in the tests pins that they agree on the mapping.
 */
export function voiceTypeForActivity(
  eventTypeId: number,
  subtypeCode?: string | null
): string | null {
  for (const [slug, mapping] of Object.entries(VOICE_TYPE_MAP)) {
    if (mapping.backendEventType !== eventTypeId) continue;
    if (subtypeCode) {
      if (mapping.backendSubtype === subtypeCode) return slug;
      continue;
    }
    // No subtype in hand. Only an entry that HAS no subtype of its own (general documentation)
    // names an activity on its own terms; anything else would be picking one of several
    // subtypes for the farmer — soil, pest and business ask theirs inside the tab, and a guess
    // in the prompt is worse than no context at all.
    if (!mapping.backendSubtype) return slug;
  }
  return null;
}

export function shouldOfferActivitySwitch(
  mapping: VoiceTemplateMapping,
  voiceType: string,
  eventTypeId: number,
  subtypeCode?: string | null,
  pickedVerbKey?: string | null
): boolean {
  if (!isRecognizedVoiceType(voiceType)) return false;
  const sameActivity =
    mapping.backendEventType === eventTypeId &&
    (!mapping.backendSubtype || !subtypeCode || mapping.backendSubtype === subtypeCode);
  if (sameActivity) return false;
  if (pickedVerbKey && mapping.verbKey === pickedVerbKey) return false;
  return true;
}

// ============================================================================
// AMOUNT EXTRACTION
// ============================================================================

/** Unit normalization mapping */
const UNIT_NORMALIZE: Record<string, string> = {
  pounds: 'lb',
  pound: 'lb',
  lbs: 'lb',
  lb: 'lb',
  kilograms: 'kg',
  kilogram: 'kg',
  kg: 'kg',
  tons: 'tons',
  ton: 'tons',
  gallons: 'gal',
  gallon: 'gal',
  gal: 'gal',
  liters: 'L',
  liter: 'L',
  litros: 'L',
  litro: 'L',
  hours: 'hours',
  hour: 'hours',
  hrs: 'hours',
  horas: 'hours',
  acres: 'acres',
  acre: 'acres',
  hectares: 'ha',
  hectare: 'ha',
  ha: 'ha',
  m2: 'm2'
};

/**
 * Parses detected amounts into structured data with proper categorization.
 */
export function extractStructuredAmounts(
  detectedAmounts: Array<StructuredAmount | string>
): StructuredAmount[] {
  return detectedAmounts
    .map((amount) => {
      // Already structured — still normalize units to match form dropdown values
      if (typeof amount !== 'string') {
        const normalizedUnit = UNIT_NORMALIZE[amount.unit?.toLowerCase()] || amount.unit;
        return { ...amount, unit: normalizedUnit };
      }

      // Parse string amounts like "200 pounds" or "2.5 hectares"
      const match = amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        const value = parseFloat(match[1]);
        const rawUnit = match[2].trim().toLowerCase();
        const unit = UNIT_NORMALIZE[rawUnit] || rawUnit;

        let category: string = 'unknown';
        if (['lb', 'kg', 'tons'].includes(unit)) category = 'weight';
        else if (['gal', 'L', 'mL'].includes(unit)) category = 'volume';
        else if (['acres', 'ha', 'm2', 'km2'].includes(unit)) category = 'area';
        else if (['hours', 'minutes'].includes(unit)) category = 'time';

        return { value, unit, category };
      }

      return { value: 0, unit: '', category: 'unknown' };
    })
    .filter((a) => a.value > 0);
}

// ============================================================================
// VOICE DATA TO FORM FIELD VALUES
// ============================================================================

/**
 * Maps AI-extracted voice data to form field values compatible with
 * the TypeAwareFields component and quickEventFields.ts schema.
 *
 * Merges AI-extracted values on top of template defaults.
 */
export function mapVoiceDataToFieldValues(
  parsedData: ParsedVoiceData,
  templateId: string
): VoiceFieldMappingResult {
  // Start with template defaults — but only the operational ones. See PREFILLABLE_FIELDS.
  const defaults = getDefaultFieldValues(templateId);
  const prefillableDefaults: Record<string, unknown> = {};
  Object.entries(defaults).forEach(([key, value]) => {
    if (PREFILLABLE_FIELDS.has(key)) prefillableDefaults[key] = value;
  });
  const overrides: Record<string, unknown> = {};

  const amounts = extractStructuredAmounts(parsedData.detected_amounts);

  // The transcript belongs in the notes box, on EVERY activity.
  //
  // Three subtypes are still unroutable — canopy management, buffer use and seed search —
  // and for those the parser answers `general`, which produces no field overrides at all:
  // voice transcribed the farmer perfectly and then filled in nothing. The words themselves
  // are the useful output there, and `observation` is exactly the field for them. It renders
  // on the form for every subtype of every event type (verified against
  // getFieldNamesForSurface), so the gate always lets it through.
  //
  // ⚠️ This is the ONE place voice writes prose rather than a measurement, and `observation`
  // is what ConsumerEventCard quotes as "Farmer's Field Notes". That is defensible precisely
  // because a transcript IS the farmer's own words — unlike `description`, which on a legacy
  // row may be AI-template output and is deliberately never seeded into this box. The farmer
  // still reads and edits it in the form before saving, and NewEvent will not overwrite notes
  // they have already typed.
  // ⛔ `original_transcript` ONLY — never `description`. They look interchangeable and are
  // not: the GPT prompt asks for "a clean, professional description of the activity", so
  // `description` is MACHINE-AUTHORED prose, while `original_transcript` is what the farmer
  // actually said. `observation` is quoted verbatim on the buyer page as "Farmer's Field
  // Notes", and NewEvent's own notes-field comment records why the box is never seeded from
  // `description`: it promotes machine copy into the grower's quoted voice.
  const spokenNotes = (parsedData.original_transcript || '').trim();
  if (spokenNotes) overrides.observation = spokenNotes;

  // ── Chemical events (fertilization, pest_control, herbicide, fungicide) ──
  if (['fertilization', 'pest_control', 'herbicide', 'fungicide'].includes(templateId)) {
    // Commercial name
    if (parsedData.commercial_name) {
      let cleanName = parsedData.commercial_name;
      // Clean raw transcript artifacts: "NPK with values fifteen nine twelve" → "NPK 15-9-12 Fertilizer"
      if (
        parsedData.npk_ratio &&
        /^NPK\b/i.test(cleanName) &&
        !cleanName.includes(parsedData.npk_ratio)
      ) {
        cleanName = `NPK ${parsedData.npk_ratio} Fertilizer`;
      }
      overrides.commercial_name = cleanName;
    } else if (parsedData.npk_ratio && templateId === 'fertilization') {
      overrides.commercial_name = `NPK ${parsedData.npk_ratio} Fertilizer`;
    } else if (parsedData.detected_products.length > 0) {
      let product = parsedData.detected_products[0];
      // Clean NPK-only product entries for fertilization: "NPK 15-9-12" → "NPK 15-9-12 Fertilizer"
      if (
        parsedData.npk_ratio &&
        templateId === 'fertilization' &&
        /^NPK\s*\d+-\d+-\d+$/i.test(product)
      ) {
        product = `NPK ${parsedData.npk_ratio} Fertilizer`;
      }
      overrides.commercial_name = product;
    }

    // Concentration / NPK ratio — only apply NPK for fertilization events
    if (parsedData.npk_ratio && templateId === 'fertilization') {
      overrides.concentration = parsedData.npk_ratio;
    } else if (parsedData.concentration) {
      overrides.concentration = parsedData.concentration;
    }

    // Application method
    if (parsedData.application_method) {
      overrides.application_method = parsedData.application_method;
    } else if (parsedData.detected_systems && parsedData.detected_systems.length > 0) {
      overrides.application_method = parsedData.detected_systems[0];
    }

    // Volume applied (weight or volume amounts)
    const volumeAmount = amounts.find((a) => a.category === 'weight' || a.category === 'volume');
    if (volumeAmount) {
      overrides.volume_applied = volumeAmount.value;
      overrides.volume_unit = volumeAmount.unit;
    }

    // Area treated
    const areaAmount = amounts.find((a) => a.category === 'area');
    if (areaAmount) {
      overrides.area_treated = areaAmount.value;
      overrides.area_unit = areaAmount.unit;
    } else if (parsedData.area_covered && typeof parsedData.area_covered === 'object') {
      overrides.area_treated = parsedData.area_covered.value;
      overrides.area_unit =
        UNIT_NORMALIZE[parsedData.area_covered.unit] || parsedData.area_covered.unit;
    }
  }

  // ── Production events (irrigation, harvest, planting, pruning, etc.) ──
  if (
    [
      'irrigation',
      'harvest',
      'planting',
      'pruning',
      'transplanting',
      'cultivation',
      'thinning',
      'equipment_maintenance',
      // FP / MO / PH render area_covered, fuel_consumed and equipment_hours on their forms.
      // `transport` and `pollination` are deliberately NOT here — neither renders any of
      // them, so the gate would drop everything this branch produced anyway.
      'frost_protection',
      'mowing',
      'post_harvest'
    ].includes(templateId)
  ) {
    // Area covered
    const areaAmount = amounts.find((a) => a.category === 'area');
    if (areaAmount) {
      overrides.area_covered = areaAmount.value;
      overrides.area_unit = areaAmount.unit;
    } else if (parsedData.area_covered && typeof parsedData.area_covered === 'object') {
      overrides.area_covered = parsedData.area_covered.value;
      overrides.area_unit =
        UNIT_NORMALIZE[parsedData.area_covered.unit] || parsedData.area_covered.unit;
    }

    // Duration / equipment hours
    const timeAmount = amounts.find((a) => a.category === 'time');
    if (timeAmount) {
      overrides.equipment_hours = timeAmount.value;
    } else if (parsedData.duration && typeof parsedData.duration === 'object') {
      overrides.equipment_hours = parsedData.duration.value;
    }

    // Fuel — prefer explicit fuel_amount from AI (semantically correct)
    // Only fall back to guessing from generic volume for equipment-heavy events
    // where gallons/liters most likely means diesel/gasoline, not water or chemicals
    const fuelGuessAllowed = ['cultivation', 'equipment_maintenance'].includes(templateId);
    if (parsedData.fuel_amount && typeof parsedData.fuel_amount === 'object') {
      overrides.fuel_consumed = parsedData.fuel_amount.value;
      overrides.fuel_unit =
        UNIT_NORMALIZE[parsedData.fuel_amount.unit] || parsedData.fuel_amount.unit;
    } else if (fuelGuessAllowed) {
      const fuelAmount = amounts.find(
        (a) => a.category === 'volume' && ['gal', 'L'].includes(a.unit)
      );
      if (fuelAmount) {
        overrides.fuel_consumed = fuelAmount.value;
        overrides.fuel_unit = fuelAmount.unit;
      }
    }

    // Irrigation-specific
    if (templateId === 'irrigation') {
      if (parsedData.water_source) {
        overrides.water_source = parsedData.water_source;
      }
      if (parsedData.detected_systems && parsedData.detected_systems.length > 0) {
        const system = parsedData.detected_systems[0].toLowerCase();
        if (system.includes('drip')) overrides.irrigation_method = 'drip';
        else if (system.includes('sprinkler')) overrides.irrigation_method = 'sprinkler';
        else if (system.includes('flood')) overrides.irrigation_method = 'flood';
        else if (system.includes('furrow')) overrides.irrigation_method = 'furrow';
      }
      // Irrigation depth (e.g., "2 inches of water")
      const depthAmount = amounts.find((a) => a.category === 'depth');
      if (depthAmount) {
        overrides.irrigation_depth = depthAmount.value;
        if (depthAmount.unit === 'cm') overrides.irrigation_depth_unit = 'cm';
        else overrides.irrigation_depth_unit = 'inches';
      }
    }

    // Yield — harvest and post-harvest processing both render it (visibleForSubtypes
    // ['HA','PH','PL']), so a weight spoken about either lands on the same field.
    if (templateId === 'harvest' || templateId === 'post_harvest') {
      const weightAmount = amounts.find((a) => a.category === 'weight');
      if (weightAmount) {
        overrides.yield_quantity = weightAmount.value;
        overrides.yield_unit = weightAmount.unit;
      }
    }
  }

  // Merge: defaults < AI-extracted overrides
  return {
    // 🔴 2026-08-19 — `defaults` is filtered, `overrides` is not.
    //
    // This function's own docstring says it "merges AI-extracted values on top of template
    // defaults", and those defaults included `organic_approved: 'no'` for every chemical
    // template — a value the backend reads as a PROHIBITED-SUBSTANCE application, which
    // resets the § 205.202(b) 36-month clock. Speaking into the microphone about a fungicide
    // must not put a compliance claim on the record that nobody said out loud.
    //
    // What the grower actually SAID stays untouched: `overrides` is their words.
    values: { ...prefillableDefaults, ...overrides },
    overriddenFields: Object.keys(overrides)
  };
}

// ============================================================================
// RENDER GATE — what voice may write to the record
// ============================================================================

/**
 * Unit fields have no entry of their own in the display registry: the form renders
 * each one inline beside its value (there is no `groupWith` link for them), so
 * `getFieldNamesForSurface` never returns `volume_unit`, `area_unit`, `fuel_unit`,
 * `yield_unit` or `irrigation_depth_unit`.
 *
 * A gate that asked the registry about them directly would therefore strip every unit
 * and leave bare numbers on the record — the exact failure `_public_unit` documents in
 * `history/serializers.py`: "a guessed unit is an unverifiable claim about how much was
 * applied to food". So a unit rides on its value: kept if and only if the value it
 * measures is itself both detected and rendered.
 *
 * `area_unit` lists two owners because the mapper writes it beside `area_treated` on
 * chemical events and `area_covered` on production ones.
 */
export const VOICE_UNIT_COMPANIONS: Readonly<Record<string, readonly string[]>> = {
  volume_unit: ['volume_applied'],
  area_unit: ['area_treated', 'area_covered'],
  fuel_unit: ['fuel_consumed'],
  yield_unit: ['yield_quantity'],
  irrigation_depth_unit: ['irrigation_depth']
};

/** What survived the gate, and what the farmer must be told did not. */
export interface VoiceGateResult {
  kept: Record<string, unknown>;
  dropped: string[];
}

/**
 * Restrict voice-detected values to the fields the ACTIVE event type and subtype
 * actually render on the form.
 *
 * 🔴 Why this exists. `mapVoiceTypeToTemplate` derives its template from what the AI
 * HEARD, while the form stays on whatever the farmer picked at step 0 — voice never
 * routes the event type. Nothing downstream closes that gap:
 *
 *   - every tab receives `initialValues={eventFormData}`, so a merged key becomes a
 *     react-hook-form default whether or not that subtype renders an input for it
 *     (`ProductionTab` seeds `yield_quantity` for all 16 subtypes);
 *   - `ProductionTab`'s payload emits `yield_quantity`, `area_covered`, `fuel_consumed`
 *     and `equipment_hours` with no subtype gate of their own;
 *   - `cleanEventData` in NewEvent is a passthrough with no allowlist;
 *   - `yield_quantity` / `yield_unit` / `area_covered` / `fuel_consumed` /
 *     `equipment_hours` are real ProductionEvent columns.
 *
 * So speaking about a harvest while the form sat on Irrigation wrote a yield the farmer
 * never saw onto an irrigation record. The display registry already knows the answer —
 * `yield_quantity` is `visibleForSubtypes: ['HA', 'PH', 'PL']` — it was simply never
 * consulted on the write path. It is now.
 *
 * Failure direction is deliberate: an under-declared registry drops a value the farmer
 * then types in themselves. That costs a keystroke. The other direction writes an
 * unseen measurement into a §205.103(b)(2) record, which costs the record.
 */
export function gateVoiceOverridesToForm(
  overrides: Record<string, unknown>,
  eventType: EventTypeCode,
  subtype: AnySubtype | undefined
): VoiceGateResult {
  const rendered = new Set(getFieldNamesForSurface(eventType, subtype, 'form'));
  const kept: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const [key, value] of Object.entries(overrides)) {
    const owners = VOICE_UNIT_COMPANIONS[key];
    const allowed = owners
      ? owners.some((owner) => owner in overrides && rendered.has(owner))
      : rendered.has(key);

    if (allowed) kept[key] = value;
    else dropped.push(key);
  }

  return { kept, dropped };
}
