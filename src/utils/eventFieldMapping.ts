/**
 * Event Field Mapping Configuration
 *
 * This file defines the field mappings between different data sources (form data, backend API)
 * and the standardized event data structure. This ensures consistent field naming regardless
 * of the data source.
 */

/**
 * Generic field mapping interface
 */
interface FieldMapping {
  [sourceField: string]: string; // sourceField -> standardizedField
}

/**
 * Complete field mapping for a data source
 */
interface DataSourceMapping {
  form: FieldMapping;
  backend: FieldMapping;
}

/**
 * Weather Event Field Mappings (Type 0)
 * Handles: FR, DR, HL, HT, TS, HW, HH, LH
 */
export const WEATHER_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    type: 'weather_type',
    highest_temperature: 'highest_temperature',
    lower_temperature: 'lower_temperature',
    way_of_protection: 'way_of_protection',
    protection_measures: 'protection_measures',
    water_deficit: 'water_deficit',
    weight: 'weight',
    diameter: 'diameter',
    duration: 'duration',
    start_date: 'start_date',
    end_date: 'end_date',
    wind_speed: 'wind_speed',
    precipitation_amount: 'precipitation_amount',
    damage_assessment: 'damage_assessment',
    humidity_level: 'humidity_level',
    crop_impact: 'crop_impact',
    observation: 'observation'
  },
  backend: {
    // Backend field names → Standardized field names
    type: 'weather_type',
    highest_temperature: 'highest_temperature',
    lower_temperature: 'lower_temperature',
    way_of_protection: 'way_of_protection',
    protection_measures: 'protection_measures',
    water_deficit: 'water_deficit',
    weight: 'weight',
    diameter: 'diameter',
    duration: 'duration',
    start_date: 'start_date',
    end_date: 'end_date',
    wind_speed: 'wind_speed',
    precipitation_amount: 'precipitation_amount',
    damage_assessment: 'damage_assessment',
    humidity_level: 'humidity_level',
    crop_impact: 'crop_impact',
    observation: 'observation',
    description: 'description'
  }
};

/**
 * Production Event Field Mappings (Type 1)
 * Handles: PL, HA, IR, PR, TR, EM (Equipment Maintenance - Sprint 2)
 * CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
 */
export const PRODUCTION_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    name: 'production_name',
    production_type: 'production_type', // Direct mapping for form field
    type: 'production_type',
    area_covered: 'area_covered_raw',
    area: 'area_covered_raw',
    area_unit: 'area_unit',
    unit: 'area_unit',
    yield_quantity: 'yield_quantity_raw',
    quantity_planted: 'yield_quantity_raw',
    quantity: 'yield_quantity_raw',
    yield_unit: 'yield_unit',
    quantity_unit: 'yield_unit',
    unit_quantity: 'yield_unit',
    fuel_consumed: 'fuel_consumed_raw',
    fuel_amount: 'fuel_consumed_raw',
    fuel_unit: 'fuel_unit',
    equipment_hours: 'equipment_hours_raw',
    operating_hours: 'equipment_hours_raw',
    transportation_distance: 'transportation_distance_raw',
    transportation_unit: 'transportation_unit',
    production_efficiency: 'production_efficiency',
    observation: 'observation',
    // Sprint 2: EM (Equipment Maintenance) subtype fields
    // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
    equipment_operation_type: 'equipment_operation_type',
    equipment_type: 'equipment_type',
    fuel_type: 'fuel_type',
    operation_efficiency: 'operation_efficiency'
  },
  backend: {
    // Backend field names → Standardized field names
    production_name: 'production_name',
    name: 'production_name',
    production_type: 'production_type',
    type: 'production_type',
    area_covered: 'area_covered', // Backend already formatted with units
    yield_quantity: 'yield_quantity', // Backend already formatted with units
    fuel_consumed: 'fuel_consumed', // Backend already formatted with units
    equipment_hours: 'equipment_hours', // Backend already formatted with units
    transportation_distance: 'transportation_distance', // Backend already formatted with units
    observation: 'observation',
    description: 'description',
    // Sprint 2: EM (Equipment Maintenance) subtype fields
    // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
    equipment_operation_type: 'equipment_operation_type',
    equipment_type: 'equipment_type',
    fuel_type: 'fuel_type',
    operation_efficiency: 'operation_efficiency'
  }
};

