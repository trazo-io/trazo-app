/**
 * Voice Data Mapper Utility
 *
 * Maps AI-extracted voice data to form field values compatible with
 * the quickEventFields.ts / TypeAwareFields pipeline.
 *
 * This replaces the hardcoded convertToEventStructure() that was in
 * VoiceEventCapture.tsx, integrating voice events into the standard
 * template-based form flow.
 */

import { getQuickEventFields, getDefaultFieldValues } from '../config/quickEventFields';

/** Structured amount from AI response */
export interface StructuredAmount {
  value: number;
  unit: string;
  category: 'weight' | 'volume' | 'area' | 'time' | string;
}

/** AI-parsed voice event data (from backend) */
export interface ParsedVoiceData {
  type: string;
  description: string;
  date: string;
  detected_amounts: Array<StructuredAmount | string>;
  detected_products: string[];
  detected_systems?: string[];
  confidence: number;
  npk_ratio?: string | null;
  concentration?: string | null;
  commercial_name?: string | null;
  application_method?: string | null;
  water_source?: string | null;
  area_covered?: { value: number; unit: string } | string | null;
  duration?: { value: number; unit: string } | string | null;
  fuel_amount?: { value: number; unit: string } | null;
  processing_time?: number;
  source?: string;
  original_transcript?: string;
}

/** Voice-to-template mapping result */
export interface VoiceTemplateMapping {
  templateId: string;
  backendEventType: number;
  backendSubtype: string;
  displayName: string;
}

/** Result from mapVoiceDataToFieldValues including which fields were AI-overridden */
export interface VoiceFieldMappingResult {
  values: Record<string, unknown>;
  overriddenFields: string[];
}

/** Summary of what was detected vs defaulted */
export interface VoiceSummary {
  detected: string[];
  defaulted: string[];
  transcript: string;
  confidence: number;
  eventType: string;
}

// ============================================================================
// TRANSCRIPT POST-PROCESSING
// ============================================================================

/**
 * Fix common speech-to-text transcription errors for agricultural terminology.
 * Applied before sending transcript to backend AI.
 */
export function postProcessTranscript(transcript: string): string {
  let processed = transcript;

  // Word numbers to digits (common in speech)
  const wordNumbers: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    thirteen: '13',
    fourteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    forty: '40',
    fifty: '50',
    sixty: '60'
  };

  // Fix NPK with word numbers: "NPK ten ten ten" → "NPK 10-10-10"
  processed = processed.replace(
    /\b(?:npk|n\.?p\.?k\.?)\s+(\w+)\s+(\w+)\s+(\w+)\b/gi,
    (match, n, p, k) => {
      const nVal = wordNumbers[n.toLowerCase()] || n;
      const pVal = wordNumbers[p.toLowerCase()] || p;
      const kVal = wordNumbers[k.toLowerCase()] || k;
      if (/^\d+$/.test(nVal) && /^\d+$/.test(pVal) && /^\d+$/.test(kVal)) {
        return `NPK ${nVal}-${pVal}-${kVal}`;
      }
      return match;
    }
  );

  // Fix "NPK 101010" → "NPK 10-10-10" (6 digits)
  processed = processed.replace(/\bNPK\s*(\d{2})(\d{2})(\d{2})\b/gi, 'NPK $1-$2-$3');

  // Fix "NPK 1010" → "NPK 10-10" (4 digits, likely missing last number)
  // But only if not already hyphenated
  processed = processed.replace(/\bNPK\s*(\d{2})(\d{2})\b(?!-)/gi, 'NPK $1-$2-$1');

  // Fix "NPK 10 10 10" → "NPK 10-10-10" (space-separated)
  processed = processed.replace(/\bNPK\s+(\d{1,2})\s+(\d{1,2})\s+(\d{1,2})\b/gi, 'NPK $1-$2-$3');

  // Fix "dash" spoken literally: "10 dash 10 dash 10" → "10-10-10"
  processed = processed.replace(/(\d+)\s*dash\s*(\d+)\s*dash\s*(\d+)/gi, '$1-$2-$3');

  return processed;
}

// ============================================================================
// VOICE TYPE TO TEMPLATE MAPPING
// ============================================================================

