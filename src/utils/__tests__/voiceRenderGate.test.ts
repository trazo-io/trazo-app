/**
 * WS-4c hardening — voice may only write fields the ACTIVE form renders.
 *
 * MEASURED 2026-08-25, before `gateVoiceOverridesToForm` existed. Farmer picks
 * Irrigation at step 0, speaks about a harvest at step 1:
 *
 *   VoiceEventCapture   "I understood: Harvest"
 *   mapper              yield_quantity: 4200, yield_unit: 'lb'
 *   registry            yield_quantity is visibleForSubtypes ['HA','PH','PL'] → no input
 *   ProductionTab:675   seeds yield_quantity into defaultValues for ALL 16 subtypes
 *   ProductionTab:1394  emits it with no subtype gate
 *   cleanEventData      passthrough, no allowlist
 *   ProductionEvent     yield_quantity is a real column (history/models.py:1866)
 *
 * → an irrigation record carrying a yield the farmer never saw. These tests pin the
 * gate that closes it, in both directions: the unseen value must be dropped, and a
 * value the subtype DOES render must still survive (a gate that drops everything
 * would "pass" while quietly killing the feature).
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import IntlMessageFormat from 'intl-messageformat';
import { describe, expect, it } from 'vitest';

import {
  amountIsSpokenAsRate,
  matchApplicationMethod,
  extractStructuredAmounts,
  rateUnitCode,
  spokenRateDenominator,
  gateVoiceOverridesToForm,
  isRecognizedVoiceType,
  voiceActivityLabelKey,
  mapVoiceDataToFieldValues,
  mapVoiceTypeToTemplate,
  amountsActuallySpoken,
  productTotalFromAmounts,
  shouldOfferActivitySwitch,
  voiceTypeForActivity,
  VOICE_TYPE_MAP,
  VOICE_UNIT_COMPANIONS
} from '../voiceDataMapper';
import type { ParsedVoiceData } from '../voiceDataMapper';
import { ACTIVITY_VERBS } from '../../config/activityVerbs';
import { getFieldNamesForSurface } from '../../config/events';
import {
  APPLICATION_RATE_UNITS,
  APPLICATION_RATE_UNIT_SYMBOLS,
  applicationMethodLabelKey
} from '../../config/events/enums';
import enUS from '../../i18n/lang/en-US.json';
import es419 from '../../i18n/lang/es-419.json';

const PRODUCTION = 1;
const CHEMICAL = 2;

const parsed = (over: Partial<ParsedVoiceData>): ParsedVoiceData =>
  ({
    type: 'fertilization',
    description: '',
    confidence: 0.9,
    detected_amounts: [],
    detected_products: [],
    detected_systems: [],
    ...over
  } as ParsedVoiceData);

/** Run an utterance through the real mapper, then the gate, as NewEvent does. */
const heardOn = (data: ParsedVoiceData, eventType: number, subtype: string | undefined) => {
  const mapping = mapVoiceTypeToTemplate(data.type);
  const result = mapVoiceDataToFieldValues(data, mapping.templateId);
  const detected: Record<string, unknown> = {};
  result.overriddenFields.forEach((k) => {
    detected[k] = result.values[k];
  });
  return gateVoiceOverridesToForm(detected, eventType as never, subtype as never);
};

describe('voice render gate', () => {
  // ANTI-VACUITY. Every "is dropped" assertion below would also pass against an empty or
  // uninitialised registry, which is the failure mode that makes a negative guard useless.
  // Prove the gate is reading a real, populated registry first.
  it('reads a populated registry (so the drop assertions mean something)', () => {
    const ir = getFieldNamesForSurface(PRODUCTION, 'IR', 'form');
    const ha = getFieldNamesForSurface(PRODUCTION, 'HA', 'form');
    expect(ir.length).toBeGreaterThan(3);
    expect(ha).toContain('yield_quantity');
    expect(ir).not.toContain('yield_quantity');
  });

  it('drops a yield heard while the form is on Irrigation', () => {
    const { kept, dropped } = heardOn(
      parsed({ type: 'harvest', detected_amounts: ['4200 pounds'] }),
      PRODUCTION,
      'IR'
    );
    expect(Object.keys(kept)).not.toContain('yield_quantity');
    expect(dropped).toContain('yield_quantity');
    // the unit must not survive its value — a bare number is its own claim
    expect(Object.keys(kept)).not.toContain('yield_unit');
  });

  it('keeps that same yield when the form really is a Harvest', () => {
    const { kept } = heardOn(
      parsed({ type: 'harvest', detected_amounts: ['4200 pounds'] }),
      PRODUCTION,
      'HA'
    );
    expect(kept.yield_quantity).toBe(4200);
    expect(kept.yield_unit).toBe('lb');
  });

  it('drops chemical fields heard while the form is a production activity', () => {
    const { kept } = heardOn(
      parsed({
        type: 'fungicide',
        commercial_name: 'Kocide 3000',
        detected_amounts: ['3 pounds', '12 acres']
      }),
      PRODUCTION,
      'IR'
    );
    expect(Object.keys(kept)).not.toContain('commercial_name');
    expect(Object.keys(kept)).not.toContain('concentration');
    expect(Object.keys(kept)).not.toContain('volume_applied');
  });

  it('still fills an irrigation utterance on an irrigation form — the gate is not a mute button', () => {
    const { kept } = heardOn(
      parsed({
        type: 'irrigation',
        water_source: 'well_groundwater',
        detected_systems: ['drip'],
        detected_amounts: ['6 hours']
      }),
      PRODUCTION,
      'IR'
    );
    expect(kept.water_source).toBe('well_groundwater');
    expect(kept.irrigation_method).toBe('drip');
    expect(kept.equipment_hours).toBe(6);
  });

  it('drops a water source the dropdown has no option for', () => {
    // ⚠️ THIS TEST'S SIBLING ABOVE USED TO ASSERT `water_source: 'well'` SURVIVED — it was
    // pinning the defect. `water_source` is `valueType: 'enum'` and ProductionTab offers
    // well_groundwater / municipal / rainwater_harvesting / irrigation_canal / river_stream /
    // pond_reservoir / recycled_water / other. There is no `well`. So voice wrote a value into
    // form state that the select could not render, and the farmer saw "Select water source…"
    // on a field the banner had just reported as filled — the same defect the `air_blast` chip
    // exposed on 2026-09-03, one layer further in and with nothing on screen to reveal it.
    const { kept } = heardOn(
      parsed({ type: 'irrigation', water_source: 'well', detected_systems: [] }),
      PRODUCTION,
      'IR'
    );
    expect(kept.water_source).toBeUndefined();
  });

  it('reaches the catalogue values the English keyword chain never could', () => {
    // The old derivation was four `includes` checks against nine options, so `micro_sprinkler`,
    // `center_pivot`, `sub_irrigation`, `hand_watering` and `rain_fed` were unreachable in any
    // language — and "por goteo" matched nothing at all.
    for (const [spoken, expected] of [
      ['micro_sprinkler', 'micro_sprinkler'],
      ['center_pivot', 'center_pivot'],
      ['hand watering', 'hand_watering'],
      ['Sub-Irrigation', 'sub_irrigation']
    ] as const) {
      const { kept } = heardOn(
        parsed({ type: 'irrigation', irrigation_method: spoken, detected_systems: [] }),
        PRODUCTION,
        'IR'
      );
      expect(kept.irrigation_method, `${spoken} should reach ${expected}`).toBe(expected);
    }
  });

  it('drops an irrigation method that is not in the catalogue', () => {
    const { kept } = heardOn(
      parsed({ type: 'irrigation', irrigation_method: 'por goteo', detected_systems: [] }),
      PRODUCTION,
      'IR'
    );
    // The parser is asked (in every language) to answer with a catalogue value. When it does
    // not, the farmer picks — a near-match here would be the substitution `block_id` refuses.
    expect(kept.irrigation_method).toBeUndefined();
  });

  it('keeps a chemical utterance intact on a chemical form', () => {
    const { kept } = heardOn(
      parsed({
        type: 'fertilization',
        commercial_name: 'Zinc Sulfate 36%',
        detected_amounts: ['200 pounds', '5 acres']
      }),
      CHEMICAL,
      'FE'
    );
    expect(kept.commercial_name).toBe('Zinc Sulfate 36%');
    expect(kept.volume_applied).toBe(200);
    expect(kept.volume_unit).toBe('lb');
    expect(kept.area_treated).toBe(5);
    expect(kept.area_unit).toBe('acres');
  });

  it('never keeps a unit whose value field was dropped', () => {
    // Every unit in the companion map, asserted against a subtype that renders none
    // of their value fields. SS (Seed Search) records no measurement of this kind.
    const overrides: Record<string, unknown> = {};
    for (const [unit, owners] of Object.entries(VOICE_UNIT_COMPANIONS)) {
      overrides[unit] = 'lb';
      owners.forEach((o) => {
        overrides[o] = 1;
      });
    }
    const { kept } = gateVoiceOverridesToForm(overrides, PRODUCTION as never, 'SS' as never);
    for (const unit of Object.keys(VOICE_UNIT_COMPANIONS)) {
      expect(Object.keys(kept)).not.toContain(unit);
    }
  });

  it('an unknown subtype is a DEFERRAL, not a verdict (the soil window)', () => {
    // SoilManagementTab opens on `type: ''` — its subtype is a select inside the tab, so
    // voice can run before one exists. `area_covered` is visibleForSubtypes on 9 of the 10
    // soil subtypes, so gating against the empty subtype drops it. That is why NewEvent
    // HOLDS the detected set and re-gates on the subtype arriving, instead of telling the
    // farmer the activity cannot record what it plainly can. These two assertions are the
    // premise that deferral rests on — if they ever agree, the hold is dead weight.
    const detected = { area_covered: 12, area_unit: 'acres', equipment_hours: 3 };
    const unknown = gateVoiceOverridesToForm(detected, 5 as never, '' as never);
    const known = gateVoiceOverridesToForm(detected, 5 as never, 'OM' as never);

    expect(unknown.dropped).toContain('area_covered');
    expect(known.kept.area_covered).toBe(12);
    expect(known.kept.area_unit).toBe('acres');
    // ...and the ungated one survives either way, so the hold never blocks what already works
    expect(unknown.kept.equipment_hours).toBe(3);
  });

  it('chemical needs no deferral — its voice fields are ungated', () => {
    // The chemical tile (input_application) also carries no subtype, but every field voice
    // writes for it is ungated, so the unknown-subtype window is a no-op there.
    const detected = {
      commercial_name: 'Kocide 3000',
      volume_applied: 3,
      volume_unit: 'lb',
      area_treated: 12,
      area_unit: 'acres'
    };
    const unknown = gateVoiceOverridesToForm(detected, 2 as never, '' as never);
    expect(unknown.dropped).toEqual([]);
  });

  it('a unit is dropped when its own value is absent from the utterance', () => {
    const { kept, dropped } = gateVoiceOverridesToForm(
      { yield_unit: 'lb' }, // no yield_quantity alongside it
      PRODUCTION as never,
      'HA' as never
    );
    expect(kept).toEqual({});
    expect(dropped).toContain('yield_unit');
  });
});

