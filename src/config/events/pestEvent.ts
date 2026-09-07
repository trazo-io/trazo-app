/**
 * Pest Management Event Registry.
 *
 * 7 subtypes: SC(Scouting), BR(Beneficial Release), TM(Trap Monitoring),
 * PI(Pest Identification), TA(Threshold Assessment), IP(IPM Implementation),
 * CU(Cultural / Sanitation Control — §E-4).
 *
 * BR (Beneficial Release) and PI (Pest ID) are ESSENTIAL photo tier events.
 * Every `photoTier` here mirrors transparency_calculator.py — the backend owns the penalty,
 * this file only reports it.
 */

import type {
  EventRegistryEntry,
  FieldConfig,
  FieldFormatter,
  PestManagementSubtype
} from './registry';
import {
  formatArea,
  formatBoolean,
  formatDate,
  formatDurationHours,
  formatFuelConsumption,
  formatNumber,
  formatPercentage,
  formatConsumerPestName,
  formatConsumerActionThreshold,
  formatConsumerOrganicStatus
} from './formatters';

type PestData = Record<string, unknown>;

/** Summary-mode flag — a STRING from the form and from extra_data ("true"), a boolean on the wire. */
const isSummaryRecord = (e: Record<string, unknown>): boolean => {
  const raw = e.is_summary ?? (e.extra_data as Record<string, unknown> | undefined)?.is_summary;
  return raw === true || raw === 'true';
};

// Pest pressure level labels — match PestManagementTab.jsx dropdown
// NOTE: The form stores CAPITALIZED values ("Low", "High") for non-scouting types,
// and lowercase ("none", "low") for the scouting `average_pest_pressure` field.
// The formatter handles both cases via lowercase lookup + fallback.
// §E-4 — preventive cultural practices (7 CFR 205.206(a)). English here + es-419 in
// utils/fieldValues.es.ts, matching every other enum map in this file: getFieldsForSurface() has
// no `intl`, so a formatter returning an i18n key would render the raw key.
const CULTURAL_PRACTICE_LABELS: Record<string, string> = {
  mummy_removal: 'Mummy nut removal',
  sanitation_shake: 'Sanitation shake',
  brush_shred: 'Brush / mummy shredding',
  pruning_removal: 'Pruning removal and destruction',
  field_sanitation: 'Field sanitation',
  trap_crop: 'Trap crop'
};

