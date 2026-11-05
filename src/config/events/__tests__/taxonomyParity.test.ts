/**
 * The frontend event registry agrees with the backend taxonomy (schema remodel plan, 2026-11).
 *
 * The integer event codes 0-7 travel on every event URL (`?event_type=`) and are stored in six
 * backend tables, yet nothing compared this registry with the backend: about 11 backend and 13
 * frontend copies, any of which could drift and file a record under another kind. The backend now
 * defines the kinds once (`trazo-back/history/taxonomy.py`) and commits a generated snapshot,
 * `history/taxonomy.json`, which this test reads from the sibling checkout (CI checks the backend
 * out next to this repo).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { getSubtypes } from '../index';
import { EVENT_TYPE_CODE_TO_NAME, EVENT_TYPE_NAME_TO_CODE } from '../registry';

const REPO_ROOT = join(__dirname, '../../../../..');
const SNAPSHOT = join(REPO_ROOT, 'trazo-back/history/taxonomy.json');

type Kind = { code: number; slug: string; model: string; subtypes: string[] };

const kinds = (): Kind[] => JSON.parse(readFileSync(SNAPSHOT, 'utf8')).kinds;

/**
 * Frontend names predate the backend slugs; two differ. Written out so a rename on either side
 * is a deliberate edit here, not a silent mismatch.
 */
const FRONTEND_NAME_FOR_SLUG: Record<string, string> = {
  weather: 'weather',
  production: 'production',
  chemical: 'chemical',
  general: 'general',
  equipment: 'equipment',
  soil: 'soil_management',
  pest: 'pest_management',
  business: 'business'
};

describe('event registry matches the backend taxonomy', () => {
  it('reads a real backend snapshot (guard is not vacuous)', () => {
    expect(
      existsSync(SNAPSHOT),
      'trazo-back/history/taxonomy.json not found: the backend must be checked out as a sibling'
    ).toBe(true);
    expect(kinds().length).toBeGreaterThanOrEqual(8);
  });

  it('names every backend kind', () => {
    // A kind added on the backend with no name here would otherwise compare as `undefined`.
    for (const k of kinds()) {
      expect(
        FRONTEND_NAME_FOR_SLUG[k.slug],
        `no frontend name for backend kind ${k.slug}`
      ).toBeDefined();
    }
  });

  it('has exactly the backend codes, each under the expected name', () => {
    const fromBackend = Object.fromEntries(
      kinds().map((k) => [k.code, FRONTEND_NAME_FOR_SLUG[k.slug]])
    );
    // toStrictEqual, not toEqual: toEqual treats an `undefined` value as a missing key.
    expect({ ...EVENT_TYPE_CODE_TO_NAME }).toStrictEqual(fromBackend);
  });

  it('maps names back to the same codes', () => {
    for (const k of kinds()) {
      const name = FRONTEND_NAME_FOR_SLUG[k.slug] as keyof typeof EVENT_TYPE_NAME_TO_CODE;
      expect(EVENT_TYPE_NAME_TO_CODE[name], k.slug).toBe(k.code);
    }
  });

  it('offers the stored subtype codes of every kind that has them', () => {
    for (const k of kinds()) {
      const front = getSubtypes(k.code as 0).map((s: { code: string }) => s.code);
      expect([...front].sort(), `${k.slug} (${k.model})`).toEqual([...k.subtypes].sort());
    }
  });
});
