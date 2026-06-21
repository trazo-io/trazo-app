/**
 * Soil Management Event Registry.
 *
 * 7 subtypes: ST(Soil Test), PA(pH Adjustment), OM(Organic Matter),
 * CC(Cover Crop), TI(Tillage), CO(Composting), GR(Grazing).
 *
 * GR (Grazing) has unique fields: animal_type, animal_count, grazing_duration_days.
 * TI (Tillage) has unique fields: working_depth, depth_unit.
 */

import type { EventRegistryEntry, FieldConfig, SoilManagementSubtype } from './registry';
import {
  formatArea,
  formatDurationDays,
  formatDurationHours,
  formatFuelConsumption,
  formatNumber,
  formatPercentage,
  makeUnitPairFormatter
} from './formatters';

// Temperature (°F) formatter — strips trailing zeros and appends unit.
// Used by NOP compost peak temperature (7 CFR 205.203(c)(1)) where the
// field label already says "(°F)" but users still need the unit near the value.
const formatTemperatureF = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const num = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  if (Number.isNaN(num)) return null;
  return `${num.toLocaleString(undefined, { maximumFractionDigits: 1 })} °F`;
};

type SoilData = Record<string, unknown>;

// Organic approval labels — acronyms must be properly capitalized (OMRI, USDA, NOP)
const ORGANIC_APPROVED_LABELS: Record<string, string> = {
  omri_listed: 'OMRI Listed',
  usda_nop_approved: 'USDA NOP Approved',
  organic_equivalent: 'Organic Equivalent',
  not_organic: 'Not Organic',
  transitional: 'Transitional',
  not_applicable: 'Not Applicable'
};

const formatOrganicApproved = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return ORGANIC_APPROVED_LABELS[v] ?? v;
};

// Weather conditions labels — shared with chemicalEvent.ts
const WEATHER_CONDITIONS_LABELS: Record<string, string> = {
  calm_dry: 'Calm & Dry',
  overcast_humid: 'Overcast & Humid',
  light_wind: 'Light Wind',
  humid: 'Humid',
  windy: 'Windy'
};

const formatWeatherConditions = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return WEATHER_CONDITIONS_LABELS[v] ?? v;
};

// Amendment type labels — match SoilManagementTab.jsx dropdown (sans chemical formula detail)
const AMENDMENT_TYPE_LABELS: Record<string, string> = {
  limestone: 'Limestone',
  dolomite: 'Dolomite',
  calcium_oxide: 'Quick Lime',
  calcium_hydroxide: 'Hydrated Lime',
  gypsum: 'Gypsum',
  compost: 'Compost',
  manure: 'Manure',
  other: 'Other Amendment'
};

const formatAmendmentType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return AMENDMENT_TYPE_LABELS[v] ?? v;
};

// Soil texture labels — match SoilManagementTab.jsx dropdown
const SOIL_TEXTURE_LABELS: Record<string, string> = {
  clay: 'Clay',
  clay_loam: 'Clay Loam',
  loam: 'Loam',
  sandy_loam: 'Sandy Loam',
  sand: 'Sand',
  silt: 'Silt',
  silt_loam: 'Silt Loam'
};

const formatSoilTexture = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return SOIL_TEXTURE_LABELS[v] ?? v;
};

// Soil moisture labels — form removed (Sprint 2 Epic 2.1.3) but modal still renders old data
const SOIL_MOISTURE_LABELS: Record<string, string> = {
  dry: 'Dry',
  moderate: 'Moderate',
  moist: 'Moist',
  wet: 'Wet'
};

const formatSoilMoisture = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return SOIL_MOISTURE_LABELS[v] ?? v;
};

// Animal type labels — match SoilManagementTab.jsx GR (Grazing) dropdown
const ANIMAL_TYPE_LABELS: Record<string, string> = {
  sheep: 'Sheep',
  goats: 'Goats',
  cattle: 'Cattle',
  poultry: 'Poultry',
  other: 'Other'
};

const formatAnimalType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return ANIMAL_TYPE_LABELS[v] ?? v;
};

// Grazing purpose labels — match SoilManagementTab.jsx GR dropdown
const GRAZING_PURPOSE_LABELS: Record<string, string> = {
  weed_control: 'Weed Control',
  cover_crop: 'Cover Crop Termination',
  soil_health: 'Soil Health',
  vegetation_management: 'Vegetation Management'
};

