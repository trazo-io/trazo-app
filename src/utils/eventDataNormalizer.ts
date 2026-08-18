/**
 * Event Data Normalization Layer
 *
 * This file contains functions to transform event data from different sources
 * (form data, backend API) into standardized event objects with consistent
 * field naming and structure.
 */

import { resolveBusinessSubtype } from '../config/events/businessSubtype';
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
import { productionEventRegistry } from 'src/config/events/productionEvent';

/**
 * Keys the production normalizer OWNS: it rewrites, renames or re-labels them rather than
 * copying them through. The registry-driven carry-over must leave these alone, or it would
 * restore the raw value on top of the normalized one.
 */
const NORMALIZER_OWNED_KEYS: ReadonlySet<string> = new Set([
  'name', // -> production_name
  'type', // -> production_type
  'method',
  'harvest_method',
  'equipment_type',
  'equipment_operation_type',
  'observation',
  'description'
]);

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
    EI: 'Inspection',
    CL: 'Cleaning'
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
  const normalized = buildNormalizedEvent(eventType, rawData, dataSource, options);

  // Per-type builders can synthesize a sub-type key the raw payload never had — form-sourced
  // business events, for instance, only gain `business_event_type: 'CE'` inside
  // normalizeBusinessEventData, well after createBaseEvent ran. Resolve again against the
  // merged result so `event.subtype` agrees with what extractSubtypeCode(event) would say.
  if (!normalized.subtype) {
    const resolved = extractSubtypeCode(normalized);
    if (resolved) normalized.subtype = resolved;
  }

  return normalized;
}

