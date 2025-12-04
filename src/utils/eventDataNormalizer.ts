/**
 * Event Data Normalization Layer
 *
 * This file contains functions to transform event data from different sources
 * (form data, backend API) into standardized event objects with consistent
 * field naming and structure.
 */

import {
  StandardizedEvent,
  StandardizedEventBase,
  StandardizedWeatherEvent,
  StandardizedProductionEvent,
  StandardizedChemicalEvent,
  StandardizedGeneralEvent,
  StandardizedEquipmentEvent,
  StandardizedSoilManagementEvent,
  StandardizedPestManagementEvent,
  StandardizedBusinessEvent,
  EVENT_TYPE_MAP
} from '../types/standardizedEvents';
import { getFieldMapping, getStandardizedFieldName } from './eventFieldMapping';
import { getConsumerEventDescription } from './eventDescriptions';

/**
 * Convert technical fuel type codes to display names
 * Imported from eventPreviewUtils to ensure consistency
 */
function getFuelTypeDisplayName(fuelTypeCode: string): string {
  const fuelTypeMapping: Record<string, string> = {
    diesel: 'Diesel',
    gasoline: 'Gasoline',
    biodiesel: 'Biodiesel',
    electric: 'Electric',
    natural_gas: 'Natural Gas' // CRITICAL: natural_gas → Natural Gas
  };
  return fuelTypeMapping[fuelTypeCode] || fuelTypeCode;
}

/**
 * Convert equipment type codes to display names
 * MUST match EQUIPMENT_TYPES from EquipmentTab.jsx
 */
function getEquipmentTypeDisplayName(equipmentTypeCode: string): string {
  const equipmentTypeMapping: Record<string, string> = {
    // Generic equipment types
    tractor: '🚜 Tractor',
    harvester: '🌾 Harvester/Combine',
    sprayer: '💨 Sprayer',
    cultivator: '🔨 Cultivator',
    transport: '🚛 Transport Vehicle',
    irrigation_pump: '💧 Irrigation Pump',
    truck: '🚛 Truck/Transport',
    generator: '⚡ Generator',
    pump: '💧 Irrigation Pump',
    other: '🔧 Other Equipment',
    // Specific tractor sizes
    tractor_small: '🚜 Small Tractor (25-75 HP)',
    tractor_medium: '🚜 Medium Tractor (75-150 HP)',
    tractor_large: '🚜 Large Tractor (150+ HP)'
  };
  return equipmentTypeMapping[equipmentTypeCode] || equipmentTypeCode;
}

/**
 * Convert operation efficiency codes to display names
 * MUST match operation_efficiency options from EquipmentTab.jsx
 */
function getOperationEfficiencyDisplayName(efficiencyCode: string): string {
  const efficiencyMapping: Record<string, string> = {
    high: 'High',
    normal: 'Normal',
    low: 'Low'
  };
  return efficiencyMapping[efficiencyCode] || efficiencyCode;
}

/**
 * Convert equipment operation type codes to display names
 * MUST match EQUIPMENT_OPERATION_TYPES from ProductionTab.jsx
 * Sprint 2: Production EQ (Equipment Operations) subtype
 */
function getEquipmentOperationTypeDisplayName(operationTypeCode: string): string {
  const operationTypeMapping: Record<string, string> = {
    FC: 'Fuel Consumption',
    MN: 'Maintenance',
    RE: 'Repair',
    CA: 'Calibration',
    BD: 'Breakdown',
    EI: 'Inspection'
  };
  return operationTypeMapping[operationTypeCode] || operationTypeCode;
}

/**
 * Data source type
 */
export type DataSource = 'form' | 'backend';

/**
 * Options for data normalization
 */
interface NormalizationOptions {
  preserveOriginal?: boolean; // Keep original fields alongside normalized ones
  generateMockVerification?: boolean; // Add mock verification data for previews
}

/**
 * Normalize form data to standardized event format
 */
export function normalizeFormEventData(
  eventType: number,
  formData: any,
  options: NormalizationOptions = {}
): StandardizedEvent {
  return normalizeEventData(eventType, formData, 'form', options);
}

/**
 * Normalize backend data to standardized event format
 */
export function normalizeBackendEventData(
  eventType: number,
  backendData: any,
  options: NormalizationOptions = {}
): StandardizedEvent {
  return normalizeEventData(eventType, backendData, 'backend', options);
}

/**
 * Main normalization function that handles both data sources
 */
