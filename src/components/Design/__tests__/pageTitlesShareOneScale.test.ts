/**
 * Every producer page titles itself with PAGE_TITLE (2026-11-06, option C of three rendered).
 *
 * Until then StandardPage's 41 pages used a 48px green.700 title and the farm home, parcel page
 * and three profiles a 36px gray one: two scales, and green spent on decoration. A page-level
 * `<Heading as="h1">` that sets its own size or colour is how the two scales come back.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '../../..');
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === '__tests__' ? [] : walk(p);
    return /\.(tsx|jsx)$/.test(n) ? [p] : [];
  });

const h1Tags = (code: string) =>
  [...code.matchAll(/<Heading\b[^>]*\bas="h1"[^>]*>/g)].map((m) => m[0]);

describe('page titles', () => {
  it('StandardPage titles with PAGE_TITLE on both breakpoints', () => {
    const code = readFileSync(join(SRC, 'components/Design/StandardComponents.tsx'), 'utf8');
    const tags = h1Tags(code);
    expect(
      tags.length,
      'StandardPage lost its h1s; this would pass vacuously'
    ).toBeGreaterThanOrEqual(2);
    for (const tag of tags) expect(tag).toContain('{...PAGE_TITLE}');
  });

  it('every producer page h1 uses PAGE_TITLE and sets no size or colour of its own', () => {
    const files = walk(join(SRC, 'views/Dashboard'));
    const checked: string[] = [];
    for (const file of files) {
      for (const tag of h1Tags(readFileSync(file, 'utf8'))) {
        const rel = relative(SRC, file);
        checked.push(rel);
        expect(tag, `${rel}: page title without PAGE_TITLE`).toContain('{...PAGE_TITLE}');
        expect(tag, `${rel}: page title sets its own size or colour`).not.toMatch(
          /\s(size|color|fontSize)=/
        );
      }
    }
    expect(checked.length, 'no page h1 found; the pattern moved').toBeGreaterThanOrEqual(5);
  });
});
