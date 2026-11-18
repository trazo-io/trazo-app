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

/**
 * One reading of a boolean-ish flag, for every surface that gates on the same one.
 *
 * WHY (2026-08-31): a flag reaches this registry as a real boolean from the API, but as a
 * STRING from form and `extra_data` paths — live rows carry `"is_summary": "false"`. The two
 * obvious spellings are both wrong in opposite directions: `Boolean(v)` treats the string
 * `'false'` as TRUE, and `v === true` misses the string `'true'`. On the contamination
 * disclosure that divergence is not cosmetic — the registry's `visibleWhen` and the consumer
 * copy in eventDescriptions.ts gate on the SAME flag, so a value either of them read
 * differently would render the incident rows under the reassuring activity copy the incident
 * wording exists to replace.
 */
export const isAffirmativeFlag = (value: unknown): boolean =>
  value === true || value === 1 || value === 'true' || value === 'yes' || value === 'Yes';

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

/**
 * A timestamp that keeps its TIME.
 *
 * `formatDate` calls `toLocaleDateString`, which silently drops the clock. That is right for a
 * purchase date or a review date, and wrong for the two fields that exist to bound a window:
 * an application recorded 06:15 -> 09:20 printed as "Mar 18, 2026" twice, so the certifier
 * modal showed a start and an end that looked identical and said nothing about duration.
 *
 * Falls back to the date alone when the value carries no time component, so a bare
 * "2026-03-18" is not dressed up with a fake midnight.
 *
 * Rendered in UTC, deliberately. These timestamps come from `datetime-local` inputs, which
 * carry NO offset, and the API stores that wall clock verbatim as UTC. Formatting it in the
 * reader's zone therefore shifts it by their offset and shows a time nobody entered: an
 * application typed as 06:15 read back "3:15 AM" on a UTC-3 machine the moment these fields
 * started showing their time at all. Same principle `formatDate` already applies to bare dates
 * — display the wall clock the grower typed.
 *
 * ⚠️ DO NOT "fix" this by sending an offset on the write path alone. Investigated 2026-08-31:
 * the wall-clock-as-UTC convention is system-wide and coherent, not an accident here.
 * `TIME_ZONE = "UTC"` with `USE_TZ = True`, so DRF makes an offset-less value aware AS UTC;
 * `cogpro_import._as_event_datetime` and `pur_export_service` both already depend on it (the
 * CA PUR filing prints boxes 17/18 as the grower typed them, which is what DPR wants). These
 * two columns have exactly two consumers — this display and that filing. Nothing computes an
 * interval from them: § 205.203(c)'s safe-harvest date works off `manure_application_date`, a
 * DateField, and REI/PHI are stored durations, not differences between timestamps.
 *
 * Adding an offset on write WITHOUT converting on every read shifts the whole system by that
 * offset: a 14:30 application starts printing 21:30 in the certifier packet and the PUR
 * export. The real fix is a per-establishment timezone (no such column exists) plus a
 * migration for stored rows plus farm-local rendering everywhere — a project, and one that
 * silently rewrites compliance records if done by halves. Leaving it alone is the correct
 * call until that is worth doing; a reader in another zone seeing the farm's local wall clock
 * is the honest reading of an offset-less value.
 */
export const formatDateTime: FieldFormatter<string> = (value) => {
  if (!value) return null;
  const str = String(value).trim();
  // No time component recorded — defer to the date formatter rather than inventing 00:00.
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return formatDate(str, {});
  try {
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str;
    const date = parsed.toLocaleDateString(undefined, { ...DATE_DISPLAY_OPTS, timeZone: 'UTC' });
    const time = parsed.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC'
    });
    return `${date}, ${time}`;
  } catch {
    return str;
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
/**
 * Stored unit codes that are not how a unit is written. Mirrors VOLUME_UNIT_SYMBOLS in
 * common/field_registry: the packet prints "fl oz", so the record view must not print "fl_oz".
 */
export const UNIT_CODE_SYMBOLS: Record<string, string> = {
  fl_oz: 'fl oz',
  oz_wt: 'oz wt'
};

/** A stored plural unit code -> its singular, for a quantity of exactly one. */
const SINGULAR_UNIT: Record<string, string> = {
  acres: 'acre',
  hectares: 'hectare',
  gallons: 'gallon',
  liters: 'liter',
  pounds: 'pound',
  kilograms: 'kilogram',
  hours: 'hour'
};

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
    const unitStr = typeof unit === 'string' ? UNIT_CODE_SYMBOLS[unit] ?? unit : '';
    const formatted = numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
    // "1 acres" read wrong in both languages (VID-07): one of a stored plural unit is singular.
    const shown = numeric === 1 ? SINGULAR_UNIT[unitStr] ?? unitStr : unitStr;
    return shown ? `${formatted} ${shown}` : formatted;
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
 * Format duration in minutes. A hailstorm's duration is entered in MINUTES (WeatherTab.jsx
 * labels it "Duration (minutes)") while every other weather subtype enters HOURS in the same
 * `duration` key, so the two cannot share one formatter. The en strings are keyed in
 * FIELD_VALUE_ES ("1 minute", and the "minutes" unit suffix) so the es page reads in Spanish.
 */