export function normalizeEventData(
  eventType: number,
  rawData: any,
  dataSource: DataSource,
  options: NormalizationOptions = {}
): StandardizedEvent {
  const { preserveOriginal = false, generateMockVerification = dataSource === 'form' } = options;

  // Get field mapping for this event type and data source
  const fieldMapping = getFieldMapping(eventType, dataSource);

  // Start with base event data
  const baseEvent: StandardizedEventBase = createBaseEvent(
    rawData,
    eventType,
    dataSource,
    fieldMapping,
    preserveOriginal
  );

  // Add mock verification for form preview mode
  if (generateMockVerification) {
    addMockVerificationData(baseEvent);
  }

  // Create event-specific data based on type
  switch (eventType) {
    case 0: // Weather
      return {
        ...baseEvent,
        ...normalizeWeatherEventData(rawData, dataSource, fieldMapping)
      } as StandardizedWeatherEvent;

    case 1: // Production
      return {
        ...baseEvent,
        ...normalizeProductionEventData(rawData, dataSource, fieldMapping)
      } as StandardizedProductionEvent;

    case 2: // Chemical
      return {
        ...baseEvent,
        ...normalizeChemicalEventData(rawData, dataSource, fieldMapping)
      } as StandardizedChemicalEvent;

    case 3: // General
      return {
        ...baseEvent,
        ...normalizeGeneralEventData(rawData, dataSource, fieldMapping)
      } as StandardizedGeneralEvent;

    case 4: // Equipment
      return {
        ...baseEvent,
        ...normalizeEquipmentEventData(rawData, dataSource, fieldMapping)
      } as StandardizedEquipmentEvent;

    case 5: // Soil Management
      return {
        ...baseEvent,
        ...normalizeSoilManagementEventData(rawData, dataSource, fieldMapping)
      } as StandardizedSoilManagementEvent;

    case 6: // Pest Management
      return {
        ...baseEvent,
        ...normalizePestManagementEventData(rawData, dataSource, fieldMapping)
      } as StandardizedPestManagementEvent;

    case 7: // Business
      return {
        ...baseEvent,
        ...normalizeBusinessEventData(rawData, dataSource, fieldMapping)
      } as StandardizedBusinessEvent;

    default:
      // Default to general event for unknown types
      return {
        ...baseEvent,
        ...normalizeGeneralEventData(rawData, dataSource, fieldMapping)
      } as StandardizedGeneralEvent;
  }
}

/**
 * Create base event data common to all event types
 */
function createBaseEvent(
  rawData: any,
  eventType: number,
  dataSource: DataSource,
  fieldMapping: Record<string, string>,
  preserveOriginal: boolean
): StandardizedEventBase {
  const baseEvent: StandardizedEventBase = {
    id: rawData.id || 'preview-event',
    type: EVENT_TYPE_MAP[eventType as keyof typeof EVENT_TYPE_MAP] || 'general',
    title: generateTitle(eventType, rawData), // 🚨 CRITICAL FIX: Add title generation
    description: rawData.description || generateDescription(eventType, rawData),
    date: rawData.date || new Date().toISOString(),
    event_type: eventType
  };

  // Map common fields
  const commonFields = [
    'name',
    'observation',
    'performed_by', // Sprint 1: Traceability - operator who performed the activity
    'certified',
    'blockchain_verified',
    'blockchain_transaction',
    'blockchain_block_number',
    'blockchain_explorer_url',
    'blockchain_network',
    'verification_confidence',
    'verification_timestamp',
    'data_integrity_score',
    'usda_verified',
    'carbon_impact'
  ];

  commonFields.forEach((field) => {
    if (rawData[field] !== undefined && rawData[field] !== null) {
      (baseEvent as any)[field] = rawData[field];
    }
  });

  // Handle photo/album data
  baseEvent.album = normalizePhotoData(rawData);

  // Handle extra_data
  if (rawData.extra_data && typeof rawData.extra_data === 'object') {
    baseEvent.extra_data = { ...rawData.extra_data };
  }

  // Preserve original data if requested
  if (preserveOriginal) {
    baseEvent.extra_data = {
      ...baseEvent.extra_data,
      original_data: rawData
    };
  }

  return baseEvent;
}

/**
 * Normalize photo/album data from various formats
 */
function normalizePhotoData(rawData: any): StandardizedEventBase['album'] {
  // Handle accepted files array (form data)
  if (
    rawData.acceptedFiles &&
    Array.isArray(rawData.acceptedFiles) &&
    rawData.acceptedFiles.length > 0
  ) {
    return {
      id: 'preview-album',
      images: rawData.acceptedFiles.map((file: any, index: number) => {
        // Use the actual file path/URL for stable IDs
        const imageUrl = typeof file === 'string' ? file : file.url || file.name || file;
        const stableId = imageUrl
          ? // Extract filename and folder for better uniqueness
            imageUrl
              .split('/')
              .slice(-2)
              .join('_')
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 30)
          : `preview-${index}`;

        return {
          id: stableId,
          image: imageUrl,
          caption: `Event photo ${index + 1}`,
          created_at: new Date().toISOString()
        };
      })
    };
  }

  // Handle image URLs array (form data)
  if (rawData.imageUrls && Array.isArray(rawData.imageUrls) && rawData.imageUrls.length > 0) {
    return {
      id: 'preview-album',
      images: rawData.imageUrls.map((url: string, index: number) => {
        // Create stable ID from URL with better uniqueness
        const stableId = url
          ? // Extract filename and folder for better uniqueness
            url
              .split('/')
              .slice(-2)
              .join('_')
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 30)
          : `url-${index}`;

        return {
          id: stableId,
          image: url,
          caption: `Event photo ${index + 1}`,
          created_at: new Date().toISOString()
        };
      })
    };
  }

  // Handle existing album data (backend data) - preserve any album structure
  if (rawData.album) {
    // Return album data as-is, even if it doesn't have images array
    // UltraMobileProductionJourney will handle the structure validation
    return rawData.album;
  }

  return undefined;
}