describe('voice mismatch notice can always be rendered', () => {
  // Not a sample — EVERY entry. `handleVoiceSwitchType` feeds verbKey to both
  // `activities.verb.${key}` and `setPickedVerbKey`, so one bad key renders a raw
  // message id in the notice AND mistitles the page after the switch.
  it('every VOICE_TYPE_MAP verbKey is a real activity verb', () => {
    const verbKeys = new Set(ACTIVITY_VERBS.map((v) => v.key));
    const entries = Object.entries(VOICE_TYPE_MAP);
    expect(entries.length).toBeGreaterThan(10);
    for (const [name, mapping] of entries) {
      expect(verbKeys.has(mapping.verbKey), `${name} → ${mapping.verbKey}`).toBe(true);
    }
  });

  it('every verbKey points at a verb of the SAME event type it switches to', () => {
    // The switch calls handleEventTypeChange(backendEventType) and setPickedVerbKey(verbKey).
    // If those disagree the page titles itself as an activity it is not logging.
    const byKey = new Map(ACTIVITY_VERBS.map((v) => [v.key, v]));
    for (const [name, mapping] of Object.entries(VOICE_TYPE_MAP)) {
      const verb = byKey.get(mapping.verbKey);
      expect(verb, `${name} → ${mapping.verbKey}`).toBeDefined();
      expect(verb!.eventType, `${name}: verb ${mapping.verbKey}`).toBe(mapping.backendEventType);
    }
  });

  it('names the activity SPECIFICALLY, and in both locales', () => {
    // The confirmation line reads "Sounds like: {activity}". Using the verb-tile label made
    // a fertilizer utterance read "Input application" — true but vaguer than what the farmer
    // just said, and a downgrade from the hardcoded English it replaced. The registry's
    // subtype label is the specific one, and it is translated.
    for (const [name, mapping] of Object.entries(VOICE_TYPE_MAP)) {
      const key = voiceActivityLabelKey(mapping);
      expect(enUS, `en-US missing ${key} (${name})`).toHaveProperty(key);
      expect(es419, `es-419 missing ${key} (${name})`).toHaveProperty(key);
      // every entry WITH a subtype must resolve to the registry label, not the verb fallback
      if (mapping.backendSubtype) {
        expect(key, `${name} fell back to the verb label`).not.toMatch(/^activities\.verb\./);
      }
    }
    // and the specific label really is different from the broad one where they diverge
    const fe = mapVoiceTypeToTemplate('fertilization');
    expect(voiceActivityLabelKey(fe)).not.toBe(`activities.verb.${fe.verbKey}`);
    expect((enUS as Record<string, string>)[voiceActivityLabelKey(fe)]).not.toBe(
      (enUS as Record<string, string>)[`activities.verb.${fe.verbKey}`]
    );
  });

  it('a parser type that collides with Object.prototype is not "recognised"', () => {
    // `in` and plain indexing walk the prototype chain, and the parser's type string is not
    // a trusted enum. MEASURED before the fix: isRecognizedVoiceType('constructor') was true
    // and mapVoiceTypeToTemplate('constructor') returned the Object constructor AS the
    // mapping, so verbKey was undefined and the UI rendered `activities.verb.undefined`.
    for (const evil of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
      expect(isRecognizedVoiceType(evil), `${evil} passed as a recognised activity`).toBe(false);
      const m = mapVoiceTypeToTemplate(evil);
      expect(typeof m, `${evil} did not resolve to an object`).toBe('object');
      expect(m.templateId, `${evil} produced a mapping with no templateId`).toBe(
        'general_documentation'
      );
      expect(m.verbKey).toBe('other');
    }
  });

  it('every verbKey has a label in BOTH locales', () => {
    for (const [name, mapping] of Object.entries(VOICE_TYPE_MAP)) {
      const key = `activities.verb.${mapping.verbKey}`;
      expect(enUS, `en-US missing ${key} (${name})`).toHaveProperty(key);
      expect(es419, `es-419 missing ${key} (${name})`).toHaveProperty(key);
    }
  });

  it('the notice messages actually FORMAT in both locales', () => {
    // Key-existence proves nothing about ICU validity: a malformed plural throws only when
    // react-intl formats it, i.e. in front of the farmer.
    const cases: Array<[string, Record<string, unknown>]> = [
      ['events.voice.notRecordedHere', { count: 1 }],
      ['events.voice.notRecordedHere', { count: 3 }],
      ['events.voice.typeMismatch', { heard: 'Harvest' }],
      ['events.voice.switchTo', { heard: 'Harvest' }]
    ];
    for (const [locale, dict] of [
      ['en-US', enUS],
      ['es-419', es419]
    ] as Array<[string, Record<string, string>]>) {
      for (const [key, values] of cases) {
        const out = new IntlMessageFormat(dict[key], locale).format(values);
        expect(String(out).length, `${locale} ${key}`).toBeGreaterThan(0);
        expect(String(out), `${locale} ${key} left a placeholder`).not.toMatch(/[{}]/);
      }
    }
  });

  it('the notice keys exist in BOTH locales', () => {
    const keys = [
      'events.voice.notRecordedHere',
      'events.voice.typeMismatch',
      'events.voice.switchTo'
    ];
    for (const k of keys) {
      expect(enUS, `en-US missing ${k}`).toHaveProperty(k);
      expect(es419, `es-419 missing ${k}`).toHaveProperty(k);
    }
  });
});

