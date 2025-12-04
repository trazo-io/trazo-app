/**
 * Event Field Mappings Registry
 * Centralized field mapping definitions for event data transformation
 *
 * This file provides standardized mappings between:
 * - Frontend form field names
 * - Backend API field names
 * - Consumer-facing display labels
 *
 * Based on TRAZO-EVENT-MASTER-IMPLEMENTATION-PLAN.md specifications
 */

// ============================================================
// UNIVERSAL FIELD MAPPINGS
// These mappings apply across ALL event types
// ============================================================

export const UNIVERSAL_MAPPINGS: Record<string, string> = {
  // Core field mappings (frontend → backend)
  observation: 'description',
  notes: 'description',

  // Date/time mappings
  eventDate: 'date',
  event_date: 'date',

  // Location mappings
  parcel: 'parcel_id',
  parcelId: 'parcel_id',
};

// ============================================================
// EVENT-SPECIFIC FIELD MAPPINGS
// Organized by event type for targeted transformations
// ============================================================

export const EVENT_SPECIFIC_MAPPINGS: Record<string, Record<string, string>> = {
  // Weather Event (Type 0)
  weather: {
    weatherType: 'type',
    weather_type: 'type',
    temperatureMin: 'lower_temperature',
    temperatureMax: 'highest_temperature',
    windSpeed: 'wind_speed',
    precipitation: 'precipitation_amount',
    humidityLevel: 'humidity_level',
    waterDeficit: 'water_deficit',
    protectionMethod: 'way_of_protection',
  },

  // Production Event (Type 1)
  production: {
    productionType: 'type',
    production_type: 'type',
    operatingHours: 'equipment_hours',
    operating_hours: 'equipment_hours',
    areaCovered: 'area_covered',
    area_covered: 'area_covered',
    yieldAmount: 'quantity_harvested',
    quantityHarvested: 'quantity_harvested',
    // Sprint 3 Consumer Trust Fields
    seedsSource: 'seeds_source',
    waterSource: 'water_source',
  },

  // Chemical Event (Type 2)
  chemical: {
    chemicalType: 'type',
    chemical_type: 'type',
    volumeApplied: 'volume_applied',
    volume_applied: 'volume_applied',
    areaTreated: 'area_treated',
    area_treated: 'area_treated',
    applicationMethod: 'application_method',
    application_method: 'way_of_application',
    way_of_application: 'application_method',
    commercialName: 'commercial_name',
    commercial_name: 'commercial_name',
    activeIngredient: 'active_ingredient',
    active_ingredient: 'active_ingredient',
    targetPest: 'target_pest_disease',
    target_pest_disease: 'target_pest_disease',
    concentration: 'concentration',
    npkRatio: 'npk_ratio',
    npk_ratio: 'npk_ratio',
    weatherConditions: 'weather_conditions',
    weather_conditions: 'weather_conditions',
    applicationTiming: 'application_timing',
    application_timing: 'application_timing',
    // EPA Compliance Fields
    applicatorName: 'applicator_name',
    applicator_name: 'applicator_name',
    epaRegistrationNumber: 'epa_registration_number',
    epa_registration_number: 'epa_registration_number',
    restrictedUsePesticide: 'restricted_use_pesticide',
    restricted_use_pesticide: 'restricted_use_pesticide',
    applicatorCertification: 'applicator_certification',
    applicator_certification: 'applicator_certification',
    reiHours: 'rei_hours',
    rei_hours: 'rei_hours',
    phiDays: 'phi_days',
    phi_days: 'phi_days',
    // Sprint 3 Consumer Trust Fields
    organicApproved: 'organic_approved',
    organic_approved: 'organic_approved',
    bufferZoneMeters: 'buffer_zone_meters',
    buffer_zone_meters: 'buffer_zone_meters',
  },

  // General Event (Type 3)
  general: {
    generalType: 'type',
    general_type: 'type',
    activityDescription: 'description',
  },

  // Equipment Event (Type 4)
  equipment: {
    equipmentType: 'equipment_type',
    equipment_type: 'equipment_type',
    fuelType: 'fuel_type',
    fuel_type: 'fuel_type',
    fuelConsumption: 'fuel_consumption',
    fuel_consumption: 'fuel_consumption',
    operatingHours: 'operating_hours',
    operating_hours: 'operating_hours',
    operationEfficiency: 'operation_efficiency',
    operation_efficiency: 'operation_efficiency',
  },

  // Soil Management Event (Type 5)
  soil: {
    soilType: 'type',
    soil_type: 'type',
    depth: 'working_depth',
    working_depth: 'working_depth',
    soilTexture: 'soil_texture',
    soil_texture: 'soil_texture',
    phLevel: 'ph_level',
    ph_level: 'ph_level',
    organicMatter: 'organic_matter',
    organic_matter: 'organic_matter',
    moistureContent: 'moisture_content',
    moisture_content: 'moisture_content',
    nitrogenContent: 'nitrogen_content',
    nitrogen_content: 'nitrogen_content',
    phosphorusContent: 'phosphorus_content',
    phosphorus_content: 'phosphorus_content',
    potassiumContent: 'potassium_content',
    potassium_content: 'potassium_content',
  },

  // Pest Management Event (Type 6)
  pest: {
    pestType: 'type',
    pest_type: 'type',
    pestName: 'pest_name',
    pest_name: 'pest_name',
    infestationLevel: 'infestation_level',
    infestation_level: 'infestation_level',
    controlMethod: 'control_method',
    control_method: 'control_method',
    monitoringMethod: 'monitoring_method',
    monitoring_method: 'monitoring_method',
    treatmentArea: 'treatment_area',
    treatment_area: 'treatment_area',
    // Sprint 3 Consumer Trust Fields
    beneficialInsectsUsed: 'beneficial_insects_used',
    beneficial_insects_used: 'beneficial_insects_used',
    chemicalFreePeriodDays: 'chemical_free_period_days',
    chemical_free_period_days: 'chemical_free_period_days',
  },

  // Business Event (Type 7)
  business: {
    businessType: 'business_type',
    business_type: 'business_type',
    certificationType: 'certification_type',
    certification_type: 'certification_type',
    certifyingBody: 'certifying_body',
    certifying_body: 'certifying_body',
    certificationDate: 'certification_date',
    certification_date: 'certification_date',
    expirationDate: 'expiration_date',
    expiration_date: 'expiration_date',
    verificationStatus: 'verification_status',
    verification_status: 'verification_status',
    sustainabilityPractice: 'sustainability_practice',
    sustainability_practice: 'sustainability_practice',
    // Sprint 3 Consumer Trust Fields
    verifiedCertifierName: 'verified_certifier_name',
    verified_certifier_name: 'verified_certifier_name',
  },
};

