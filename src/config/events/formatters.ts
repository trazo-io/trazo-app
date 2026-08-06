/**
 * Reusable field value formatters.
 *
 * Each formatter receives the raw value + full event (for cross-field lookups)
 * and returns a display string. Used by FieldConfig.formatter and by the
 * registry resolver's default rendering.
 *
 * Design principle: keep formatters pure (no side effects, no i18n calls
 * except through the optional `intl` argument). This makes them trivially
 * testable and safe to use in SSR.
 */

import type { FieldFormatter } from './registry';

// ============================================================================
// Enum fallback
// ============================================================================

/**
 * What to show when a value is NOT in its label map.
 *
 * Every enum map in this registry ends `?? v` / `|| v`, which returns the RAW database
 * value. The forms write values the maps do not always cover, so real consumer cards
 * rendered `quality_control` and the bare subtype code `LA` — a database row shown to a
 * shopper. Found 2026-08-01 while auditing the full consumer_card matrix.
 *
 * Rules:
 *  - `snake_case` → Title Case ("quality_control" → "Quality Control").
 *  - A short ALL-CAPS code ("LA", "CE") carries no meaning outside the database, so it is
 *    DROPPED (null) rather than shown. Losing one row beats printing an internal code —
 *    and null is how every formatter here already says "render nothing".
 *  - Anything else is returned unchanged (free text the farmer typed).
 *
 * Use via `lookupEnumLabel`, or directly as the fallback in a map lookup.
 */
export function humanizeEnumFallback(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw) return null;

  // Internal short code (LA, CE, MN, FC…) — meaningless to a reader.
  if (/^[A-Z]{2,4}$/.test(raw)) return null;

  if (raw.includes('_')) {
    return raw
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  // Single lowercase word ("manual", "banded") reads as a slug next to Title Case labels.
  if (raw === raw.toLowerCase() && raw.length < 40) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  return raw;
}

/** Map lookup with a safe, human fallback. Prefer this over `MAP[v] ?? v`. */
export function lookupEnumLabel(table: Record<string, string>, value: unknown): string | null {
  if (typeof value !== 'string' || value === '') return null;
  return table[value] ?? humanizeEnumFallback(value);
}

// ============================================================================
// Primitive formatters
// ============================================================================

/**
 * Format a number with optional decimal places, honoring i18n if provided.
 */
export const formatNumber: FieldFormatter<number> = (value, _event, intl) => {
  if (value == null || Number.isNaN(value)) return null;
  if (intl) {
    return intl.formatNumber(value, { maximumFractionDigits: 2 });
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

/**
 * Format a percentage (0-100 range, not 0-1).
 */
export const formatPercentage: FieldFormatter<number> = (value) => {
  if (value == null || Number.isNaN(value)) return null;
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
};

/**
 * Format a boolean as ✓ / ✗.
 */
export const formatBoolean: FieldFormatter<boolean | string> = (value) => {
  if (value == null) return null;
  // Handle string values from forms ('false', 'true', 'no', 'yes')
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'false' || lower === 'no' || lower === '0' || lower === '') return '✗';
    if (lower === 'true' || lower === 'yes' || lower === '1') return '✓';
  }
  return value ? '✓' : '✗';
};

/**
 * Format a date (YYYY-MM-DD or ISO timestamp) as localized date string.
 *
 * Timezone safety: `new Date("2026-03-06")` parses as UTC midnight, which in
 * negative-offset locales (e.g. UTC-5) renders as the previous calendar day.
 * We detect bare YYYY-MM-DD inputs and parse them in local time to keep the
 * displayed day matching what the user typed on the form.
 */
/**
 * Bare `toLocaleDateString()` rendered "2/26/2026" — ambiguous (2 Feb or 26 Feb depends on
 * where the reader is from) and inconsistent with the card header, which uses
 * `formatHarvestDate` ("Feb 26, 2026"). A month NAME removes the ambiguity in every locale
 * and matches the header: en-US "Feb 26, 2026", es-419 "26 feb 2026".
 * Locale stays `undefined` so it follows the runtime locale, as before.
 */
