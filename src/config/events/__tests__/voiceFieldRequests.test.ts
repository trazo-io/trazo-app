/**
 * What voice may ask the model to fill, per activity.
 *
 * MEASURED 2026-08-30, before `VOICE_ACTIVITY_FIELDS` existed: voice wrote the SAME eight
 * fields on every activity — 8 of 45 on a fertiliser application, 6 of 12 on frost protection,
 * 1 of 18 on transport. `protection_method` and `low_temperature`, the two facts a frost record
 * exists for, were unreachable: the parse response carried a fixed set of generic keys and
 * nothing else survived the boundary.
 *
 * These tests pin the two properties that make widening it safe:
 *
 *  1. Every field asked for is a field that ACTIVITY'S FORM RENDERS. A request for a field the
 *     farmer cannot see is a value with nowhere to land — and, worse, one they never review.
 *  2. No field asked for is one voice must never write. The mechanism keeping those out is
 *     omission from the allowlist; this is what makes an accidental addition fail the build
 *     instead of shipping.
 */
import { describe, expect, it } from 'vitest';

import { VOICE_ACTIVITY_FIELDS, VOICE_NEVER_FILLS, buildVoiceFieldRequests } from '../voiceFields';
import { getFieldConfig, getFieldNamesForSurface } from '../resolver';
import { VOICE_TYPE_MAP, mapVoiceDataToFieldValues } from '../../../utils/voiceDataMapper';
import enUS from '../../../i18n/lang/en-US.json';

const translate = (key: string) => (enUS as Record<string, string>)[key] || '';

describe('every requested field is real, rendered, and safe', () => {
  it('names an activity the parser can actually answer with', () => {
    for (const slug of Object.keys(VOICE_ACTIVITY_FIELDS)) {
      expect(VOICE_TYPE_MAP[slug], `${slug} is not a VOICE_TYPE_MAP entry`).toBeDefined();
    }
  });

  it('every field is rendered by that activity’s own form', () => {
    // A field the form does not render would be dropped by the render gate on arrival — the
    // ask would be pure waste — and if the gate ever loosened it would become a value written
    // to a record the farmer never saw.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      const rendered = new Set(
        getFieldNamesForSurface(
          mapping.backendEventType,
          (mapping.backendSubtype || undefined) as never,
          'form'
        )
      );
      for (const field of fields) {
        expect(rendered.has(field), `${slug}: form does not render ${field}`).toBe(true);
      }
    }
  });

  it('every field has a registry entry with a label', () => {
    // The label is what the model is told the field MEANS. A missing one would send a bare
    // snake_case name and invite a guess.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      for (const field of fields) {
        const cfg = getFieldConfig(mapping.backendEventType, field);
        expect(cfg, `${slug}: ${field} has no registry entry`).toBeTruthy();
        expect(cfg!.labelKey, `${slug}: ${field} has no labelKey`).toBeTruthy();
        expect(translate(cfg!.labelKey), `${slug}: ${field} label missing from en-US`).toBeTruthy();
      }
    }
  });

  it('never asks for a field voice must not write', () => {
    // The four groups and their reasons are documented on VOICE_NEVER_FILLS: attestations,
    // paperwork identifiers, people of record, and second dates.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      for (const field of fields) {
        expect(
          VOICE_NEVER_FILLS[field],
          `${slug}: ${field} is on the never-fill list — ${VOICE_NEVER_FILLS[field]}`
        ).toBeUndefined();
      }
    }
  });

  it('never asks for a boolean, a date, or a timestamp', () => {
    // There is no low-confidence yes/no on a form the farmer will not re-read, and the record
    // already has its date from step 1.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      for (const field of fields) {
        const cfg = getFieldConfig(mapping.backendEventType, field);
        expect(
          ['boolean', 'date', 'date-time'].includes(cfg!.valueType),
          `${slug}: ${field} is a ${cfg!.valueType}`
        ).toBe(false);
      }
    }
  });

  it('the never-fill list actually names real fields', () => {
    // A reason written against a field that no longer exists is a comment pretending to be a
    // guard. Checked loosely — the same name may live on several event types.
    const everyFormField = new Set<string>();
    for (const mapping of Object.values(VOICE_TYPE_MAP)) {
      for (const name of getFieldNamesForSurface(
        mapping.backendEventType,
        (mapping.backendSubtype || undefined) as never,
        'form'
      )) {
        everyFormField.add(name);
      }
    }
    const stale = Object.keys(VOICE_NEVER_FILLS).filter((f) => !everyFormField.has(f));
    expect(stale, `never-fill entries naming no rendered field: ${stale.join(', ')}`).toEqual([]);
  });
});

