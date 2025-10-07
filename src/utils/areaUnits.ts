/**
 * Professional Area Unit Conversion System for Agricultural Applications
 * Following 2025 agricultural software standards with precise conversion factors
 * 
 * @author Trazo Platform
 * @version 2.0.0
 * @date 2025-01-15
 */

// High-precision conversion factors (USDA/FAO standard)
export const AREA_CONVERSION_FACTORS = {
  // Base conversions to hectares
  ACRES_TO_HECTARES: 0.40468564224,
  HECTARES_TO_ACRES: 2.47105381467,
  
  // Square meter conversions
  SQ_METERS_TO_HECTARES: 0.0001,
  HECTARES_TO_SQ_METERS: 10000,
  
  // Square feet conversions
  SQ_FEET_TO_HECTARES: 0.000009290304,
  HECTARES_TO_SQ_FEET: 107639.1041671,
} as const;

/**
 * Supported area units following international agricultural standards
 */
export type AreaUnit = 'hectares' | 'acres' | 'sq_meters' | 'sq_feet';

/**
 * Area value with unit information
 */
export interface AreaMeasurement {
  value: number;
  unit: AreaUnit;
  precision?: number; // Decimal places for display
}

/**
 * Configuration for area display and input
 */
export interface AreaUnitConfig {
  primary: AreaUnit;
  secondary?: AreaUnit;
  showBothUnits: boolean;
  precision: number;
  region: 'US' | 'METRIC' | 'GLOBAL';
}

/**
 * Regional preferences for area units (2025 agricultural standards)
 */
export const REGIONAL_AREA_PREFERENCES: Record<string, AreaUnitConfig> = {
  US: {
    primary: 'acres',
    secondary: 'hectares',
    showBothUnits: true,
    precision: 2,
    region: 'US'
  },
  METRIC: {
    primary: 'hectares',
    secondary: 'acres',
    showBothUnits: true,
    precision: 2,
    region: 'METRIC'
  },
  GLOBAL: {
    primary: 'hectares',
    secondary: undefined,
    showBothUnits: false,
    precision: 2,
    region: 'GLOBAL'
  }
} as const;

/**
 * Convert area from one unit to another with high precision
 * @param value - Area value to convert
 * @param fromUnit - Source unit
 * @param toUnit - Target unit
 * @param precision - Decimal places (default: 4 for calculations, 2 for display)
 * @returns Converted area value
 */
export function convertArea(
  value: number,
  fromUnit: AreaUnit,
  toUnit: AreaUnit,
  precision: number = 4
): number {
  if (fromUnit === toUnit) {
    return parseFloat(value.toFixed(precision));
  }

  // Convert to hectares first (base unit)
  let hectares: number;
  
  switch (fromUnit) {
    case 'acres':
      hectares = value * AREA_CONVERSION_FACTORS.ACRES_TO_HECTARES;
      break;
    case 'sq_meters':
      hectares = value * AREA_CONVERSION_FACTORS.SQ_METERS_TO_HECTARES;
      break;
    case 'sq_feet':
      hectares = value * AREA_CONVERSION_FACTORS.SQ_FEET_TO_HECTARES;
      break;
    case 'hectares':
    default:
      hectares = value;
      break;
  }

  // Convert from hectares to target unit
  let result: number;
  
  switch (toUnit) {
    case 'acres':
      result = hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_ACRES;
      break;
    case 'sq_meters':
      result = hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_SQ_METERS;
      break;
    case 'sq_feet':
      result = hectares * AREA_CONVERSION_FACTORS.HECTARES_TO_SQ_FEET;
      break;
    case 'hectares':
    default:
      result = hectares;
      break;
  }

  return parseFloat(result.toFixed(precision));
}

/**
 * Ensure area value is always stored in hectares (platform standard)
 * @param area - Area measurement with unit
 * @returns Area value in hectares
 */
export function normalizeAreaToHectares(area: AreaMeasurement): number {
  return convertArea(area.value, area.unit, 'hectares', 6); // High precision for storage
}

/**
 * Convert hectares to display unit based on regional preferences
 * @param hectares - Area in hectares
 * @param region - Regional preference
 * @returns Area measurement for display
 */
export function formatAreaForDisplay(
  hectares: number,
  region: keyof typeof REGIONAL_AREA_PREFERENCES = 'GLOBAL'
): AreaMeasurement {
  const config = REGIONAL_AREA_PREFERENCES[region];
  
  if (config.primary === 'hectares') {
    return {
      value: parseFloat(hectares.toFixed(config.precision)),
      unit: 'hectares',
      precision: config.precision
    };
  }
  
  return {
    value: convertArea(hectares, 'hectares', config.primary, config.precision),
    unit: config.primary,
    precision: config.precision
  };
}

/**
 * Get dual unit display string (primary + secondary in parentheses)
 * @param hectares - Area in hectares
 * @param region - Regional preference
 * @returns Formatted string with both units
 */