/** Maps AI-detected voice event types to quickEventFields template IDs */
const VOICE_TYPE_MAP: Record<string, VoiceTemplateMapping> = {
  fertilization: {
    templateId: 'fertilization',
    backendEventType: 2,
    backendSubtype: 'FE',
    displayName: 'Fertilizer Application'
  },
  fertilizer: {
    templateId: 'fertilization',
    backendEventType: 2,
    backendSubtype: 'FE',
    displayName: 'Fertilizer Application'
  },
  irrigation: {
    templateId: 'irrigation',
    backendEventType: 1,
    backendSubtype: 'IR',
    displayName: 'Irrigation'
  },
  pesticide: {
    templateId: 'pest_control',
    backendEventType: 2,
    backendSubtype: 'PE',
    displayName: 'Pesticide Application'
  },
  herbicide: {
    templateId: 'herbicide',
    backendEventType: 2,
    backendSubtype: 'HE',
    displayName: 'Herbicide Application'
  },
  fungicide: {
    templateId: 'fungicide',
    backendEventType: 2,
    backendSubtype: 'FU',
    displayName: 'Fungicide Application'
  },
  equipment: {
    templateId: 'cultivation',
    backendEventType: 1,
    backendSubtype: 'EM',
    displayName: 'Equipment Maintenance'
  },
  harvest: {
    templateId: 'harvest',
    backendEventType: 1,
    backendSubtype: 'HA',
    displayName: 'Harvest'
  },
  planting: {
    templateId: 'planting',
    backendEventType: 1,
    backendSubtype: 'PL',
    displayName: 'Planting'
  },
  pruning: {
    templateId: 'pruning',
    backendEventType: 1,
    backendSubtype: 'PR',
    displayName: 'Pruning'
  },
  transplanting: {
    templateId: 'transplanting',
    backendEventType: 1,
    backendSubtype: 'TR',
    displayName: 'Transplanting'
  },
  cultivation: {
    templateId: 'cultivation',
    backendEventType: 1,
    backendSubtype: 'CU',
    displayName: 'Cultivation'
  },
  thinning: {
    templateId: 'thinning',
    backendEventType: 1,
    backendSubtype: 'TH',
    displayName: 'Thinning'
  },
  soil_management: {
    templateId: 'cultivation',
    backendEventType: 5,
    backendSubtype: 'ST',
    displayName: 'Soil Management'
  },
  general: {
    templateId: 'general_documentation',
    backendEventType: 3,
    backendSubtype: '',
    displayName: 'General Activity'
  }
};

/**
 * Maps AI-detected voice type to a quickEventFields template ID.
 */
export function mapVoiceTypeToTemplate(voiceType: string): VoiceTemplateMapping {
  const normalized = voiceType.toLowerCase().trim();
  return VOICE_TYPE_MAP[normalized] || VOICE_TYPE_MAP['general'];
}

// ============================================================================
// AMOUNT EXTRACTION
// ============================================================================

/** Unit normalization mapping */
const UNIT_NORMALIZE: Record<string, string> = {
  pounds: 'lb',
  pound: 'lb',
  lbs: 'lb',
  lb: 'lb',
  kilograms: 'kg',
  kilogram: 'kg',
  kg: 'kg',
  tons: 'tons',
  ton: 'tons',
  gallons: 'gal',
  gallon: 'gal',
  gal: 'gal',
  liters: 'L',
  liter: 'L',
  litros: 'L',
  litro: 'L',
  hours: 'hours',
  hour: 'hours',
  hrs: 'hours',
  horas: 'hours',
  acres: 'acres',
  acre: 'acres',
  hectares: 'ha',
  hectare: 'ha',
  ha: 'ha',
  m2: 'm2'
};

/**
 * Parses detected amounts into structured data with proper categorization.
 */
export function extractStructuredAmounts(
  detectedAmounts: Array<StructuredAmount | string>
): StructuredAmount[] {
  return detectedAmounts
    .map((amount) => {
      // Already structured — still normalize units to match form dropdown values
      if (typeof amount !== 'string') {
        const normalizedUnit = UNIT_NORMALIZE[amount.unit?.toLowerCase()] || amount.unit;
        return { ...amount, unit: normalizedUnit };
      }

      // Parse string amounts like "200 pounds" or "2.5 hectares"
      const match = amount.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
      if (match) {
        const value = parseFloat(match[1]);
        const rawUnit = match[2].trim().toLowerCase();
        const unit = UNIT_NORMALIZE[rawUnit] || rawUnit;

        let category: string = 'unknown';
        if (['lb', 'kg', 'tons'].includes(unit)) category = 'weight';
        else if (['gal', 'L', 'mL'].includes(unit)) category = 'volume';
        else if (['acres', 'ha', 'm2', 'km2'].includes(unit)) category = 'area';
        else if (['hours', 'minutes'].includes(unit)) category = 'time';

        return { value, unit, category };
      }

      return { value: 0, unit: '', category: 'unknown' };
    })
    .filter((a) => a.value > 0);
}