const DATE_DISPLAY_OPTS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric'
};

export const formatDate: FieldFormatter<string> = (value) => {
  if (!value) return null;
  try {
    const str = String(value).trim();
    // Accept padded (2026-03-06) and unpadded (2026-3-6) YYYY-M-D forms.
    const bareDateMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (bareDateMatch) {
      const [, y, m, d] = bareDateMatch;
      const local = new Date(Number(y), Number(m) - 1, Number(d));
      if (Number.isNaN(local.getTime())) return str;
      return local.toLocaleDateString(undefined, DATE_DISPLAY_OPTS);
    }
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str;
    return parsed.toLocaleDateString(undefined, DATE_DISPLAY_OPTS);
  } catch {
    return String(value);
  }
};

// ============================================================================
// Unit-paired formatters (value + companion unit field)
// ============================================================================

/**
 * Factory for unit-paired formatters. Reads a numeric value and pairs it
 * with a companion unit field from the same event (e.g., volume_numeric + volume_unit).
 *
 * @param unitFieldName The companion field carrying the unit string
 * @param options.skipNonPositive When true, returns null for values <= 0
 *   (useful for fields where "0" is not a meaningful display, e.g. area_covered
 *   on facility-based production subtypes like EM/PO/PH).
 */
export function makeUnitPairFormatter(
  unitFieldName: string,
  options: { skipNonPositive?: boolean } = {}
): FieldFormatter<number | string> {
  return (value, event) => {
    if (value == null || value === '') return null;
    const numeric = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(numeric)) return null;
    if (options.skipNonPositive && numeric <= 0) return null;
    const unit = event[unitFieldName];
    const unitStr = typeof unit === 'string' ? unit : '';
    const formatted = numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return unitStr ? `${formatted} ${unitStr}` : formatted;
  };
}

/**
 * Format an NPK trio (nitrogen_percentage, phosphorus_percentage, potassium_percentage)
 * as "10-10-10" style string. Use with groupWith: ['phosphorus_percentage', 'potassium_percentage'].
 *
 * Falls back to parsing the concentration field (e.g. "2-3-1") when individual
 * NPK percentage fields are not available — the form sends concentration as a
 * single string and the backend does not auto-populate individual NPK columns.
 */
