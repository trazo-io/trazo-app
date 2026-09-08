/**
 * The consumer event generator now receives a CONTROLLED SUBTYPE LABEL, not farmer prose.
 *
 * The public payload's `description` used to carry `event.description` — unbounded farmer free
 * text on an anonymous surface. The backend replaced it with the subtype's display label
 * ("Frost", "Fertilizer", "Harvesting"). This gate pins the three properties that change makes
 * load-bearing on the client:
 *
 *   1. every family still produces a usable card title from the new seed,
 *   2. the generator survives a seed that is missing entirely (an older cached payload), and
 *   3. the weather branch still resolves for labels that contain none of the words its keyword
 *      fallback looks for ("Drought", "High Winds") — it reaches them through the event's
 *      `type`, which is why swapping the seed did not break them.
 */
import { describe, expect, it } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';

/** The exact strings the backend's `_public_event_label` now emits, per family. */
const BACKEND_LABELS: Array<{ family: string; seed: string; event: Record<string, unknown> }> = [
  { family: 'weather/frost', seed: 'Frost', event: { event_type: 0, type: 'FR' } },
  { family: 'weather/drought', seed: 'Drought', event: { event_type: 0, type: 'DR' } },
  { family: 'weather/high winds', seed: 'High Winds', event: { event_type: 0, type: 'HW' } },
  {
    family: 'production/planting',
    seed: 'Planting',
    event: { event_type: 1, type: 'PL', production_type: 'PL' }
  },
  {
    family: 'production/harvest',
    seed: 'Harvesting',
    event: { event_type: 1, type: 'HA', production_type: 'HA' }
  },
  {
    family: 'production/irrigation',
    seed: 'Irrigation',
    event: { event_type: 1, type: 'IR', production_type: 'IR' }
  },
  {
    family: 'chemical/fertilizer',
    seed: 'Fertilizer',
    event: { event_type: 2, type: 'chemical', chemical_type: 'FE' }
  },
  {
    family: 'chemical/fungicide',
    seed: 'Fungicide',
    event: { event_type: 2, type: 'chemical', chemical_type: 'FU' }
  },
  { family: 'general', seed: 'General Event', event: { event_type: 3, type: 'general' } },
  {
    family: 'soil/cover crop',
    seed: 'Cover Crop',
    event: { event_type: 5, type: 'soil_management', soil_management_type: 'CC' }
  },
  {
    family: 'pest/scouting',
    seed: 'Scouting',
    event: { event_type: 6, type: 'pest_management', pest_management_type: 'SC' }
  },
  {
    family: 'business/certification',
    seed: 'Certification',
    event: { event_type: 7, type: 'business', business_event_type: 'CE' }
  }
];

describe('the subtype label as the generator seed', () => {
  it.each(BACKEND_LABELS)('$family produces a usable title', ({ seed, event }) => {
    const result = getConsumerEventDescription(seed, event);
    expect(result).toBeTruthy();
    expect(typeof result.title).toBe('string');
    expect(result.title.trim().length).toBeGreaterThan(0);
  });

  it('never echoes a raw subtype CODE as the title', () => {
    // A bare "FE" or "HA" reaching the card would mean the backend fell through to the raw
    // value instead of the display label.
    for (const { seed, event } of BACKEND_LABELS) {
      const { title } = getConsumerEventDescription(seed, event);
      expect(title).not.toMatch(/^[A-Z]{2}$/);
    }
  });
});

describe('a missing seed', () => {
  it('does not throw when the description key is absent', () => {
    expect(() =>
      getConsumerEventDescription(undefined as unknown as string, { event_type: 1, type: 'HA' })
    ).not.toThrow();
  });

  it('does not throw on an empty string', () => {
    expect(() =>
      getConsumerEventDescription('', { event_type: 2, type: 'chemical' })
    ).not.toThrow();
  });

  it('still returns a title without any seed', () => {
    const result = getConsumerEventDescription('', {
      event_type: 1,
      type: 'HA',
      production_type: 'HA'
    });
    expect(result.title.trim().length).toBeGreaterThan(0);
  });
});

describe('the weather branch survives the seed swap', () => {
  it('resolves a drought record whose title contains none of the keyword fallbacks', () => {
    const result = getConsumerEventDescription('Drought', { event_type: 0, type: 'DR' });
    expect(result.title.toLowerCase()).toContain('drought');
  });

  it('resolves a high-wind record the same way', () => {
    const result = getConsumerEventDescription('High Winds', { event_type: 0, type: 'HW' });
    expect(result.title.trim().length).toBeGreaterThan(0);
    expect(result.title).not.toBe('Agricultural Activity');
  });
});
