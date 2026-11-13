/**
 * A new season starts with perennial-or-annual UNSTATED. The grower states it; the form may not.
 *
 * `History.type` ("OR" perennial, "GA" annual) decides whether the audit export attaches the
 * § 205.204(a)(4) 12-month verdict to planting stock ("UNDER the 12-month minimum"). The form
 * preselected "OR" and the edit form turned a missing value into "OR", so a vegetable grower who
 * never touched the select was recorded as perennial, and the false verdict the 2026-08-21 fix
 * removed for annual transplants came back through the default (2026-11-13).
 *
 * Source-reading, like noDefaultProductionMethod.test.ts beside it.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'QuickStartProduction.tsx'), 'utf8');

describe('QuickStartProduction never chooses perennial or annual', () => {
  it('starts the field empty', () => {
    const defaults = source.slice(source.indexOf('defaultValues: {'));
    expect(defaults.slice(0, 500)).toMatch(/\btype: ''/);
    expect(defaults.slice(0, 500)).not.toMatch(/\btype: '(OR|GA)'/);
  });

  it('requires a choice before the season can be saved', () => {
    expect(source).toMatch(/type: string\(\)\.min\(1,/);
  });

  it('has no fallback that turns a missing value into perennial', () => {
    expect(source).not.toMatch(/\.type \|\| '(OR|GA)'/);
  });

  it('offers an empty, unselectable prompt before the two real options', () => {
    const select = source.slice(source.indexOf('name="type"'));
    expect(select.indexOf('<option value="" disabled>')).toBeGreaterThan(-1);
    expect(select.indexOf('<option value="" disabled>')).toBeLessThan(
      select.indexOf('<option value="OR">')
    );
  });
});