function buildNormalizedEvent(
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
 * Resolve the two-letter sub-type code from whichever per-family key the payload carries.
 *
 * The consumer API names this key differently per event family (`chemical_type`,
 * `production_type`, `soil_management_type`, …); form-preview payloads and legacy rows
 * just use `type`. Mirrors the resolution order the field-registry bridge already uses in
 * ConsumerEventCard so both paths agree on what the sub-type is.
 */
export function extractSubtypeCode(rawData: any): string | undefined {
  if (!rawData) return undefined;

  const candidates = [
    rawData.subtype,
    rawData.weather_type,
    rawData.production_type,
    rawData.chemical_type,
    rawData.soil_management_type,
    rawData.pest_management_type,
    rawData.business_event_type,
    rawData.operation_type, // equipment family
    rawData.type
  ];

  // Every sub-type code in the system is exactly two upper-case letters (FE, HA, CL, …).
  // `type` in particular is NOT always a code — post-normalization it holds the family
  // name ('chemical'), and a general event holds an activity slug ('maintenance').
  // Test each candidate rather than taking the first truthy one, so an unrecognised value
  // in an earlier slot falls through to a valid code in a later one instead of yielding
  // undefined.
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue;
    const trimmed = candidate.trim();
    if (/^[A-Z]{2}$/.test(trimmed)) return trimmed;
  }

  return undefined;
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
    // NOTE: `type` becomes the event FAMILY name here, overwriting whatever sub-type code
    // the backend sent. Chapter routing and the registry bridge depend on that, so it
    // stays — but it means `event.type === 'FE'` can never be true downstream. `subtype`
    // below preserves the code so sub-type branches (aggregate totals, summary badges)
    // actually fire.
    type: EVENT_TYPE_MAP[eventType as keyof typeof EVENT_TYPE_MAP] || 'general',
    subtype: extractSubtypeCode(rawData),
    title: generateTitle(eventType, rawData), // 🚨 CRITICAL FIX: Add title generation
    // Only show farmer's actual notes — no generated fallback text
    // "Farmer's Field Notes" should only appear when the farmer wrote something
    description: rawData.observation?.trim() || rawData.description?.trim() || '',
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
    'usda_factors_used',
    'carbon_impact',
    // Sprint 5.1 — OSP ↔ events drift detector. Pass-through so the producer
    // dashboard's DriftFindingsBanner can detect drift on normalized events.
    'drift_warning'
  ];

  commonFields.forEach((field) => {
    if (rawData[field] !== undefined && rawData[field] !== null) {
      (baseEvent as any)[field] = rawData[field];
    }
  });

  // REMOVED 2026-08-01: `observation = description` fallback.
  //
  // It was added so "Farmer's Field Notes" would appear for events whose notes sat in
  // `description`. But ConsumerEventCard renders `observation` in QUOTATION MARKS, italic,
  // attributed to the farmer — and its own comment says the opposite of what this did:
  //
  //     description contains system-generated text (template names, etc.) and must NOT be
  //     shown as "Farmer's Field Notes" — that would be dishonest to consumers.
  //
  // The two were written to opposite intentions and this one won. With 328+ AI templates
  // generating descriptions, the effect on a public page is machine copy in quotes presented
  // as a grower's own words. Found on the live walnut fixture, whose `observation` is null
  // while the card displayed its CFR-citing description as a quote.
  //
  // Nothing is lost: the event FORM has its own "Observations & Notes" field bound to
  // `observation`, so anything a farmer actually typed still renders. Preview/consumer parity
  // improves — both surfaces now show notes when, and only when, notes exist.

  // Handle photo/album data
  baseEvent.album = normalizePhotoData(rawData);

  // Handle extra_data
  if (rawData.extra_data && typeof rawData.extra_data === 'object') {
    baseEvent.extra_data = { ...rawData.extra_data };
  }

  // 🚨 CRITICAL FIX: Preserve custom_fields from backend/form data
  // Custom fields MUST be passed through to EventPreviewModal and ConsumerEventCard
  // for exact preview-display matching
  if (rawData.custom_fields && Array.isArray(rawData.custom_fields)) {
    (baseEvent as any).custom_fields = rawData.custom_fields;
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
  // MVP Photo Verification: Handle album_images array (from NewEvent form)
  if (
    rawData.album_images &&
    Array.isArray(rawData.album_images) &&
    rawData.album_images.length > 0
  ) {
    return {
      id: 'preview-album',
      images: rawData.album_images.map((url: string, index: number) => {
        // Create stable ID from URL
        const stableId = url
          ? url
              .split('/')
              .slice(-2)
              .join('_')
              .replace(/[^a-zA-Z0-9]/g, '_')
              .substring(0, 30)
          : `album-${index}`;

        return {
          id: stableId,
          image_url: url,
          image: url,
          caption: `Farm photo ${index + 1}`,
          created_at: new Date().toISOString()
        };
      })
    };
  }

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
  event.usda_factors_used = false; // Preview mode
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
    6: 'Pest management activity',
    7: 'Business and compliance activity'
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

    case 5: {
      // Soil Management
      if (rawData.soil_management_name && rawData.soil_management_name.trim()) {
        return rawData.soil_management_name;
      }
      if (rawData.name && rawData.name.trim()) {
        return rawData.name;
      }
      // Map subtype codes to consumer-friendly titles
      const soilTitleMap: Record<string, string> = {
        ST: 'Soil Testing & Analysis',
        PA: 'pH Adjustment',
        OM: 'Organic Matter Addition',
        CC: 'Cover Crop Management',
        TI: 'Tillage Implementation',
        CO: 'Composting Operation'
      };
      const soilType = rawData.soil_management_type || rawData.type;
      if (soilType && soilTitleMap[soilType]) return soilTitleMap[soilType];
      return 'Soil Management';
    }

    case 6: {
      // Pest Management
      if (rawData.name && rawData.name.trim()) return rawData.name;
      if (rawData.extra_data?.name && rawData.extra_data.name.trim())
        return rawData.extra_data.name;
      if (rawData.pest_management_name && rawData.pest_management_name.trim())
        return rawData.pest_management_name;
      const pestTitleMap: Record<string, string> = {
        SC: 'Pest Scouting',
        BR: 'Beneficial Insect Release',
        TM: 'Trap Monitoring',
        PI: 'Pest Identification',
        TA: 'Threshold Assessment',
        IP: 'IPM Implementation'
      };
      const pestType = rawData.pest_management_type || rawData.type;
      if (pestType && pestTitleMap[pestType]) return pestTitleMap[pestType];
      return 'Pest Management Activity';
    }

    case 7: {
      // Business
      if (rawData.name && rawData.name.trim()) return rawData.name;
      if (rawData.business_event_name && rawData.business_event_name.trim())
        return rawData.business_event_name;
      // Map certification types to consumer-friendly titles
      const certMap: Record<string, string> = {
        global_gap: 'GlobalG.A.P. Certification',
        organic_usda: 'USDA Organic Certification',
        regenerative: 'Regenerative Organic Certification',
        cng: 'Certified Naturally Grown',
        non_gmo: 'Non-GMO Project Verified',
        carbon_neutral: 'Carbon Neutral Certification',
        rainforest_alliance: 'Rainforest Alliance',
        fair_trade: 'Fair Trade Certified',
        water_stewardship: 'Water Stewardship Certification',
        sustainable_agriculture: 'Sustainable Agriculture'
      };
      if (rawData.certification_type && certMap[rawData.certification_type]) {
        return certMap[rawData.certification_type];
      }
      if (rawData.certification_type_display) return rawData.certification_type_display;
      const bizTypeMap: Record<string, string> = {
        CE: 'Certification Event',
        CM: 'Compliance Activity',
        IN: 'Inspection Process'
      };
      const bizType = rawData.business_event_type || rawData.type;
      if (bizType && bizTypeMap[bizType]) return bizTypeMap[bizType];
      return 'Business Activity';
    }

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
    'temperature_unit', // Companion unit for lower_temperature (FR) + highest_temperature (HT)
    'way_of_protection',
    'protection_measures',
    'water_deficit',
    // Ghost field cleanup: Removed weight, diameter, average_hailstone_weight, average_hailstone_diameter
    // (removed from form Sprint 2 Epic 2.1.3)
    'duration',
    'wind_speed',
    'precipitation_amount',
    'humidity_level',
    'damage_assessment',
    'crop_impact',
    'start_date',
    'end_date'
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
    // 🚨 CRITICAL FIX: Use correct source field names that match ProductionTab form
    // ProductionTab sends: area_covered, yield_quantity, fuel_consumed, equipment_hours
    // NOT: area, quantity_planted, fuel_amount, operating_hours

    // Form data needs unit formatting
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'area_covered',
      'area_covered', // ✅ FIXED: Changed from 'area' to 'area_covered'
      'area_unit',
      'hectares'
    );

    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'yield_quantity',
      'yield_quantity', // ✅ FIXED: Changed from 'quantity_planted' to 'yield_quantity'
      'yield_unit',
      'kg'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'fuel_consumed',
      'fuel_consumed', // ✅ FIXED: Changed from 'fuel_amount' to 'fuel_consumed'
      'fuel_unit',
      'liters'
    );
    formatProductionFieldWithUnit(
      rawData,
      productionData,
      'equipment_hours',
      'equipment_hours', // ✅ FIXED: Changed from 'operating_hours' to 'equipment_hours'
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

    // Store raw values - use correct source field names
    storeRawValue(rawData, productionData, 'area_covered_raw', 'area_covered');
    storeRawValue(rawData, productionData, 'yield_quantity_raw', 'yield_quantity');
    storeRawValue(rawData, productionData, 'fuel_consumed_raw', 'fuel_consumed');
    storeRawValue(rawData, productionData, 'equipment_hours_raw', 'equipment_hours');
    storeRawValue(
      rawData,
      productionData,
      'transportation_distance_raw',
      'transportation_distance'
    );

    // Sprint 2: EM (Equipment Maintenance) subtype fields extraction
    // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
    if (productionData.production_type === 'EM') {
      // Extract EM-specific fields from form data
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

    // 🔧 FIX: fuel_type must be preserved for ALL production types, not just EM
    // This enables "Energy Consumed" label for electric equipment across all production events
    if (rawData.fuel_type) {
      (productionData as any).fuel_type = getFuelTypeDisplayName(rawData.fuel_type);
    }
    if (rawData.fuel_unit) {
      (productionData as any).fuel_unit = rawData.fuel_unit;
    }
    // Preserve unit fields separately for registry formatters (makeUnitPairFormatter)
    // formatProductionFieldWithUnit combines value+unit as "85 acres" but formatters
    // need area_unit, yield_unit, etc. as separate fields to render correctly
    if (rawData.area_unit) {
      (productionData as any).area_unit = rawData.area_unit;
    }
    if (rawData.yield_unit) {
      (productionData as any).yield_unit = rawData.yield_unit;
    }
    if (rawData.transportation_unit) {
      (productionData as any).transportation_unit = rawData.transportation_unit;
    }

    // Sprint 3 Epic 3.2: Consumer Trust Fields for Production events
    if (rawData.seeds_source) {
      (productionData as any).seeds_source = rawData.seeds_source;
    }
    // NOP 7 CFR 205.204 — Seed Traceability (planting subtype)
    if (rawData.seed_supplier_name) {
      (productionData as any).seed_supplier_name = rawData.seed_supplier_name;
    }
    if (rawData.seed_purchase_date) {
      (productionData as any).seed_purchase_date = rawData.seed_purchase_date;
    }
    if (rawData.seed_purchase_invoice) {
      (productionData as any).seed_purchase_invoice = rawData.seed_purchase_invoice;
    }
    if (rawData.seed_lot_number) {
      (productionData as any).seed_lot_number = rawData.seed_lot_number;
    }
    if (rawData.seed_certification_status) {
      (productionData as any).seed_certification_status = rawData.seed_certification_status;
    }
    if (rawData.seed_treatment) {
      (productionData as any).seed_treatment = rawData.seed_treatment;
    }
    // Perennial planting stock (PL/TR) — 2026-08-15.
    //
    // This block is a hand-written copy list, so a new column is invisible to every consumer
    // of the normalized event until it is named here. `rootstock` rendered on the consumer
    // card before this line existed ONLY because it also rides `extra_data` (it was an
    // extra_data key for months before it had a column); `plants_established` and
    // `plant_spacing` have no such twin and were silently dropped between the API payload and
    // the card. Registry green + serializer green still equals nothing rendered.
    if (rawData.rootstock) {
      (productionData as any).rootstock = rawData.rootstock;
    }
    if (rawData.plants_established !== undefined && rawData.plants_established !== null) {
      (productionData as any).plants_established = rawData.plants_established;
    }
    if (rawData.plant_spacing) {
      (productionData as any).plant_spacing = rawData.plant_spacing;
    }
    // Off-farm handling round trip (HA) — CCOF grower checklist item 6, 2026-08-16.
    // Named here for the reason the comment above gives: this is a hand-written copy list, and
    // a column absent from it is dropped between the API payload and every producer surface,
    // registry and serializer both green.
    if (rawData.harvest_destination) {
      (productionData as any).harvest_destination = rawData.harvest_destination;
    }
    if (rawData.sent_to_handler_date) {
      (productionData as any).sent_to_handler_date = rawData.sent_to_handler_date;
    }
    // `!= null`, not truthiness — 0 is a real pack-out answer (an entire load rejected).
    if (rawData.quantity_sent_to_handler != null) {
      (productionData as any).quantity_sent_to_handler = rawData.quantity_sent_to_handler;
    }
    if (rawData.quantity_returned_from_handler != null) {
      (productionData as any).quantity_returned_from_handler =
        rawData.quantity_returned_from_handler;
    }
    if (rawData.handler_quantity_unit) {
      (productionData as any).handler_quantity_unit = rawData.handler_quantity_unit;
    }
    if (rawData.handler_return_unit) {
      (productionData as any).handler_return_unit = rawData.handler_return_unit;
    }
    if (rawData.handler_document_reference) {
      (productionData as any).handler_document_reference = rawData.handler_document_reference;
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
    // Phase 3: Irrigation pump fields for accurate electricity emission calculation
    if (
      rawData.pump_depth_ft !== undefined &&
      rawData.pump_depth_ft !== null &&
      rawData.pump_depth_ft !== ''
    ) {
      (productionData as any).pump_depth_ft = parseFloat(rawData.pump_depth_ft);
    }
    if (rawData.electricity_source) {
      (productionData as any).electricity_source = rawData.electricity_source;
    }

    // Phase 2: Harvest quality and grain moisture for target markets
    if (rawData.harvest_quality_grade) {
      (productionData as any).harvest_quality_grade = rawData.harvest_quality_grade;
    }
    if (
      rawData.grain_moisture !== undefined &&
      rawData.grain_moisture !== null &&
      rawData.grain_moisture !== ''
    ) {
      (productionData as any).grain_moisture = rawData.grain_moisture;
    }
    // F43: dry-matter % (avocado/nut maturity) — top-level model field, like grain_moisture.
    if (
      rawData.dry_matter_percentage !== undefined &&
      rawData.dry_matter_percentage !== null &&
      rawData.dry_matter_percentage !== ''
    ) {
      (productionData as any).dry_matter_percentage = rawData.dry_matter_percentage;
    }

    // Phase 2: Extra form fields that flow into extra_data for consumer display
    // These merge with any existing extra_data from rawData (preserved by createBaseEvent)
    const extraFormFields: Record<string, any> = {};
    if (rawData.harvest_method) {
      extraFormFields.harvest_method = rawData.harvest_method;
      // Mirror to top-level so the productionEvent.ts registry `harvest_method`
      // field entry (which reads event[field.name]) can resolve it on the
      // form-preview path. Backend path is handled below in normalizeBackendProductionData.
      (productionData as any).harvest_method = rawData.harvest_method;
    }
    if (rawData.native_species_planted)
      extraFormFields.native_species_planted = rawData.native_species_planted;
    if (rawData.habitat_area_hectares)
      extraFormFields.habitat_area_hectares = rawData.habitat_area_hectares;
    // PO (Pollination) extra_data fields
    if (rawData.pollinator_type) extraFormFields.pollinator_type = rawData.pollinator_type;
    if (rawData.hive_count !== undefined && rawData.hive_count !== null)
      extraFormFields.hive_count = rawData.hive_count;
    if (rawData.placement_date) extraFormFields.placement_date = rawData.placement_date;
    if (rawData.removal_date) extraFormFields.removal_date = rawData.removal_date;
    // PH (Post-Harvest Processing) extra_data fields
    if (rawData.processing_type) extraFormFields.processing_type = rawData.processing_type;
    if (
      rawData.processing_duration_hours !== undefined &&
      rawData.processing_duration_hours !== null
    )
      extraFormFields.processing_duration_hours = rawData.processing_duration_hours;
    if (rawData.temperature_control)
      extraFormFields.temperature_control = rawData.temperature_control;
    // CM (Canopy Management) extra_data fields
    if (rawData.canopy_operation) extraFormFields.canopy_operation = rawData.canopy_operation;
    if (rawData.pass_number !== undefined && rawData.pass_number !== null)
      extraFormFields.pass_number = rawData.pass_number;
    // PR (Pruning) extra_data fields
    if (rawData.pruning_passes !== undefined && rawData.pruning_passes !== null)
      extraFormFields.pruning_passes = rawData.pruning_passes;
    // Operation method (Hand thinning, Pruning shears, Mechanical harvester, etc.)
    // ProductionTab.jsx onSubmit saves this to extra_data.method — mirror that for preview
    // so legacy getProductionEventFields (which reads extraData.method) picks it up.
    // Also mirrored at top-level `method` so the field registry resolver (which reads
    // event[field.name]) can render it via productionEvent.ts `method` entry.
    if (rawData.production_method && String(rawData.production_method).trim()) {
      extraFormFields.method = rawData.production_method;
      (productionData as any).method = rawData.production_method;
    }
    if (Object.keys(extraFormFields).length > 0) {
      (productionData as any).extra_data = {
        ...(rawData.extra_data || {}),
        ...extraFormFields
      };
    }

    // Universal top-level fields: variety, block_id, growth_stage (form path)
    if (rawData.variety && String(rawData.variety).trim()) {
      (productionData as any).variety = rawData.variety;
    }
    if (rawData.block_id && String(rawData.block_id).trim()) {
      (productionData as any).block_id = rawData.block_id;
    }
    if (rawData.growth_stage && String(rawData.growth_stage).trim()) {
      (productionData as any).growth_stage = rawData.growth_stage;
    }
    // brix_level as top-level model field (form path)
    if (
      rawData.brix_level !== undefined &&
      rawData.brix_level !== null &&
      rawData.brix_level !== ''
    ) {
      (productionData as any).brix_level = rawData.brix_level;
    }

    // NOP Compliance: Seed Search & Equipment Cleaning fields
    if (rawData.seed_search_attempts) {
      (productionData as any).seed_search_attempts = rawData.seed_search_attempts;
    }
    if (rawData.cleaning_date) {
      (productionData as any).cleaning_date = rawData.cleaning_date;
    }
    if (rawData.cleaning_method && String(rawData.cleaning_method).trim()) {
      (productionData as any).cleaning_method = rawData.cleaning_method;
    }
    if (rawData.cleaning_materials_used && String(rawData.cleaning_materials_used).trim()) {
      (productionData as any).cleaning_materials_used = rawData.cleaning_materials_used;
    }
    if (rawData.cleaned_by && String(rawData.cleaned_by).trim()) {
      (productionData as any).cleaned_by = rawData.cleaned_by;
    }
    if (rawData.shared_with_conventional !== undefined) {
      (productionData as any).shared_with_conventional = rawData.shared_with_conventional;
    }
    if (rawData.cleaning_protocol_reference && String(rawData.cleaning_protocol_reference).trim()) {
      (productionData as any).cleaning_protocol_reference = rawData.cleaning_protocol_reference;
    }
    // §E-5 — custom operator + the cleaning event covering this operation (7 CFR 205.272).
    // This normalizer is an allow-list: a field omitted here never reaches any card, however
    // correct the model, serializer and registry entries are.
    if (rawData.operator_is_custom !== undefined) {
      (productionData as any).operator_is_custom = rawData.operator_is_custom;
    }
    if (
      rawData.equipment_cleaning_event !== undefined &&
      rawData.equipment_cleaning_event !== null
    ) {
      (productionData as any).equipment_cleaning_event = rawData.equipment_cleaning_event;
    }
    // Post-Harvest Sanitizer detail (7 CFR 205.272 + § 205.605)
    if (rawData.sanitizer_name && String(rawData.sanitizer_name).trim()) {
      (productionData as any).sanitizer_name = rawData.sanitizer_name;
    }
    if (rawData.sanitizer_ppm !== undefined && rawData.sanitizer_ppm !== '') {
      (productionData as any).sanitizer_ppm = rawData.sanitizer_ppm;
    }
    if (rawData.rinse_step_documented !== undefined) {
      (productionData as any).rinse_step_documented = rawData.rinse_step_documented;
    }
    if (rawData.sanitizer_nop_reference && String(rawData.sanitizer_nop_reference).trim()) {
      (productionData as any).sanitizer_nop_reference = rawData.sanitizer_nop_reference;
    }

    // Sprint 4: Aggregate Event Support - for logging multiple similar events as one summary
    // Handle is_summary (comes as string 'true'/'false' from form)
    if (rawData.is_summary === 'true' || rawData.is_summary === true) {
      (productionData as any).is_summary = true;

      // Date range for summary events
      if (rawData.date_start) {
        (productionData as any).date_start = rawData.date_start;
      }
      if (rawData.date_end) {
        (productionData as any).date_end = rawData.date_end;
      }

      // Event count (number of events in this summary)
      if (rawData.event_count) {
        const eventCount = parseInt(rawData.event_count, 10);
        if (!isNaN(eventCount) && eventCount > 0) {
          (productionData as any).event_count = eventCount;
        }
      }

      // Aggregate irrigation: total water volume
      if (rawData.water_volume_total) {
        const waterVolume = parseFloat(rawData.water_volume_total);
        if (!isNaN(waterVolume) && waterVolume > 0) {
          const waterUnit = rawData.water_volume_unit || 'gallons';
          (productionData as any).water_volume_total = `${waterVolume} ${waterUnit}`;
          (productionData as any).water_volume_total_raw = waterVolume;
          (productionData as any).water_volume_unit = waterUnit;
        }
      }

      // Aggregate harvest: total yield
      if (rawData.yield_total) {
        const yieldTotal = parseFloat(rawData.yield_total);
        if (!isNaN(yieldTotal) && yieldTotal > 0) {
          const yieldUnit = rawData.yield_total_unit || 'lbs';
          (productionData as any).yield_total = yieldTotal;
          (productionData as any).yield_total_unit = yieldUnit;
        }
      }
    } else {
      // Explicitly mark individual events as non-summary
      (productionData as any).is_summary = false;
    }
  } else {
    // Backend data already formatted
    if (rawData.area_covered) productionData.area_covered = rawData.area_covered;
    if (rawData.area_unit) (productionData as any).area_unit = rawData.area_unit;
    if (rawData.yield_quantity) productionData.yield_quantity = rawData.yield_quantity;
    if (rawData.yield_unit) (productionData as any).yield_unit = rawData.yield_unit;
    if (rawData.fuel_consumed) productionData.fuel_consumed = rawData.fuel_consumed;
    if (rawData.fuel_unit) (productionData as any).fuel_unit = rawData.fuel_unit;
    if (rawData.fuel_type)
      (productionData as any).fuel_type = getFuelTypeDisplayName(rawData.fuel_type);
    if (rawData.equipment_hours) productionData.equipment_hours = rawData.equipment_hours;
    if (rawData.transportation_distance)
      productionData.transportation_distance = rawData.transportation_distance;
    if (rawData.transportation_unit)
      (productionData as any).transportation_unit = rawData.transportation_unit;
    if (rawData.production_efficiency)
      (productionData as any).production_efficiency = rawData.production_efficiency;

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
    // Phase 3: Irrigation pump fields (backend)
    const pumpDepthBackend = rawData.pump_depth_ft ?? rawData.extra_data?.pump_depth_ft;
    if (pumpDepthBackend !== undefined && pumpDepthBackend !== null && pumpDepthBackend !== '') {
      (productionData as any).pump_depth_ft = parseFloat(pumpDepthBackend);
    }
    const electricitySourceBackend =
      rawData.electricity_source ?? rawData.extra_data?.electricity_source;
    if (electricitySourceBackend) {
      (productionData as any).electricity_source = electricitySourceBackend;
    }

    // Phase 2: Harvest quality and grain moisture for target markets (backend)
    if (rawData.harvest_quality_grade) {
      (productionData as any).harvest_quality_grade = rawData.harvest_quality_grade;
    }
    if (rawData.grain_moisture !== undefined && rawData.grain_moisture !== null) {
      (productionData as any).grain_moisture = rawData.grain_moisture;
    }
    // F43: dry-matter % — BACKEND/consumer path (the form path carries it at ~809; this branch
    // is the one the consumer QR + audit modal actually run, so it MUST carry it too).
    if (rawData.dry_matter_percentage !== undefined && rawData.dry_matter_percentage !== null) {
      (productionData as any).dry_matter_percentage = rawData.dry_matter_percentage;
    }

    // Phase 2: harvest_method and brix_levels come from extra_data on backend
    // (already handled by createBaseEvent copying extra_data from rawData).
    // Mirror harvest_method to top-level so the registry `harvest_method` field
    // entry (which reads event[field.name]) resolves it on the backend/modal path.
    const harvestMethodBackend = rawData.harvest_method ?? rawData.extra_data?.harvest_method;
    if (harvestMethodBackend && String(harvestMethodBackend).trim()) {
      (productionData as any).harvest_method = harvestMethodBackend;
    }

    // Operation method (backend path): mirror extra_data.method to top-level so the
    // field registry resolver can find it. Do NOT fall back to rawData.production_method
    // — that's History.production_method (organic/conventional), a different concept.
    const methodBackend = rawData.method ?? rawData.extra_data?.method;
    if (methodBackend && String(methodBackend).trim()) {
      (productionData as any).method = methodBackend;
    }

    // Universal top-level fields: variety, block_id, growth_stage (backend path)
    if (rawData.variety && String(rawData.variety).trim()) {
      (productionData as any).variety = rawData.variety;
    }
    if (rawData.block_id && String(rawData.block_id).trim()) {
      (productionData as any).block_id = rawData.block_id;
    }
    if (rawData.growth_stage && String(rawData.growth_stage).trim()) {
      (productionData as any).growth_stage = rawData.growth_stage;
    }
    // brix_level as top-level model field (backend path)
    if (
      rawData.brix_level !== undefined &&
      rawData.brix_level !== null &&
      rawData.brix_level !== ''
    ) {
      (productionData as any).brix_level = rawData.brix_level;
    }

    // NOP Compliance: Seed Search & Equipment Cleaning fields (backend path)
    if (rawData.seed_search_attempts) {
      (productionData as any).seed_search_attempts = rawData.seed_search_attempts;
    }
    if (rawData.cleaning_date) {
      (productionData as any).cleaning_date = rawData.cleaning_date;
    }
    if (rawData.cleaning_method) {
      (productionData as any).cleaning_method = rawData.cleaning_method;
    }
    if (rawData.cleaning_materials_used) {
      (productionData as any).cleaning_materials_used = rawData.cleaning_materials_used;
    }
    if (rawData.cleaned_by) {
      (productionData as any).cleaned_by = rawData.cleaned_by;
    }
    if (rawData.shared_with_conventional !== undefined) {
      (productionData as any).shared_with_conventional = rawData.shared_with_conventional;
    }
    if (rawData.cleaning_protocol_reference) {
      (productionData as any).cleaning_protocol_reference = rawData.cleaning_protocol_reference;
    }
    // Post-Harvest Sanitizer detail (7 CFR 205.272 + § 205.605)
    if (rawData.sanitizer_name) {
      (productionData as any).sanitizer_name = rawData.sanitizer_name;
    }
    if (rawData.sanitizer_ppm !== undefined && rawData.sanitizer_ppm !== null) {
      (productionData as any).sanitizer_ppm = rawData.sanitizer_ppm;
    }
    if (rawData.rinse_step_documented !== undefined) {
      (productionData as any).rinse_step_documented = rawData.rinse_step_documented;
    }
    if (rawData.sanitizer_nop_reference) {
      (productionData as any).sanitizer_nop_reference = rawData.sanitizer_nop_reference;
    }

    // PO/PH/CM extra_data fields also surface at top level from backend for easier access
    const extraData = rawData.extra_data || {};
    // PO fields
    const pollinatorType = rawData.pollinator_type || extraData.pollinator_type;
    if (pollinatorType) (productionData as any).pollinator_type = pollinatorType;
    const hiveCount = rawData.hive_count !== undefined ? rawData.hive_count : extraData.hive_count;
    if (hiveCount !== undefined && hiveCount !== null)
      (productionData as any).hive_count = hiveCount;
    const placementDate = rawData.placement_date || extraData.placement_date;
    if (placementDate) (productionData as any).placement_date = placementDate;
    const removalDate = rawData.removal_date || extraData.removal_date;
    if (removalDate) (productionData as any).removal_date = removalDate;
    // PH fields
    const processingType = rawData.processing_type || extraData.processing_type;
    if (processingType) (productionData as any).processing_type = processingType;
    const processingDuration =
      rawData.processing_duration_hours !== undefined
        ? rawData.processing_duration_hours
        : extraData.processing_duration_hours;
    if (processingDuration !== undefined && processingDuration !== null)
      (productionData as any).processing_duration_hours = processingDuration;
    const temperatureControl = rawData.temperature_control || extraData.temperature_control;
    if (temperatureControl) (productionData as any).temperature_control = temperatureControl;
    // CM fields
    const canopyOperation = rawData.canopy_operation || extraData.canopy_operation;
    if (canopyOperation) (productionData as any).canopy_operation = canopyOperation;
    const passNumber =
      rawData.pass_number !== undefined ? rawData.pass_number : extraData.pass_number;
    if (passNumber !== undefined && passNumber !== null)
      (productionData as any).pass_number = passNumber;
    // PR (Pruning) summary fields
    const pruningPasses =
      rawData.pruning_passes !== undefined ? rawData.pruning_passes : extraData.pruning_passes;
    if (pruningPasses !== undefined && pruningPasses !== null)
      (productionData as any).pruning_passes = pruningPasses;

    // Sprint 4: Aggregate Event Support - for backend data
    // Check both top-level and extra_data for is_summary (string or boolean)
    const isSummaryEvent =
      rawData.is_summary === 'true' ||
      rawData.is_summary === true ||
      rawData.extra_data?.is_summary === true ||
      rawData.extra_data?.is_summary === 'true';

    if (isSummaryEvent) {
      (productionData as any).is_summary = true;

      // Date range for summary events
      const dateStart = rawData.date_start || rawData.extra_data?.date_start;
      const dateEnd = rawData.date_end || rawData.extra_data?.date_end;
      if (dateStart) {
        (productionData as any).date_start = dateStart;
      }
      if (dateEnd) {
        (productionData as any).date_end = dateEnd;
      }

      // Event count
      const eventCount = rawData.event_count || rawData.extra_data?.event_count;
      if (eventCount) {
        const parsedCount = typeof eventCount === 'string' ? parseInt(eventCount, 10) : eventCount;
        if (!isNaN(parsedCount) && parsedCount > 0) {
          (productionData as any).event_count = parsedCount;
        }
      }

      // Water volume total (irrigation aggregates)
      const waterVolumeTotal = rawData.water_volume_total || rawData.extra_data?.water_volume_total;
      if (waterVolumeTotal) {
        const parsed =
          typeof waterVolumeTotal === 'string' ? parseFloat(waterVolumeTotal) : waterVolumeTotal;
        if (!isNaN(parsed) && parsed > 0) {
          (productionData as any).water_volume_total = parsed;
          (productionData as any).water_volume_unit =
            rawData.water_volume_unit || rawData.extra_data?.water_volume_unit || 'gallons';
        }
      }

      // Yield total (harvest summaries)
      const yieldTotal = rawData.yield_total || rawData.extra_data?.yield_total;
      if (yieldTotal) {
        const parsed = typeof yieldTotal === 'string' ? parseFloat(yieldTotal) : yieldTotal;
        if (!isNaN(parsed) && parsed > 0) {
          (productionData as any).yield_total = parsed;
          (productionData as any).yield_total_unit =
            rawData.yield_total_unit || rawData.extra_data?.yield_total_unit || 'lbs';
        }
      }
    } else {
      // Explicitly mark individual events as non-summary
      (productionData as any).is_summary = false;
    }

    // Sprint 2: EM (Equipment Maintenance) subtype fields extraction from backend
    // CRITICAL FIX (2025-01-21): Changed EQ → EM to match backend Production event model
    // Note: Kept backward compatibility check for 'EQ' in case old data exists
    if (
      productionData.production_type === 'EM' ||
      rawData.production_type === 'EM' ||
      productionData.production_type === 'EQ' ||
      rawData.production_type === 'EQ'
    ) {
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
        // 🔧 CRITICAL FIX: Apply fuel type display name mapping for preview-display consistency
        // Backend returns lowercase codes ("electric", "diesel"), must convert to display names ("Electric", "Diesel")
        (productionData as any).fuel_type = getFuelTypeDisplayName(rawData.fuel_type);
      }
      if (rawData.operation_efficiency) {
        (productionData as any).operation_efficiency = rawData.operation_efficiency;
      }
    }
  }

  // 🔴 2026-08-15 — carry over every field the EVENT REGISTRY declares for this event.

  //

  // `productionData` starts as {} and is filled by the hand-written copy list above, so a

  // column that nobody remembered to name here is silently dropped between the API payload

  // and every consumer of the normalized event. Measured on the live consumer card: the

  // payload carried `plants_established: 28` and `seed_certification_status:

  // "certified_organic"`, the registry declared both on the consumer_card surface, and

  // NEITHER reached the card — while `rootstock` did, purely because it also happens to sit

  // in `extra_data`, which the resolver falls back to. Registry green + serializer green

  // still equalled nothing rendered.

  //

  // Driving this off the registry rather than adding three more lines closes the class: a

  // field declared on a display surface is, by definition, one this normalizer must not eat.

  // Explicit copies above still win — this only fills what they left behind.

  for (const field of productionEventRegistry.fields) {
    // Never touch a key this normalizer deliberately TRANSFORMS rather than copies. The
    // registry names the raw column; the normalizer may have rewritten it into a display form
    // ("150" + unit -> "150 L"), renamed it (`name` -> `production_name`) or mapped a code to
    // a label ("FC" -> "Fuel Consumption"). Copying the raw value back over that would quietly
    // undo the normalization the rest of the app depends on.
    if (NORMALIZER_OWNED_KEYS.has(field.name)) continue;

    const key = field.name as keyof typeof productionData;

    if ((productionData as Record<string, unknown>)[key as string] !== undefined) continue;

    const value = (rawData as Record<string, unknown>)[field.name];

    if (value === undefined || value === null || value === '') continue;

    (productionData as Record<string, unknown>)[field.name] = value;
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
    'area_numeric', // Phase 3: Primary numeric area field
    'area_unit',
    'volume_applied',
    'volume_numeric', // Phase 3: Primary numeric volume field
    'volume_unit',
    'is_fertigation', // Phase 3: Fertigation toggle for FE events
    'concentration',
    'npk_ratio',
    // NPK percentage fields — used by form for individual N/P/K inputs
    // and by formatNPK formatter in the registry for preview display
    'nitrogen_percentage',
    'phosphorus_percentage',
    'potassium_percentage',
    // NPK totals — used by summary/aggregate mode for carbon calculations
    'nitrogen_total_kg',
    'phosphorus_total_kg',
    'potassium_total_kg',
    // §E-3 Micronutrients (FE) — 7 CFR 205.601(j)(6). Same allow-list rule as the soil lab
    // fields: without these names the registry FieldConfigs resolve nothing on the card.
    // micronutrient_rate/_unit are already stripped from the anonymous payload by the backend;
    // they are listed so the producer preview and modal can still show them.
    'micronutrient_type',
    'micronutrient_rate',
    'micronutrient_rate_unit',
    'application_timing',
    'application_details', // Sprint 6: Additional application notes for transparency
    'weather_conditions',
    // EPA WPS Compliance Fields - 40 CFR 170.309
    'applicator_name',
    'epa_registration_number',
    'restricted_use_pesticide',
    'applicator_certification',
    'rei_hours',
    'phi_days',
    // Ghost field cleanup: Removed signal_word, ppe_required, environmental_hazards (never in form schema)
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'organic_approved',
    // Phase 3: server-resolved input status ({status, label}) — the chip
    // vocabulary's single source of truth; without this whitelist entry the
    // normalizer strips it and the card falls back to client derivation.
    'input_status',
    'buffer_zone_meters',
    // 🔧 Sprint 6 Fix: Application Equipment & Fuel Usage fields for carbon calculation transparency
    // These fields enable display of fuel consumption in Event Preview and ProductDetail cards
    'application_fuel_type',
    'application_fuel_consumed',
    'application_fuel_unit',
    // NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103)
    'supplier_name',
    'purchase_date',
    'purchase_invoice',
    'quantity_purchased',
    'quantity_purchased_unit',
    // Universal context fields present across event types
    'variety',
    'block_id',
    'growth_stage'
  ];

  mapFields(rawData, chemicalData, chemicalFields, fieldMapping);

  // 🔧 Sprint 6 Fix: Explicit handling for application fuel fields from form data
  // These fields are critical for carbon calculation transparency in Event Preview
  // and ProductDetail cards - they show the fuel used during chemical application
  if (dataSource === 'form') {
    // EPA WPS flag: the form stores restricted_use_pesticide as the string
    // 'true' / 'false' (Zod schema). `Boolean('false')` is truthy, so we coerce
    // to a real boolean here before the registry resolver evaluates visibility
    // predicates. This keeps applicator_name / applicator_certification hidden
    // when the farmer explicitly selected "No".
    if (rawData.restricted_use_pesticide !== undefined) {
      (chemicalData as any).restricted_use_pesticide =
        rawData.restricted_use_pesticide === true || rawData.restricted_use_pesticide === 'true';
    }

    // Phase 3 bridge: the form uses volume_numeric / area_numeric as the primary
    // input fields and leaves volume_applied / area_treated empty until onSubmit.
    // The field registry reads volume_applied / area_treated for preview/consumer_card
    // display, so we must hydrate those from the numeric twins before render.
    const hasVolumeApplied =
      chemicalData.volume_applied !== undefined &&
      chemicalData.volume_applied !== null &&
      chemicalData.volume_applied !== '';
    if (!hasVolumeApplied && rawData.volume_numeric != null && rawData.volume_numeric !== '') {
      const parsed = parseFloat(rawData.volume_numeric);
      if (!Number.isNaN(parsed)) {
        chemicalData.volume_applied = parsed;
      }
    }
    const hasAreaTreated =
      chemicalData.area_treated !== undefined &&
      chemicalData.area_treated !== null &&
      chemicalData.area_treated !== '';
    if (!hasAreaTreated && rawData.area_numeric != null && rawData.area_numeric !== '') {
      const parsed = parseFloat(rawData.area_numeric);
      if (!Number.isNaN(parsed)) {
        chemicalData.area_treated = parsed;
      }
    }

    // Direct mapping from form data - these come directly from ChemicalTab form
    if (rawData.application_fuel_type) {
      (chemicalData as any).application_fuel_type = getFuelTypeDisplayName(
        rawData.application_fuel_type
      );
    }
    if (
      rawData.application_fuel_consumed !== undefined &&
      rawData.application_fuel_consumed !== null &&
      rawData.application_fuel_consumed !== ''
    ) {
      (chemicalData as any).application_fuel_consumed = parseFloat(
        rawData.application_fuel_consumed
      );
    }
    if (rawData.application_fuel_unit) {
      (chemicalData as any).application_fuel_unit = rawData.application_fuel_unit;
    }
  }

  // *** CRITICAL FIX: Parse combined backend API fields ***
  // The backend transparency API returns combined string fields like "20 ha" and "10 L"
  // but the frontend expects separate numeric and unit fields
  if (dataSource === 'backend') {
    // Phase 3: Parse volume_numeric / area_numeric from backend
    if (rawData.volume_numeric !== undefined && rawData.volume_numeric !== null) {
      chemicalData.volume_numeric = parseFloat(rawData.volume_numeric);
    }
    if (rawData.area_numeric !== undefined && rawData.area_numeric !== null) {
      chemicalData.area_numeric = parseFloat(rawData.area_numeric);
    }
    // Phase 3: is_fertigation from backend (boolean or extra_data)
    if (!chemicalData.is_fertigation) {
      const fertigVal = rawData.is_fertigation ?? rawData.extra_data?.is_fertigation;
      if (fertigVal !== undefined) {
        (chemicalData as any).is_fertigation = fertigVal === true || fertigVal === 'true';
      }
    }

    // Parse area field (e.g., "20 ha" → area_treated: 20, area_unit: "ha")
    if (rawData.area && typeof rawData.area === 'string') {
      // Require unit to start with a letter to avoid splitting pure numbers like "25" → "2" + "5"
      const areaMatch = rawData.area.match(/^([0-9.]+)\s+([a-zA-Z].*)$/);
      if (areaMatch) {
        chemicalData.area_treated = parseFloat(areaMatch[1]);
        chemicalData.area_unit = areaMatch[2].trim();
      } else if (/^[0-9.]+$/.test(rawData.area.trim())) {
        // Pure number without unit — use area_unit from backend or extra_data
        chemicalData.area_treated = parseFloat(rawData.area);
        const unitFromBackend = rawData.area_unit || rawData.extra_data?.area_unit;
        if (unitFromBackend) {
          chemicalData.area_unit = unitFromBackend;
        }
      }
    }

    // Parse volume field (e.g., "10 L" → volume_applied: 10, volume_unit: "L")
    if (rawData.volume && typeof rawData.volume === 'string') {
      // Require unit to start with a letter to avoid splitting pure numbers like "625" → "62" + "5"
      const volumeMatch = rawData.volume.match(/^([0-9.]+)\s+([a-zA-Z].*)$/);
      if (volumeMatch) {
        chemicalData.volume_applied = parseFloat(volumeMatch[1]);
        chemicalData.volume_unit = volumeMatch[2].trim();
      } else if (/^[0-9.]+$/.test(rawData.volume.trim())) {
        // Pure number without unit — use volume_unit from backend or extra_data
        chemicalData.volume_applied = parseFloat(rawData.volume);
        const unitFromBackend = rawData.volume_unit || rawData.extra_data?.volume_unit;
        if (unitFromBackend) {
          chemicalData.volume_unit = unitFromBackend;
        }
      }
    }

    // Pull organic_approved from backend top-level or extra_data
    if (!chemicalData.organic_approved) {
      const organicValue = rawData.organic_approved || rawData.extra_data?.organic_approved;
      const organicCert = rawData.extra_data?.organic_certification;
      if (organicCert && typeof organicCert === 'string') {
        // Use the certification string (e.g., "OMRI Listed") for display mapping
        chemicalData.organic_approved = organicCert.toLowerCase().includes('omri')
          ? 'omri'
          : organicCert.toLowerCase().includes('usda')
          ? 'usda_nop'
          : organicCert;
      } else if (organicValue === true) {
        // Boolean true without specific certification
        chemicalData.organic_approved = 'yes';
      } else if (typeof organicValue === 'string' && organicValue) {
        chemicalData.organic_approved = organicValue;
      }
    }

    // Handle direct backend fields that are sometimes missing in mapping
    if (rawData.application_timing && !chemicalData.application_timing) {
      chemicalData.application_timing = rawData.application_timing;
    }

    // Map way_of_application to application_method for backend compatibility
    if (rawData.way_of_application && !chemicalData.application_method) {
      chemicalData.application_method = rawData.way_of_application;
    }

    // Extract application fuel fields from extra_data (matching form path behavior)
    // These fields are stored in extra_data but not at top-level of API response
    const extraData = rawData.extra_data || {};
    if (!chemicalData.application_fuel_type) {
      const fuelType = extraData.application_fuel_type;
      if (fuelType) {
        (chemicalData as any).application_fuel_type = getFuelTypeDisplayName(fuelType);
      }
    }
    if (
      (chemicalData as any).application_fuel_consumed === undefined ||
      (chemicalData as any).application_fuel_consumed === null
    ) {
      const fuelConsumed = extraData.application_fuel_consumed;
      if (fuelConsumed !== undefined && fuelConsumed !== null && fuelConsumed !== '') {
        (chemicalData as any).application_fuel_consumed = parseFloat(fuelConsumed);
      }
    }
    if (!(chemicalData as any).application_fuel_unit) {
      const fuelUnit = extraData.application_fuel_unit;
      if (fuelUnit) {
        (chemicalData as any).application_fuel_unit = fuelUnit;
      }
    }

    // Extract chemical_subtype from extra_data for Chemical Type display
    if (!chemicalData.chemical_subtype && extraData.chemical_subtype) {
      chemicalData.chemical_subtype = extraData.chemical_subtype;
    }

    // Extract active_ingredient from extra_data when not at top level
    if (!chemicalData.active_ingredient && extraData.active_ingredient) {
      chemicalData.active_ingredient = extraData.active_ingredient;
    }
  }

  // Handle special cases - prioritize chemical_type field from backend
  if (rawData.chemical_type && ['FE', 'PE', 'FU', 'HE'].includes(rawData.chemical_type)) {
    chemicalData.chemical_type = rawData.chemical_type;
  } else if (rawData.type && ['FE', 'PE', 'FU', 'HE'].includes(rawData.type)) {
    chemicalData.chemical_type = rawData.type;
  }

  // Sprint 5: Aggregate Chemical Event Support (Fertilizer, Fungicide, Pesticide)
  // Handle is_summary (comes as string 'true'/'false' from form, or boolean from backend)
  // SPRINT 6 FIX (2025-12-23): Only enable is_summary for chemical types that support it (FE, FU, PE)
  // Herbicide (HE) does NOT support summary mode
  const currentChemicalType = chemicalData.chemical_type || rawData.type || rawData.chemical_type;
  const supportsSummaryMode = ['FE', 'FU', 'PE'].includes(currentChemicalType);

  const isSummaryEvent =
    supportsSummaryMode &&
    (rawData.is_summary === 'true' ||
      rawData.is_summary === true ||
      rawData.extra_data?.is_summary === true ||
      rawData.extra_data?.is_summary === 'true');

  if (isSummaryEvent) {
    (chemicalData as any).is_summary = true;

    // Date range for summary events
    const dateStart = rawData.date_start || rawData.extra_data?.date_start;
    const dateEnd = rawData.date_end || rawData.extra_data?.date_end;
    if (dateStart) {
      (chemicalData as any).date_start = dateStart;
    }
    if (dateEnd) {
      (chemicalData as any).date_end = dateEnd;
    }

    // Event count (number of applications in this summary)
    const eventCount = rawData.event_count || rawData.extra_data?.event_count;
    if (eventCount) {
      const parsedCount = typeof eventCount === 'string' ? parseInt(eventCount, 10) : eventCount;
      if (!isNaN(parsedCount) && parsedCount > 0) {
        (chemicalData as any).event_count = parsedCount;
      }
    }

    // NPK totals for Fertilizer (FE)
    const nitrogenTotal = rawData.nitrogen_total_kg || rawData.extra_data?.nitrogen_total_kg;
    const phosphorusTotal = rawData.phosphorus_total_kg || rawData.extra_data?.phosphorus_total_kg;
    const potassiumTotal = rawData.potassium_total_kg || rawData.extra_data?.potassium_total_kg;

    if (nitrogenTotal) {
      const parsed = typeof nitrogenTotal === 'string' ? parseFloat(nitrogenTotal) : nitrogenTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).nitrogen_total_kg = parsed;
      }
    }
    if (phosphorusTotal) {
      const parsed =
        typeof phosphorusTotal === 'string' ? parseFloat(phosphorusTotal) : phosphorusTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).phosphorus_total_kg = parsed;
      }
    }
    if (potassiumTotal) {
      const parsed =
        typeof potassiumTotal === 'string' ? parseFloat(potassiumTotal) : potassiumTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).potassium_total_kg = parsed;
      }
    }

    // Active ingredient total for Fungicide (FU) and Pesticide (PE)
    const activeIngredientTotal =
      rawData.active_ingredient_total_kg || rawData.extra_data?.active_ingredient_total_kg;
    if (activeIngredientTotal) {
      const parsed =
        typeof activeIngredientTotal === 'string'
          ? parseFloat(activeIngredientTotal)
          : activeIngredientTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).active_ingredient_total_kg = parsed;
      }
    }

    // Volume and area totals
    const volumeTotal = rawData.volume_applied_total || rawData.extra_data?.volume_applied_total;
    const areaTotal = rawData.area_treated_total || rawData.extra_data?.area_treated_total;

    if (volumeTotal) {
      const parsed = typeof volumeTotal === 'string' ? parseFloat(volumeTotal) : volumeTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).volume_applied_total = parsed;
      }
    }
    if (areaTotal) {
      const parsed = typeof areaTotal === 'string' ? parseFloat(areaTotal) : areaTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).area_treated_total = parsed;
      }
    }

    // Fuel consumption total
    const fuelTotal = rawData.fuel_consumption_total || rawData.extra_data?.fuel_consumption_total;
    const fuelUnit = rawData.application_fuel_unit || rawData.extra_data?.fuel_unit || 'gal';

    if (fuelTotal) {
      const parsed = typeof fuelTotal === 'string' ? parseFloat(fuelTotal) : fuelTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (chemicalData as any).fuel_consumption_total = parsed;
        (chemicalData as any).fuel_unit = fuelUnit;
      }
    }
  } else {
    // Explicitly mark individual events as non-summary
    (chemicalData as any).is_summary = false;
  }

  return chemicalData;
}

