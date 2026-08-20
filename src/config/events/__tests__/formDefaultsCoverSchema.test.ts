/**
 * Every key in a form's zod schema must also appear in its defaultValues.
 *
 * WHY — MEASURED 2026-08-19, and it is not obvious.
 *
 * ProductionTab calls `reset(defaults)` when the subtype or initialValues change. react-hook-form
 * resets to EXACTLY the keys in that object, so a field present in the schema but missing from
 * defaults is not "left alone" — it is dropped. The failure is invisible in the ordinary case
 * and appears only when something triggers a re-render mid-entry:
 *
 *   * a Transport event whose endpoints were the ONLY fields touched saved them correctly;
 *   * the same event lost both the moment the `harvest_destination` select was also set,
 *     because that select mounts the handler round-trip block and re-renders the section.
 *
 * So the bug reproduces on the realistic path and not on the minimal one, which is the worst
 * shape for manual testing: fill one field, it works; fill the form, it silently doesn't.
 *
 * `src/config/events/ADDING_FIELDS.md` lists this as a required step. This test is what makes
 * skipping it fail loudly instead of shipping a field that saves only sometimes.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const TAB = join(__dirname, '../../../views/Dashboard/Dashboard/components/forms/ProductionTab.jsx');

/** Keys declared in the `formSchemaMainInfo = object({...})` block. */
const schemaKeys = (src: string): string[] => {
  const start = src.indexOf('const formSchemaMainInfo = object({');
  expect(start, 'formSchemaMainInfo moved or was renamed').toBeGreaterThan(-1);
  let depth = 0;
  let i = src.indexOf('{', start);
  const open = i;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  const body = src.slice(open, i);
  // top-level `key: ...` only — nested object({...}) members are not form keys
  return [...new Set([...body.matchAll(/^\s{2}([a-z_][a-z0-9_]*)\s*:/gim)].map((m) => m[1]))];
};

/**
 * Keys seeded from `initialValues` — by ANY expression shape.
 *
 * ⚠️ The first version of this matched only `key: initialValues.x` and `key: normalizeX(...)`,
 * and reported five fields as missing defaults that are in fact seeded through
 * `asToggle(initialValues.x)`, `summarizeWaterTestResults(initialValues.x)`, or a value that
 * prettier wrapped onto the next line. Five invented defects on the first run — which is how a
 * guard loses the reader's trust and takes every true finding down with it. Match the KEY, then
 * look ahead for `initialValues` within the value expression.
 */
const defaultKeys = (src: string): Set<string> => {
  const found = new Set<string>();
  for (const m of src.matchAll(/^\s+([a-z_][a-z0-9_]*)\s*:/gim)) {
    const after = src.slice(m.index! + m[0].length, m.index! + m[0].length + 160);
    // stop at the next top-level key so a following line's initialValues cannot be borrowed
    const value = after.split(/\n\s+[a-z_][a-z0-9_]*\s*:/)[0];
    if (/initialValues/.test(value)) found.add(m[1]);
  }
  return found;
};

describe('ProductionTab: schema keys are covered by defaultValues', () => {
  const src = readFileSync(TAB, 'utf8');

  it('finds a real schema and real defaults', () => {
    // Non-vacuity. An empty schema or empty defaults would make the check below pass silently,
    // which is exactly the failure mode this file exists to prevent elsewhere.
    expect(schemaKeys(src).length, 'no schema keys parsed').toBeGreaterThan(30);
    expect(defaultKeys(src).size, 'no default keys parsed').toBeGreaterThan(30);
  });

  // ⚠️ KNOWN LIMIT, stated rather than left for someone to discover: this checks that a key is
  // defaulted SOMEWHERE in the file, not in each of the two defaults objects separately. It
  // therefore catches "the field was never added to defaults" — the bug that prompted it — but
  // not "added to one object and not the other". Verified by removing a default and watching
  // this fail; removing only ONE of the two occurrences still passes.
  it('has a default for every schema key', () => {
    const defaults = defaultKeys(src);
    // Fields the form deliberately does not seed from initialValues: arrays/objects rebuilt by
    // their own effects, and the photo/custom-field collections managed outside the reset.
    const EXEMPT = new Set(['custom_fields', 'seed_search_attempts', 'album', 'images']);
    const missing = schemaKeys(src).filter((k) => !defaults.has(k) && !EXEMPT.has(k));
    expect(
      missing,
      `these fields are in the zod schema but not in defaultValues, so reset() drops whatever ` +
        `the farmer typed:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });
});
