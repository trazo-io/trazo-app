/**
 * Every `injectEndpoints` call in `src/store/api` lands on the SAME `baseApi`, and RTK
 * Query SKIPS a duplicate endpoint name (overrideExisting defaults to false) — the first
 * module to load wins, silently, with no runtime error.
 *
 * That is how `getFarmProductions` broke on 2026-08-17: buyerPageApi's version took
 * `{ companyId, farmId }` while historyApi's took a bare id string, historyApi won the
 * injection, and the Buyer page's object got template-interpolated into
 * `GET /api/histories/?establishment=[object Object]` → Django `int()` → HTTP 500.
 *
 * A collision also silently swaps providesTags, so the other module's `invalidatesTags`
 * stops refetching anything (the second collision found that day: getBuyerDocRequests).
 *
 * Endpoint names must therefore be globally unique across the api directory.
 */
import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

const API_DIR = path.resolve(__dirname, '..');
const SOURCE_RE = /\.(ts|tsx|js|jsx)$/;
const ENDPOINT_RE = /^[ \t]+([A-Za-z0-9_]+):[ \t]*build\.(query|mutation)\b/gm;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return SOURCE_RE.test(entry.name) && !entry.name.endsWith('.d.ts') ? [full] : [];
  });
}

describe('RTK Query endpoint names are globally unique', () => {
  it('no endpoint name is defined in two modules', () => {
    const owners = new Map<string, string[]>();

    for (const file of sourceFiles(API_DIR)) {
      const source = fs.readFileSync(file, 'utf8');
      for (const match of source.matchAll(ENDPOINT_RE)) {
        const name = match[1];
        const rel = path.relative(API_DIR, file);
        owners.set(name, [...(owners.get(name) ?? []), rel]);
      }
    }

    const collisions = [...owners.entries()]
      .filter(([, files]) => files.length > 1)
      .map(([name, files]) => `${name} defined in ${files.join(', ')}`);

    expect(collisions).toEqual([]);
  });

  it('finds endpoints at all (guards the regex against a refactor)', () => {
    const total = sourceFiles(API_DIR).reduce(
      (n, file) => n + [...fs.readFileSync(file, 'utf8').matchAll(ENDPOINT_RE)].length,
      0
    );
    expect(total).toBeGreaterThan(100);
  });
});
