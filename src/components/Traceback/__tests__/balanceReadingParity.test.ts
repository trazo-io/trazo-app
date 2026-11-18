/**
 * The trace card's balance readings are the backend's (`trazo-back/certifications/services/
 * audit_trail_exhibit.py`, `BALANCE_READINGS`), the codes behind the exhibit's own sentence
 * (recordkeeping checklist run 2026-11-16, VID-10). A code the backend sends and the card does not
 * know prints nothing, so a new reading would go silent on the screen while the exhibit says it.
 *
 * Reads the sibling repo, which the frontend CI job checks out beside this one (see `ci.yml`). Per
 * the project's rule for cross-repo guards it fails, never skips, when the sibling is missing.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import { describe, expect, it } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import es419 from 'i18n/lang/es-419.json';
import { BALANCE_READINGS } from '../TraceChain';

const BACKEND = join(
  __dirname,
  '../../../../..',
  'trazo-back/certifications/services/audit_trail_exhibit.py'
);

/** Said on the card by the season-open line, not a reading line of its own. */
const SAID_ELSEWHERE = new Set(['open_unsold']);

const backendReadings = (): string[] => {
  const source = readFileSync(BACKEND, 'utf8');
  const start = source.indexOf('BALANCE_READINGS = (');
  const body = source.slice(start, source.indexOf('\n)\n', start));
  return [...body.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
};

describe('balance readings: trace card and backend agree', () => {
  it('finds the backend list (guards the guard)', () => {
    expect(existsSync(BACKEND), `missing sibling ${BACKEND}`).toBe(true);
    expect(backendReadings()).toContain('packout_below_harvest');
  });

  it('words every backend reading on the card, and no other', () => {
    const backend = backendReadings().filter((c) => !SAID_ELSEWHERE.has(c));
    expect([...BALANCE_READINGS].sort()).toEqual([...backend].sort());
  });

  it('has each reading in both locales, with the quantity where the backend sends one', () => {
    for (const code of BALANCE_READINGS) {
      const id = `traceback.balance.reading.${code}`;
      for (const [name, messages] of [
        ['en-US', enUS],
        ['es-419', es419]
      ] as const) {
        const text = (messages as Record<string, string>)[id];
        expect(text, `${name} ${id}`).toBeTruthy();
        const namesQuantity = !['balanced', 'balanced_packed'].includes(code);
        expect(text.includes('{quantity}'), `${name} ${id}`).toBe(namesQuantity);
      }
    }
  });
});
