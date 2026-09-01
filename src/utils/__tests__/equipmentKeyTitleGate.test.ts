/**
 * `getConsumerEventDescription`'s last-resort title chain must not name a card from
 * `equipment` unless the event IS an equipment event.
 *
 * Background: until 2026-08-31 the public payload let five event families populate
 * `equipment`, and only one of them put equipment in it — chemical sent the product name,
 * soil the amendment type, business the certification, and pest the SPECIES, Latin binomial
 * included. Guard for the payload half: backend
 * `test_consumer_qr_privacy_regression.EquipmentKeyIsNotOverloadedTests`.
 *
 * MEASURED, so the record is accurate: the four mis-mapped families never actually reached
 * this chain. Each is claimed by an earlier per-family branch ("Pest & scouting", "Soil work",
 * "Certification & compliance", "Crop input application"), verified by running the real
 * payload shapes with the gate both present and absent — identical output. So the binomial
 * leaked into the payload, it did not render as a title.
 *
 * The chain is still reachable, which is why the gate and this test exist: ANY family the
 * earlier branches do not claim falls through to it, and `equipment` was the second thing it
 * reached for. That is the shape tested below — the only one that can distinguish the gate
 * from its absence. A fixture using `type: 'pest_management'` would pass either way, i.e.
 * guard nothing while looking like it guards the leak.
 */
import { describe, it, expect } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';

const UNCLAIMED_FAMILY = 'field_observation';

describe('generic title chain: the `equipment` fallback is equipment-only', () => {
  it('does not title an unrecognised family from `equipment`', () => {
    const { title } = getConsumerEventDescription('Scouting round', {
      type: UNCLAIMED_FAMILY,
      equipment: 'Citrus thrips (Scirtothrips citri)'
    });
    expect(title).not.toContain('Scirtothrips');
    expect(title).toBe('Agricultural Activity');
  });

  it('does not title an unrecognised family from a stray amendment or certification', () => {
    for (const stray of ['compost', 'USDA Organic']) {
      const { title } = getConsumerEventDescription('Activity', {
        type: UNCLAIMED_FAMILY,
        equipment: stray
      });
      expect(title, `"${stray}" arriving under equipment became the card title`).toBe(
        'Agricultural Activity'
      );
    }
  });

  it('still titles an equipment event from its equipment name', () => {
    // The gate is a type check, not a deletion. No `event_type` here on purpose: that is the
    // shape the backend sends for an equipment event (`type: "equipment"`, no numeric
    // `event_type`), and it is what reaches this chain.
    const { title } = getConsumerEventDescription('Equipment maintenance', {
      type: 'equipment',
      equipment: 'John Deere 5075E'
    });
    expect(title).toBe('John Deere 5075E');
  });
});
