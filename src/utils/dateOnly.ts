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
export function formatDateOnly(
  dateStr?: string | null,
  locale: string = 'en-US'
): string | null {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}
