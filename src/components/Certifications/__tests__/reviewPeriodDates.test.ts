/**
 * The review WINDOW a certifier is given must be the calendar year the grower picked.
 *
 * 🔴 2026-09-08. `periodDates` built its bounds with `new Date(y, 0, 1).toISOString().slice(0, 10)`.
 * `new Date(y, 0, 1)` is local midnight on 1 January; `toISOString()` converts it to UTC, so
 * anywhere EAST of Greenwich the window was sent as starting 31 December of the PREVIOUS YEAR,
 * and ending 30 December. Measured in Europe/Madrid before the fix:
 *
 *     period_start: 2025-12-31   period_end: 2026-12-30
 *
 * West of UTC it was already correct, which is why it survived: the ICP is American.
 */
import { describe, expect, it } from 'vitest';
import { periodDates } from '../CertifierLinkCard';

describe('periodDates', () => {
  it('returns the whole calendar year for current_year', () => {
    const year = new Date().getFullYear();
    const { period_start, period_end } = periodDates('current_year');
    expect(period_start).toBe(`${year}-01-01`);
    expect(period_end).toBe(`${year}-12-31`);
  });

  it('never round-trips a calendar date through an instant', () => {
    // The regression in one assertion: a January start must stay in January, and a
    // 31 December end must stay on the 31st, whatever the machine's zone is.
    const { period_start, period_end } = periodDates('current_year');
    expect(period_start?.slice(5)).toBe('01-01');
    expect(period_end?.slice(5)).toBe('12-31');
  });

  it('gives an empty window for "all", so the dossier is not bounded', () => {
    expect(periodDates('all')).toEqual({});
  });

  it('spans twelve months for last_12_months', () => {
    const { period_start, period_end } = periodDates('last_12_months');
    expect(period_start).toBeTruthy();
    expect(period_end).toBeTruthy();
    const start = new Date(`${period_start}T00:00:00Z`).getTime();
    const end = new Date(`${period_end}T00:00:00Z`).getTime();
    const days = (end - start) / 86_400_000;
    expect(days).toBeGreaterThanOrEqual(364);
    expect(days).toBeLessThanOrEqual(367);
  });

  it('formats as YYYY-MM-DD with no time component', () => {
    const { period_start, period_end } = periodDates('current_year');
    expect(period_start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(period_end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
