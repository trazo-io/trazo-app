/**
 * Run 8 (R8-05, Astra 2026-10-05): a production dated 5 October showed 4 October on the parcel
 * card, and events saved at 23:34 showed 20:34 on their cards while the edit form kept 23:34.
 * The rule (header of utils/dateOnly.ts, ADR 011): calendar dates render as stored, and event
 * timestamps are the farm's wall clock, rendered as stored. No viewer zone moves either.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { formatDateFromTimestamp, formatWallClockTime } from '../dateOnly';

/** ICU 72+ puts U+202F before AM/PM; compare text, not code points (review of app #81). */
const norm = (s: string | null) => (s ?? '').replace(/[  ]/g, ' ');

// Review of app #81: reassigning process.env.TZ inside a running vitest worker does not move
// the zone (vitest.config pins one at start), so the zones are exercised explicitly: the helper
// must give the stored value, and the same instant rendered in each viewer zone must DIFFER from
// it, which proves each zone would have exposed a viewer-zone renderer.
const STORED = '2026-10-05T23:34:00Z';
const MIDNIGHT = '2026-10-05T00:00:00Z';
const ZONES = ['America/Montevideo', 'America/Los_Angeles', 'Asia/Tokyo'];

describe('the same farm record reads the same in every viewer zone', () => {
  it('renders the stored wall clock and the stored calendar date', () => {
    expect(norm(formatWallClockTime(STORED, 'en-US'))).toBe('11:34 PM');
    expect(formatDateFromTimestamp(STORED, 'en-US')).toBe('Oct 5, 2026');
    expect(formatDateFromTimestamp(MIDNIGHT, 'en-US')).toBe('Oct 5, 2026');
  });

  it.each(ZONES)('%s would have shown something else through the viewer zone', (zone) => {
    const viewerTime = norm(
      new Date(STORED).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: zone })
    );
    const viewerDates = [STORED, MIDNIGHT].map((v) =>
      new Date(v).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: zone })
    );
    // At least one of the time or the dates moves in every zone: Montevideo and Los Angeles
    // move the time and the midnight date; Tokyo moves the time and the 23:34 date.
    expect(viewerTime).not.toBe('11:34 PM');
    expect(viewerDates.some((d) => d !== 'Oct 5, 2026')).toBe(true);
  });
});

describe('no farm-record renderer uses the viewer zone', () => {
  // A stored record date (event date, range, production start/finish, harvest, sale) rendered
  // through the viewer's zone. Scans, reviews and logins are real instants and are not matched:
  // their fields are not in this list. Matched across lines: `[^)]*` spans newlines, which is how
  // the wrapped form in EventDetailsModal hid from a per-line scan (review of app #81).
  const VIEWER_ZONE =
    /new Date\(\s*[^)]*?(\.date|date_start|date_end|start_date|finish_date|harvest_date|sale_date)\b[^)]*\)\s*\.toLocale(Date|Time)?String\(([^)]*)\)/g;

  // date-fns `format` always renders in the viewer's zone. Record date fields only: bare
  // `.date` there is a scan or review instant on the pages that use it.
  const DATE_FNS =
    /\bformat\(\s*new Date\(\s*[^)]*?(date_start|date_end|start_date|finish_date|harvest_date|sale_date)\b[^)]*\)/g;

  const offences = (source: string) => [
    ...[...source.matchAll(VIEWER_ZONE)].filter((m) => !/timeZone/.test(m[0])),
    ...source.matchAll(DATE_FNS)
  ];

  it('the pattern catches the shapes it exists for, wrapped or not (anti-vacuity)', () => {
    expect(offences('{new Date(currentHistory?.start_date).toLocaleDateString()}')).toHaveLength(1);
    expect(offences('new Date(\n  event.extra_data.date_end\n).toLocaleDateString()}')).toHaveLength(1);
    expect(
      offences("new Date(event.date).toLocaleDateString('en-US', {\n  timeZone: 'UTC'\n})")
    ).toHaveLength(0);
    expect(offences("format(new Date(production.start_date), 'MMMM dd, yyyy')")).toHaveLength(1);
    expect(offences("format(new Date(review.date), 'MMM dd, yyyy')")).toHaveLength(0);
  });

  it('finds none in src', () => {
    const files = execSync('git ls-files src', { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('__tests__'));
    expect(files.length).toBeGreaterThan(500);
    const hits: string[] = [];
    for (const f of files) {
      const source = readFileSync(f, 'utf8');
      for (const m of offences(source)) {
        hits.push(`${f}:${source.slice(0, m.index).split('\n').length}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