export function formatAreaWithBothUnits(
  hectares: number,
  region: keyof typeof REGIONAL_AREA_PREFERENCES = 'GLOBAL'
): string {
  const config = REGIONAL_AREA_PREFERENCES[region];
  const primary = formatAreaForDisplay(hectares, region);
  
  if (!config.showBothUnits || !config.secondary) {
    return `${primary.value} ${getUnitDisplayName(primary.unit)}`;
  }
  
  const secondary = {
    value: convertArea(hectares, 'hectares', config.secondary, config.precision),
    unit: config.secondary
  };
  
  return `${primary.value} ${getUnitDisplayName(primary.unit)} (${secondary.value} ${getUnitDisplayName(secondary.unit)})`;
}

/**
 * Get user-friendly unit display names
 * @param unit - Area unit
 * @returns Display name
 */
export function getUnitDisplayName(unit: AreaUnit): string {
  const displayNames: Record<AreaUnit, string> = {
    hectares: 'hectares',
    acres: 'acres',
    sq_meters: 'm²',
    sq_feet: 'ft²'
  };
  
  return displayNames[unit];
}

/**
 * Get unit abbreviation for compact display
 * @param unit - Area unit
 * @returns Abbreviation
 */
export function getUnitAbbreviation(unit: AreaUnit): string {
  const abbreviations: Record<AreaUnit, string> = {
    hectares: 'ha',
    acres: 'ac',
    sq_meters: 'm²',
    sq_feet: 'ft²'
  };
  
  return abbreviations[unit];
}

/**
 * Validate area value for agricultural use
 * @param area - Area measurement
 * @returns Validation result
 */
export function validateAreaValue(area: AreaMeasurement): {
  isValid: boolean;
  error?: string;
  normalizedValue?: number;
} {
  if (area.value <= 0) {
    return {
      isValid: false,
      error: 'Area must be greater than zero'
    };
  }
  
  // Convert to hectares for validation
  const hectares = normalizeAreaToHectares(area);
  
  // Agricultural validation limits (reasonable farm sizes)
  const MIN_AREA_HECTARES = 0.001; // 10 m² minimum
  const MAX_AREA_HECTARES = 100000; // 100,000 hectares maximum (large commercial farms)
  
  if (hectares < MIN_AREA_HECTARES) {
    return {
      isValid: false,
      error: `Minimum area is ${MIN_AREA_HECTARES} hectares`
    };
  }
  
  if (hectares > MAX_AREA_HECTARES) {
    return {
      isValid: false,
      error: `Maximum area is ${MAX_AREA_HECTARES} hectares`
    };
  }
  
  return {
    isValid: true,
    normalizedValue: hectares
  };
}

/**
 * Parse area input string with unit detection
 * @param input - User input string (e.g., "25 acres", "10.5 ha")
 * @returns Parsed area measurement or null if invalid
 */
export function parseAreaInput(input: string): AreaMeasurement | null {
  const trimmed = input.trim();
  
  // Regex patterns for different formats
  const patterns = [
    { regex: /^(\d+(?:\.\d+)?)\s*(hectares?|ha)$/i, unit: 'hectares' as AreaUnit },
    { regex: /^(\d+(?:\.\d+)?)\s*(acres?|ac)$/i, unit: 'acres' as AreaUnit },
    { regex: /^(\d+(?:\.\d+)?)\s*(m²|sq\.?\s*m|square\s*meters?)$/i, unit: 'sq_meters' as AreaUnit },
    { regex: /^(\d+(?:\.\d+)?)\s*(ft²|sq\.?\s*ft|square\s*feet?)$/i, unit: 'sq_feet' as AreaUnit },
    // Default to hectares if no unit specified
    { regex: /^(\d+(?:\.\d+)?)$/i, unit: 'hectares' as AreaUnit }
  ];
  
  for (const pattern of patterns) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const value = parseFloat(match[1]);
      if (!isNaN(value) && value > 0) {
        return {
          value,
          unit: pattern.unit,
          precision: 2
        };
      }
    }
  }
  
  return null;
}

/**
 * Carbon calculation helper - ensure area is in hectares
 * @param area - Area value (may be in any unit)
 * @param unit - Current unit of the area
 * @returns Area in hectares for carbon calculations
 */
export function getAreaForCarbonCalculation(area: number, unit: AreaUnit = 'hectares'): number {
  return convertArea(area, unit, 'hectares', 6);
}

/**
 * Migration helper - convert existing acre data to hectares
 * @param acreValue - Value in acres
 * @returns Value in hectares with high precision
 */
export function migrateAcresToHectares(acreValue: number): number {
  return convertArea(acreValue, 'acres', 'hectares', 6);
}

/**
 * Export default configuration
 */
export const DEFAULT_AREA_CONFIG: AreaUnitConfig = REGIONAL_AREA_PREFERENCES.METRIC;