/**
 * Chemical Event Field Mappings (Type 2)
 * Handles: FE, PE, FU, HE
 * Includes the pesticide application fields of the EPA Worker Protection Standard (40 CFR 170.311(b)(1))
 */
export const CHEMICAL_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    chemical_type: 'chemical_type', // Direct mapping for form field
    type: 'chemical_type',
    commercial_name: 'commercial_name',
    active_ingredient: 'active_ingredient',
    application_method: 'application_method', // Key difference from backend
    target_pest_disease: 'target_pest_disease',
    target_pest_disease_need: 'target_pest_disease',
    area_treated: 'area_treated',
    area: 'area_treated',
    area_unit: 'area_unit',
    volume_applied: 'volume_applied',
    volume: 'volume_applied',
    volume_unit: 'volume_unit',
    concentration: 'concentration',
    npk_ratio: 'npk_ratio',
    nitrogenPercentage: 'nitrogen_percentage',
    phosphorusPercentage: 'phosphorus_percentage',
    potassiumPercentage: 'potassium_percentage',
    application_timing: 'application_timing',
    weather_conditions: 'weather_conditions',
    observation: 'observation',
    // Pesticide application fields (EPA WPS application record: 40 CFR 170.311(b)(1))
    applicator_name: 'applicator_name',
    epa_registration_number: 'epa_registration_number',
    restricted_use_pesticide: 'restricted_use_pesticide',
    applicator_certification: 'applicator_certification',
    rei_hours: 'rei_hours',
    phi_days: 'phi_days',
    // Sprint 1 Epic 1.1: Additional EPA WPS Fields
    signal_word: 'signal_word',
    ppe_required: 'ppe_required',
    environmental_hazards: 'environmental_hazards'
  },
  backend: {
    // Backend field names → Standardized field names
    chemical_type: 'chemical_type',
    // Note: 'type' is general event type ("chemical"), not chemical subtype
    commercial_name: 'commercial_name',
    active_ingredient: 'active_ingredient',
    way_of_application: 'application_method', // Key difference from form
    application_method: 'application_method',
    target_pest_disease: 'target_pest_disease',
    area: 'area_treated',
    area_treated: 'area_treated',
    area_unit: 'area_unit',
    volume: 'volume_applied',
    volume_applied: 'volume_applied',
    volume_unit: 'volume_unit',
    concentration: 'concentration',
    npk_ratio: 'npk_ratio',
    nitrogen_percentage: 'nitrogen_percentage',
    phosphorus_percentage: 'phosphorus_percentage',
    potassium_percentage: 'potassium_percentage',
    application_timing: 'application_timing',
    weather_conditions: 'weather_conditions',
    observation: 'observation',
    description: 'description',
    // Pesticide application fields (EPA WPS application record: 40 CFR 170.311(b)(1))
    applicator_name: 'applicator_name',
    epa_registration_number: 'epa_registration_number',
    restricted_use_pesticide: 'restricted_use_pesticide',
    applicator_certification: 'applicator_certification',
    rei_hours: 'rei_hours',
    phi_days: 'phi_days',
    // Sprint 1 Epic 1.1: Additional EPA WPS Fields
    signal_word: 'signal_word',
    ppe_required: 'ppe_required',
    environmental_hazards: 'environmental_hazards'
  }
};

/**
 * General Event Field Mappings (Type 3)
 */
export const GENERAL_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    type: 'activity_type',
    activity_type: 'activity_type',
    name: 'activity_name',
    activity_name: 'activity_name',
    duration_hours: 'duration_raw',
    duration: 'duration_raw',
    participants: 'people_involved',
    people_involved: 'people_involved',
    activity_notes: 'activity_notes',
    notes: 'activity_notes',
    description: 'activity_notes',
    observation: 'observation'
  },
  backend: {
    // Backend field names → Standardized field names
    // NOTE: Do NOT map 'type' or 'name' here — they collide with common mapping's
    // 'type: type' and 'name: name', causing getSourceField reverse lookup to return
    // 'type' (value "general") instead of 'activity_type' (value "Farm Maintenance").
    // Same issue as documented in BUSINESS_FIELD_MAPPING.
    activity_type: 'activity_type',
    activity_name: 'activity_name',
    duration: 'duration_raw',
    duration_raw: 'duration_raw',
    people_involved: 'people_involved',
    activity_notes: 'activity_notes',
    notes: 'activity_notes',
    observation: 'observation',
    description: 'description'
  }
};

