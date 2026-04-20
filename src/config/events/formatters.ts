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
      return local.toLocaleDateString();
    }
    const parsed = new Date(str);
    if (Number.isNaN(parsed.getTime())) return str;
    return parsed.toLocaleDateString();
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
 * Format temperature with unit, reading a companion `temperature_unit` field
 * from the event payload (values: "C" | "F"). Defaults to Celsius when unset.
 * Used by weather fields highest_temperature (HT) and lower_temperature (FR).
 */
export const formatTemperature: FieldFormatter<number | string, Record<string, unknown>> = (
  value,
  event
) => {
  if (value == null || value === '') return null;
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(num)) return null;
  const rawUnit = event && typeof event.temperature_unit === 'string' ? event.temperature_unit : '';
  const unitSymbol = rawUnit.toUpperCase() === 'F' ? '°F' : '°C';
  return `${num}${unitSymbol}`;
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
