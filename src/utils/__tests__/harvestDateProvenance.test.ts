/**
 * The harvest date a buyer reads must come from a harvest RECORD.
 *
 * Found 2026-08-20 on a real WA Honeycrisp lot. The hero and the HARVEST pillar both read
 * `farm_context.production_period.end` — the day the grower CLOSED the season in Trazo — and
 * labelled it "Harvested {date}". The two passes actually came off on 12 and 19 September;
 * the record was closed on the 22nd. The page told buyers the fruit was picked on a day
 * nothing was picked.
 *
 * Harvest date drives shelf-life and storage decisions and is the field a buyer cross-checks
 * against a packing record, so a three-day drift reads as a traceability failure in Trazo's
 * own data. Multi-pass harvests are the norm in tree fruit and citrus, so a single date would
 * also silently pick one pass and hide the rest.
 */

import { describe, expect, it } from 'vitest';

import {
  formatDateRangeForConsumer,
  resolveHarvestDates,
  resolveProductionDisplayDates
} from '../consumerDisplay';

describe('resolveHarvestDates', () => {
  const CLOSE_DATE = '2025-09-22T17:00:00+00:00';

  it('prefers the harvest records over the season-close date', () => {
    const timeline = [
      { production_type: 'PR', date: '2025-03-28T07:00:00+00:00' },
      { production_type: 'HA', date: '2025-09-12T07:00:00+00:00' },
      { production_type: 'HA', date: '2025-09-19T07:00:00+00:00' }
    ];

    const result = resolveHarvestDates(timeline, CLOSE_DATE);

    expect(result.first).toContain('2025-09-12');
    expect(result.last).toContain('2025-09-19');
    expect(result.isRange).toBe(true);
    // The regression proper: the close date must not appear anywhere in the answer.
    expect(result.first).not.toContain('2025-09-22');
    expect(result.last).not.toContain('2025-09-22');
  });

  it('reports a single-pass harvest as a date, not a range', () => {
    const result = resolveHarvestDates(
      [{ production_type: 'HA', date: '2025-09-03T07:00:00+00:00' }],
      CLOSE_DATE
    );
    expect(result.isRange).toBe(false);
    expect(result.first).toBe(result.last);
  });

  it('falls back to the close date only when the lot has no harvest record', () => {
    const result = resolveHarvestDates(
      [{ production_type: 'IR', date: '2025-06-01T07:00:00+00:00' }],
      CLOSE_DATE
    );
    expect(result.first).toBe(CLOSE_DATE);
    expect(result.isRange).toBe(false);
  });

  it('handles an empty or absent timeline without throwing', () => {
    expect(resolveHarvestDates(undefined, CLOSE_DATE).last).toBe(CLOSE_DATE);
    expect(resolveHarvestDates([], null).last).toBeNull();
  });

  it('orders passes that arrive out of sequence', () => {
    const result = resolveHarvestDates(
      [
        { production_type: 'HA', date: '2026-02-26T08:00:00+00:00' },
        { production_type: 'HA', date: '2025-12-18T08:00:00+00:00' }
      ],
      null
    );
    expect(result.first).toContain('2025-12-18');
    expect(result.last).toContain('2026-02-26');
  });
});

describe('formatDateRangeForConsumer', () => {
  it('prints the year once when both ends share it', () => {
    expect(formatDateRangeForConsumer('2025-09-12', '2025-09-19', 'en-US')).toBe(
      'Sep 12 – Sep 19, 2025'
    );
  });

  it('prints both years when the window crosses one (a citrus season does)', () => {
    expect(formatDateRangeForConsumer('2025-12-18', '2026-02-26', 'en-US')).toBe(
      'Dec 18, 2025 – Feb 26, 2026'
    );
  });

  it('honours the shopper locale', () => {
    // The bug in the copy this replaced: `'en-US'` was hardcoded, so a Spanish shopper read
    // US-formatted dates on summary cards and localized ones everywhere else.
    const es = formatDateRangeForConsumer('2025-09-12', '2025-09-19', 'es-419');
    expect(es).not.toBeNull();
    expect(es).not.toBe('Sep 12 – Sep 19, 2025');
  });

  it('parses a calendar-date string as local, not UTC midnight', () => {
    // "2025-09-12" through `new Date()` is UTC midnight, which renders as the 11th across
    // every US timezone. vitest.config.ts pins TZ=America/Los_Angeles so this actually bites.
    expect(formatDateRangeForConsumer('2025-09-12', '2025-09-19', 'en-US')).toContain('Sep 12');
  });

  it('returns null when either end is missing, so the caller can fall back', () => {
    expect(formatDateRangeForConsumer(null, '2025-09-19')).toBeNull();
    expect(formatDateRangeForConsumer('2025-09-12', undefined)).toBeNull();
  });
});

describe('resolveHarvestDates — fresh-eyes hardening (2026-08-20)', () => {
  it('orders by instant, not by string', () => {
    // Lexicographic sort puts the -08:00 row first even though it is the LATER instant.
    const result = resolveHarvestDates(
      [
        { production_type: 'HA', date: '2025-09-13T01:00:00+00:00' },
        { production_type: 'HA', date: '2025-09-12T23:00:00-08:00' }, // = 13th 07:00Z
      ],
      null
    );
    expect(result.first).toBe('2025-09-13T01:00:00+00:00');
    expect(result.last).toBe('2025-09-12T23:00:00-08:00');
  });

  it('decides "is this a range" on the days the page prints, not the viewer\'s local days', () => {
    // Stored timestamps print in UTC (calendarDay). Both of these print as Sep 12, so they are
    // one day, even though America/Los_Angeles (pinned by vitest.config) calls the first the
    // 11th. Deciding locally printed a degenerate "Sep 12 – Sep 12" (review of #367).
    const oneDay = resolveHarvestDates(
      [
        { production_type: 'HA', date: '2025-09-12T02:00:00+00:00' },
        { production_type: 'HA', date: '2025-09-12T20:00:00+00:00' },
      ],
      null
    );
    expect(oneDay.isRange).toBe(false);

    // ...and the other direction: one LOCAL day in California, two printed days.
    const twoDays = resolveHarvestDates(
      [
        { production_type: 'HA', date: '2025-09-12T20:00:00+00:00' },
        { production_type: 'HA', date: '2025-09-13T02:00:00+00:00' },
      ],
      null
    );
    expect(twoDays.isRange).toBe(true);
  });

  it('hides a season close that prints as the same day as the last pick', () => {
    // Same printed day (Sep 29), different local days in California: the close row adds nothing.
    const dates = resolveProductionDisplayDates(
      [{ production_type: 'HA', date: '2025-09-29T06:00:00+00:00' }],
      '2025-09-29T23:00:00+00:00'
    );
    expect(dates.seasonClosedDate).toBeUndefined();

    // Same local day in California, different printed days: the close is a separate fact.
    const shown = resolveProductionDisplayDates(
      [{ production_type: 'HA', date: '2025-09-29T20:00:00+00:00' }],
      '2025-09-30T02:00:00+00:00'
    );
    expect(shown.seasonClosedDate).toBe('2025-09-30T02:00:00+00:00');
  });

  it('ignores an unparseable date rather than sorting it to the front', () => {
    const result = resolveHarvestDates(
      [
        { production_type: 'HA', date: 'not-a-date' },
        { production_type: 'HA', date: '2025-09-19T07:00:00+00:00' },
      ],
      null
    );
    expect(result.first).toContain('2025-09-19');
    expect(result.last).toContain('2025-09-19');
    expect(result.isRange).toBe(false);
  });
});
