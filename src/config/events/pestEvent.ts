/**
 * Pest Management Event Registry.
 *
 * 6 subtypes: SC(Scouting), BR(Beneficial Release), TM(Trap Monitoring),
 * PI(Pest Identification), TA(Threshold Assessment), IP(IPM Implementation).
 *
 * BR (Beneficial Release) and PI (Pest ID) are ESSENTIAL photo tier events.
 */

import type { EventRegistryEntry, FieldConfig, PestManagementSubtype } from './registry';
import {
  formatArea,
  formatBoolean,
  formatDurationHours,
  formatFuelConsumption,
  formatNumber,
  formatPercentage
} from './formatters';

type PestData = Record<string, unknown>;

// Pest pressure level labels — match PestManagementTab.jsx dropdown
// NOTE: The form stores CAPITALIZED values ("Low", "High") for non-scouting types,
// and lowercase ("none", "low") for the scouting `average_pest_pressure` field.
// The formatter handles both cases via lowercase lookup + fallback.
const PEST_PRESSURE_LABELS: Record<string, string> = {
  none: 'None',
  low: 'Low',
  moderate: 'Moderate',
  medium: 'Medium',
  high: 'High',
  severe: 'Severe',
  critical: 'Critical'
};

const formatPestPressure = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return PEST_PRESSURE_LABELS[v.toLowerCase()] ?? v;
};

// NOP Compliance — Pest Identification (7 CFR 205.206). Labels mirror Django
// IDENTIFIED_BY_CHOICES so consumer card matches the certifier-facing PDF
// (which uses get_identified_by_display()). Bug Pattern #16 — without this map
// the resolver default split-capitalize would render "Extension Service" instead
// of "Extension Service Agent" and "Lab" instead of "Laboratory Analysis".
const IDENTIFIED_BY_LABELS: Record<string, string> = {
  farmer: 'Farmer / Farm Staff',
  agronomist: 'Licensed Agronomist',
  entomologist: 'Entomologist',
  extension_service: 'Extension Service Agent',
  crop_consultant: 'Crop Consultant',
  lab: 'Laboratory Analysis'
};

const formatIdentifiedBy = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return IDENTIFIED_BY_LABELS[v] ?? v;
};

// Beneficial insects usage labels — match PestManagementTab.jsx dropdown
const BENEFICIAL_INSECTS_LABELS: Record<string, string> = {
  yes: 'Using Beneficial Insects',
  no: 'Not Currently Using',
  planning: 'Planning to Introduce'
};

const formatBeneficialInsects = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return BENEFICIAL_INSECTS_LABELS[v.toLowerCase()] ?? v;
};