/**
 * Normalize general event specific data
 */
function normalizeGeneralEventData(
  rawData: any,
  _dataSource: DataSource,
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

  // Map equipment-specific fields.
  //
  // `fuel_unit`, `area_unit`, `equipment` (the machine name) and `block_id` were added
  // 2026-07: the backend sends all four (PublicHistorySerializer emits `fuel_unit` with a
  // default of "L" and `area_unit` with "ha"), but they were absent from this list, so
  // mapFields dropped them. The visible symptom was unitless numbers on the consumer card —
  // "Fuel Used: 10" with no litres or gallons, on a record an inspector or buyer may read.
  // The units were only ever recovered by accident, in the string-parsing branch below that
  // splits values like "10 L" apart.
  const equipmentFields = [
    'operation_type',
    'operation_name',
    'equipment_type',
    'equipment',
    'fuel_consumed',
    'fuel_type',
    'fuel_unit',
    'hours_operated',
    'area_worked',
    'area_unit',
    'block_id',
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
        }
      }

      // Parse fuel_consumed field (e.g., "1 L" → fuel_consumed: 1, fuel_unit: "L")
      if (rawData.fuel_consumed && typeof rawData.fuel_consumed === 'string') {
        const fuelMatch = rawData.fuel_consumed.match(/^([0-9.]+)\s*(.+)$/);
        if (fuelMatch) {
          equipmentData.fuel_consumed = parseFloat(fuelMatch[1]);
          equipmentData.fuel_unit = fuelMatch[2];
        }
      }

      // Parse hours_operated field (e.g., "2 hours" → hours_operated: 2)
      if (rawData.hours_operated && typeof rawData.hours_operated === 'string') {
        const hoursMatch = rawData.hours_operated.match(/^([0-9.]+)/);
        if (hoursMatch) {
          equipmentData.hours_operated = parseFloat(hoursMatch[1]);
        }
      }
    } else {
      // Handle simplified event data from /complete endpoint
      // Extract information from description and equipment fields when available

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
  _dataSource: DataSource,
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
    'organic_matter_percentage',
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
    // D5 — the STRUCTURED pair the registry binds to. Absent from this allow-list they were
    // dropped before any card saw them, so a backend-populated amendment amount rendered blank.
    'amendment_amount_numeric',
    'amendment_amount_unit',
    'amendment_type',
    // Product identity. Both have declared `modal` surfaces in soilEvent.ts and were absent
    // here, so the producer modal rendered them blank — the registry-declares-but-normalizer-
    // drops shape this comment block already warns about, two fields further down.
    'amendment_product_name',
    'amendment_manufacturer',
    // Amendment purchase traceability (7 CFR 205.103(b)(1)-(2)) — 2026-08-16.
    'amendment_supplier_name',
    'amendment_purchase_date',
    'amendment_purchase_invoice',
    'amendment_quantity_purchased',
    'amendment_quantity_purchased_unit',
    'amendment_lot_number',
    // NOP Compliance fields (7 CFR 205.203) — Amendment approval + Compost + Manure tracking
    'amendment_organic_approved',
    'compost_peak_temp_f',
    'compost_duration_days_at_temp',
    'compost_turning_count',
    'compost_method',
    'compost_initial_cn_ratio',
    'manure_harvest_interval',
    'manure_application_date',
    // Biodiversity / habitat fields (HD / NS subtypes) — facts only, no score
    'habitat_type',
    'habitat_structure_count',
    'habitat_install_date',
    'species_planted',
    'wildlife_observed',
    'structure_notes',
    // ENHANCED: Tillage depth fields for soil CO2 flux calculation (TI events)
    'tillage_depth',
    'tillage_depth_unit',
    'depth',
    // §E-2 Lab analysis (LA + ST). This list is an ALLOW-LIST: a field absent here is dropped
    // before the card ever sees it, so a registry FieldConfig alone is not enough to render
    // anything. The lab_* names are the flattened `test_results` JSON the backend serializer
    // exposes; the numeric results stay off the consumer surface by way of the registry
    // surfaces, not by being withheld here (the producer modal needs them).
    'sample_matrix',
    'lab_name',
    'lab_sample_id',
    'lab_report_date',
    'lab_nitrogen',
    'lab_phosphorus',
    'lab_potassium',
    'lab_cec',
    'lab_zinc_ppm',
    'lab_boron_ppm',
    'lab_manganese_ppm',
    'lab_iron_ppm',
    // Universal context fields present across event types
    'variety',
    'block_id',
    'growth_stage'
  ];

  mapFields(rawData, soilData, soilFields, fieldMapping);

  // 🔧 CRITICAL FIX: Apply fuel type display name mapping for preview-display consistency
  // Phase 3 electric equipment support - backend returns lowercase codes, convert to display names
  if (rawData.fuel_type) {
    (soilData as any).fuel_type = getFuelTypeDisplayName(rawData.fuel_type);
  }

  // Handle direct field mapping for amendment and tillage fields
  // Bridge legacy form field names to registry field names:
  //   amendment_amount (string) → amendment_amount_numeric (number)
  //   amendment_unit → amendment_amount_unit
  if (rawData.amendment_amount !== undefined) {
    soilData.amendment_amount = rawData.amendment_amount;
    // Registry uses amendment_amount_numeric (DecimalField on backend)
    const parsed = parseFloat(String(rawData.amendment_amount));
    if (!isNaN(parsed)) {
      (soilData as any).amendment_amount_numeric = parsed;
    }
  }
  if (rawData.amendment_amount_numeric !== undefined) {
    (soilData as any).amendment_amount_numeric = rawData.amendment_amount_numeric;
  }
  if (rawData.amendment_unit !== undefined) {
    soilData.amendment_unit = rawData.amendment_unit;
    // Registry uses amendment_amount_unit
    (soilData as any).amendment_amount_unit = rawData.amendment_unit;
  }
  if (rawData.amendment_amount_unit !== undefined) {
    (soilData as any).amendment_amount_unit = rawData.amendment_amount_unit;
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
  // Bridge tillage_depth → working_depth for registry (registry uses working_depth)
  if ((soilData as any).tillage_depth && !(soilData as any).working_depth) {
    (soilData as any).working_depth = soilData.tillage_depth;
  }
  if ((soilData as any).tillage_depth_unit && !(soilData as any).depth_unit) {
    (soilData as any).depth_unit = soilData.tillage_depth_unit;
  }

  // Grazing Summary Mode (GTM-v3): log a rotation of grazing passes as one summary event,
  // mirroring the pest-scouting aggregate pattern. Only meaningful for the GR (grazing) subtype.
  // Carries the date range, pass count, and totals so a sheep-grazing regenerative grower can
  // record a whole rotation without 12 separate entries. is_summary + companion fields live in
  // extra_data (extracted server-side); no model migration.
  const soilType = (soilData as any).type || rawData.type || rawData.soil_management_type;
  const isGrazingSummary =
    soilType === 'GR' &&
    (rawData.is_summary === 'true' ||
      rawData.is_summary === true ||
      rawData.extra_data?.is_summary === true ||
      rawData.extra_data?.is_summary === 'true');

  if (isGrazingSummary) {
    (soilData as any).is_summary = true;

    const dateStart = rawData.date_start || rawData.extra_data?.date_start;
    const dateEnd = rawData.date_end || rawData.extra_data?.date_end;
    if (dateStart) (soilData as any).date_start = dateStart;
    if (dateEnd) (soilData as any).date_end = dateEnd;

    const eventCount = rawData.event_count || rawData.extra_data?.event_count;
    if (eventCount) {
      const parsed = typeof eventCount === 'string' ? parseInt(eventCount, 10) : eventCount;
      if (!isNaN(parsed) && parsed > 0) (soilData as any).event_count = parsed;
    }

    const totalGrazingDays = rawData.total_grazing_days || rawData.extra_data?.total_grazing_days;
    if (totalGrazingDays) {
      const parsed =
        typeof totalGrazingDays === 'string' ? parseInt(totalGrazingDays, 10) : totalGrazingDays;
      if (!isNaN(parsed) && parsed > 0) (soilData as any).total_grazing_days = parsed;
    }

    const areaTotal =
      rawData.area_covered_total ||
      rawData.field_area_total ||
      rawData.extra_data?.area_covered_total;
    const areaUnit = rawData.area_unit || rawData.extra_data?.area_unit || 'ha';
    if (areaTotal) {
      const parsed = typeof areaTotal === 'string' ? parseFloat(areaTotal) : areaTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (soilData as any).area_covered_total = parsed;
        (soilData as any).area_unit = areaUnit;
      }
    }
  } else if (rawData.is_summary === 'false' || rawData.is_summary === false) {
    (soilData as any).is_summary = false;
  }

  return soilData;
}

