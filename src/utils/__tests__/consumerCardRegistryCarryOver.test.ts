/**
 * The normalizer may not eat a field the display registry publishes.
 *
 * WHY (2026-08-31): `ProductDetail` normalizes every event with `preserveOriginal: false`
 * BEFORE `ConsumerEventCard` asks the registry which fields to render. Each
 * `normalize*EventData` is a hand-written copy list, so a field could be declared
 * `consumer_card: 'secondary'`, served by the API, and still render nothing — no error
 * anywhere, because the registry and the serializer are each individually correct.
 *
 * Measured on a real season: `normalizeGeneralEventData` copied five keys while
 * `generalEvent.ts` declared five contamination fields on the consumer card, so a logged
 * spray-drift incident reached the buyer page as "Emergency · 3 hours · 2 people" with the
 * source and affected area dropped in transit. `album`, `verification_level` and
 * `is_highlight` had already been hand-patched back at the ProductDetail call site — the same
 * bug, one key at a time.
 *
 * This walks EVERY event type and asserts the class is closed: whatever the registry declares
 * for a consumer surface survives normalization when the payload carries it. Removing the
 * carry-over fails nine of these, across four families — general's contamination disclosure,
 * soil's grazing and cover-crop facts, and three chemical fields.
 *
 * SCOPE, so nobody reads more into a green run than it says: the payloads here are synthesized
 * from the registry's own field names, so this proves only that normalization does not eat a
 * key. It cannot prove the API actually SENDS that key under that name — a registry name that
 * no serializer emits (`volume_applied` vs the wire's `volume`) still renders nothing, and
 * that mismatch is `publicWireHasRenderer.test.ts`'s job, not this one's.
 */
import { describe, expect, it } from 'vitest';

import { getFieldNamesForSurface, getSubtypes } from '../../config/events';
import type { AnySubtype, EventTypeCode } from '../../config/events';
import { normalizeBackendEventData } from '../eventDataNormalizer';

const EVENT_TYPES: { name: string; code: EventTypeCode }[] = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

/**
 * No exemption list, deliberately.
 *
 * `NORMALIZER_OWNED_KEYS` in eventDataNormalizer.ts stops the carry-over from restoring a raw
 * value over one the normalizer TRANSFORMED — it is about which copy wins, not about whether
 * the field survives. Every one of those keys is still produced by its own normalizer
 * (`equipment_type` becomes "🚜 Tractor", `duration` becomes "3 hours"), so the assertion below
 * holds for them too, and an exemption here would only hide the day one stops being produced.
 *
 * The invariant is therefore the plain one: a field the registry publishes to shoppers must
 * come out of normalization by SOME route — its own copy list, a transform, or the carry-over.
 */

/** A value distinctive enough that a survivor can be told apart from a default. */
const PROBE = '__probe__';

/**
 * Build a payload carrying every consumer-surface field for this type/subtype. Values are
 * strings: the carry-over is type-agnostic, and this test is about presence, not formatting.
 */
function buildRawEvent(code: EventTypeCode, subtype: AnySubtype, fieldNames: string[]) {
  const raw: Record<string, unknown> = {
    id: `${code}_probe`,
    date: '2026-05-02T08:30:00+00:00',
    event_type: code,
    observation: 'Farmer note.'
  };
  for (const name of fieldNames) raw[name] = PROBE;
  // The sub-type code rides on a per-family key; set them all so `extractSubtypeCode` finds it
  // whichever family we are probing. Harmless on the families that ignore their siblings' keys.
  if (subtype) {
    for (const key of [
      'weather_type',
      'production_type',
      'chemical_type',
      'soil_management_type',
      'pest_management_type',
      'business_event_type'
    ]) {
      raw[key] = subtype;
    }
  }
  return raw;
}

describe('normalizer carries over every registry-declared consumer field', () => {
  for (const { name, code } of EVENT_TYPES) {
    // `null` covers the families with no sub-types (general) and the un-subtyped default.
    const subtypes: AnySubtype[] = [null, ...getSubtypes(code).map((s) => s.code as AnySubtype)];

    for (const subtype of subtypes) {
      it(`${name}${subtype ? `/${subtype}` : ''} keeps its consumer_card fields`, () => {
        const carried = getFieldNamesForSurface(code, subtype ?? undefined, 'consumer_card');
        if (carried.length === 0) return;

        const raw = buildRawEvent(code, subtype, carried);
        const normalized = normalizeBackendEventData(code, raw) as unknown as Record<
          string,
          unknown
        >;

        const dropped = carried.filter((f) => normalized[f] === undefined);
        expect(
          dropped,
          `${name}${subtype ? `/${subtype}` : ''}: declared on consumer_card but dropped by ` +
            `eventDataNormalizer — the consumer card can never render these: ${dropped.join(', ')}`
        ).toEqual([]);
      });
    }
  }

  it('does not overwrite a value the normalizer transformed', () => {
    // `duration` is the canonical case: the registry names the raw column, the normalizer
    // rewrites it into display form. The carry-over must lose that race.
    const normalized = normalizeBackendEventData(3, {
      id: 'general_probe',
      date: '2026-05-02T08:30:00+00:00',
      event_type: 3,
      activity_type: 'emergency',
      duration: '3'
    }) as unknown as Record<string, unknown>;

    expect(normalized.duration).toBe('3 hours');
  });

  it('keeps the whole contamination disclosure on a general event', () => {
    // The specific regression: an incident logged under any activity type must reach the card
    // with the facts the public payload carries.
    const normalized = normalizeBackendEventData(3, {
      id: 'general_0',
      date: '2026-05-02T08:30:00+00:00',
      event_type: 3,
      activity_type: 'emergency',
      is_contamination_incident: true,
      contamination_source: 'spray_drift',
      contamination_affected_area: 1.2,
      corrective_action_date: '2026-05-02'
    }) as unknown as Record<string, unknown>;

    expect(normalized.is_contamination_incident).toBe(true);
    expect(normalized.contamination_source).toBe('spray_drift');
    expect(normalized.contamination_affected_area).toBe(1.2);
    expect(normalized.corrective_action_date).toBe('2026-05-02');
  });
});