/**
 * Equipment Event Field Mappings (Type 4)
 */
export const EQUIPMENT_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    operation_type: 'operation_type', // Direct mapping for form field
    operation_name: 'operation_name', // Direct mapping for form field
    type: 'operation_type',
    name: 'operation_name',
    equipment_type: 'equipment_type',
    fuel_consumed: 'fuel_consumed',
    fuel_type: 'fuel_type',
    hours_operated: 'hours_operated',
    area_worked: 'area_worked',
    operation_efficiency: 'operation_efficiency',
    observation: 'operation_notes', // Form uses 'observation' for operation notes
    operation_notes: 'operation_notes',
    notes: 'operation_notes',
    description: 'operation_notes'
  },
  backend: {
    // Backend field names → Standardized field names
    operation_type: 'operation_type',
    type: 'type',
    operation_name: 'operation_name',
    name: 'operation_name',
    equipment_type: 'equipment_type',
    fuel_consumed: 'fuel_consumed',
    fuel_type: 'fuel_type',
    hours_operated: 'hours_operated',
    area_worked: 'area_worked',
    operation_efficiency: 'operation_efficiency',
    operation_notes: 'operation_notes',
    observation: 'observation',
    description: 'description'
  }
};

/**
 * Soil Management Event Field Mappings (Type 5)
 */
export const SOIL_MANAGEMENT_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    soil_management_type: 'soil_management_type', // Direct mapping for form field
    soil_management_name: 'soil_management_name', // Direct mapping for form field
    type: 'soil_management_type',
    name: 'soil_management_name',
    area: 'area_managed',
    area_unit: 'area_unit',
    depth: 'working_depth',
    depth_unit: 'depth_unit',
    soil_ph: 'soil_ph',
    organic_matter_percentage: 'organic_matter',
    soil_texture: 'soil_texture',
    soil_moisture: 'soil_moisture',
    area_covered: 'area_covered',
    fuel_consumed: 'fuel_consumed',
    fuel_unit: 'fuel_unit',
    equipment_hours: 'equipment_hours',
    production_efficiency: 'production_efficiency',
    transportation_distance: 'transportation_distance',
    transportation_unit: 'transportation_unit',
    weather_conditions: 'weather_conditions',
    temperature_range: 'temperature_range',
    equipment_used: 'equipment_used',
    tillage_type: 'tillage_type',
    tillage_intensity: 'tillage_intensity',
    tillage_direction: 'tillage_direction',
    residue_management: 'residue_management',
    observation: 'soil_management_notes',
    notes: 'soil_management_notes',
    description: 'soil_management_notes'
  },
  backend: {
    // Backend field names → Standardized field names
    soil_management_type: 'soil_management_type',
    type: 'type',
    soil_management_name: 'soil_management_name',
    name: 'soil_management_name',
    area_managed: 'area_managed',
    area: 'area_managed',
    area_unit: 'area_unit',
    working_depth: 'working_depth',
    depth_unit: 'depth_unit',
    soil_ph: 'soil_ph',
    organic_matter_percentage: 'organic_matter',
    organic_matter: 'organic_matter',
    soil_texture: 'soil_texture',
    soil_moisture: 'soil_moisture',
    area_covered: 'area_covered',
    fuel_consumed: 'fuel_consumed',
    fuel_unit: 'fuel_unit',
    equipment_hours: 'equipment_hours',
    operation_efficiency: 'production_efficiency',
    transportation_distance: 'transportation_distance',
    transportation_unit: 'transportation_unit',
    weather_conditions: 'weather_conditions',
    temperature_range: 'temperature_range',
    equipment_used: 'equipment_used',
    tillage_type: 'tillage_type',
    tillage_intensity: 'tillage_intensity',
    tillage_direction: 'tillage_direction',
    residue_management: 'residue_management',
    soil_management_notes: 'soil_management_notes',
    observation: 'description',
    description: 'description'
  }
};

