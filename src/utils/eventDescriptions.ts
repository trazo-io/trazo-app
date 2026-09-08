// Event descriptions and transparency details for consumer-facing displays

import { CONSUMER_DESCRIPTION_ES } from './eventDescriptions.es';
import { isAffirmativeFlag } from '../config/events/formatters';

export interface EventDescriptionData {
  title: string;
  description: string;
  shortDescription: string;
  icon: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  consumerMessage: string;
  consumerImpact: string;
  sustainabilityBenefit: string;
}

/**
 * Event descriptions mapped to consumer-friendly explanations
 */
export const eventDescriptions: Record<string, string> = {
  'fertilizer application': 'Nutrients were applied to feed the crop',
  'pesticide application': 'Applied targeted pest control to protect plants from harmful insects',
  'fungicide application': 'A treatment was applied against a plant disease',
  'herbicide application': 'A treatment was applied to control weeds',
  'chemical application':
    'Applied agricultural treatment as part of integrated crop management program',

  // Pest Management Event Types
  'pest scouting':
    'Monitored crops for pest populations and damage levels to inform management decisions',
  'trap monitoring': 'Pest traps around the block were checked and the counts written down',
  'beneficial release': 'Beneficial insects were released into the block',
  'pest identification': 'The pest was identified before any decision about treating it',
  'threshold assessment':
    'Evaluated pest population levels against economic thresholds to determine treatment needs',
  'ipm implementation':
    'Several pest-control methods were used together rather than relying on one',
  irrigation: 'Provided water to ensure optimal plant growth and health',
  planting: 'Planted seeds or seedlings to establish the crop',
  harvesting: 'Harvested mature crops at optimal quality and freshness',
  'soil preparation': 'Prepared soil for optimal growing conditions',
  'weather monitoring': 'Monitored weather conditions to inform farming decisions',
  'equipment maintenance': 'Maintained farming equipment for efficient operations',
  'pest monitoring': 'Monitored for pests to inform protection strategies',
  'farm maintenance': 'Maintained farm infrastructure and equipment for optimal operations',
  'equipment setup': 'Configured and prepared equipment for farming activities',
  'infrastructure work': 'Improved farm infrastructure and facility maintenance',
  'planning activity': 'Planned and organized farming activities for optimal productivity',
  documentation: 'Documented farming practices for transparency and compliance',
  training: 'Conducted training activities to improve farming knowledge and skills',
  'safety inspection': 'Inspected farm facilities and equipment for safety compliance',
  'general maintenance': 'Performed general maintenance activities to ensure farm operations',
  default: 'A farming activity was recorded on this date'
};

/**
 * Get real transparency details from actual event data based on the production API
 */
