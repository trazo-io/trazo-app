/**
 * Display helpers for the consumer QR page (Phase 1 claim-safety work).
 * Kept dependency-free so unit tests don't have to load component trees.
 */

/**
 * Worker privacy mask for the public QR page. "Ana Torres" → "Farm team (A.T.)".
 * Full names stay visible in the producer app; only the consumer surface masks.
 */
export const maskPerformerName = (name: string): string => {
  const trimmed = name.trim();
  // Idempotency: the backend (PublicHistorySerializer._public_performer) now
  // masks server-side; re-masking "Farm team (A.T.)" would garble the
  // initials to "(F.T.)".
  if (/^farm team\b/i.test(trimmed)) return trimmed;
  const initials = trimmed
    .split(/\s+/)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('.');
  return initials ? `Farm team (${initials}.)` : 'Farm team';
};

/**
 * Format a harvest date for consumer display ("Mar 18, 2026").
 *
 * Date-only strings ("2026-03-18") are parsed as LOCAL dates. `new Date()`
 * parses them as UTC midnight, which renders as the previous day in any
 * timezone west of UTC — a real off-by-one on harvest dates.
 * Returns null for missing/invalid input (callers hide the date rather
 * than show a placeholder).
 */
export const formatHarvestDate = (dateStr?: string | null): string | null => {
  if (!dateStr) return null;
  let d: Date;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (dateOnly) {
    d = new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  } else {
    d = new Date(dateStr);
  }
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * US-first unit display for consumer field values: "20 ha" → "49 acres (20 ha)",
 * "30 cm" → "12 in (30 cm)". US shoppers have no reference frame for metric
 * field units; the metric original stays in parentheses for accuracy.
 * Leaves values without a recognized metric unit untouched.
 */
export const withUSUnits = (value: unknown): string => {
  const str = String(value ?? '');
  const match = /^(\d+(?:[.,]\d+)?)\s*(ha|hectares?|cm|km|m)\b(.*)$/i.exec(str.trim());
  if (!match) return str;
  const num = parseFloat(match[1].replace(',', '.'));
  if (Number.isNaN(num)) return str;
  const unit = match[2].toLowerCase();
  const rest = match[3] || '';
  const round = (v: number) => (v >= 10 ? Math.round(v) : Math.round(v * 10) / 10);
  if (unit === 'ha' || unit.startsWith('hectare')) {
    return `${round(num * 2.47105).toLocaleString()} acres (${str.trim()})${rest ? '' : ''}`;
  }
  if (unit === 'cm') {
    return `${round(num / 2.54)} in (${str.trim()})`;
  }
  if (unit === 'km') {
    return `${round(num * 0.621371)} mi (${str.trim()})`;
  }
  if (unit === 'm') {
    return `${round(num * 3.28084)} ft (${str.trim()})`;
  }
  return str;
};

/**
 * "560,000 kg" reads like a database row. Roll large kg quantities up to
 * tonnes for the consumer card; leave other units untouched.
 */
export const formatHarvestQuantity = (
  amount: number,
  unit?: string
): { value: string; unit: string } => {
  const normalizedUnit = (unit || 'kg').toLowerCase();
  if ((normalizedUnit === 'kg' || normalizedUnit === 'kgs') && amount >= 10000) {
    const tonnes = amount / 1000;
    const rounded = tonnes >= 100 ? Math.round(tonnes) : Math.round(tonnes * 10) / 10;
    return { value: rounded.toLocaleString(), unit: 'tonnes' };
  }
  return { value: amount.toLocaleString(), unit: unit || 'kg' };
};