describe('voiceFieldOverlap: which fields two paths can both produce', () => {
  // The legacy structured mapping and the per-activity `activity_fields` answer can, in
  // principle, write the same key. That is allowed — the explicit answer is applied last and
  // wins — but the SET of overlaps has to be a decision, not a discovery. This test fails when
  // a new one appears, which is the moment to ask which source should own that field.
  const KNOWN_OVERLAPS: Record<string, readonly string[]> = {
    // The legacy branch infers depth by hunting the amounts array for a `depth` category; the
    // request asks the model for it by name. The named answer wins.
    irrigation: ['irrigation_depth']
  };

  // Every key the legacy mapping can emit, taken from a maximally generous parse.
  const RICH = {
    type: 'x',
    description: 'd',
    confidence: 95,
    detected_amounts: [
      { value: 200, unit: 'lb', category: 'weight' },
      { value: 6, unit: 'hours', category: 'time' },
      { value: 12, unit: 'acres', category: 'area' },
      { value: 15, unit: 'gal', category: 'volume' },
      { value: 2, unit: 'inches', category: 'depth' }
    ],
    detected_products: ['Kocide 3000'],
    detected_systems: ['drip irrigation'],
    npk_ratio: '10-10-10',
    concentration: '50%',
    commercial_name: 'Kocide 3000',
    application_method: 'broadcast',
    water_source: 'well',
    area_covered: { value: 12, unit: 'acres' },
    duration: { value: 6, unit: 'hours' },
    fuel_amount: { value: 15, unit: 'gal' },
    original_transcript: 'spoken words'
  };

  it('only the documented fields can come from both paths', () => {
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      // No requested fields: this is purely what the legacy mapping produces.
      const legacy = mapVoiceDataToFieldValues(
        { ...RICH, type: slug } as never,
        mapping.templateId
      ).overriddenFields;
      const overlap = fields.filter((f) => legacy.includes(f));
      expect(overlap, `${slug}: undocumented overlap`).toEqual(KNOWN_OVERLAPS[slug] ?? []);
    }
  });

  it('the explicit answer wins where they overlap', () => {
    const requested = [
      { name: 'irrigation_depth', label: 'Irrigation depth', type: 'number' as const }
    ];
    const result = mapVoiceDataToFieldValues(
      { ...RICH, type: 'irrigation', activity_fields: { irrigation_depth: 3.5 } } as never,
      'irrigation',
      requested
    );
    expect(result.values.irrigation_depth).toBe(3.5);
  });
});

