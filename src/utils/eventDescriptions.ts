// Event descriptions and transparency details for consumer-facing displays

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
  'fertilizer application': 'Applied nutrients to support healthy plant growth and soil fertility',
  'pesticide application': 'Applied natural pest control to protect plants from harmful insects',
  'fungicide application': 'Applied disease prevention treatment to protect plants from fungal infections',
  'herbicide application': 'Applied weed control to manage competing vegetation and protect crop health',
  'chemical application': 'Applied agricultural treatment as part of integrated crop management program',
  'irrigation': 'Provided water to ensure optimal plant growth and health',
  'planting': 'Planted seeds or seedlings to establish the crop',
  'harvesting': 'Harvested mature crops at optimal quality and freshness',
  'soil preparation': 'Prepared soil for optimal growing conditions',
  'weather monitoring': 'Monitored weather conditions to inform farming decisions',
  'equipment maintenance': 'Maintained farming equipment for efficient operations',
  'pest monitoring': 'Monitored for pests to inform protection strategies',
  'default': 'Completed agricultural activity as part of sustainable farming practices'
};

/**
 * Get real transparency details from actual event data based on the production API
 */
export function getRealTransparencyDetails(event: any): string {
  const details: string[] = [];
  
  // DEBUG: Log the event data to understand what we're receiving
  console.log('🔧 getRealTransparencyDetails called with event:', {
    id: event?.id,
    type: event?.type,
    event_type: event?.event_type,
    equipment: event?.equipment,
    volume: event?.volume,
    area: event?.area,
    area_covered: event?.area_covered,
    area_unit: event?.area_unit,
    yield_quantity: event?.yield_quantity,
    yield_unit: event?.yield_unit,
    fuel_consumed: event?.fuel_consumed,
    fuel_unit: event?.fuel_unit,
    equipment_hours: event?.equipment_hours,
    concentration: event?.concentration,
    npk_ratio: event?.npk_ratio,
    active_ingredient: event?.active_ingredient,
    application_method: event?.application_method,
    target_pest_disease_need: event?.target_pest_disease_need,
    weather_conditions: event?.weather_conditions,
    application_timing: event?.application_timing
  });
  
  // Handle production events (event_type: 1) differently
  if (event.event_type === 1) {
    // Area covered - most important for transparency
    if (event.area_covered && event.area_covered > 0) {
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : (event.area_unit || 'hectares');
      details.push(`Area: ${event.area_covered} ${areaUnit}`);
    }
    
    // Quantity for planting/harvesting
    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity = quantity >= 1000 
        ? `${(quantity / 1000).toFixed(0)}K` 
        : quantity.toLocaleString();
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
  
  // Volume with proper units from backend
  if (event.volume && String(event.volume).trim() && String(event.volume).trim() !== 'null') {
    // Always default to 'L' for volume display since chemical applications are typically in liters
    const volumeUnit = event.volume_unit || 'L';
    details.push(`Applied: ${event.volume} ${volumeUnit}`);
  }
  
  // Area
  if (event.area && String(event.area).trim() && String(event.area).trim() !== 'null') {
    details.push(`Area: ${event.area} hectares`);
  }
  
  // Concentration
  if (event.concentration && String(event.concentration).trim() && String(event.concentration).trim() !== 'null') {
    const concentration = String(event.concentration).trim();
    // Handle if concentration already includes % or not
    const displayConcentration = concentration.includes('%') ? concentration : `${concentration}%`;
    details.push(`Concentration: ${displayConcentration}`);
  }
  
  // NPK Ratio for fertilizers - from multiple sources
  if (event.npk_ratio && String(event.npk_ratio).trim() && String(event.npk_ratio).trim() !== 'null') {
    details.push(`NPK: ${event.npk_ratio}`);
  } else if (event.extra_data?.carbon_calculation?.breakdown?.npk_content) {
    // Extract NPK from extra_data carbon calculation
    const npk = event.extra_data.carbon_calculation.breakdown.npk_content;
    if (npk.N !== undefined && npk.P !== undefined && npk.K !== undefined) {
      details.push(`NPK: ${npk.N}-${npk.P}-${npk.K}`);
    }
  }
  
  // Active ingredient information
  if (event.active_ingredient && String(event.active_ingredient).trim() && String(event.active_ingredient).trim() !== 'null') {
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
      'spray': 'Spray application',
      'foliar': 'Foliar spray treatment',
      'drip': 'Drip irrigation',
      'broadcast': 'Broadcast application',
      'injection': 'Soil injection'
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
  if (event.weather_conditions && String(event.weather_conditions).trim() && event.weather_conditions !== 'Select conditions...') {
    details.push(`Weather: ${event.weather_conditions}`);
  }
  
  // Application timing - from multiple sources
  if (event.application_timing && String(event.application_timing).trim() && event.application_timing !== 'Select timing...') {
    details.push(`Timing: ${event.application_timing}`);
  } else if (event.time_period && String(event.time_period).trim() && event.time_period !== 'Select timing...') {
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
    if (breakdown.fertilizer_mass_kg && breakdown.fertilizer_mass_kg > 0 && breakdown.volume_applied_liters) {
      const massPerLiter = breakdown.fertilizer_mass_kg / breakdown.volume_applied_liters;
      if (massPerLiter > 1.2) { // If significantly denser than water
        details.push(`Total mass: ${breakdown.fertilizer_mass_kg.toFixed(1)}kg`);
      }
    }
  }
  
  // Photo verification - handle both old album and new albums structure
  let photoCount = 0;
  if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    // New albums array structure
    photoCount = event.albums.reduce((total: number, album: any) => total + (album.images?.length || 0), 0);
  } else if (event.album?.images?.length > 0) {
    // Legacy album structure
    photoCount = event.album.images.length;
  }
  
  if (photoCount > 0) {
    details.push(`${photoCount} photo${photoCount > 1 ? 's' : ''} documented`);
  }
  
  if (details.length > 0) {
    const result = ` - ${details.join(', ')}`;
    console.log('🔧 getRealTransparencyDetails returning:', result);
    return result;
  }
  
  console.log('🔧 getRealTransparencyDetails returning empty (no details)');
  return '';
}

/**
 * Get consumer-friendly description for an event with real data integration
 * This function handles the mapping from raw event data to consumer-facing descriptions
 */
export function getConsumerEventDescription(eventDescription: string, event?: any): EventDescriptionData {
  const lowerDesc = eventDescription.toLowerCase();
  
  // DEBUG: Log to understand the data structure
  console.log('🔧 getConsumerEventDescription called with:', {
    eventDescription,
    event_id: event?.id,
    event_type: event?.type,
    equipment: event?.equipment,
    description: event?.description
  });
  
  // For production events (event_type: 1), create specific descriptions based on production data
  if (event && (event.event_type === 1 || event.type?.includes('production'))) {
    console.log('🔧 Production event detected:', event);
    
    // Determine production type
    let productionType = 'Agricultural Activity';
    let icon = '🌱';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
    
    // Map production type to consumer-friendly titles
    const typeMap: Record<string, { title: string; icon: string; description: string }> = {
      'event.production.planting': {
        title: 'Planting Operation',
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      'planting': {
        title: 'Planting Operation', 
        icon: '🌱',
        description: 'Seeds planted to establish healthy crop growth'
      },
      'PL': {
        title: 'Planting Operation',
        icon: '🌱', 
        description: 'Seeds planted to establish healthy crop growth'
      },
      'production.general': {
        title: 'General Farm Operation',
        icon: '🚜',
        description: 'General agricultural activity completed as part of farm operations'
      },
      'production': {
        title: 'Farm Operation',
        icon: '🚜',
        description: 'Agricultural activity completed as part of sustainable farming'
      },
      'production.planting': {
        title: 'Planting Operation',
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
      'harvesting': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      'HA': {
        title: 'Harvest Operation',
        icon: '🌾',
        description: 'Crops harvested at optimal ripeness and quality'
      },
      'event.production.irrigation': {
        title: 'Irrigation',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      'irrigation': {
        title: 'Irrigation',
        icon: '💧', 
        description: 'Water applied to support healthy plant growth'
      },
      'IR': {
        title: 'Irrigation',
        icon: '💧',
        description: 'Water applied to support healthy plant growth'
      },
      'event.production.pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      'pruning': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      },
      'PR': {
        title: 'Pruning Operation',
        icon: '✂️',
        description: 'Plants pruned to optimize growth and fruit quality'
      }
    };
    
    // Get production type from event data
    const eventType = event.production_type || event.type || 'Agricultural Activity';
    const typeInfo = typeMap[eventType] || {
      title: 'Agricultural Activity',
      icon: '🌱',
      description: 'Agricultural practice completed as part of sustainable farming'
    };
    
    productionType = typeInfo.title;
    icon = typeInfo.icon;
    
    // Build transparency details from production data
    const productionDetails: string[] = [];
    
    if (event.area_covered && event.area_covered > 0) {
      const areaUnit = event.area_unit === 'ha' ? 'hectares' : (event.area_unit || 'hectares');
      productionDetails.push(`${event.area_covered} ${areaUnit}`);
    }
    
    if (event.yield_quantity && event.yield_quantity > 0) {
      const unit = event.yield_unit || 'units';
      const quantity = parseFloat(event.yield_quantity);
      const formattedQuantity = quantity >= 1000 
        ? `${(quantity / 1000).toFixed(0)}K` 
        : quantity.toLocaleString();
      productionDetails.push(`${formattedQuantity} ${unit}`);
    }
    
    if (event.fuel_consumed && event.fuel_consumed > 0) {
      const fuelUnit = event.fuel_unit || 'L';
      productionDetails.push(`${event.fuel_consumed} ${fuelUnit} fuel used`);
    }
    
    if (event.equipment_hours && event.equipment_hours > 0) {
      productionDetails.push(`${event.equipment_hours} hours equipment operation`);
    }
    
    // Create detailed description
    const detailsText = productionDetails.length > 0 
      ? ` (${productionDetails.join(' • ')})` 
      : '';
    
    const fullDescription = typeInfo.description + detailsText;
    
    // Consumer impact and sustainability messages
    let consumerImpact = 'This agricultural practice follows sustainable farming methods to ensure high-quality food production.';
    let sustainabilityBenefit = 'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.';
    
    if (eventType.includes('planting')) {
      consumerImpact = 'Professional planting operation ensures proper crop establishment for healthy growth and optimal harvest quality.';
      sustainabilityBenefit = 'Precision planting practices optimize resource use and support sustainable crop production.';
    } else if (eventType.includes('harvest')) {
      consumerImpact = 'Crops harvested at peak ripeness to ensure maximum quality, freshness, and nutritional value.';
      sustainabilityBenefit = 'Optimal timing of harvest reduces food waste and ensures the best quality produce reaches consumers.';
    } else if (eventType.includes('irrigation')) {
      consumerImpact = 'Targeted irrigation provides optimal water levels for healthy plant growth and fruit development.';
      sustainabilityBenefit = 'Precision irrigation conserves water resources while maintaining optimal growing conditions.';
    } else if (eventType.includes('pruning')) {
      consumerImpact = 'Strategic pruning improves plant health, air circulation, and fruit quality for better produce.';
      sustainabilityBenefit = 'Proper pruning reduces disease pressure and optimizes plant productivity naturally.';
    }
    
    return {
      title: productionType,
      description: fullDescription,
      shortDescription: typeInfo.description,
      icon,
      impact: impactLevel,
      consumerMessage: 'Sustainable agricultural practice following industry best practices',
      consumerImpact,
      sustainabilityBenefit
    };
  }
  
  // For chemical events, create specific descriptions based on the product used
  if (event && (event.event_type === 2 || event.type === 'chemical' || event.type?.includes('chemical')) && (event.commercial_name || event.equipment)) {
    const productName = event.commercial_name || event.equipment;
    
    console.log('🔧 Chemical event detected with product:', productName);
    
    // Determine chemical type based on product name
    let chemicalType = 'chemical application';
    let impactLevel: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM';
    let icon = '🧪';
    
    // Fertilizer products - including Miracle-Gro
    if (productName.toLowerCase().includes('fertilizer') || 
        productName.toLowerCase().includes('miracle-gro') ||
        productName.toLowerCase().includes('nutrient') ||
        productName.toLowerCase().includes('plant food') ||
        productName.toLowerCase().includes('citrus') ||
        (event.npk_ratio && event.npk_ratio !== '')) {
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
    else if (productName.toLowerCase().includes('roundup') || productName.toLowerCase().includes('glyphosate')) {
      chemicalType = 'herbicide application';
      icon = '🌾';
      impactLevel = 'MEDIUM';
    }
    
    const baseDescription = eventDescriptions[chemicalType] || eventDescriptions['chemical application'];
    const realDetails = getRealTransparencyDetails(event);
    
    // Create consumer impact and sustainability benefit messages based on product type
    let consumerImpact = 'This professional agricultural treatment follows industry best practices to ensure food safety and quality.';
    let sustainabilityBenefit = 'Part of integrated farming approach that balances productivity with environmental responsibility.';

    if (chemicalType === 'fertilizer application') {
      consumerImpact = 'Targeted fertilizer application provides essential nutrients for healthy plant growth and optimal fruit quality.';
      sustainabilityBenefit = 'Precision nutrient management reduces waste and environmental impact while ensuring healthy crops.';
    } else if (productName.toLowerCase().includes('neem')) {
      consumerImpact = 'Organic neem oil provides natural pest protection without synthetic chemicals, supporting healthier food production.';
      sustainabilityBenefit = 'Natural pest control reduces reliance on synthetic pesticides, promoting biodiversity and soil health.';
    } else if (productName.toLowerCase().includes('copper')) {
      consumerImpact = 'Copper fungicide prevents plant diseases that could affect crop quality and yield, ensuring healthy produce.';
      sustainabilityBenefit = 'Disease prevention reduces crop losses and food waste, contributing to more efficient resource use.';
    } else if (productName.toLowerCase().includes('roundup')) {
      consumerImpact = 'Herbicide application controls weeds that compete with crops for nutrients and water, improving harvest quality.';
      sustainabilityBenefit = 'Targeted weed management reduces the need for tillage, helping preserve soil structure and reduce erosion.';
    }

    // Enhance title with active ingredient if available
    let enhancedTitle = productName;
    if (event.active_ingredient && String(event.active_ingredient).trim() && String(event.active_ingredient).trim() !== 'null') {
      enhancedTitle = `${productName} (${event.active_ingredient})`;
    }

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
    // Priority 2: Backend-provided equipment name
    else if (event.equipment) {
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
    consumerMessage: 'Sustainable farming practice following industry best practices',
    consumerImpact: 'This farming practice contributes to sustainable agriculture and food quality.',
    sustainabilityBenefit: 'Part of responsible farming practices that support environmental stewardship and long-term agricultural sustainability.'
  };
}

/**
 * Map event types to consumer-friendly categories
 */
export function getEventCategory(eventType: string): string {
  const categoryMap: Record<string, string> = {
    'fertilizer': 'Soil Nutrition',
    'pesticide': 'Plant Protection',
    'fungicide': 'Disease Prevention',
    'herbicide': 'Weed Management',
    'chemical': 'Crop Treatment',
    'irrigation': 'Water Management',
    'planting': 'Crop Establishment',
    'harvesting': 'Harvest Operations',
    'equipment': 'Farm Operations',
    'weather': 'Environmental Monitoring',
    'soil': 'Soil Management',
    'pest': 'Pest Management',
    'business': 'Farm Management',
    'general': 'Farm Operations'
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
    const productName = event.equipment?.toLowerCase() || '';
    
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
 * Get sustainability impact level for an event
 */
export function getSustainabilityImpact(description: string): 'high' | 'medium' | 'low' {
  const lowerDesc = description.toLowerCase();
  
  // High impact: organic, natural methods
  if (lowerDesc.includes('organic') || lowerDesc.includes('neem') || lowerDesc.includes('natural')) {
    return 'high';
  }
  
  // Medium impact: targeted treatments, disease prevention
  if (lowerDesc.includes('disease') || lowerDesc.includes('targeted') || lowerDesc.includes('integrated')) {
    return 'medium';
  }
  
  // Default to low for chemical treatments
  return 'low';
}

/**
 * Get trust indicators for an event
 */
export function getEventTrustIndicators(event: any): string[] {
  const indicators: string[] = [];
  
  // Farm verified
  if (event.certified) {
    indicators.push('Farm Verified');
  }
  
  // Photo documented - handle both old album and new albums structure
  let hasPhotos = false;
  if (event.albums && Array.isArray(event.albums) && event.albums.length > 0) {
    hasPhotos = event.albums.some((album: any) => album.images && album.images.length > 0);
  } else if (event.album?.images?.length > 0) {
    hasPhotos = true;
  }
  
  if (hasPhotos) {
    indicators.push('Photo Documented');
  }
  
  // USDA verified
  if (event.usda_verified) {
    indicators.push('USDA Standards');
  }
  
  // Modern farming practices (based on product types)
  if (event.equipment) {
    const equipment = event.equipment.toLowerCase();
    if (equipment.includes('professional') || equipment.includes('precision') || equipment.includes('modern')) {
      indicators.push('Modern Farming');
    }
    if (equipment.includes('organic') || equipment.includes('natural') || equipment.includes('neem')) {
      indicators.push('Natural Methods');
    }
  }
  
  return indicators;
}

export default {
  eventDescriptions,
  getRealTransparencyDetails,
  getConsumerEventDescription,
  getEventCategory,
  getImpactLevel,
  formatEventDate,
  getSustainabilityImpact,
  getEventTrustIndicators
};