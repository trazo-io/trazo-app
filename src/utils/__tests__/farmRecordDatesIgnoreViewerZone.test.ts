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

const ZONES = ['America/Montevideo', 'America/Los_Angeles', 'Asia/Tokyo'];

describe('the same farm record reads the same in every viewer zone', () => {
  it.each(ZONES)('%s', (zone) => {
    const before = process.env.TZ;
    process.env.TZ = zone;
    try {
      // Anti-vacuity: the zone change took effect (Tokyo is ahead of UTC, the Americas behind).
      expect(new Date('2026-10-05T23:34:00Z').getTimezoneOffset()).not.toBe(0);
      expect(formatWallClockTime('2026-10-05T23:34:00Z', 'en-US')).toBe('11:34 PM');
      expect(formatDateFromTimestamp('2026-10-05T23:34:00Z', 'en-US')).toBe('Oct 5, 2026');
      expect(formatDateFromTimestamp('2026-10-05T00:00:00Z', 'en-US')).toBe('Oct 5, 2026');
    } finally {
      process.env.TZ = before;
    }
  });
});

describe('no farm-record renderer uses the viewer zone', () => {
  // A stored record date (event date, range, production start/finish, harvest, sale) rendered
  // through the viewer's zone. Scans, reviews and logins are real instants and are not matched:
  // their fields are not in this list.
  const VIEWER_ZONE =
    /new Date\([^)]*(\.date|date_start|date_end|start_date|finish_date|harvest_date|sale_date)\b[^)]*\)\.toLocale(Date|Time)?String\(/;

  it('the pattern catches the shape it exists for (anti-vacuity)', () => {
    expect(VIEWER_ZONE.test('{new Date(currentHistory?.start_date).toLocaleDateString()}')).toBe(true);
    expect(VIEWER_ZONE.test("new Date(event.date).toLocaleTimeString([], {")).toBe(true);
  });

  it('finds none in src', () => {
    const files = execSync('git ls-files src', { encoding: 'utf8' })
      .split('\n')
      .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !f.includes('__tests__'));
    expect(files.length).toBeGreaterThan(500);
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (VIEWER_ZONE.test(line) && !line.includes('timeZone')) hits.push(`${f}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