// ============================================================================
// VOICE DATA TO FORM FIELD VALUES
// ============================================================================

/**
 * Maps AI-extracted voice data to form field values compatible with
 * the TypeAwareFields component and quickEventFields.ts schema.
 *
 * Merges AI-extracted values on top of template defaults.
 */
export function mapVoiceDataToFieldValues(
  parsedData: ParsedVoiceData,
  templateId: string
): VoiceFieldMappingResult {
  // Start with template defaults
  const defaults = getDefaultFieldValues(templateId);
  const overrides: Record<string, unknown> = {};

  const amounts = extractStructuredAmounts(parsedData.detected_amounts);
  const mapping = mapVoiceTypeToTemplate(parsedData.type);

  // ── Chemical events (fertilization, pest_control, herbicide, fungicide) ──
  if (['fertilization', 'pest_control', 'herbicide', 'fungicide'].includes(templateId)) {
    // Commercial name
    if (parsedData.commercial_name) {
      let cleanName = parsedData.commercial_name;
      // Clean raw transcript artifacts: "NPK with values fifteen nine twelve" → "NPK 15-9-12 Fertilizer"
      if (
        parsedData.npk_ratio &&
        /^NPK\b/i.test(cleanName) &&
        !cleanName.includes(parsedData.npk_ratio)
      ) {
        cleanName = `NPK ${parsedData.npk_ratio} Fertilizer`;
      }
      overrides.commercial_name = cleanName;
    } else if (parsedData.npk_ratio && templateId === 'fertilization') {
      overrides.commercial_name = `NPK ${parsedData.npk_ratio} Fertilizer`;
    } else if (parsedData.detected_products.length > 0) {
      let product = parsedData.detected_products[0];
      // Clean NPK-only product entries for fertilization: "NPK 15-9-12" → "NPK 15-9-12 Fertilizer"
      if (
        parsedData.npk_ratio &&
        templateId === 'fertilization' &&
        /^NPK\s*\d+-\d+-\d+$/i.test(product)
      ) {
        product = `NPK ${parsedData.npk_ratio} Fertilizer`;
      }
      overrides.commercial_name = product;
    }

    // Concentration / NPK ratio — only apply NPK for fertilization events
    if (parsedData.npk_ratio && templateId === 'fertilization') {
      overrides.concentration = parsedData.npk_ratio;
    } else if (parsedData.concentration) {
      overrides.concentration = parsedData.concentration;
    }

    // Application method
    if (parsedData.application_method) {
      overrides.application_method = parsedData.application_method;
    } else if (parsedData.detected_systems && parsedData.detected_systems.length > 0) {
      overrides.application_method = parsedData.detected_systems[0];
    }

    // Volume applied (weight or volume amounts)
    const volumeAmount = amounts.find((a) => a.category === 'weight' || a.category === 'volume');
    if (volumeAmount) {
      overrides.volume_applied = volumeAmount.value;
      overrides.volume_unit = volumeAmount.unit;
    }

    // Area treated
    const areaAmount = amounts.find((a) => a.category === 'area');
    if (areaAmount) {
      overrides.area_treated = areaAmount.value;
      overrides.area_unit = areaAmount.unit;
    } else if (parsedData.area_covered && typeof parsedData.area_covered === 'object') {
      overrides.area_treated = parsedData.area_covered.value;
      overrides.area_unit =
        UNIT_NORMALIZE[parsedData.area_covered.unit] || parsedData.area_covered.unit;
    }
  }

  // ── Production events (irrigation, harvest, planting, pruning, etc.) ──
  if (
    [
      'irrigation',
      'harvest',
      'planting',
      'pruning',
      'transplanting',
      'cultivation',
      'thinning',
      'equipment_maintenance'
    ].includes(templateId)
  ) {
    // Area covered
    const areaAmount = amounts.find((a) => a.category === 'area');
    if (areaAmount) {
      overrides.area_covered = areaAmount.value;
      overrides.area_unit = areaAmount.unit;
    } else if (parsedData.area_covered && typeof parsedData.area_covered === 'object') {
      overrides.area_covered = parsedData.area_covered.value;
      overrides.area_unit =
        UNIT_NORMALIZE[parsedData.area_covered.unit] || parsedData.area_covered.unit;
    }

    // Duration / equipment hours
    const timeAmount = amounts.find((a) => a.category === 'time');
    if (timeAmount) {
      overrides.equipment_hours = timeAmount.value;
    } else if (parsedData.duration && typeof parsedData.duration === 'object') {
      overrides.equipment_hours = parsedData.duration.value;
    }

    // Fuel — prefer explicit fuel_amount from AI (semantically correct)
    // Only fall back to guessing from generic volume for equipment-heavy events
    // where gallons/liters most likely means diesel/gasoline, not water or chemicals
    const fuelGuessAllowed = ['cultivation', 'equipment_maintenance'].includes(templateId);
    if (parsedData.fuel_amount && typeof parsedData.fuel_amount === 'object') {
      overrides.fuel_consumed = parsedData.fuel_amount.value;
      overrides.fuel_unit =
        UNIT_NORMALIZE[parsedData.fuel_amount.unit] || parsedData.fuel_amount.unit;
    } else if (fuelGuessAllowed) {
      const fuelAmount = amounts.find(
        (a) => a.category === 'volume' && ['gal', 'L'].includes(a.unit)
      );
      if (fuelAmount) {
        overrides.fuel_consumed = fuelAmount.value;
        overrides.fuel_unit = fuelAmount.unit;
      }
    }

    // Irrigation-specific
    if (templateId === 'irrigation') {
      if (parsedData.water_source) {
        overrides.water_source = parsedData.water_source;
      }
      if (parsedData.detected_systems && parsedData.detected_systems.length > 0) {
        const system = parsedData.detected_systems[0].toLowerCase();
        if (system.includes('drip')) overrides.irrigation_method = 'drip';
        else if (system.includes('sprinkler')) overrides.irrigation_method = 'sprinkler';
        else if (system.includes('flood')) overrides.irrigation_method = 'flood';
        else if (system.includes('furrow')) overrides.irrigation_method = 'furrow';
      }
      // Irrigation depth (e.g., "2 inches of water")
      const depthAmount = amounts.find((a) => a.category === 'depth');
      if (depthAmount) {
        overrides.irrigation_depth = depthAmount.value;
        if (depthAmount.unit === 'cm') overrides.irrigation_depth_unit = 'cm';
        else overrides.irrigation_depth_unit = 'inches';
      }
    }

    // Harvest-specific: yield
    if (templateId === 'harvest') {
      const weightAmount = amounts.find((a) => a.category === 'weight');
      if (weightAmount) {
        overrides.yield_quantity = weightAmount.value;
        overrides.yield_unit = weightAmount.unit;
      }
    }
  }

  // Merge: defaults < AI-extracted overrides
  return {
    values: { ...defaults, ...overrides },
    overriddenFields: Object.keys(overrides)
  };
}

// ============================================================================
// VOICE SUMMARY GENERATION
// ============================================================================

/**
 * Returns which fields were AI-detected vs which fell back to defaults.
 * Used for the UI banner showing what was understood.
 */
export function generateVoiceSummary(
  parsedData: ParsedVoiceData,
  mappingResult: VoiceFieldMappingResult,
  templateId: string
): VoiceSummary {
  const detected: string[] = [];
  const defaulted: string[] = [];
  const overriddenSet = new Set(mappingResult.overriddenFields);

  const config = getQuickEventFields(templateId);
  if (config) {
    for (const field of config.quickFields) {
      if (field.advanced) continue; // Skip advanced fields

      // Use the override list from the mapper — this correctly identifies
      // AI-detected fields even when the detected value happens to match
      // the default (e.g., user says "drip" and default is also "drip")
      if (overriddenSet.has(field.name)) {
        detected.push(field.name);
      } else if (field.default !== undefined) {
        defaulted.push(field.name);
      }
    }
  }

  const mapping = mapVoiceTypeToTemplate(parsedData.type);

  return {
    detected,
    defaulted,
    transcript: parsedData.original_transcript || parsedData.description,
    confidence: parsedData.confidence,
    eventType: mapping.displayName
  };
}
