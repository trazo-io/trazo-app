/**
 * Chemical Event Registry.
 *
 * The most complex event type in Trazo (45+ fields, 4 subtypes, EPA WPS
 * compliance, NOP 7 CFR 205.103 input traceability, NPK grouping).
 *
 * Subtypes:
 * - FE (Fertilizer): NPK fields, is_fertigation, concentration in N-P-K format
 * - PE (Pesticide): target_pest_disease, EPA RUP fields, REI/PHI
 * - FU (Fungicide): target_pest_disease, application_timing
 * - HE (Herbicide): target_pest_disease, simpler compliance
 *
 * Subtype-conditional visibility patterns used here:
 * 1. Simple subtype gate: visibleForSubtypes: ['FE']
 * 2. Multi-subtype gate: visibleForSubtypes: ['PE', 'FU', 'HE']
 *
 * Conditional `required` (not visibility) is used for EPA WPS compliance:
 *   required: (e) => e.restricted_use_pesticide === true — applicator_certification
 *   only becomes mandatory when the product is a Restricted Use Pesticide (40 CFR 170.309).
 *   Visibility is unconditional so organic/biological applications can still
 *   document applicator credentials for NOP 7 CFR 205.103 traceability.
 *
 * Backend: ChemicalEvent (history/models.py:732-988)
 * Serializer: ChemicalEventSerializer (history/serializers.py:684-859)
 * Generated types: components['schemas']['ChemicalEvent'] (api.generated.ts)
 */

import type { ChemicalSubtype, EventRegistryEntry, FieldConfig, SubtypeEntry } from './registry';
import {
  defaultFormatter,
  formatBoolean,
  formatDate,
  formatDurationDays,
  formatDurationHours,
  formatNPK,
  formatPercentage,
  makeUnitPairFormatter
} from './formatters';

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

// Weather conditions labels — match ChemicalTab-ENHANCED.jsx dropdown labels (sans emoji/description)
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

// Application timing labels — match ChemicalTab-ENHANCED.jsx dropdown labels (sans emoji)
const APPLICATION_TIMING_LABELS: Record<string, string> = {
  dormant: 'Dormant Season',
  pre_plant: 'Pre-Planting',
  post_emergence: 'Post-Emergence',
  flowering: 'Flowering Stage',
  fruit_development: 'Fruit Development',
  harvest: 'Pre-Harvest',
  post_harvest: 'Post-Harvest'
};

const formatApplicationTiming = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return APPLICATION_TIMING_LABELS[v] ?? v;
};

// ============================================================================
// Subtypes
// ============================================================================

const CHEMICAL_SUBTYPES: readonly SubtypeEntry<ChemicalSubtype>[] = [
  { code: 'FE', labelKey: 'events.chemical.subtypes.fertilizer', photoTier: 'essential' },
  { code: 'PE', labelKey: 'events.chemical.subtypes.pesticide', photoTier: 'essential' },
  { code: 'FU', labelKey: 'events.chemical.subtypes.fungicide', photoTier: 'essential' },
  { code: 'HE', labelKey: 'events.chemical.subtypes.herbicide', photoTier: 'essential' }
] as const;

// ============================================================================
// Formatter instances
// ============================================================================

const formatVolumeApplied = makeUnitPairFormatter('volume_unit');
const formatAreaTreated = makeUnitPairFormatter('area_unit');
const formatAppFuel = makeUnitPairFormatter('application_fuel_unit');

// ============================================================================
// Field configurations
// ============================================================================

// Common event data object type for predicates
type ChemicalEventData = Record<string, unknown>;