/**
 * Add mock verification data for preview mode
 */
function addMockVerificationData(event: StandardizedEventBase): void {
  event.verification_confidence = event.verification_confidence || 85;
  event.data_integrity_score = event.data_integrity_score || 90;
  event.certified = false; // Preview mode
  event.blockchain_verified = false; // Preview mode
  event.usda_verified = false; // Preview mode
}

/**
 * Generate a description based on event type and data
 */
function generateDescription(eventType: number, rawData: any): string {
  const baseDescriptions = {
    0: 'Weather monitoring and conditions tracking',
    1: 'Agricultural production activity',
    2: 'Chemical application for crop management',
    3: 'General farming activity',
    4: 'Equipment operation and maintenance',
    5: 'Soil management practice',
    6: 'Business and compliance activity',
    7: 'Pest management activity'
  };

  // Use user's description if provided
  if (rawData.description && rawData.description.trim()) {
    return rawData.description.trim();
  }

  // Use observation if provided
  if (rawData.observation && rawData.observation.trim()) {
    return rawData.observation.trim();
  }

  // Use name if provided
  if (rawData.name && rawData.name.trim()) {
    return rawData.name.trim();
  }

  return baseDescriptions[eventType as keyof typeof baseDescriptions] || 'Farming activity';
}

/**
 * Generate event title using the same logic as preview
 * 🚨 CRITICAL FIX: This ensures preview and ProductDetail show identical titles
 */
function generateTitle(eventType: number, rawData: any): string {
  try {
    // Use the same title generation logic as eventDescriptions.ts
    const description = rawData.description || '';
    const eventData = { ...rawData, event_type: eventType };
    const eventDescriptions = getConsumerEventDescription(description, eventData);
    if (eventDescriptions?.title) {
      return eventDescriptions.title;
    }
  } catch (error) {
    console.error('Error generating title from eventDescriptions:', error);
  }

  // Fallback title generation for specific event types
  switch (eventType) {
    case 0: // Weather
      return rawData.weather_type || rawData.name || 'Weather Event';

    case 1: // Production
      return rawData.name || rawData.production_event_name || 'Production Activity';

    case 2: // Chemical
      const chemicalType = rawData.chemical_type || rawData.type;
      const productName = rawData.product_name || rawData.name;
      if (productName) {
        return `${chemicalType || 'Chemical'} Application`;
      }
      return chemicalType || 'Chemical Application';

    case 3: // General
      return rawData.name || rawData.general_event_name || 'General Activity';

    case 4: // Equipment
      return rawData.name || rawData.equipment_name || 'Equipment Operation';

    case 5: // Soil Management
      // 🎯 SPECIFIC FIX for soil management title generation
      if (rawData.soil_management_name && rawData.soil_management_name.trim()) {
        return rawData.soil_management_name;
      }
      if (rawData.name && rawData.name.trim()) {
        return rawData.name;
      }
      if (rawData.soil_management_type && rawData.soil_management_type.trim()) {
        return rawData.soil_management_type;
      }
      return 'Soil Management';

    case 6: // Pest Management
      return rawData.name || rawData.pest_management_name || 'Pest Management';

    case 7: // Business
      return rawData.name || rawData.business_event_name || 'Business Activity';

    default:
      return rawData.name || 'Agricultural Activity';
  }
}

/**
 * Normalize weather event specific data
 */
function normalizeWeatherEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedWeatherEvent> {
  const weatherData: Partial<StandardizedWeatherEvent> = {};

  // Map weather-specific fields
  const weatherFields = [
    'weather_type',
    'lower_temperature',
    'highest_temperature',
    'way_of_protection',
    'protection_measures',
    'water_deficit',
    'weight',
    'diameter',
    'duration',
    'wind_speed',
    'precipitation_amount',
    'humidity_level',
    'damage_assessment',
    'crop_impact',
    'start_date',
    'end_date',
    'average_hailstone_weight',
    'average_hailstone_diameter'
  ];

  // Handle extra_data fields for weather events
  if (rawData.extra_data) {
    weatherFields.forEach((field) => {
      const sourceField = getSourceField(field, fieldMapping);
      if (rawData.extra_data[sourceField] !== undefined) {
        (weatherData as any)[field] = rawData.extra_data[sourceField];
      }
    });
  }

  // Handle direct fields
  weatherFields.forEach((field) => {
    const sourceField = getSourceField(field, fieldMapping);
    if (rawData[sourceField] !== undefined) {
      (weatherData as any)[field] = rawData[sourceField];
    }
  });

  return weatherData;
}

/**
 * Normalize production event specific data
 */
function normalizeProductionEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedProductionEvent> {
  const productionData: Partial<StandardizedProductionEvent> = {};

  // Handle production name
  if (rawData.name || rawData.production_name) {
    productionData.production_name = rawData.name || rawData.production_name;
  }

  // Handle production type
  if (rawData.type || rawData.production_type) {
    productionData.production_type = rawData.type || rawData.production_type;
  }

  if (dataSource === 'form') {
    // Form data needs unit formatting
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'area_covered',
      'area',
      'area_unit',
      'hectares'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'yield_quantity',
      'quantity_planted',
      'yield_unit',
      'kg'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'fuel_consumed',
      'fuel_amount',
      'fuel_unit',
      'liters'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'equipment_hours',
      'operating_hours',
      null,
      'hours'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'transportation_distance',
      'transportation_distance',
      'transportation_unit',
      'km'
    );

    // Store raw values
    storeRawValue(rawData, productionData, 'area_covered_raw', 'area_covered', 'area');
    storeRawValue(
      rawData,
      productionData,
      'yield_quantity_raw',
      'yield_quantity',
      'quantity_planted',
      'quantity'
    );
    storeRawValue(rawData, productionData, 'fuel_consumed_raw', 'fuel_consumed', 'fuel_amount');
    storeRawValue(
      rawData,
      productionData,
      'equipment_hours_raw',
      'equipment_hours',
      'operating_hours'
    );
    storeRawValue(
      rawData,
      productionData,
      'transportation_distance_raw',
      'transportation_distance'
    );

    // Sprint 2: EQ (Equipment Operations) subtype fields extraction
    if (productionData.production_type === 'EQ') {
      // Extract EQ-specific fields from form data
      if (rawData.equipment_operation_type) {
        // Convert operation type code to display name
        (productionData as any).equipment_operation_type = getEquipmentOperationTypeDisplayName(
          rawData.equipment_operation_type
        );
      }
      if (rawData.equipment_type) {
        // Convert equipment type code to display name
        (productionData as any).equipment_type = getEquipmentTypeDisplayName(
          rawData.equipment_type
        );
      }
      if (rawData.fuel_type) {
        // Convert fuel type code to display name
        (productionData as any).fuel_type = getFuelTypeDisplayName(rawData.fuel_type);
      }
      if (rawData.operation_efficiency) {
        // Convert efficiency code to display name
        (productionData as any).operation_efficiency = getOperationEfficiencyDisplayName(
          rawData.operation_efficiency
        );
      }
    }

    // Sprint 3 Epic 3.2: Consumer Trust Fields for Production events
    if (rawData.seeds_source) {
      (productionData as any).seeds_source = rawData.seeds_source;
    }
    if (rawData.water_source) {
      (productionData as any).water_source = rawData.water_source;
    }
    // ENHANCED: USDA NASS 2023 irrigation water estimation fields
    if (rawData.irrigation_method) {
      (productionData as any).irrigation_method = rawData.irrigation_method;
    }
    if (rawData.irrigation_depth) {
      (productionData as any).irrigation_depth = rawData.irrigation_depth;
    }
    if (rawData.irrigation_depth_unit) {
      (productionData as any).irrigation_depth_unit = rawData.irrigation_depth_unit;
    }
  } else {
    // Backend data already formatted
    if (rawData.area_covered) productionData.area_covered = rawData.area_covered;
    if (rawData.yield_quantity) productionData.yield_quantity = rawData.yield_quantity;
    if (rawData.fuel_consumed) productionData.fuel_consumed = rawData.fuel_consumed;
    if (rawData.equipment_hours) productionData.equipment_hours = rawData.equipment_hours;
    if (rawData.transportation_distance)
      productionData.transportation_distance = rawData.transportation_distance;

    // Sprint 3 Epic 3.2: Consumer Trust Fields for Production events (backend)
    if (rawData.seeds_source) {
      (productionData as any).seeds_source = rawData.seeds_source;
    }
    if (rawData.water_source) {
      (productionData as any).water_source = rawData.water_source;
    }
    // ENHANCED: USDA NASS 2023 irrigation water estimation fields (backend)
    if (rawData.irrigation_method) {
      (productionData as any).irrigation_method = rawData.irrigation_method;
    }
    if (rawData.irrigation_depth) {
      (productionData as any).irrigation_depth = rawData.irrigation_depth;
    }
    if (rawData.irrigation_depth_unit) {
      (productionData as any).irrigation_depth_unit = rawData.irrigation_depth_unit;
    }

    // Sprint 2: EQ (Equipment Operations) subtype fields extraction from backend
    if (productionData.production_type === 'EQ' || rawData.production_type === 'EQ') {
      if (rawData.equipment_operation_type) {
        // Convert operation type code to display name
        (productionData as any).equipment_operation_type = getEquipmentOperationTypeDisplayName(
          rawData.equipment_operation_type
        );
      }
      if (rawData.equipment_type) {
        (productionData as any).equipment_type = rawData.equipment_type;
      }
      if (rawData.fuel_type) {
        (productionData as any).fuel_type = rawData.fuel_type;
      }
      if (rawData.operation_efficiency) {
        (productionData as any).operation_efficiency = rawData.operation_efficiency;
      }
    }
  }

  return productionData;
}

/**
 * Normalize chemical event specific data
 */
function normalizeChemicalEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedChemicalEvent> {
  const chemicalData: Partial<StandardizedChemicalEvent> = {};

  // Map chemical-specific fields
  const chemicalFields = [
    'chemical_type',
    'chemical_subtype', // Added 2025-01-21: For organic vs synthetic differentiation in carbon calculations
    'commercial_name',
    'active_ingredient',
    'application_method',
    'target_pest_disease',
    'area_treated',
    'area_unit',
    'volume_applied',
    'volume_unit',
    'concentration',
    'npk_ratio',
    'nitrogen_percentage',
    'phosphorus_percentage',
    'potassium_percentage',
    'application_timing',
    'weather_conditions',
    // EPA WPS Compliance Fields - 40 CFR 170.309
    'applicator_name',
    'epa_registration_number',
    'restricted_use_pesticide',
    'applicator_certification',
    'rei_hours',
    'phi_days',
    // Sprint 1 Epic 1.1: Additional EPA WPS Fields
    'signal_word',
    'ppe_required',
    'environmental_hazards',
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'organic_approved',
    'buffer_zone_meters'
  ];

  mapFields(rawData, chemicalData, chemicalFields, fieldMapping);

  // *** CRITICAL FIX: Parse combined backend API fields ***
  // The backend transparency API returns combined string fields like "20 ha" and "10 L"
  // but the frontend expects separate numeric and unit fields
  if (dataSource === 'backend') {
    console.log('🔧 CHEMICAL NORMALIZATION - Processing backend data:', {
      eventId: rawData.id,
      area: rawData.area,
      volume: rawData.volume,
      application_timing: rawData.application_timing,
      way_of_application: rawData.way_of_application
    });

    // Parse area field (e.g., "20 ha" → area_treated: 20, area_unit: "ha")
    if (rawData.area && typeof rawData.area === 'string') {
      const areaMatch = rawData.area.match(/^([0-9.]+)\s*(.+)$/);
      if (areaMatch) {
        chemicalData.area_treated = parseFloat(areaMatch[1]);
        chemicalData.area_unit = areaMatch[2];
        console.log(
          '✅ Parsed area field:',
          rawData.area,
          '→',
          chemicalData.area_treated,
          chemicalData.area_unit
        );
      }
    }

    // Parse volume field (e.g., "10 L" → volume_applied: 10, volume_unit: "L")
    if (rawData.volume && typeof rawData.volume === 'string') {
      const volumeMatch = rawData.volume.match(/^([0-9.]+)\s*(.+)$/);
      if (volumeMatch) {
        chemicalData.volume_applied = parseFloat(volumeMatch[1]);
        chemicalData.volume_unit = volumeMatch[2];
        console.log(
          '✅ Parsed volume field:',
          rawData.volume,
          '→',
          chemicalData.volume_applied,
          chemicalData.volume_unit
        );
      }
    }

    // Handle direct backend fields that are sometimes missing in mapping
    if (rawData.application_timing && !chemicalData.application_timing) {
      chemicalData.application_timing = rawData.application_timing;
      console.log('✅ Direct mapped application_timing:', rawData.application_timing);
    }

    // Map way_of_application to application_method for backend compatibility
    if (rawData.way_of_application && !chemicalData.application_method) {
      chemicalData.application_method = rawData.way_of_application;
      console.log(
        '✅ Mapped way_of_application to application_method:',
        rawData.way_of_application
      );
    }

    console.log('🎯 FINAL CHEMICAL NORMALIZED DATA:', {
      eventId: rawData.id,
      area_treated: chemicalData.area_treated,
      area_unit: chemicalData.area_unit,
      volume_applied: chemicalData.volume_applied,
      volume_unit: chemicalData.volume_unit,
      application_timing: chemicalData.application_timing,
      application_method: chemicalData.application_method
    });
  }

  // Handle special cases - prioritize chemical_type field from backend
  if (rawData.chemical_type && ['FE', 'PE', 'FU', 'HE'].includes(rawData.chemical_type)) {
    chemicalData.chemical_type = rawData.chemical_type;
  } else if (rawData.type && ['FE', 'PE', 'FU', 'HE'].includes(rawData.type)) {
    chemicalData.chemical_type = rawData.type;
  }

  return chemicalData;
}

/**
 * Normalize general event specific data
 */
function normalizeGeneralEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedGeneralEvent> {
  const generalData: Partial<StandardizedGeneralEvent> = {};

  // Map general-specific fields
  const generalFields = [
    'activity_type',
    'activity_name',
    'duration_raw',
    'people_involved',
    'activity_notes'
  ];

  mapFields(rawData, generalData, generalFields, fieldMapping);

  // Handle duration formatting
  if (generalData.duration_raw !== undefined) {
    generalData.duration = `${generalData.duration_raw} hours`;
  }

  return generalData;
}

/**
 * Normalize equipment event specific data
 */
function normalizeEquipmentEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedEquipmentEvent> {
  const equipmentData: Partial<StandardizedEquipmentEvent> = {};

  // Map equipment-specific fields
  const equipmentFields = [
    'operation_type',
    'operation_name',
    'equipment_type',
    'fuel_consumed',
    'fuel_type',
    'hours_operated',
    'area_worked',
    'operation_efficiency',
    'operation_notes'
  ];

  mapFields(rawData, equipmentData, equipmentFields, fieldMapping);

  // 🚨 CRITICAL FIX: Apply display name transformations
  // PROBLEM: Preview was showing codes instead of proper display names
  // SOLUTION: Convert all Equipment field codes to proper display names

  // Fix fuel type: "natural_gas" → "Natural Gas"
  if (equipmentData.fuel_type) {
    equipmentData.fuel_type = getFuelTypeDisplayName(equipmentData.fuel_type);
  }

  // Fix equipment type: "tractor" → "🚜 Tractor"
  if (equipmentData.equipment_type) {
    equipmentData.equipment_type = getEquipmentTypeDisplayName(equipmentData.equipment_type);
  }

  // Fix operation efficiency: "high" → "High"
  if (equipmentData.operation_efficiency) {
    equipmentData.operation_efficiency = getOperationEfficiencyDisplayName(
      equipmentData.operation_efficiency
    );
  }

  // *** CRITICAL FIX: Handle different backend API structures for Equipment events ***
  if (dataSource === 'backend') {
    // Check if this is detailed event data (from form submission) or simplified data (from /complete endpoint)
    const hasDetailedFields = !!(
      rawData.area_worked ||
      rawData.fuel_consumed ||
      rawData.hours_operated
    );

    if (hasDetailedFields) {
      // Handle detailed event data with combined fields parsing

      // Parse area_worked field (e.g., "3 ha" → area_worked: 3, area_unit: "ha")
      if (rawData.area_worked && typeof rawData.area_worked === 'string') {
        const areaMatch = rawData.area_worked.match(/^([0-9.]+)\s*(.+)$/);
        if (areaMatch) {
          equipmentData.area_worked = parseFloat(areaMatch[1]);
          equipmentData.area_unit = areaMatch[2];
          console.log(
            '✅ Parsed area_worked field:',
            rawData.area_worked,
            '→',
            equipmentData.area_worked,
            equipmentData.area_unit
          );
        }
      }

      // Parse fuel_consumed field (e.g., "1 L" → fuel_consumed: 1, fuel_unit: "L")
      if (rawData.fuel_consumed && typeof rawData.fuel_consumed === 'string') {
        const fuelMatch = rawData.fuel_consumed.match(/^([0-9.]+)\s*(.+)$/);
        if (fuelMatch) {
          equipmentData.fuel_consumed = parseFloat(fuelMatch[1]);
          equipmentData.fuel_unit = fuelMatch[2];
          console.log(
            '✅ Parsed fuel_consumed field:',
            rawData.fuel_consumed,
            '→',
            equipmentData.fuel_consumed,
            equipmentData.fuel_unit
          );
        }
      }

      // Parse hours_operated field (e.g., "2 hours" → hours_operated: 2)
      if (rawData.hours_operated && typeof rawData.hours_operated === 'string') {
        const hoursMatch = rawData.hours_operated.match(/^([0-9.]+)/);
        if (hoursMatch) {
          equipmentData.hours_operated = parseFloat(hoursMatch[1]);
          console.log(
            '✅ Parsed hours_operated field:',
            rawData.hours_operated,
            '→',
            equipmentData.hours_operated
          );
        }
      }
    } else {
      // Handle simplified event data from /complete endpoint
      // Extract information from description and equipment fields when available
      console.log('🔧 SIMPLIFIED EQUIPMENT DATA - Using description parsing');
      console.log('🚨 DEBUG RAW BACKEND DATA:', JSON.stringify(rawData, null, 2));

      // Set basic operation type based on string type
      if (rawData.type === 'equipment') {
        // CRITICAL: Use actual operation_type from backend instead of hardcoding 'FC'
        equipmentData.operation_type = rawData.operation_type || 'FC'; // Use backend type or fallback to FC

        // Generate specific operation names based on actual Equipment subtype
        let operationName = 'Equipment Operation'; // Fallback

        // 🚨 CRITICAL FIX: Map Equipment codes to match eventPreviewUtils exactly
        // MUST match EQUIPMENT_OPERATION_LABELS from eventPreviewUtils.ts for exact preview-display matching
        switch (rawData.operation_type || rawData.operation_type_code) {
          case 'MN':
            operationName = 'Maintenance'; // EXACT MATCH: eventPreviewUtils uses "Maintenance"
            break;
          case 'RE':
            operationName = 'Repair'; // EXACT MATCH: eventPreviewUtils uses "Repair"
            break;
          case 'CA':
            operationName = 'Calibration'; // EXACT MATCH: eventPreviewUtils uses "Calibration"
            break;
          case 'FC':
            operationName = 'Fuel Consumption'; // EXACT MATCH: eventPreviewUtils uses "Fuel Consumption"
            break;
          case 'BD':
            operationName = 'Breakdown'; // EXACT MATCH: eventPreviewUtils uses "Breakdown"
            break;
          case 'EI':
            operationName = 'Inspection'; // EXACT MATCH: eventPreviewUtils uses "Inspection"
            break;
          default:
            // 🚨 CRITICAL FIX: Fallback to description-based parsing with exact matching
            const description = rawData.description || '';
            if (description.toLowerCase().includes('maintenance')) {
              operationName = 'Maintenance'; // EXACT MATCH: no "Equipment" prefix
            } else if (description.toLowerCase().includes('repair')) {
              operationName = 'Repair'; // EXACT MATCH: no "Equipment" prefix
            } else if (description.toLowerCase().includes('calibration')) {
              operationName = 'Calibration'; // EXACT MATCH: no "Equipment" prefix
            } else if (description.toLowerCase().includes('breakdown')) {
              operationName = 'Breakdown'; // EXACT MATCH: no "Equipment" prefix
            } else if (description.toLowerCase().includes('inspection')) {
              operationName = 'Inspection'; // EXACT MATCH: no "Equipment" prefix
            } else if (description.toLowerCase().includes('tractor')) {
              operationName = 'Tractor Operation';
            } else if (
              description.toLowerCase().includes('plow') ||
              description.toLowerCase().includes('till')
            ) {
              operationName = 'Field Plowing with Tractor';
            } else if (description.toLowerCase().includes('harvest')) {
              operationName = 'Harvesting Equipment';
            } else if (
              description.toLowerCase().includes('spray') ||
              description.toLowerCase().includes('application')
            ) {
              operationName = 'Spraying Equipment';
            } else if (
              description.toLowerCase().includes('fuel') ||
              description.toLowerCase().includes('consumption')
            ) {
              operationName = 'Fuel Consumption Tracking';
            } else {
              // Try to extract first meaningful word from description
              const words = description
                .split(' ')
                .filter(
                  (word: string) =>
                    word.length > 3 &&
                    !['with', 'the', 'and', 'for', 'that', 'this', 'been'].includes(
                      word.toLowerCase()
                    )
                );
              if (words.length > 0) {
                const firstWord = words[0];
                // Capitalize first letter
                operationName = `${
                  firstWord.charAt(0).toUpperCase() + firstWord.slice(1)
                } Operation`;
              }
            }
        }

        equipmentData.operation_name = operationName;
        equipmentData.equipment_type = rawData.equipment || 'Equipment'; // Use equipment field or fallback
      }

      // Try to extract numeric values from description if possible
      if (rawData.description && typeof rawData.description === 'string') {
        const description = rawData.description.toLowerCase();

        // Look for fuel consumption patterns
        const fuelMatch = description.match(/(\d+(?:\.\d+)?)\s*(l|liters?|gallons?|gal)/i);
        if (fuelMatch) {
          equipmentData.fuel_consumed = parseFloat(fuelMatch[1]);
          equipmentData.fuel_unit = fuelMatch[2].toLowerCase().includes('l') ? 'L' : 'gal';
        }

        // Look for area patterns
        const areaMatch = description.match(/(\d+(?:\.\d+)?)\s*(ha|hectares?|acres?|ac)/i);
        if (areaMatch) {
          equipmentData.area_worked = parseFloat(areaMatch[1]);
          equipmentData.area_unit =
            areaMatch[2].toLowerCase().includes('ha') || areaMatch[2].toLowerCase().includes('hect')
              ? 'ha'
              : 'ac';
        }

        // Look for hours patterns
        const hoursMatch = description.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?)/i);
        if (hoursMatch) {
          equipmentData.hours_operated = parseFloat(hoursMatch[1]);
        }
      }
    }

    // Handle direct backend fields that might be missing in mapping
    if (rawData.operation_type && !equipmentData.operation_type) {
      equipmentData.operation_type = rawData.operation_type;
    }

    if (rawData.type && !equipmentData.operation_type && rawData.type !== 'equipment') {
      equipmentData.operation_type = rawData.type;
    }

    if (rawData.operation_name && !equipmentData.operation_name) {
      equipmentData.operation_name = rawData.operation_name;
    }

    if (rawData.name && !equipmentData.operation_name) {
      equipmentData.operation_name = rawData.name;
    }
  }

  return equipmentData;
}