describe('the activity the farmer already chose reaches the parser', () => {
  // The voice trigger sits inside step 2, which is only reachable once step 1 has collected
  // the verb tile and (for production) the subtype. So the activity is known before the
  // microphone opens, and the prompt can extract FIELDS instead of guessing the activity.
  it('resolves every production subtype the wizard can be on', () => {
    expect(voiceTypeForActivity(PRODUCTION, 'FP')).toBe('frost_protection');
    expect(voiceTypeForActivity(PRODUCTION, 'IR')).toBe('irrigation');
    expect(voiceTypeForActivity(PRODUCTION, 'HA')).toBe('harvest');
    expect(voiceTypeForActivity(CHEMICAL, 'FE')).toBe('fertilization');
  });

  it('agrees with the forward map for every entry', () => {
    // The inverse must not invent a pairing the forward map does not hold. Aliases
    // (fertilization/fertilizer → FE) may resolve to either key, so assert the MAPPING
    // round-trips rather than the slug.
    for (const [slug, mapping] of Object.entries(VOICE_TYPE_MAP)) {
      const resolved = voiceTypeForActivity(mapping.backendEventType, mapping.backendSubtype);
      expect(resolved, `${slug} did not resolve`).toBeTruthy();
      const back = VOICE_TYPE_MAP[resolved!];
      expect(back.backendEventType, `${slug} → ${resolved}`).toBe(mapping.backendEventType);
      expect(back.backendSubtype, `${slug} → ${resolved}`).toBe(mapping.backendSubtype);
    }
  });

  it('returns null while the subtype is unknown', () => {
    // Soil, pest and business ask their subtype inside the tab. Sending a family name as if it
    // were the chosen activity would put a guess into the prompt: production alone is eleven
    // different activities.
    expect(voiceTypeForActivity(PRODUCTION, null)).toBeNull();
    expect(voiceTypeForActivity(PRODUCTION, '')).toBeNull();
  });

  it('resolves an event type that has no subtype of its own', () => {
    // General documentation is one activity, not a family — there is nothing to guess.
    expect(voiceTypeForActivity(VOICE_TYPE_MAP.general.backendEventType, null)).toBe('general');
  });

  it('still resolves General when its own `type` field is filled in', () => {
    // MEASURED 2026-08-30, and the reason this test exists: GeneralTab's `type` field is
    // REQUIRED and holds an activity_type value ("meeting", "maintenance"), so
    // `eventFormData.type` is a non-empty string matching no mapping subtype. Gating the
    // subtype-less lookup on "no subtype in hand" therefore returned null for every General
    // activity — silently disabling the chosen-activity context AND the whole general field
    // list (activity_type, duration, people_involved) that had just been written for it.
    const GENERAL = VOICE_TYPE_MAP.general.backendEventType;
    expect(voiceTypeForActivity(GENERAL, 'meeting')).toBe('general');
    expect(voiceTypeForActivity(GENERAL, 'facility_maintenance')).toBe('general');
  });

  it('does not fall back to a family name for an event type made of subtypes', () => {
    // The other half of that fix: production is eleven different activities, so an unknown
    // subtype must stay null rather than resolve to whichever entry is listed first.
    expect(voiceTypeForActivity(PRODUCTION, 'NOT_A_SUBTYPE')).toBeNull();
    expect(voiceTypeForActivity(CHEMICAL, 'NOT_A_SUBTYPE')).toBeNull();
  });

  it('the panel actually sends it', () => {
    // Grep USAGE, not definition: a helper nothing calls is the orphaned-feature class.
    const capture = readFileSync(
      join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
      'utf8'
    );
    expect(capture, 'known_activity is not in the request body').toMatch(
      /known_activity: knownActivity/
    );
    const newEvent = readFileSync(
      join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    // Derived from the activity the wizard already holds, and handed to the panel. Asserted as
    // two steps rather than one inline expression so a refactor into a memo does not read as a
    // regression — what matters is the source of the value and that the panel receives it.
    expect(newEvent, 'the wizard never derives the chosen activity').toMatch(
      /voiceTypeForActivity\(activeEventType, eventFormData\.type\)/
    );
    expect(newEvent, 'the wizard never passes the chosen activity').toMatch(
      /knownActivity=\{voiceActivitySlug\}/
    );
    // ...and the per-activity field list built from the display registry.
    expect(newEvent, 'the wizard never passes the field list').toMatch(
      /fieldRequests=\{voiceFieldRequests\}/
    );
    expect(newEvent).toMatch(/buildVoiceFieldRequests\(/);
  });

  it('a context-defaulted activity is never presented as a detection', () => {
    // `activity_from_context` means the parser could not name an activity and the form's own
    // answer was used. Printing "Sounds like: Frost protection" over that credits the
    // microphone with something it never worked out.
    const capture = readFileSync(
      join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
      'utf8'
    );
    expect(capture).toMatch(/activity_from_context === true/);
    expect(capture).toMatch(/isRecognizedVoiceType\(parsedData\.type\) && !activityFromContext/);
  });
});

describe('a real parse that the mapper used to choke on', () => {
  it('survives null arrays instead of throwing', () => {
    // MEASURED 2026-09-01 on "Cold night last night, got down to about twenty seven, had the wind
    // machines going from two till six over in Ridge Block": the parser answered
    // `detected_amounts: null` rather than omitting the key, and `extractStructuredAmounts` called
    // `.map` on it. Pressing "Use these details" threw and applied nothing.
    //
    // The backend now coerces at the source (`.get(k) or []` — `.get(k, [])` returns None for a
    // key that is PRESENT and null, which is what bit us). This is the client half.
    const parsed = {
      type: 'frost_protection',
      description: 'frost protection',
      confidence: 90,
      detected_amounts: null,
      detected_products: null,
      detected_systems: null,
      original_transcript: 'cold night, ran the wind machines',
      // Ticked, because that is now the only way the transcript reaches the notes box.
      note_opt_in: true
    } as never;
    const mapping = mapVoiceTypeToTemplate('frost_protection');
    expect(() => mapVoiceDataToFieldValues(parsed, mapping.templateId)).not.toThrow();
    const result = mapVoiceDataToFieldValues(parsed, mapping.templateId);
    expect(result.values.observation).toBe('cold night, ran the wind machines');
  });

  it('never guesses the unit of a spoken depth', () => {
    // "unos cinco centímetros" arrived as {value: 5, unit: "centimetros"} and was recorded as 5
    // INCHES, because anything the mapper did not recognise fell through to inches. 12.7cm of
    // water on a certifier record, from a farmer who said 5.
    const parse = (unit: string) => {
      const parsed = {
        type: 'irrigation',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 5, unit, category: 'depth' }],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'riego'
      } as never;
      const result = mapVoiceDataToFieldValues(parsed, 'irrigation');
      // `values` also carries the TEMPLATE defaults (irrigation ships a 1.0 depth), so asking it
      // "did voice write this?" answers yes for a field voice never touched. `overriddenFields`
      // is the list of what the utterance actually produced.
      return { values: result.values, wrote: result.overriddenFields };
    };

    expect(parse('centimetros').values.irrigation_depth_unit).toBe('cm');
    expect(parse('inches').values.irrigation_depth_unit).toBe('inches');
    expect(parse('pulgadas').values.irrigation_depth_unit).toBe('inches');
    // ...and an unrecognised unit drops the VALUE too: a blank field the farmer fills beats a
    // plausible number that is off by 2.5x.
    expect(parse('bushels').wrote).not.toContain('irrigation_depth');
    expect(parse('bushels').wrote).not.toContain('irrigation_depth_unit');
    expect(parse('centimetros').wrote).toContain('irrigation_depth');
  });
});

describe('an amount is only an amount if its unit was said', () => {
  // MEASURED 2026-09-01 from a real dictation: speech-to-text wrote "Kocide 3000-O" as "Kocide
  // three thousand dot o", the parser read the 3000 out of the PRODUCT NAME as a quantity, and
  // then supplied a unit for it — `{value: 3000, unit: "gallons"}` from a sentence in which
  // nobody said gallons. It showed the farmer a "3000 gallons" chip next to the real "3.5 lbs",
  // and on an utterance with no weight in it that invented volume is what reaches
  // `volume_applied`.
  const SAID =
    'Apply at spray Kocide three thousand dot o on the east block three and a half pound Acre, air air blast for walnut blight.';

  it('keeps the amount the farmer spoke a unit for', () => {
    const kept = amountsActuallySpoken(
      [
        { value: 3.5, unit: 'lbs', category: 'weight' },
        { value: 3000, unit: 'gallons', category: 'volume' }
      ],
      SAID
    );
    expect(kept).toEqual([{ value: 3.5, unit: 'lbs', category: 'weight' }]);
  });

  it('matches a unit through its synonyms', () => {
    // The farmer said "pound"; the parser answered "lbs".
    expect(
      amountsActuallySpoken([{ value: 3.5, unit: 'lbs' }], 'three and a half pound')
    ).toHaveLength(1);
    expect(amountsActuallySpoken([{ value: 2, unit: 'acres' }], 'two Acre')).toHaveLength(1);
  });

  it('fails OPEN when it recognises no unit at all', () => {
    // Units arrive in the farmer's language and only some are in the synonym map. Filtering
    // against a vocabulary we half-speak would drop every amount in Spanish, which is far worse
    // than one bogus chip.
    const spanish = [{ value: 5, unit: 'centimetros', category: 'depth' }];
    expect(amountsActuallySpoken(spanish, 'regamos unos cinco centimetros')).toHaveLength(1);
  });

  it('the bogus volume never reaches the form', () => {
    // ⚠️ NO weight in this payload, on purpose. With one present the chemical mapper prefers it
    // and the test passes whether or not the filter exists — which is exactly how the first
    // version of this test was vacuous. The dangerous utterance is the one where the invented
    // volume is the ONLY amount, because then it is what lands in `volume_applied`.
    const parsed = {
      type: 'fungicide',
      description: '',
      confidence: 90,
      detected_amounts: [{ value: 3000, unit: 'gallons', category: 'volume' }],
      detected_products: ['Kocide'],
      detected_systems: [],
      original_transcript: 'sprayed Kocide three thousand dot o on the east block, one pound'
    } as never;
    const result = mapVoiceDataToFieldValues(parsed, 'fungicide');
    // ⚠️ Asserted on `overriddenFields`, NOT on `values`: the fungicide template prefills a
    // volume of its own, so `values.volume_applied` is a number whether or not voice wrote one.
    // Asking `values` "did voice write this?" answers yes for a field voice never touched.
    expect(result.overriddenFields).not.toContain('volume_applied');
  });

  it('...and a volume the farmer DID say still reaches it', () => {
    // The other half: a filter that drops everything would "pass" the test above while killing
    // the feature.
    const parsed = {
      type: 'fungicide',
      description: '',
      confidence: 90,
      detected_amounts: [{ value: 40, unit: 'gallons', category: 'volume' }],
      detected_products: ['Kocide'],
      detected_systems: [],
      original_transcript: 'sprayed forty gallons of Kocide on the east block'
    } as never;
    const result = mapVoiceDataToFieldValues(parsed, 'fungicide');
    expect(result.overriddenFields).toContain('volume_applied');
    expect(result.values.volume_applied).toBe(40);
    expect(result.values.volume_unit).toBe('gal');
  });
});