const PEST_FIELDS: readonly FieldConfig<unknown, PestData>[] = [
  // ---- Core (ALL subtypes) ----
  {
    name: 'pest_species',
    labelKey: 'events.pest.fields.pestSpecies',
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
    name: 'pest_pressure_level',
    labelKey: 'events.pest.fields.pressureLevel',
    valueType: 'enum',
    formatter: formatPestPressure,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'damage_percentage',
    labelKey: 'events.pest.fields.damagePercentage',
    valueType: 'number',
    formatter: formatPercentage,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'immediate'
    }
  },
  {
    // Bug Pattern #6 — BooleanField(default=False). Gate by subtype to the IPM
    // monitoring/threshold-assessment subtypes per NOP § 205.206(a). For SC/TA/IP
    // both ✓ (action triggered) AND ✗ (below threshold) are meaningful documentation
    // when paired with threshold_rationale text — so we keep the truthy-or-falsy
    // semantics, but suppress the field entirely on BR/TM/PI where it's just noise.
    name: 'action_threshold_met',
    labelKey: 'events.pest.fields.thresholdMet',
    valueType: 'boolean',
    visibleForSubtypes: ['SC', 'TA', 'IP'],
    formatter: formatBoolean,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Threshold rationale (7 CFR 205.206(e)) ----
  {
    name: 'threshold_rationale',
    labelKey: 'events.pest.fields.thresholdRationale',
    placeholderKey: 'events.pest.fields.thresholdRationalePlaceholder',
    valueType: 'text',
    visibleForSubtypes: ['TA', 'IP', 'SC'],
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- NOP Compliance: Pest identification verification (7 CFR 205.206) ----
  {
    name: 'identified_by',
    labelKey: 'events.pest.fields.identifiedBy',
    valueType: 'enum',
    enumSource: 'identified_by',
    visibleForSubtypes: ['PI', 'SC', 'TA'],
    formatter: formatIdentifiedBy,
    surfaces: {
      modal: 'secondary',
      form: 'immediate',
      consumer_card: 'details'
    }
  },
  {
    name: 'identification_method',
    labelKey: 'events.pest.fields.identificationMethod',
    placeholderKey: 'events.pest.fields.identificationMethodPlaceholder',
    valueType: 'string',
    visibleForSubtypes: ['PI', 'SC'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },

  // ---- Beneficial Release (BR) ----
  {
    name: 'beneficial_species',
    labelKey: 'events.pest.fields.beneficialSpecies',
    valueType: 'string',
    visibleForSubtypes: ['BR'],
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
    name: 'release_quantity',
    labelKey: 'events.pest.fields.releaseQuantity',
    valueType: 'string',
    visibleForSubtypes: ['BR'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  // BR NOP 205.206 traceability. Supplier + lot are AUDIT-ONLY (commercially sensitive — no
  // consumer surface). Organic-approval IS a consumer transparency positive.
  {
    name: 'beneficial_supplier',
    labelKey: 'events.pest.fields.beneficialSupplier',
    valueType: 'string',
    visibleForSubtypes: ['BR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'beneficial_lot_number',
    labelKey: 'events.pest.fields.beneficialLotNumber',
    valueType: 'string',
    visibleForSubtypes: ['BR'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'beneficial_organic_approved',
    labelKey: 'events.pest.fields.beneficialOrganicApproved',
    valueType: 'enum',
    visibleForSubtypes: ['BR'],
    formatter: (v) => {
      if (typeof v !== 'string' || !v) return null;
      const m: Record<string, string> = {
        yes: 'OMRI / Organic-approved',
        no: 'Not organic-approved',
        unknown: 'Approval status unknown'
      };
      return m[v.toLowerCase()] ?? v;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate',
      consumer_timeline: 'secondary'
    }
  },

  // ---- Trap Monitoring (TM) ----
  {
    name: 'trap_count',
    labelKey: 'events.pest.fields.trapCount',
    valueType: 'number',
    visibleForSubtypes: ['TM'],
    formatter: formatNumber,
    surfaces: {
      timeline: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'trap_type',
    labelKey: 'events.pest.fields.trapType',
    valueType: 'enum',
    visibleForSubtypes: ['TM'],
    formatter: (v) => {
      if (typeof v !== 'string' || !v) return null;
      const m: Record<string, string> = {
        sticky: 'Sticky card',
        pheromone: 'Pheromone lure',
        delta: 'Delta trap',
        bucket_funnel: 'Bucket / funnel',
        other: 'Other'
      };
      return m[v.toLowerCase()] ?? v;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    // the actual catch is the RESULT of trap monitoring — promote to Key Details (immediate);
    // trap_type / trap_count are configuration, they stay in Additional (secondary).
    name: 'pest_catch_count',
    labelKey: 'events.pest.fields.pestCatchCount',
    valueType: 'number',
    visibleForSubtypes: ['TM'],
    formatter: formatNumber,
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- IPM strategy (IP, TA) ----
  {
    name: 'ipm_strategy',
    labelKey: 'events.pest.fields.ipmStrategy',
    valueType: 'text',
    visibleForSubtypes: ['IP', 'TA'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'beneficial_insects_used',
    labelKey: 'events.pest.fields.beneficialInsectsUsed',
    valueType: 'enum',
    formatter: formatBeneficialInsects,
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'details'
    }
  },
  {
    name: 'chemical_free_period_days',
    labelKey: 'events.pest.fields.chemicalFreePeriod',
    valueType: 'number',
    formatter: (v) => (v != null ? `${v} days` : null),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },

  // ---- Area & Carbon (ALL subtypes) ----
  {
    name: 'area_covered',
    labelKey: 'events.common.fields.areaCovered',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
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
    surfaces: { modal: 'secondary', form: 'secondary', consumer_card: 'details' }
  },
  {
    name: 'equipment_hours',
    labelKey: 'events.common.fields.equipmentHours',
    valueType: 'number',
    formatter: formatDurationHours,
    carbonRelevant: true,
    surfaces: { modal: 'secondary', form: 'secondary', consumer_card: 'details' }
  },

  // ---- Context ----
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: { form: 'details', consumer_card: 'secondary' }
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
  }
];

export const pestEventRegistry: EventRegistryEntry<PestManagementSubtype, PestData> = {
  eventType: 6,
  eventTypeName: 'pest_management',
  labelKey: 'events.types.pestManagement',
  subtypes: [
    { code: 'SC', labelKey: 'events.pest.subtypes.scouting', photoTier: 'recommended' },
    { code: 'BR', labelKey: 'events.pest.subtypes.beneficialRelease', photoTier: 'essential' },
    { code: 'TM', labelKey: 'events.pest.subtypes.trapMonitoring', photoTier: 'recommended' },
    { code: 'PI', labelKey: 'events.pest.subtypes.pestIdentification', photoTier: 'essential' },
    { code: 'TA', labelKey: 'events.pest.subtypes.thresholdAssessment', photoTier: 'optional' },
    { code: 'IP', labelKey: 'events.pest.subtypes.ipmImplementation', photoTier: 'recommended' }
  ],
  defaultPhotoTier: 'optional',
  fields: PEST_FIELDS
};
