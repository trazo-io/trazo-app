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
import IntlMessageFormat from 'intl-messageformat';
import { describe, expect, it } from 'vitest';

import {
  gateVoiceOverridesToForm,
  isRecognizedVoiceType,
  voiceActivityLabelKey,
  mapVoiceDataToFieldValues,
  mapVoiceTypeToTemplate,
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

describe('voice activity coverage is explicit, not accidental', () => {
  // KNOWN GAP, pinned deliberately. VOICE_TYPE_MAP routes thirteen activities; the eight
  // production subtypes added after it — PO, PH, CM, FP, MO, TP, BU, SS — appear in no
  // entry, and in no enum of the backend's GPT prompt either, so the parser cannot return
  // them. Closing it means extending the prompt enum in three languages, the fallback
  // keyword sets, and the mapper's field branches; half-doing it would prefill a Seed
  // Search with acreage and hours it does not record.
  //
  // Until then this test is the record of WHICH activities voice covers. If someone adds a
  // mapping, this fails and they update the list on purpose; if someone adds a subtype and
  // assumes voice picks it up, the list says otherwise.
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
    'ST'
  ];
  const NOT_ROUTED = ['PO', 'PH', 'CM', 'FP', 'MO', 'TP', 'BU', 'SS'];

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
    expect(isRecognizedVoiceType('transport')).toBe(false);
    expect(isRecognizedVoiceType('seed_search')).toBe(false);
    expect(isRecognizedVoiceType('')).toBe(false);
    // ...while a real detection still is one, or the notice would never fire at all
    expect(isRecognizedVoiceType('harvest')).toBe(true);
    expect(isRecognizedVoiceType('Fertilization')).toBe(true);
  });
});