export const formatNPK: FieldFormatter<number | null, Record<string, unknown>> = (
  _value,
  event
) => {
  const n = event.nitrogen_percentage ?? event.nitrogen_total_kg;
  const p = event.phosphorus_percentage ?? event.phosphorus_total_kg;
  const k = event.potassium_percentage ?? event.potassium_total_kg;

  const fmt = (v: unknown): string => {
    if (v == null || v === '') return '0';
    const num = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : 0;
    return Number.isNaN(num) ? '0' : num.toString();
  };

  // Check if we have meaningful individual NPK values (not empty/null/zero)
  const hasNPK = [n, p, k].some(
    (v) => v != null && v !== '' && v !== 0 && v !== '0' && !Number.isNaN(Number(v))
  );

  if (hasNPK) {
    return `${fmt(n)}-${fmt(p)}-${fmt(k)}`;
  }

  // Fallback: parse concentration string (e.g. "2-3-1", "10-10-10")
  const conc = event.concentration;
  if (typeof conc === 'string' && conc.trim()) {
    const match = conc
      .trim()
      .match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  // No meaningful NPK data available
  return null;
};

/**
 * Format temperature, reading a companion `temperature_unit` field ("C" | "F") from the event.
 *
 * Two fixes here (2026-08-02):
 *
 * 1. It used to DEFAULT to Celsius when the unit was unset, so a Fahrenheit value rendered as
 *    "111°C" — 232°F — on a card whose own title read "Heat wave - 5 days over 105 F". A
 *    physically impossible number does more damage than a missing one: once a shopper sees it,
 *    every other figure on the page is suspect. When the unit is absent we now INFER from
 *    magnitude instead of asserting: the highest air temperature ever recorded on Earth is
 *    56.7 °C, so an agricultural air temperature above 60 is Fahrenheit, and one below is
 *    Celsius. Wrong only for readings no farm will ever log.
 *
 * 2. It showed a single scale. A US shopper reading "44°C" learns nothing, and a metric reader
 *    learns nothing from "111°F", so both are given with the reader's own first.
 */
const HOTTEST_PLAUSIBLE_CELSIUS = 60;

export const formatTemperature: FieldFormatter<number | string, Record<string, unknown>> = (
  value,
  event,
  intl
) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;

  const rawUnit = event && typeof event.temperature_unit === 'string' ? event.temperature_unit : '';
  const declared = rawUnit.toUpperCase();
  const isFahrenheit =
    declared === 'F' ? true : declared === 'C' ? false : num > HOTTEST_PLAUSIBLE_CELSIUS;

  const round = (v: number) => Math.round(v);
  const f = isFahrenheit ? num : num * 1.8 + 32;
  const c = isFahrenheit ? (num - 32) / 1.8 : num;

  const prefersMetric = Boolean(intl?.locale && !intl.locale.toLowerCase().startsWith('en'));
  return prefersMetric ? `${round(c)}°C (${round(f)}°F)` : `${round(f)}°F (${round(c)}°C)`;
};

/**
 * Format duration in hours.
 */
export const formatDurationHours: FieldFormatter<number | string> = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  if (num === 1) return '1 hour';
  return `${num} hours`;
};

/**
 * Format duration in days.
 */
export const formatDurationDays: FieldFormatter<number | string> = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  if (num === 1) return '1 day';
  return `${num} days`;
};

// ============================================================================
// Enum formatter factory
// ============================================================================

/**
 * Factory for enum value formatters. Maps the raw enum value to its
 * human-readable label from the enum options catalog.
 *
 * Use with enumSource in FieldConfig. The labelKey is returned as-is;
 * callers pass it through intl.formatMessage in the rendering layer.
 *
 * @param valueToLabel Map from enum value to i18n label key
 */
export function makeEnumFormatter(
  valueToLabel: Readonly<Record<string, string>>
): FieldFormatter<string> {
  return (value, _event, intl) => {
    if (!value) return null;
    const labelKey = valueToLabel[value];
    if (!labelKey) return value; // fallback to raw value if key missing
    if (intl) {
      return intl.formatMessage({ id: labelKey, defaultMessage: value });
    }
    return labelKey;
  };
}

// ============================================================================
// Carbon-specific formatters (FTC-aware, consumer-safe labels)
// ============================================================================

/**
 * Format a CO2e value. On consumer surfaces, the surface rules enforce
 * that carbon_relevant fields cannot appear at hero tier — this formatter
 * focuses only on correct formatting, not placement.
 */
export const formatCO2e: FieldFormatter<number> = (value) => {
  if (value == null || Number.isNaN(value)) return null;
  const formatted = value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `${formatted} kg CO₂e`;
};

/**
 * Format fuel consumption (liters or gallons) based on unit field.
 */
export const formatFuelConsumption = makeUnitPairFormatter('fuel_unit');

/**
 * Format area (ha or acres) based on area_unit field.
 * Skips non-positive values — facility-based production subtypes (EM, PO, PH)
 * legitimately have no field area, and "0 acres" is never a meaningful display.
 */
export const formatArea = makeUnitPairFormatter('area_unit', { skipNonPositive: true });

/**
 * Format volume based on volume_unit field.
 */
export const formatVolume = makeUnitPairFormatter('volume_unit');

/**
 * Format yield with yield_unit field.
 */
export const formatYield = makeUnitPairFormatter('yield_unit');