describe('a rate is not a total', () => {
  // MEASURED 2026-09-02 on the October demo line itself. "Sprayed Kocide 3000-O on the east
  // block, three and a half pounds an acre, air-blast, for walnut blight" wrote 3.5 into
  // `volume_applied`, whose help text reads "Total volume of product applied". The total is
  // 3.5 x the acreage; 3.5 is the rate. That number prints on the certifier packet and is what
  // CA PUR is filled from.
  //
  // The backend prompt already refuses to read the "1" out of "per acre" as an AREA. This is
  // the other half of the same sentence, and the prompt cannot fix it: the model is right that
  // 3.5 pounds was said. What it cannot know is that the field on the other side holds a total.

  it('reads "three and a half pounds an acre" as a rate', () => {
    expect(amountIsSpokenAsRate('three and a half pounds an acre, air-blast', 'lbs')).toBe(true);
  });

  it('reads it as a rate when speech-to-text swallowed the article', () => {
    // The real dictation: "an" did not survive Deepgram.
    expect(amountIsSpokenAsRate('three and a half pound Acre, air air blast', 'lbs')).toBe(true);
  });

  it('reads a unit it does not canonicalise, through the overlap in its name', () => {
    // "fluid ounces" is in no synonym map; "ounces" is the word in the sentence.
    expect(amountIsSpokenAsRate('Six fluid ounces an acre, airblast.', 'fluid ounces')).toBe(true);
  });

  it('reads the Spanish and Portuguese forms', () => {
    expect(amountIsSpokenAsRate('doscientas libras por acre de harina', 'lbs')).toBe(true);
    expect(amountIsSpokenAsRate('duzentos quilos por hectare', 'kg')).toBe(true);
  });

  it('leaves a genuine TOTAL alone', () => {
    // The other half. A filter that answered true for everything would pass every test above
    // and silently kill the one field a spray record most needs.
    expect(
      amountIsSpokenAsRate('sprayed forty gallons of Kocide on the east block', 'gallons')
    ).toBe(false);
    expect(amountIsSpokenAsRate('spread two hundred pounds of feather meal', 'lbs')).toBe(false);
    // "per week" is a rate against TIME, not land — and says nothing about a total.
    expect(amountIsSpokenAsRate('forty gallons a week', 'gallons')).toBe(false);
  });

  it('keeps a total that shares a sentence with a rate', () => {
    // `every`, not `some`: gallons is said once, as a total.
    expect(
      amountIsSpokenAsRate('put out 200 gallons of water at 3.5 pounds an acre', 'gallons')
    ).toBe(false);
    expect(amountIsSpokenAsRate('put out 200 gallons of water at 3.5 pounds an acre', 'lbs')).toBe(
      true
    );
  });

  it('the rate never reaches Total Volume Applied', () => {
    // ⚠️ Asserted on `overriddenFields`, not `values`: the fungicide template prefills a volume
    // of its own, so `values.volume_applied` is a number whether or not voice wrote one.
    const parsed = {
      type: 'fungicide',
      description: '',
      confidence: 90,
      detected_amounts: [{ value: 3.5, unit: 'lbs', category: 'weight' }],
      detected_products: ['Kocide 3000-O'],
      detected_systems: ['air-blast'],
      original_transcript:
        'Sprayed Kocide 3000-O on the east block, three and a half pounds an acre, air-blast, for walnut blight'
    } as never;
    const result = mapVoiceDataToFieldValues(parsed, 'fungicide');
    expect(result.overriddenFields).not.toContain('volume_applied');
    expect(result.overriddenFields).not.toContain('volume_unit');
    // ...and the product and method it DID hear still land, so the drop is surgical.
    expect(result.overriddenFields).toContain('commercial_name');
  });

  it('an acre spoken as a real area still fills the area', () => {
    const parsed = {
      type: 'fungicide',
      description: '',
      confidence: 90,
      detected_amounts: [{ value: 12, unit: 'acres', category: 'area' }],
      detected_products: ['Kocide'],
      detected_systems: [],
      original_transcript: 'sprayed Kocide across the whole twelve acres'
    } as never;
    const result = mapVoiceDataToFieldValues(parsed, 'fungicide');
    expect(result.overriddenFields).toContain('area_treated');
    expect(result.values.area_treated).toBe(12);
  });
});

describe('the rate the record can finally hold', () => {
  // `application_rate` + `application_rate_unit` shipped 2026-09-03. Before them a spoken rate
  // had two endings and both were wrong: land in `volume_applied` ("Total volume of product
  // applied") and be off by the whole acreage, or be dropped so the record simply lost the
  // number the grower said and the label prints.

  const sprayed = (transcript: string, amounts: unknown[]) =>
    mapVoiceDataToFieldValues(
      {
        type: 'fungicide',
        description: '',
        confidence: 90,
        detected_amounts: amounts,
        detected_products: ['Entrust'],
        detected_systems: ['airblast'],
        original_transcript: transcript
      } as never,
      'fungicide'
    );

  it('records the demo utterance as a rate, not a total', () => {
    const result = sprayed(
      'Sprayed Entrust on the east block, six fluid ounces an acre, airblast.',
      [{ value: 6, unit: 'fluid ounces', category: 'volume' }]
    );
    expect(result.values.application_rate).toBe(6);
    expect(result.values.application_rate_unit).toBe('fl_oz_ac');
    // ...and emphatically NOT the total.
    expect(result.overriddenFields).not.toContain('volume_applied');
  });

  it('records the Kocide line the same way', () => {
    const result = sprayed(
      'Sprayed Kocide 3000-O on the east block, three and a half pounds an acre, air-blast, for walnut blight',
      [{ value: 3.5, unit: 'lbs', category: 'weight' }]
    );
    expect(result.values.application_rate).toBe(3.5);
    expect(result.values.application_rate_unit).toBe('lb_ac');
    expect(result.overriddenFields).not.toContain('volume_applied');
  });

  it('records a metric rate', () => {
    const result = sprayed('apliquei duzentos quilos por hectare', [
      { value: 200, unit: 'quilos', category: 'weight' }
    ]);
    expect(result.values.application_rate).toBe(200);
    expect(result.values.application_rate_unit).toBe('kg_ha');
  });

  it('writes NO rate for a total', () => {
    const result = sprayed('sprayed forty gallons of Kocide on the east block', [
      { value: 40, unit: 'gallons', category: 'volume' }
    ]);
    expect(result.overriddenFields).not.toContain('application_rate');
    // The total still lands where it belongs.
    expect(result.values.volume_applied).toBe(40);
  });

  it('writes NO rate for a denominator the dropdown has no option for', () => {
    // "Twenty gallons a tree" IS a rate — so it stays out of the total — but there is no
    // per-tree option, and an enum value the form cannot render is one the farmer cannot fix.
    const result = sprayed('irrigated at twenty gallons a tree', [
      { value: 20, unit: 'gallons', category: 'volume' }
    ]);
    expect(result.overriddenFields).not.toContain('application_rate');
    expect(result.overriddenFields).not.toContain('volume_applied');
  });

  it('names the denominator it heard', () => {
    expect(spokenRateDenominator('three and a half pounds an acre', 'lbs')).toBe('acre');
    expect(spokenRateDenominator('duzentos quilos por hectare', 'kg')).toBe('hectare');
    expect(spokenRateDenominator('forty gallons of Kocide', 'gallons')).toBeNull();
  });

  it('only ever produces a code the form actually offers', () => {
    expect(rateUnitCode('fluid ounces', 'acre')).toBe('fl_oz_ac');
    expect(rateUnitCode('libras', 'acre')).toBe('lb_ac');
    expect(rateUnitCode('gallons', 'hectare')).toBeNull(); // gal/ha is on no label
    expect(rateUnitCode('gallons', 'tree')).toBeNull();
    expect(rateUnitCode(undefined, 'acre')).toBeNull();
    for (const option of APPLICATION_RATE_UNITS) {
      expect(APPLICATION_RATE_UNIT_SYMBOLS[option.value]).toBeTruthy();
    }
  });

  it('the unit rides through the render gate with its value', () => {
    // A gate that asked the registry about `application_rate_unit` directly would strip it and
    // leave a bare number — "6" beside "Application Rate", with the denominator gone.
    const { kept } = gateVoiceOverridesToForm(
      { application_rate: 6, application_rate_unit: 'fl_oz_ac' },
      2,
      'PE'
    );
    expect(kept.application_rate).toBe(6);
    expect(kept.application_rate_unit).toBe('fl_oz_ac');
  });

  it('the form renders both halves', () => {
    // The registry may declare a field, but ChemicalTab is hand-written: a value gated in and
    // never rendered is a value on the record the farmer never saw.
    const tab = readFileSync(
      join(__dirname, '../../views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx'),
      'utf8'
    );
    expect(tab).toMatch(/name="application_rate"/);
    expect(tab).toMatch(/name="application_rate_unit"/);
    // Both halves or neither — a unit with no number is a denominator attached to silence.
    expect(tab).toMatch(/data\.application_rate && data\.application_rate_unit/);
  });
});