/**
 * Normalize pest management event specific data
 */
function normalizePestManagementEventData(
  rawData: any,
  _dataSource: DataSource,
  fieldMapping: Record<string, string>
): Partial<StandardizedPestManagementEvent> {
  const pestData: Partial<StandardizedPestManagementEvent> = {};

  // Map pest-specific fields
  const pestFields = [
    // §E-4 — preventive cultural practice (7 CFR 205.206(a)). Allow-list: omit it and the
    // consumer card renders nothing regardless of the registry FieldConfig.
    'cultural_practice',
    'pest_management_type',
    'pest_management_name',
    'pest_species',
    'damage_percentage',
    'pest_pressure_level',
    'monitoring_count',
    'monitoring_unit',
    // Ghost field cleanup: Removed time_spent_hours, field_area_hectares, travel_distance_km
    // (never in form — form uses area_covered and fuel_consumed instead)
    'trap_count',
    'trap_type',
    'pest_catch_count',
    'beneficial_species',
    'release_quantity',
    // BR NOP 205.206 traceability (supplier/lot audit-only, organic-approved consumer-visible)
    'beneficial_supplier',
    'beneficial_lot_number',
    'beneficial_organic_approved',
    'economic_threshold_met',
    'weather_conditions',
    'crop_growth_stage',
    'action_recommended',
    'action_threshold_met',
    'ipm_strategy',
    'pest_management_notes',
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'beneficial_insects_used',
    'chemical_free_period_days',
    // Sprint 3 Epic 3.1: Fuel & Equipment Fields (aligned with Production/Soil forms)
    'area_covered',
    'area_unit',
    'fuel_type',
    'fuel_consumed',
    'fuel_unit',
    'equipment_hours',
    'production_efficiency',
    // NOP Compliance: Pest ID verification + Threshold rationale (7 CFR 205.206)
    'threshold_rationale',
    'identified_by',
    'identification_method',
    // Universal context fields present across event types
    'variety',
    'block_id',
    'growth_stage'
  ];

  mapFields(rawData, pestData, pestFields, fieldMapping);

  // Sprint 5: Aggregate Pest Scouting Support
  // Handle is_summary (comes as string 'true'/'false' from form, or boolean from backend/extra_data)
  const isSummaryEvent =
    rawData.is_summary === 'true' ||
    rawData.is_summary === true ||
    rawData.extra_data?.is_summary === true ||
    rawData.extra_data?.is_summary === 'true';

  if (isSummaryEvent) {
    (pestData as any).is_summary = true;

    // Date range for summary events
    const dateStart = rawData.date_start || rawData.extra_data?.date_start;
    const dateEnd = rawData.date_end || rawData.extra_data?.date_end;
    if (dateStart) {
      (pestData as any).date_start = dateStart;
    }
    if (dateEnd) {
      (pestData as any).date_end = dateEnd;
    }

    // Field area total (form sends area_covered_total, normalize to field_area_total)
    const fieldAreaTotal =
      rawData.field_area_total ||
      rawData.area_covered_total ||
      rawData.extra_data?.field_area_total ||
      rawData.extra_data?.area_covered_total;
    const areaUnit = rawData.area_unit || rawData.extra_data?.area_unit || 'ha';
    if (fieldAreaTotal) {
      const parsed =
        typeof fieldAreaTotal === 'string' ? parseFloat(fieldAreaTotal) : fieldAreaTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (pestData as any).field_area_total = parsed;
        (pestData as any).area_unit = areaUnit;
      }
    }

    // Travel distance total
    const travelDistanceTotal =
      rawData.travel_distance_total || rawData.extra_data?.travel_distance_total;
    const distanceUnit = rawData.distance_unit || rawData.extra_data?.distance_unit || 'miles';
    if (travelDistanceTotal) {
      const parsed =
        typeof travelDistanceTotal === 'string'
          ? parseFloat(travelDistanceTotal)
          : travelDistanceTotal;
      if (!isNaN(parsed) && parsed > 0) {
        (pestData as any).travel_distance_total = parsed;
        (pestData as any).distance_unit = distanceUnit;
      }
    }

    // Pest observations summary fields
    const pestSpeciesObserved =
      rawData.pest_species_observed || rawData.extra_data?.pest_species_observed;
    if (pestSpeciesObserved) {
      (pestData as any).pest_species_observed = pestSpeciesObserved;
    }

    const averagePestPressure =
      rawData.average_pest_pressure || rawData.extra_data?.average_pest_pressure;
    if (averagePestPressure) {
      (pestData as any).average_pest_pressure = averagePestPressure;
    }

    const observationsSummary =
      rawData.observations_summary || rawData.extra_data?.observations_summary;
    if (observationsSummary) {
      (pestData as any).observations_summary = observationsSummary;
    }

    // Zero carbon marker for pest scouting
    const carbonImpact = rawData.carbon_impact || rawData.extra_data?.carbon_impact;
    if (carbonImpact) {
      (pestData as any).carbon_impact = carbonImpact;
    } else {
      // Default to zero for pest scouting as it's observational
      (pestData as any).carbon_impact = 'zero';
    }

    const carbonNotes = rawData.carbon_notes || rawData.extra_data?.carbon_notes;
    if (carbonNotes) {
      (pestData as any).carbon_notes = carbonNotes;
    }
  } else {
    // Explicitly mark individual events as non-summary
    (pestData as any).is_summary = false;
  }

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
    'business_type', // Raw business type code (CE/CM/IN) for title resolution fallback
    'certification_type',
    'certification_type_display',
    'carbon_credits_earned',
    'carbon_credits_unit',
    'verification_status',
    'sustainability_practice',
    'trust_impact',
    'transparency_benefit',
    'business_observation',
    // Sprint 3 Epic 3.2: Consumer Trust Fields
    'verified_certifier_name',
    'certificate_number'
  ];

  mapFields(rawData, businessData, businessFields, fieldMapping);

  // BusinessTab-SIMPLIFIED.jsx does not render a `type` input — it uses `business_type`
  // (certification / compliance / verification / ...) to drive the activity selector. Form-
  // sourced preview data therefore carries no `business_event_type`, so ConsumerEventCard and
  // the registry bridge would resolve `subtype = undefined` and hide every field gated by the
  // business subtypes.
  //
  // D3: the tab now derives the real subtype on submit via resolveBusinessSubtype, so the
  // preview uses the SAME function. It previously hardcoded 'CE', which made the preview claim
  // a certification for an inspection — and matched the equally wrong value the save path
  // produced. Both sides now read from one map, so the preview a farmer approves is the row
  // that lands in the database.
  if (dataSource === 'form' && !businessData.business_event_type && rawData.business_type) {
    (businessData as any).business_event_type = resolveBusinessSubtype(rawData.business_type);
  }

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
