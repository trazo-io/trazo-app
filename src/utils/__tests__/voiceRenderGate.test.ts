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
  gateVoiceOverridesToForm,
  isRecognizedVoiceType,
  voiceActivityLabelKey,
  mapVoiceDataToFieldValues,
  mapVoiceTypeToTemplate,
  amountsActuallySpoken,
  shouldOfferActivitySwitch,
  voiceTypeForActivity,
  VOICE_TYPE_MAP,
  VOICE_UNIT_COMPANIONS
} from '../voiceDataMapper';
import type { ParsedVoiceData } from '../voiceDataMapper';
import { ACTIVITY_VERBS } from '../../config/activityVerbs';
import { getFieldNamesForSurface } from '../../config/events';
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
        water_source: 'well',
        detected_systems: ['drip'],
        detected_amounts: ['6 hours']
      }),
      PRODUCTION,
      'IR'
    );
    expect(kept.water_source).toBe('well');
    expect(kept.irrigation_method).toBe('drip');
    expect(kept.equipment_hours).toBe(6);
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
      original_transcript: 'cold night, ran the wind machines'
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
      expect(Object.keys(kept).sort(), `${type} invented a field`).toEqual(['observation']);
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

describe('the transcript always reaches the notes box', () => {
  it('fills observation even for an activity voice cannot route', () => {
    // CM, BU and SS produce no field overrides at all — before this, voice transcribed the
    // farmer perfectly and then filled in nothing. The words are the useful output there.
    for (const code of ['CM', 'BU', 'SS']) {
      const { kept } = heardOn(
        parsed({ type: 'general', original_transcript: 'pulled leaves on the north block' }),
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
    const { kept } = heardOn(
      parsed({
        type: 'general',
        original_transcript: '',
        description: 'Applied a foliar nutrient program to the orchard block.'
      }),
      PRODUCTION,
      'CM'
    );
    expect(Object.keys(kept)).not.toContain('observation');
  });

  it('an empty transcript writes no note at all', () => {
    const { kept } = heardOn(
      parsed({ type: 'general', original_transcript: '   ', description: '' }),
      PRODUCTION,
      'CM'
    );
    expect(Object.keys(kept)).not.toContain('observation');
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
