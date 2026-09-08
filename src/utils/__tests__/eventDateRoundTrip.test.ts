/**
 * Date behaviour on the event path: what must NOT change, and what was wrong.
 *
 * ⚠️ THE FIRST BLOCK IS A PIN, NOT A FIX. The plan for this slice asserted that the edit path
 * "re-dates records" because `NewEvent.jsx` seeds its `datetime-local` input with
 * `new Date(existingEvent.date).toISOString().slice(0, 16)`. Measured across three zones, that
 * is FALSE and the round trip is stable — because Trazo stores a datetime as the grower's WALL
 * CLOCK labelled UTC (see the `datetime-wall-clock-utc` convention), so the UTC wall clock IS
 * what the farmer typed and IS what the input should show.
 *
 * `nowLocalDateTimeInput()`'s docstring warns against `toISOString().slice(0, 16)` for seeding
 * "now" on a CREATE, which is a different case and already fixed. Applying that warning to the
 * READ path would introduce exactly the offset shift it describes. These tests exist so the
 * next person to read that docstring — including the author of this file, who nearly did it —
 * cannot make that change silently.
 */
import { describe, expect, it } from 'vitest';
import { formatEventDate } from '../eventDescriptions';

/** What `NewEvent.jsx` puts in the datetime-local input when opening an event for editing. */
const editInputValue = (storedIso: string) => new Date(storedIso).toISOString().slice(0, 16);

/** What DRF stores when that naive value is submitted: the same wall clock, labelled UTC. */
const resaved = (inputValue: string) => `${inputValue}:00.000Z`;

describe('the edit round trip is stable and must stay that way', () => {
  const stored = '2026-06-20T14:30:00.000Z';

  it('shows the wall clock the grower typed', () => {
    expect(editInputValue(stored)).toBe('2026-06-20T14:30');
  });

  it('saving without changing anything does not move the instant', () => {
    expect(new Date(resaved(editInputValue(stored))).getTime()).toBe(new Date(stored).getTime());
  });

  it('deliberately changing the time stores exactly the new wall clock', () => {
    // The farmer edits 14:30 to 07:05; nothing else may shift.
    const edited = '2026-06-20T07:05';
    expect(new Date(resaved(edited)).toISOString()).toBe('2026-06-20T07:05:00.000Z');
  });

  it('does not shift the calendar day at a midnight boundary', () => {
    const midnight = '2026-06-20T00:00:00.000Z';
    expect(editInputValue(midnight)).toBe('2026-06-20T00:00');
    expect(new Date(resaved(editInputValue(midnight))).toISOString()).toBe(midnight);
  });

  it('drops seconds, which is the input type and not a timezone defect', () => {
    // `datetime-local` without `step` has minute precision. Recorded so a lost `:45` is not
    // mistaken later for an offset bug and "fixed" by changing zones.
    expect(editInputValue('2026-06-20T14:30:45.000Z')).toBe('2026-06-20T14:30');
  });
});

describe('formatEventDate', () => {
  it('never calls a future date "ago"', () => {
    // Trazo accepts future dates: a planned application, or a post-harvest record dated after
    // the season closed. `Math.abs` on the difference made those read as past.
    const future = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const rendered = formatEventDate(future);
    expect(rendered).not.toMatch(/ago/i);
    expect(rendered).not.toBe('Yesterday');
  });

  it('still describes a recent past date relatively', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    expect(formatEventDate(threeDaysAgo)).toBe('3 days ago');
  });

  it('renders an old date on the UTC calendar day, matching the packet', () => {
    // A stored UTC wall clock must not be renamed to the previous day by the viewer's zone.
    expect(formatEventDate('2020-03-15T00:30:00.000Z')).toBe('Mar 15, 2020');
  });

  it('returns the input unchanged when it is not a date', () => {
    expect(formatEventDate('not a date')).toBe('not a date');
  });
});