/**
 * Pest Management Event Field Mappings (Type 6)
 */
export const PEST_MANAGEMENT_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    pest_management_type: 'pest_management_type', // Direct mapping for form field
    pest_management_name: 'pest_management_name', // Direct mapping for form field
    type: 'pest_management_type',
    name: 'pest_management_name',
    // Sprint 2 Epic 2.2: Flexible units - support both old and new field names
    field_area: 'field_area',
    area_unit: 'area_unit',
    travel_distance: 'travel_distance',
    distance_unit: 'distance_unit',
    // Legacy field names for backward compatibility
    field_area_hectares: 'field_area_hectares',
    travel_distance_km: 'travel_distance_km',
    time_spent_hours: 'time_spent_hours',
    crop_growth_stage: 'crop_growth_stage',
    weather_conditions: 'weather_conditions',
    economic_threshold_met: 'economic_threshold_met',
    action_recommended: 'action_recommended',
    pest_species: 'pest_species',
    pest_pressure_level: 'pest_pressure_level',
    beneficial_species: 'beneficial_species',
    release_quantity: 'release_quantity',
    trap_count: 'trap_count',
    damage_percentage: 'damage_percentage',
    action_threshold_met: 'action_threshold_met',
    ipm_strategy: 'ipm_strategy',
    observation: 'pest_management_notes'
  },
  backend: {
    // Backend field names → Standardized field names
    // NOTE: Do NOT map 'type' here — it collides with common mapping's 'type: type'
    // and causes getSourceField reverse lookup to return 'type' (value "pest_management")
    // instead of 'pest_management_type' (value "SC"). The common type field is handled separately.
    pest_management_type: 'pest_management_type',
    pest_type: 'pest_management_type',
    pest_management_name: 'pest_management_name',
    name: 'pest_management_name',
    // Sprint 2 Epic 2.2: Flexible units - support both old and new field names
    field_area: 'field_area',
    area_unit: 'area_unit',
    travel_distance: 'travel_distance',
    distance_unit: 'distance_unit',
    // Legacy field names for backward compatibility
    field_area_hectares: 'field_area_hectares',
    travel_distance_km: 'travel_distance_km',
    time_spent_hours: 'time_spent_hours',
    crop_growth_stage: 'crop_growth_stage',
    weather_conditions: 'weather_conditions',
    economic_threshold_met: 'economic_threshold_met',
    action_recommended: 'action_recommended',
    pest_species: 'pest_species',
    pest_pressure_level: 'pest_pressure_level',
    beneficial_species: 'beneficial_species',
    release_quantity: 'release_quantity',
    trap_count: 'trap_count',
    damage_percentage: 'damage_percentage',
    action_threshold_met: 'action_threshold_met',
    ipm_strategy: 'ipm_strategy',
    pest_management_notes: 'pest_management_notes',
    observation: 'observation',
    description: 'description'
  }
};

/**
 * Business Event Field Mappings (Type 7)
 */
export const BUSINESS_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Form field names → Standardized field names
    business_event_type: 'business_event_type', // Direct mapping for form field
    business_event_name: 'business_event_name', // Direct mapping for form field
    business_activity_type: 'business_activity_type', // Direct mapping for form field
    type: 'business_event_type',
    name: 'business_event_name',
    business_type: 'business_activity_type',
    certification_type: 'certification_type',
    carbon_credits_earned: 'carbon_credits_earned',
    carbon_credits_unit: 'carbon_credits_unit',
    verification_status: 'verification_status',
    sustainability_practice: 'sustainability_practice',
    observation: 'business_observation'
  },
  backend: {
    // Backend field names → Standardized field names
    // NOTE: Do NOT map 'type' here — it collides with common mapping's 'type: type'
    // and causes getSourceField reverse lookup to return 'type' (value "business")
    // instead of 'business_event_type' (value "CE"). The common type field is handled separately.
    business_event_type: 'business_event_type',
    business_event_name: 'business_event_name',
    name: 'business_event_name',
    business_activity_type: 'business_activity_type',
    business_type: 'business_activity_type',
    certification_type: 'certification_type',
    carbon_credits_earned: 'carbon_credits_earned',
    carbon_credits_unit: 'carbon_credits_unit',
    verification_status: 'verification_status',
    sustainability_practice: 'sustainability_practice',
    business_observation: 'business_observation',
    observation: 'observation',
    description: 'description'
  }
};