/**
 * Format transportation distance with transportation_unit field.
 */
export const formatTransportationDistance = makeUnitPairFormatter('transportation_unit');

/**
 * Format irrigation depth with irrigation_depth_unit field.
 */
export const formatIrrigationDepth = makeUnitPairFormatter('irrigation_depth_unit');

// ============================================================================
// Default value formatter (fallback when no custom formatter specified)
// ============================================================================

/**
 * Default formatter — applied to any field without a custom formatter.
 * Handles string/number/boolean/date generically.
 */
export const defaultFormatter: FieldFormatter = (value) => {
  if (value == null || value === '') return null;
  if (typeof value === 'boolean') return value ? '✓' : '✗';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  if (value instanceof Date) return value.toLocaleDateString();
  return String(value);
};

/**
 * Drop a trailing scientific binomial from a pest or disease name, for consumer surfaces only.
 *
 * WHY (2026-08-02): live cards read "Citrus leafminer (Phyllocnistis citrella)" and "Persea
 * mite (Oligonychus perseae), Avocado thrips (Scirtothrips perseae)" under a label that says
 * "What it protects against". A shopper gains nothing from the Latin, and it makes an otherwise
 * plain sentence look like a lab report. The certifier PDF keeps the full string — that reader
 * does want it.
 *
 * This OMITS, it does not rewrite: the grower's own common name is what survives. The pattern
 * is deliberately narrow — exactly "(Genus species)", capitalised genus, lowercase species — so
 * a parenthetical the farmer wrote for a human ("(root rot)", "(2nd flight)") is left alone. A
 * value that is only Latin ("Phytophthora cinnamomi root rot") has no common name to fall back
 * to and is also left alone.
 */
const BINOMIAL_PARENTHETICAL = /\s*\(\s*[A-Z][a-z]+\s+[a-z][a-z-]+\s*\)/g;

export const stripScientificName = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const stripped = value.replace(BINOMIAL_PARENTHETICAL, '').replace(/\s+,/g, ',').trim();
  // Never return less than a usable name: if removing the Latin empties the value, keep the
  // original.
  return stripped.length >= 3 ? stripped : value;
};

export const formatConsumerPestName: FieldFormatter<string> = (value) => stripScientificName(value);

/**
 * "Action Threshold Met: ✗" told a shopper nothing, and what it encodes is good news: pest
 * counts stayed under the level that would justify treating. Say that.
 */
export const formatConsumerActionThreshold: FieldFormatter<boolean | string> = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const met = value === true || value === 'true' || value === 'Yes' || value === 'yes';
  return met
    ? 'Yes, counts reached the level that calls for treatment'
    : 'No, counts stayed below the level that calls for treatment';
};

/**
 * A contamination incident must never render to a shopper as a bare "✓".
 *
 * WHY (2026-08-02 sweep): `is_contamination_incident` is gated to display only when TRUE, so
 * the consumer card was showing "Is Contamination Incident: ✓" — a checkmark, which reads as
 * approval, against the one fact on the page where that is exactly backwards.
 *
 * The answer is plain words, not removal. An incident the grower recorded is what a
 * transparency record is for; the source, affected area and corrective action render beside it.
 */
export const formatConsumerContaminationIncident: FieldFormatter<boolean | string> = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const yes = value === true || value === 'true' || value === 'Yes' || value === 'yes';
  return yes ? 'Yes, recorded by the farm with the follow-up below' : null;
};

/**
 * Cold chain, said plainly. "Temperature Control: ✓" meant nothing to a shopper; keeping fruit
 * cool after picking is one of the few post-harvest facts they can act on.
 */
export const formatConsumerTemperatureControl: FieldFormatter<boolean | string> = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const yes = value === true || value === 'true' || value === 'Yes' || value === 'yes';
  return yes ? 'Yes, kept cool after picking' : 'Not recorded as temperature-controlled';
};
