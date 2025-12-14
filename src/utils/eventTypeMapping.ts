/**
 * Event Type Mapping Utility
 * Ensures consistent mapping of event names/types to backend carbon calculation types
 *
 * Backend expects these event types:
 * - 'chemical': Fertilizers, pesticides, herbicides (highest carbon impact)
 * - 'equipment': Heavy machinery, tractors, fuel consumption
 * - 'production': Irrigation, pruning, manual labor (lowest carbon impact)
 */

export interface EventTypeMapping {
  backendType: 'chemical' | 'equipment' | 'production';
  subType: string;
  carbonImpactLevel: 'high' | 'medium' | 'low';
}

/**
 * Maps frontend event types/names to backend carbon calculation types
 * This ensures accurate carbon calculations based on emission factors
 */
export function getEventTypeMapping(eventName: string): EventTypeMapping {
  const name = eventName.toLowerCase();

  // Chemical events - highest carbon impact
  if (
    name.includes('fertiliz') ||
    name.includes('pesticide') ||
    name.includes('herbicide') ||
    name.includes('fungicide') ||
    name.includes('chemical') ||
    name.includes('spray') ||
    name.includes('npk') ||
    name.includes('nitrogen') ||
    name.includes('phosphorus') ||
    name.includes('potassium')
  ) {
    return {
      backendType: 'chemical',
      subType: name.includes('fertiliz') ? 'FE' : 'PE', // FE=Fertilizer, PE=Pesticide
      carbonImpactLevel: 'high'
    };
  }

  // Equipment events - medium to high carbon impact
  // CRITICAL FIX (2025-01-21): Changed EQ → EM for Production event subtypes
  // Note: EQ (type 4) still exists for backward compatibility with standalone Equipment events
  if (
    name.includes('equipment') ||
    name.includes('tractor') ||
    name.includes('machinery') ||
    name.includes('harvest') ||
    name.includes('plowing') ||
    name.includes('tilling') ||
    name.includes('fuel') ||
    name.includes('diesel') ||
    name.includes('gasoline') ||
    name.includes('planting equipment')
  ) {
    return {
      backendType: 'equipment',
      subType: 'EM', // ✅ FIXED: Was EQ, now EM (Production subtype, event_type=1)
      carbonImpactLevel: 'medium'
    };
  }

  // Production events - low carbon impact (manual/biological operations)
  return {
    backendType: 'production',
    subType: name.includes('irrigation') ? 'IR' : 'OT', // IR=Irrigation, OT=Other
    carbonImpactLevel: 'low'
  };
}

/**
 * Get appropriate event data based on event type
 * Includes chemical-specific data for fertilizers and pesticides
 */
export function getEventDataForType(
  eventName: string,
  baseData: Record<string, any>
): Record<string, any> {
  const mapping = getEventTypeMapping(eventName);
  const name = eventName.toLowerCase();

  // Add type field
  const eventData = {
    ...baseData,
    type: mapping.subType
  };

  // Add chemical-specific data for fertilizers
  if (mapping.backendType === 'chemical' && name.includes('fertiliz')) {
    return {
      ...eventData,
      concentration: '10-10-10', // Standard NPK ratio
      volume: baseData.volume || baseData.amount || '100',
      volume_unit: 'liters',
      way_of_application: 'broadcast',
      commercial_name: baseData.name || 'NPK Fertilizer',
      applicationRate: baseData.applicationRate || 200, // kg/ha
      unit: baseData.unit || 'kg/ha'
    };
  }

  // Add chemical-specific data for pesticides/herbicides
  if (mapping.backendType === 'chemical' && !name.includes('fertiliz')) {
    return {
      ...eventData,
      concentration: '5%',
      volume: baseData.volume || baseData.amount || '10',
      volume_unit: 'liters',
      way_of_application: name.includes('herbicide') ? 'broadcast' : 'spray',
      commercial_name: baseData.name || 'Pesticide Application',
      applicationRate: baseData.applicationRate || 2, // L/ha
      unit: baseData.unit || 'L/ha'
    };
  }

  // Equipment events
  if (mapping.backendType === 'equipment') {
    return {
      ...eventData,
      fuel_type: 'diesel',
      fuel_consumption: baseData.fuel_consumption || '10', // L/ha
      equipment_name: baseData.equipment_name || 'Tractor'
    };
  }

  // Default production events
  return eventData;
}

/**
 * Estimates carbon impact based on event type
 * Returns kg CO2e per hectare
 */
export function estimateCarbonImpact(eventName: string): number {
  const mapping = getEventTypeMapping(eventName);
  const name = eventName.toLowerCase();

  // Chemical events have highest impact
  if (mapping.backendType === 'chemical') {
    if (name.includes('fertiliz')) {
      return 100; // 75-150 kg CO2e/ha for fertilizers
    }
    return 15; // 10-20 kg CO2e/ha for pesticides
  }

  // Equipment events have medium impact
  if (mapping.backendType === 'equipment') {
    if (name.includes('harvest')) {
      return 35; // 30-40 kg CO2e/ha for harvesting
    }
    return 25; // 20-30 kg CO2e/ha for general equipment use
  }

  // Production events have lowest impact
  if (name.includes('irrigation')) {
    return 0.018; // Very low for gravity-fed irrigation
  }

  return 0.01; // Minimal for manual operations
}