describe('the request the model receives', () => {
  it('describes frost protection in the form’s own terms', () => {
    const requests = buildVoiceFieldRequests(1, 'FP', 'frost_protection', translate);
    const names = requests.map((r) => r.name);
    expect(names).toContain('protection_method');
    expect(names).toContain('low_temperature');

    const method = requests.find((r) => r.name === 'protection_method')!;
    expect(method.type).toBe('enum');
    // Enum answers are validated against this catalogue on the way back, so an enum that
    // arrives with no options would be free text wearing a dropdown's name.
    expect(method.options?.length).toBeGreaterThan(0);

    const temperature = requests.find((r) => r.name === 'low_temperature')!;
    expect(temperature.type).toBe('number');
  });

  it('gives the activities that could only fill notes something to fill', () => {
    // Transport, pollination and general each wrote exactly one field before this: the
    // transcript, into the notes box.
    expect(buildVoiceFieldRequests(1, 'TP', 'transport', translate).length).toBeGreaterThan(0);
    expect(buildVoiceFieldRequests(1, 'PO', 'pollination', translate).length).toBeGreaterThan(0);
    expect(buildVoiceFieldRequests(3, '', 'general', translate).length).toBeGreaterThan(0);
  });

  it('rejects an enum answer outside the catalogue, and forgives its formatting', () => {
    const requested = [
      {
        name: 'protection_method',
        label: 'Protection method',
        type: 'enum' as const,
        options: ['wind_machine', 'orchard_heater']
      }
    ];
    const parse = (value: unknown) =>
      mapVoiceDataToFieldValues(
        {
          type: 'frost_protection',
          description: '',
          confidence: 90,
          detected_amounts: [],
          detected_products: [],
          detected_systems: [],
          activity_fields: { protection_method: value }
        } as never,
        'frost_protection',
        requested
      ).values.protection_method;

    expect(parse('wind_machine')).toBe('wind_machine');
    // The model was given snake_case tokens and answered with the words. Resolving those back
    // is still a CLOSED set — it can only ever land on a catalogue value.
    expect(parse('Wind machine')).toBe('wind_machine');
    expect(parse('WIND-MACHINE')).toBe('wind_machine');
    // ...and anything that is not in the catalogue is dropped, not stored.
    expect(parse('helicopter')).toBeUndefined();
    expect(parse('')).toBeUndefined();
  });

  it('drops a number that is not a number, rather than storing zero', () => {
    // `Number('')` is 0 and `parseFloat('about twenty')` is NaN — a silent 0 on a certifier
    // record is the "missing input becomes a default" failure that put 151.2 kg of CO₂e on an
    // event nobody reported fuel for.
    const requested = [
      { name: 'low_temperature', label: 'Low temperature', type: 'number' as const }
    ];
    const parse = (value: unknown) =>
      mapVoiceDataToFieldValues(
        {
          type: 'frost_protection',
          description: '',
          confidence: 90,
          detected_amounts: [],
          detected_products: [],
          detected_systems: [],
          activity_fields: { low_temperature: value }
        } as never,
        'frost_protection',
        requested
      ).values.low_temperature;

    expect(parse(28)).toBe(28);
    expect(parse('28')).toBe(28);
    expect(parse('about twenty')).toBeUndefined();
    expect(parse('')).toBeUndefined();
    expect(parse(null)).toBeUndefined();
  });

  it('ignores a value nobody asked for', () => {
    // Narrower than the render gate, which only asks whether the FORM shows a field — and
    // plenty of fields the form shows are ones voice must never write (VOICE_NEVER_FILLS).
    const result = mapVoiceDataToFieldValues(
      {
        type: 'frost_protection',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        activity_fields: { organic_approved: 'yes', low_temperature: 28 }
      } as never,
      'frost_protection',
      [{ name: 'low_temperature', label: 'Low temperature', type: 'number' as const }]
    );
    expect(result.values.organic_approved).toBeUndefined();
    expect(result.values.low_temperature).toBe(28);
  });

  it('offers the parcel’s OWN blocks as a closed set', () => {
    // `block_id` is free text in the form because a new block has to be typeable. It is not free
    // text to voice: the parcel serves the blocks it has actually used, and voice picks from
    // that vocabulary exactly like the chips under the input.
    const requests = buildVoiceFieldRequests(1, 'IR', 'irrigation', translate, {
      knownBlockIds: ['BGA', 'Block 3']
    });
    const block = requests.find((r) => r.name === 'block_id');
    expect(block).toBeTruthy();
    expect(block!.type).toBe('enum');
    expect(block!.options).toEqual(['BGA', 'Block 3']);
  });

  it('asks for no block at all when the parcel has none on record', () => {
    // Nothing to match against. Asking for an open-ended identifier is how a mis-heard letter
    // becomes the lot a record belongs to.
    const requests = buildVoiceFieldRequests(1, 'IR', 'irrigation', translate, {
      knownBlockIds: []
    });
    expect(requests.find((r) => r.name === 'block_id')).toBeUndefined();
    expect(buildVoiceFieldRequests(1, 'IR', 'irrigation', translate)).not.toContainEqual(
      expect.objectContaining({ name: 'block_id' })
    );
  });

  it('fills a block the farmer really named, and NOTHING for one they did not', () => {
    // MEASURED 2026-08-30: "…in the VGA block" on a parcel whose only block is BGA. One edit
    // apart. Fuzzy-matching it would invent the lot the record belongs to — this value becomes
    // CA PUR box 22 — so an unknown block fills nothing at all.
    const requested = buildVoiceFieldRequests(1, 'IR', 'irrigation', translate, {
      knownBlockIds: ['BGA']
    });
    const parse = (spoken: string) =>
      mapVoiceDataToFieldValues(
        {
          type: 'irrigation',
          description: '',
          confidence: 90,
          detected_amounts: [],
          detected_products: [],
          detected_systems: [],
          activity_fields: { block_id: spoken }
        } as never,
        'irrigation',
        requested
      ).values.block_id;

    expect(parse('BGA')).toBe('BGA');
    // casing and spacing are mechanical variation, not a different block
    expect(parse('bga')).toBe('BGA');
    // speech-to-text writes a spelled-out block as "B G A" — the same three characters
    expect(parse('B G A')).toBe('BGA');
    expect(parse('b-g-a')).toBe('BGA');
    // ...but a block this parcel has never used is not guessed at
    expect(parse('VGA')).toBeUndefined();
    expect(parse('Block 9')).toBeUndefined();
  });

  it('refuses a separator-insensitive match that is ambiguous', () => {
    // Two options that differ only by separators would otherwise be decided by array order, and
    // a coin flip is not a match.
    const requested = [
      // The same identifier spelled two ways: neither normalisation can tell them apart.
      { name: 'block_id', label: 'Block', type: 'enum' as const, options: ['A B', 'A-B'] }
    ];
    const result = mapVoiceDataToFieldValues(
      {
        type: 'irrigation',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        activity_fields: { block_id: 'ab' }
      } as never,
      'irrigation',
      requested
    );
    expect(result.values.block_id).toBeUndefined();
  });

  it('asks for nothing when the activity is unknown', () => {
    expect(buildVoiceFieldRequests(1, 'FP', null, translate)).toEqual([]);
    expect(buildVoiceFieldRequests(1, 'FP', 'not_an_activity', translate)).toEqual([]);
  });

  it('drops a listed field the CURRENT subtype does not render', () => {
    // The allowlist is per activity slug; the form is per (event type, subtype). Frost
    // protection does not render harvest's fields, so asking for them on FP must yield nothing
    // even though they are listed under `harvest`.
    const onFrost = buildVoiceFieldRequests(1, 'FP', 'harvest', translate).map((r) => r.name);
    expect(onFrost).not.toContain('brix_level');
  });
});