const formatGrazingPurpose = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return GRAZING_PURPOSE_LABELS[v] ?? v;
};

// Biodiversity / habitat labels (HD + NS subtypes) — match SoilManagementTab.jsx dropdowns and the
// backend HABITAT_TYPE_LABELS (audit_export_service.py). Facts only, no score.
const HABITAT_TYPE_LABELS: Record<string, string> = {
  // HD — Habitat Development
  hedgerow: 'Hedgerow',
  insectary_strip: 'Insectary / Beneficial-Insect Strip',
  native_planting: 'Native Planting',
  pollinator_habitat: 'Pollinator Habitat',
  field_border: 'Field Border',
  riparian_buffer: 'Riparian Buffer',
  living_groundcover_habitat: 'Living Groundcover Habitat',
  wildlife_corridor: 'Wildlife Corridor',
  // NS — Nesting / Shelter
  barn_owl_box: 'Barn-Owl Box',
  raptor_perch: 'Raptor Perch',
  songbird_box: 'Songbird Box',
  native_bee_block: 'Native-Bee Nest Block',
  bat_box: 'Bat Box',
  insect_hotel: 'Insect Hotel',
  beetle_bank: 'Beetle Bank',
  brush_pile_hibernacula: 'Brush Pile / Hibernacula'
};

const formatHabitatType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return HABITAT_TYPE_LABELS[v] ?? v;
};

// Raw manure harvest interval labels — match SoilManagementTab.jsx OM dropdown
// (7 CFR 205.203(c)(1)). Default enum resolver would render bare "120"/"90"/"Na"
// — we inject the NOP context so the consumer card + farmer modal stay readable.
const MANURE_HARVEST_INTERVAL_LABELS: Record<string, string> = {
  '120': '120 days (crop contacts soil)',
  '90': '90 days (crop elevated)',
  na: 'N/A (composted or none)'
};

const formatManureHarvestInterval = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return MANURE_HARVEST_INTERVAL_LABELS[v] ?? v;
};

// Compost method labels — match SoilManagementTab.jsx CO dropdown (7 CFR 205.203(c)(2)).
// Default split/capitalize mangles "in_vessel" → "In Vessel" (missing hyphen).
const COMPOST_METHOD_LABELS: Record<string, string> = {
  windrow: 'Windrow',
  static_aerated: 'Static Aerated Pile',
  in_vessel: 'In-Vessel'
};

const formatCompostMethod = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return COMPOST_METHOD_LABELS[v] ?? v;
};

const SOIL_SUBTYPE_LABELS: Record<string, string> = {
  ST: 'Soil Testing',
  PA: 'Soil Amendment',
  CC: 'Cover Crop Management',
  OM: 'Organic Matter Addition',
  TI: 'Tillage',
  CO: 'Composting Operation',
  GR: 'Grazing Management',
  HD: 'Habitat Development',
  NS: 'Nesting / Shelter Structures'
};

const formatSoilSubtype = (value: unknown, _event: SoilData): string => {
  const code = String(value ?? '');
  return SOIL_SUBTYPE_LABELS[code] || code;
};

