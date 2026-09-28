/**
 * The OMRI edition date must read as the edition OMRI published, in the viewer's own calendar.
 *
 * MEASURED 2026-09-18 while verifying the OMRI catalogue against the publisher's file: the input
 * verification panel showed "List of Sep 4, 2026" for OMRI's Sep 5 2026 edition. `list_edition_date`
 * is a backend DATE column (`YYYY-MM-DD`, no time, no zone); handed to `Intl.DateTimeFormat` as a
 * raw string it parses as UTC midnight, which is the previous day for every viewer west of UTC.
 *
 * The date is not decoration. OMRI republishes the list daily, so the edition is what tells a
 * grower, and a certifier reading the record, WHICH list a product was found on. Off by one day is
 * a different edition.
 *
 * The suite runs pinned to America/Los_Angeles (vitest.config.ts), so these assertions exercise the
 * failing direction rather than passing vacuously on a UTC runner.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import { parseDateOnly } from '../../../utils/dateOnly';

const OMRI_SEPTEMBER_EDITION = '2026-09-05';
const render = (value: Date | null | undefined) =>
  new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    value ?? undefined
  );

describe('OMRI edition date', () => {
  it('reads as the published edition west of UTC', () => {
    expect(render(parseDateOnly(OMRI_SEPTEMBER_EDITION))).toBe('Sep 5, 2026');
  });

  it('ANTI-VACUITY: the raw string really does read a day early here', () => {
    // If this ever stops being true the timezone pin has gone, and the test above proves nothing.
    expect(render(new Date(OMRI_SEPTEMBER_EDITION))).toBe('Sep 4, 2026');
  });

  it('keeps a missing edition date out of the label rather than inventing one', () => {
    // The panel appends the edition only when there is one: a listing with no edition on file
    // shows the OMRI id alone. "Current" would be a claim about a list nobody checked.
    expect(parseDateOnly(null)).toBeNull();
    expect(parseDateOnly('')).toBeNull();
  });
});

describe('InputVerifyHelper', () => {
  const source = readFileSync(join(__dirname, '..', 'InputVerifyHelper.tsx'), 'utf8');

  it('routes the edition date through parseDateOnly', () => {
    expect(source).toContain("import { parseDateOnly } from 'utils/dateOnly'");
    expect(source).toMatch(/parseDateOnly\(candidate\.list_edition_date\)/);
  });

  it('never hands the raw DATE string to a formatter', () => {
    // The defect in one line: `formatDate(candidate.list_edition_date)`.
    expect(source).not.toMatch(/formatDate\(\s*candidate\.list_edition_date/);
  });
});
