import { format } from 'date-fns';

/**
 * Event interface that matches what ConsumerEventCard expects
 */
export interface PreviewEventData {
  id: string;
  type: string;
  name?: string;
  production_name?: string;
  description: string;
  observation?: string;
  date: string;
  certified?: boolean;
  blockchain_verified?: boolean;
  blockchain_transaction?: string;
  blockchain_block_number?: number;
  blockchain_explorer_url?: string;
  blockchain_network?: string;
  verification_confidence?: number;
  verification_timestamp?: string;
  data_integrity_score?: number;
  usda_verified?: boolean;
  volume?: string;
  volume_unit?: string;
  area?: string;
  carbon_impact?: number;
  event_type?: number;
  // Additional fields that may be present
  area_covered?: number | string;
  yield_quantity?: number | string;
  fuel_consumed?: number | string;
  equipment_hours?: number | string;
  area_unit?: string;
  yield_unit?: string;
  fuel_unit?: string;
  // Raw numeric values for calculations
  area_covered_raw?: number;
  yield_quantity_raw?: number;
  fuel_consumed_raw?: number;
  equipment_hours_raw?: number;
  transportation_distance_raw?: number;
  // Transportation fields (HA - Harvesting only)
  transportation_distance?: string;
  transportation_unit?: string;
  concentration?: string;
  npk_ratio?: string;
  active_ingredient?: string;
  application_method?: string;
  chemical_type?: string; // FE, PE, FU, HE - the main chemical category
  chemical_subtype?: string; // Added 2025-01-21: organic vs synthetic differentiation
  target_pest_disease_need?: string;
  weather_conditions?: string;
  application_timing?: string;
  commercial_name?: string;
  equipment?: string;
  // General event fields
  activity_type?: string;
  activity_name?: string;
  duration?: string;
  duration_raw?: number;
  people_involved?: number;
  activity_notes?: string;
  album?: {
    id: string;
    images: Array<{
      id: string;
      image: string;
      caption?: string;
      created_at?: string;
    }>;
  };
  extra_data?: {
    blockchain_verified?: boolean;
    blockchain_transaction?: string;
    blockchain_block_number?: number;
    verification_confidence?: number;
    verification_timestamp?: string;
    data_integrity_score?: number;
    [key: string]: any;
  };
}

/**
 * Event type mapping to match the NewEvent component configuration
 * CRITICAL: These mappings MUST match the backend Event Type constants
 * Event Type 0: Weather
 * Event Type 1: Production
 * Event Type 2: Chemical
 * Event Type 3: General
 * Event Type 4: Equipment
 * Event Type 5: Soil Management
 * Event Type 6: Pest Management
 * Event Type 7: Business
 */
const EVENT_TYPE_MAP = {
  0: 'weather',
  1: 'production',
  2: 'chemical',
  3: 'general',
  4: 'equipment',
  5: 'soil_management',
  6: 'pest_management', // ✅ FIXED: Event Type 6 = Pest Management
  7: 'business' // ✅ FIXED: Event Type 7 = Business
};

/**
 * Convert technical fuel type codes to display names
 */
function getFuelTypeDisplayName(fuelTypeCode: string): string {
  const fuelTypeMapping: Record<string, string> = {
    diesel: 'Diesel',
    gasoline: 'Gasoline',
    biodiesel: 'Biodiesel',
    electric: 'Electric',
    natural_gas: 'Natural Gas'
  };

  return fuelTypeMapping[fuelTypeCode] || fuelTypeCode;
}

/**
 * Generate consumer-friendly description based on event type and form data
 */