describe('the category comes from the unit, not from the model', () => {
  // 🔴 MEASURED 2026-09-03 on a real dictation, and it cost the record a number the farmer said
  // out loud: "Sprayed Entrust on the east block. Six fluid ounces an acre, 40 gallons total,
  // airblast." — Volume Applied came out EMPTY. The backend parse was right both times; what
  // varied between runs of the identical sentence was the model's own bookkeeping:
  //
  //   {value: 6, unit: 'fluid ounces', category: 'volume'}   // one run
  //   {value: 6, unit: 'fluid ounces'}                       // the next
  //
  // Every consumer of the amounts array selects on `category`, so a missing key means the total
  // never reaches `volume_applied` — and the banner never mentions the field, so the farmer has
  // no way to notice.
  const TX =
    'Sprayed Entrust on the east block. Six fluid ounces an acre, 40 gallons total, airblast.';

  const sprayedWith = (amounts: unknown[]) =>
    mapVoiceDataToFieldValues(
      {
        type: 'pesticide',
        description: '',
        confidence: 90,
        detected_amounts: amounts,
        detected_products: ['Entrust'],
        detected_systems: ['airblast'],
        original_transcript: TX,
        commercial_name: 'Entrust',
        application_method: 'airblast'
      } as never,
      'pest_control'
    );

  it('still reads the rate when the model omitted the category', () => {
    // The original defect this block was written for: a missing `category` key made the whole
    // amount invisible to every `find(a => a.category === ...)` in the mapper. Deriving the
    // category from the unit is what keeps the six fluid ounces reachable at all.
    const result = sprayedWith([
      { value: 6, unit: 'fluid ounces' },
      { value: 40, unit: 'gallons' }
    ]);
    expect(result.values.application_rate).toBe(6);
    expect(result.values.application_rate_unit).toBe('fl_oz_ac');
  });

  it('repairs a category that contradicts its unit', () => {
    // `count` on a gallons amount is the model's bookkeeping, not a fact about the world.
    const [gallons] = extractStructuredAmounts([
      { value: 40, unit: 'gallons', category: 'count' }
    ] as never);
    expect(gallons?.category).toBe('volume');
  });

  it('the 40 gallons is the TANK and never becomes the product amount', () => {
    // 🔴 MEASURED 2026-09-03 in the buyer-page preview, on camera. The two tests above used to
    // assert `volume_applied === 40` — they were written the day before to fix an EMPTY volume
    // box, and fixing it that way put the spray volume in the product-amount field.
    //
    // Forty gallons of Entrust is not a plausible reading of this sentence: the label rate is
    // six fluid ounces an acre. The 40 gallons is the carrier the product was mixed into. That
    // field prints in the certifier packet's "Amount / Rate" column, and CA PUR (DPR-PML-017C)
    // and the CCOF materials form both ask for PRODUCT amount, so the record would have told
    // three separate readers the operation applied 5,120 fluid ounces of a spinosad product.
    //
    // Asserted on `overriddenFields`, not on `values`: the pest_control template prefills a
    // volume of its own, so `values.volume_applied` is a number either way.
    for (const amounts of [
      [
        { value: 6, unit: 'fluid ounces', category: 'volume' },
        { value: 40, unit: 'gallons', category: 'volume' }
      ],
      // ...and with the model's category bookkeeping missing, which is how it actually arrived.
      [
        { value: 6, unit: 'fluid ounces' },
        { value: 40, unit: 'gallons' }
      ]
    ]) {
      const result = sprayedWith(amounts);
      expect(result.overriddenFields).not.toContain('volume_applied');
      expect(result.overriddenFields).not.toContain('volume_unit');
      expect(result.values.application_rate).toBe(6);
    }
  });

  it('keeps a total quoted in the rate\u2019s own unit, and drops one that is not', () => {
    // The other direction, so the guard is not simply "drop every second number".
    //
    // Tested on the helper rather than through a transcript, because the rate DETECTOR cannot
    // reach this shape: `spokenRateDenominator` anchors on the unit word, and a sentence saying
    // "pounds" twice ("two pounds an acre, twenty four pounds total") fails its `every` check
    // and reports no rate at all. That is a pre-existing limitation of the anchor logic, not
    // something this guard introduced, and it fails SAFE — with no rate detected, the first
    // amount is taken as the total exactly as before.
    const oz = { value: 6, unit: 'fluid ounces', category: 'volume' };
    const total = { value: 75, unit: 'fluid ounces', category: 'volume' };
    const tank = { value: 40, unit: 'gal', category: 'volume' };
    expect(productTotalFromAmounts([total], 'fluid ounces')).toEqual(total);
    expect(productTotalFromAmounts([tank], 'fluid ounces')).toBeNull();
    // No rate in the sentence at all: the plain reading holds.
    expect(productTotalFromAmounts([tank], undefined)).toEqual(tank);
    // A rate unit the numerator map cannot name is not a licence to take the leftover.
    expect(productTotalFromAmounts([tank], 'bushels')).toBeNull();
    expect(oz.value).toBe(6);
  });

  it('a total spoken with NO rate still lands', () => {
    // Nothing to contradict it, so the plain reading holds. This is the case the empty-volume
    // fix was really about.
    const result = mapVoiceDataToFieldValues(
      {
        type: 'pesticide',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 40, unit: 'gallons' }],
        detected_products: ['Entrust'],
        detected_systems: [],
        original_transcript: 'sprayed forty gallons of Entrust on the east block'
      } as never,
      'pest_control'
    );
    expect(result.overriddenFields).toContain('volume_applied');
    expect(result.values.volume_applied).toBe(40);
    expect(result.values.volume_unit).toBe('gal');
  });

  it('derives every dimension the mapper selects on', () => {
    const cases: Array<[string, string]> = [
      ['lbs', 'weight'],
      ['libras', 'weight'],
      ['tons', 'weight'],
      ['gallons', 'volume'],
      ['fluid ounces', 'volume'],
      ['litros', 'volume'],
      ['acres', 'area'],
      ['hectáreas', 'area'],
      ['hours', 'time'],
      ['inches', 'depth'],
      ['centimetros', 'depth']
    ];
    for (const [unit, expected] of cases) {
      const [amount] = extractStructuredAmounts([{ value: 1, unit }] as never);
      expect(amount?.category, `${unit} should be ${expected}`).toBe(expected);
    }
  });

  it('leaves a unit it does not know to the model', () => {
    // `fuel` and `count` are interpretations the unit cannot supply — a gallon is a gallon
    // whether it holds diesel or water — so the parser's own label survives for those.
    const [trees] = extractStructuredAmounts([
      { value: 240, unit: 'trees', category: 'count' }
    ] as never);
    expect(trees?.category).toBe('count');
  });

  it('still drops the depth unit it cannot name', () => {
    // The pre-existing rule: a depth whose unit is neither inches nor cm writes nothing rather
    // than defaulting. Deriving the CATEGORY must not smuggle a value past that.
    const result = mapVoiceDataToFieldValues(
      {
        type: 'irrigation',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 5, unit: 'bushels' }],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'irrigated about five bushels deep'
      } as never,
      'irrigation'
    );
    expect(result.overriddenFields).not.toContain('irrigation_depth');
  });
});

describe('what the banner claims, the form must show', () => {
  // 🔴 MEASURED 2026-09-03 on one dictation: "Sprayed Entrust on the east block, six fluid
  // ounces an acre, 40 gallons total, airblast." The banner said five fields were filled —
  // including Volume Applied and Application Method — and BOTH inputs were empty on screen.
  // Two independent causes, one symptom: the farmer is told a value was captured and cannot
  // see it, which is worse than voice filling nothing.

  it('resolves a spoken method to a value the dropdown can render', () => {
    // The PE dropdown's value is `air_blast`. "airblast" is not it, so the select fell back to
    // its placeholder while the form state held a value no option could display.
    expect(matchApplicationMethod('airblast', 'pest_control')).toBe('air_blast');
    expect(matchApplicationMethod('Air-Blast', 'fungicide')).toBe('air_blast');
    expect(matchApplicationMethod('air blast', 'herbicide')).toBe('air_blast');
  });

  it('drops a method this subtype has no option for', () => {
    // Fertilizer offers broadcast/banded/subsurface/fertigation/foliar — no air_blast. A
    // dropdown that renders five options and receives a sixth stores a value no form can show.
    expect(matchApplicationMethod('airblast', 'fertilization')).toBeNull();
    expect(matchApplicationMethod('by helicopter', 'pest_control')).toBeNull();
    expect(matchApplicationMethod('', 'pest_control')).toBeNull();
    // ...and a value that IS the catalogue's own passes untouched.
    expect(matchApplicationMethod('fertigation', 'fertilization')).toBe('fertigation');
  });

  it('writes the normalised method, end to end', () => {
    const result = mapVoiceDataToFieldValues(
      {
        type: 'pesticide',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: ['Entrust'],
        detected_systems: ['airblast'],
        original_transcript: 'Sprayed Entrust on the east block, airblast.'
      } as never,
      'pest_control'
    );
    expect(result.values.application_method).toBe('air_blast');
  });

  it('shows a chip for a unit the synonym map has never heard of', () => {
    // The other half of the same screenshot: chips read "40 gallons / Entrust / airblast" and
    // omitted the six fluid ounces. UNIT_NORMALIZE has no "fluid ounces", so the canonical
    // check answered "never spoken" about words the farmer plainly said — and only when
    // ANOTHER amount used a recognised unit, since with none the filter bails out and keeps
    // everything.
    const TX =
      'Sprayed Entrust on the east block, six fluid ounces an acre, 40 gallons total, airblast.';
    const kept = amountsActuallySpoken(
      [
        { value: 6, unit: 'fluid ounces' },
        { value: 40, unit: 'gallons' }
      ],
      TX
    );
    expect(kept).toHaveLength(2);
  });

  it('...and still drops the unit that was never said', () => {
    // The failure this filter exists for: "Kocide three thousand dot o" produced a 3000 with a
    // unit supplied out of thin air. Widening the test must not resurrect it.
    const kept = amountsActuallySpoken(
      [
        { value: 3.5, unit: 'lbs' },
        { value: 3000, unit: 'gallons' }
      ],
      'spray Kocide three thousand dot o on the east block three and a half pound Acre'
    );
    expect(kept).toEqual([{ value: 3.5, unit: 'lbs' }]);
  });

  it('the tab prefers a real number over an empty twin', () => {
    // `volume_numeric` is what the input binds; `volume_applied` is what the registry and the
    // voice mapper call the same number. `onDataChange` reports the whole form up every 500ms,
    // so the twin is `''` within a second of the tab opening — and the reset hydrated it with
    // `!== undefined && !== null`, which counts an empty string as a value. Voice's 40 was
    // thrown away on the remount that was supposed to deliver it.
    const tab = readFileSync(
      join(__dirname, '../../views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx'),
      'utf8'
    );
    expect(tab).toMatch(/const firstFilled = \(\.\.\.candidates\)/);
    expect(tab).toMatch(/text\.trim\(\) !== ''/);
    for (const field of [
      'volume_numeric: firstFilled',
      'volume_applied: firstFilled',
      'area_numeric: firstFilled',
      'area_treated: firstFilled'
    ]) {
      expect(tab, `${field} must hydrate through firstFilled`).toContain(field);
    }
    // The precedence that discarded it must be gone from these four, not merely shadowed.
    expect(tab).not.toMatch(/volume_numeric:\s*\n?\s*initialValues\.volume_numeric !== undefined/);
    expect(tab).not.toMatch(/area_numeric:\s*\n?\s*initialValues\.area_numeric !== undefined/);
  });
});

