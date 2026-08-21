/**
 * The producer must be able to address the records their own page renders.
 *
 * Found 2026-08-21 by trying to correct one input from the Production Profile. The page
 * renders every event as a consumer card and had no way to open a correction against any of
 * them: the only per-event affordance in the product sat on season-plan rows, so an input
 * logged outside the plan — a bloom fungicide — had none at all.
 *
 * The cause was three layers deep, and each one had to be fixed:
 *   1. `PublicHistorySerializer` keys events `chemical_0` — synthetic and POSITIONAL, right
 *      for a public endpoint and useless to the owner.
 *   2. `TimelineService` (the producer payload) keys them `chemical_2648` — the pk is in
 *      there, but only recoverable by splitting a string.
 *   3. `normalizeBackendEventData` allowlists keys, so anything the backends did add was
 *      dropped before it reached the card.
 *
 * This guards layer 3, which is the one with no server-side test to catch it: the allowlist
 * is a hand-written list, and a key missing from it fails silently — the same shape as the
 * template-flow field blindness that left 639 of 1029 templates creating no event.
 */

import { describe, expect, it } from 'vitest';

import { normalizeBackendEventData } from '../eventDataNormalizer';

describe('normalizeBackendEventData — record_id passthrough', () => {
  const chemical = {
    id: 'chemical_2648',
    record_id: 2648,
    event_type: 2,
    type: 'chemical',
    commercial_name: 'Rex Lime Sulfur',
    date: '2025-04-24T06:00:00+00:00',
    observation: 'Bloom thinning at 20 percent bloom.'
  };

  it('keeps the real record id so the card can open a correction', () => {
    const normalized = normalizeBackendEventData(2, chemical) as Record<string, unknown>;
    expect(normalized.record_id).toBe(2648);
  });

  it('keeps it for every event family, not just chemical', () => {
    for (const [eventType, family] of [
      [1, 'production'],
      [5, 'soil_management'],
      [6, 'pest_management'],
      [7, 'business']
    ] as const) {
      const normalized = normalizeBackendEventData(eventType, {
        ...chemical,
        id: `${family}_99`,
        record_id: 99,
        event_type: eventType,
        type: family
      }) as Record<string, unknown>;
      expect(normalized.record_id, `${family} lost its record id`).toBe(99);
    }
  });

  it('does not invent one when the payload has none', () => {
    // The consumer payload withholds it. A card with no id must render no correction button
    // rather than a button that cannot work.
    const { record_id: _omitted, ...withoutId } = chemical;
    const normalized = normalizeBackendEventData(2, withoutId) as Record<string, unknown>;
    expect(normalized.record_id).toBeUndefined();
  });

  it('still carries the numeric family code the correction endpoint needs', () => {
    const normalized = normalizeBackendEventData(2, chemical) as Record<string, unknown>;
    expect(normalized.event_type).toBe(2);
  });
});