function generateEventDescription(eventType: number, formData: any): string {
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

  // Use user's actual description if provided
  if (formData.description && formData.description.trim()) {
    return formData.description.trim();
  }

  // Use observation field if provided
  if (formData.observation && formData.observation.trim()) {
    return formData.observation.trim();
  }

  // For chemical events, try to build description from product name
  if (eventType === 2 && formData.commercial_name) {
    const typeMapping = {
      FE: 'fertilizer',
      PE: 'pesticide',
      FU: 'fungicide',
      HE: 'herbicide'
    };
    const chemicalType = typeMapping[formData.type as keyof typeof typeMapping] || 'chemical';
    return `Applied ${formData.commercial_name} ${chemicalType}`;
  }

  // For production events, prioritize user's custom name
  if (eventType === 1) {
    // Priority 1: Use custom event name if provided
    if (formData.name && formData.name.trim()) {
      return formData.name.trim();
    }

    // Priority 2: Build description from type
    if (formData.type) {
      const typeMapping = {
        PL: 'planting',
        HA: 'harvesting',
        IR: 'irrigation',
        PR: 'pruning'
      };
      const activityType =
        typeMapping[formData.type as keyof typeof typeMapping] || 'production activity';
      return `Completed ${activityType} operation`;
    }
  }

  // For equipment events
  if (eventType === 4 && formData.name) {
    return `${formData.name} operation and maintenance`;
  }

  // Return base description WITHOUT event name to avoid duplication
  // The event name is shown in the title, description should be for farmer's notes
  return baseDescriptions[eventType as keyof typeof baseDescriptions] || 'Farming activity';
}

/**
 * Generate mock carbon impact based on event type for preview
 */
function generateMockCarbonImpact(eventType: number, formData: any): number {
  const baseImpacts = {
    0: 0.1, // Weather - minimal
    1: 2.5, // Production - moderate
    2: 1.8, // Chemical - higher
    3: 0.5, // General - low
    4: 1.0, // Equipment - moderate
    5: 0.3, // Soil - low positive
    6: 0.8, // Pest Management - moderate
    7: 0.2 // Business Activity - minimal
  };

  let impact = baseImpacts[eventType as keyof typeof baseImpacts] || 1.0;

  // Adjust based on area if provided
  if (formData.area && !isNaN(parseFloat(formData.area))) {
    impact *= parseFloat(formData.area);
  }
  if (formData.area_covered && !isNaN(parseFloat(formData.area_covered))) {
    impact *= parseFloat(formData.area_covered);
  }

  // Adjust based on volume if provided
  if (formData.volume && !isNaN(parseFloat(formData.volume))) {
    impact *= parseFloat(formData.volume) / 100; // Scale down volume impact
  }

  return Math.round(impact * 100) / 100; // Round to 2 decimal places
}

/**
 * Transform form data into the format expected by ConsumerEventCard
 */
