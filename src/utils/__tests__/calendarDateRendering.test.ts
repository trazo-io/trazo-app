/**
 * A calendar date must render as the day the grower entered — in every timezone.
 *
 * `History.start_date` / `finish_date` / `expected_harvest` are `DateTimeField`s that hold a
 * CALENDAR DATE. They arrive as `"2025-03-15T00:00:00Z"`, and `toLocaleDateString()` renders
 * that instant in the VIEWER's zone, so every timezone west of UTC — which is every US farm —
 * saw the previous day.
 *
 * The compliance consequence is the part that matters: the certifier packet is rendered
 * server-side in Python (`audit_export_service._fmt_date`, which calls `.date()` on a UTC
 * datetime and never localises), so the packet printed 2025-03-15 while the producer dashboard
 * printed "Mar 14, 2025" FOR THE SAME RECORD. Two documents, one season, two start dates.
 *
 * This file runs under a pinned non-UTC TZ (see vitest.config.ts). Without that pin these
 * assertions pass vacuously on a UTC CI runner, which is exactly why the defect survived.
 */
import { describe, expect, it } from 'vitest';

import {
  formatDateFromTimestamp,
  formatDateOnly,
  isOperatorChosenDate,
  nowLocalDateTimeInput,
  todayLocalISODate
} from '../dateOnly';

/** What the server-side packet prints for the same value: the UTC calendar day. */
const packetDay = (iso: string) => iso.slice(0, 10);

describe('the test environment is actually west of UTC', () => {
  it('is pinned, or every assertion below is meaningless', () => {
    expect(new Date().getTimezoneOffset()).toBeGreaterThan(0);
  });
});

describe('formatDateFromTimestamp — DateTimeField holding a calendar date', () => {
  it.each([
    '2025-03-15T00:00:00Z',
    '2026-01-01T00:00:00Z',
    '2025-09-20T00:00:00Z',
    '2025-12-31T00:00:00Z'
  ])('renders %s as the day the grower entered', (iso) => {
    const rendered = formatDateFromTimestamp(iso, 'en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    expect(rendered).toBe(packetDay(iso));
  });

  it('a naive local formatter would disagree — this is the bug, pinned', () => {
    const iso = '2025-03-15T00:00:00Z';
    const naive = new Date(iso).toLocaleDateString('en-CA');
    expect(naive).not.toBe(packetDay(iso));
    expect(formatDateFromTimestamp(iso, 'en-CA')).not.toBe(naive);
  });

  it('New Year is the case a farmer notices — a season must not start last year', () => {
    expect(formatDateFromTimestamp('2026-01-01T00:00:00Z', 'en-CA')).toContain('2026');
  });
});

describe('formatDateOnly — genuine DateField ("2025-01-01")', () => {
  // The helper renders a human shape ("Dec 31, 2025"), so assert the DAY it names rather than
  // a format. Unshifted is the property under test, not the punctuation.
  it.each([
    ['2025-01-01', 'Jan', '1', '2025'],
    ['2025-03-15', 'Mar', '15', '2025'],
    ['2025-12-31', 'Dec', '31', '2025']
  ])('renders %s unshifted', (input, month, day, year) => {
    const rendered = formatDateOnly(input, 'en-US') as string;
    expect(rendered).toContain(month);
    expect(rendered).toContain(day);
    expect(rendered).toContain(year);
  });

  it('new Date(bare) would shift it — the certifier review page hit this', () => {
    // "2025-01-01" parses as UTC midnight, so a local formatter west of UTC says Dec 31, 2024.
    const naive = new Date('2025-01-01').toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    expect(naive).toContain('2024');
    expect(formatDateOnly('2025-01-01', 'en-US')).toContain('2025');
  });
});

describe('input seeds use the viewer clock, not the UTC clock', () => {
  it('todayLocalISODate matches the local calendar day', () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    expect(todayLocalISODate()).toBe(expected);
  });

  it('nowLocalDateTimeInput seeds a datetime-local with LOCAL wall clock', () => {
    // The browser reads a datetime-local value as local wall clock. Seeding it from
    // `toISOString()` handed a UTC-3 grower "tomorrow 01:00" for work done tonight.
    const seeded = nowLocalDateTimeInput();
    const now = new Date();
    expect(seeded.slice(0, 10)).toBe(todayLocalISODate());
    expect(Number(seeded.slice(11, 13))).toBe(now.getHours());
    expect(seeded).not.toBe(new Date().toISOString().slice(0, 16));
  });
});

describe('isOperatorChosenDate separates an operator decision from the form default', () => {
  const WIZARD_DEFAULT = '2026-09-25T09:12';

  it('says no to the exact value the form seeded', () => {
    expect(isOperatorChosenDate(WIZARD_DEFAULT, WIZARD_DEFAULT)).toBe(false);
  });

  it('says yes when only the MINUTE differs, on the same day', () => {
    // The reason this is not a same-day test. A grower who sets 06:30 for a dawn spray and then
    // pastes the crew note at 11:43 chose that time; a date-part comparison calls it "today,
    // therefore the wizard's guess" and takes it away. The field is a datetime-local and the
    // application time feeds re-entry intervals.
    expect(isOperatorChosenDate('2026-09-25T06:30', WIZARD_DEFAULT)).toBe(true);
  });

  it('says yes for a different day', () => {
    expect(isOperatorChosenDate('2026-09-22T06:30', WIZARD_DEFAULT)).toBe(true);
  });

  it('says no for an empty, null or undefined value', () => {
    // A cleared field is the state this question exists to create, so it has to be answerable,
    // and "nobody has chosen a day" is the truthful answer.
    expect(isOperatorChosenDate('', WIZARD_DEFAULT)).toBe(false);
    expect(isOperatorChosenDate(null, WIZARD_DEFAULT)).toBe(false);
    expect(isOperatorChosenDate(undefined, WIZARD_DEFAULT)).toBe(false);
  });

  it('treats a value as chosen when the form supplied no default at all', () => {
    // Nothing was handed to the operator, so whatever is on the record came from somewhere they
    // controlled (a restored draft, an edited event) and must not be taken away.
    expect(isOperatorChosenDate('2026-09-22T06:30', undefined)).toBe(true);
  });

  it('does not treat the value as chosen merely because it is not today', () => {
    // Guards the inverse mistake: reading the question as "is this today" rather than "did the
    // operator pick it". Yesterday's date IS the form default here, so it is not a choice.
    const yesterdayAsDefault = '2026-09-24T09:12';
    expect(isOperatorChosenDate(yesterdayAsDefault, yesterdayAsDefault)).toBe(false);
  });
});
