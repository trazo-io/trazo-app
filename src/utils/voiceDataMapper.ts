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
import {
  APPLICATION_METHODS,
  APPLICATION_METHODS_BY_CHEMICAL_TYPE,
  APPLICATION_RATE_UNITS,
  IRRIGATION_METHODS,
  WATER_SOURCES
} from '../config/events/enums';
import { VOICE_ENUMS_MUST_ECHO_WORDS } from '../config/events/voiceFields';
import type { VoiceFieldRequest } from '../config/events/voiceFields';
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
  detected_amounts: Array<StructuredAmount | string>;
  detected_products: string[];
  detected_systems?: string[];
  confidence: number;
  npk_ratio?: string | null;
  concentration?: string | null;
  commercial_name?: string | null;
  application_method?: string | null;
  water_source?: string | null;
  /** Answered as an IRRIGATION_METHODS value; see the irrigation branch. */
  irrigation_method?: string | null;
  area_covered?: { value: number; unit: string } | string | null;
  duration?: { value: number; unit: string } | string | null;
  fuel_amount?: { value: number; unit: string } | null;
  processing_time?: number;
  source?: string;
  original_transcript?: string;
  /**
   * Per-activity fields, keyed by the form's own field names — the answer to the field list
   * the client asked for (buildVoiceFieldRequests). Everything in here is validated against
   * that request before it can reach a form: see sanitizeActivityFields.
   */
  activity_fields?: Record<string, unknown>;
  /** True when the parser could not name an activity and used the one the farmer chose. */
  activity_from_context?: boolean;
  /**
   * The farmer ticked "add what I said to my field notes" in the voice panel.
   *
   * ⛔ Absent or false means the transcript stays in the panel and NOTHING is written to
   * `observation`. See the notes block in mapVoiceDataToFieldValues for why the default flipped.
   */
  note_opt_in?: boolean;
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
  // Pass 1 — an entry for this exact (event type, subtype).
  if (subtypeCode) {
    for (const [slug, mapping] of Object.entries(VOICE_TYPE_MAP)) {
      if (mapping.backendEventType === eventTypeId && mapping.backendSubtype === subtypeCode) {
        return slug;
      }
    }
  }

  // Pass 2 — an entry for this event type that has NO subtype of its own, i.e. the event type
  // IS one activity.
  //
  // This pass is not just the "subtype unknown" case, and treating it that way was a bug:
  // GeneralTab's `type` field is REQUIRED and holds an activity_type value ("meeting",
  // "maintenance"), so `eventFormData.type` is a non-empty string that matches no mapping
  // subtype. Pass 1 fails, and gating pass 2 on `!subtypeCode` then returned null — which
  // silently disabled both the chosen-activity context and the whole general field list
  // (activity_type, duration, people_involved) for every General activity.
  //
  // Production, chemical and soil are unaffected: every one of their entries declares a
  // subtype, so this pass finds nothing and the answer stays null rather than becoming a guess
  // between eleven production activities.
  for (const [slug, mapping] of Object.entries(VOICE_TYPE_MAP)) {
    if (mapping.backendEventType === eventTypeId && !mapping.backendSubtype) return slug;
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
/**
 * Drop amounts whose UNIT the farmer never said.
 *
 * MEASURED 2026-09-01 from a real dictation. Speech-to-text wrote "Kocide 3000-O" as
 * "Kocide three thousand dot o", and the parser read the 3000 out of the PRODUCT NAME as a
 * quantity — then supplied a unit for it, answering `{value: 3000, unit: "gallons",
 * category: "volume"}` from a sentence in which nobody said gallons. It rendered to the farmer as
 * a "3000 gallons" chip beside the real "3.5 lbs", and on an utterance with no weight in it that
 * invented volume is what would reach `volume_applied`.
 *
 * The test is the same one `wasSpoken` applies to a block: a unit is a word the farmer used, so
 * if it is absent from the transcript the amount was assembled rather than heard.
 *
 * ⚠️ Fails OPEN when the transcript contains no unit this map knows. Units arrive in the
 * farmer's language ("centímetros", "quilos") and only some are in UNIT_NORMALIZE; filtering
 * against a vocabulary we only half-speak would silently drop every amount in Spanish and
 * Portuguese, which is far worse than one bogus chip.
 */
export function amountsActuallySpoken<T extends { unit?: string } | string>(
  amounts: readonly T[] | null | undefined,
  transcript: string
): T[] {
  if (!Array.isArray(amounts) || amounts.length === 0) return [];
  const canonical = (unit: string) => UNIT_NORMALIZE[unit.toLowerCase()] ?? unit.toLowerCase();

  // Typed explicitly for the same reason `wasSpoken` states below: `?? []` alone infers the
  // empty branch as `never[]`, and `tokens.includes(word)` on the resulting union is a type
  // error. (Introduced 2026-09-03 with the word-level unit check at the end of this function.)
  const tokens: string[] = (transcript || '').toLowerCase().match(/[a-z]+/g) ?? [];
  const spokenUnits = new Set(
    tokens.filter((token) => token in UNIT_NORMALIZE).map((token) => UNIT_NORMALIZE[token])
  );
  if (spokenUnits.size === 0) return [...amounts];

  return amounts.filter((amount) => {
    if (typeof amount === 'string') return true;
    const unit = (amount as { unit?: string }).unit;
    if (!unit) return true;
    if (spokenUnits.has(canonical(unit))) return true;

    // 🔴 ...and the same question asked ACROSS LANGUAGES.
    //
    // MEASURED 2026-09-03 in Spanish: "3 libras y media por acre" parsed correctly as
    // {3.5, "lbs"} — the model answers units in English whatever the farmer speaks. The
    // transcript says "libras", the amount says "lbs", and neither of the tests around this one
    // can bridge that: `UNIT_NORMALIZE` has no "libras" (so the canonical check fails) and the
    // two words share no letters worth matching (so the word check below fails). The rate was
    // dropped, the chip vanished, and `application_rate` never filled — on the language half of
    // the demo.
    //
    // RATE_NUMERATOR already carries the three-language vocabulary for exactly this pairing
    // (libras/lbs/pounds all resolve to `lb`), so it is the bridge rather than a fourth map.
    const identity = (value: string) => RATE_NUMERATOR[value.toLowerCase().trim()];
    const unitIdentity = identity(unit);
    if (unitIdentity && tokens.some((token) => identity(token) === unitIdentity)) return true;

    // 🔴 ...and the same question asked of the unit's own WORDS.
    //
    // MEASURED 2026-09-03: "Sprayed Entrust on the east block, six fluid ounces an acre, 40
    // gallons total, airblast." The panel showed chips for "40 gallons", "Entrust" and
    // "airblast" — and none for the six fluid ounces, which is the number the label is written
    // in. UNIT_NORMALIZE has no entry for "fluid ounces" (nor ounces, pints, quarts, grams), so
    // the canonical check above answered "never spoken" about a unit the farmer plainly said.
    //
    // Worse, it only fails this way in company: with no recognisable unit in the sentence the
    // function bails out early and keeps everything, so the bug appears exactly when ANOTHER
    // amount happens to use a known unit. That is why the missing chip showed up only once
    // "40 gallons total" was added to the utterance.
    //
    // The words are the evidence, so ask about the words: the unit counts as spoken if any word
    // of its name is in the transcript. That still drops the failure this filter was built for —
    // "Kocide three thousand dot o" produced `{3000, "gallons"}` from a sentence containing no
    // form of "gallon" — because the test is the transcript, not a vocabulary list.
    return unit
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .some((word) => word.length >= 3 && tokens.includes(word));
  });
}

/**
 * Land units a rate is quoted AGAINST. Not the same list as UNIT_NORMALIZE: "per tree" and
 * "per plant" are rates too, and neither is a unit any amount is ever measured in.
 */
const RATE_DENOMINATORS = new Set([
  'acre',
  'acres',
  'hectare',
  'hectares',
  'hectarea',
  'hectareas',
  'hectárea',
  'hectáreas',
  'ha',
  'tree',
  'trees',
  'arbol',
  'arboles',
  'árbol',
  'árboles',
  'plant',
  'plants',
  'planta',
  'plantas',
  'vine',
  'vines',
  'row',
  'rows',
  'hilera',
  'hileras',
  'block',
  'blocks',
  'cuadra',
  'cuadras',
  'pe',
  'pes'
]);

/** The word that turns a quantity into a per-something rate, in the three spoken languages. */
const RATE_MARKERS = new Set(['per', 'a', 'an', 'por', 'cada', 'each', 'pro']);

/** Words we may find a spoken unit under, beyond the ones UNIT_NORMALIZE canonicalises. */
const EXTRA_UNIT_WORDS = new Set([
  'ounce',
  'ounces',
  'oz',
  'fluid',
  'quart',
  'quarts',
  'pint',
  'pints',
  'gram',
  'grams',
  'g',
  'libra',
  'libras',
  'quilo',
  'quilos',
  'onza',
  'onzas',
  'galon',
  'galones',
  'galão',
  'litro',
  'litros',
  'tonelada',
  'toneladas'
]);

/**
 * Is this quantity a RATE — "three and a half pounds AN ACRE" — rather than a total?
 *
 * MEASURED 2026-09-02 on the October demo line itself: "Sprayed Kocide 3000-O on the east
 * block, three and a half pounds an acre, air-blast, for walnut blight" put **3.5** into
 * `volume_applied`, whose own help text reads "Total volume of product applied". 3.5 lb is the
 * rate; the total is 3.5 × however many acres were sprayed. The number is wrong by the whole
 * acreage, it prints on the certifier packet and it is what CA PUR box 20 is filled from.
 *
 * The backend prompt already refuses to read the "1" out of "per acre" as an AREA (added
 * 2026-09-01, all three languages). This is the other half of the same sentence and the prompt
 * cannot fix it: the model is right that 3.5 pounds was said, and right about the unit. What it
 * cannot know is that the field on the other side holds a total. So the test lives here, in
 * code, against the transcript — an instruction is not a control.
 *
 * Two tiers, because the anchor is not always findable:
 *  1. Anchor on the spoken unit and read the THREE tokens after it. "pounds | an acre" is a
 *     rate; "gallons | of Entrust across" is not. This keeps a genuine total in a sentence
 *     that also quotes a rate.
 *  2. No anchor — the unit was said in words this file does not know ("six FLUID OUNCES an
 *     acre") — and the sentence contains a rate phrase anyway. Then we cannot tell which
 *     quantity it attaches to, and the safe reading is "rate". Over-dropping leaves a box for
 *     the farmer to fill; under-dropping writes a wrong total onto a regulated record.
 */
export function amountIsSpokenAsRate(transcript: string, unit: string | undefined): boolean {
  return spokenRateDenominator(transcript, unit) !== null;
}

/**
 * WHICH land unit the rate is quoted against — "acre" out of "three pounds an acre" — or null
 * when the quantity is not a rate at all.
 *
 * Split out of `amountIsSpokenAsRate` on 2026-09-03, when `application_rate` gave the number
 * somewhere honest to live. Detecting the rate is what stops it landing in a TOTAL; naming the
 * denominator is what lets it land in the rate field, as `6 fl oz/ac` rather than a bare 6.
 */
export function spokenRateDenominator(transcript: string, unit: string | undefined): string | null {
  const tokens: string[] = (transcript || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) return null;

  const denominatorAfter = (from: number): string | null => {
    // The article is often missing. MEASURED 2026-09-01 from a real dictation: Deepgram wrote
    // "three and a half pounds an acre" as "three and a half pound Acre" — the "an" simply did
    // not survive. A land unit sitting directly after a quantity's unit is a rate either way.
    if (from < tokens.length && RATE_DENOMINATORS.has(tokens[from])) return tokens[from];
    for (let i = from; i < Math.min(from + 3, tokens.length - 1); i++) {
      if (RATE_MARKERS.has(tokens[i]) && RATE_DENOMINATORS.has(tokens[i + 1])) {
        return tokens[i + 1];
      }
    }
    return null;
  };

  const spokenUnit = (unit || '').toLowerCase();
  const canonicalUnit = UNIT_NORMALIZE[spokenUnit] ?? spokenUnit;
  if (!canonicalUnit) return null;

  // Where in the sentence THIS amount's unit was said. Two ways a token can be that unit:
  // it canonicalises to the same thing ("pounds" -> lb, unit "lbs" -> lb), or it is a unit word
  // this file does not canonicalise and the two names overlap ("ounces" inside "fluid ounces").
  const anchors = tokens.reduce<number[]>((found, token, index) => {
    const canonicalToken = UNIT_NORMALIZE[token];
    const isSameUnit = canonicalToken
      ? canonicalToken === canonicalUnit
      : EXTRA_UNIT_WORDS.has(token) &&
        (canonicalUnit.includes(token) || token.includes(canonicalUnit));
    if (isSameUnit) found.push(index);
    return found;
  }, []);

  // Tier 1: the unit is in the sentence — decide from what follows THAT word. `every`, not
  // `some`: "200 gallons of water at 3.5 pounds an acre" says gallons once as a total, and one
  // total is enough to keep the amount.
  if (anchors.length > 0) {
    const denominators = anchors.map((index) => denominatorAfter(index + 1));
    return denominators.every((d) => d !== null) ? denominators[0] : null;
  }

  // Tier 2: no anchor for THIS unit. If the sentence quotes a rate at all, treat it as one.
  for (let i = 0; i < tokens.length - 1; i++) {
    if (RATE_MARKERS.has(tokens[i]) && RATE_DENOMINATORS.has(tokens[i + 1])) return tokens[i + 1];
  }
  return null;
}

/**
 * The rate unit's NUMERATOR, from whatever the parser called the unit.
 *
 * Deliberately wider than UNIT_NORMALIZE: that map exists to decide whether a unit was SPOKEN,
 * and it is half-populated on purpose (see `amountsActuallySpoken`). This one decides what a
 * rate is measured in, so it has to know "fluid ounces" — the unit the Entrust label is written
 * in, and the one whose absence from UNIT_NORMALIZE is the only reason the first rate bug did
 * not fire on the Entrust dictation.
 */
const RATE_NUMERATOR: Record<string, string> = {
  'fluid ounces': 'fl_oz',
  'fluid ounce': 'fl_oz',
  'fl oz': 'fl_oz',
  floz: 'fl_oz',
  'onzas liquidas': 'fl_oz',
  'onzas líquidas': 'fl_oz',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  onza: 'oz',
  onzas: 'oz',
  pint: 'pt',
  pints: 'pt',
  pt: 'pt',
  quart: 'qt',
  quarts: 'qt',
  qt: 'qt',
  gallon: 'gal',
  gallons: 'gal',
  gal: 'gal',
  galon: 'gal',
  galones: 'gal',
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  libra: 'lb',
  libras: 'lb',
  ton: 'ton',
  tons: 'ton',
  tonne: 't',
  tonnes: 't',
  gram: 'g',
  grams: 'g',
  g: 'g',
  gramo: 'g',
  gramos: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',
  kilo: 'kg',
  kilos: 'kg',
  quilo: 'kg',
  quilos: 'kg',
  liter: 'L',
  liters: 'L',
  litre: 'L',
  litres: 'L',
  l: 'L',
  litro: 'L',
  litros: 'L',
  milliliter: 'mL',
  milliliters: 'mL',
  ml: 'mL',
  mililitro: 'mL',
  mililitros: 'mL'
};

/** The rate unit's DENOMINATOR, from the land word the farmer actually said. */
const RATE_DENOMINATOR_CODE: Record<string, string> = {
  acre: 'ac',
  acres: 'ac',
  hectare: 'ha',
  hectares: 'ha',
  hectarea: 'ha',
  hectareas: 'ha',
  hectárea: 'ha',
  hectáreas: 'ha',
  ha: 'ha'
};

/**
 * Turn a spoken quantity and its land word into one `application_rate_unit` code.
 *
 * Returns null unless BOTH halves resolve AND the pair is a real option on the form. "twenty
 * gallons a tree" is a rate and is correctly kept out of the total — but there is no per-tree
 * option in the catalogue, so it is not written as a rate either. An enum value the dropdown
 * cannot render is a value the farmer cannot correct.
 */
export function rateUnitCode(unit: string | undefined, denominator: string | null): string | null {
  if (!unit || !denominator) return null;
  const numerator = RATE_NUMERATOR[unit.toLowerCase().trim()];
  const denom = RATE_DENOMINATOR_CODE[denominator.toLowerCase()];
  if (!numerator || !denom) return null;
  const code = `${numerator}_${denom}`;
  return APPLICATION_RATE_UNITS.some((option) => option.value === code) ? code : null;
}

/**
 * The quantity that is the PRODUCT AMOUNT, out of the ones NOT spoken as a rate — or null when
 * the sentence cannot say which fact the number is.
 *
 * 🔴 MEASURED 2026-09-03 on camera. "Sprayed Entrust on the east block. Six fluid ounces an
 * acre, 40 gallons total, airblast." The six fluid ounces is a rate and is correctly routed to
 * `application_rate`; the 40 gallons is the TANK, the carrier volume the product was mixed into.
 * The leftover-amount rule took it as the product total, so the record said forty gallons of
 * Entrust — a number that prints in the certifier packet's "Amount / Rate" column, feeds CA PUR
 * (DPR-PML-017C) box 20 and the CCOF materials form, and is wrong by three orders of magnitude.
 *
 * The rate and the total are two statements about the SAME product, so a grower who says both
 * says them in the same unit ("six fluid ounces an acre, seventy-five fluid ounces total").
 * A quantity in a DIFFERENT unit beside a rate is a different fact — a tank volume, a water
 * volume, a load — and there is no way to tell which from the words alone.
 *
 * ⛔ Deliberately NOT a vocabulary of tank words ("total", "in the tank", "of water"). "40
 * gallons TOTAL" is the sentence that broke it, and `total` is the very word the field's own
 * help text used to use. Pattern-matching prose to classify a regulated number is how the wrong
 * number gets written confidently; the unit is evidence the farmer actually supplied.
 *
 * Over-dropping leaves a box for the farmer to fill. Under-dropping writes a spray volume onto
 * a § 205.103(b)(2) record as the amount of pesticide applied.
 */
export function productTotalFromAmounts(
  amounts: readonly StructuredAmount[],
  spokenRateUnit: string | undefined
): StructuredAmount | null {
  const candidates = amounts.filter((a) => a.category === 'weight' || a.category === 'volume');
  if (candidates.length === 0) return null;
  if (!spokenRateUnit) return candidates[0];

  const canonical = (unit: string | undefined) =>
    RATE_NUMERATOR[
      String(unit ?? '')
        .toLowerCase()
        .trim()
    ] ?? null;
  const rateCode = canonical(spokenRateUnit);
  // An unrecognised rate unit is not a licence to take the leftover: we know a rate was spoken
  // and we cannot check the total against it.
  if (!rateCode) return null;
  return candidates.find((a) => canonical(a.unit) === rateCode) ?? null;
}

/**
 * What PHYSICAL DIMENSION is this unit — decided by the unit, not by the model.
 *
 * 🔴 MEASURED 2026-09-03, from a real dictation. "Sprayed Entrust on the east block. Six fluid
 * ounces an acre, 40 gallons total, airblast." — the farmer stated the total explicitly, and
 * Volume Applied came out EMPTY. The parse was correct and the mapper was correct; what varied
 * was the model's own bookkeeping. Across four runs of the identical sentence it answered
 *
 *   {value: 6, unit: "fluid ounces", category: "volume"}   // and, on another run,
 *   {value: 6, unit: "fluid ounces"}                       // no category at all
 *
 * and every consumer of this array SELECTS on the category — `find(a => a.category === 'volume')`
 * for the total, `'area'` for the area, `'depth'` for irrigation depth, `'weight'` for yield. So
 * one missing key, on a field the model was never really answering, silently costs the record a
 * number the farmer said out loud. It is also unfalsifiable from the farmer's side: the banner
 * simply does not mention the field.
 *
 * The unit already carries the answer, deterministically, so the category is derived from it and
 * the model's label is used only for units this map does not know (`fuel`, `count` and anything
 * else the parser invents). Same rule as the rest of this file: where the words decide the
 * answer, do not ask the model for a second opinion about them.
 *
 * ⚠️ Depth is here on purpose. "Two inches of water" is a depth, and the irrigation branch finds
 * it by category — deriving from cm/inches keeps that working without trusting the label.
 */
function categoryForUnit(unit: string | undefined): string | null {
  const u = String(unit ?? '')
    .toLowerCase()
    .trim();
  if (!u) return null;
  if (
    /^(lb|lbs|pounds?|kg|kilograms?|kilos?|quilos?|g|grams?|gramos?|tons?|tonnes?|t|libras?|toneladas?)$/.test(
      u
    )
  ) {
    return 'weight';
  }
  if (
    /^(gal|gallons?|galones?|l|liters?|litres?|litros?|ml|milliliters?|mililitros?|oz|ounces?|onzas?|fl oz|fluid ounces?|pt|pints?|qt|quarts?)$/.test(
      u
    )
  ) {
    return 'volume';
  }
  // CONTAINERS, and they are the unit tree fruit is actually harvested in. A bin is not a
  // weight: 85 bins is 85 bins, and converting it to kilos would be inventing a number. It gets
  // its own dimension so the harvest branch can tell "85 bins" from "14 tonnes", which is how
  // the truck's load to the packer came to be offered as the day's yield.
  if (/^(bin|bins|bines?|box|boxes|cajas?|tote|totes|lug|lugs)$/.test(u)) return 'count';
  if (/^(acres?|ha|hectares?|hect[aá]reas?|m2|km2)$/.test(u)) return 'area';
  if (/^(hours?|hrs?|horas?|minutes?|mins?|minutos?)$/.test(u)) return 'time';
  if (
    /^(in|ins|inch|inches|pulgadas?|polegadas?|cm|cms|centimet(er|re)s?|centimetros?|cent[ií]metros?|mm)$/.test(
      u
    )
  ) {
    return 'depth';
  }
  return null;
}

/**
 * The spoken unit, as one of the options the yield unit select actually offers.
 *
 * `yield_unit` is a `<select>` with a fixed vocabulary (kg, tons, lbs, boxes, bins, plants,
 * seeds). The spoken unit was written to it RAW, so "14 toneladas" set `yield_unit` to a string
 * the select has no option for: nothing shows as selected and the record carries a unit no other
 * surface can read. Spanish is the common case, since the crew speaks it.
 *
 * Returns null for anything outside the vocabulary, and the caller then fills neither half.
 */
function yieldUnitFor(unit: string | undefined): string | null {
  const u = String(unit ?? '')
    .toLowerCase()
    .trim();
  if (!u) return null;
  if (/^(kg|kilograms?|kilos?|quilos?|kilogramos?)$/.test(u)) return 'kg';
  if (/^(tons?|tonnes?|toneladas?|t)$/.test(u)) return 'tons';
  if (/^(lb|lbs|pounds?|libras?)$/.test(u)) return 'lbs';
  if (/^(box|boxes|cajas?)$/.test(u)) return 'boxes';
  if (/^(bin|bins|bines?|tote|totes|lug|lugs)$/.test(u)) return 'bins';
  if (/^(plants?|plantas?)$/.test(u)) return 'plants';
  if (/^(seeds?|semillas?)$/.test(u)) return 'seeds';
  return null;
}

/**
 * The chemical subtype each voice template records against — the axis the application-method
 * catalogue is keyed on. Read from VOICE_TYPE_MAP rather than retyped: `backendSubtype` is
 * already the answer, and a second copy is how a dropdown and its validator drift.
 */
const CHEMICAL_SUBTYPE_FOR_TEMPLATE: Record<string, string> = Object.values(VOICE_TYPE_MAP).reduce(
  (acc, mapping) => {
    if (mapping.backendEventType === 2 && mapping.backendSubtype) {
      acc[mapping.templateId] = mapping.backendSubtype;
    }
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Resolve a spoken application method to a value this subtype's dropdown can render, or null.
 *
 * A method outside the catalogue is the enum failure this file already refuses everywhere else:
 * "a dropdown that renders nine options and receives a tenth stores a value no form can display
 * and no export can label."
 */
export function matchApplicationMethod(spoken: string, templateId: string): string | null {
  const subtype = CHEMICAL_SUBTYPE_FOR_TEMPLATE[templateId];
  const options = subtype
    ? APPLICATION_METHODS_BY_CHEMICAL_TYPE[subtype] ?? APPLICATION_METHODS
    : APPLICATION_METHODS;
  return matchCatalogueValue(spoken, options);
}

/**
 * Resolve a spoken value to one this dropdown can render, or null.
 *
 * MEASURED 2026-09-03, three fields with one shape. `application_method` took "airblast" and
 * "nebulizadora" straight from the parser; `water_source` and `irrigation_method` take free text
 * the same way. All three are `valueType: 'enum'`, so anything outside the catalogue is
 * "a dropdown that renders nine options and receives a tenth" — a value no form can display and
 * no export can label, sitting in state while the select shows its placeholder.
 *
 * Separator-insensitive so "air blast", "airblast" and "Air-Blast" all reach `air_blast`. It is
 * deliberately NOT fuzzy: the parser is asked (in every language) to answer with a catalogue
 * value, and anything it does not is dropped for the farmer to pick. A near-match here would be
 * the substitution `block_id` already refuses.
 */
export function matchCatalogueValue(
  spoken: string | null | undefined,
  options: readonly { value: string }[]
): string | null {
  const raw = String(spoken ?? '').trim();
  if (!raw) return null;
  const values = options.map((option) => option.value);
  if (values.includes(raw)) return raw;
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  const target = squash(raw);
  if (!target) return null;
  const hits = values.filter((value) => squash(value) === target);
  return hits.length === 1 ? hits[0] : null;
}

export function extractStructuredAmounts(
  detectedAmounts: Array<StructuredAmount | string> | null | undefined
): StructuredAmount[] {
  // MEASURED 2026-09-01: the parser returned `detected_amounts: null` for a perfectly ordinary
  // frost-protection sentence, and this function called `.map` on it — so pressing "Use these
  // details" threw and nothing was applied. The backend now coerces nulls at the source; this
  // guard is the second half, because a null here is a crash and an empty list is a no-op.
  if (!Array.isArray(detectedAmounts) || detectedAmounts.length === 0) return [];
  return detectedAmounts
    .map((amount) => {
      // Already structured — normalize the unit to the form's dropdown values, and re-derive
      // the CATEGORY from that unit. See categoryForUnit: the model's own label is a guess,
      // and every consumer of this array selects on the category.
      if (typeof amount !== 'string') {
        const normalizedUnit = UNIT_NORMALIZE[amount.unit?.toLowerCase()] || amount.unit;
        return {
          ...amount,
          unit: normalizedUnit,
          category: categoryForUnit(normalizedUnit) ?? amount.category ?? 'unknown'
        };
      }

      // Parse string amounts like "200 pounds" or "2.5 hectares"
      const match = amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        const value = parseFloat(match[1]);
        const rawUnit = match[2].trim().toLowerCase();
        const unit = UNIT_NORMALIZE[rawUnit] || rawUnit;
        return { value, unit, category: categoryForUnit(unit) ?? 'unknown' };
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
/**
 * Accept ONLY what was asked for, in the shape it was asked for.
 *
 * The model answers `activity_fields` as a flat object keyed by form field names. Three ways
 * that can be wrong, and all three end the same way — the key is dropped, never coerced:
 *
 *  - a key nobody requested (a hallucinated field, or one from a previous prompt). The render
 *    gate downstream would drop most of these anyway, but "most" is not a safety property:
 *    `gateVoiceOverridesToForm` asks whether the FORM renders a field, and plenty of fields the
 *    form renders are ones this pipeline must never write (see VOICE_NEVER_FILLS). The request
 *    list is the narrower and correct check.
 *  - a number that is not a number. `parseFloat('about twenty')` is NaN and `Number('')` is 0 —
 *    and a silent 0 on a certifier record is the "missing input becomes a default" failure that
 *    put 151.2 kg of CO₂e onto an event nobody reported fuel for.
 *  - an enum value outside its catalogue. A dropdown that renders nine options and receives a
 *    tenth stores a value no form can display and no export can label.
 */
/**
 * Did the farmer actually say this value? Mirrors `match_known_block` on the backend: tokens,
 * plus runs of single characters joined so a block dictated "B G A" counts as "BGA".
 */
function wasSpoken(transcript: string, value: string): boolean {
  const squash = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = squash(value);
  if (key.length < 2) return false;

  // Typed explicitly: `String.match` returns `RegExpMatchArray | null`, and `|| []` alone infers
  // the empty branch as `never[]`, which makes `.includes` a type error.
  const tokens: string[] = (transcript || '').toLowerCase().match(/[a-z0-9]+/g) ?? [];
  if (tokens.length === 0) return false;

  const letterRuns: string[] = [];
  let run: string[] = [];
  for (const token of tokens) {
    if (token.length === 1) run.push(token);
    else if (run.length) {
      letterRuns.push(run.join(''));
      run = [];
    }
  }
  if (run.length) letterRuns.push(run.join(''));

  if (tokens.includes(key) || letterRuns.includes(key)) return true;
  // Multi-word names ("Ridge Block") arrive as separate tokens.
  return key.length >= 4 && tokens.join('').includes(key);
}

/**
 * Does the sentence contain the words this enum answer is made of?
 *
 * Stem-matched on PREFIXES, because the farmer conjugates and the catalogue does not: the value
 * `mow` has to match "mowed" and "mowing", `mulch` has to match "mulched". Multi-word values
 * carry their own vocabulary — `cover_crop_mgmt` is satisfied by "cover crop", which is exactly
 * how a grower says it.
 *
 * ⛔ The VALUE only, never the field's label. The first version of this counted label tokens too,
 * and "Floor Management" let "took care of the orchard FLOOR" satisfy an answer of `mow` — the
 * field label describes the QUESTION, so matching it proves the farmer talked about the subject,
 * not that they gave this answer. Caught by its own test.
 *
 * Tokens under three characters are ignored: "mgmt" is a real word here, "of" and "a" are not,
 * and a two-letter prefix matches most of the sentence.
 */
function enumValueEchoedInWords(transcript: string, value: string): boolean {
  const spoken: string[] = (transcript || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (spoken.length === 0) return false;
  const wanted = value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 3);
  if (wanted.length === 0) return false;
  return wanted.some((token) =>
    spoken.some((word) => word.startsWith(token) || token.startsWith(word))
  );
}

function sanitizeActivityFields(
  answered: Record<string, unknown> | undefined,
  requested: readonly VoiceFieldRequest[],
  transcript: string,
  rateValues: ReadonlySet<number> = new Set()
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  if (!answered || typeof answered !== 'object' || requested.length === 0) return clean;

  const squashLabel = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');

  for (const field of requested) {
    const raw = answered[field.name];
    if (raw === undefined || raw === null || raw === '') continue;

    // ⛔ An answer that IS the question.
    //
    // MEASURED 2026-09-02, deterministic across runs: "Ran the tractor through the east block"
    // on a Cultivation form came back `method: "Operation Method"` — the label this file sent
    // in the request, handed straight back as the value. `method` is free text, so every other
    // check passes and the farmer finds "Operation Method" typed into the Method box.
    //
    // Cheap and general: no field's value is ever its own label. This catches the whole
    // echo-the-request class, not the one field that exposed it.
    if (squashLabel(String(raw)) === squashLabel(field.label)) continue;

    if (field.type === 'number') {
      const value = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/,/g, ''));
      if (!Number.isFinite(value)) continue;

      // ⛔ The same rate-is-not-a-total rule, on the path that does NOT go through `amounts`.
      //
      // MEASURED 2026-09-02: "Planted the east block, a hundred trees an acre" answered
      // `plants_established: 100`. That is a planting DENSITY; the field is a count of trees
      // actually put in the ground, and 100 is wrong by the acreage. The rate filter over
      // `amounts` cannot see this — activity fields are answered by name, not derived from the
      // amounts array.
      //
      // The cross-check is evidence, not a classification of which fields are "totals": the
      // model also emitted this number in `detected_amounts`, where the transcript showed it
      // was spoken as a rate. Same number, same sentence, so the same reading applies.
      if (rateValues.has(value)) continue;

      clean[field.name] = value;
      continue;
    }

    if (field.type === 'enum') {
      const value = String(raw).trim();
      const options = field.options ?? [];

      // One resolution, three increasingly forgiving passes, and ONE place that accepts. The
      // exact-match case used to return early, which quietly skipped the identity check below —
      // caught by `drops a real block the farmer never mentioned`, because the model's favourite
      // wrong answer is a perfectly-spelled catalogue value.
      const uniqueMatch = (transform: (v: string) => string): string | null => {
        const target = transform(value);
        if (!target) return null;
        const hits = options.filter((option) => transform(option) === target);
        return hits.length === 1 ? hits[0] : null;
      };

      const matched = options.includes(value)
        ? value
        : // separators normalised — "Wind machine" -> wind_machine
          uniqueMatch((v) => v.toLowerCase().replace(/[\s-]+/g, '_')) ??
          // separators dropped — a block dictated letter by letter, "B G A" -> BGA
          uniqueMatch((v) => v.toLowerCase().replace(/[^a-z0-9]/g, ''));

      if (!matched) continue;

      // ⛔ An IDENTITY must have been said out loud.
      //
      // MEASURED 2026-09-01: "irrigated the NORTH RIDGE block", on a parcel whose only block is
      // "Ridge Block", came back as `block_id: "Ridge Block"`. The value passes every other check
      // because it IS in the catalogue — the substitution happened upstream, in the model.
      // Hardening the prompt against it did not stop it (the same edit DID stop the model
      // inventing `protection_method: "other"`), so this cannot rely on the model's restraint.
      //
      // Only `block_id` is policed this way. Every other enum is a CLASSIFICATION, where
      // paraphrase is the point — "going to the packing house" legitimately becomes `handler`.
      // A block is not a classification: the value IS the words, so if the words are absent the
      // answer came from somewhere other than the farmer.
      //
      // ⚠️ Residual, stated rather than hidden: a catalogue name that is a SUBSTRING of what was
      // said ("Ridge Block" inside "North Ridge block") still passes — at that point the two
      // readings are genuinely ambiguous, and the farmer confirms the form before saving. What
      // this stops is a block that was never mentioned at all.
      if (field.name === 'block_id' && !wasSpoken(transcript, matched)) continue;

      // ⛔ ...and the same demand, for the enums whose values ARE the practice's own words.
      // See VOICE_ENUMS_MUST_ECHO_WORDS for what qualifies and why `protection_method` does not.
      if (
        VOICE_ENUMS_MUST_ECHO_WORDS.has(field.name) &&
        !enumValueEchoedInWords(transcript, matched)
      ) {
        continue;
      }

      clean[field.name] = matched;
      continue;
    }

    const value = String(raw).trim();
    if (!value) continue;
    clean[field.name] = value;
  }

  return clean;
}

export function mapVoiceDataToFieldValues(
  parsedData: ParsedVoiceData,
  templateId: string,
  requestedFields: readonly VoiceFieldRequest[] = []
): VoiceFieldMappingResult {
  // Start with template defaults — but only the operational ones. See PREFILLABLE_FIELDS.
  const defaults = getDefaultFieldValues(templateId);
  const prefillableDefaults: Record<string, unknown> = {};
  Object.entries(defaults).forEach(([key, value]) => {
    if (PREFILLABLE_FIELDS.has(key)) prefillableDefaults[key] = value;
  });
  const overrides: Record<string, unknown> = {};

  // The transcript reaches the notes box ONLY when the farmer asks for it.
  //
  // 🔴 2026-09-03, found on camera. `observation` is published VERBATIM on the buyer page as
  // "Farmer's Field Notes", and voice auto-filled it with the whole utterance. So
  // "Sprayed Entrust on the east block. Six fluid ounces an acre, 40 gallons total, airblast."
  // put the rate and the tank volume in front of a shopper in prose — while the SAME record's
  // structured `application_rate` / `volume` were being stripped for that exact reason by
  // `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`. The withholding policy is
  // categorical for columns and silent for prose, so the strip was decorative on the one path
  // that mattered.
  //
  // ⛔ The fix is NOT a scrubber. Regexing quantities out of a grower's sentence mangles their
  // words and cannot recognise what else is in there. It is not a second, private notes field
  // either: two prose boxes hand the farm editorial control over what its buyer page says, and
  // `.claude/rules/transparency-first.md` draws that line explicitly — the page's value is that
  // no farm can curate it. So the transcript stays where the farmer can read it (the voice
  // panel quotes it back under "what we heard") and the public box stays empty unless they
  // deliberately put it there. Suggest → confirm, the same red line the season plan and the OSP
  // §11 panel draw.
  //
  // The utility this used to carry is preserved by the tick, not by the default: canopy
  // management, buffer use and seed search still parse to `general` and produce no field
  // overrides, so for those activities the words ARE the output — and one tap keeps them.
  //
  // ⛔ `original_transcript` ONLY — never `description`. They look interchangeable and are
  // not: the GPT prompt asks for "a clean, professional description of the activity", so
  // `description` is MACHINE-AUTHORED prose, while `original_transcript` is what the farmer
  // actually said. `observation` is quoted verbatim on the buyer page as "Farmer's Field
  // Notes", and NewEvent's own notes-field comment records why the box is never seeded from
  // `description`: it promotes machine copy into the grower's quoted voice.
  const spokenNotes = (parsedData.original_transcript || '').trim();
  if (spokenNotes && parsedData.note_opt_in === true) overrides.observation = spokenNotes;

  // Amounts, filtered to the ones whose UNIT the farmer actually said — see
  // amountsActuallySpoken. Declared here rather than at the top of the function because it needs
  // the transcript above it; every consumer of `amounts` is further down.
  //
  // ⛔ Rates are dropped HERE and not from the chips. `VoiceEventCapture` renders "3.5 lbs" from
  // the same `detected_amounts`, and that chip is truthful — the farmer did say it. What must
  // not happen is the rate landing in a field whose label says TOTAL. So the display keeps the
  // heard quantity and the form keeps the empty box.
  const spokenAmounts = extractStructuredAmounts(
    amountsActuallySpoken(parsedData.detected_amounts, spokenNotes)
  );
  const amounts = spokenAmounts.filter((amount) => !amountIsSpokenAsRate(spokenNotes, amount.unit));
  // The VALUES that were spoken as a rate. Handed to `sanitizeActivityFields` so a number the
  // model ALSO answered by name ("a hundred trees an acre" -> plants_established: 100) gets the
  // same reading as the amount it came from.
  //
  // ⚠️ Built from the RAW amounts, not from `spokenAmounts`. MEASURED 2026-09-02: "a hundred
  // trees an acre" produced `{100, trees}`, which `amountsActuallySpoken` drops because "trees"
  // is not in the unit map — and the value still came back by name as `plants_established: 100`.
  // Filtering first left the cross-check with nothing to check against, and the density landed.
  const spokenRates = extractStructuredAmounts(parsedData.detected_amounts)
    .map((amount) => ({
      amount,
      denominator: spokenRateDenominator(spokenNotes, amount.unit)
    }))
    .filter((entry) => entry.denominator !== null);
  const rateValues = new Set(spokenRates.map((entry) => entry.amount.value));

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
    } else if ((parsedData.detected_products || []).length > 0) {
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

    // Application method — VALIDATED against the dropdown this subtype actually renders.
    //
    // 🔴 MEASURED 2026-09-03: "…airblast" wrote `application_method: "airblast"`. The PE
    // dropdown's value is `air_blast`, so the select fell back to its placeholder — "Select
    // application method…" — while the form state held a value no option can display. The
    // banner said Application Method was filled. Both statements cannot be true, and the one
    // the farmer can see is the empty select.
    //
    // This is the same rule `sanitizeActivityFields` applies to every enum it accepts; this
    // branch is LEGACY and had no catalogue check at all, which is why it took a value straight
    // from `detected_systems`. Separator-insensitive, so "airblast", "air blast" and
    // "Air-Blast" all resolve to `air_blast`; anything with no unique match is dropped and the
    // farmer picks, which is strictly better than a dropdown that looks untouched.
    const spokenMethod =
      parsedData.application_method ||
      (parsedData.detected_systems && parsedData.detected_systems.length > 0
        ? parsedData.detected_systems[0]
        : '');
    if (spokenMethod) {
      const method = matchApplicationMethod(spokenMethod, templateId);
      if (method) overrides.application_method = method;
    }

    // The label rate — the number that used to be thrown away.
    //
    // "Six fluid ounces an acre" is the sentence a grower actually speaks, and until
    // `application_rate` existed it had two possible endings: land in `volume_applied` and be
    // wrong by the whole acreage, or be dropped so the record lost it. Both halves must resolve
    // to a real dropdown option (`rateUnitCode`), so "twenty gallons a tree" — a rate with no
    // catalogue entry — is still kept out of the total and still not written here.
    const rate = spokenRates.find((entry) => rateUnitCode(entry.amount.unit, entry.denominator));
    if (rate) {
      overrides.application_rate = rate.amount.value;
      overrides.application_rate_unit = rateUnitCode(rate.amount.unit, rate.denominator);
    }

    // The product TOTAL — read AFTER the rate, and only when the words can say it is the same
    // product. See productTotalFromAmounts: the 40 gallons in "six fluid ounces an acre, 40
    // gallons total" is the tank, and this field is what the certifier packet, CA PUR and the
    // CCOF materials form all print as the amount of product applied.
    //
    // `spokenRates[0]`, not `rate`: a rate the catalogue cannot express ("twenty gallons a
    // tree") is still a rate that was spoken, and it still disqualifies a leftover in another
    // unit from being read as the total.
    const productTotal = productTotalFromAmounts(amounts, spokenRates[0]?.amount.unit);
    if (productTotal) {
      overrides.volume_applied = productTotal.value;
      overrides.volume_unit = productTotal.unit;
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
      // Both of these are `valueType: 'enum'` on the irrigation form, and both used to take the
      // parser's free text verbatim — the same defect `application_method` showed as an
      // `air_blast` chip on a Spanish record, except here it would reach the select silently.
      const waterSource = matchCatalogueValue(parsedData.water_source, WATER_SOURCES);
      if (waterSource) overrides.water_source = waterSource;
      // The parser's own answer first, then the system it named.
      //
      // This used to be four English `includes` checks — drip / sprinkler / flood / furrow —
      // against nine catalogue values. `micro_sprinkler`, `center_pivot`, `sub_irrigation`,
      // `hand_watering` and `rain_fed` were unreachable in ANY language, and a Spanish grower
      // saying "por goteo" or "aspersión" matched nothing at all. Asking the parser for a
      // catalogue value makes it a translation task, which it does well; the match below is what
      // keeps a wrong answer out.
      const spokenIrrigation =
        parsedData.irrigation_method ||
        (parsedData.detected_systems && parsedData.detected_systems.length > 0
          ? parsedData.detected_systems[0]
          : '');
      const irrigationMethod = matchCatalogueValue(spokenIrrigation, IRRIGATION_METHODS);
      if (irrigationMethod) overrides.irrigation_method = irrigationMethod;
      // Irrigation depth (e.g., "2 inches of water")
      //
      // ⛔ NO SILENT DEFAULT UNIT. This used to read `unit === 'cm' ? 'cm' : 'inches'`, so every
      // unit the mapper did not recognise became INCHES. MEASURED 2026-09-01 on a Spanish
      // utterance — "unos cinco centímetros" arrived as `{value: 5, unit: "centimetros"}` and was
      // recorded as 5 INCHES: 12.7 cm of water on a certifier record, from a farmer who said 5.
      // Bilingual is a shipped feature, so the units arrive in the farmer's language too.
      //
      // An unrecognised unit now drops the VALUE as well. A depth with the wrong unit is worse
      // than no depth: the farmer sees a blank field and fills it, instead of seeing a plausible
      // number that is off by 2.5x. (`.claude/rules/backend.md` and the 2026-08-20 carbon sweep
      // both land on the same rule: a missing input must never become a default.)
      const depthAmount = amounts.find((a) => a.category === 'depth');
      if (depthAmount) {
        const spokenUnit = String(depthAmount.unit || '').toLowerCase();
        const depthUnit = /^(cm|cms|centimet(er|re)s?|centimetros?|centímetros?)$/.test(spokenUnit)
          ? 'cm'
          : /^(in|ins|inch|inches|pulgadas?|polegadas?)$/.test(spokenUnit)
          ? 'inches'
          : null;
        if (depthUnit) {
          overrides.irrigation_depth = depthAmount.value;
          overrides.irrigation_depth_unit = depthUnit;
        }
      }
    }

    // Yield — harvest and post-harvest processing both render it (visibleForSubtypes
    // ['HA','PH','PL']), so an amount spoken about either lands on the same field.
    //
    // 🔴 MEASURED 2026-10-19, both halves of this are defects the crew hit on the first day:
    //
    //   "Cosechamos 85 bines del bloque 1"
    //     -> "Nothing on this activity to fill from those words." Bins were in no dimension, so
    //        the only amount in the sentence was invisible and a harvest offered nothing.
    //
    //   "Cosechamos 120 bines ... el camion llevo 14 toneladas a la empacadora"
    //     -> "Would fill: Yield: 14 toneladas". `find(category === 'weight')` takes the FIRST
    //        weight in the message whatever it is about, so the truck's load to the packer was
    //        offered as the day's harvest. A certifier reads that figure for lot traceability
    //        and mass balance.
    //
    // A COUNT WINS OVER A WEIGHT, and that is the whole rule. If the crew stated the harvest in
    // containers, containers are what they counted; a weight elsewhere in the same message is
    // about something else (a truck, a bin tare, a contract). If no container was named, a
    // weight is the yield, as before.
    if (templateId === 'harvest' || templateId === 'post_harvest') {
      const yieldAmount =
        amounts.find((a) => a.category === 'count') ?? amounts.find((a) => a.category === 'weight');
      const yieldUnit = yieldUnitFor(yieldAmount?.unit);
      // BOTH OR NEITHER. The unit select offers a fixed vocabulary, so a spoken unit it does not
      // carry ("toneladas" is not one of its options, nor is "cubetas") would land as a quantity
      // under whatever unit the form defaulted to, which is a different number. Same rule as the
      // irrigation depth above: a missing input must never become a default.
      if (yieldAmount && yieldUnit) {
        overrides.yield_quantity = yieldAmount.value;
        overrides.yield_unit = yieldUnit;
      }
    }
  }

  // Per-activity fields, asked for by name and answered by name — applied LAST, on purpose.
  //
  // Everything above is the LEGACY structured mapping: a fixed set of ~12 response keys,
  // hand-branched per template, filling the same eight fields on every activity. That is why
  // `protection_method` and `low_temperature` — the two facts a frost record exists for — could
  // not be written at all.
  //
  // Where the two can produce the SAME key, the explicit answer wins. `irrigation_depth` is the
  // one live overlap (`voiceFieldOverlap` in voiceRenderGate.test.ts pins the exact set, so a
  // new one has to be looked at rather than discovered): the legacy branch infers it by hunting
  // the amounts array for a `depth` category, while this path is the model answering the
  // question "what was the irrigation depth" by name. An answer beats an inference.
  Object.assign(
    overrides,
    sanitizeActivityFields(parsedData.activity_fields, requestedFields, spokenNotes, rateValues)
  );

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
  application_rate_unit: ['application_rate'],
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

/**
 * Merge an OFFERED value set into live form state, filling empties only.
 *
 * Used by the pasted-note ("seeded") path, where the values are held outside the form and the
 * farmer taps to write them. Between the parse and that tap they are invited to read the quoted
 * note and type, so the offer must not overwrite what they entered. The buttons say "Would fill"
 * and "Fill in N values"; this is the function that makes those words true.
 *
 * A UNIT AND ITS AMOUNT ARE ONE FACT. `VOICE_UNIT_COMPANIONS` maps a unit to the amount fields
 * that own it (an ARRAY: `area_unit` has two owners), and a tab may supply a unit default of its
 * own. Deciding per key would write an amount of 40 next to an existing default of "gal" when the
 * note said pounds, i.e. invent an application rate. So the pair is written together or not at all:
 * if EITHER half is already present, neither half is written.
 */
export function mergeOfferedValues(
  current: Record<string, unknown>,
  offered: Record<string, unknown>
): Record<string, unknown> {
  const isFilled = (name: string) => {
    const value = current?.[name];
    return value !== undefined && value !== null && String(value).trim() !== '';
  };

  const offeredKeys = Object.keys(offered);
  // Every key that must be decided together with `key`, restricted to what is actually on offer.
  const factGroup = (key: string): string[] => {
    const group = new Set<string>([key]);
    const ownedBy = VOICE_UNIT_COMPANIONS[key];
    if (ownedBy) {
      // `key` is a unit: its owners travel with it.
      ownedBy.forEach((owner) => {
        if (offeredKeys.includes(owner)) group.add(owner);
      });
    } else {
      // `key` is an amount: the unit that lists it travels with it.
      Object.entries(VOICE_UNIT_COMPANIONS).forEach(([unit, owners]) => {
        if (owners.includes(key) && offeredKeys.includes(unit)) group.add(unit);
      });
    }
    return [...group];
  };

  /** The amount fields a unit key belongs to, whether or not they are on offer. */
  const ownersOf = (key: string): readonly string[] => VOICE_UNIT_COMPANIONS[key] ?? [];
  const isUnitKey = (key: string) => key in VOICE_UNIT_COMPANIONS;

  // A UNIT ON ITS OWN STATES NOTHING, so it does not block its own pair.
  //
  // 🔴 MEASURED 2026-10-20 on the running stack. "Cosechamos 85 bines del bloque 1" offered
  // "Would fill: Yield: 85 bins", the operator tapped, and the banner answered "0 fields
  // filled". The form arrives with `yield_unit` at the tab's default ("lbs"), that default read
  // as a filled member of the fact group, and the group was skipped whole. Every value+unit
  // field on every activity had this: area, volume, fuel, yield, irrigation depth.
  //
  // What the rule is REALLY for stays: writing an amount beside a unit somebody else chose
  // invents a figure that prints on a certifier packet and a CA PUR export. Both of those
  // dangers are still blocked below:
  //   * the farmer typed the amount -> the owner is filled, nothing is written;
  //   * the amount is offered and its unit is NOT (dropped by the render gate, or never heard)
  //     -> the existing unit decides what the number means, so it still blocks.
  // The case being unblocked is the only coherent one: both halves offered together, the
  // amount empty, and the banner naming the pair in words before the tap.
  const blocks = (key: string) => {
    if (!isFilled(key)) return false;
    if (!isUnitKey(key)) return true;
    // A unit blocks only once one of its amounts is an answer.
    return ownersOf(key).some(isFilled);
  };

  const result: Record<string, unknown> = {};
  offeredKeys.forEach((key) => {
    const group = factGroup(key);
    if (group.some(blocks)) return;
    // An amount whose unit is NOT on offer is still decided by whatever unit is already there.
    if (!isUnitKey(key)) {
      const unitsOwningThis = Object.keys(VOICE_UNIT_COMPANIONS).filter((unit) =>
        ownersOf(unit).includes(key)
      );
      const unitOnOffer = unitsOwningThis.some((unit) => offeredKeys.includes(unit));
      if (!unitOnOffer && unitsOwningThis.some(isFilled)) return;
    }
    result[key] = offered[key];
  });
  return result;
}