describe('the farmer speaks Spanish, the model answers in English', () => {
  // 🔴 MEASURED 2026-09-03, the language half of the October demo:
  //   "¿Apliqué Kocide 3000 o en el bloque este, 3 libras y media por acre, con nebulizadora."
  // The backend read it perfectly — {3.5, "lbs"}, area null, "3 libras y media" resolved to 3.5.
  // The CLIENT then dropped it: the amount says "lbs", the transcript says "libras", and the
  // unit tests around it are all transcript-word tests. No chip, no application_rate.
  const TX =
    '¿Apliqué Kocide 3000 o en el bloque este, 3 libras y media por acre, con nebulizadora.';

  it('recognises a unit the farmer said in another language', () => {
    expect(amountsActuallySpoken([{ value: 3.5, unit: 'lbs' }], TX)).toHaveLength(1);
    expect(
      amountsActuallySpoken([{ value: 200, unit: 'kg' }], 'apliqué doscientos kilos por hectárea')
    ).toHaveLength(1);
    expect(
      amountsActuallySpoken([{ value: 40, unit: 'gal' }], 'apliquei quarenta galões no total')
    ).toHaveLength(1);
  });

  it('still refuses a unit nobody said, in any language', () => {
    // The guard this filter exists for must survive the widening.
    expect(
      amountsActuallySpoken([{ value: 3000, unit: 'gallons' }], 'apliqué 3 libras y media por acre')
    ).toHaveLength(0);
  });

  it('records the Spanish rate end to end', () => {
    const result = mapVoiceDataToFieldValues(
      {
        type: 'fungicide',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 3.5, unit: 'lbs', category: 'weight' }],
        detected_products: ['Kocide 3000'],
        detected_systems: [],
        original_transcript: TX,
        commercial_name: 'Kocide 3000',
        application_method: 'air_blast'
      } as never,
      'fungicide'
    );
    expect(result.values.application_rate).toBe(3.5);
    expect(result.values.application_rate_unit).toBe('lb_ac');
    // "por acre" is a rate, so it is not an area and not a total — in Spanish too.
    expect(result.overriddenFields).not.toContain('area_treated');
    expect(result.overriddenFields).not.toContain('volume_applied');
  });
});

describe("the panel speaks the farmer's language, not the database's", () => {
  // 🔴 MEASURED 2026-09-03 on a Spanish record: the chip under "Esto es lo que escuchamos" read
  // **air_blast**. The farmer said "con nebulizadora". The panel's whole job is to hand the
  // words back for checking, and what it handed back was an internal enum key — the same
  // failure as the raw `waste_reduction` a shopper once saw in the company-goal picker.
  //
  // It was invisible until that morning: the parser used to answer free text, so the chip was
  // echoing the grower's own word and there was nothing to translate. Teaching it to answer
  // catalogue values — which is what got the method into the form at all — turned a passthrough
  // into a leak. Every fix that makes a value canonical creates one of these.
  const capture = readFileSync(
    join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
    'utf8'
  );

  it('resolves a catalogue method to its i18n key', () => {
    expect(applicationMethodLabelKey('air_blast')).toBe('events.applicationMethods.airBlast');
    expect(applicationMethodLabelKey('broadcast')).toBe('events.applicationMethods.broadcast');
    expect(applicationMethodLabelKey('fertigation')).toBe('events.applicationMethods.fertigation');
  });

  it('leaves free text alone', () => {
    // Legacy events stored whatever the farmer said. That is already their wording.
    expect(applicationMethodLabelKey('nebulizadora')).toBeNull();
    expect(applicationMethodLabelKey('')).toBeNull();
    expect(applicationMethodLabelKey(undefined)).toBeNull();
  });

  it('has a real label in BOTH locales for every method the parser may answer', () => {
    // A key with no Spanish entry renders English on a Spanish page, which is the quieter half
    // of the same bug.
    const es = es419 as Record<string, string>;
    const en = enUS as Record<string, string>;
    for (const value of [
      'broadcast',
      'banded',
      'subsurface',
      'fertigation',
      'foliar',
      'ground_spray',
      'air_blast',
      'aerial',
      'chemigation',
      'seed_treatment',
      'injection',
      'drip',
      'banding'
    ]) {
      const key = applicationMethodLabelKey(value);
      expect(key, `${value} is not in the catalogue`).toBeTruthy();
      expect(en[key as string], `${value} has no en-US label`).toBeTruthy();
      expect(es[key as string], `${value} has no es-419 label`).toBeTruthy();
    }
    // The one that started it.
    expect(es['events.applicationMethods.airBlast']).toBe('Pulverizadora de aire');
  });

  it('the chip renders the label, never the stored code', () => {
    expect(capture).toMatch(/applicationMethodChip/);
    // The raw passthrough must be gone, not merely shadowed.
    expect(capture).not.toMatch(/\{parsedData\.application_method\}/);
  });

  it('the duplicate filter compares against the label too', () => {
    // `detected_systems` holds the farmer's word. Once the method became `air_blast` it stopped
    // overlapping with "nebulizadora", so the same fact would print as two chips.
    expect(capture).toMatch(
      /const methodLower = \(applicationMethodChip \|\| ''\)\.toLowerCase\(\)/
    );
  });
});

describe('the model answers from the words, not from the tile', () => {
  // A 19-activity sweep on 2026-09-02 fed each form an utterance mentioning NONE of the fields
  // it asks for. Two shapes came back, both identical across runs, both unmoved by prompt rules
  // written straight at them.
  const MOWING = [
    {
      name: 'floor_management_type',
      label: 'Floor Management',
      type: 'enum' as const,
      options: ['mow', 'mulch', 'cover_crop_mgmt', 'flame_weed']
    },
    { name: 'method', label: 'Operation Method', type: 'text' as const }
  ];
  const heard = (transcript: string, activity_fields: Record<string, unknown>, fields = MOWING) =>
    mapVoiceDataToFieldValues(
      {
        type: 'mowing',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        original_transcript: transcript,
        activity_fields
      } as never,
      'mowing',
      fields
    ).values;

  it('drops an answer that is the field label handed back', () => {
    // MEASURED: "Ran the tractor through the east block" on Cultivation -> method:
    // "Operation Method". Free text, so every other check passes and the farmer finds the
    // label typed into the box.
    expect(
      heard('ran the tractor through the east block', { method: 'Operation Method' }).method
    ).toBeUndefined();
    // Case and punctuation do not rescue it.
    expect(heard('ran the tractor through', { method: 'operation-method' }).method).toBeUndefined();
  });

  it('keeps a method the farmer actually described', () => {
    expect(heard('disced the east block this morning', { method: 'Discing' }).method).toBe(
      'Discing'
    );
  });

  it('drops a floor-management type with no trace in the sentence', () => {
    // Neither utterance contains a mowing verb; both answered "mow", twice each.
    expect(
      heard('went through the middles this morning with the tractor', {
        floor_management_type: 'mow'
      }).floor_management_type
    ).toBeUndefined();
    expect(
      heard('took care of the orchard floor on the east block today', {
        floor_management_type: 'mow'
      }).floor_management_type
    ).toBeUndefined();
  });

  it('keeps every floor-management type the words DO carry', () => {
    // The other half, and the reason the field is gated rather than retired. Conjugation is
    // matched on the stem, and the label supplies the words for cover_crop_mgmt.
    expect(
      heard('flail mowed the middles', { floor_management_type: 'mow' }).floor_management_type
    ).toBe('mow');
    expect(
      heard('mulched the middles with the chipper', { floor_management_type: 'mulch' })
        .floor_management_type
    ).toBe('mulch');
    expect(
      heard('mowed down the cover crop between the rows', {
        floor_management_type: 'cover_crop_mgmt'
      }).floor_management_type
    ).toBe('cover_crop_mgmt');
  });

  it('leaves classification enums free to paraphrase', () => {
    // ⚠️ The gate is opt-in for a reason. "Going to the packing house" -> `handler` shares no
    // word with its answer, and most enums are that kind. A blanket echo rule would gut them.
    const values = mapVoiceDataToFieldValues(
      {
        type: 'transport',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'took a load over to the packing house this morning',
        activity_fields: { harvest_destination: 'handler' }
      } as never,
      'transport',
      [
        {
          name: 'harvest_destination',
          label: 'Destination',
          type: 'enum',
          options: ['handler', 'storage', 'market']
        }
      ]
    ).values;
    expect(values.harvest_destination).toBe('handler');
  });

  it('a density is not a count', () => {
    // MEASURED: "Planted the east block, a hundred trees an acre" -> plants_established: 100.
    // The rate filter over `amounts` cannot see this — activity fields are answered by name.
    // The cross-check is the same number appearing in detected_amounts, spoken as a rate.
    const result = mapVoiceDataToFieldValues(
      {
        type: 'planting',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 100, unit: 'trees', category: 'count' }],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'planted the east block, a hundred trees an acre',
        activity_fields: { plants_established: 100 }
      } as never,
      'planting',
      [{ name: 'plants_established', label: 'Plants Established', type: 'number' }]
    );
    expect(result.overriddenFields).not.toContain('plants_established');
  });

  it('...and a real count still lands', () => {
    const result = mapVoiceDataToFieldValues(
      {
        type: 'planting',
        description: '',
        confidence: 90,
        detected_amounts: [{ value: 240, unit: 'trees', category: 'count' }],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'planted two hundred and forty trees in the east block',
        activity_fields: { plants_established: 240 }
      } as never,
      'planting',
      [{ name: 'plants_established', label: 'Plants Established', type: 'number' }]
    );
    expect(result.values.plants_established).toBe(240);
  });
});

