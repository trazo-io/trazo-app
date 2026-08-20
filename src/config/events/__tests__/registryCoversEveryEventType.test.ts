/**
 * Every event type must resolve at least one consumer-card field from the registry.
 *
 * WHY THIS EXISTS — it is the precondition for a deletion.
 *
 * `ConsumerEventCard` used to end with:
 *
 *     return hasRegistryFields
 *       ? mergeCustomFieldsIntoDisplay(registryDisplay, event)
 *       : legacyFieldDisplay;          // <- fieldDisplayUtils' hand-rolled extractors
 *
 * so the legacy extractors were not dead code: they were the FALLBACK for any event the
 * registry produced nothing for. Removing them without this check would have turned
 * "registry has no coverage here" from a silent degradation into a blank card, and blank is
 * exactly the failure that goes unnoticed — no error, no warning, just a shopper seeing an
 * event with no detail.
 *
 * So the fallback was replaced by an invariant: the registry covers every type. This test is
 * what makes that claim true rather than hoped for. If a new event type ships without
 * consumer-card fields, it fails HERE, at the registry, instead of rendering an empty card in
 * production.
 */
import { describe, expect, it } from 'vitest';
import { eventRegistry } from '../index';

describe('registry consumer-card coverage', () => {
  const types = Object.entries(eventRegistry);

  it('knows about every event family', () => {
    // Non-vacuity: an empty registry would satisfy every per-type assertion below.
    expect(types.length, 'the registry appears to be empty').toBeGreaterThanOrEqual(8);
  });

  it('gives every event type at least one consumer-card field', () => {
    const barren: string[] = [];
    for (const [name, cfg] of types) {
      const fields = (cfg as { fields?: Array<{ surfaces?: Record<string, string> }> }).fields ?? [];
      const onCard = fields.filter((f) => f.surfaces?.consumer_card);
      if (onCard.length === 0) barren.push(name);
    }
    expect(
      barren,
      `these event types declare no consumer_card field, so their card would render EMPTY now ` +
        `that the legacy fallback is gone:\n  ${barren.join('\n  ')}`
    ).toEqual([]);
  });
});
