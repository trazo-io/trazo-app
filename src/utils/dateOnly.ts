/**
 * Rendering for backend DATE columns (`YYYY-MM-DD`, no time, no zone).
 *
 * `new Date('2026-07-28')` parses a date-only string as UTC midnight. Rendered
 * through `toLocaleDateString` in any timezone west of UTC that becomes the
 * PREVIOUS day. On 2026-08-04 a § 205.400(f) change notification entered as
 * 2026-07-28 displayed as "Jul 27, 2026" — the date a certifier was notified,
 * off by one, on the record an inspector reads. § 205.400(f)(1) prohibited-
 * substance notifications carry an immediacy requirement, so a one-day shift
 * is not cosmetic.
 *
 * Parse the parts explicitly and build a LOCAL date instead. Same fix already
 * lives in `formatHarvestDate` (consumerDisplay.ts) for consumer surfaces;
 * this is the producer/compliance-side home for it.
 */

/** Parse a `YYYY-MM-DD` string into a local-midnight Date. Returns null for
 *  missing or unparseable input — callers hide the field rather than render a
 *  placeholder that could be mistaken for real data. */
export function parseDateOnly(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).trim());
  const d = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(dateStr);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Today as `YYYY-MM-DD` in the VIEWER's timezone.
 *
 *  `new Date().toISOString().slice(0, 10)` is the UTC date, which is a
 *  different day from the farmer's for part of every day: east of UTC before
 *  ~09:00, west of UTC after ~17:00. It stamped § 205.201(a) sections with
 *  tomorrow's date for a UTC-3 grower working in the evening. */
export function todayLocalISODate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Format a backend DATE for display ("Jul 28, 2026"), timezone-safe. */
export function formatDateOnly(dateStr?: string | null, locale: string = 'en-US'): string | null {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Format a backend DATETIME column that semantically holds a DATE.
 *
 * `History.start_date` / `finish_date` are `DateTimeField`s with `USE_TZ`, so they arrive as
 * `2026-01-01T00:00:00Z`. Rendering that with `toLocaleDateString()` uses the VIEWER's zone, so
 * every US farmer saw a production starting 2026-01-01 labelled **"Dec 31, 25"** — a season
 * apparently beginning in the previous year. The same value reaches the consumer parcel modal and
 * the transparency dashboard.
 *
 * These are dates, not instants: nobody records a planting to the hour. So render the UTC
 * calendar date the grower actually entered, rather than translating an instant into local time.
 *
 * This is the datetime-column sibling of `formatDateOnly` above — same defect, different column
 * type, which is why `parseDateOnly` alone does not fix it (an ISO datetime falls through its
 * `YYYY-MM-DD` pattern to `new Date(...)` and shifts exactly as before).
 */
export function formatDateFromTimestamp(
  value?: string | null,
  locale: string = 'en-US',
  options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
}

/** Is this `datetime-local` value still sitting on TODAY, i.e. untouched by the operator?
 *
 *  Compares the DATE part only. An exact `value === nowLocalDateTimeInput()` test drifts the
 *  moment the clock ticks past the minute the form was opened, so it answers "no" for a field
 *  nobody touched. NewEvent.jsx carries that exact-equality idiom in its step-restoration
 *  effect; this is the same question asked in a way that survives a slow reader.
 *
 *  Used to tell an operator-supplied day from the wizard's default. A record whose date the
 *  operator chose and a record that merely inherited today are different facts, and on a
 *  note-sourced create they must be treated differently: a pasted note describes work already
 *  done, so today is a guess (7 CFR 205.103(b)(2), and CA PUR files strictly on event.date). */
export function isTodayLocalDateTimeInput(value?: string | null): boolean {
  if (!value) return false;
  return value.slice(0, 10) === todayLocalISODate();
}

/** Now as `YYYY-MM-DDTHH:mm` in the VIEWER's timezone, for seeding a `datetime-local` input.
 *
 *  `new Date().toISOString().slice(0, 16)` is the UTC wall clock, but a `datetime-local` input
 *  is interpreted by the browser as LOCAL wall clock — so seeding one with the other pre-fills
 *  the wrong time, and past the offset, the wrong DAY. A UTC-3 grower logging at 22:00 on
 *  14 March was handed "15 March, 01:00": tomorrow, for work done tonight. That date is then
 *  stored as the activity date on a § 205.103 record.
 *
 *  Sibling of `todayLocalISODate`, which fixed the same defect for date-only inputs. */
export function nowLocalDateTimeInput(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `T${pad(now.getHours())}:${pad(now.getMinutes())}`
  );
}