const SOIL_FIELDS: readonly FieldConfig<unknown, SoilData>[] = [
  // ---- Core (ALL subtypes) ----
  {
    name: 'name',
    labelKey: 'events.soil.fields.name',
    valueType: 'string',
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      preview: 'hero',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'soil_management_type',
    labelKey: 'events.soil.fields.soilManagementType',
    valueType: 'enum',
    formatter: formatSoilSubtype,
    surfaces: {
      modal: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'area_covered',
    labelKey: 'events.common.fields.areaCovered',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },

  // ---- Soil properties (all subtypes — form shows these for any selected type) ----
  {
    name: 'soil_ph',
    labelKey: 'events.soil.fields.soilPh',
    valueType: 'number',
    formatter: formatNumber,
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'details',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'organic_matter_percentage',
    labelKey: 'events.soil.fields.organicMatterPercentage',
    valueType: 'number',
    formatter: formatPercentage,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'details'
    }
  },

  // ---- Amendment fields (PA, OM, CC, CO) ----
  {
    name: 'amendment_type',
    labelKey: 'events.soil.fields.amendmentType',
    valueType: 'enum',
    formatter: formatAmendmentType,
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'amendment_amount_numeric',
    labelKey: 'events.soil.fields.amendmentAmount',
    valueType: 'number',
    unitField: 'amendment_amount_unit',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    formatter: makeUnitPairFormatter('amendment_amount_unit'),
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'amendment_amount_unit',
    labelKey: 'events.soil.fields.amendmentAmountUnit',
    valueType: 'enum',
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: { form: 'immediate' }
  },

  // ---- NOP Compliance: Amendment organic approval (7 CFR 205.203(b)) ----
  {
    name: 'amendment_organic_approved',
    labelKey: 'events.soil.fields.amendmentOrganicApproved',
    valueType: 'enum',
    enumSource: 'organic_approved',
    formatter: formatOrganicApproved,
    visibleForSubtypes: ['PA', 'OM', 'CC', 'CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Compost temperature tracking (7 CFR 205.203(c)(2)) ----
  {
    name: 'compost_peak_temp_f',
    labelKey: 'events.soil.fields.compostPeakTemp',
    placeholderKey: 'events.soil.fields.compostPeakTempPlaceholder',
    valueType: 'number',
    formatter: formatTemperatureF,
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_duration_days_at_temp',
    labelKey: 'events.soil.fields.compostDurationDays',
    placeholderKey: 'events.soil.fields.compostDurationDaysPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_turning_count',
    labelKey: 'events.soil.fields.compostTurningCount',
    placeholderKey: 'events.soil.fields.compostTurningCountPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_method',
    labelKey: 'events.soil.fields.compostMethod',
    valueType: 'enum',
    enumSource: 'compost_methods',
    formatter: formatCompostMethod,
    visibleForSubtypes: ['CO'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'compost_initial_cn_ratio',
    labelKey: 'events.soil.fields.compostInitialCnRatio',
    placeholderKey: 'events.soil.fields.compostInitialCnRatioPlaceholder',
    valueType: 'number',
    visibleForSubtypes: ['CO'],
    formatter: formatNumber,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Raw manure harvest interval (7 CFR 205.203(c)(1)) ----
  {
    name: 'manure_harvest_interval',
    labelKey: 'events.soil.fields.manureHarvestInterval',
    valueType: 'enum',
    enumSource: 'manure_harvest_intervals',
    formatter: formatManureHarvestInterval,
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'manure_application_date',
    labelKey: 'events.soil.fields.manureApplicationDate',
    valueType: 'date',
    visibleForSubtypes: ['OM'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- Working depth (all except GR — grazing has no depth concept) ----
  {
    name: 'working_depth',
    labelKey: 'events.soil.fields.workingDepth',
    valueType: 'number',
    unitField: 'depth_unit',
    formatter: makeUnitPairFormatter('depth_unit'),
    visibleForSubtypes: ['TI', 'ST', 'CC', 'PA', 'OM', 'CO'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'details'
    }
  },
  {
    name: 'soil_texture',
    labelKey: 'events.soil.fields.soilTexture',
    valueType: 'enum',
    formatter: formatSoilTexture,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'soil_moisture',
    labelKey: 'events.soil.fields.soilMoisture',
    valueType: 'enum',
    formatter: formatSoilMoisture,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- Grazing (GR) ----
  {
    name: 'animal_type',
    labelKey: 'events.soil.fields.animalType',
    valueType: 'enum',
    formatter: formatAnimalType,
    visibleForSubtypes: ['GR'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'animal_count',
    labelKey: 'events.soil.fields.animalCount',
    valueType: 'number',
    visibleForSubtypes: ['GR'],
    formatter: formatNumber,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'grazing_duration_days',
    labelKey: 'events.soil.fields.grazingDuration',
    valueType: 'number',
    visibleForSubtypes: ['GR'],
    formatter: formatDurationDays,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'grazing_purpose',
    labelKey: 'events.soil.fields.grazingPurpose',
    valueType: 'enum',
    formatter: formatGrazingPurpose,
    visibleForSubtypes: ['GR'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- Biodiversity / Habitat (HD = developed habitat, NS = nesting/shelter) ----
  // Facts only — never a biodiversity score. The living-floor / bugs / birds proof rides on photos.
  {
    name: 'habitat_type',
    labelKey: 'events.soil.fields.habitatType',
    valueType: 'enum',
    formatter: formatHabitatType,
    visibleForSubtypes: ['HD', 'NS'],
    surfaces: {
      timeline: 'immediate',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'habitat_structure_count',
    labelKey: 'events.soil.fields.habitatStructureCount',
    valueType: 'number',
    formatter: formatNumber,
    visibleForSubtypes: ['NS'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // habitat maturity — an established hedgerow / long-standing owl box is a stronger signal, so
    // "Established 2019" belongs in Key Details (immediate), not the collapsed Additional section.
    name: 'habitat_install_date',
    labelKey: 'events.soil.fields.habitatInstallDate',
    valueType: 'string',
    visibleForSubtypes: ['HD', 'NS'],
    formatter: (v) => {
      if (typeof v !== 'string' || !v) return null;
      // date-only ("YYYY-MM-DD") must parse as LOCAL — `new Date("YYYY-MM-DD")` is UTC midnight,
      // which renders as the PREVIOUS month in negative-offset zones (e.g. "2020-01-01" -> "Dec 2019").
      const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
      const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(v);
      if (isNaN(d.getTime())) return v;
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    },
    surfaces: {
      modal: 'immediate',
      form: 'secondary',
      consumer_card: 'immediate',
      consumer_timeline: 'secondary'
    }
  },
  {
    name: 'species_planted',
    labelKey: 'events.soil.fields.speciesPlanted',
    valueType: 'string',
    visibleForSubtypes: ['HD'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'structure_notes',
    labelKey: 'events.soil.fields.structureNotes',
    valueType: 'string',
    visibleForSubtypes: ['NS'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'wildlife_observed',
    labelKey: 'events.soil.fields.wildlifeObserved',
    valueType: 'string',
    visibleForSubtypes: ['HD', 'NS'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Carbon/fuel (ALL subtypes, carbon-relevant) ----
  {
    name: 'fuel_consumed',
    labelKey: 'events.common.fields.fuelConsumed',
    valueType: 'number',
    unitField: 'fuel_unit',
    formatter: formatFuelConsumption,
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'fuel_type',
    labelKey: 'events.common.fields.fuelType',
    valueType: 'enum',
    enumSource: 'fuel_types',
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'equipment_hours',
    labelKey: 'events.common.fields.equipmentHours',
    valueType: 'number',
    formatter: formatDurationHours,
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'carbon_sequestration_potential',
    labelKey: 'events.soil.fields.carbonSequestration',
    valueType: 'number',
    carbonRelevant: true,
    formatter: formatNumber,
    surfaces: {
      modal: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- Context ----
  {
    name: 'weather_conditions',
    labelKey: 'events.common.fields.weatherConditions',
    valueType: 'enum',
    formatter: formatWeatherConditions,
    surfaces: { modal: 'details', form: 'secondary', consumer_card: 'details' }
  },
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'details',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    surfaces: { modal: 'details', form: 'details', consumer_card: 'details' }
  },
  {
    name: 'production_efficiency',
    labelKey: 'events.common.fields.productionEfficiency',
    valueType: 'enum',
    enumSource: 'production_efficiency',
    surfaces: { modal: 'details', form: 'secondary', consumer_card: 'details' }
  },
  {
    name: 'equipment_used',
    labelKey: 'events.common.fields.equipmentUsed',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- NOP Audit Traceability Fields ----
  {
    name: 'block_id',
    labelKey: 'fieldDetails.blockId',
    valueType: 'string',
    surfaces: {
      modal: 'details',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'variety',
    labelKey: 'fieldDetails.variety',
    valueType: 'string',
    surfaces: {
      modal: 'details',
      form: 'secondary',
      consumer_card: 'details'
    }
  }
];

export const soilEventRegistry: EventRegistryEntry<SoilManagementSubtype, SoilData> = {
  eventType: 5,
  eventTypeName: 'soil_management',
  labelKey: 'events.types.soilManagement',
  subtypes: [
    { code: 'ST', labelKey: 'events.soil.subtypes.soilTest', photoTier: 'recommended' },
    { code: 'PA', labelKey: 'events.soil.subtypes.phAdjustment', photoTier: 'optional' },
    { code: 'OM', labelKey: 'events.soil.subtypes.organicMatter', photoTier: 'recommended' },
    { code: 'CC', labelKey: 'events.soil.subtypes.coverCrop', photoTier: 'essential' },
    { code: 'TI', labelKey: 'events.soil.subtypes.tillage', photoTier: 'optional' },
    { code: 'CO', labelKey: 'events.soil.subtypes.composting', photoTier: 'recommended' },
    { code: 'GR', labelKey: 'events.soil.subtypes.grazing', photoTier: 'recommended' }
  ],
  defaultPhotoTier: 'optional',
  fields: SOIL_FIELDS
};
