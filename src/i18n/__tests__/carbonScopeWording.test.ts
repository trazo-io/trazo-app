/**
 * Carbon figures cover the operation's own emissions plus the manufacturing of the fertilizer
 * and chemicals it buys (`.claude/rules/carbon-methodology.md`, `compliance.md`). "Direct
 * emissions" describes a narrower scope than the number shown, so it may not label a figure.
 * ("Carbon footprint" is the opposite error, a full life-cycle claim; it still appears in older
 * locale values and is not swept here.)
 *
 * Found 2026-10-17 in a pilot rehearsal: the event detail carbon block read "Estimated direct
 * emissions". The same wording sat in four other locale values and five hardcoded strings.
 *
 * Scope: every locale value in both languages, and every string in source outside comments and
 * tests.
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const WRONG_SCOPE = /direct emissions|emisiones directas/i;

function sourceLines(): string[] {
  const root = resolve(__dirname, '../..');
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name === '__tests__' || name === 'lang') continue;
        walk(path);
      } else if (/\.(tsx?|jsx?)$/.test(name) && !/\.test\./.test(name)) {
        readFileSync(path, 'utf8')
          .split('\n')
          .forEach((line, i) => {
            const t = line.trim();
            // Comments explain history; only rendered strings are in scope.
            if (
              t.startsWith('//') ||
              t.startsWith('*') ||
              t.startsWith('/*') ||
              t.startsWith('{/*')
            )
              return;
            out.push(`${path.slice(root.length + 1)}:${i + 1}: ${t}`);
          });
      }
    }
  };
  walk(root);
  return out;
}

describe('carbon figures are never labelled with a narrower scope than they cover', () => {
  it('no locale value says "direct emissions"', () => {
    const offenders = [
      ...Object.entries(enUS as Record<string, string>),
      ...Object.entries(es419 as Record<string, string>)
    ]
      .filter(([, value]) => WRONG_SCOPE.test(value))
      .map(([key, value]) => `${key}: ${value}`);
    expect(offenders).toEqual([]);
  });

  it('the event detail carbon label names the scope it covers', () => {
    expect((enUS as Record<string, string>)['eventDetails.carbonEstimate']).toBe(
      'Estimated emissions (operation and purchased inputs)'
    );
  });

  it('no hardcoded source string says "direct emissions"', () => {
    const offenders = sourceLines().filter((line) =>
      /direct emissions|emisiones directas/i.test(line)
    );
    expect(offenders).toEqual([]);
  });
});
