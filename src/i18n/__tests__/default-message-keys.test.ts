import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import enUS from '../lang/en-US.json';

/**
 * Second-order i18n gate: a key used WITH a `defaultMessage` but absent from the catalogues.
 *
 * The other two gates each miss this case by design:
 *   • parity.test.ts proves en-US ↔ es-419 symmetry, so a key missing from BOTH is symmetric
 *     and passes.
 *   • used-keys.test.ts deliberately skips calls that pass a `defaultMessage`, because those
 *     render readable English instead of a raw dotted id.
 *
 * The result is a quieter failure than a raw id, and a worse one for a bilingual product: the
 * string renders in ENGLISH on a Spanish page, and nothing anywhere reports it. That is exactly
 * how `events.photos.examples` and `events.photos.tips` shipped — the photo-guidance content
 * around them was fully translated while the headings above it stayed English.
 *
 * A `defaultMessage` is a safety net for the English build, not a substitute for translating.
 */

const SRC_DIR = join(process.cwd(), 'src');
const FORMAT_MESSAGE = /formatMessage\(\s*\{([\s\S]{0,400}?)\}/g;
const ID_PROP = /\bid:\s*['"]([^'"]+)['"]/;
const HAS_DEFAULT = /\bdefaultMessage\s*:/;

const walk = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry)) out.push(full);
  }
  return out;
};

describe('every message id used with a defaultMessage exists in the catalogue', () => {
  it('has no id that would silently render English on a Spanish page', () => {
    const catalogue = enUS as Record<string, string>;
    const offenders: string[] = [];

    for (const file of walk(SRC_DIR)) {
      const source = readFileSync(file, 'utf8');
      for (const match of source.matchAll(FORMAT_MESSAGE)) {
        const body = match[1];
        if (!HAS_DEFAULT.test(body)) continue; // used-keys.test.ts owns that case
        const id = ID_PROP.exec(body)?.[1];
        if (!id) continue; // dynamic id — cannot resolve statically
        if (!catalogue[id]) offenders.push(`${id}  (${file.replace(SRC_DIR, 'src')})`);
      }
    }

    expect(
      [...new Set(offenders)].sort(),
      'these ids fall back to English because they are in no catalogue — add them to BOTH ' +
        'en-US.json and es-419.json:\n' +
        [...new Set(offenders)].sort().join('\n')
    ).toEqual([]);
  });
});