export function getRealTransparencyDetails(event: any): string {
  const details: string[] = [];

  // Handle weather events (event_type: 0) - check extra_data for weather fields
  if (event.event_type === 0) {
    const extraData = event.extra_data || {};

    // Weather event type from weather_type field or type field (FR, DR, HL, etc.)
    const weatherTypeValue = event.weather_type || event.type;
    if (weatherTypeValue && weatherTypeValue !== 'weather') {
      const weatherTypes: Record<string, string> = {
        FR: 'Frost event',
        DR: 'Drought conditions',
        HL: 'Hail damage',
        HT: 'Heat stress',
        TS: 'Storm/Wind',
        HW: 'Heavy rainfall',
        HH: 'High humidity',
        LH: 'Low humidity'
      };
      const weatherType = weatherTypes[weatherTypeValue] || weatherTypeValue;
      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Type: ${weatherType}`);
    }

    // Temperature data from event object or extra_data
    const lowerTempValue =
      event.lower_temperature !== undefined ? event.lower_temperature : extraData.lower_temperature;
    if (lowerTempValue !== undefined) {
      let tempDisplay = '';
      const tempValue = lowerTempValue;

      if (typeof tempValue === 'string') {
        if (tempValue.includes('°C') || tempValue.includes('°F')) {
          tempDisplay = tempValue;
        } else {
          const numTemp = parseFloat(tempValue);
          if (!isNaN(numTemp)) {
            tempDisplay = `${tempValue}°C`;
          } else {
            tempDisplay = tempValue;
          }
        }
      } else if (typeof tempValue === 'number') {
        tempDisplay = `${tempValue}°C`;
      } else {
        tempDisplay = String(tempValue);
      }

      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Min temp: ${tempDisplay}`);
    }

    const highestTempValue =
      event.highest_temperature !== undefined
        ? event.highest_temperature
        : extraData.highest_temperature;
    if (highestTempValue !== undefined) {
      let tempDisplay = '';
      const tempValue = highestTempValue;

      if (typeof tempValue === 'string') {
        if (tempValue.includes('°C') || tempValue.includes('°F')) {
          tempDisplay = tempValue;
        } else {
          const numTemp = parseFloat(tempValue);
          if (!isNaN(numTemp)) {
            tempDisplay = `${tempValue}°C`;
          } else {
            tempDisplay = tempValue;
          }
        }
      } else if (typeof tempValue === 'number') {
        tempDisplay = `${tempValue}°C`;
      } else {
        tempDisplay = String(tempValue);
      }

      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Max temp: ${tempDisplay}`);
    }

    // Protection measures from event object or extra_data
    const protectionValue = event.way_of_protection || extraData.way_of_protection;
    if (protectionValue && String(protectionValue).trim()) {
      // Technical details now shown in Key Details section - removed from description to avoid duplication
      // details.push(`Protection: ${protectionValue}`);
    }

    // Technical details now shown in Key Details section - removed from description to avoid duplication

    // Drought-specific fields
    const waterDeficitValue =
      event.water_deficit !== undefined ? event.water_deficit : extraData.water_deficit;
    if (waterDeficitValue !== undefined && String(waterDeficitValue).trim()) {
      // details.push(`Water deficit: ${waterDeficitValue}`);
    }

    // Hailstorm-specific fields
    const weightValue = event.weight !== undefined ? event.weight : extraData.weight;
    if (weightValue !== undefined && String(weightValue).trim()) {
      // details.push(`Hail weight: ${weightValue}g`);
    }
    const diameterValue = event.diameter !== undefined ? event.diameter : extraData.diameter;
    if (diameterValue !== undefined && String(diameterValue).trim()) {
      // details.push(`Hail size: ${diameterValue}cm`);
    }

    // Date range for high temperature events
    const startDateValue = event.start_date || extraData.start_date;
    if (startDateValue && String(startDateValue).trim()) {
      // details.push(`Start: ${new Date(startDateValue).toLocaleDateString()}`);
    }
    const endDateValue = event.end_date || extraData.end_date;
    if (endDateValue && String(endDateValue).trim()) {
      // details.push(`End: ${new Date(endDateValue).toLocaleDateString()}`);
    }

    // Storm damage assessment
    const damageValue = event.damage_assessment || extraData.damage_assessment;
    if (damageValue && String(damageValue).trim()) {
      // details.push(`Damage: ${damageValue}`);
    }

    // High winds protection measures
    const measuresValue = event.protection_measures || extraData.protection_measures;
    if (measuresValue && String(measuresValue).trim()) {
      // details.push(`Measures: ${measuresValue}`);
    }

    // Humidity crop impact
    const cropImpactValue = event.crop_impact || extraData.crop_impact;
    if (cropImpactValue && String(cropImpactValue).trim()) {
      // details.push(`Impact: ${cropImpactValue}`);
    }

    // Weather conditions
    const weatherConditionsValue = event.weather_conditions || extraData.weather_conditions;
    if (weatherConditionsValue && String(weatherConditionsValue).trim()) {
      // details.push(`Conditions: ${weatherConditionsValue}`);
    }

    // Duration if available (multiple event types use this)
    const durationValue = event.duration !== undefined ? event.duration : extraData.duration;
    if (durationValue !== undefined && String(durationValue).trim()) {
      const duration = durationValue;
      // Handle both string and number formats
      if (typeof duration === 'number') {
        // details.push(`Duration: ${duration}h`);
      } else {
        // details.push(`Duration: ${duration}`);
      }
    }

    // Wind speed for storm events
    if (extraData.wind_speed !== undefined && String(extraData.wind_speed).trim()) {
      // details.push(`Wind: ${extraData.wind_speed}km/h`);
    }

    // Precipitation amount
    if (
      extraData.precipitation_amount !== undefined &&
      String(extraData.precipitation_amount).trim()
    ) {
      // details.push(`Rainfall: ${extraData.precipitation_amount}mm`);
    }

    // Humidity level
    if (extraData.humidity_level !== undefined && String(extraData.humidity_level).trim()) {
      // details.push(`Humidity: ${extraData.humidity_level}%`);
    }

    // Damage assessment for storms/hail
    if (extraData.damage_assessment !== undefined && String(extraData.damage_assessment).trim()) {
      // details.push(`Damage: ${extraData.damage_assessment}`);
    }

    // Protection measures for high winds/frost
    if (
      extraData.protection_measures !== undefined &&
      String(extraData.protection_measures).trim()
    ) {
      // details.push(`Protection: ${extraData.protection_measures}`);
    }

    // Crop impact for humidity events
    if (extraData.crop_impact !== undefined && String(extraData.crop_impact).trim()) {
      // details.push(`Crop impact: ${extraData.crop_impact}`);
    }

    const result = details.length > 0 ? ` • ${details.join(' • ')}` : '';
    return result;
  }

  // Handle production events (event_type: 1) differently
  if (event.event_type === 1) {
    // Area covered - most important for transparency
    if (event.area_covered && event.area_covered > 0) {
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : event.area_unit || 'hectares';
      details.push(`Area: ${event.area_covered} ${areaUnit}`);
    }

    // Quantity for planting/harvesting
    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity =
        quantity >= 1000 ? `${(quantity / 1000).toFixed(0)}K` : quantity.toLocaleString();
      details.push(`Quantity: ${formattedQuantity} ${unit}`);
    }

    // Fuel consumption
    if (event.fuel_consumed && event.fuel_consumed > 0) {
      const fuelUnit = event.fuel_unit || 'L';
      details.push(`Fuel: ${event.fuel_consumed} ${fuelUnit}`);
    }

    // Equipment hours
    if (event.equipment_hours && event.equipment_hours > 0) {
      details.push(`Equipment: ${event.equipment_hours} hours`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle general events (event_type: 3) - show activity details
  if (event.event_type === 3) {
    // Activity type and name
    if (event.activity_type && String(event.activity_type).trim()) {
      const activityDisplay =
        event.activity_name && String(event.activity_name).trim()
          ? `${event.activity_type}: ${event.activity_name}`
          : event.activity_type;
      details.push(`Activity: ${activityDisplay}`);
    } else if (event.activity_name && String(event.activity_name).trim()) {
      details.push(`Activity: ${event.activity_name}`);
    }

    // Duration
    if (
      event.duration &&
      String(event.duration).trim() &&
      String(event.duration).trim() !== 'null'
    ) {
      details.push(`Duration: ${event.duration}`);
    } else if (event.duration_raw && event.duration_raw > 0) {
      details.push(`Duration: ${event.duration_raw} hours`);
    }

    // People involved
    if (event.people_involved && event.people_involved > 0) {
      const peopleText = event.people_involved === 1 ? 'person' : 'people';
      details.push(`People: ${event.people_involved} ${peopleText}`);
    }

    // Activity notes (brief excerpt for transparency)
    if (
      event.activity_notes &&
      String(event.activity_notes).trim() &&
      String(event.activity_notes).trim() !== 'null'
    ) {
      const notes = String(event.activity_notes).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle equipment events (event_type: 3) - show operation details
  if (event.event_type === 3) {
    const details: string[] = [];

    // Operation type and name
    if (event.operation_type && String(event.operation_type).trim()) {
      const operationDisplay =
        event.operation_name && String(event.operation_name).trim()
          ? `${event.operation_type}: ${event.operation_name}`
          : event.operation_type;
      details.push(`Operation: ${operationDisplay}`);
    } else if (event.operation_name && String(event.operation_name).trim()) {
      details.push(`Operation: ${event.operation_name}`);
    }

    // Equipment type
    if (event.equipment_type && String(event.equipment_type).trim()) {
      details.push(`Equipment: ${event.equipment_type}`);
    }

    // Fuel consumption
    if (event.fuel_consumed && event.fuel_consumed > 0) {
      details.push(`Fuel: ${event.fuel_consumed}L`);
    }

    // Fuel type
    if (event.fuel_type && String(event.fuel_type).trim()) {
      details.push(`Fuel type: ${event.fuel_type}`);
    }

    // Hours operated
    if (event.hours_operated && event.hours_operated > 0) {
      details.push(`Hours: ${event.hours_operated}h`);
    }

    // Area worked
    if (event.area_worked && event.area_worked > 0) {
      details.push(`Area: ${event.area_worked} ha`);
    }

    // Operation efficiency
    if (event.operation_efficiency && String(event.operation_efficiency).trim()) {
      details.push(`Efficiency: ${event.operation_efficiency}`);
    }

    // Operation notes (brief excerpt for transparency)
    if (
      event.operation_notes &&
      String(event.operation_notes).trim() &&
      String(event.operation_notes).trim() !== 'null'
    ) {
      const notes = String(event.operation_notes).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Handle business events (event_type: 7) - show business activity details
  if (event.event_type === 7) {
    const details: string[] = [];

    // Business event type and name
    if (event.business_event_type && String(event.business_event_type).trim()) {
      const businessEventTypes: Record<string, string> = {
        CE: 'Certification Event',
        CM: 'Compliance Activity',
        IN: 'Inspection Process'
      };

      const eventTypeDisplay =
        businessEventTypes[event.business_event_type] || event.business_event_type;
      const eventNameDisplay =
        event.business_event_name && String(event.business_event_name).trim()
          ? `${eventTypeDisplay}: ${event.business_event_name}`
          : eventTypeDisplay;
      details.push(`Type: ${eventNameDisplay}`);
    } else if (event.business_event_name && String(event.business_event_name).trim()) {
      details.push(`Name: ${event.business_event_name}`);
    }

    // Business activity type
    if (event.business_activity_type && String(event.business_activity_type).trim()) {
      const businessActivityTypes: Record<string, string> = {
        certification: 'Certification Event',
        carbon_credits: 'Carbon Credits Transaction',
        sustainability_audit: 'Sustainability Audit',
        verification: 'Third-Party Verification',
        compliance: 'Regulatory Compliance',
        transparency: 'Consumer Transparency Initiative'
      };

      const activityDisplay =
        businessActivityTypes[event.business_activity_type] || event.business_activity_type;
      details.push(`Activity: ${activityDisplay}`);
    }

    // Certification details
    if (event.certification_type && String(event.certification_type).trim()) {
      const certificationTypes: Record<string, string> = {
        organic_usda: 'USDA Organic',
        carbon_neutral: 'Carbon Neutral',
        rainforest_alliance: 'Rainforest Alliance',
        fair_trade: 'Fair Trade',
        regenerative: 'Regenerative Organic',
        sustainable_agriculture: 'Sustainable Agriculture',
        water_stewardship: 'Water Stewardship'
      };

      const certDisplay = certificationTypes[event.certification_type] || event.certification_type;
      details.push(`Certification: ${certDisplay}`);
    }

    // Verification status
    if (event.verification_status && String(event.verification_status).trim()) {
      details.push(`Status: ${event.verification_status}`);
    }

    // Sustainability practice
    if (event.sustainability_practice && String(event.sustainability_practice).trim()) {
      details.push(`Practice: ${event.sustainability_practice}`);
    }

    // Business observation notes
    if (event.business_observation && String(event.business_observation).trim()) {
      const notes = String(event.business_observation).trim();
      const briefNotes = notes.length > 50 ? `${notes.substring(0, 50)}...` : notes;
      details.push(`Notes: ${briefNotes}`);
    }

    return details.length > 0 ? ` • ${details.join(' • ')}` : '';
  }

  // Volume with proper units from backend
  if (event.volume && String(event.volume).trim() && String(event.volume).trim() !== 'null') {
    // Always default to 'L' for volume display since chemical applications are typically in liters
    const volumeUnit = event.volume_unit || 'L';
    details.push(`Applied: ${event.volume} ${volumeUnit}`);
  }

  // Area
  if (event.area && String(event.area).trim() && String(event.area).trim() !== 'null') {
    const areaUnit = event.area_unit || event.extra_data?.area_unit || 'acres';
    const areaUnitLabel = areaUnit === 'ha' ? 'hectares' : areaUnit === 'm2' ? 'm²' : areaUnit;
    details.push(`Area: ${event.area} ${areaUnitLabel}`);
  }

  // Concentration
  if (
    event.concentration &&
    String(event.concentration).trim() &&
    String(event.concentration).trim() !== 'null'
  ) {
    const concentration = String(event.concentration).trim();
    // Handle if concentration already includes % or not
    const displayConcentration = concentration.includes('%') ? concentration : `${concentration}%`;
    details.push(`Concentration: ${displayConcentration}`);
  }

  // NPK Ratio for fertilizers - from multiple sources
  if (
    event.npk_ratio &&
    String(event.npk_ratio).trim() &&
    String(event.npk_ratio).trim() !== 'null'
  ) {
    details.push(`NPK: ${event.npk_ratio}`);
  } else if (event.extra_data?.carbon_calculation?.breakdown?.npk_content) {
    // Extract NPK from extra_data carbon calculation
    const npk = event.extra_data.carbon_calculation.breakdown.npk_content;
    if (npk.N !== undefined && npk.P !== undefined && npk.K !== undefined) {
      details.push(`NPK: ${npk.N}-${npk.P}-${npk.K}`);
    }
  }

  // Active ingredient information
  if (
    event.active_ingredient &&
    String(event.active_ingredient).trim() &&
    String(event.active_ingredient).trim() !== 'null'
  ) {
    details.push(`Active ingredient: ${event.active_ingredient}`);
  }

  // Application method from multiple sources: way_of_application, application_method, or extra_data
  let applicationMethod = null;

  // Priority 1: application_method field
  if (event.application_method && String(event.application_method).trim()) {
    applicationMethod = event.application_method;
  }
  // Priority 2: way_of_application field (from backend ChemicalEvent model)
  else if (event.way_of_application && String(event.way_of_application).trim()) {
    applicationMethod = event.way_of_application;
  }
  // Priority 3: extra_data carbon calculation
  else if (event.extra_data?.carbon_calculation?.breakdown?.application_method) {
    applicationMethod = event.extra_data.carbon_calculation.breakdown.application_method;
  }

  if (applicationMethod) {
    const methodMap: Record<string, string> = {
      spray: 'Spray application',
      foliar: 'Foliar spray treatment',
      drip: 'Drip irrigation',
      broadcast: 'Broadcast application',
      injection: 'Soil injection'
    };
    const friendlyMethod = methodMap[applicationMethod] || applicationMethod.replace(/_/g, ' ');
    details.push(`Method: ${friendlyMethod}`);
  }

  // Target pest/disease/need
  const targetField = event.target_pest_disease || event.target_pest_disease_need;
  if (targetField && String(targetField).trim()) {
    details.push(`Target: ${targetField}`);
  }

  // Weather conditions
  if (
    event.weather_conditions &&
    String(event.weather_conditions).trim() &&
    event.weather_conditions !== 'Select conditions...'
  ) {
    details.push(`Weather: ${event.weather_conditions}`);
  }

  // Application timing - from multiple sources
  if (
    event.application_timing &&
    String(event.application_timing).trim() &&
    event.application_timing !== 'Select timing...'
  ) {
    details.push(`Timing: ${event.application_timing}`);
  } else if (
    event.time_period &&
    String(event.time_period).trim() &&
    event.time_period !== 'Select timing...'
  ) {
    details.push(`Timing: ${event.time_period}`);
  }

  // Additional transparency data from carbon calculation
  if (event.extra_data?.carbon_calculation?.breakdown) {
    const breakdown = event.extra_data.carbon_calculation.breakdown;

    // Fuel usage for application (if available and significant)
    if (breakdown.application_fuel_liters && breakdown.application_fuel_liters > 0) {
      details.push(`Fuel used: ${breakdown.application_fuel_liters.toFixed(1)}L diesel`);
    }

    // Total fertilizer mass if different from volume
    if (
      breakdown.fertilizer_mass_kg &&
      breakdown.fertilizer_mass_kg > 0 &&
      breakdown.volume_applied_liters
    ) {
      const massPerLiter = breakdown.fertilizer_mass_kg / breakdown.volume_applied_liters;
      if (massPerLiter > 1.2) {
        // If significantly denser than water
        details.push(`Total mass: ${breakdown.fertilizer_mass_kg.toFixed(1)}kg`);
      }
    }
  }

  // Photo verification - handle both old album and new albums structure
  let photoCount = 0;
  if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    // New albums array structure - with proper null checking for album objects
    photoCount = event.albums.reduce(
      (total: number, album: any) => total + ((album && album.images?.length) || 0),
      0
    );
  } else if (event.album?.images?.length > 0) {
    // Legacy album structure
    photoCount = event.album.images?.length || 0;
  }

  if (photoCount > 0) {
    details.push(`${photoCount} photo${photoCount > 1 ? 's' : ''} documented`);
  }

  if (details.length > 0) {
    const result = ` - ${details.join(', ')}`;
    return result;
  }

  return '';
}

/**
 * Get consumer-friendly description for an event with real data integration
 * This function handles the mapping from raw event data to consumer-facing descriptions
 */
export function getConsumerEventDescription(
  eventDescription: string,
  event?: any
): EventDescriptionData {
  const lowerDesc = eventDescription.toLowerCase();

  // For production events (event_type: 1), create specific descriptions based on production data
  if (event && (event.event_type === 1 || event.type?.includes('production'))) {
    let icon = '🌱';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map production type to consumer-friendly titles
    const typeMap: Record<string, { title: string; icon: string; description: string }> = {
      'event.production.planting': {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      planting: {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      PL: {
        title: 'Planting',
        icon: '🌱',
        description: 'New plants went into the ground'
      },
      'production.general': {
        title: 'General Farm Operation',
        icon: '🚜',
        description: 'General agricultural activity completed as part of farm operations'
      },
      production: {
        title: 'Farm Operation',
        icon: '🚜',
        description: 'Agricultural activity completed as part of sustainable farming'
      },
      'production.planting': {
        title: 'Planting',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      'production.harvesting': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      'production.irrigation': {
        title: 'Irrigation Operation',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      'production.pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      'production.transplanting': {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      'production.TR': {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      'production.operation': {
        title: 'Farm Operation',
        icon: '🚜',
        description: 'Agricultural operation completed on the farm'
      },
      'event.production.harvesting': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      harvesting: {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      HA: {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'The crop was picked, weighed and graded'
      },
      'event.production.irrigation': {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      irrigation: {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      IR: {
        title: 'Irrigation Event',
        icon: '💧',
        description: 'The block was irrigated, from a recorded water source'
      },
      'event.production.pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      pruning: {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      transplanting: {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      TR: {
        title: 'Transplanting Operation',
        icon: '🌱',
        description: 'Transplanting seedlings or plants to their permanent growing location'
      },
      PR: {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Branches were cut back to let light and air into the trees'
      },
      // CRITICAL FIX (2025-12-11): Added CU (Cultivation) - Sprint 2 production subtype
      CU: {
        title: 'Cultivation',
        icon: '🚜',
        description: 'The soil between the rows was cultivated to turn weeds under'
      },
      // CRITICAL FIX (2025-12-11): Added TH (Thinning) - Sprint 2 production subtype
      TH: {
        title: 'Thinning',
        icon: '🌿',
        description: 'Some of the young fruit was taken off so the rest could size up'
      },
      // CRITICAL FIX (2025-01-21): Added EM (Equipment Maintenance) - correct Production subtype
      EM: {
        title: 'Equipment Maintenance',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance and efficiency'
      },
      // Sprint 2: EQ (Equipment Operations) subtype - LEGACY, kept for backward compatibility
      EQ: {
        title: 'Equipment Operations (Legacy)',
        icon: '🔧',
        description:
          'Farm equipment used and maintained for optimal performance (Legacy: use EM for new events)'
      },
      equipment: {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      // CRITICAL FIX (2025-12-11): Added CU (Cultivation) entries
      'production.CU': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      'production.cultivation': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      'event.production.cultivation': {
        title: 'Cultivation',
        icon: '🚜',
        description: 'Mechanical cultivation for weed control and soil aeration'
      },
      // CRITICAL FIX (2025-12-11): Added TH (Thinning) entries
      'production.TH': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      'production.thinning': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      'event.production.thinning': {
        title: 'Thinning',
        icon: '🌿',
        description: 'Fruit or plant thinning to improve size and quality'
      },
      // CRITICAL FIX (2025-01-21): Added EM (Equipment Maintenance) entries
      'production.EM': {
        title: 'Equipment Maintenance',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      'production.EQ': {
        title: 'Equipment Operations (Legacy)',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance (Legacy: use EM)'
      },
      'production.equipment': {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      'event.production.equipment': {
        title: 'Equipment Operations',
        icon: '🔧',
        description: 'Farm equipment used and maintained for optimal performance'
      },
      // PO (Pollination)
      PO: {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators were brought in to pollinate the crop'
      },
      'production.PO': {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators were brought in to pollinate the crop'
      },
      'event.production.pollination': {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators were brought in to pollinate the crop'
      },
      pollination: {
        title: 'Pollination',
        icon: '🐝',
        description: 'Managed pollinators were brought in to pollinate the crop'
      },
      // PH (Post-Harvest Processing)
      PH: {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      'production.PH': {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      'event.production.post_harvest': {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      post_harvest: {
        title: 'Post-Harvest Processing',
        icon: '📦',
        description: 'Carefully processed after harvest to ensure quality and freshness'
      },
      // CM (Canopy Management)
      CM: {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      'production.CM': {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      'event.production.canopy_management': {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      canopy_management: {
        title: 'Canopy Management',
        icon: '✂️',
        description: 'Vine or tree canopy shaped for optimal fruit development and quality'
      },
      // FP (Frost Protection) — Batch 3 (2026-06)
      FP: {
        title: 'Frost Protection',
        icon: '❄️',
        description:
          'Wind machines, heaters or sprinklers ran through a cold night to hold frost off the crop'
      },
      'production.FP': {
        title: 'Frost Protection',
        icon: '❄️',
        description:
          'Wind machines, heaters or sprinklers ran through a cold night to hold frost off the crop'
      },
      'event.production.frost_protection': {
        title: 'Frost Protection',
        icon: '❄️',
        description:
          'Wind machines, heaters or sprinklers ran through a cold night to hold frost off the crop'
      },
      frost_protection: {
        title: 'Frost Protection',
        icon: '❄️',
        description:
          'Wind machines, heaters or sprinklers ran through a cold night to hold frost off the crop'
      },
      // MO (Mowing / Orchard-Floor) — Batch 3 (2026-06)
      MO: {
        title: 'Orchard-Floor Management',
        icon: '🌱',
        description: 'The orchard floor was mown between the tree rows'
      },
      'production.MO': {
        title: 'Orchard-Floor Management',
        icon: '🌱',
        description: 'The orchard floor was mown between the tree rows'
      },
      'event.production.mowing': {
        title: 'Orchard-Floor Management',
        icon: '🌱',
        description: 'The orchard floor was mown between the tree rows'
      },
      mowing: {
        title: 'Orchard-Floor Management',
        icon: '🌱',
        description: 'The orchard floor was mown between the tree rows'
      }
    };

    // Get production type from event data
    const eventType = event.production_type || event.type || 'Agricultural Activity';
    const typeInfo = typeMap[eventType] || {
      title: 'Agricultural Activity',
      icon: '🌱',
      description: 'A farming activity was recorded for this crop'
    };

    icon = typeInfo.icon;

    // Build transparency details from production data
    const productionDetails: string[] = [];

    if (event.area_covered && event.area_covered > 0) {
      // Unknown unit defaults to acres, not hectares — Trazo's crop catalogue, emission
      // factors and go-to-market are US-only (see useDefaultUnits' resolution order), so a
      // metric guess is wrong for the large majority of farms with a null area_unit. Guessing
      // 'hectares' here fed a value entered in acres straight into withUSUnits' ha->acres
      // conversion on the consumer page, inflating the displayed number ~2.47x.
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : event.area_unit || 'acres';
      productionDetails.push(`${event.area_covered} ${areaUnit}`);
    }

    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity =
        quantity >= 1000 ? `${(quantity / 1000).toFixed(0)}K` : quantity.toLocaleString();
      productionDetails.push(`${formattedQuantity} ${unit}`);
    }

    if (event.fuel_consumed && event.fuel_consumed > 0) {
      const fuelUnit = event.fuel_unit || 'L';
      productionDetails.push(`${event.fuel_consumed} ${fuelUnit} fuel used`);
    }

    if (event.equipment_hours && event.equipment_hours > 0) {
      productionDetails.push(`${event.equipment_hours} hours equipment operation`);
    }

    // Consumer-relevant: variety and growth stage when present
    if (event.variety && String(event.variety).trim()) {
      productionDetails.push(`Variety: ${event.variety}`);
    }

    if (event.growth_stage && String(event.growth_stage).trim()) {
      productionDetails.push(`Growth stage: ${event.growth_stage.replace(/_/g, ' ')}`);
    }

    // Enhanced description building based on actual event data
    const buildProductionDescription = (
      event: any,
      typeInfo: any,
      productionDetails: string[]
    ): string => {
      let description = typeInfo.description;

      // Add specific details based on event type and available data
      if (event.type === 'IR' && event.area_covered) {
        description += ` covering ${event.area_covered} ${event.area_unit || 'acres'}`;
        if (event.equipment_hours) {
          description += ` over ${event.equipment_hours} hours`;
        }
        // Phase 3: Add electricity source detail for IR events
        const electricitySrcValue =
          event.electricity_source ?? event.extra_data?.electricity_source;
        if (electricitySrcValue === 'solar' || electricitySrcValue === 'wind') {
          description += ` using ${electricitySrcValue}-powered pump (near-zero pump emissions)`;
        } else if (electricitySrcValue) {
          const srcLabels: Record<string, string> = {
            grid: 'grid electricity',
            diesel_generator: 'diesel generator',
            mixed: 'mixed power sources'
          };
          description += ` powered by ${srcLabels[electricitySrcValue] || electricitySrcValue}`;
        }
        // Phase 3: Add pump depth for IR events
        const pumpDepthVal = event.pump_depth_ft ?? event.extra_data?.pump_depth_ft;
        if (pumpDepthVal) {
          description += ` (${pumpDepthVal} ft well depth)`;
        }
      } else if (event.type === 'HA' && event.yield_quantity) {
        description += ` yielding ${event.yield_quantity} ${event.yield_unit || 'units'}`;
        if (event.area_covered) {
          description += ` from ${event.area_covered} ${event.area_unit || 'acres'}`;
        }
      } else if (event.type === 'PL') {
        if (event.yield_quantity) {
          const seedInfo =
            event.yield_quantity >= 1000
              ? `${(event.yield_quantity / 1000).toFixed(1)} thousand`
              : event.yield_quantity.toLocaleString();
          description += ` with ${seedInfo} ${event.yield_unit || 'seeds'}`;
        }
        if (event.area_covered) {
          description += ` across ${event.area_covered} ${event.area_unit || 'acres'}`;
        }
      } else if (event.type === 'PR' && event.area_covered) {
        description += ` across ${event.area_covered} ${event.area_unit || 'acres'}`;
        if (event.equipment_hours) {
          description += ` over ${event.equipment_hours} hours of careful work`;
        }
      }

      // Add general production details if available
      const detailsText = productionDetails.length > 0 ? ` • ${productionDetails.join(' • ')}` : '';

      return description + detailsText;
    };

    const fullDescription = buildProductionDescription(event, typeInfo, productionDetails);

    // 🌱 TRANSPARENCY-FIRST: Create personalized consumer messages based on actual event data
    let consumerImpact =
      'This agricultural practice follows sustainable farming methods to ensure high-quality food production.';
    let sustainabilityBenefit =
      'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.';

    if (eventType.includes('transplant') || eventType === 'TR') {
      // Before PL on purpose: the legacy string 'transplanting' contains 'planting'.
      consumerImpact =
        'You can see when young plants went into this block and where the stock came from.';
      sustainabilityBenefit =
        'Organic rules trace transplanted stock back to how it was raised, and this record is the first link in that trail.';
    } else if (eventType.includes('planting') || eventType === 'PL') {
      // Stage 2 (2026-06-14): static sentence so it localizes via the dict —
      // quantitative detail (seed rate, area) already renders in Key Details.
      consumerImpact =
        'Nurseries and varieties are logged before anything is in the ground, so the record starts on day one rather than at harvest.';
      sustainabilityBenefit = `Organic certification traces a crop back to what was planted, so the planting record is the first link in that chain.`;
    } else if (eventType.includes('harvest') || eventType === 'HA') {
      consumerImpact =
        'You can see the week this fruit came off the block, and how much was picked that day.';
      sustainabilityBenefit = `Recording the date, volume and grade is what lets a batch be traced back to one block and one week.`;
    } else if (eventType.includes('irrigation') || eventType === 'IR') {
      consumerImpact =
        'You can see where the irrigation water came from and how it reached the trees.';
      sustainabilityBenefit = `Recording the source and method makes water use checkable instead of assumed.`;
    } else if (eventType.includes('pruning') || eventType === 'PR') {
      consumerImpact =
        'An open canopy dries faster after rain, so the fruit needs less spraying to stay healthy.';
      // Was: "Prunings are chipped back onto the orchard floor, returning the material to the
      // soil instead of hauling it away." Nothing on a pruning record says what happened to
      // the brush — chipped, burned or hauled — so the page asserted a practice from an event
      // that cannot hold it. Same shape as the cultivation line below: describe the record.
      sustainabilityBenefit = `Each pruning pass is dated and on record, which is how canopy work is evidenced rather than asserted.`;
    } else if (eventType.includes('cultivation') || eventType === 'CU') {
      consumerImpact =
        'Weeds pulled under by a machine are weeds not sprayed: the same job done with steel instead of chemistry.';
      sustainabilityBenefit = `Each cultivation pass is on record, which is how mechanical weed control is evidenced rather than asserted.`;
    } else if (eventType.includes('thinning') || eventType === 'TH') {
      consumerImpact =
        'Thinning is why the fruit is the size it is. Fewer per branch means more of everything for each one.';
      sustainabilityBenefit = `Thinning dates and volumes are on record, which is what lets a size grade be traced back to a decision in the orchard.`;
    } else if (eventType.includes('pollination') || eventType === 'PO') {
      // The bee story is the strongest consumer content in the product and had no copy at
      // all — PO fell through to the family default. UC Davis organic-almond practice: two
      // hives per acre, set in the orchard in February before bloom.
      consumerImpact =
        'Honey bee hives were brought into the orchard during bloom so the crop could set fruit.';
      sustainabilityBenefit =
        'Hive placement is on record beside the spray log, so applications can be checked against the days bees were on the block.';
    } else if (eventType.includes('post_harvest') || eventType === 'PH') {
      consumerImpact =
        'After picking, the crop was hulled, dried or cooled to keep it sound on the way to you.';
      sustainabilityBenefit =
        'Documented post-harvest handling reduces spoilage and waste, and records the temperature and sanitation steps the crop passed through.';
    } else if (eventType.includes('frost') || eventType === 'FP') {
      consumerImpact = 'Without that night of work there would be no fruit from this block at all.';
      // Was: "avoids the far larger footprint of losing a harvest and regrowing it" — a
      // comparative environmental claim with no substantiation behind it, on a record whose own
      // fuel field commonly holds tens of gallons of propane. 16 CFR 260.6 governs exactly this.
      sustainabilityBenefit =
        'The night, the method and the low temperature are on record, so frost protection is documented rather than assumed.';
    } else if (eventType.includes('canopy') || eventType === 'CM') {
      consumerImpact =
        'The tree canopy was managed to let light and air reach the fruit, which improves ripening and reduces disease.';
      sustainabilityBenefit =
        'An open canopy dries faster after rain, lowering disease pressure and the need for fungicide applications.';
    } else if (eventType.includes('mowing') || eventType === 'MO') {
      // Orchard-floor management is the organic answer to weeds, so the copy splits on
      // HOW: flame weeding is the visible "no herbicide" story a shopper understands,
      // while mowing / mulching / cover-crop management is habitat and soil cover.
      // Static sentences so eventDescriptions.es.ts can localize them (Stage 2 rule above).
      const floorType =
        (event as any).floor_management_type || (event as any).extra_data?.floor_management_type;
      if (floorType === 'flame_weed') {
        consumerImpact =
          'Weeds were controlled with heat instead of chemicals, using a propane flamer along the tree rows.';
        sustainabilityBenefit =
          'Flame weeding removes weeds without synthetic herbicides, leaving no chemical residue in the soil or on the crop.';
      } else {
        consumerImpact =
          'Cutting ground cover is mechanical weed control, and it leaves a clean surface for fruit that is picked up off the floor.';
        sustainabilityBenefit =
          'Managed ground cover protects soil from erosion, feeds pollinators and beneficial insects, and reduces the need for herbicides.';
      }
    } else if (eventType.includes('equipment') || eventType === 'EM') {
      // EM had NO branch at all, so all 40 equipment events on published productions fell
      // through to the family fallback ("This agricultural practice follows sustainable
      // farming methods…"). That is the single largest block of filler on the consumer page.
      //
      // Equipment work splits into two genuinely different consumer stories, so the copy
      // splits with it. CLEANING is an organic-integrity story — under 7 CFR 205.272 a grower
      // must clean shared or borrowed equipment before it touches an organic block, and doing
      // it is precisely how the crop stays organic. Everything else (maintenance, calibration,
      // repair) is really about spraying accurately, which is what keeps applications on
      // target and off the fruit.
      const opType = String(
        (event as any).equipment_operation_type || (event as any).operation_type || ''
      ).toLowerCase();

      if (opType === 'cl' || opType === 'cleaning') {
        consumerImpact =
          'Equipment was cleaned before it touched this crop, so nothing carried over from another field.';
        sustainabilityBenefit =
          'Cleaning shared equipment between fields is what keeps an organic block organic, and the step is documented rather than assumed.';
      } else if (opType === 'ca' || opType === 'calibration') {
        consumerImpact =
          'Spray equipment was calibrated so each application lands where it should, in the amount intended.';
        sustainabilityBenefit =
          'Calibrated equipment prevents over-application, which means less input used and less chance of drift beyond the field.';
      } else {
        consumerImpact = 'Farm equipment was serviced and kept in working order for the season.';
        sustainabilityBenefit =
          'Well-maintained equipment uses less fuel, applies inputs more accurately, and is documented alongside the field records.';
      }
    }

    // 🌱 TRANSPARENCY-FIRST: Enhanced consumer title resolution
    const getConsumerTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Farmer's custom production name
      if (event.production_name && event.production_name.trim()) {
        return event.production_name;
      }

      // Priority 2: General event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Commercial name (for chemical events that might be misclassified)
      if (event.commercial_name && event.commercial_name.trim()) {
        return event.commercial_name;
      }

      // Priority 4: Generate descriptive titles from event data
      // Use production_type (normalized) or type (raw API) for subtype detection
      const prodType = event.production_type || event.type;
      if (prodType) {
        const desc = (event.description || '').toLowerCase();

        // For harvests - differentiate by description.
        //
        // 🔴 F5 (2026-08-21) — the grade no longer titles a CONSUMER card, and this is the
        // same decision as `formatConsumerHarvestGrade`, one surface over. This branch used
        // to read `harvest_quality_grade` through a slug map and title the card
        // "Harvest - Grade B", which a shopper reads as "this food is second-rate" — a
        // grade is a size-and-appearance sorting class and says nothing about how the food
        // eats. The grade still reaches the consumer, as its own field, re-voiced into a
        // neutral sentence; putting it back in the headline would undo that in the same
        // render. It also could not survive the vocabulary change: the map keyed the retired
        // slugs, so every record written after 2026-08-21 fell through it anyway.
        if (prodType === 'HA') {
          if (desc.includes('export')) return 'Harvest - Export Quality';
          if (desc.includes('processing') || desc.includes('juice'))
            return 'Harvest - Processing Grade';
          if (desc.includes('first') || desc.includes('main') || desc.includes('premium'))
            return 'Main Harvest';
          if (desc.includes('second')) return 'Second Harvest';
          if (desc.includes('third') || desc.includes('final')) return 'Final Harvest';
          return 'Harvest Operation';
        }

        // For irrigation - differentiate by season/phase
        if (prodType === 'IR') {
          if (desc.includes('bloom')) return 'Irrigation - Bloom Phase';
          if (desc.includes('fruit development') || desc.includes('fruit swell'))
            return 'Irrigation - Fruit Development';
          if (desc.includes('summer')) return 'Summer Irrigation';
          if (desc.includes('winter') || desc.includes('dormant')) return 'Winter Irrigation';
          if (desc.includes('establishment') || desc.includes('young'))
            return 'Establishment Irrigation';
          return 'Irrigation Operation';
        }

        // For pruning - differentiate by purpose
        if (prodType === 'PR') {
          if (desc.includes('structural')) return 'Structural Pruning';
          if (desc.includes('maintenance')) return 'Maintenance Pruning';
          if (desc.includes('winter')) return 'Winter Pruning';
          if (desc.includes('summer')) return 'Summer Pruning';
          if (desc.includes('formative') || desc.includes('shaping')) return 'Formative Pruning';
          if (desc.includes('dead') || desc.includes('sanitary')) return 'Sanitary Pruning';
          return 'Pruning Operation';
        }

        // Default code-to-title map for other production types
        const codeToTitle: Record<string, string> = {
          PL: 'Planting',
          TR: 'Transplanting Operation',
          CU: 'Cultivation',
          TH: 'Thinning',
          EM: 'Equipment Maintenance',
          EQ: 'Equipment Operations (Legacy)',
          SO: 'Soil Operation',
          FE: 'Fertilizer Operation',
          WE: 'Weather Monitoring',
          FP: 'Frost Protection',
          MO: 'Mowing / Orchard-Floor'
        };
        if (codeToTitle[prodType]) {
          return codeToTitle[prodType];
        }
      }

      // Priority 5: Use typeInfo from mapping
      return typeInfo.title;
    };

    const transparencyTitle = getConsumerTitle(event, typeInfo);

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Sustainable agricultural practice following industry best practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For weather events (event_type: 0), create specific descriptions based on weather type
  // IMPROVED: More flexible weather event detection
  const isWeatherEvent = event && event.event_type === 0;
  const hasSpecificWeatherType =
    (event.weather_type && event.weather_type !== 'weather') ||
    (event.type && event.type !== 'weather') ||
    // Check for temperature data as indicator of weather event
    event.lower_temperature !== undefined ||
    event.upper_temperature !== undefined ||
    event.highest_temperature !== undefined ||
    // Check for weather-specific fields
    event.way_of_protection !== undefined;

  if (
    isWeatherEvent &&
    (hasSpecificWeatherType ||
      eventDescription.toLowerCase().includes('weather') ||
      eventDescription.toLowerCase().includes('frost') ||
      eventDescription.toLowerCase().includes('temperature'))
  ) {
    // Weather event type mapping
    const weatherTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      FR: {
        title: 'Frost Event',
        icon: '❄️',
        description: 'Frost was recorded on the block and its effect on the crop assessed',
        impact: 'LOW'
      },
      DR: {
        title: 'Drought Monitoring',
        icon: '☀️',
        description: 'Dry conditions were tracked across the season',
        impact: 'MEDIUM'
      },
      HL: {
        title: 'Hail Damage Assessment',
        icon: '🌨️',
        description: 'Hail hit the block and the damage was assessed',
        impact: 'HIGH'
      },
      HT: {
        title: 'Heat Stress Monitoring',
        icon: '🌡️',
        description: 'A heat wave crossed the block and the trees were checked afterwards',
        impact: 'MEDIUM'
      },
      TS: {
        title: 'Storm & Wind Event',
        icon: '🌪️',
        description:
          'Storm conditions and wind damage assessed to evaluate crop impact and recovery needs',
        impact: 'HIGH'
      },
      HW: {
        title: 'High Winds Event',
        icon: '💨',
        description: 'High winds crossed the block and the crop was checked for damage afterwards',
        impact: 'MEDIUM'
      },
      HH: {
        title: 'High Humidity Monitoring',
        icon: '💧',
        description:
          'High humidity conditions tracked to prevent disease development and optimize growing conditions',
        impact: 'LOW'
      },
      LH: {
        title: 'Low Humidity Monitoring',
        icon: '🏜️',
        description:
          'Low humidity conditions monitored to assess plant stress and adjust irrigation strategies',
        impact: 'LOW'
      }
    };

    // Get the weather type from available fields, with better fallback
    const weatherTypeCode = event.weather_type || event.type;

    // IMPROVED: Better fallback logic for weather events without specific type
    let weatherInfo = weatherTypeMap[weatherTypeCode];

    if (!weatherInfo) {
      // Try to infer weather type from event data
      if (event.lower_temperature !== undefined && event.lower_temperature < 35) {
        weatherInfo = weatherTypeMap['FR']; // Frost
      } else if (
        event.way_of_protection &&
        event.way_of_protection.toLowerCase().includes('cover')
      ) {
        weatherInfo = weatherTypeMap['FR']; // Frost protection
      } else if (eventDescription.toLowerCase().includes('frost')) {
        weatherInfo = weatherTypeMap['FR'];
      } else if (eventDescription.toLowerCase().includes('drought')) {
        weatherInfo = weatherTypeMap['DR'];
      } else if (eventDescription.toLowerCase().includes('temperature')) {
        weatherInfo = weatherTypeMap['HT']; // Heat
      } else {
        // Generic weather fallback
        weatherInfo = {
          title: 'Weather Monitoring',
          icon: '🌤️',
          description: 'Conditions on the block were recorded that day',
          impact: 'LOW' as const
        };
      }
    }

    // Get detailed weather information from transparency details
    const realDetails = getRealTransparencyDetails(event);

    // Create consumer impact and sustainability benefit messages based on weather type
    let consumerImpact =
      'Weather is the one thing a farm cannot control, and it is logged here beside everything it can.';
    // 🔴 2026-08-31 — every weather sub-type used to override this with a claim about a
    // RESPONSE: "proactive frost monitoring", "quick response to hail damage", "resilient
    // farming practices", "climate-adaptive farming practices help crops thrive". A weather
    // record holds a type, a magnitude, a start, an end and the farmer's note. It contains no
    // response at all, so each of those was an unsubstantiated general environmental-benefit
    // claim (FTC 16 CFR 260.6) rendered under a heading reading ENVIRONMENTAL BENEFIT — and on
    // a heat event that also burned irrigation, the page was crediting the farm for it.
    //
    // The overrides are gone rather than reworded: a passive observation of the weather has no
    // environmental benefit to claim, and this family fallback is already listed in
    // ConsumerEventCard's GENERIC_FALLBACK_COPY, so the block is suppressed entirely rather
    // than filled with something truer but still empty. The per-type `consumerImpact` lines
    // stay — those describe what the weather did to the crop, which the record does support.
    let sustainabilityBenefit =
      'Weather monitoring enables precise agricultural decisions that optimize resource use and minimize environmental impact.';

    if (weatherTypeCode === 'FR') {
      consumerImpact =
        'Cold nights decide how much fruit sets, so this is the weather the crop actually grew in.';
    } else if (weatherTypeCode === 'DR') {
      consumerImpact =
        'Water is the scarcest input in California agriculture, so what a crop needed in a dry year is worth knowing.';
    } else if (weatherTypeCode === 'HL') {
      consumerImpact =
        'Hail leaves marks and smaller fruit rather than a safety problem, and the farm logged the storm instead of quietly dropping it.';
    } else if (weatherTypeCode === 'HT') {
      consumerImpact = 'Extreme heat shows up later as smaller fruit or sunburn marks on the skin.';
    } else if (weatherTypeCode === 'TS') {
      // Was "Storm damage assessment ensures only healthy, undamaged produce reaches consumers"
      // — a food-quality GUARANTEE derived from a weather observation. Nothing on this record
      // sorts fruit or assesses damage; the same 2026-08-31 sweep that emptied the benefit lines
      // below applies to the impact line above them.
      consumerImpact =
        'Storms bruise and drop fruit, so a season with one in it looks different by harvest.';
    } else if (weatherTypeCode === 'HW') {
      consumerImpact =
        'A rough weather day is in this record rather than left out of it, so you are seeing the season as it actually went.';
    } else if (weatherTypeCode === 'HH') {
      // Was "Humidity monitoring helps prevent fungal diseases…" — asserts a prevention outcome
      // from a record that contains a humidity reading.
      consumerImpact =
        'Long humid spells are when fungal disease gets its chance, which is why the farm logs them.';
    } else if (weatherTypeCode === 'LH') {
      // Was "Low humidity management ensures crops receive adequate moisture…" — asserts both a
      // management practice and its outcome. A weather event records neither.
      consumerImpact =
        'Dry air pulls moisture out of a crop faster, so it changes how much water the block needed.';
    }

    // For weather events, use the standardized description without prepending user observations
    // User observations are displayed separately in "Farmer's Field Notes" section
    let description = weatherInfo.description;
    description += realDetails;

    // Use farmer's event name as title when available (consistent with all other event types),
    // falling back to the standardized weatherTypeMap title
    const weatherTitle = event.name && event.name.trim() ? event.name : weatherInfo.title;

    return {
      title: weatherTitle,
      description: description,
      shortDescription: description, // Use the same concatenated description for both fields
      icon: weatherInfo.icon,
      impact: weatherInfo.impact,
      consumerMessage:
        'Environmental monitoring practice following sustainable agriculture principles',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For chemical events, create specific descriptions based on chemical type and product used
  if (
    event &&
    (event.event_type === 2 ||
      event.type === 'chemical' ||
      event.type?.includes('chemical') ||
      ['FE', 'PE', 'FU', 'HE'].includes(event.type) ||
      ['FE', 'PE', 'FU', 'HE'].includes(event.chemical_type))
  ) {
    // This branch used to also require `(commercial_name || equipment)`. Without a product
    // name a chemical event fell all the way through to the generic default paragraph
    // ("This farming practice contributes to sustainable agriculture…"), so an OMRI-listed
    // sulfur spray with a blank product field told the shopper nothing — the single most
    // consumer-relevant event type, silently degraded. The type alone (FE/PE/FU/HE) is
    // enough to say something true and specific, so fall back to a type-derived noun.
    const CHEMICAL_GENERIC_NAME: Record<string, string> = {
      FE: 'Fertilizer application',
      PE: 'Pest control application',
      FU: 'Disease control application',
      HE: 'Weed control application'
    };
    const typeCodeForName = event.chemical_type || event.type;
    const productName =
      event.commercial_name || CHEMICAL_GENERIC_NAME[typeCodeForName] || 'Crop input application';

    // Determine chemical type - PRIORITY: Use form field type (FE, PE, FU, HE) over product name detection
    let chemicalType = 'chemical application';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let icon = '🧪';
    // PRIMARY: Check explicit chemical type from form (FE, PE, FU, HE) or serialized format
    const specificType = event.chemical_type || event.type;

    // Helper function to extract chemical type from serialized format
    const extractChemicalType = (type: string): string | null => {
      if (!type) return null;
      // Handle raw codes (FE, PE, FU, HE)
      if (['FE', 'PE', 'FU', 'HE'].includes(type)) return type;
      // Handle serialized format (event.chemical.fertilizer → FE)
      if (type.includes('event.chemical.fertilizer')) return 'FE';
      if (type.includes('event.chemical.pesticide')) return 'PE';
      if (type.includes('event.chemical.fungicide')) return 'FU';
      if (type.includes('event.chemical.herbicide')) return 'HE';
      return null;
    };

    const normalizedType = extractChemicalType(specificType);
    if (normalizedType === 'FE') {
      chemicalType = 'fertilizer application';
      icon = '🌱';
      impactLevel = 'MEDIUM';
    } else if (normalizedType === 'PE') {
      chemicalType = 'pesticide application';
      icon = '🐛';
      // Check for high-concern pesticides (neonicotinoids, restricted use)
      const extraData = event.extra_data || {};
      const lowerProduct = productName.toLowerCase();
      const isNeonicotinoid =
        (extraData.chemical_subtype || '').toLowerCase() === 'neonicotinoid' ||
        lowerProduct.includes('imidacloprid') ||
        lowerProduct.includes('clothianidin') ||
        lowerProduct.includes('thiamethoxam') ||
        lowerProduct.includes('acetamiprid') ||
        lowerProduct.includes('dinotefuran');
      const isRestrictedUse = extraData.restricted_use_pesticide === true;
      impactLevel = isNeonicotinoid || isRestrictedUse ? 'HIGH' : 'MEDIUM';
    } else if (normalizedType === 'FU') {
      chemicalType = 'fungicide application';
      icon = '🛡️';
      impactLevel = 'MEDIUM';
    } else if (normalizedType === 'HE') {
      chemicalType = 'herbicide application';
      icon = '🌾';
      impactLevel = 'MEDIUM';
    }
    // FALLBACK: Detect from product name (for legacy data or incomplete forms)
    else if (
      productName.toLowerCase().includes('fertilizer') ||
      productName.toLowerCase().includes('miracle-gro') ||
      productName.toLowerCase().includes('nutrient') ||
      productName.toLowerCase().includes('plant food') ||
      productName.toLowerCase().includes('citrus') ||
      (event.npk_ratio && event.npk_ratio !== '')
    ) {
      chemicalType = 'fertilizer application';
      icon = '🌱';
      impactLevel = 'MEDIUM';
    }
    // Neem oil products - organic pest control
    else if (productName.toLowerCase().includes('neem')) {
      chemicalType = 'pesticide application';
      icon = '🌿';
      impactLevel = 'LOW';
    }
    // Copper fungicides
    else if (productName.toLowerCase().includes('copper')) {
      chemicalType = 'fungicide application';
      icon = '🛡️';
      impactLevel = 'MEDIUM';
    }
    // Glyphosate/Roundup herbicides
    else if (
      productName.toLowerCase().includes('roundup') ||
      productName.toLowerCase().includes('glyphosate')
    ) {
      chemicalType = 'herbicide application';
      icon = '🌾';
      impactLevel = 'MEDIUM';
    }

    let baseDescription =
      eventDescriptions[chemicalType] || eventDescriptions['chemical application'];
    const realDetails = getRealTransparencyDetails(event);

    // Create consumer impact and sustainability benefit messages based on chemical type
    let consumerImpact = 'What was applied, where and when is on record for this crop.';
    let sustainabilityBenefit =
      'Part of integrated farming approach that balances productivity with environmental responsibility.';

    if (chemicalType === 'fertilizer application') {
      consumerImpact =
        'The material, the quantity and the day it happened are all part of this entry.';
      // Phase 3: Fertigation note
      const isFertigationFlag =
        event.is_fertigation === true ||
        event.is_fertigation === 'true' ||
        event.extra_data?.is_fertigation === true ||
        event.extra_data?.is_fertigation === 'true';
      sustainabilityBenefit = isFertigationFlag
        ? 'Fertigation (fertilizer through irrigation) maximizes nutrient uptake efficiency and reduces runoff. Application fuel excluded from carbon calculation to avoid double-counting with irrigation events.'
        : 'The product, the date and the area treated are on record, so the certifier can check the application against the label.';
    } else if (chemicalType === 'pesticide application') {
      // Check chemical_subtype FIRST before product name detection
      // This ensures user's explicit selection takes precedence over product name inference
      const chemicalSubtype = (event?.chemical_subtype || '').toLowerCase();
      const isSyntheticBySubtype =
        chemicalSubtype.includes('synthetic') || chemicalSubtype.includes('conventional');
      const isOrganicBySubtype =
        chemicalSubtype.includes('organic') ||
        chemicalSubtype.includes('natural') ||
        chemicalSubtype.includes('biological');

      // Use subtype if specified, otherwise fall back to product name detection
      const isOrganic =
        isOrganicBySubtype || (!isSyntheticBySubtype && productName.toLowerCase().includes('neem'));

      if (isOrganic) {
        // Claim-safety re-voice (2026-08-01): this branch said "provides natural protection
        // WITHOUT SYNTHETIC CHEMICALS, supporting HEALTHIER FOOD PRODUCTION" — an absolute
        // composition claim plus an unsupported health benefit, from a record that only knows
        // one product was applied. Both are FTC 16 CFR 260.4 general-benefit territory, and
        // the first is not even reliably true (organic-approved does not mean non-synthetic;
        // 7 CFR 205.601 lists synthetics that are allowed). Says what happened and what the
        // approval means instead.
        baseDescription = 'A pest treatment approved for organic growing was applied';
        consumerImpact =
          'Products allowed in organic growing are reviewed against a public national list before they can be used.';
        sustainabilityBenefit =
          'The product, the target pest and the date are on record, so the treatment can be checked against that list.';
      } else {
        baseDescription = 'A treatment was applied against a specific pest';
        consumerImpact = 'The pest, the product aimed at it and the amount used are recorded here.';
        sustainabilityBenefit =
          'Recording the target pest shows the treatment answered a specific problem rather than a calendar.';
      }
    } else if (chemicalType === 'fungicide application') {
      // Special case for copper-based organic fungicides
      if (productName.toLowerCase().includes('copper')) {
        consumerImpact =
          'Copper is one of the few disease treatments allowed on certified organic farms, and it was used here against a specific disease.';
        sustainabilityBenefit =
          'Copper is tightly limited under organic rules because it builds up in soil, so the amount and timing are recorded.';
      } else {
        consumerImpact = 'Both the target and the material are on file here, with the date.';
        sustainabilityBenefit =
          'Treating a known disease early generally takes less product than treating an outbreak later.';
      }
    } else if (chemicalType === 'herbicide application') {
      // Special case for glyphosate products
      if (
        productName.toLowerCase().includes('roundup') ||
        productName.toLowerCase().includes('glyphosate')
      ) {
        consumerImpact =
          'This is a synthetic weedkiller. It is not permitted on certified organic ground, and the date and area treated are recorded.';
        sustainabilityBenefit =
          'Weed control without tillage leaves soil structure intact, though it relies on a synthetic input to do it.';
      } else {
        consumerImpact = 'Weed control is logged with the product used and the area it covered.';
        sustainabilityBenefit =
          'Recording what was used on weeds, and where, is what makes the choice checkable.';
      }
    }

    // Consumer title: "{product} — {purpose}" (Phase 2, Section G). The old
    // "(NPK 13-0-46)" / "(active ingredient)" suffixes were agronomist
    // shorthand — a shopper reads "Haifa Multi-K 13-0-46 (NPK 13-0-46)" as
    // noise. Purpose tells them WHY it was applied; NPK and active
    // ingredients still render in Key/Technical Details.
    const CHEMICAL_PURPOSE: Record<string, string> = {
      'fertilizer application': 'soil nutrition',
      'pesticide application': 'pest control',
      'fungicide application': 'disease prevention',
      'herbicide application': 'weed control'
    };
    const purpose = CHEMICAL_PURPOSE[chemicalType];
    // Skip the purpose suffix when the name IS the generic type-derived fallback — a title
    // reading "Fertilizer application — soil nutrition" says the same thing twice, and the
    // bare generic name is a single string the ES dictionary can actually translate.
    const usedGenericName = !event.commercial_name;
    // Middle dot, not an em dash: it is the separator already used elsewhere on the card
    // ("Farmer-provided photos · 1 photo"), and the em dash reads as machine-written.
    const enhancedTitle = purpose && !usedGenericName ? `${productName} · ${purpose}` : productName;

    return {
      title: enhancedTitle,
      description: baseDescription + realDetails,
      shortDescription: baseDescription,
      icon,
      impact: impactLevel,
      consumerMessage: `Professional agricultural treatment applied according to sustainable farming practices`,
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For soil management events (event_type: 5), create specific descriptions based on soil operation data
  if (event && (event.event_type === 5 || event.type === 'soil_management')) {
    let icon = '🌱';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Map soil management types to consumer-friendly descriptions
    const soilTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      'Soil Testing': {
        title: 'Soil Testing & Analysis',
        icon: '🧪',
        description: 'A soil sample was sent to a lab',
        impact: 'LOW'
      },
      ST: {
        title: 'Soil Testing & Analysis',
        icon: '🧪',
        description: 'A soil sample was sent to a lab',
        impact: 'LOW'
      },
      PA: {
        title: 'pH Adjustment',
        icon: '⚖️',
        // Material-agnostic on purpose (2026-08-02). This said "Lime or sulfur was worked
        // into the ground" — on a live card whose own Amendment Type read "Agricultural
        // gypsum", which is neither, and which corrects sodium rather than pH. Naming a
        // product the record contradicts is worse than naming none; the Amendment Type fact
        // beside it already says exactly what went on.
        //
        // METHOD-agnostic too, since 2026-08-21: "worked into the ground" is an incorporation
        // claim, and elemental sulfur under a drip line is broadcast on the surface and left
        // for the rain — which is what the farmer's own note beside this card said ("Not
        // incorporated; rain and drip carry it in"). The card contradicted the record it was
        // describing. Working depth is a field on the event; the card does not need to guess.
        description: 'A mineral amendment was applied to correct the soil',
        impact: 'MEDIUM'
      },
      OM: {
        title: 'Organic Matter Addition',
        icon: '🍂',
        // Not "spread and worked into the ground": a sawdust or compost top-dress on a
        // perennial bed is surface-applied and deliberately NOT incorporated (2026-08-21).
        description: 'Organic matter was added to the soil',
        impact: 'HIGH'
      },
      CC: {
        title: 'Cover Crop Management',
        icon: '🌿',
        description: 'A cover crop was sown between the rows',
        impact: 'HIGH'
      },
      TI: {
        title: 'Tillage Implementation',
        icon: '🚜',
        description: 'The ground was worked to prepare a seedbed',
        impact: 'MEDIUM'
      },
      CO: {
        title: 'Composting Operation',
        icon: '♻️',
        description: 'Compost was spread on the block',
        impact: 'HIGH'
      },
      GR: {
        title: 'Grazing Management',
        icon: '🐑',
        description: 'Livestock were grazed through the block to eat down the cover crop',
        impact: 'HIGH'
      },
      HD: {
        title: 'Habitat Development',
        icon: '🌿',
        description:
          'Hedgerows, flowering strips and living groundcover were planted along the field edges',
        impact: 'HIGH'
      },
      NS: {
        title: 'Nesting / Shelter Structures',
        icon: '🦉',
        description:
          'Owl and songbird boxes, raptor perches and native-bee blocks were installed around the block',
        impact: 'HIGH'
      },
      // §E-2: an outside laboratory is genuine third-party evidence, so the consumer copy says
      // what was tested and by whom — not a grade. The numeric results stay on the
      // producer/certifier surfaces.
      LA: {
        title: 'Independent Laboratory Analysis',
        icon: '🔬',
        description:
          'A sample of leaf, soil, compost or irrigation water sent to an outside laboratory, so nutrient decisions rest on measurements rather than guesswork',
        impact: 'LOW'
      }
    };

    // Determine soil management type from various possible fields
    const soilType = event.soil_management_type || event.type || '';
    const typeInfo = soilTypeMap[soilType] || {
      title: 'Soil work',
      icon: '🌱',
      description: 'Work on the soil was recorded for this block',
      impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed soil management information
    const soilDetails: string[] = [];

    if (event.soil_management_name || event.name) {
      soilDetails.push(`Operation: ${event.soil_management_name || event.name}`);
    }

    if (event.area_managed || event.area) {
      const area = event.area_managed || event.area;
      const unit = event.area_unit || 'acres';
      soilDetails.push(`Area: ${area} ${unit}`);
    }

    if (event.working_depth) {
      const unit = event.depth_unit || 'cm';
      soilDetails.push(`Depth: ${event.working_depth} ${unit}`);
    }

    if (event.soil_ph !== undefined && event.soil_ph !== null) {
      soilDetails.push(`pH: ${event.soil_ph}`);
    }

    if (event.organic_matter !== undefined && event.organic_matter !== null) {
      soilDetails.push(`Organic Matter: ${event.organic_matter}%`);
    }

    if (event.soil_texture) {
      soilDetails.push(`Texture: ${event.soil_texture}`);
    }

    if (event.equipment_used) {
      soilDetails.push(`Equipment: ${event.equipment_used}`);
    }

    // Create detailed description
    const detailsText = soilDetails.length > 0 ? ` • ${soilDetails.join(' • ')}` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on soil management type
    let consumerImpact =
      'This soil management practice supports healthy growing conditions and sustainable farming.';
    let sustainabilityBenefit =
      'Documented soil management demonstrates commitment to soil health and environmental stewardship.';

    // Specific messages for each soil management type
    if (soilType === 'LA') {
      consumerImpact =
        'You can see that the farm sent samples to a lab and recorded the results, rather than guessing at what the soil needs.';
      sustainabilityBenefit =
        'Lab results give the fertility decisions on this block a measured starting point, so inputs follow numbers instead of habit.';
    } else if (soilType === 'ST' || soilType.includes('Testing')) {
      consumerImpact =
        'A lab measured what the soil actually needed, so nutrients were added on evidence rather than habit.';
      sustainabilityBenefit =
        'Testing before feeding means only what the soil is short of gets added.';
    } else if (soilType === 'PA' || soilType.includes('pH')) {
      consumerImpact =
        'Soil chemistry decides how much of what a farm applies the crop can actually take up.';
      sustainabilityBenefit =
        'The amendment, the amount and the area are on record, so the correction can be checked against the soil test that prompted it.';
    } else if (soilType === 'OM' || soilType.includes('Organic')) {
      consumerImpact =
        'Feeding the soil itself, rather than only the plant, is the slower and more durable way to keep ground productive.';
      sustainabilityBenefit =
        'Organic matter addition improves soil structure, water retention, and long-term soil health naturally.';
    } else if (soilType === 'CC' || soilType.includes('Cover')) {
      consumerImpact =
        'Living roots hold the soil between harvests, so the ground this crop grows in stays put over winter.';
      sustainabilityBenefit =
        'A cover crop feeds the soil and crowds out weeds, which reduces the need to spray or cultivate for them.';
    } else if (soilType === 'TI' || soilType.includes('Tillage')) {
      consumerImpact =
        'How often soil gets turned is one of the things that decides whether it stays put, so each pass is logged rather than left unrecorded.';
      sustainabilityBenefit =
        'Precision tillage minimizes soil disturbance while ensuring proper seedbed preparation and crop establishment.';
    } else if (soilType === 'CO' || soilType.includes('Compost')) {
      consumerImpact =
        'Compost feeds the soil this crop grows in, rather than feeding the plant directly.';
      // Was: "Composting turns orchard waste back into soil…". The event carries
      // `compost_feedstock`, and on real records it reads "green waste, yard trimmings and horse
      // bedding" from a supplier — so the copy asserted an origin the record often refutes. The
      // server draws the same line for the practice chip (`_compost_was_bought_in`).
      sustainabilityBenefit =
        'Recording the amount, the area and the composting process is what makes soil building checkable rather than asserted.';
    } else if (soilType === 'GR' || soilType.includes('Grazing')) {
      consumerImpact =
        'Animals eat the weeds and leave manure behind, which is weed control and fertiliser in one pass.';
      sustainabilityBenefit =
        'Managed grazing recycles nutrients, stimulates root growth, and reduces the need for mowing and herbicides.';
    } else if (soilType === 'HD' || soilType.includes('Habitat')) {
      consumerImpact =
        'Field edges left in permanent planting are acres the farm chose not to crop, kept for the insects and birds instead.';
      sustainabilityBenefit =
        'Documented habitat builds biodiversity and natural pest control, reducing reliance on chemical inputs.';
    } else if (soilType === 'NS' || soilType.includes('Nesting') || soilType.includes('Shelter')) {
      consumerImpact =
        'Habitat is a long-term commitment rather than a one-off treatment. The owls and bees stay, so it keeps working season after season.';
      sustainabilityBenefit =
        'Structures and their locations are on record, so the habitat can be checked on the ground.';
    }

    // Enhanced title resolution for soil management events
    const getSoilManagementTitle = (event: any, typeInfo: any): string => {
      // 🚨 CRITICAL FIX: Priority 0 - Use normalized title from backend if available
      if (event.title && event.title.trim()) {
        return event.title;
      }

      // Priority 1: Soil management name from form
      if (event.soil_management_name && event.soil_management_name.trim()) {
        return event.soil_management_name;
      }

      // Priority 2: General event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Use typeInfo.title (consumer-friendly mapped name from soilTypeMap)
      if (event.soil_management_type && event.soil_management_type.trim()) {
        return typeInfo.title;
      }

      // Priority 4: Area context
      if (event.area_managed) {
        const unit = event.area_unit || 'acres';
        return `${typeInfo.title} - ${event.area_managed} ${unit}`;
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const soilTitle = getSoilManagementTitle(event, typeInfo);

    return {
      title: soilTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Soil management supporting sustainable farming practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For pest management events, create specific descriptions based on IPM type
  if (
    event &&
    (event.event_type === 6 ||
      event.type === 'pest_management' ||
      event.type?.includes('pest') ||
      ['SC', 'TM', 'BR', 'PI', 'TA', 'IP'].includes(event.type))
  ) {
    // Determine pest management type and impact level
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let icon = '🐛';

    // Map pest management types to consumer-friendly descriptions
    const pestTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      SC: {
        title: 'Pest Scouting',
        icon: '🔍',
        description:
          'Monitored crops for pest populations and damage levels to inform management decisions',
        impact: 'LOW'
      },
      TM: {
        title: 'Trap Monitoring',
        icon: '🪤',
        description: 'Pest traps around the block were checked and the counts written down',
        impact: 'LOW'
      },
      BR: {
        title: 'Beneficial Release',
        icon: '🐞',
        description: 'Beneficial insects were released into the block',
        impact: 'HIGH'
      },
      PI: {
        title: 'Pest Identification',
        icon: '🔬',
        description: 'The pest was identified before any decision about treating it',
        impact: 'MEDIUM'
      },
      TA: {
        title: 'Threshold Assessment',
        icon: '📊',
        description:
          'Evaluated pest population levels against economic thresholds to determine treatment needs',
        impact: 'MEDIUM'
      },
      IP: {
        title: 'IPM Implementation',
        icon: '🌱',
        description: 'Several pest-control methods were used together rather than relying on one',
        impact: 'HIGH'
      },
      // §E-4: the plainest organic story on the page — physical work done in the orchard in
      // place of a spray. Stated as the practice performed, with no claim about the result.
      CU: {
        title: 'Winter Sanitation & Cultural Control',
        icon: '🍂',
        description:
          'Overwintering pest sites were physically removed from the orchard, the preventive practice used here instead of spraying',
        impact: 'HIGH'
      },
      scouting: {
        title: 'Pest Scouting',
        icon: '🔍',
        description:
          'Monitored crops for pest populations and damage levels to inform management decisions',
        impact: 'LOW'
      },
      beneficial_release: {
        title: 'Beneficial Release',
        icon: '🐞',
        description: 'Beneficial insects were released into the block',
        impact: 'HIGH'
      },
      trap_monitoring: {
        title: 'Trap Monitoring',
        icon: '🪤',
        description: 'Pest traps around the block were checked and the counts written down',
        impact: 'LOW'
      },
      pest_identification: {
        title: 'Pest Identification',
        icon: '🔬',
        description: 'The pest was identified before any decision about treating it',
        impact: 'MEDIUM'
      },
      threshold_assessment: {
        title: 'Threshold Assessment',
        icon: '📊',
        description:
          'Evaluated pest population levels against economic thresholds to determine treatment needs',
        impact: 'MEDIUM'
      },
      ipm_implementation: {
        title: 'IPM Implementation',
        icon: '🌱',
        description: 'Several pest-control methods were used together rather than relying on one',
        impact: 'HIGH'
      }
    };

    // Get pest management type from event data
    const eventPestType = event.pest_management_type || event.pest_type || event.type || 'SC';
    const typeInfo = pestTypeMap[eventPestType] || {
      title: 'Pest & scouting',
      icon: '🐛',
      description: 'Applied sustainable pest management practices to protect crop health',
      impact: 'MEDIUM' as 'MEDIUM'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build transparency details from pest management data
    const pestDetails: string[] = [];

    if (event.pest_species) {
      pestDetails.push(`Target: ${event.pest_species}`);
    }

    if (event.pest_pressure_level) {
      pestDetails.push(`Pressure: ${event.pest_pressure_level}`);
    }

    if (event.damage_percentage) {
      pestDetails.push(`Crop impact: ${event.damage_percentage}%`);
    }

    if (event.beneficial_species) {
      pestDetails.push(`Beneficial: ${event.beneficial_species}`);
    }

    if (event.release_quantity) {
      pestDetails.push(`Quantity: ${event.release_quantity}`);
    }

    if (event.trap_count) {
      pestDetails.push(`Traps: ${event.trap_count}`);
    }

    if (event.field_area_hectares) {
      pestDetails.push(`Area: ${event.field_area_hectares} hectares`);
    }

    if (event.time_spent_hours) {
      pestDetails.push(`Duration: ${event.time_spent_hours} hours`);
    }

    // Create detailed description
    const detailsText = pestDetails.length > 0 ? ` (${pestDetails.join(' • ')})` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on pest management type
    let consumerImpact =
      'The method used against the pest is on record, alongside the counts that prompted it.';
    let sustainabilityBenefit =
      'Part of integrated pest management approach that reduces reliance on synthetic pesticides and promotes ecological balance.';

    if (eventPestType === 'CU') {
      consumerImpact =
        'Prevention work like sanitation and habitat choices is logged here, the part of pest control that avoids sprays entirely.';
      sustainabilityBenefit =
        'Organic pest management is built on prevention first, and this record is what puts that work on paper.';
    } else if (eventPestType === 'SC' || eventPestType === 'scouting') {
      consumerImpact =
        'Regular pest monitoring helps detect issues early, preventing damage and reducing the need for chemical interventions.';
      sustainabilityBenefit =
        'Counts and dates are on record, so a decision to treat, or not to treat, can be checked against what was actually found.';
    } else if (eventPestType === 'TM' || eventPestType === 'trap_monitoring') {
      consumerImpact =
        'Counting first is what lets a farm treat only when the numbers call for it, instead of on a fixed calendar.';
      sustainabilityBenefit =
        'Trap monitoring reduces pesticide applications by providing precise timing for control measures only when needed.';
    } else if (eventPestType === 'BR' || eventPestType === 'beneficial_release') {
      consumerImpact =
        'Predator insects do the work a spray would otherwise do, and they stay in the orchard afterwards.';
      sustainabilityBenefit =
        'Releases are recorded by species and date, so the approach can be followed across the season.';
    } else if (eventPestType === 'PI' || eventPestType === 'pest_identification') {
      consumerImpact =
        'Knowing exactly which insect is present is what makes a targeted response possible instead of a broad one.';
      sustainabilityBenefit =
        'Species-specific pest management reduces unnecessary treatments and supports integrated approaches that preserve beneficial organisms.';
    } else if (eventPestType === 'TA' || eventPestType === 'threshold_assessment') {
      consumerImpact =
        'Scientific assessment of pest damage ensures treatments are only applied when economically necessary, protecting crop quality.';
      sustainabilityBenefit =
        'A counted threshold is the difference between treating because the numbers say so and treating on a hunch.';
    } else if (eventPestType === 'IP' || eventPestType === 'ipm_implementation') {
      consumerImpact =
        'Mixing traps, beneficial insects and targeted treatment is what stops pests building resistance to any single product.';
      sustainabilityBenefit =
        'Integrated pest management reduces chemical dependency through biological controls, monitoring, and targeted interventions.';
    }

    // Use farmer's actual event name when available
    const transparencyTitle = event.name || event.commercial_name || typeInfo.title;

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage:
        'Sustainable pest management practice following integrated pest management principles',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For general events (event_type: 3), create specific descriptions based on activity type
  if (event && (event.event_type === 3 || event.type === 'general')) {
    let icon = '🔧';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map activity types to consumer-friendly descriptions
    const activityTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      maintenance: {
        title: 'Farm Maintenance Activity',
        icon: '🔧',
        description: 'Maintained farm infrastructure and equipment for optimal operations',
        impact: 'LOW'
      },
      planning: {
        title: 'Farm Planning',
        icon: '📋',
        description: 'Planned and organized farming activities for optimal productivity',
        impact: 'LOW'
      },
      training: {
        title: 'Training Activity',
        icon: '🎓',
        description: 'Conducted training activities to improve farming knowledge and skills',
        impact: 'MEDIUM'
      },
      documentation: {
        title: 'Farm Documentation',
        icon: '📝',
        description: 'Documented farming practices for transparency and compliance',
        impact: 'LOW'
      },
      inspection: {
        title: 'Safety Inspection',
        icon: '🛡️',
        description: 'Inspected farm facilities and equipment for safety compliance',
        impact: 'HIGH'
      },
      meeting: {
        title: 'Team Meeting',
        icon: '👥',
        description: 'Coordinated team activities and planning sessions',
        impact: 'LOW'
      },
      community: {
        title: 'Community Engagement',
        icon: '🤝',
        description: 'Engaged with the community through farm tours and outreach',
        impact: 'LOW'
      },
      precision_ag: {
        title: 'Precision Agriculture',
        icon: '🛰️',
        description: 'Conducted precision agriculture activities for data-driven farming',
        impact: 'LOW'
      },
      emergency: {
        title: 'Emergency/Storm Response',
        icon: '⚠️',
        description: 'Responded to emergency conditions with cleanup and damage repair',
        impact: 'MEDIUM'
      },
      other: {
        title: 'General Farm Activity',
        icon: '🔧',
        description: 'Completed general farming activity as part of farm operations',
        impact: 'LOW'
      }
    };

    // Get activity type from event data
    // ⚠️ Do NOT default to 'maintenance'. This used to read `event.activity_type ||
    // 'maintenance'`, which described EVERY untyped general event as "Maintained farm
    // infrastructure and equipment for optimal operations" — on 60 of the 77 general events
    // on published productions, because 78% of them carry no activity_type at all.
    // Those events are water-quality tests, contamination reports, farm walks: describing
    // them as equipment maintenance is simply untrue, and it is the consumer page saying it.
    // An unknown activity now falls to the neutral typeInfo below, and its consumerImpact
    // falls to the family fallback, which ConsumerEventCard suppresses — so the card leans on
    // the farmer's own event name and notes instead of inventing a category for them.
    const eventActivityType = event.activity_type || 'unspecified';
    const typeInfo = activityTypeMap[eventActivityType] || {
      title: 'General Farm Activity',
      icon: '🔧',
      // Deliberately says only that a record exists. This line is now what the 60 untyped
      // general events show, so it must not characterise work nobody described.
      description: 'A farm activity recorded as part of this crop’s history',
      impact: 'LOW' as const
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // 🔴 2026-08-31 — a logged contamination incident is NOT the activity it was filed under.
    //
    // Until now this record reached the buyer page wearing whatever `activity_type` copy it
    // happened to carry. Filed as `emergency` — the closest thing the picker offers — a
    // § 205.201(b) spray-drift report was described to a shopper as "Responded to emergency
    // conditions with cleanup and damage repair", told them "Rapid emergency response protects
    // crops and farm infrastructure, ensuring continued quality production", and credited the
    // farm under an ENVIRONMENTAL BENEFIT heading for "resilience against weather events".
    // Storm tidy-up wording over a drift incident, with praise attached.
    //
    // Keys off the incident flag rather than `activity_type` deliberately: an incident may be
    // filed under any activity, and this flag is the only thing that makes it one.
    //
    // The wording states what the PUBLIC payload actually carries — the fact, the source, the
    // affected area and the resolution date. The corrective-action narrative and the
    // certifier's identity are owner-only in PublicHistorySerializer (they name third parties),
    // so this must not promise a follow-up the card has no way to show.
    //
    // `isAffirmativeFlag` is the same predicate the registry's `visibleWhen` uses, on purpose:
    // the rows and the wording gate on ONE flag, so reading it two ways would render the
    // incident fields under the reassuring activity copy this override exists to replace.
    const isContaminationIncident = isAffirmativeFlag(event.is_contamination_incident);
    const incidentShortDescription = isContaminationIncident
      ? 'A contamination incident was recorded for this block'
      : null;

    // Build transparency details from general event data
    const generalDetails: string[] = [];

    const activityTypeLabels: Record<string, string> = {
      maintenance: 'Maintenance',
      planning: 'Planning',
      training: 'Training',
      documentation: 'Documentation',
      inspection: 'Inspection',
      meeting: 'Team Meeting',
      community: 'Community Engagement',
      precision_ag: 'Precision Agriculture',
      emergency: 'Emergency Response',
      other: 'Other Activity'
    };
    if (event.activity_type && event.activity_name) {
      const typeLabel = activityTypeLabels[event.activity_type] || event.activity_type;
      generalDetails.push(`${typeLabel}: ${event.activity_name}`);
    } else if (event.activity_name) {
      generalDetails.push(`Activity: ${event.activity_name}`);
    }

    if (event.duration || event.duration_raw) {
      const duration = event.duration || `${event.duration_raw} hours`;
      generalDetails.push(`Duration: ${duration}`);
    }

    if (event.people_involved && event.people_involved > 0) {
      const peopleText = event.people_involved === 1 ? 'person' : 'people';
      generalDetails.push(`${event.people_involved} ${peopleText} involved`);
    }

    // Create detailed description
    const detailsText = generalDetails.length > 0 ? ` • ${generalDetails.join(' • ')}` : '';

    const fullDescription = (incidentShortDescription ?? typeInfo.description) + detailsText;

    // Create personalized consumer messages based on activity type
    let consumerImpact =
      'This farm management activity supports efficient operations and sustainable farming practices.';
    let sustainabilityBenefit =
      'Part of comprehensive farm management that ensures operational efficiency and environmental responsibility.';

    if (eventActivityType === 'maintenance') {
      consumerImpact =
        'Regular farm maintenance ensures equipment operates efficiently and safely for quality food production.';
      sustainabilityBenefit =
        'Preventive maintenance reduces equipment breakdowns, extends machinery life, and minimizes environmental impact from repairs.';
    } else if (eventActivityType === 'planning') {
      consumerImpact =
        'Strategic farm planning optimizes resource allocation and ensures efficient crop management throughout the season.';
      sustainabilityBenefit =
        'Comprehensive planning reduces waste, optimizes inputs, and supports sustainable farming decision-making.';
    } else if (eventActivityType === 'training') {
      consumerImpact =
        'Professional training ensures best practices are followed for safe, high-quality food production.';
      sustainabilityBenefit =
        'Ongoing education promotes adoption of sustainable techniques and improves overall farming practices.';
    } else if (eventActivityType === 'documentation') {
      consumerImpact =
        'Detailed farm documentation provides transparency and traceability that builds consumer trust in food production.';
      sustainabilityBenefit =
        'Thorough record-keeping enables continuous improvement and demonstrates commitment to sustainable practices.';
    } else if (eventActivityType === 'inspection') {
      consumerImpact =
        'Regular safety inspections ensure farm operations meet high standards for worker safety and food quality.';
      sustainabilityBenefit =
        'Safety protocols protect workers and the environment while maintaining sustainable operational standards.';
    } else if (eventActivityType === 'emergency') {
      consumerImpact =
        'Rapid emergency response protects crops and farm infrastructure, ensuring continued quality production.';
      sustainabilityBenefit =
        'Prompt damage repair minimizes crop loss and maintains farm resilience against weather events.';
    } else if (eventActivityType === 'precision_ag') {
      consumerImpact =
        'Precision agriculture technology enables data-driven decisions that optimize resource use and improve crop quality.';
      sustainabilityBenefit =
        'Data-driven farming reduces input waste, targets treatments precisely, and supports sustainable resource management.';
    } else if (eventActivityType === 'community') {
      consumerImpact =
        'Community engagement builds connections between farmers and consumers, strengthening local food systems.';
      sustainabilityBenefit =
        'Agricultural outreach promotes understanding of sustainable farming and supports local community resilience.';
    } else if (eventActivityType === 'meeting') {
      consumerImpact =
        'Team coordination ensures all farm operations are well-planned and executed with attention to quality.';
      sustainabilityBenefit =
        'Collaborative planning promotes best practices and continuous improvement in farming operations.';
    }

    // Last, so it overrides whichever activity branch ran above (see the incident note near
    // `incidentShortDescription`). `sustainabilityBenefit` is emptied rather than reworded:
    // ConsumerEventCard's `isGenericCopy` suppresses the ENVIRONMENTAL BENEFIT block on an
    // empty string, and there is no environmental benefit to claim from a contamination event.
    // Claiming one is exactly the FTC 16 CFR 260.4 general-benefit failure the rest of this
    // file has been pruned of.
    if (isContaminationIncident) {
      consumerImpact =
        'The farm recorded this incident itself, along with where it came from and how much of the block it reached.';
      sustainabilityBenefit = '';
    }

    // Enhanced title resolution for general events
    const getGeneralTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Event name (primary title set by farmer in the form)
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 2: Activity name (descriptive subtitle)
      if (event.activity_name && event.activity_name.trim()) {
        return event.activity_name;
      }

      // Priority 3: Activity type
      if (event.activity_type && event.activity_type.trim()) {
        return event.activity_type;
      }

      // Priority 4: Use typeInfo from mapping
      return typeInfo.title;
    };

    const transparencyTitle = getGeneralTitle(event, typeInfo);

    return {
      title: transparencyTitle,
      description: fullDescription,
      shortDescription: incidentShortDescription ?? typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Farm management activity following operational best practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For equipment events (event_type: 4), create specific descriptions based on operation data
  if (event && event.event_type === 4) {
    // Since Equipment-specific fields are not being serialized from backend,
    // provide fallback messages based on available event data
    const equipmentName = event.name || 'Equipment work';

    // Check if we have Equipment-specific data fields
    if (!event.operation_type && !event.equipment_type && !event.fuel_consumed) {
      // Fallback Equipment handling when specific fields are undefined
      return {
        title: equipmentName,
        description:
          'This equipment operation demonstrates efficient farm equipment management, showing how modern agricultural practices optimize resource use while maintaining food quality.',
        shortDescription: 'Equipment operation completed as part of farm activities',
        icon: '🚜',
        impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW',
        consumerMessage: 'Farm equipment operation following best practices',
        // Was two filler sentences shared by all six equipment subtypes (31 live events) —
        // "demonstrates efficient farm equipment management, showing how modern agricultural
        // practices optimize resource use". A general environmental claim about a tractor log.
        //
        // ⚠️ This branch fires when the event has NO operation type, equipment type or fuel
        // figure — a bare log. So it must not assert an outcome. An earlier draft said the
        // machinery "does not leak or spill in the field", which is a claim about this farm
        // made from an empty record. Describe what the record is, and explain why equipment
        // upkeep matters in general; the badge and the farmer's own notes carry the specifics.
        consumerImpact: 'The farm logged work on its equipment as part of this crop’s record.',
        sustainabilityBenefit:
          'Equipment that is maintained and calibrated uses less fuel and applies less product to do the same job.'
      };
    }

    let icon = '🚜';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';

    // Map operation types to consumer-friendly descriptions
    // CRITICAL: Must include actual operation type codes from EquipmentTab.jsx
    const operationTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      // FIXED: Match actual EQUIPMENT_OPERATION_TYPES from EquipmentTab.jsx
      FC: {
        title: 'Fuel Consumption', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '⛽',
        description:
          'Documented fuel consumption for field operations with transparent tracking of equipment efficiency',
        impact: 'MEDIUM'
      },
      MN: {
        title: 'Maintenance', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🔧',
        description:
          'Preventive maintenance activities to ensure optimal equipment performance and longevity',
        impact: 'LOW'
      },
      RE: {
        title: 'Repair', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🛠️',
        description:
          'Equipment repair operations to restore functionality and maintain operational efficiency',
        impact: 'MEDIUM'
      },
      CA: {
        title: 'Calibration', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '⚙️',
        description:
          'Precision calibration activities to ensure accurate equipment operation and optimal performance',
        impact: 'LOW'
      },
      BD: {
        title: 'Breakdown', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🚨',
        description:
          'Emergency breakdown response and troubleshooting to restore equipment functionality',
        impact: 'HIGH'
      },
      EI: {
        title: 'Inspection', // 🚨 CRITICAL FIX: Use exact same name as eventPreviewUtils
        icon: '🔍',
        description:
          'Systematic equipment inspection to ensure safety standards and operational readiness',
        impact: 'LOW'
      },
      // Legacy full text versions (for backward compatibility)
      'Fuel Consumption - Field Operations': {
        title: 'Fuel Consumption - Field Operations',
        icon: '⛽',
        description:
          'Documented fuel consumption for field operations with transparent tracking of equipment efficiency',
        impact: 'MEDIUM'
      },
      'Maintenance & Service': {
        title: 'Maintenance & Service',
        icon: '🔧',
        description:
          'Equipment maintenance and service activities to ensure optimal operational efficiency',
        impact: 'LOW'
      },
      'Transportation & Logistics': {
        title: 'Transportation & Logistics',
        icon: '🚛',
        description:
          'Transportation and logistics operations with documented fuel usage and efficiency tracking',
        impact: 'MEDIUM'
      },
      'Storage & Handling': {
        title: 'Storage & Handling',
        icon: '📦',
        description:
          'Storage and handling operations with complete documentation of equipment usage',
        impact: 'LOW'
      }
    };

    // Determine operation type from various possible fields
    const operationType = event.operation_type || event.type || '';
    const typeInfo = operationTypeMap[operationType] || {
      title: 'Equipment work',
      icon: '🚜',
      description: 'Agricultural equipment operation with transparent operational tracking',
      impact: 'MEDIUM' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed operation information
    const equipmentDetails: string[] = [];

    if (event.operation_name || event.name) {
      equipmentDetails.push(`Operation: ${event.operation_name || event.name}`);
    }

    if (event.equipment_type) {
      equipmentDetails.push(`Equipment: ${event.equipment_type}`);
    }

    if (event.fuel_consumed && event.fuel_consumed > 0) {
      equipmentDetails.push(`Fuel: ${event.fuel_consumed} L`);
    }

    if (event.hours_operated && event.hours_operated > 0) {
      equipmentDetails.push(`Hours: ${event.hours_operated}h`);
    }

    if (event.area_worked && event.area_worked > 0) {
      equipmentDetails.push(`Area: ${event.area_worked} ha`);
    }

    if (event.operation_efficiency) {
      equipmentDetails.push(`Efficiency: ${event.operation_efficiency}`);
    }

    // Create detailed description
    const detailsText = equipmentDetails.length > 0 ? ` • ${equipmentDetails.join(' • ')}` : '';

    const fullDescription = typeInfo.description + detailsText;

    // Create personalized consumer messages based on operation type
    let consumerImpact =
      'This equipment operation supports efficient and sustainable farming practices.';
    let sustainabilityBenefit =
      'Documented equipment operations demonstrate transparent farming practices and operational efficiency.';

    // FIXED: Specific messages for each operation type code matching EquipmentTab.jsx
    if (operationType === 'FC' || operationType.includes('Fuel Consumption')) {
      consumerImpact =
        'Field equipment operation with complete fuel consumption documentation for transparency.';
      sustainabilityBenefit =
        'Precise fuel consumption tracking enables equipment efficiency optimization and environmental impact reduction.';
    } else if (operationType === 'MN' || operationType.includes('Maintenance')) {
      consumerImpact =
        'Equipment maintenance ensures optimal performance and reduces environmental impact from inefficient operations.';
      sustainabilityBenefit =
        'Preventive maintenance extends equipment life, reduces fuel consumption, and minimizes operational carbon footprint.';
    } else if (operationType === 'RE' || operationType.includes('Repair')) {
      consumerImpact =
        'Equipment repair restores functionality and maintains operational efficiency for sustainable farming.';
      sustainabilityBenefit =
        'Timely equipment repairs prevent breakdowns, reduce waste from damaged equipment, and maintain operational efficiency.';
    } else if (operationType === 'CA' || operationType.includes('Calibration')) {
      consumerImpact =
        'Equipment calibration ensures precise operations and optimal resource usage for quality production.';
      sustainabilityBenefit =
        'Regular calibration improves precision, reduces resource waste, and optimizes equipment efficiency for environmental benefits.';
    } else if (operationType === 'BD' || operationType.includes('Breakdown')) {
      consumerImpact =
        'Equipment breakdown response ensures quick restoration of operations and minimal impact on production.';
      sustainabilityBenefit =
        'Rapid breakdown response minimizes operational delays and prevents resource waste from extended equipment downtime.';
    } else if (operationType === 'EI' || operationType.includes('Inspection')) {
      consumerImpact =
        'Equipment inspection ensures safety standards and optimal performance for reliable farming operations.';
      sustainabilityBenefit =
        'Regular inspections prevent equipment failures, extend machinery life, and maintain optimal efficiency for sustainability.';
    }

    // Enhanced title resolution for equipment events
    const getEquipmentTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Operation name from form
      if (event.operation_name && event.operation_name.trim()) {
        return event.operation_name;
      }

      // Priority 2: Equipment event name field
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Operation type
      if (event.operation_type && event.operation_type.trim()) {
        return event.operation_type;
      }

      // Priority 4: Equipment type with operation context
      if (event.equipment_type && event.equipment_type.trim()) {
        return `${event.equipment_type} Operation`;
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const equipmentTitle = getEquipmentTitle(event, typeInfo);

    return {
      title: equipmentTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Equipment operation following sustainable farming practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // For business events (event_type: 7), create specific descriptions based on business activity data
  if (event && (event.event_type === 7 || event.type === 'business')) {
    let icon = '📋';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

    // Map business activity types to consumer-friendly descriptions
    const businessTypeMap: Record<
      string,
      { title: string; icon: string; description: string; impact: 'HIGH' | 'MEDIUM' | 'LOW' }
    > = {
      certification: {
        title: 'Certification Achievement',
        icon: '🏆',
        description: 'A third-party certification was recorded for this crop',
        impact: 'HIGH'
      },
      sustainability_audit: {
        title: 'Sustainability Assessment',
        icon: '📊',
        description: 'An audit of the operation was carried out and recorded',
        impact: 'MEDIUM'
      },
      verification: {
        title: 'Third-Party Verification',
        icon: '✅',
        description: 'An outside body reviewed this operation against a written standard',
        impact: 'MEDIUM'
      },
      compliance: {
        title: 'Regulatory Compliance',
        icon: '📜',
        description: 'Compliance with environmental regulations and agricultural safety standards',
        impact: 'MEDIUM'
      },
      transparency: {
        title: 'Transparency Initiative',
        icon: '👁️',
        description:
          'Consumer transparency initiative providing visibility into agricultural practices',
        impact: 'LOW'
      }
    };

    // Determine business activity type from various possible fields
    const businessType = event.business_activity_type || event.business_type || 'business';
    const typeInfo = businessTypeMap[businessType] || {
      title: 'Certification & compliance',
      icon: '📋',
      description: 'A business or compliance record was filed for this crop',
      impact: 'LOW' as 'HIGH' | 'MEDIUM' | 'LOW'
    };

    icon = typeInfo.icon;
    impactLevel = typeInfo.impact;

    // Build detailed description based on business event fields
    let fullDescription = typeInfo.description;

    // Add certificate number for traceability and transparency
    if (event.certificate_number && String(event.certificate_number).trim()) {
      // "provides verifiable proof" asserts a verification Trazo has not performed — the number
      // is a farmer-entered string. What it genuinely offers is a way for a buyer to ask the
      // ISSUER. The consumerImpact text for certification events already says exactly that;
      // this line contradicted it in the same payload.
      fullDescription += ` Certificate number ${event.certificate_number} can be checked with the issuing body.`;
    }

    // Add certification details with consumer-friendly explanations
    if (event.certification_type) {
      // Each entry says what the standard COVERS and who audits it — not what it achieves.
      //
      // "USDA Organic certification ensuring chemical-free farming practices" was the reason
      // this map was rewritten: organic is not chemical-free. 7 CFR 205.601 permits a list of
      // synthetics — copper, sulfur, pyrethrin among them — and this very codebase classifies
      // events against that list. Telling a shopper otherwise is a false statement of fact,
      // not a shade of emphasis, and the neighbours had the same shape: Fair Trade "ensuring"
      // fair wages, Rainforest Alliance "protecting biodiversity", Non-GMO "free from genetic
      // modification" (the Project verifies against an action threshold, not absence).
      //
      // A certificate is evidence that an operation was audited against a standard. It is not
      // evidence that the standard's goals were achieved on this farm in this season, and only
      // the issuing body can speak to the first — which is why every line below names it.
      const certificationTypes: Record<string, string> = {
        organic_usda:
          'USDA Organic: the National Organic Program standard, covering permitted inputs, land history and recordkeeping, assessed by a USDA-accredited certifier',
        global_gap:
          'GlobalG.A.P.: a farm-practice and food-safety standard covering production, handling and worker health, audited by an approved certification body',
        rainforest_alliance:
          'Rainforest Alliance: a standard covering farm management, biodiversity and working conditions, audited by an authorised certification body',
        fair_trade:
          'Fair Trade: a standard covering labour conditions, trading terms and a producer premium, audited by the issuing body',
        regenerative:
          'Regenerative Organic Certified: a standard layered on organic certification, adding soil practices, animal welfare and farmworker fairness',
        cng: 'Certified Naturally Grown: a peer-reviewed certification for farms following practices modelled on the National Organic Program',
        non_gmo:
          'Non-GMO Project Verified: a standard for avoiding genetically engineered inputs, assessed against the Project testing and traceability requirements',
        sustainable_agriculture: 'Sustainable Agriculture Standard, as recorded by this operation',
        kosher:
          'Kosher certification: a standard covering ingredients, equipment and handling, assessed by a certifying agency',
        food_safety:
          'SQF or equivalent food-safety certification: a standard covering handling, sanitation and traceability, audited by a licensed certification body',
        water_stewardship:
          'Water stewardship certification: a standard covering water use, catchment impact and water quality at the site'
      };

      // The fallback described ANY unrecognised certification as "validating sustainable
      // practices" — an unqualified general environmental benefit claim (16 CFR 260.4) applied
      // to a value nobody had reviewed. State the record, claim nothing.
      const certDesc =
        certificationTypes[event.certification_type] ||
        `${event.certification_type.replace(
          /_/g,
          ' '
        )} certification, as recorded by this operation`;
      fullDescription = certDesc;
    }

    // Add verification status with consumer-friendly messaging
    if (event.verification_status && event.verification_status !== 'pending') {
      const statusMessages: Record<string, string> = {
        verified: 'Successfully verified by independent third-party auditor',
        in_progress: 'Currently undergoing verification process',
        failed: 'Verification process identified areas for improvement',
        not_applicable: 'Verification not required for this activity'
      };
      const statusMsg =
        statusMessages[event.verification_status] ||
        `Verification status: ${event.verification_status}`;
      fullDescription += `. ${statusMsg}`;
    }

    // Add sustainability practice details with consumer-friendly explanations
    if (event.sustainability_practice) {
      const practiceDescriptions: Record<string, string> = {
        cover_cropping: 'Cover cropping protects soil health and reduces erosion naturally',
        no_till: 'No-till farming preserves soil structure and captures carbon underground',
        integrated_pest:
          'Integrated pest management reduces chemical use through natural pest control',
        water_conservation:
          'Water conservation measures protect this precious resource for future generations',
        renewable_energy:
          'Renewable energy installation reduces farm carbon footprint and operational costs',
        composting: 'On-farm composting turns organic waste into natural fertilizer',
        biodiversity: 'Biodiversity conservation protects native species and ecosystem health',
        soil_health: 'Soil health improvement enhances crop quality and carbon capture'
      };
      const practiceDesc =
        practiceDescriptions[event.sustainability_practice] ||
        `${event.sustainability_practice.replace(
          /_/g,
          ' '
        )} practice supporting environmental sustainability`;
      fullDescription += `. ${practiceDesc}`;
    }

    // Consumer impact messaging (static so it localizes via the dict)
    let consumerImpact = 'Supporting agricultural transparency and sustainability';
    if (businessType === 'certification') {
      // A certification is the strongest evidence on the page, and it was running on filler
      // ("Certified products ensuring quality and environmental standards", shared by all
      // three business subtypes).
      //
      // ⚠️ ATTRIBUTION, not assertion. An earlier draft here read "An outside certifier
      // inspected this farm and its records" — which states a third-party audit as fact from
      // a FARMER-ENTERED record. `verification_status` is self-attested (live data: 18
      // "verified", and the same cards render a "Self Reported" badge), and Trazo only
      // independently confirms USDA Organic via the Integrity Database match. Asserting an
      // inspection happened would be exactly the overclaim compliance.md exists to prevent,
      // and worse than the filler it replaced.
      //
      // So: say the farm RECORDED it, and explain what certification means in general. The
      // provenance chip alongside carries the qualifier — "Grower record" since 2026-09-02,
      // when the five-rung "Self Reported → … → Certified" trust ladder was retired (it was a
      // self-assigned grade; see utils/verificationTierHelpers.ts). ConsumerEventCard keeps
      // that chip visible on the COLLAPSED card for business events precisely because of this
      // line — do not let the two drift apart.
      // ⛔ NOT "check it with the issuing body". The issuing body is DELIBERATELY withheld from
      // the consumer payload — `verified_certifier_name` is farmer-typed free text and
      // `public_certifier_name()` (history/serializers.py) suppresses it unless a USDA Organic
      // Integrity Database match backs it (ECGT 2024/825, FTC 16 CFR 260.6). Telling a shopper
      // to contact an issuer the page will not name is a promise the page cannot keep.
      //
      // The certificate NUMBER is published, and that is the checkable part.
      consumerImpact =
        'The certificate number is published here, so this is a claim a buyer can check rather than take on trust.';
    } else if (businessType === 'verification') {
      // Same correction: the audit BODY is not on the wire for a consumer (see above), so the
      // page cannot say it is "on record" for them. What is on record here is the farm's own
      // account of the audit and its date, carrying the "Grower record" provenance chip beside
      // it (was "Self-Reported" until the trust ladder was retired on 2026-09-02).
      consumerImpact =
        "The date and the farm's own account of the audit are on record here, labelled as the farm reported them.";
    } else if (businessType === 'transparency') {
      consumerImpact =
        'The record behind this crop is open for a buyer to read, not summarised for them.';
    } else if (businessType === 'sustainability_audit') {
      // Same attribution rule as 'verification' above: the farm's own account, dated.
      consumerImpact =
        'What was reviewed, and when, is written down as the farm reported it, so a buyer can ask about specifics instead of generalities.';
    } else if (businessType === 'compliance') {
      consumerImpact =
        'Compliance work like inspections and filings is dated and on record here, as the farm reported it.';
    }

    // Sustainability benefit - Enhanced with certificate transparency
    let sustainabilityBenefit =
      'The document, the issuer and the date are on record for this crop.';
    if (businessType === 'certification') {
      // Was "Third-party validation of sustainable farming practices ensuring environmental
      // protection…" — which overstates what an audit does. A certifier checks conformance to
      // a written standard; it does not certify "environmental protection" in the abstract.
      // Kept generic (what certification IS) rather than asserting this farm passed one —
      // see the attribution note on consumerImpact above.
      sustainabilityBenefit =
        'Certifications are re-checked on a schedule, so they reflect an ongoing review rather than a one-time claim.';
    } else if (businessType === 'verification') {
      sustainabilityBenefit =
        'An audit checks conformance to a written standard on the day it is carried out; the record here says which standard and when.';
    } else if (businessType === 'sustainability_audit') {
      sustainabilityBenefit =
        'An audit trail with dates is what lets a buyer ask better questions, starting from what was actually reviewed and when.';
    } else if (businessType === 'compliance') {
      sustainabilityBenefit =
        'Keeping compliance events in the same timeline as the field work makes the record continuous instead of split across binders.';
    }

    // Enhanced title resolution for business events
    const getBusinessTitle = (event: any, typeInfo: any): string => {
      // Priority 1: Event name from form (highest priority - farmer's custom name)
      if (event.business_event_name && event.business_event_name.trim()) {
        return event.business_event_name;
      }

      // Priority 2: Name field from form
      if (event.name && event.name.trim()) {
        return event.name;
      }

      // Priority 3: Build specific title from business_type + certification/credit/practice details
      const businessType = event.business_activity_type || event.business_type;

      // Certification events - use certification type for specific title
      // Check certification_type directly (don't require businessType === 'certification')
      // because field mapping normalization may not preserve businessType correctly
      if (event.certification_type) {
        const certTypes: Record<string, string> = {
          organic_usda: 'USDA Organic Certification',
          global_gap: 'GlobalG.A.P. Certification',
          rainforest_alliance: 'Rainforest Alliance Certification',
          fair_trade: 'Fair Trade Certification',
          regenerative: 'Regenerative Organic Certified',
          cng: 'Certified Naturally Grown',
          non_gmo: 'Non-GMO Project Verified',
          kosher: 'Kosher Certification',
          food_safety: 'SQF / Food Safety Certification',
          sustainable_agriculture: 'Sustainable Agriculture Standard',
          water_stewardship: 'Water Stewardship Certification'
        };
        const certTitle =
          certTypes[event.certification_type] || `${event.certification_type} Certification`;
        return certTitle;
      }

      // Sustainability audit with practice details
      if (businessType === 'sustainability_audit' && event.sustainability_practice) {
        const practiceNames: Record<string, string> = {
          cover_cropping: 'Cover Cropping Assessment',
          no_till: 'No-Till Farming Audit',
          integrated_pest: 'Integrated Pest Management Audit',
          water_conservation: 'Water Conservation Audit',
          renewable_energy: 'Renewable Energy Assessment',
          composting: 'Composting Program Audit',
          biodiversity: 'Biodiversity Conservation Audit',
          soil_health: 'Soil Health Assessment'
        };
        return (
          practiceNames[event.sustainability_practice] || `${event.sustainability_practice} Audit`
        );
      }

      // Verification events - add verification status if definitive
      if (
        businessType === 'verification' &&
        event.verification_status &&
        event.verification_status !== 'pending'
      ) {
        const statusText =
          event.verification_status === 'verified'
            ? 'Verified'
            : event.verification_status === 'failed'
            ? 'Failed'
            : event.verification_status;
        return `Third-Party Verification - ${statusText}`;
      }

      // Compliance events with sustainability practice
      if (businessType === 'compliance' && event.sustainability_practice) {
        return `Compliance: ${event.sustainability_practice.replace(/_/g, ' ')}`;
      }

      // Transparency events with sustainability practice
      if (businessType === 'transparency' && event.sustainability_practice) {
        return `Transparency Initiative: ${event.sustainability_practice.replace(/_/g, ' ')}`;
      }

      // Priority 4: Map business event type codes (CE, CM, IN) to specific titles
      if (event.type) {
        const codeToTitle: Record<string, string> = {
          CE: 'Certification Event',
          CM: 'Compliance Activity',
          IN: 'Inspection Process'
        };
        if (codeToTitle[event.type]) {
          // If we have business_type, combine them for a more specific title.
          if (businessType && businessType !== 'business') {
            const typeNames: Record<string, string> = {
              certification: 'Certification',
              carbon_credits: 'Carbon Credits',
              sustainability_audit: 'Sustainability Audit',
              verification: 'Third-Party Verification',
              compliance: 'Compliance',
              transparency: 'Transparency'
            };
            // Only append a KNOWN, human-readable name. The old `typeNames[businessType] ||
            // businessType` fell through to the raw value, so an unmapped code produced
            // consumer-facing headings like "Certification Event: CE" — a database enum as
            // the biggest line on a shopper's card. An unknown code now simply yields the
            // clean base title.
            const typeName = typeNames[businessType];
            // ...and skip the suffix when the base title already says it, or the CE +
            // certification pairing reads "Certification Event: Certification".
            const base = codeToTitle[event.type];
            if (typeName && !base.toLowerCase().includes(typeName.toLowerCase())) {
              return `${base}: ${typeName}`;
            }
          }
          return codeToTitle[event.type];
        }
      }

      // Fallback to typeInfo title
      return typeInfo.title;
    };

    const businessTitle = getBusinessTitle(event, typeInfo);

    return {
      title: businessTitle,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Business activity enhancing agricultural transparency and sustainability',
      consumerImpact,
      sustainabilityBenefit
    };
  }

  // Default mapping for other event types
  let mappedDescription = eventDescriptions['default'];
  let icon = '🌱';
  let impact: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';

  // Map based on description content
  if (lowerDesc.includes('fertilizer') || lowerDesc.includes('nutrient')) {
    mappedDescription = eventDescriptions['fertilizer application'];
    icon = '🌱';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('pesticide') || lowerDesc.includes('pest')) {
    mappedDescription = eventDescriptions['pesticide application'];
    icon = '🛡️';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('fungicide') || lowerDesc.includes('disease')) {
    mappedDescription = eventDescriptions['fungicide application'];
    icon = '🛡️';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('herbicide') || lowerDesc.includes('weed')) {
    mappedDescription = eventDescriptions['herbicide application'];
    icon = '🌾';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('scout') || lowerDesc.includes('monitoring')) {
    mappedDescription = eventDescriptions['pest scouting'];
    icon = '🔍';
    impact = 'LOW';
  } else if (lowerDesc.includes('trap')) {
    mappedDescription = eventDescriptions['trap monitoring'];
    icon = '🪤';
    impact = 'LOW';
  } else if (lowerDesc.includes('beneficial') || lowerDesc.includes('release')) {
    mappedDescription = eventDescriptions['beneficial release'];
    icon = '🐞';
    impact = 'HIGH';
  } else if (lowerDesc.includes('identification')) {
    mappedDescription = eventDescriptions['pest identification'];
    icon = '🔬';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('threshold')) {
    mappedDescription = eventDescriptions['threshold assessment'];
    icon = '📊';
    impact = 'MEDIUM';
  } else if (lowerDesc.includes('ipm') || lowerDesc.includes('integrated')) {
    mappedDescription = eventDescriptions['ipm implementation'];
    icon = '🌱';
    impact = 'HIGH';
  } else if (lowerDesc.includes('irrigation') || lowerDesc.includes('water')) {
    mappedDescription = eventDescriptions['irrigation'];
    icon = '💧';
    impact = 'LOW';
  } else if (lowerDesc.includes('harvest')) {
    mappedDescription = eventDescriptions['harvesting'];
    icon = '🌾';
    impact = 'LOW';
  } else if (lowerDesc.includes('plant')) {
    mappedDescription = eventDescriptions['planting'];
    icon = '🌱';
    impact = 'LOW';
  }

  // Add real details if event data is available
  const realDetails = event ? getRealTransparencyDetails(event) : '';

  // Backend now provides proper titles via TimelineService - use them directly
  let title = 'Agricultural Activity';
  if (event) {
    // Priority 1: Backend-provided commercial_name (for chemical events)
    if (event.commercial_name) {
      title = event.commercial_name;
    }
    // Priority 2: the equipment name -- ONLY on an equipment event.
    // Until 2026-08-31 four other families overloaded `equipment` with something that was
    // not equipment (product name, amendment type, certification, pest SPECIES), and this
    // branch reaches for that key second. Measured: none of the four actually got here --
    // each is claimed by an earlier per-family branch ("Pest & scouting", "Soil work",
    // "Certification & compliance", "Crop input application"), identical output with this
    // check present and absent. So the pest binomial leaked into the payload but was never
    // rendered as a title.
    //
    // The branch is still LIVE for any family those earlier branches do not claim, which is
    // what the check is for and the only shape its test can use. The backend has stopped
    // sending the mis-mapped keys (that is the real fix); this keeps a stale, cached or
    // replayed payload from reopening the hole. Guard: utils/__tests__/equipmentKeyTitleGate.
    else if (event.equipment && event.type === 'equipment') {
      title = event.equipment;
    }
    // Priority 3: Specific activity type based on backend event type
    else if (event.type?.includes('fertilizer')) {
      title = 'Fertilizer Application';
    } else if (event.type?.includes('pesticide')) {
      title = 'Pesticide Application';
    } else if (event.type?.includes('fungicide')) {
      title = 'Fungicide Application';
    } else if (event.type?.includes('herbicide')) {
      title = 'Herbicide Application';
    } else if (event.type?.includes('irrigation')) {
      title = 'Irrigation';
    } else if (event.type?.includes('harvest')) {
      title = 'Harvest';
    } else if (event.type?.includes('plant')) {
      title = 'Planting';
    }
  }

  return {
    title,
    description: mappedDescription + realDetails,
    shortDescription: mappedDescription,
    icon,
    impact,
    consumerMessage: 'Farming activity recorded for this crop',
    // The LAST-RESORT fallback, reached when no branch claims the event. It said "contributes
    // to sustainable agriculture and food quality" — an unsubstantiable general-benefit claim
    // (FTC 16 CFR 260.4) attached to an event we know nothing about, and unlike the per-family
    // fallbacks it is NOT in ConsumerEventCard's suppression list, so it actually rendered.
    consumerImpact: 'The farm logged this alongside the rest of the season.',
    sustainabilityBenefit:
      'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.'
  };
}

/**
 * Map event types to consumer-friendly categories
 */
export function getEventCategory(eventType: string): string {
  const categoryMap: Record<string, string> = {
    fertilizer: 'Soil Nutrition',
    pesticide: 'Plant Protection',
    fungicide: 'Disease Prevention',
    herbicide: 'Weed Management',
    chemical: 'Crop Treatment',
    irrigation: 'Water Management',
    planting: 'Crop Establishment',
    harvesting: 'Harvest Operations',
    equipment: 'Farm Operations',
    weather: 'Environmental Monitoring',
    soil: 'Soil Management',
    pest: 'Pest Management',
    business: 'Farm Management',
    general: 'Farm Operations'
  };

  return categoryMap[eventType.toLowerCase()] || 'Farm Activity';
}

/**
 * Get impact level based on event type and data
 */
export function getImpactLevel(event: any): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!event) return 'LOW';

  // Chemical events - assess based on product type and application rate
  if (event.type === 'chemical') {
    const productName = (event.commercial_name || event.equipment)?.toLowerCase() || '';

    // Organic treatments
    if (productName.includes('neem') || productName.includes('organic')) {
      return 'LOW';
    }

    // Synthetic herbicides
    if (productName.includes('roundup') || productName.includes('glyphosate')) {
      return 'MEDIUM';
    }

    // Other synthetic chemicals
    return 'MEDIUM';
  }

  // Irrigation and maintenance
  if (['irrigation', 'equipment', 'weather'].includes(event.type)) {
    return 'LOW';
  }

  return 'LOW';
}

/**
 * Format event date for consumer display
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Get sustainability impact level for an event.
 * Impact semantics: HIGH = high environmental concern, MEDIUM = moderate, LOW = low concern (good).
 * When carbon_impact (CO₂e) is available, uses CO₂e-based thresholds consistent with
 * CarbonImpactPreview badges. Falls back to type-based heuristics when CO₂e is unavailable.
 */
export function getSustainabilityImpact(
  description: string,
  event?: any
): 'high' | 'medium' | 'low' {
  // CO₂e-based classification: use actual carbon data when available
  // Thresholds align with CarbonImpactPreview: >60=Very High, >15=Moderate/High, ≤15=Low/Very Low
  const carbonImpact = typeof event?.carbon_impact === 'number' ? event.carbon_impact : null;
  if (carbonImpact !== null && carbonImpact > 0) {
    if (carbonImpact > 60) return 'high';
    if (carbonImpact > 15) return 'medium';
    return 'low';
  }

  // Chemical events: delegate to getConsumerEventDescription for nuanced impact
  if (event && (event.event_type === 2 || event.type === 'chemical' || event.chemical_type)) {
    const eventInfo = getConsumerEventDescription(description, event);
    if (eventInfo.impact === 'HIGH') return 'high';
    if (eventInfo.impact === 'MEDIUM') return 'medium';
    if (eventInfo.impact === 'LOW') return 'low';
  }

  // Production events: classify by activity type
  if (event && (event.event_type === 1 || event.type?.includes('production'))) {
    const prodType = event.production_type || '';
    // Harvesting/planting are significant operations
    if (prodType === 'HA' || prodType === 'PL' || prodType === 'TR') return 'medium';
    // Irrigation, pruning, equipment maintenance are routine low-impact activities
    if (prodType === 'IR' || prodType === 'PR' || prodType === 'EM') return 'low';
    // For other types, use fuel consumption as indicator
    const fuelConsumed = parseFloat(event.fuel_consumed) || 0;
    const areaCovered = parseFloat(event.area_covered) || 0;
    const fuelPerHa = areaCovered > 0 ? fuelConsumed / areaCovered : fuelConsumed;
    if (fuelPerHa > 20) return 'high';
    if (fuelPerHa > 5) return 'medium';
    return 'low';
  }

  // Soil management: generally beneficial/low-impact practices
  if (event && event.type === 'soil_management') {
    const soilType = event.soil_management_type || '';
    if (soilType === 'CC' || soilType === 'TI' || soilType === 'ST' || soilType === 'CO')
      return 'low';
    return 'low';
  }

  // Pest management: monitoring and biological control are low-impact
  if (event && event.type === 'pest_management') {
    const pestType = event.pest_management_type || '';
    if (pestType === 'BR' || pestType === 'SC' || pestType === 'IP') return 'low';
    return 'medium';
  }

  // Weather and business events: monitoring/administrative
  if (event && (event.type === 'weather' || event.type === 'business')) {
    return 'low';
  }

  // Fallback: description-based
  return 'low';
}

/**
 * Get trust indicators for an event, as **i18n keys**.
 *
 * Returns keys rather than display text: these badges render on the consumer QR page, which
 * is bilingual (en-US / es-419), and they previously returned raw English ("USDA Standards")
 * that appeared untranslated in the middle of a localized Spanish page. Resolve each key
 * with `intl.formatMessage` at the render site — this module is a pure helper with no hook
 * access. Keys must exist in BOTH locale files.
 */
export function getEventTrustIndicators(event: any): string[] {
  const indicators: string[] = [];

  // Photo documented - handle both album and albums structures
  let hasPhotos = false;

  // Primary: Check event.album (singular) structure from backend
  if (
    event.album &&
    event.album.images &&
    Array.isArray(event.album.images) &&
    event.album.images.length > 0
  ) {
    hasPhotos = true;
  }
  // Secondary: Check legacy event.albums (plural) structure
  else if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    hasPhotos = event.albums.some((album: any) => {
      if (!album) return false;
      // Case 1: Nested structure with images array
      if (album.images && album.images.length > 0) return true;
      // Case 2: Direct image properties
      if (album.image_url || album.image) return true;
      return false;
    });
  }

  // USDA verified
  if (event.usda_factors_used) {
    indicators.push('consumer.eventCard.trust.usdaStandards');
  }

  // Modern farming practices (based on product types)
  if (event.equipment) {
    const equipment = event.equipment.toLowerCase();
    if (
      equipment.includes('professional') ||
      equipment.includes('precision') ||
      equipment.includes('modern')
    ) {
      indicators.push('consumer.eventCard.trust.modernFarming');
    }
    if (
      equipment.includes('organic') ||
      equipment.includes('natural') ||
      equipment.includes('neem')
    ) {
      indicators.push('consumer.eventCard.trust.naturalMethods');
    }
  }

  return indicators;
}

/**
 * Get timeline event title matching consumer card naming conventions.
 * Used by the parcel dashboard timeline to ensure consistent naming
 * with consumer-facing cards from getConsumerEventDescription().
 */
export function getTimelineEventTitle(event: any, intl?: any): string {
  // 1. For chemical events with commercial_name: return the commercial name
  if (event.commercial_name) {
    const isChemicalEvent =
      event.event_type === 2 ||
      event.type?.includes('chemical') ||
      (event.type && ['FE', 'PE', 'FU', 'HE'].includes(event.type));
    if (isChemicalEvent) {
      return event.commercial_name;
    }
  }

  // 2. For general events (event_type 3): use event name or activity name
  if (event.event_type === 3) {
    return event.name || event.activity_name || 'Farm Activity';
  }

  // 3. Farmer's custom name takes priority (matches consumer card title resolution)
  // Consumer cards check event.name/soil_management_name/title BEFORE type-mapped names
  if (event.event_type === 5) {
    // Soil: getSoilManagementTitle() checks title → soil_management_name → name → typeInfo
    const soilName = event.title || event.soil_management_name || event.name;
    if (soilName && soilName.trim()) return soilName;
  } else if (event.event_type === 0) {
    // Weather: checks name → weatherInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 6) {
    // Pest: checks name → commercial_name → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 7) {
    // Business: checks name → various fields → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  } else if (event.event_type === 1) {
    // Production: checks production_name → name → typeInfo.title
    const prodName = event.production_name || event.name;
    if (prodName && prodName.trim()) return prodName;
  } else if (event.event_type === 4) {
    // Equipment: checks name → typeInfo.title
    if (event.name && event.name.trim()) return event.name;
  }

  // 4. Lookup map matching consumer card titles from getConsumerEventDescription()
  const titleMap: Record<string, string> = {
    // Production
    PL: 'Planting',
    'event.production.planting': 'Planting',
    HA: 'Harvest Operation',
    'event.production.harvesting': 'Harvest Operation',
    IR: 'Irrigation Event',
    'event.production.irrigation': 'Irrigation Event',
    PR: 'Pruning Operation',
    'event.production.pruning': 'Pruning Operation',
    TR: 'Transplanting Operation',
    'event.production.transplanting': 'Transplanting Operation',
    CU: 'Cultivation',
    'event.production.cultivation/weed_control': 'Cultivation',
    TH: 'Thinning',
    'event.production.thinning': 'Thinning',
    EM: 'Equipment Maintenance',
    'event.production.equipment_maintenance': 'Equipment Maintenance',

    // Chemical
    FE: 'Fertilizer Application',
    'event.chemical.fertilizer': 'Fertilizer Application',
    PE: 'Pesticide Application',
    'event.chemical.pesticide': 'Pesticide Application',
    FU: 'Fungicide Application',
    'event.chemical.fungicide': 'Fungicide Application',
    HE: 'Herbicide Application',
    'event.chemical.herbicide': 'Herbicide Application',

    // Weather
    FR: 'Frost Event',
    'event.weather.frost': 'Frost Event',
    DR: 'Drought Monitoring',
    'event.weather.drought': 'Drought Monitoring',
    HL: 'Hail Damage Assessment',
    'event.weather.hailstorm': 'Hail Damage Assessment',
    HT: 'Heat Stress Monitoring',
    'event.weather.high_temperature': 'Heat Stress Monitoring',
    TS: 'Storm & Wind Event',
    'event.weather.tropical_storm': 'Storm & Wind Event',
    HW: 'High Winds Event',
    'event.weather.high_winds': 'High Winds Event',
    HH: 'High Humidity',
    'event.weather.high_humidity': 'High Humidity',
    LH: 'Low Humidity',
    'event.weather.low_humidity': 'Low Humidity',

    // Pest Management
    SC: 'Pest Scouting',
    'event.pest.scouting': 'Pest Scouting',
    BR: 'Beneficial Insect Release',
    'event.pest.beneficial_release': 'Beneficial Insect Release',
    TM: 'Trap Monitoring',
    'event.pest.trap_monitoring': 'Trap Monitoring',
    PI: 'Pest Identification',
    'event.pest.pest_identification': 'Pest Identification',
    TA: 'Threshold Assessment',
    'event.pest.threshold_assessment': 'Threshold Assessment',
    IP: 'IPM Implementation',
    'event.pest.ipm_implementation': 'IPM Implementation',

    // Soil
    ST: 'Soil Testing',
    'event.soil.soil_test': 'Soil Testing',
    PA: 'pH Adjustment',
    'event.soil.ph_adjustment': 'pH Adjustment',
    TI: 'Tillage',
    'event.soil.tillage': 'Tillage',
    SP: 'Soil Preparation',
    'event.soil.preparation': 'Soil Preparation',
    SA: 'Soil Amendment',
    'event.soil.amendment': 'Soil Amendment',
    // SM ("Soil Management") deleted 2026-08-29: a phantom subtype. It is absent from the
    // soil registry (ST/PA/OM/CC/TI/CO/GR/HD/NS/LA) and from SoilManagementEvent's
    // SOIL_TYPE_CHOICES in the backend, so no record could ever carry it — it existed only to
    // print family 5's own name as if it were a practice.

    // Business
    CE: 'Certification',
    'event.business.certification': 'Certification',
    CM: 'Compliance Review',
    CO: 'Compliance Review',
    'event.business.compliance': 'Compliance Review',
    IN: 'Business Inspection',
    BI: 'Business Inspection',
    'event.business.inspection': 'Business Inspection'
  };

  if (event.type && titleMap[event.type]) {
    return titleMap[event.type];
  }

  // 5. Fall back to i18n translation
  if (intl && event.type) {
    try {
      const translated = intl.formatMessage({ id: event.type });
      if (translated && translated !== event.type) {
        return translated;
      }
    } catch {
      // Ignore translation errors
    }
  }

  // 6. Category defaults
  const categoryDefaults: Record<number, string> = {
    0: 'Weather event',
    1: 'Farm Activity',
    2: 'Input application',
    4: 'Equipment work',
    5: 'Soil work',
    6: 'Pest & scouting',
    7: 'Certification & compliance'
  };

  return event.name || categoryDefaults[event.event_type] || 'Farm Activity';
}

/**
 * Post-process a getConsumerEventDescription() result into es-419 by exact
 * string match (CONSUMER_DESCRIPTION_ES). shortDescription is always static and
 * gets localized; most consumerImpact / sustainabilityBenefit are static too.
 * The ~36 DYNAMIC consumerImpact templates (area/pH/yield interpolated) have no
 * dict entry and pass through unchanged (English) until Stage 2 converts them to
 * ICU. Pass intl.locale; any non-"es" locale returns the input untouched.
 */
export function localizeConsumerDescription(
  data: EventDescriptionData,
  locale?: string
): EventDescriptionData {
  if (!locale || !locale.toLowerCase().startsWith('es')) return data;
  const tr = (s: string | undefined): string => (s && CONSUMER_DESCRIPTION_ES[s]) || s || '';
  return {
    ...data,
    // `title` is the biggest line on the consumer card and was the ONE localizable field this
    // function did not translate — so Spanish pages showed English headings ("Winter Manure
    // Application (Pre-Season)", "Pest Scouting") above fully translated body copy.
    //
    // CONSUMER_DESCRIPTION_ES already contained title translations ('Fertilizer application',
    // 'Soil Management Operation', 'Certification Achievement', …) and
    // eventDescriptions.consumerCopy.test.ts even asserted they exist — they were DEAD
    // ENTRIES the runtime never looked up, so the test passed while the page stayed English.
    //
    // Titles that are dynamically composed (e.g. `${typeInfo.title} - ${area} hectares`) can
    // never be dictionary keys; `tr` falls back to the input for those, which is the same
    // behaviour as before this line existed. Farmer-authored event names also fall through
    // untranslated, which is correct — we must not machine-translate a grower's own words.
    title: tr(data.title),
    description: tr(data.description),
    shortDescription: tr(data.shortDescription),
    consumerMessage: tr(data.consumerMessage),
    consumerImpact: tr(data.consumerImpact),
    sustainabilityBenefit: tr(data.sustainabilityBenefit)
  };
}

export default {
  eventDescriptions,
  getRealTransparencyDetails,
  getConsumerEventDescription,
  localizeConsumerDescription,
  getTimelineEventTitle,
  getEventCategory,
  getImpactLevel,
  formatEventDate,
  getSustainabilityImpact,
  getEventTrustIndicators
};