/**
 * Normalize soil management event specific data
 */
function normalizeSoilManagementEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedSoilManagementEvent> {
  const soilData: Partial<StandardizedSoilManagementEvent> = {};

  // Map soil-specific fields
  const soilFields = [
    'soil_management_type',
    'soil_management_name',
    'area_managed',
    'area_unit',
    'working_depth',
    'depth_unit',
    'area_covered',
    'fuel_consumed',
    'fuel_unit',
    'equipment_hours',
    'transportation_distance',
    'transportation_unit',
    'soil_ph',
    'organic_matter',
    'soil_texture',
    'soil_moisture',
    'weather_conditions',
    'temperature_range',
    'equipment_used',
    'tillage_type',
    'tillage_intensity',
    'tillage_direction',
    'residue_management',
    'soil_management_notes',
    'production_efficiency',
    // ENHANCED: IPCC 2006 lime dissolution fields (PA events)
    'amendment_amount',
    'amendment_unit',
    'amendment_type',
    // ENHANCED: Tillage depth fields for soil CO2 flux calculation (TI events)
    'tillage_depth',
    'tillage_depth_unit',
    'depth'
  ];

  mapFields(rawData, soilData, soilFields, fieldMapping);

  // Handle direct field mapping for amendment and tillage fields
  if (rawData.amendment_amount !== undefined) {
    soilData.amendment_amount = rawData.amendment_amount;
  }
  if (rawData.amendment_unit !== undefined) {
    soilData.amendment_unit = rawData.amendment_unit;
  }
  if (rawData.amendment_type !== undefined) {
    soilData.amendment_type = rawData.amendment_type;
  }
  if (rawData.tillage_depth !== undefined) {
    soilData.tillage_depth = rawData.tillage_depth;
  }
  if (rawData.tillage_depth_unit !== undefined) {
    soilData.tillage_depth_unit = rawData.tillage_depth_unit;
  }
  // Handle depth → tillage_depth mapping for TI events
  if (rawData.depth !== undefined && !soilData.tillage_depth) {
    soilData.tillage_depth = rawData.depth;
  }
  if (rawData.depth_unit !== undefined && !soilData.tillage_depth_unit) {
    soilData.tillage_depth_unit = rawData.depth_unit;
  }

  return soilData;
}