describe('the panel does not narrate what the farmer already chose', () => {
  const capture = readFileSync(
    join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
    'utf8'
  );

  it('announces the heard activity ONLY when it disagrees with the one being logged', () => {
    // "Sounds like: Frost Protection" on a page titled "Log activity — Frost protection", at
    // step 2 of 3, restates a choice made one step earlier. It is a leftover from when voice
    // ran BEFORE the activity was known. It is news in exactly one case — the words describe a
    // different activity — which is the case the switch offer exists for.
    expect(capture).toMatch(/showHeardActivity[\s\S]{0,200}voice\.understood/);
    // ...and "nothing to disagree with" counts: soil/pest/business ask their subtype in-tab, so
    // voice can run before the activity is known and the heard activity is the only statement of
    // what was understood.
    expect(capture).toMatch(/recognized && \(!chosenMapping \|\| disagreesWithChosenActivity\)/);
  });

  it('compares the activities by mapping, not by slug', () => {
    // `fertilization` and `fertilizer` are two names for one activity; comparing names would
    // report a disagreement with itself.
    expect(capture).toMatch(/mapping\.backendSubtype !== chosenMapping\.backendSubtype/);
  });

  it('no longer offers to continue to a step that does not exist', () => {
    // The wizard is Activity & date → Activity details → Photos. There is no Review step: the
    // button fills the form in place. "Continue to Review" named a screen from the era when
    // voice was its own flow.
    expect(capture).not.toMatch(/continueToReview/);
    expect(Object.keys(enUS)).not.toContain('events.voice.continueToReview');
    expect(Object.keys(es419)).not.toContain('events.voice.continueToReview');
    expect(enUS).toHaveProperty('events.voice.useTheseDetails');
    expect(es419).toHaveProperty('events.voice.useTheseDetails');
  });

  it('drops the how-to subtitle once a result is on screen', () => {
    // Otherwise "You review every field before saving" sits eight lines above "review every
    // field before saving" in the low-confidence warning.
    expect(capture).toMatch(/\{!parsedData && \([\s\S]{0,200}voice\.subtitle/);
  });
});

describe('the switch offer is judged on the ACTIVITY, not the backend event type', () => {
  // MEASURED 2026-08-30. Farmer is on Frost Protection and says "irrigated the field for six
  // hours with the drip system". Irrigation (IR) and Frost Protection (FP) are both PRODUCTION,
  // so the old `backendEventType !== eventTypeId` test was FALSE and no mismatch was ever
  // shown: the panel announced "Sounds like: Irrigation" over a Frost Protection form, the
  // render gate silently dropped every irrigation field, and the banner reported "1 fields
  // filled" — the transcript, landing in the notes box.
  const IRRIGATION = VOICE_TYPE_MAP.irrigation;
  const FROST = VOICE_TYPE_MAP.frost_protection;

  it('the premise holds: these are distinct activities sharing one event type', () => {
    // Without this the tests below could pass vacuously after a taxonomy change.
    expect(IRRIGATION.backendEventType).toBe(FROST.backendEventType);
    expect(IRRIGATION.backendSubtype).not.toBe(FROST.backendSubtype);
    expect(IRRIGATION.verbKey).not.toBe(FROST.verbKey);
  });

  it('offers the switch for irrigation heard on a frost-protection form', () => {
    expect(
      shouldOfferActivitySwitch(IRRIGATION, 'irrigation', PRODUCTION, 'FP', 'frost_protection')
    ).toBe(true);
  });

  it('stays quiet when the heard activity IS the one being logged', () => {
    expect(
      shouldOfferActivitySwitch(IRRIGATION, 'irrigation', PRODUCTION, 'IR', 'irrigation')
    ).toBe(false);
  });

  it('still offers the switch across event types', () => {
    // The original case this rule existed for: a fertilizer utterance on a production form.
    expect(
      shouldOfferActivitySwitch(
        VOICE_TYPE_MAP.fertilization,
        'fertilization',
        PRODUCTION,
        'FP',
        'frost_protection'
      )
    ).toBe(true);
  });

  it('stays quiet on an unrecognised utterance', () => {
    // `general` is ignorance. Offering to switch the farmer OFF the right form because the
    // parser could not place their words is advice generated from nothing.
    expect(
      shouldOfferActivitySwitch(IRRIGATION, 'general', PRODUCTION, 'FP', 'frost_protection')
    ).toBe(false);
  });

  it('stays quiet while the subtype is still unknown', () => {
    // Soil, pest and business ask their subtype INSIDE the tab, so voice can run before one
    // exists — there is nothing yet to disagree with.
    expect(shouldOfferActivitySwitch(IRRIGATION, 'irrigation', PRODUCTION, undefined, null)).toBe(
      false
    );
    expect(shouldOfferActivitySwitch(IRRIGATION, 'irrigation', PRODUCTION, '', null)).toBe(false);
  });

  it('stays quiet for a different subtype under the SAME verb tile', () => {
    // field_work covers CU/TH/MO — three subtypes, one tile. "It sounded like Field work,
    // which is a different activity than the one you are logging" would name the tile the
    // farmer is already on. The tile's own subtype select is where that gets corrected.
    const mowing = VOICE_TYPE_MAP.mowing;
    const cultivation = VOICE_TYPE_MAP.cultivation;
    expect(mowing.verbKey).toBe(cultivation.verbKey);
    expect(shouldOfferActivitySwitch(mowing, 'mowing', PRODUCTION, 'CU', 'field_work')).toBe(false);
  });
});

describe('voice activity coverage is explicit, not accidental', () => {
  // The record of WHICH activities voice covers. If someone adds a mapping this fails and
  // they update the list on purpose; if someone adds a subtype and assumes voice picks it
  // up, the list says otherwise.
  //
  // 2026-08-26: five of the original eight gaps closed — TP, PO, FP, MO, PH now have prompt
  // enum values, fallback keywords in three languages, and map entries.
  //
  // Three remain unroutable ON PURPOSE:
  //   CM (canopy management) — shares the pruning tile; "hedging" / "leaf pulling" overlap
  //       pruning vocabulary closely enough that a misroute is likelier than a hit.
  //   BU (buffer use)        — § 205.202(c). Mislabelling an ordinary harvest as a buffer
  //       harvest would put a compliance claim on the record nobody said out loud.
  //   SS (seed search)       — § 205.204(a)(1). Records suppliers contacted and varieties
  //       sought, not a measurement this mapper produces.
  // For all three the transcript still reaches the notes box, so voice is never a no-op.
  const ROUTED_SUBTYPES = [
    'FE',
    'IR',
    'PE',
    'HE',
    'FU',
    'EM',
    'HA',
    'PL',
    'PR',
    'TR',
    'CU',
    'TH',
    'ST',
    'TP',
    'PO',
    'FP',
    'MO',
    'PH'
  ];
  const NOT_ROUTED = ['CM', 'BU', 'SS'];

  it('routes exactly the activities it claims to', () => {
    const routed = new Set(
      Object.values(VOICE_TYPE_MAP)
        .map((m) => m.backendSubtype)
        .filter(Boolean)
    );
    expect([...routed].sort()).toEqual([...ROUTED_SUBTYPES].sort());
    for (const code of NOT_ROUTED) {
      expect(routed.has(code), `${code} is now routed — update this list on purpose`).toBe(false);
    }
  });

  it('an unroutable activity never offers to switch the farmer off the right form', () => {
    // The parser answers `general` for anything it does not know, including every subtype
    // in NOT_ROUTED. That is ignorance, and must not be dressed up as a detection.
    expect(isRecognizedVoiceType('general')).toBe(false);
    expect(isRecognizedVoiceType('seed_search')).toBe(false);
    expect(isRecognizedVoiceType('canopy_management')).toBe(false);
    expect(isRecognizedVoiceType('buffer_use')).toBe(false);
    expect(isRecognizedVoiceType('')).toBe(false);
    // ...and the five closed this round ARE recognised, so the list above is not just stale
    expect(isRecognizedVoiceType('transport')).toBe(true);
    expect(isRecognizedVoiceType('post_harvest')).toBe(true);
    // ...while a real detection still is one, or the notice would never fire at all
    expect(isRecognizedVoiceType('harvest')).toBe(true);
    expect(isRecognizedVoiceType('Fertilization')).toBe(true);
  });
});

describe('newly routed activities (2026-08-26)', () => {
  const heard = (type: string, over: Partial<ParsedVoiceData> = {}) =>
    parsed({ type, original_transcript: 'spoken words', ...over });

  it('FP / MO / PH keep the measurements their own forms render', () => {
    const fp = heardOn(
      heard('frost_protection', { detected_amounts: ['4 hours', '20 acres'] }),
      PRODUCTION,
      'FP'
    );
    expect(fp.kept.equipment_hours).toBe(4);
    expect(fp.kept.area_covered).toBe(20);

    const mo = heardOn(
      heard('mowing', { detected_amounts: ['30 acres', '12 gallons'] }),
      PRODUCTION,
      'MO'
    );
    expect(mo.kept.area_covered).toBe(30);

    // Post-harvest renders yield_quantity (visibleForSubtypes ['HA','PH','PL'])
    const ph = heardOn(
      heard('post_harvest', { detected_amounts: ['8000 pounds'] }),
      PRODUCTION,
      'PH'
    );
    expect(ph.kept.yield_quantity).toBe(8000);
    expect(ph.kept.yield_unit).toBe('lb');
  });

  it('TP / PO route without inventing a measurement', () => {
    // Neither renders area/hours/fuel, so nothing but the notes may survive. Claiming
    // acreage on a hive placement would be a fabricated measurement.
    for (const [type, code] of [
      ['transport', 'TP'],
      ['pollination', 'PO']
    ] as const) {
      const { kept } = heardOn(
        heard(type, { detected_amounts: ['20 acres', '3 hours', '15 gallons'] }),
        PRODUCTION,
        code
      );
      // Nothing at all, since 2026-09-03: the transcript is opt-in (see the notes describe
      // below), so an unticked utterance on an activity that records none of these
      // measurements writes no field. It used to be `['observation']`.
      expect(Object.keys(kept).sort(), `${type} invented a field`).toEqual([]);
    }
  });

  it('routes to the right subtype and offers no bogus switch', () => {
    for (const [type, code] of [
      ['transport', 'TP'],
      ['pollination', 'PO'],
      ['frost_protection', 'FP'],
      ['mowing', 'MO'],
      ['post_harvest', 'PH']
    ] as const) {
      const m = mapVoiceTypeToTemplate(type);
      expect(m.backendSubtype, type).toBe(code);
      expect(m.backendEventType, type).toBe(PRODUCTION);
      expect(isRecognizedVoiceType(type), type).toBe(true);
    }
  });
});

describe('the transcript reaches the notes box only when the farmer asks', () => {
  /**
   * 🔴 2026-09-03, found on camera. `observation` is published VERBATIM on the buyer page as
   * "Farmer's Field Notes", and the mapper auto-filled it with the whole utterance. So
   * "Six fluid ounces an acre, 40 gallons total" reached a shopper in prose, while the same
   * record's structured `application_rate` / `volume` were being stripped by
   * `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`. Categorical for columns, silent for
   * prose.
   *
   * The transcript is still shown to the farmer (the panel quotes it back) and still one tap
   * from the notes box. What changed is the DEFAULT: publishing is now an act, not a side
   * effect of speaking.
   */
  it('writes NOTHING to the public notes box without the tick', () => {
    for (const code of ['CM', 'BU', 'SS']) {
      const { kept } = heardOn(
        parsed({
          type: 'general',
          original_transcript: 'sprayed entrust, six fluid ounces an acre, 40 gallons total'
        }),
        PRODUCTION,
        code
      );
      expect(Object.keys(kept), `${code} published the transcript unasked`).not.toContain(
        'observation'
      );
    }
  });

  it('fills observation for an activity voice cannot route, once ticked', () => {
    // CM, BU and SS produce no field overrides at all, so for those the words ARE the output.
    // The tick is what keeps that useful without publishing by default.
    for (const code of ['CM', 'BU', 'SS']) {
      const { kept } = heardOn(
        parsed({
          type: 'general',
          original_transcript: 'pulled leaves on the north block',
          note_opt_in: true
        }),
        PRODUCTION,
        code
      );
      expect(kept.observation, `${code} lost the transcript`).toBe(
        'pulled leaves on the north block'
      );
    }
  });

  it('observation survives the gate on every event type', () => {
    for (const [et, st] of [
      [PRODUCTION, 'IR'],
      [CHEMICAL, 'FE'],
      [5, 'ST'],
      [3, null]
    ] as const) {
      const { kept } = gateVoiceOverridesToForm(
        { observation: 'spoken' },
        et as never,
        st as never
      );
      expect(kept.observation, `${et}/${st}`).toBe('spoken');
    }
  });

  it('NEVER puts the AI-authored description in the farmer\u2019s notes', () => {
    // The GPT prompt asks for "a clean, professional description of the activity", so
    // `description` is machine prose. `observation` is quoted verbatim on the buyer page as
    // "Farmer's Field Notes". Falling back to description would promote machine copy into
    // the grower's quoted voice — the exact thing NewEvent's notes-field comment forbids.
    // `note_opt_in` is ON here on purpose: with the tick given, the ONLY reason nothing is
    // written must be that `description` is not an eligible source. A test that left the tick
    // off would pass for the wrong reason.
    const { kept } = heardOn(
      parsed({
        type: 'general',
        original_transcript: '',
        description: 'Applied a foliar nutrient program to the orchard block.',
        note_opt_in: true
      }),
      PRODUCTION,
      'CM'
    );
    expect(Object.keys(kept)).not.toContain('observation');
  });

  it('an empty transcript writes no note at all', () => {
    const { kept } = heardOn(
      parsed({
        type: 'general',
        original_transcript: '   ',
        description: '',
        note_opt_in: true
      }),
      PRODUCTION,
      'CM'
    );
    expect(Object.keys(kept)).not.toContain('observation');
  });

  it('never writes `description` at all, from any input', () => {
    // `description` is the OTHER public prose field, and the one the backend prompt fills with
    // machine copy ("a clean, professional description of the activity"). The mapper has never
    // written it and must not start: the buyer page prints it, and NewEvent's own notes handling
    // treats it as not-the-farmer's-words. Asserted across every activity family so a new branch
    // in the mapper cannot quietly add it.
    for (const type of ['pesticide', 'fertilization', 'irrigation', 'harvest', 'general']) {
      const result = mapVoiceDataToFieldValues(
        parsed({
          type,
          description: 'Applied a foliar nutrient program to the orchard block.',
          original_transcript:
            'Sprayed Entrust on the east block. Six fluid ounces an acre, 40 gallons total, airblast.',
          note_opt_in: true,
          detected_amounts: [
            { value: 6, unit: 'fluid ounces', category: 'volume' },
            { value: 40, unit: 'gallons', category: 'volume' }
          ]
        }),
        mapVoiceTypeToTemplate(type).templateId
      );
      expect(result.overriddenFields, type).not.toContain('description');
      expect(Object.keys(result.values), type).not.toContain('description');
      // ...and with the tick given, the note is the TRANSCRIPT, never the machine prose.
      if (result.values.observation !== undefined) {
        expect(result.values.observation, type).not.toContain('foliar nutrient program');
      }
    }
  });

  it('the panel defaults the tick to OFF and carries it on the result', () => {
    // Source-pinned: the default is the whole fix, and it is one character from being lost.
    const capture = readFileSync(
      join(__dirname, '../../components/Events/VoiceEventCapture.tsx'),
      'utf8'
    );
    expect(capture).toMatch(/useState\(false\);/);
    expect(capture).toMatch(
      /const \[addTranscriptToNotes, setAddTranscriptToNotes\] = useState\(false\)/
    );
    expect(capture).toMatch(/note_opt_in: addTranscriptToNotes/);
    // Cleared on both exits, so a second utterance is a second decision.
    expect(capture.match(/setAddTranscriptToNotes\(false\)/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it('NewEvent refuses to type over notes the farmer already wrote', () => {
    const src = readFileSync(
      join(__dirname, '../../views/Dashboard/Dashboard/components/forms/NewEvent.jsx'),
      'utf8'
    );
    expect(src).toMatch(/delete kept\.observation;/);
    expect(src).toMatch(/String\(eventFormData\.observation \?\? ''\)\.trim\(\)/);
  });
});