export const formatDurationMinutes: FieldFormatter<number | string> = (value) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  if (num === 1) return '1 minute';
  return `${num} minutes`;
};

/**
 * Build a formatter for a field whose unit is fixed by its form label (mm, km/h, %). The
 * stored value is a bare number, so without this the card prints "Water Deficit 15" and the
 * reader has to guess the unit. A value that is not a plain number (free text, or text that
 * already names its unit) is passed through untouched rather than dropped or double-suffixed.
 */
export const makeFixedUnitFormatter =
  (unit: string): FieldFormatter<number | string> =>
  (value) => {
    if (value == null || value === '') return null;
    if (typeof value === 'string' && !/^\s*-?\d+(\.\d+)?\s*$/.test(value)) {
      const text = value.trim();
      return text || null;
    }
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (Number.isNaN(num)) return null;
    const grouped = num.toLocaleString(undefined, { maximumFractionDigits: 2 });
    return unit === '%' ? `${grouped}%` : `${grouped} ${unit}`;
  };

export const formatMillimeters = makeFixedUnitFormatter('mm');
export const formatKilometersPerHour = makeFixedUnitFormatter('km/h');
export const formatHumidityPercent = makeFixedUnitFormatter('%');

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
 * NOP 5029 / 7 CFR 205.204(a)(1) commercial-availability search rows.
 *
 * 🔴 2026-08-15: `seed_search_attempts` is a JSON list of
 * `{supplier_name, date_contacted, result, notes}`, but the field was declared
 * `valueType: 'text'` with no formatter — so the resolver fell through to
 * `defaultFormatter`, whose last line is `String(value)`. The producer's own detail modal
 * rendered the grower's § 205.204(a)(1) diligence as, verbatim:
 *
 *     Seed Search Attempts    [object Object],[object Object],[object Object]
 *
 * on the one screen they would open to check the record before an inspection.
 *
 * Summarised rather than tabulated because a modal row is a single line: the supplier names
 * are what identify the search, and the full table (with dates, results and notes) is what
 * the certifier packet prints.
 */
/**
 * Water-test results — a JSONField of `{parameter, value, unit, result}` dicts.
 *
 * Same `[object Object]` hazard as `formatSeedSearchAttempts` above, and the same reason it
 * matters: this is the half of the water test that says whether the water PASSED. Rendered as
 * "parameter: value unit" lines joined with " · " so a modal row stays one line; the certifier
 * packet prints the full table.
 *
 * A row whose `result` reads fail/positive/detected/exceeds is flagged inline, because a
 * grower scanning this before an inspection needs the failure to be the thing they see. The
 * check is substring-based on purpose — labs write "FAIL", "Fail (>126)", "Positive" — and it
 * only ever ADDS a marker, so an unrecognised result still prints its own text verbatim.
 */
export const formatWaterTestResults: FieldFormatter<unknown> = (value) => {
  if (!Array.isArray(value) || value.length === 0) return null;

  const lines = value
    .map((row) => {
      if (!row || typeof row !== 'object') {
        const s = String(row ?? '').trim();
        return s || null;
      }
      const r = row as Record<string, unknown>;
      const parameter = String(r.parameter ?? '').trim();
      const reading = [r.value, r.unit]
        .map((p) => String(p ?? '').trim())
        .filter(Boolean)
        .join(' ');
      const result = String(r.result ?? '').trim();

      const head = [parameter, reading].filter(Boolean).join(': ');
      if (!head && !result) return null;

      const failed = /fail|positive|detect|exceed/i.test(result);
      if (!result) return head;
      return `${head || result}${head ? ` (${result})` : ''}${failed ? ' ⚠' : ''}`;
    })
    .filter((l): l is string => Boolean(l));

  return lines.length ? lines.join(' · ') : null;
};