// ============================================================
// FIELD MAPPING UTILITIES
// ============================================================

type MappingDirection = 'toBackend' | 'toFrontend';

/**
 * Apply field mappings to transform data between frontend and backend formats
 *
 * @param data - The data object to transform
 * @param eventType - The event type (e.g., 'chemical', 'production')
 * @param direction - 'toBackend' or 'toFrontend'
 * @returns Transformed data object with mapped field names
 */
export function applyFieldMappings(
  data: Record<string, any>,
  eventType: string,
  direction: MappingDirection = 'toBackend'
): Record<string, any> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result: Record<string, any> = {};
  const eventMappings = EVENT_SPECIFIC_MAPPINGS[eventType.toLowerCase()] || {};

  // Combine universal and event-specific mappings
  const allMappings = { ...UNIVERSAL_MAPPINGS, ...eventMappings };

  // Create reverse mapping for toFrontend direction
  const mappings = direction === 'toFrontend'
    ? Object.fromEntries(Object.entries(allMappings).map(([k, v]) => [v, k]))
    : allMappings;

  for (const [key, value] of Object.entries(data)) {
    // Check if this field has a mapping
    const mappedKey = mappings[key] || key;
    result[mappedKey] = value;
  }

  return result;
}

/**
 * Get the backend field name for a frontend field
 */
export function getBackendFieldName(
  frontendField: string,
  eventType?: string
): string {
  // Check event-specific mappings first
  if (eventType) {
    const eventMappings = EVENT_SPECIFIC_MAPPINGS[eventType.toLowerCase()];
    if (eventMappings && eventMappings[frontendField]) {
      return eventMappings[frontendField];
    }
  }

  // Fall back to universal mappings
  return UNIVERSAL_MAPPINGS[frontendField] || frontendField;
}

/**
 * Get the frontend field name for a backend field
 */
export function getFrontendFieldName(
  backendField: string,
  eventType?: string
): string {
  // Check event-specific mappings first
  if (eventType) {
    const eventMappings = EVENT_SPECIFIC_MAPPINGS[eventType.toLowerCase()];
    if (eventMappings) {
      const entry = Object.entries(eventMappings).find(([_, v]) => v === backendField);
      if (entry) return entry[0];
    }
  }

  // Fall back to universal mappings
  const universalEntry = Object.entries(UNIVERSAL_MAPPINGS).find(([_, v]) => v === backendField);
  return universalEntry ? universalEntry[0] : backendField;
}

/**
 * Validate that all required fields are present after mapping
 */
export function validateMappedFields(
  data: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

// ============================================================
// SPRINT 3 CONSUMER TRUST FIELD DEFINITIONS
// Reference for consumer-facing field display
// ============================================================

export const CONSUMER_TRUST_FIELDS = {
  chemical: ['organic_approved', 'buffer_zone_meters'],
  production: ['seeds_source', 'water_source'],
  pest: ['beneficial_insects_used', 'chemical_free_period_days'],
  business: ['verified_certifier_name'],
} as const;

export const CONSUMER_TRUST_LABELS: Record<string, string> = {
  organic_approved: 'Organic Certification',
  buffer_zone_meters: 'Buffer Zone from Sensitive Areas',
  seeds_source: 'Seeds/Seedlings Source',
  water_source: 'Water Source',
  beneficial_insects_used: 'Beneficial Insects',
  chemical_free_period_days: 'Chemical-Free Period',
  verified_certifier_name: 'Verified Certifier',
};

// ============================================================
// EPA COMPLIANCE FIELD DEFINITIONS
// ============================================================

export const EPA_COMPLIANCE_FIELDS = [
  'applicator_name',
  'epa_registration_number',
  'restricted_use_pesticide',
  'applicator_certification',
  'rei_hours',
  'phi_days',
] as const;

export const EPA_REQUIRED_FIELDS = ['applicator_name'] as const;

export default {
  UNIVERSAL_MAPPINGS,
  EVENT_SPECIFIC_MAPPINGS,
  applyFieldMappings,
  getBackendFieldName,
  getFrontendFieldName,
  validateMappedFields,
  CONSUMER_TRUST_FIELDS,
  CONSUMER_TRUST_LABELS,
  EPA_COMPLIANCE_FIELDS,
  EPA_REQUIRED_FIELDS,
};
