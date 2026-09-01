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

  it('never asks for a field whose visibility depends on other form state', () => {
    // MEASURED 2026-09-01 on the live form: `water_volume_total` is on irrigation's `form`
    // surface, so the registry — and therefore the render gate — says it is visible. Its
    // `visibleWhen` predicate says otherwise unless Irrigation Summary Mode is on. Asking for it
    // put a model-supplied number on a field the farmer could not see or correct.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      for (const field of fields) {
        const cfg = getFieldConfig(mapping.backendEventType, field);
        expect(
          cfg?.visibleWhen,
          `${slug}: ${field} renders conditionally, so it cannot be reviewed where it is asked`
        ).toBeUndefined();
      }
    }
  });

  it('never asks for a number whose unit lives in another field', () => {
    // The builder skips these defensively, but a list that NAMES a field we never ask for is a
    // lie in the one place someone reads to find out what we ask for. MEASURED 2026-09-01: a
    // Spanish "cinco centímetros" came back as a bare 5 and was recorded as 5 INCHES, because a
    // request cannot carry the value and its unit together.
    for (const [slug, fields] of Object.entries(VOICE_ACTIVITY_FIELDS)) {
      const mapping = VOICE_TYPE_MAP[slug];
      for (const field of fields) {
        const cfg: { unitField?: string } | null = getFieldConfig(mapping.backendEventType, field);
        expect(
          cfg?.unitField,
          `${slug}: ${field} stores its unit in ${cfg?.unitField}, which no request can carry`
        ).toBeUndefined();
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
  // Empty, and that is the goal: ONE source per field. `irrigation_depth` used to be here —
  // asked for by name AND inferred from the amounts array — until the unit rule took it out of
  // the ask list, leaving the legacy path (which carries the unit alongside the value) as its
  // only writer. An entry here is not a bug, but it is a decision: whoever adds one has to say
  // which source wins and why.
  const KNOWN_OVERLAPS: Record<string, readonly string[]> = {};

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

  it('the explicit answer still wins wherever an overlap is reintroduced', () => {
    // No activity currently asks for a field the legacy mapping also writes, but the ordering
    // rule outlives that: `activity_fields` is applied last, so a named answer beats an inference.
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
    // The transcript matters now: an identity the farmer never said is dropped even when it is a
    // real catalogue value, because the substitution happens upstream in the model.
    const parse = (spoken: string, transcript = `irrigated ${spoken} this morning`) =>
      mapVoiceDataToFieldValues(
        {
          type: 'irrigation',
          description: '',
          confidence: 90,
          detected_amounts: [],
          detected_products: [],
          detected_systems: [],
          original_transcript: transcript,
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

  it('drops a real block the farmer never mentioned', () => {
    // MEASURED 2026-09-01: the model answered `block_id: "Ridge Block"` for "irrigated the NORTH
    // RIDGE block" — a substitution, and hardening the prompt did not stop it. Every check before
    // this one passes, because the value IS in the catalogue; the only evidence that it is wrong
    // is that the farmer did not say it.
    const requested = [
      { name: 'block_id', label: 'Block', type: 'enum' as const, options: ['BGA'] }
    ];
    const parse = (transcript: string) =>
      mapVoiceDataToFieldValues(
        {
          type: 'irrigation',
          description: '',
          confidence: 90,
          detected_amounts: [],
          detected_products: [],
          detected_systems: [],
          original_transcript: transcript,
          activity_fields: { block_id: 'BGA' }
        } as never,
        'irrigation',
        requested
      ).values.block_id;

    expect(parse('irrigated BGA for six hours')).toBe('BGA');
    expect(parse('irrigated the b g a block')).toBe('BGA');
    // no block named at all — the answer came from somewhere other than the farmer
    expect(parse('irrigated for six hours this morning')).toBeUndefined();
    // a different block named
    expect(parse('irrigated the west orchard for six hours')).toBeUndefined();
  });

  it('does not police classification enums the same way', () => {
    // A block is the words; a classification is a paraphrase of them. "going to the packing
    // house" legitimately becomes `handler`, and requiring the literal value would break it.
    const requested = [
      {
        name: 'harvest_destination',
        label: 'Destination',
        type: 'enum' as const,
        options: ['handler', 'storage']
      }
    ];
    const result = mapVoiceDataToFieldValues(
      {
        type: 'harvest',
        description: '',
        confidence: 90,
        detected_amounts: [],
        detected_products: [],
        detected_systems: [],
        original_transcript: 'took it straight to the packing house',
        activity_fields: { harvest_destination: 'handler' }
      } as never,
      'harvest',
      requested
    );
    expect(result.values.harvest_destination).toBe('handler');
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

  it('still asks for the block when an activity lists no other fields', () => {
    // `block_id` is appended after the per-activity loop, so an early return on an empty list
    // would have stopped asking for it — silently, and only for the activity someone had just
    // emptied. Five fields were retired from the chemical lists this week; that is how close
    // this was.
    const requests = buildVoiceFieldRequests(1, 'IR', 'not_an_activity_with_fields', translate, {
      knownBlockIds: ['BGA']
    });
    // an unknown slug still asks for nothing at all...
    expect(requests).toEqual([]);

    // ...but a known activity whose list is empty must still get the block question. Simulated by
    // pointing at an activity and stripping its list.
    const original = VOICE_ACTIVITY_FIELDS.irrigation;
    try {
      (VOICE_ACTIVITY_FIELDS as Record<string, readonly string[]>).irrigation = [];
      const emptied = buildVoiceFieldRequests(1, 'IR', 'irrigation', translate, {
        knownBlockIds: ['BGA']
      });
      expect(emptied.map((r) => r.name)).toEqual(['block_id']);
    } finally {
      (VOICE_ACTIVITY_FIELDS as Record<string, readonly string[]>).irrigation = original;
    }
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