export const formatSeedSearchAttempts: FieldFormatter<unknown> = (value) => {
  if (!Array.isArray(value) || value.length === 0) return null;

  const suppliers = value
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      // `supplier` is the pre-2026-08-15 key; rows written before migration 0205 still carry it.
      const name = (r.supplier_name ?? r.supplier ?? '') as string;
      if (typeof name !== 'string' || !name.trim()) return null;
      // The outcome is what the search EVIDENCES (§205.204(a)(1): which supplier, and what
      // they said). The form shows it beside the supplier; the detail view dropped it, so a
      // reader could not tell "not available organic" from "no answer yet". It is the
      // farmer's own text, so it is carried as typed, not translated.
      const result = typeof r.result === 'string' ? r.result.trim() : '';
      return result ? `${name.trim()} (${result})` : name.trim();
    })
    .filter((n): n is string => Boolean(n));

  if (suppliers.length === 0) {
    // Rows exist but name nobody — that is the shape a certifier reads as an unsupported
    // exemption, so say so rather than printing a bare count.
    return `${value.length} search ${value.length === 1 ? 'record' : 'records'}, no supplier named`;
  }
  return `${suppliers.length} contacted: ${suppliers.join(', ')}`;
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
  const yes = isAffirmativeFlag(value);
  // 2026-08-31 — was "…with the follow-up below". There is no follow-up below on a consumer
  // card: `corrective_action_taken` and `certifier_notified` are owner-gated in
  // PublicHistorySerializer because the narrative names the certifier, the lab and the
  // neighbouring operation the drift came from. The line pointed at a section shoppers can
  // never see, which reads as a missing disclosure rather than a withheld one. What IS public
  // beside it is the source, the affected area and the resolution date.
  // No dash, per noEmDashInConsumerCopy.test.ts: that gate walks getConsumerEventDescription
  // and the Spanish catalogue, not this file, but the rule is about what a shopper reads.
  return yes ? 'Yes, recorded by the farm, with the source and area shown here' : null;
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

/**
 * Run 8b (8b-06): the shopper reads WHO said it and what it does not show. The farm's basis is
 * the farm's own answer, never a listing check of this application and never an approval
 * Trazo can know about. The certifier option keeps "approved" because it is the farm's own
 * attributed statement. Exported so the chemical card formatter speaks the same sentences
 * (one Spanish translation each in utils/fieldValues.es.ts).
 */
export const SHOPPER_BASIS_RECORDED =
  "Recorded by the farm as allowed for organic use. This does not show that this application was approved or met a listing's restrictions.";
export const SHOPPER_BASIS_CERTIFIER =
  "Recorded by the farm as reviewed and approved by its certifier. This is the farm's own record.";
export const SHOPPER_BASIS_EQUIVALENT =
  "Recorded by the farm as organic-equivalent. This is the farm's own record.";
export const SHOPPER_BASIS_NONE = 'The farm did not record an organic basis';

/**
 * Organic-approval status, as a shopper may safely read it.
 *
 * WHY (2026-08-09): three consumer surfaces rendered the grower's `organic_approved` dropdown
 * as the words "OMRI Listed" — the chemical chip, the soil `amendment_organic_approved` row,
 * and the pest `beneficial_organic_approved` row, the last of which printed
 * "OMRI / Organic-approved" from a bare `yes`. OMRI is a real third-party listing program, so
 * naming it on the strength of a self-report is an unearned certification claim
 * (FTC 16 CFR 260.6; EU ECGT 2024/825), not loose wording.
 *
 * The client cannot resolve the OMRI or National List catalogs, so it can never confirm a
 * listing; only the server can (`claim_authority.may_claim_input_listing`). This formatter is
 * therefore deliberately incapable of emitting a certifier's name. The grower's record is
 * still shown in full — attributed to the grower, which is what it is.
 */
const CONSUMER_ORGANIC_STATUS: Record<string, string> = {
  omri_listed: SHOPPER_BASIS_RECORDED,
  // 2026-08-15 — the three lawful verification bases added when the enum was rebuilt on
  // USDA's Input Material Application Record. Wording stays GROWER-REPORTED for all of them:
  // the basis is the grower's answer, not a third-party attestation Trazo has checked. Only
  // the server (claim_authority, which holds the catalog FKs) may upgrade that.
  wsda_listed: SHOPPER_BASIS_RECORDED,
  nop_seal_on_label: SHOPPER_BASIS_RECORDED,
  certifier_approved: SHOPPER_BASIS_CERTIFIER,
  usda_nop_approved: SHOPPER_BASIS_RECORDED,
  organic_equivalent: SHOPPER_BASIS_EQUIVALENT,
  organic_certified: SHOPPER_BASIS_RECORDED,
  yes: SHOPPER_BASIS_RECORDED,
  transitional: 'Transitional — the farm is converting to organic',
  not_organic: 'No, conventional input',
  no: 'No, conventional input',
  unknown: SHOPPER_BASIS_NONE,
  // Run 8 (R8-08): the soil amendment form offers it too; never a "Yes".
  unverified: 'Not confirmed by the farm',
  // Not an answer to the question; render nothing rather than "Not Applicable".
  not_applicable: ''
};

export const formatConsumerOrganicStatus: FieldFormatter<string> = (value) => {
  if (typeof value !== 'string' || value === '') return null;
  const label = CONSUMER_ORGANIC_STATUS[value.toLowerCase()];
  if (label === '') return null;
  return label ?? null;
};
