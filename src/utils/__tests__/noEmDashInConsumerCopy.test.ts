/**
 * No em dashes in consumer-facing copy.
 *
 * WHY (2026-08-01, user directive): the em dash has become a tell for machine-written text.
 * On a page whose entire argument is "a real person recorded this", prose that pattern-matches
 * to AI output undercuts the claim before a word of it is read.
 *
 * This walks every sentence `getConsumerEventDescription()` can produce — the same enumeration
 * the distinctness and Spanish-coverage gates use — plus the Spanish catalogue, because a
 * translation can reintroduce one long after the English was cleaned.
 *
 * Rewrite rather than substitute a look-alike: an em dash almost always joins two clauses, so a
 * comma, a colon or a full stop reads better than the en dash or double hyphen someone will
 * otherwise reach for. Those are banned here too so the fix cannot be cosmetic.
 *
 * NOT covered, deliberately: the farmer's own field notes (never edited — see
 * feedback_one_container_per_card) and the audit PDF's "—" empty-cell marker, which is a table
 * convention for "no value", not prose.
 */
import { describe, expect, it } from 'vitest';
import { getConsumerEventDescription } from '../eventDescriptions';
import { CONSUMER_DESCRIPTION_ES } from '../eventDescriptions.es';
import { getSubtypes } from '../../config/events';

import { enumerateConsumerCopy } from './consumerCopyMatrix';

const EVENT_TYPES = [
  { name: 'weather', code: 0 },
  { name: 'production', code: 1 },
  { name: 'chemical', code: 2 },
  { name: 'general', code: 3 },
  { name: 'equipment', code: 4 },
  { name: 'soil_management', code: 5 },
  { name: 'pest_management', code: 6 },
  { name: 'business', code: 7 }
];

/** Em dash, en dash, and the "--" that people reach for when the dash is taken away. */
const DASHES = /—|–|--/;

const LOCALIZED_FIELDS = [
  'title',
  'shortDescription',
  'description',
  'consumerImpact',
  'sustainabilityBenefit'
] as const;

function reachableSentences(): Array<{ origin: string; text: string }> {
  // Enumeration lives in consumerCopyMatrix so this gate sweeps the same shapes as the claim,
  // distinctness and Spanish gates — including the chemical organic fork and every
  // business_type, both of which a per-file matrix had been missing.
  const found: Array<{ origin: string; text: string }> = [];
  for (const { key, info } of enumerateConsumerCopy()) {
    for (const field of LOCALIZED_FIELDS) {
      const text = (info as Record<string, unknown>)[field];
      if (typeof text === 'string' && text.trim()) {
        found.push({ origin: `${key}/${field}`, text });
      }
    }
  }
  return found;
}

describe('consumer copy contains no em dashes', () => {
  const REACHABLE = reachableSentences();

  it('enumerates a meaningful number of sentences (guards the harness itself)', () => {
    expect(REACHABLE.length).toBeGreaterThan(100);
  });

  it('has none in any English sentence the card can render', () => {
    const offenders = REACHABLE.filter((r) => DASHES.test(r.text)).map(
      (r) => `  • [${r.origin}] ${r.text}`
    );
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });

  it('has none in the Spanish catalogue', () => {
    const offenders = Object.entries(CONSUMER_DESCRIPTION_ES)
      .filter(([, translation]) => DASHES.test(translation))
      .map(([english, translation]) => `  • "${english.slice(0, 60)}…" → ${translation}`);
    expect(offenders, `\n${offenders.join('\n')}\n`).toEqual([]);
  });
});