/**
 * Common fields mapping (applies to all event types)
 */
export const COMMON_FIELD_MAPPING: DataSourceMapping = {
  form: {
    // Common form fields → Standardized field names
    date: 'date',
    description: 'description',
    observation: 'observation',
    id: 'id',
    type: 'type',
    name: 'name',
    event_type: 'event_type',
    acceptedFiles: 'album', // Special handling needed for file arrays
    album: 'album',
    imageUrls: 'album', // Special handling needed for URL arrays
    // Sprint 1 Epic 1.4: USDA GAP Traceability field
    performed_by: 'performed_by',
    // Verification fields
    certified: 'certified',
    blockchain_verified: 'blockchain_verified',
    blockchain_transaction: 'blockchain_transaction',
    blockchain_block_number: 'blockchain_block_number',
    verification_confidence: 'verification_confidence',
    verification_timestamp: 'verification_timestamp',
    data_integrity_score: 'data_integrity_score',
    usda_factors_used: 'usda_factors_used',
    carbon_impact: 'carbon_impact'
  },
  backend: {
    // Common backend fields → Standardized field names
    id: 'id',
    date: 'date',
    description: 'description',
    observation: 'observation',
    name: 'name',
    type: 'type',
    event_type: 'event_type',
    album: 'album',
    // Sprint 1 Epic 1.4: USDA GAP Traceability field
    performed_by: 'performed_by',
    // Verification fields
    certified: 'certified',
    blockchain_verified: 'blockchain_verified',
    blockchain_transaction: 'blockchain_transaction',
    blockchain_block_number: 'blockchain_block_number',
    blockchain_explorer_url: 'blockchain_explorer_url',
    blockchain_network: 'blockchain_network',
    verification_confidence: 'verification_confidence',
    verification_timestamp: 'verification_timestamp',
    data_integrity_score: 'data_integrity_score',
    usda_factors_used: 'usda_factors_used',
    carbon_impact: 'carbon_impact'
  }
};

/**
 * Master mapping object containing all event type mappings
 */
export const EVENT_FIELD_MAPPINGS = {
  0: WEATHER_FIELD_MAPPING,
  1: PRODUCTION_FIELD_MAPPING,
  2: CHEMICAL_FIELD_MAPPING,
  3: GENERAL_FIELD_MAPPING,
  4: EQUIPMENT_FIELD_MAPPING,
  5: SOIL_MANAGEMENT_FIELD_MAPPING,
  6: PEST_MANAGEMENT_FIELD_MAPPING,
  7: BUSINESS_FIELD_MAPPING
} as const;

/**
 * Helper function to get field mapping for a specific event type and data source
 */
export function getFieldMapping(eventType: number, dataSource: 'form' | 'backend'): FieldMapping {
  const eventMapping = EVENT_FIELD_MAPPINGS[eventType as keyof typeof EVENT_FIELD_MAPPINGS];
  const commonMapping = COMMON_FIELD_MAPPING[dataSource];

  if (!eventMapping) {
    // Return only common mapping for unknown event types
    return commonMapping;
  }

  // Merge common mapping with event-specific mapping
  return {
    ...commonMapping,
    ...eventMapping[dataSource]
  };
}

/**
 * Helper function to check if a field should be mapped
 */
export function shouldMapField(
  fieldName: string,
  eventType: number,
  dataSource: 'form' | 'backend'
): boolean {
  const mapping = getFieldMapping(eventType, dataSource);
  return fieldName in mapping;
}

/**
 * Helper function to get the standardized field name
 */
export function getStandardizedFieldName(
  fieldName: string,
  eventType: number,
  dataSource: 'form' | 'backend'
): string {
  const mapping = getFieldMapping(eventType, dataSource);
  return mapping[fieldName] || fieldName; // Return original if no mapping exists
}