const formatCulturalPractice = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return CULTURAL_PRACTICE_LABELS[v] ?? v;
};

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
  // ---- Cultural / sanitation control (CU) — §E-4, 7 CFR 205.206(a) ----
  // Hero on the consumer card: removing overwintering pest sites INSTEAD of spraying is the
  // single most legible organic practice on the page, and it is a plain fact about work done,
  // not a claim about outcomes.
  {
    name: 'cultural_practice',
    labelKey: 'events.pest.fields.culturalPractice',
    helpKey: 'events.pest.fields.culturalPracticeHelp',
    valueType: 'enum',
    formatter: formatCulturalPractice,
    visibleForSubtypes: ['CU'],
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
  // ---- Core (ALL subtypes) ----
  {
    name: 'pest_species',
    labelKey: 'events.pest.fields.pestSpecies',
    // Shoppers get the common name without the Latin binomial; the certifier PDF keeps it.
    consumerFormatter: formatConsumerPestName,
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
    // Six subtypes, NOT all. PestManagementTab renders this only for SC/PI/TA/TM/BR/IP, and
    // that exclusion is correct: CU is CULTURAL CONTROL (§ 205.206(a)(3) — sanitation,
    // resistant varieties, site selection). A cultural practice does not produce a pest
    // PRESSURE reading; pressure is an output of scouting and monitoring. Declaring it for CU
    // put a value on the Cultural Control modal that no input could set or clear — the same
    // over-declaration pattern as `applied_scope` on Planting.
    name: 'pest_pressure_level',
    visibleForSubtypes: ['SC', 'PI', 'TA', 'TM', 'BR', 'IP'],
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
    // F44: quantitative UC-IPM monitoring count — formatter folds in the unit (e.g. "5 per leaf")
    // so monitoring_unit isn't a separate row. SC/TM/PI only.
    name: 'monitoring_count',
    labelKey: 'events.pest.fields.monitoringCount',
    valueType: 'number',
    visibleForSubtypes: ['SC', 'TM', 'PI'],
    formatter: (v, event) => {
      if (v == null || v === '') return null;
      const num = typeof v === 'number' ? v : parseFloat(String(v));
      if (!isFinite(num)) return null;
      const unitLabels: Record<string, string> = {
        per_leaf: 'per leaf',
        per_trap: 'per trap',
        per_tree: 'per tree',
        per_100_fruit: 'per 100 fruit',
        percent_infested: '% infested',
        per_sample: 'per sample'
      };
      const u = (event?.monitoring_unit as string) || '';
      const unit = unitLabels[u] ?? u;
      return unit ? `${num} ${unit}` : `${num}`;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
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
    // A bare ✗ meant nothing to a shopper, and it encodes good news: counts stayed under the
    // level that would justify treating. The consumer surface says it in words.
    consumerLabelKey: 'events.consumer.fields.actionThresholdMet',
    consumerFormatter: formatConsumerActionThreshold,
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
    // Ungated for the same reason as `ipm_strategy` above — the form renders the two together
    // in one section whose own copy says "on every pest event, whatever its type", and the
    // § 205.206(e) packet check reads them the same way. The old ['TA','IP','SC'] silently
    // dropped it on trap monitoring, beneficial release and pest identification.
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
      consumer_card: 'secondary'
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
      form: 'secondary'
    }
  },

  // ---- Beneficial Release (BR) ----
  {
    name: 'beneficial_species',
    labelKey: 'events.pest.fields.beneficialSpecies',
    // Same as pest_species: the released insect's common name is the consumer story,
    // "(Aphytis melinus)" is not.
    consumerFormatter: formatConsumerPestName,
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
    // The producer formatter above turns a bare `yes` into "OMRI / Organic-approved", which on
    // a consumer card named a third-party listing program on the strength of one dropdown.
    // Shoppers get the attributed wording instead.
    consumerFormatter: formatConsumerOrganicStatus,
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
        // Vertebrate traps (§E-7) — gopher and ground squirrel are routine orchard work.
        gopher_trap: 'Gopher trap',
        ground_squirrel_trap: 'Ground squirrel trap',
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
    // No subtype gate (2026-08-31). PestManagementTab renders this on EVERY pest event, on
    // purpose and with its reason written beside it: the audit export runs the § 205.206(a)
    // check over all pest events and prints "0/N have IPM strategy" on page 1 of the dossier,
    // so gating the only input would leave that finding unclearable. The registry kept the old
    // ['IP','TA'], which made it write-only on the two events an organic orchard logs most —
    // a grower filled in the IPM narrative on a scouting record, it saved, it satisfied the
    // packet check, and their own detail modal rendered nothing back.
    //
    // `formAndDisplayGatesAgree.test.ts` is the guard for exactly this and did not catch it:
    // it only read ProductionTab + productionEvent.ts, the family where the defect was first
    // found. It now covers this pair too.
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
    // NO consumer_card: it rendered as "Beneficial Insects Used: Using Beneficial Insects" —
    // the label restated as the value, on EVERY pest card including ones with no release.
    // Where beneficials were genuinely released, `beneficial_species` ("Green lacewing")
    // already says it at hero tier, concretely.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'chemical_free_period_days',
    labelKey: 'events.pest.fields.chemicalFreePeriod',
    valueType: 'number',
    formatter: (v) => (v != null ? `${v} days` : null),
    // NO consumer_card (2026-08-31). "Chemical-Free Period: 34 days" is a number the grower
    // typed into a box, published to a shopper as a fact about the food in their hand — it
    // reads as a residue or pre-harvest interval claim, and nothing corroborates it.
    //
    // The packet's own rule already says this: `phi_days` is in
    // PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS precisely because an interval on a
    // consumer surface implies a consumer hazard and carries no consumer meaning. A
    // farmer-asserted interval is the same claim with less behind it than the regulated one.
    // It stays on the modal and the form, where the certifier reads it.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
      form: 'secondary'
    }
  },
  {
    name: 'fuel_type',
    labelKey: 'events.common.fields.fuelType',
    valueType: 'enum',
    enumSource: 'fuel_types',
    carbonRelevant: true,
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'equipment_hours',
    labelKey: 'events.common.fields.equipmentHours',
    valueType: 'number',
    formatter: formatDurationHours,
    carbonRelevant: true,
    surfaces: { modal: 'secondary', form: 'secondary' }
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
  // ---- FSMA § 112.161(b) supervisor sign-off (CommonEvent, ALL subtypes) ----
  //
  // 🔴 2026-08-31 — declared in chemicalEvent.ts and NOWHERE else, while this family's form
  // collects it on every subtype. A grower ticked "Supervisor review", named the reviewer and
  // dated it; the record saved all three and the modal showed none of them. The certifier
  // packet prints the sign-off in its attestation section, so the only reader who could not
  // see it was the operation itself.
  //
  // Producer/certifier surfaces only: who countersigned a farm record is not a shopper's fact.
  {
    name: 'reviewed',
    labelKey: 'events.common.fields.reviewed',
    valueType: 'boolean',
    formatter: formatBoolean,
    // Only when true — BooleanField(default=False) would otherwise print "Supervisor
    // reviewed: ✗" on every unreviewed record. Bug Pattern #6.
    visibleWhen: (e) => e.reviewed === true || e.reviewed === 'true',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'reviewer_name',
    labelKey: 'events.common.fields.reviewerName',
    valueType: 'string',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'review_date',
    labelKey: 'events.common.fields.reviewDate',
    valueType: 'date',
    formatter: formatDate,
    surfaces: { modal: 'secondary', form: 'secondary' }
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
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    // Legacy rows only. PestManagementTab always collected the stage as `crop_growth_stage`
    // and wrote it to extra_data; the CommonEvent column `growth_stage` stayed empty, and the
    // entry above (which reads the column) rendered nothing — the per-tile sweep of 2026-09-06
    // found "Seedling" on the form, in the API and in the packet, and absent from the modal.
    // The tab now writes the column too; this entry reads the old key for rows written before.
    name: 'crop_growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    visibleWhen: (e) => !e.growth_stage,
    surfaces: { modal: 'details' }
  },
  {
    // Every event type's form asks it; only this registry lacked it (2026-09-06 sweep).
    name: 'variety',
    labelKey: 'events.common.fields.variety',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    // The scout's next step. The packet deliberately prints the threshold DECISION
    // (`action_threshold_met` + `threshold_rationale`) and not this note; the producer's own
    // record should still show what they wrote. Not a shopper's fact.
    name: 'action_recommended',
    labelKey: 'events.pest.fields.actionRecommended',
    valueType: 'string',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },

  // ---- Scouting summary mode (SC, is_summary) — the season aggregates the tab collects ----
  // Producer surfaces only: ConsumerEventCard renders its own aggregate tile from these keys.
  {
    name: 'pest_species_observed',
    labelKey: 'events.pest.fields.pestSpeciesObserved',
    valueType: 'string',
    visibleForSubtypes: ['SC'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'average_pest_pressure',
    labelKey: 'events.pest.fields.averagePestPressure',
    valueType: 'enum',
    formatter: formatPestPressure,
    visibleForSubtypes: ['SC'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'area_covered_total',
    labelKey: 'events.pest.fields.areaCoveredTotal',
    valueType: 'number',
    unitField: 'area_unit',
    formatter: formatArea as FieldFormatter<unknown, PestData>,
    visibleForSubtypes: ['SC'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'immediate', form: 'immediate' }
  },
  {
    name: 'fuel_consumed_total',
    labelKey: 'events.pest.fields.fuelConsumedTotal',
    valueType: 'number',
    unitField: 'fuel_unit',
    formatter: formatFuelConsumption as FieldFormatter<unknown, PestData>,
    carbonRelevant: true,
    visibleForSubtypes: ['SC'],
    visibleWhen: isSummaryRecord,
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    // Farm block / row / section beneath the parcel. Present on CommonEvent, so every event
    // type carries it — and it is already emitted as CA PUR box 22 (Block ID) by
    // pur_export_service.py. It is also where a COG Pro migration lands "Row/Section ID".
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    // `card: 'immediate'` — block is what tells two otherwise-identical records apart.
    //
    // Left at modal/'details' (the "Learn More" expander), an orchard that sprays Block 1 and
    // Block 2 on consecutive days showed two rows with the same product, rate and notes and no
    // visible difference — they read as DUPLICATES. Found exactly that way on the walnut
    // migration: 74 legitimate per-block records, block rendered nowhere on the timeline.
    //
    // It is also the CA PUR box 22 value, so hiding it on the producer surface hides the field
    // the regulator form is keyed on. Consumer surfaces already showed it.
    surfaces: { card: 'immediate', modal: 'details', form: 'details' }
  },
  {
    name: 'production_efficiency',
    labelKey: 'events.common.fields.productionEfficiency',
    valueType: 'enum',
    enumSource: 'production_efficiency',
    surfaces: { modal: 'details', form: 'secondary' }
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
    { code: 'IP', labelKey: 'events.pest.subtypes.ipmImplementation', photoTier: 'recommended' },
    // §E-4 — MIRRORS the backend: transparency_calculator.py keys its tiers by the raw subtype
    // code across every event model, and "CU" sits in PHOTO_TIER_RECOMMENDED. Declaring
    // 'essential' here would promise a 50% photo penalty the backend never applies, so a farmer
    // would be told their score depends on a photo that in fact costs them 25%.
    { code: 'CU', labelKey: 'events.pest.subtypes.culturalControl', photoTier: 'recommended' }
  ],
  defaultPhotoTier: 'optional',
  fields: PEST_FIELDS
};