export function transformFormDataToEvent(
  activeEventType: number,
  formData: any,
  eventId: string = 'preview'
): PreviewEventData {
  const now = new Date();
  const eventDate = formData.date || now.toISOString();

  // Base event data
  const event: PreviewEventData = {
    id: eventId,
    type: EVENT_TYPE_MAP[activeEventType as keyof typeof EVENT_TYPE_MAP] || 'general',
    description: generateEventDescription(activeEventType, formData),
    observation: formData.observation || '',
    date: eventDate,
    event_type: activeEventType,
    certified: false, // Preview mode
    blockchain_verified: false, // Preview mode
    usda_verified: false, // Preview mode
    carbon_impact: generateMockCarbonImpact(activeEventType, formData)
  };

  // Add event-specific fields based on type
  switch (activeEventType) {
    case 0: // Weather
      // Include weather type for proper field detection
      if (formData.type) event.type = formData.type;
      if (formData.type) event.extra_data = { ...event.extra_data, type: formData.type };
      if (formData.highest_temperature)
        event.extra_data = {
          ...event.extra_data,
          highest_temperature: formData.highest_temperature
        };
      if (formData.lower_temperature)
        event.extra_data = { ...event.extra_data, lower_temperature: formData.lower_temperature };
      if (formData.way_of_protection)
        event.extra_data = { ...event.extra_data, way_of_protection: formData.way_of_protection };
      if (formData.water_deficit) {
        event.extra_data = { ...event.extra_data, water_deficit: formData.water_deficit };
      }
      if (formData.weight) event.extra_data = { ...event.extra_data, weight: formData.weight };
      if (formData.diameter)
        event.extra_data = { ...event.extra_data, diameter: formData.diameter };
      if (formData.duration)
        event.extra_data = { ...event.extra_data, duration: formData.duration };
      if (formData.start_date)
        event.extra_data = { ...event.extra_data, start_date: formData.start_date };
      if (formData.end_date)
        event.extra_data = { ...event.extra_data, end_date: formData.end_date };
      if (formData.wind_speed)
        event.extra_data = { ...event.extra_data, wind_speed: formData.wind_speed };
      if (formData.precipitation_amount)
        event.extra_data = {
          ...event.extra_data,
          precipitation_amount: formData.precipitation_amount
        };
      if (formData.damage_assessment)
        event.extra_data = { ...event.extra_data, damage_assessment: formData.damage_assessment };
      if (formData.protection_measures)
        event.extra_data = {
          ...event.extra_data,
          protection_measures: formData.protection_measures
        };
      if (formData.humidity_level)
        event.extra_data = { ...event.extra_data, humidity_level: formData.humidity_level };
      if (formData.crop_impact)
        event.extra_data = { ...event.extra_data, crop_impact: formData.crop_impact };
      break;

    case 1: // Production
      // 🌱 CRITICAL: Set production_name and name for proper display
      if (formData.name) {
        event.production_name = formData.name;
        event.name = formData.name;
      }

      // Set the correct production type code
      if (formData.type) {
        event.type = formData.type;
      }

      // 🔧 FIXED: Map all possible form field variations to expected event fields

      // Area covered with units
      if (formData.area_covered || formData.area) {
        const areaValue = parseFloat(formData.area_covered || formData.area);
        const areaUnit = formData.area_unit || formData.unit || 'hectares';
        event.area_covered = `${areaValue} ${areaUnit}`;
      }

      // Yield/Quantity with units (quantity_planted maps to yield_quantity)
      if (formData.yield_quantity || formData.quantity_planted || formData.quantity) {
        const quantityValue = parseFloat(
          formData.yield_quantity || formData.quantity_planted || formData.quantity
        );
        const quantityUnit =
          formData.yield_unit || formData.quantity_unit || formData.unit_quantity || 'kg';
        event.yield_quantity = `${quantityValue} ${quantityUnit}`;
      }

      // Fuel consumed with units - show if explicitly provided (including 0)
      if (
        formData.fuel_consumed !== undefined &&
        formData.fuel_consumed !== '' &&
        formData.fuel_consumed !== null
      ) {
        const fuelValue = parseFloat(formData.fuel_consumed);
        const fuelUnit = formData.fuel_unit || 'liters';

        if (!isNaN(fuelValue) && fuelValue >= 0) {
          event.fuel_consumed = `${fuelValue} ${fuelUnit}`;
        }
      } else if (
        formData.fuel_amount !== undefined &&
        formData.fuel_amount !== '' &&
        formData.fuel_amount !== null
      ) {
        const fuelValue = parseFloat(formData.fuel_amount);
        const fuelUnit = formData.fuel_unit || 'liters';

        if (!isNaN(fuelValue) && fuelValue >= 0) {
          event.fuel_consumed = `${fuelValue} ${fuelUnit}`;
        }
      }

      // Equipment hours - show if explicitly provided (including 0)
      if (
        formData.equipment_hours !== undefined &&
        formData.equipment_hours !== '' &&
        formData.equipment_hours !== null
      ) {
        const hoursValue = parseFloat(formData.equipment_hours);

        if (!isNaN(hoursValue) && hoursValue >= 0) {
          event.equipment_hours = `${hoursValue} hours`;
        }
      } else if (
        formData.operating_hours !== undefined &&
        formData.operating_hours !== '' &&
        formData.operating_hours !== null
      ) {
        const hoursValue = parseFloat(formData.operating_hours);

        if (!isNaN(hoursValue) && hoursValue >= 0) {
          event.equipment_hours = `${hoursValue} hours`;
        }
      }

      // Transportation (HA - Harvesting only)
      if (
        formData.transportation_distance !== undefined &&
        formData.transportation_distance !== '' &&
        formData.transportation_distance !== null
      ) {
        const transportValue = parseFloat(formData.transportation_distance);
        const transportUnit = formData.transportation_unit || 'km';

        if (!isNaN(transportValue) && transportValue >= 0) {
          event.transportation_distance = `${transportValue} ${transportUnit}`;
        }
      }

      // Store raw numeric values for calculations (backward compatibility)
      if (formData.area_covered || formData.area)
        event.area_covered_raw = parseFloat(formData.area_covered || formData.area);
      if (formData.yield_quantity || formData.quantity_planted || formData.quantity)
        event.yield_quantity_raw = parseFloat(
          formData.yield_quantity || formData.quantity_planted || formData.quantity
        );
      if (formData.fuel_consumed || formData.fuel_amount)
        event.fuel_consumed_raw = parseFloat(formData.fuel_consumed || formData.fuel_amount);
      if (formData.equipment_hours || formData.operating_hours)
        event.equipment_hours_raw = parseFloat(
          formData.equipment_hours || formData.operating_hours
        );
      if (formData.transportation_distance)
        event.transportation_distance_raw = parseFloat(formData.transportation_distance);

      // Store units separately for flexibility
      if (formData.area_unit || formData.unit)
        event.area_unit = formData.area_unit || formData.unit;
      if (formData.yield_unit || formData.quantity_unit)
        event.yield_unit = formData.yield_unit || formData.quantity_unit;
      if (formData.fuel_unit) event.fuel_unit = formData.fuel_unit;
      if (formData.transportation_unit) event.transportation_unit = formData.transportation_unit;
      break;

    case 2: // Chemical
      // Set general chemical type for event classification
      event.type = 'chemical';
      // CRITICAL: Preserve specific chemical type (FE, PE, FU, HE) for event descriptions
      if (formData.type && ['FE', 'PE', 'FU', 'HE'].includes(formData.type)) {
        event.chemical_type = formData.type;
      }
      // Chemical subtype for accurate carbon emission calculations (organic, synthetic, biological, etc.)
      // Added 2025-01-21: Ensures preview matches ProductDetail display for transparency
      if (formData.chemical_subtype) {
        event.chemical_subtype = formData.chemical_subtype;
      }
      if (formData.volume) event.volume = String(formData.volume);
      if (formData.volume_applied) event.volume = String(formData.volume_applied);
      if (formData.volume_unit) event.volume_unit = formData.volume_unit;
      if (formData.area) event.area = String(formData.area);
      if (formData.area_treated) event.area = String(formData.area_treated);
      if (formData.area_unit) event.area_unit = formData.area_unit;
      if (formData.concentration) event.concentration = String(formData.concentration);
      if (formData.npk_ratio) event.npk_ratio = String(formData.npk_ratio);
      if (formData.active_ingredient) event.active_ingredient = formData.active_ingredient;
      if (formData.application_method || formData.way_of_application) {
        event.application_method = formData.application_method || formData.way_of_application;
      }
      if (formData.target_pest_disease || formData.target_pest_disease_need) {
        event.target_pest_disease_need =
          formData.target_pest_disease || formData.target_pest_disease_need;
      }
      if (formData.weather_conditions) event.weather_conditions = formData.weather_conditions;
      if (formData.application_timing) event.application_timing = formData.application_timing;
      if (formData.commercial_name) event.commercial_name = formData.commercial_name;
      break;

    case 3: // General
      // Map all General event form fields to event data
      if (formData.activity_type || formData.type) {
        event.activity_type = formData.activity_type || formData.type;
      }
      if (formData.activity_name || formData.name) {
        event.activity_name = formData.activity_name || formData.name;
      }

      // Handle duration - check both field variations
      const durationValue = formData.duration_hours || formData.duration;
      if (durationValue !== undefined && durationValue !== '') {
        const parsedDuration = parseFloat(durationValue);
        if (!isNaN(parsedDuration) && parsedDuration >= 0) {
          event.duration = `${parsedDuration} hours`;
          event.duration_raw = parsedDuration;
        }
      }

      // Handle people involved - check both field variations
      const peopleValue = formData.participants || formData.people_involved;
      if (peopleValue !== undefined && peopleValue !== '') {
        const parsedPeople = parseInt(peopleValue);
        if (!isNaN(parsedPeople) && parsedPeople >= 0) {
          event.people_involved = parsedPeople;
        }
      }

      // Handle activity notes
      if (formData.activity_notes || formData.notes || formData.description) {
        event.activity_notes = formData.activity_notes || formData.notes || formData.description;
      }

      // Set name from activity_name for display consistency
      if (formData.activity_name || formData.name) {
        event.name = formData.activity_name || formData.name;
      }
      break;

    case 4: // Equipment
      // Map Equipment event form fields to event data for proper field display

      // 🚨 CRITICAL FIX: Map Equipment operation codes to full display names
      // PROBLEM: Form sends codes (MN, FC, RE, etc.) but preview must show full names
      const EQUIPMENT_OPERATION_LABELS: Record<string, string> = {
        FC: 'Fuel Consumption',
        MN: 'Maintenance', // CRITICAL: MN → Maintenance
        RE: 'Repair',
        CA: 'Calibration',
        BD: 'Breakdown',
        EI: 'Inspection'
      };

      // Operation Information (immediate display fields)
      // Equipment form uses 'type' field (not 'operation_type')
      if (formData.type) {
        // 🚨 CRITICAL: Store both code (for routing) AND full name (for display)
        event.operation_type = EQUIPMENT_OPERATION_LABELS[formData.type] || formData.type; // Full name for display
        event.operation_type_code = formData.type; // Code for backend
        event.type = formData.type; // Keep original field for routing
      }

      // Equipment form uses 'name' field (not 'operation_name')
      if (formData.name) {
        event.operation_name = formData.name; // Map 'name' to 'operation_name' for display
        event.name = formData.name; // Keep original field for title display
      }

      if (formData.equipment_type) {
        event.equipment_type = formData.equipment_type;
      }

      // Fuel and Equipment Data (secondary display fields)
      if (formData.fuel_consumed !== undefined && formData.fuel_consumed !== '') {
        const fuelValue = parseFloat(formData.fuel_consumed);
        if (!isNaN(fuelValue) && fuelValue >= 0) {
          event.fuel_consumed = fuelValue;
        }
      }

      if (formData.fuel_type) {
        event.fuel_type = getFuelTypeDisplayName(formData.fuel_type);
      }

      if (formData.hours_operated !== undefined && formData.hours_operated !== '') {
        const hoursValue = parseFloat(formData.hours_operated);
        if (!isNaN(hoursValue) && hoursValue >= 0) {
          event.hours_operated = hoursValue;
        }
      }

      if (formData.area_worked !== undefined && formData.area_worked !== '') {
        const areaValue = parseFloat(formData.area_worked);
        if (!isNaN(areaValue) && areaValue >= 0) {
          event.area_worked = areaValue;
        }
      }

      if (formData.operation_efficiency) {
        event.operation_efficiency = formData.operation_efficiency;
      }

      // Operation Notes (detail display fields)
      // Equipment form uses 'observation' field for operation notes
      if (formData.observation) {
        event.operation_notes = formData.observation;
      }
      // Legacy fallback for other possible field names
      else if (formData.operation_notes || formData.notes || formData.description) {
        event.operation_notes = formData.operation_notes || formData.notes || formData.description;
      }

      break;

    case 5: // Soil Management
      // Map all Soil Management event form fields to event data for proper field display

      // Basic Information (immediate display fields)
      if (formData.type) {
        event.soil_management_type = formData.type; // Maps to soil management type
        event.type = formData.type; // Keep original for routing
      }

      if (formData.name) {
        event.soil_management_name = formData.name;
        event.name = formData.name; // Keep for title display
      }

      // Area Information (immediate display fields) - Enhanced formatting like Production events
      if (formData.area !== undefined && formData.area !== '') {
        const areaValue = parseFloat(formData.area);
        const areaUnit = formData.area_unit || 'ha';
        if (!isNaN(areaValue) && areaValue >= 0) {
          event.area_managed = `${areaValue} ${areaUnit}`; // ✅ ENHANCED: Formatted with unit like Production events
          event.area = areaValue; // Legacy compatibility for calculations
        }
      }

      if (formData.area_unit) {
        event.area_unit = formData.area_unit;
      }

      // Working Depth (immediate display field) - Enhanced formatting
      if (formData.depth !== undefined && formData.depth !== '') {
        const depthValue = parseFloat(formData.depth);
        const depthUnit = formData.depth_unit || 'cm';
        if (!isNaN(depthValue) && depthValue >= 0) {
          event.working_depth = `${depthValue} ${depthUnit}`; // ✅ ENHANCED: Formatted with unit
        }
      }

      if (formData.depth_unit) {
        event.depth_unit = formData.depth_unit;
      }

      // Soil Properties (secondary display fields)
      if (formData.soil_ph !== undefined && formData.soil_ph !== '') {
        const phValue = parseFloat(formData.soil_ph);
        if (!isNaN(phValue)) {
          event.soil_ph = phValue;
        }
      }

      if (
        formData.organic_matter_percentage !== undefined &&
        formData.organic_matter_percentage !== ''
      ) {
        const omValue = parseFloat(formData.organic_matter_percentage);
        if (!isNaN(omValue)) {
          event.organic_matter = omValue;
        }
      }

      if (formData.soil_texture) {
        event.soil_texture = formData.soil_texture;
      }

      if (formData.soil_moisture) {
        event.soil_moisture = formData.soil_moisture;
      }

      // Equipment & Operations (secondary display fields) - Enhanced formatting like Production events
      if (formData.area_covered !== undefined && formData.area_covered !== '') {
        const areaCoveredValue = parseFloat(formData.area_covered);
        if (!isNaN(areaCoveredValue) && areaCoveredValue >= 0) {
          event.area_covered = `${areaCoveredValue} hectares`; // ✅ ENHANCED: Formatted with unit like Production events
        }
      }

      if (formData.fuel_consumed !== undefined && formData.fuel_consumed !== '') {
        const fuelValue = parseFloat(formData.fuel_consumed);
        const fuelUnit = formData.fuel_unit || 'L';
        if (!isNaN(fuelValue) && fuelValue >= 0) {
          event.fuel_consumed = `${fuelValue} ${fuelUnit}`; // ✅ ENHANCED: Formatted with unit like Production events
        }
      }

      if (formData.fuel_unit) {
        event.fuel_unit = formData.fuel_unit;
      }

      if (formData.equipment_hours !== undefined && formData.equipment_hours !== '') {
        const hoursValue = parseFloat(formData.equipment_hours);
        if (!isNaN(hoursValue) && hoursValue >= 0) {
          event.equipment_hours = `${hoursValue} hours`; // ✅ ENHANCED: Formatted with unit like Production events
        }
      }

      if (formData.production_efficiency) {
        event.production_efficiency = formData.production_efficiency;
      }

      if (
        formData.transportation_distance !== undefined &&
        formData.transportation_distance !== ''
      ) {
        const distanceValue = parseFloat(formData.transportation_distance);
        const transportUnit = formData.transportation_unit || 'km';
        if (!isNaN(distanceValue) && distanceValue >= 0) {
          event.transportation_distance = `${distanceValue} ${transportUnit}`; // ✅ ENHANCED: Formatted with unit like Production events
        }
      }

      if (formData.transportation_unit) {
        event.transportation_unit = formData.transportation_unit;
      }

      // Environmental Conditions (details display fields)
      if (formData.weather_conditions) {
        event.weather_conditions = formData.weather_conditions;
      }

      if (formData.temperature_range) {
        event.temperature_range = formData.temperature_range;
      }

      if (formData.equipment_used) {
        event.equipment_used = formData.equipment_used;
      }

      // Tillage-specific fields
      if (formData.tillage_type) {
        event.tillage_type = formData.tillage_type;
      }

      if (formData.tillage_intensity) {
        event.tillage_intensity = formData.tillage_intensity;
      }

      if (formData.tillage_direction) {
        event.tillage_direction = formData.tillage_direction;
      }

      if (formData.residue_management) {
        event.residue_management = formData.residue_management;
      }

      // Observations & Notes (details display fields)
      if (formData.observation) {
        event.soil_management_notes = formData.observation;
      }
      // Legacy fallback for other possible field names
      else if (formData.notes || formData.description) {
        event.soil_management_notes = formData.notes || formData.description;
      }

      break;

    case 7: // Business
      // Map all Business event form fields to event data for proper field display

      // Basic Information (immediate display fields)
      if (formData.type) {
        event.business_event_type = formData.type; // Maps to business event type (CE, CM, IN)
        event.type = formData.type; // Keep original for routing
      }

      if (formData.name) {
        event.business_event_name = formData.name;
        event.name = formData.name; // Keep for title display
      }

      // Business Activity Type (immediate display field)
      if (formData.business_type) {
        event.business_activity_type = formData.business_type; // Maps to business activity type
        event.business_type = formData.business_type; // Keep original
      }

      // Certification Details (secondary display fields)
      if (formData.certification_type) {
        event.certification_type = formData.certification_type;
      }

      // Carbon Credits Information (secondary display fields)
      if (formData.carbon_credits_earned !== undefined && formData.carbon_credits_earned !== '') {
        const creditsValue = parseFloat(formData.carbon_credits_earned);
        if (!isNaN(creditsValue) && creditsValue >= 0) {
          event.carbon_credits_earned = creditsValue;
        }
      }

      if (formData.carbon_credits_unit) {
        event.carbon_credits_unit = formData.carbon_credits_unit;
      }

      // Verification and Compliance (details display fields)
      if (formData.verification_status) {
        event.verification_status = formData.verification_status;
      }

      if (formData.sustainability_practice) {
        event.sustainability_practice = formData.sustainability_practice;
      }

      // Trust and Transparency Information (secondary display fields)
      if (formData.trust_impact) {
        event.trust_impact = formData.trust_impact;
      }

      if (formData.transparency_benefit) {
        event.transparency_benefit = formData.transparency_benefit;
      }

      // Observations & Notes (details display fields)
      if (formData.observation) {
        event.business_observation = formData.observation;
        event.observation = formData.observation; // Keep for general display
      }

      break;

    case 6: // Pest Management
      // Map all Pest Management form fields to event data for proper field display

      // Basic Information (immediate display fields)
      if (formData.type) {
        event.pest_management_type = formData.type; // Maps to pest management type (SC, BR, etc.)
        event.type = formData.type; // Keep original for routing
      }

      if (formData.name) {
        event.pest_management_name = formData.name;
        event.name = formData.name; // Keep for title display
      }

      // Agricultural Context Fields (immediate/secondary display fields)
      if (formData.field_area_hectares) {
        event.field_area_hectares = parseFloat(formData.field_area_hectares);
      }

      if (formData.travel_distance_km) {
        event.travel_distance_km = parseFloat(formData.travel_distance_km);
      }

      if (formData.time_spent_hours) {
        event.time_spent_hours = parseFloat(formData.time_spent_hours);
      }

      // Agricultural Decision Fields (secondary display fields)
      if (formData.crop_growth_stage) {
        event.crop_growth_stage = formData.crop_growth_stage;
      }

      if (formData.weather_conditions) {
        event.weather_conditions = formData.weather_conditions;
      }

      if (formData.economic_threshold_met !== undefined) {
        event.economic_threshold_met = formData.economic_threshold_met;
      }

      if (formData.action_recommended) {
        event.action_recommended = formData.action_recommended;
      }

      // Pest Management Specific Fields (immediate/secondary display fields)
      if (formData.pest_species) {
        event.pest_species = formData.pest_species;
      }

      if (formData.pest_pressure_level) {
        event.pest_pressure_level = formData.pest_pressure_level;
      }

      if (formData.beneficial_species) {
        event.beneficial_species = formData.beneficial_species;
      }

      if (formData.release_quantity) {
        event.release_quantity = parseFloat(formData.release_quantity);
      }

      if (formData.trap_count) {
        event.trap_count = parseInt(formData.trap_count);
      }

      if (formData.damage_percentage) {
        event.damage_percentage = parseFloat(formData.damage_percentage);
      }

      if (formData.action_threshold_met !== undefined) {
        event.action_threshold_met = formData.action_threshold_met;
      }

      if (formData.imp_strategy) {
        event.imp_strategy = formData.imp_strategy;
      }

      break;
  }

  // Handle photo/album data for preview
  if (
    formData.acceptedFiles &&
    Array.isArray(formData.acceptedFiles) &&
    formData.acceptedFiles.length > 0
  ) {
    event.album = {
      id: 'preview-album',
      images: formData.acceptedFiles.map((file, index) => ({
        id: `preview-${index}`,
        image: typeof file === 'string' ? file : file.url || file,
        caption: `Event photo ${index + 1}`,
        created_at: new Date().toISOString()
      }))
    };
  }

  // Handle legacy photo data formats if they exist
  if (formData.album && formData.album.images) {
    event.album = formData.album;
  }

  // Handle direct image URLs array
  if (formData.imageUrls && Array.isArray(formData.imageUrls) && formData.imageUrls.length > 0) {
    event.album = {
      id: 'preview-album',
      images: formData.imageUrls.map((url, index) => ({
        id: `preview-url-${index}`,
        image: url,
        caption: `Event photo ${index + 1}`,
        created_at: new Date().toISOString()
      }))
    };
  }

  // Add mock verification data for preview
  event.verification_confidence = 85;
  event.data_integrity_score = 90;

  return event;
}

/**
 * Format date for display in the preview
 */
export function formatPreviewDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return format(date, "MMM dd, yyyy 'at' h:mm a");
  } catch (error) {
    return 'Just now';
  }
}

/**
 * Check if form data has enough information for a meaningful preview
 */
export function hasMinimalPreviewData(activeEventType: number, formData: any): boolean {
  // For chemical events, we need at least a product name or type
  if (activeEventType === 2) {
    return Boolean(formData.commercial_name || formData.type || formData.active_ingredient);
  }

  // For production events, we need at least a type or some measurable data
  if (activeEventType === 1) {
    return Boolean(
      formData.type ||
        formData.area_covered ||
        formData.yield_quantity ||
        formData.equipment_hours ||
        formData.operating_hours ||
        formData.name // Allow preview if we have an event name
    );
  }

  // For other events that require dates, check for date
  // Date is automatically set during transform if missing
  return Boolean(formData.date || formData.name || formData.type);
}