/**
 * Normalize pest management event specific data
 */
function normalizePestManagementEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedPestManagementEvent> {
  const pestData: Partial<StandardizedPestManagementEvent> = {};

  // Map pest-specific fields
  const pestFields = [
    'pest_management_type',
    'pest_management_name',
    'pest_species',
    'damage_percentage',
    'pest_pressure_level',
    'time_spent_hours',
    'field_area_hectares',
    'trap_count',
    'beneficial_species',
    'release_quantity',
    'economic_threshold_met',
    'travel_distance_km',
    'weather_conditions',
    'crop_growth_stage',
    'action_recommended',
    'action_threshold_met',
    'imp_strategy',
    'pest_management_notes',
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'beneficial_insects_used',
    'chemical_free_period_days'
  ];

  mapFields(rawData, pestData, pestFields, fieldMapping);

  return pestData;
}

/**
 * Normalize business event specific data
 */
function normalizeBusinessEventData(
  rawData: any,
  dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedBusinessEvent> {
  const businessData: Partial<StandardizedBusinessEvent> = {};

  // Map business-specific fields
  const businessFields = [
    'business_event_type',
    'business_event_name',
    'business_activity_type',
    'certification_type',
    'carbon_credits_earned',
    'carbon_credits_unit',
    'verification_status',
    'sustainability_practice',
    'trust_impact',
    'transparency_benefit',
    'business_observation',
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'verified_certifier_name'
  ];

  mapFields(rawData, businessData, businessFields, fieldMapping);

  return businessData;
}

/**
 * Helper function to map fields using the field mapping
 */
function mapFields(
  rawData: any,
  targetData: any,
  fieldList: string[],
  fieldMapping: Record<string, string>
): void {
  fieldList.forEach((targetField) => {
    const sourceField = getSourceField(targetField, fieldMapping);
    if (rawData[sourceField] !== undefined && rawData[sourceField] !== null) {
      targetData[targetField] = rawData[sourceField];
    }
  });
}

/**
 * Helper function to get source field name from target field using reverse mapping
 */
function getSourceField(targetField: string, fieldMapping: Record<string, string>): string {
  // Find the source field that maps to this target field
  for (const [sourceField, mappedTargetField] of Object.entries(fieldMapping)) {
    if (mappedTargetField === targetField) {
      return sourceField;
    }
  }
  return targetField; // Return original if no mapping found
}

/**
 * Helper function to format production fields with units
 */
function formatProductionFieldWithUnit(
  rawData: any,
  targetData: any,
  targetField: string,
  primarySource: string,
  unitField: string | null,
  defaultUnit: string
): void {
  const value = rawData[primarySource] || rawData[targetField];
  if (value !== undefined && value !== null && value !== '') {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      const unit = unitField ? rawData[unitField] || defaultUnit : defaultUnit;
      targetData[targetField] = `${numValue} ${unit}`;
    }
  }
}

/**
 * Helper function to store raw numeric values
 */
function storeRawValue(
  rawData: any,
  targetData: any,
  targetField: string,
  ...sourceFields: string[]
): void {
  for (const sourceField of sourceFields) {
    if (
      rawData[sourceField] !== undefined &&
      rawData[sourceField] !== null &&
      rawData[sourceField] !== ''
    ) {
      const numValue = parseFloat(rawData[sourceField]);
      if (!isNaN(numValue)) {
        targetData[targetField] = numValue;
        break;
      }
    }
  }
}

/**
 * Auto-detect data source and normalize accordingly
 */
export function createStandardizedEvent(
  eventType: number,
  rawData: any,
  options: NormalizationOptions = {}
): StandardizedEvent {
  // Auto-detect data source based on data characteristics
  const dataSource = detectDataSource(rawData);
  return normalizeEventData(eventType, rawData, dataSource, options);
}

/**
 * Detect data source based on data characteristics
 */
function detectDataSource(rawData: any): DataSource {
  // Backend data typically has these characteristics:
  if (rawData.production_name || rawData.business_event_type || rawData.soil_management_type) {
    return 'backend';
  }

  // Form data typically has these characteristics:
  if (rawData.acceptedFiles || rawData.imageUrls) {
    return 'form';
  }

  // Default to form if uncertain
  return 'form';
}

/**
 * Utility function to normalize a batch of events
 */
export function normalizeEventBatch(
  events: Array<{ eventType: number; data: any }>,
  dataSource: DataSource,
  options: NormalizationOptions = {}
): StandardizedEvent[] {
  return events.map(({ eventType, data }) =>
    normalizeEventData(eventType, data, dataSource, options)
  );
}