const CHEMICAL_FIELDS: readonly FieldConfig<unknown, ChemicalEventData>[] = [
  // ---- Core identity (ALL subtypes) ----
  {
    name: 'commercial_name',
    labelKey: 'events.chemical.fields.commercialName',
    valueType: 'string',
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'hero',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'chemical_subtype',
    labelKey: 'events.chemical.fields.chemicalSubtype',
    valueType: 'enum',
    enumSource: 'chemical_subtypes_by_main_type',
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'active_ingredient',
    labelKey: 'events.chemical.fields.activeIngredient',
    valueType: 'string',
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- Volume & Area (ALL subtypes) ----
  {
    name: 'volume_applied',
    labelKey: 'events.chemical.fields.volumeApplied',
    valueType: 'number',
    unitField: 'volume_unit',
    formatter: formatVolumeApplied,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'area_treated',
    labelKey: 'events.chemical.fields.areaTreated',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatAreaTreated,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    name: 'application_method',
    labelKey: 'events.chemical.fields.applicationMethod',
    valueType: 'enum',
    enumSource: 'application_methods',
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'concentration',
    labelKey: 'events.chemical.fields.concentration',
    valueType: 'string',
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      consumer_card: 'details'
    }
  },

  // ---- NPK fields (FE Fertilizer only) — Pattern 1: Simple subtype gate ----
  {
    name: 'nitrogen_percentage',
    labelKey: 'events.chemical.fields.npkRatio',
    valueType: 'number',
    visibleForSubtypes: ['FE'],
    groupWith: ['phosphorus_percentage', 'potassium_percentage'],
    formatter: formatNPK,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'phosphorus_percentage',
    labelKey: 'events.chemical.fields.phosphorus',
    valueType: 'number',
    visibleForSubtypes: ['FE'],
    // Hidden individually — rendered via nitrogen_percentage groupWith
    surfaces: { form: 'immediate' },
    formatter: formatPercentage
  },
  {
    name: 'potassium_percentage',
    labelKey: 'events.chemical.fields.potassium',
    valueType: 'number',
    visibleForSubtypes: ['FE'],
    // Hidden individually — rendered via nitrogen_percentage groupWith
    surfaces: { form: 'immediate' },
    formatter: formatPercentage
  },
  {
    name: 'is_fertigation',
    labelKey: 'events.chemical.fields.isFertigation',
    helpKey: 'events.chemical.fields.isFertigationHelp',
    valueType: 'boolean',
    visibleForSubtypes: ['FE'],
    formatter: formatBoolean,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- Pest/Disease targeting (PE, FU, HE only) — Pattern 2: Multi-subtype gate ----
  {
    name: 'target_pest_disease',
    labelKey: 'events.chemical.fields.targetPestDisease',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: {
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'hero',
      consumer_card: 'immediate',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'application_timing',
    labelKey: 'events.chemical.fields.applicationTiming',
    valueType: 'enum',
    formatter: formatApplicationTiming,
    // FE included: pre_plant / at_plant / side_dress are valid fertilizer timings
    // (Event 03 sets pre_plant). Form captures it for all chemical subtypes.
    visibleForSubtypes: ['PE', 'FU', 'HE', 'FE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- EPA Worker Protection Standard (PE, FU, HE) ----
  {
    name: 'restricted_use_pesticide',
    labelKey: 'events.chemical.fields.restrictedUsePesticide',
    valueType: 'boolean',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    formatter: formatBoolean,
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  // ---- Applicator tracking (PE, FU, HE) ----
  // NOP 7 CFR 205.103 requires applicator traceability for ALL organic chemical
  // applications, not just restricted-use products. Previously these were gated
  // on `restricted_use_pesticide === true`, which hid the fields for OMRI-listed
  // biological pesticides — forcing farmers to falsely mark RUP=true just to
  // document who applied the product. `required` stays RUP-gated (EPA WPS only
  // mandates certification for restricted-use products).
  {
    name: 'applicator_name',
    labelKey: 'events.chemical.fields.applicatorName',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'applicator_certification',
    labelKey: 'events.chemical.fields.applicatorCertification',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    required: (e) => e.restricted_use_pesticide === true || e.restricted_use_pesticide === 'true',
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'epa_registration_number',
    labelKey: 'events.chemical.fields.epaRegistrationNumber',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'rei_hours',
    labelKey: 'events.chemical.fields.reiHours',
    helpKey: 'events.chemical.fields.reiHoursHelp',
    valueType: 'number',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    formatter: formatDurationHours,
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'phi_days',
    labelKey: 'events.chemical.fields.phiDays',
    helpKey: 'events.chemical.fields.phiDaysHelp',
    valueType: 'number',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    formatter: formatDurationDays,
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Environmental context (ALL subtypes) ----
  {
    name: 'weather_conditions',
    labelKey: 'events.chemical.fields.weatherConditions',
    valueType: 'enum',
    formatter: formatWeatherConditions,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'organic_approved',
    labelKey: 'events.chemical.fields.organicApproved',
    valueType: 'enum',
    enumSource: 'organic_approved',
    formatter: formatOrganicApproved,
    requiresVerificationBadge: true,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate',
      preview: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'buffer_zone_meters',
    labelKey: 'events.chemical.fields.bufferZone',
    valueType: 'number',
    formatter: (v) => (v != null ? `${v} m` : null),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- Application fuel/carbon tracking (ALL subtypes, CARBON RELEVANT) ----
  {
    name: 'application_fuel_type',
    labelKey: 'events.chemical.fields.applicationFuelType',
    valueType: 'enum',
    enumSource: 'fuel_types',
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      quick_form: 'secondary',
      consumer_card: 'details' // FTC: carbon detail, not hero
    }
  },
  {
    name: 'application_fuel_consumed',
    labelKey: 'events.chemical.fields.applicationFuelConsumed',
    valueType: 'number',
    unitField: 'application_fuel_unit',
    formatter: formatAppFuel,
    carbonRelevant: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      quick_form: 'secondary',
      consumer_card: 'details' // FTC: carbon detail, not hero
    }
  },

  // ---- NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103) ----
  // NOP requires traceability of all chemical inputs (supplier, purchase date, invoice #)
  // Surfacing these on consumer_card gives auditors and transparency-focused buyers
  // direct evidence of input sourcing without opening the farmer-only modal.
  {
    name: 'supplier_name',
    labelKey: 'events.chemical.fields.supplierName',
    placeholderKey: 'events.chemical.fields.supplierNamePlaceholder',
    valueType: 'string',
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'purchase_date',
    labelKey: 'events.chemical.fields.purchaseDate',
    valueType: 'date',
    formatter: formatDate,
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'purchase_invoice',
    labelKey: 'events.chemical.fields.purchaseInvoice',
    placeholderKey: 'events.chemical.fields.purchaseInvoicePlaceholder',
    valueType: 'string',
    requiresVerificationBadge: true,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Additional details (ALL subtypes) ----
  {
    name: 'application_details',
    labelKey: 'events.chemical.fields.applicationDetails',
    valueType: 'text',
    surfaces: {
      modal: 'details',
      form: 'details',
      consumer_card: 'details'
    }
  },

  // ---- Agronomic context (ALL subtypes, from CommonEvent) ----
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'details',
      preview: 'secondary',
      consumer_card: 'secondary' // Farmer notes visible to consumer
    }
  },
  {
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: {
      modal: 'details',
      form: 'details'
    }
  },
  {
    name: 'variety',
    labelKey: 'events.common.fields.variety',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    surfaces: {
      modal: 'details',
      form: 'details'
    }
  }
];

// ============================================================================
// Registry entry
// ============================================================================

export const chemicalEventRegistry: EventRegistryEntry<ChemicalSubtype, ChemicalEventData> = {
  eventType: 2,
  eventTypeName: 'chemical',
  labelKey: 'events.types.chemical',
  subtypes: CHEMICAL_SUBTYPES,
  defaultPhotoTier: 'essential',
  fields: CHEMICAL_FIELDS
};
