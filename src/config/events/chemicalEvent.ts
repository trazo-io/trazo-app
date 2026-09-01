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
  formatDateTime,
  formatDurationDays,
  formatDurationHours,
  formatNPK,
  formatPercentage,
  makeUnitPairFormatter,
  formatConsumerPestName
} from './formatters';

// Organic approval labels — acronyms must be properly capitalized (OMRI, USDA, NOP)
const ORGANIC_APPROVED_LABELS: Record<string, string> = {
  omri_listed: 'OMRI Listed',
  wsda_listed: 'WSDA Listed',
  nop_seal_on_label: 'NOP seal on label',
  certifier_approved: 'Certifier-approved',
  usda_nop_approved: 'USDA NOP Approved',
  organic_equivalent: 'Organic Equivalent',
  not_organic: 'Not Organic',
  transitional: 'Transitional',
  not_applicable: 'Not Applicable'
};

// Consumer phrasing for organic approval. The label is a QUESTION ("Approved for organic
// use"), so the value must be an ANSWER. Pairing that label with the producer value
// "Not Organic" produced "Approved for organic use: Not Organic" on the live card — a label
// asserting approval next to a value denying it, inside a green-styled Key Details box.
// That was a regression introduced with the consumer relabel on 2026-07-31.
//
// Answering "No" plainly is the honest option: hiding a conventional input would be a
// material omission on a page whose entire premise is documentation.
const CONSUMER_ORGANIC_APPROVED_LABELS: Record<string, string> = {
  omri_listed: 'Yes, OMRI Listed',
  // 2026-08-15 — the lawful bases added with the rebuilt enum. Phrasing stays a plain
  // answer to the question; the server is the only thing that may upgrade a listing claim.
  wsda_listed: 'Yes, WSDA Listed',
  nop_seal_on_label: 'Yes, NOP seal on the label',
  certifier_approved: 'Yes, approved by the farm\u2019s certifier',
  usda_nop_approved: 'Yes, USDA NOP approved',
  organic_equivalent: 'Yes, organic-equivalent',
  transitional: 'Transitional, farm is converting to organic',
  not_organic: 'No, conventional input',
  // "not_applicable" is not an answer to this question; render nothing.
  not_applicable: ''
};

const formatConsumerOrganicApproved = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  const label = CONSUMER_ORGANIC_APPROVED_LABELS[v];
  if (label === '') return null;
  return label ?? ORGANIC_APPROVED_LABELS[v] ?? null;
};

const formatOrganicApproved = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return ORGANIC_APPROVED_LABELS[v] ?? v;
};

// Weather conditions labels — match ChemicalTab-ENHANCED.jsx dropdown labels (sans emoji/description)
export const WEATHER_CONDITIONS_LABELS: Record<string, string> = {
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
export const APPLICATION_TIMING_LABELS: Record<string, string> = {
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

// Display labels for a stored application method. Covers the FE/PE/FU/HE dropdown values
// (sans emoji/description); `subsurface` needs the "Injection" qualifier from the dropdown. This is a SEPARATE map from the form's
// option lists in `enums.ts` — 2026-08-02 added air_blast/aerial to those lists but not here,
// so an orchard airblast spray still rendered the raw key `air_blast` to shoppers (verified
// live 2026-08-03 on the Entrust card). The formatter falls through to `?? v`, so ANY stored
// value absent from this map leaks its enum key.
//
// Kept deliberately wider than the form offers: `banding`, `injection`, `drip` and `fumigation`
// exist in stored data and in the PUR exporter's method map (`pur_export_service._METHOD_TO_DPR`),
// so they must render as words even though no current form writes them.
export const APPLICATION_METHOD_LABELS: Record<string, string> = {
  broadcast: 'Broadcast',
  banded: 'Banded',
  banding: 'Banded',
  subsurface: 'Subsurface Injection',
  injection: 'Subsurface Injection',
  fertigation: 'Fertigation',
  foliar: 'Foliar',
  ground_spray: 'Ground Spray',
  // These English strings are chosen to MATCH keys that already exist in
  // `utils/fieldValues.es.ts` ("Air Blast Sprayer", "Aerial Spray", "Drip Irrigation"), which is
  // keyed by the English label rather than the enum value. Inventing "Air-Blast Sprayer" here
  // would render untranslated on the Spanish consumer page.
  air_blast: 'Air Blast Sprayer',
  aerial: 'Aerial Spray',
  chemigation: 'Chemigation',
  drip: 'Drip Irrigation',
  fumigation: 'Fumigation',
  seed_treatment: 'Seed Treatment',
  soil_incorporation: 'Soil Incorporation'
};

export const formatApplicationMethod = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  return APPLICATION_METHOD_LABELS[v] ?? v;
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
const formatMicronutrientRate = makeUnitPairFormatter('micronutrient_rate_unit');

// §E-3 — micronutrient labels. English here + es-419 in utils/fieldValues.es.ts, matching the
// other enum maps in this file (getFieldsForSurface has no `intl`, so a formatter returning an
// i18n key would render the raw key; localizeFieldValue maps the English string downstream).
// The element symbol rides along because it is how a lab report and an OMRI label print it.
const MICRONUTRIENT_LABELS: Record<string, string> = {
  zinc: 'Zinc (Zn)',
  boron: 'Boron (B)',
  manganese: 'Manganese (Mn)',
  iron: 'Iron (Fe)',
  copper: 'Copper (Cu)',
  calcium: 'Calcium (Ca)',
  magnesium: 'Magnesium (Mg)',
  sulfur: 'Sulfur (S)',
  other: 'Other'
};

const formatMicronutrientType = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  const key = String(v);
  return MICRONUTRIENT_LABELS[key] ?? key;
};

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
    // "Active Ingredient: Copper Hydroxide" reads like a warning label to a shopper.
    consumerLabelKey: 'events.consumer.fields.activeIngredient',
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
    formatter: formatApplicationMethod,
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
    // On a FERTILIZER the form labels this input "NPK Ratio" and writes the very value the
    // grouped nitrogen/phosphorus/potassium field renders, so the modal printed "2-3-1" twice
    // under two different labels ("Concentration" and "NPK Ratio"). Hidden only when that
    // grouped row will actually render — if the grower typed a ratio here and left the three
    // percentages blank, this stays and the value is not lost.
    visibleWhen: (e) => {
      // `chemical_type` FIRST. On a normalized event `type` has been overwritten with the
      // family name ('chemical') — see createBaseEvent — so reading it first would compare
      // 'chemical' to 'FE' and never match. Same resolution order `extractSubtypeCode` uses.
      const subtype = String(e.chemical_type ?? e.type ?? '');
      if (subtype !== 'FE') return true;
      const hasNpkTrio =
        e.nitrogen_percentage != null &&
        e.phosphorus_percentage != null &&
        e.potassium_percentage != null;
      return !hasNpkTrio;
    },
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      quick_form: 'immediate'
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
  // ---- Micronutrients (FE only) — §E-3, 7 CFR 205.601(j)(6) -----------------------------
  // Synthetic micronutrients are permitted ONLY where a soil or plant-tissue deficiency is
  // documented, and never as a defoliant/herbicide/desiccant. WHICH nutrient is plain language
  // ("zinc") so it reaches the consumer card; the RATE is an application detail of the same
  // class as the NPK percentages and is stripped from the public payload by the backend.
  {
    name: 'micronutrient_type',
    labelKey: 'events.chemical.fields.micronutrientType',
    helpKey: 'events.chemical.fields.micronutrientTypeHelp',
    valueType: 'enum',
    formatter: formatMicronutrientType,
    visibleForSubtypes: ['FE'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'micronutrient_rate',
    labelKey: 'events.chemical.fields.micronutrientRate',
    valueType: 'number',
    unitField: 'micronutrient_rate_unit',
    formatter: formatMicronutrientRate,
    visibleForSubtypes: ['FE'],
    surfaces: { modal: 'secondary', form: 'immediate' }
  },
  {
    name: 'micronutrient_rate_unit',
    labelKey: 'events.chemical.fields.micronutrientRateUnit',
    valueType: 'string',
    visibleForSubtypes: ['FE'],
    // Hidden individually — rendered as the unit of micronutrient_rate.
    surfaces: { form: 'immediate' }
  },
  {
    // USDA Input Material Application Record, "Purpose / Reason for Use". Its footnote 5:
    // "Some materials, for example, are allowed for pest management but not as a soil
    // amendment." § 205.601 lists synthetics BY USE, so the purpose is part of the
    // allowability record.
    //
    // Visible for ALL subtypes, not just FE. `target_pest_disease` already carries the
    // specific target for PE/FU/HE, but the § 205.601 use category is a different fact —
    // "aphids" is not the same answer as "insecticide use". FE had no purpose field at all.
    name: 'application_purpose',
    labelKey: 'events.chemical.fields.applicationPurpose',
    valueType: 'enum',
    enumSource: 'application_purposes',
    surfaces: {
      modal: 'secondary',
      form: 'immediate'
      // Producer/certifier record. A shopper cannot act on "soil fertility", so it fails the
      // three-question test in ADDING_FIELDS.md and stays off consumer_card.
    }
  },
  {
    // NOP 5012 — liquid/soluble fertilizer nitrogen source (certifier detail).
    name: 'nitrogen_source',
    labelKey: 'events.chemical.fields.nitrogenSource',
    valueType: 'enum',
    enumSource: 'nitrogen_sources',
    visibleForSubtypes: ['FE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // Bug Pattern #6 — BooleanField(default=False) on backend never returns null,
    // so without visibleWhen this would render "Is Fertigation: ✗" on every
    // non-fertigation FE event, polluting the consumer card with negative noise.
    // Gate so it only surfaces when fertigation is actually true (positive
    // signal: "fertilizer was injected through irrigation"). Form keeps the
    // field unconditionally so farmers can toggle it.
    name: 'is_fertigation',
    labelKey: 'events.chemical.fields.isFertigation',
    helpKey: 'events.chemical.fields.isFertigationHelp',
    valueType: 'boolean',
    visibleForSubtypes: ['FE'],
    visibleWhen: (e) =>
      e.is_fertigation === true ||
      e.is_fertigation === 'true' ||
      (e.extra_data as Record<string, unknown> | undefined)?.is_fertigation === true ||
      (e.extra_data as Record<string, unknown> | undefined)?.is_fertigation === 'true',
    formatter: formatBoolean,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- Pest/Disease targeting (PE, FU, HE only) — Pattern 2: Multi-subtype gate ----
  {
    name: 'target_pest_disease',
    labelKey: 'events.chemical.fields.targetPestDisease',
    // Producer/certifier wording stays on the form; a shopper reads "What it protects
    // against". Note the VALUE is often a Latin binomial the farmer typed
    // ("Anthracnose (Colletotrichum gloeosporioides)") — that is the grower's own text and
    // is left as written; only the label is re-voiced.
    consumerLabelKey: 'events.consumer.fields.targetPestDisease',
    // 2026-08-02: the note above said the Latin binomial is "left as written". Seeing it live
    // ("Citrus leafminer (Phyllocnistis citrella)") changed the call — dropping the
    // parenthetical omits the Latin without rewriting the grower's common name.
    consumerFormatter: formatConsumerPestName,
    valueType: 'string',
    // Deliberately NOT FE (enforced by chemicalEvent.test.ts): on a fertilizer a
    // "target pest/disease" reads wrong. The FE application reason IS still captured —
    // the form input is ungated so FE saves target_pest_disease, and the certifier PDF
    // prints it for every chemical row. A dedicated fertilizer-reason field would be the
    // clean way to also DISPLAY it on FE modal/card (deferred design decision).
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
      form: 'secondary'
    }
  },

  // ---- EPA Worker Protection Standard (PE, FU, HE) ----
  // Bug Pattern #6 — BooleanField(default=False) on backend never returns null.
  // Without visibleWhen, every organic/non-restricted chemical event would render
  // "Restricted Use Pesticide: ✗" on consumer card, polluting the display. Mirror
  // the legacy fieldDisplayUtils gating (only shown when truthy) — for organic
  // farmers, "RUP applied" is the warning signal worth surfacing; the unset case
  // is the silent norm. Form keeps the field unconditionally so farmers can toggle.
  {
    name: 'restricted_use_pesticide',
    labelKey: 'events.chemical.fields.restrictedUsePesticide',
    valueType: 'boolean',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    visibleWhen: (e) =>
      e.restricted_use_pesticide === true ||
      e.restricted_use_pesticide === 'true' ||
      e.restricted_use_pesticide === 'yes',
    formatter: formatBoolean,
    requiresVerificationBadge: true,
    // NO consumer_card: "Restricted Use Pesticide" is an EPA licensing classification about
    // who may PURCHASE and APPLY a product, not a statement about residue on food. The
    // legacy renderer even paired it with "⚠️ Restricted Use - Certified applicator
    // required", which reads as a consumer warning it was never meant to be. Stripped
    // server-side as certifier-only; the RUP chip on the card is driven separately by
    // `input_status` from the backend claim_resolver.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  // ---- Applicator tracking (PE, FU, HE) ----
  // NOP 7 CFR 205.103 requires applicator traceability for ALL organic chemical
  // applications, not just restricted-use products. Previously these were gated
  // on `restricted_use_pesticide === true`, which hid the fields for OMRI-listed
  // biological pesticides — forcing farmers to falsely mark RUP=true just to
  // document who applied the product. `required` stays RUP-gated (EPA WPS only
  // mandates certification for restricted-use products).
  // ⚠️ NONE of the five fields below declare `consumer_card` (2026-07-31 review, Oscar's call).
  //
  // They are worker-protection and enforcement data: REI/PHI protect the people who
  // re-enter a treated field, and the applicator name / certification / EPA registration
  // number identify a person and a regulated product to an inspector. To a shopper they
  // are at best meaningless ("Worker Re-Entry Interval: 48 hours") and at worst frightening,
  // implying a consumer hazard that the numbers do not describe.
  //
  // The server already strips all five from the anonymous payload
  // (PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS), so the declarations were inert
  // for real shoppers. They were not inert everywhere, and that was the actual harm:
  //   1. EventPreviewModal renders ConsumerEventCard from UNSTRIPPED wizard form data under
  //      the heading "How consumers will see this event" — so growers were shown REI, PHI,
  //      applicator name and EPA reg # as if consumers saw them. They never did.
  //   2. `to_representation` strips only `if not self._is_owner(obj)`, so a logged-in owner
  //      scanning their own QR link saw the same fields on the real consumer page.
  // Both surfaces lied to the farmer about their own product page.
  //
  // Every one of these remains on `modal` + `form` (producer) and in the certifier NOP PDF,
  // which reads the event models directly — zero audit or compliance coverage is lost.
  // Locked by chemicalEvent.test.ts; see newCertifierFields.render.test.ts for the pattern.
  {
    name: 'applicator_name',
    labelKey: 'events.chemical.fields.applicatorName',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
      form: 'secondary'
    }
  },
  {
    name: 'epa_registration_number',
    labelKey: 'events.chemical.fields.epaRegistrationNumber',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
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
      form: 'secondary'
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
      form: 'secondary'
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
      form: 'secondary'
    }
  },
  {
    name: 'organic_approved',
    labelKey: 'events.chemical.fields.organicApproved',
    // "Organic Status" is ambiguous — it reads as a status of the PRODUCT. The field
    // actually says whether this INPUT is approved for use on organic farms.
    consumerLabelKey: 'events.consumer.fields.organicApproved',
    consumerFormatter: formatConsumerOrganicApproved,
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
    // NO consumer_card: a buffer distance from a sensitive area (a creek, a school, a
    // neighbouring field) is drift-management data for a regulator. Out of that context it
    // reads to a shopper as "they sprayed near water". Stripped server-side as well.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // The CA DPR restricted-materials permit. Every other field in this legal spray-record
    // block — epa_registration_number, applicator_name, applicator_certification,
    // restricted_use_pesticide, rei_hours, buffer_zone_meters — carries `modal: 'secondary'`.
    // These three carried no declaration at all, so the permit under which a restricted
    // material was applied was invisible on the record that applied it.
    //
    // The block's own comment excuses exactly two things from the modal, "the MTRS quartet +
    // ffm_code", on clutter grounds; the permit was never in that exemption. It is also
    // already named in `CERTIFIER_ONLY_EVENT_FIELDS` — a list of fields the backend strips
    // from CONSUMERS, which only means anything if the producer surface shows them.
    //
    // `drift.resolution.ca_dpr_expired` already renders "permit #{num} expired {expires}" in
    // the compliance banner, so the grower could be told their permit had expired on a record
    // that would not show them the permit.
    name: 'ca_dpr_permit_number',
    labelKey: 'events.chemical.fields.caDprPermitNumber',
    valueType: 'string',
    // NO consumer_card, matching the rest of the block and the backend strip list.
    surfaces: { modal: 'secondary' }
  },
  {
    name: 'ca_dpr_permit_county',
    labelKey: 'events.chemical.fields.caDprPermitCounty',
    valueType: 'string',
    surfaces: { modal: 'secondary' }
  },
  {
    name: 'ca_dpr_permit_expires',
    labelKey: 'events.chemical.fields.caDprPermitExpires',
    valueType: 'date',
    formatter: formatDate,
    surfaces: { modal: 'secondary' }
  },
  {
    // Certifiers reconcile PURCHASED against APPLIED — that is the whole point of the column,
    // and the form's own help text says so. `soilEvent.ts` registers the identical fact as
    // `amendment_quantity_purchased` (with its unit companion); the chemical side collected it
    // and displayed nothing, so the same reconciliation was possible for an amendment and not
    // for a spray.
    name: 'quantity_purchased',
    labelKey: 'events.chemical.fields.quantityPurchased',
    valueType: 'number',
    unitField: 'quantity_purchased_unit',
    // NO consumer_card: an invoice quantity is a supplier-chain fact, the same reason
    // `supplier_name` is withheld.
    surfaces: { modal: 'secondary', form: 'secondary' }
  },

  // WS-4 — § 205.103(b)(2): records must be auditable, which for an application means WHERE it went.
  // (b)(1) is "adapted to the particular business" and says nothing about location — the
  // location expectation is (b)(2) audit sufficiency plus USDA's Input Material Application
  // Record, whose column 2 is "Location and Crop". Corrected 2026-08-15.. Producer/
  // certifier data (PUR site-level reporting); no consumer_card.
  {
    name: 'applied_scope',
    labelKey: 'events.chemical.fields.appliedScope',
    valueType: 'enum',
    enumSource: 'applied_scopes',
    surfaces: {
      form: 'immediate',
      modal: 'immediate'
    }
  },
  {
    name: 'applied_scope_detail',
    labelKey: 'events.chemical.fields.appliedScopeDetail',
    valueType: 'string',
    // The normalizer can rewrite enum values into display labels before this
    // predicate runs, so accept the raw value AND its label forms.
    visibleWhen: (event) => {
      const v = String((event as Record<string, unknown>).applied_scope ?? '').toLowerCase();
      return v === 'part' || v.includes('part of');
    },
    surfaces: {
      form: 'immediate',
      modal: 'immediate'
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
      quick_form: 'secondary' // FTC: carbon detail, not hero
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
      quick_form: 'secondary' // FTC: carbon detail, not hero
    }
  },

  // ---- NOP Compliance: Supplier & Purchase Tracking (7 CFR 205.103) ----
  // Commercially sensitive — vendor identity, invoice numbers, and purchase timing
  // are NOT exposed to consumers. Surfaces limited to farmer modal + form. The
  // certifier-facing NOP PDF (mass-balance section) is driven directly from the
  // model, not from these surfaces. requiresVerificationBadge is omitted because
  // these fields are farmer-self-reported (no third-party verification mechanism)
  // — claiming "verified" on self-reported data is FTC Green Guides risk.
  {
    name: 'supplier_name',
    labelKey: 'events.chemical.fields.supplierName',
    placeholderKey: 'events.chemical.fields.supplierNamePlaceholder',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'purchase_date',
    labelKey: 'events.chemical.fields.purchaseDate',
    valueType: 'date',
    formatter: formatDate,
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'purchase_invoice',
    labelKey: 'events.chemical.fields.purchaseInvoice',
    placeholderKey: 'events.chemical.fields.purchaseInvoicePlaceholder',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    // The uploaded FILE behind the invoice number (2026-08-25). Modal-only:
    // supplier-chain identity never reaches consumer surfaces, and the packet
    // carries the file itself in receipts/.
    name: 'receipt_document_title',
    labelKey: 'events.receipt.label',
    valueType: 'string',
    surfaces: {
      modal: 'secondary'
    }
  },
  {
    // Manufacturer/supplier lot/batch # — required NOP purchase-record field (CCOF G8.0)
    // for input traceability + mass-balance. Producer/certifier-only; NO consumer_card
    // surface (mirrors supplier_name; backend also strips it from the public payload).
    name: 'chemical_lot_number',
    labelKey: 'events.chemical.fields.chemicalLotNumber',
    valueType: 'string',
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },

  // ---- F20 (2026-06): Legal spray-record fields (GLOBALG.A.P. / CA PUR) ----
  // Farmer-facing review only (modal + form). Deliberately NO consumer surface:
  // these are legal/operational identifiers, excluded from PublicHistorySerializer.
  // The MTRS quartet + ffm_code stay form-only/PUR-export-bound (not in the modal
  // summary) to avoid clutter; they still save and round-trip.
  {
    name: 'manufacturer',
    labelKey: 'events.chemical.fields.manufacturer',
    valueType: 'string',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'application_start',
    labelKey: 'events.chemical.fields.applicationStart',
    valueType: 'date',
    // formatDateTime, not formatDate (2026-08-31): these two exist to bound a WINDOW, and
    // `toLocaleDateString` dropped the clock — an application recorded 06:15 -> 09:20 printed
    // "Mar 18, 2026" as both its start and its end.
    formatter: formatDateTime,
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'application_end',
    labelKey: 'events.chemical.fields.applicationEnd',
    valueType: 'date',
    formatter: formatDateTime,
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'planted_area',
    labelKey: 'events.chemical.fields.plantedArea',
    valueType: 'string',
    unitField: 'planted_area_unit',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'operator_id',
    labelKey: 'events.chemical.fields.operatorId',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    // 🔴 2026-08-31 — the CA PUR location identifiers were not in the registry at all, so a
    // grower who filled Section / Township / Range / Base & Meridian on the form saw County,
    // Operator ID and Site ID come back in Technical Details and these four vanish. They DO
    // reach the state: pur_export_service writes them to DPR-PML-017C. They just never came
    // back to the person who typed them.
    //
    // Rendered as ONE row via `groupWith`, the way MTRS is actually read and written — four
    // separate rows for "14", "21S", "27E", "M" is four fragments of one designator. Same
    // mechanism the NPK trio uses.
    name: 'mtrs_section',
    labelKey: 'events.chemical.fields.mtrs',
    valueType: 'string',
    groupWith: ['mtrs_township', 'mtrs_range', 'mtrs_base_meridian'],
    formatter: (_v, event) => {
      const part = (k: string) => {
        const raw = (event as Record<string, unknown>)[k];
        return typeof raw === 'string' ? raw.trim() : raw != null ? String(raw).trim() : '';
      };
      const section = part('mtrs_section');
      const township = part('mtrs_township');
      const range = part('mtrs_range');
      // The single letter is a PUR code, meaningless on its own — name the meridian.
      const meridians: Record<string, string> = {
        H: 'Humboldt',
        M: 'Mount Diablo',
        S: 'San Bernardino'
      };
      const meridianRaw = part('mtrs_base_meridian');
      const meridian = meridians[meridianRaw] ?? meridianRaw;
      const parts = [
        section && `S${section}`,
        township && `T${township}`,
        range && `R${range}`,
        meridian && `${meridian} meridian`
      ].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    },
    surfaces: { modal: 'details', form: 'secondary' }
  },
  // Group members. They carry ONLY a `form` surface: the display side is rendered once by
  // `mtrs_section` above (which reads all four off the event, so a record with no Section still
  // shows its Township and Range), and the form side needs them because ChemicalTab has four
  // separate inputs — `getFieldNamesForSurface` deliberately does not consume group members on
  // form surfaces for exactly that reason.
  {
    name: 'mtrs_township',
    labelKey: 'events.chemical.fields.mtrsTownship',
    valueType: 'string',
    surfaces: { form: 'secondary' }
  },
  {
    name: 'mtrs_range',
    labelKey: 'events.chemical.fields.mtrsRange',
    valueType: 'string',
    surfaces: { form: 'secondary' }
  },
  {
    name: 'mtrs_base_meridian',
    labelKey: 'events.chemical.fields.mtrsBaseMeridian',
    // 'string', not 'enum': an `enum` here would promise an `enumSource` this field does not
    // have (ChemicalTab hand-rolls the H/M/S select), and the resolver's enum branch would then
    // fall back to de-underscoring the raw code. The meridian is named by the group formatter
    // above, which is the only place it displays.
    valueType: 'string',
    surfaces: { form: 'secondary' }
  },
  {
    name: 'site_id',
    labelKey: 'events.chemical.fields.siteId',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    name: 'application_county',
    labelKey: 'events.chemical.fields.applicationCounty',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'secondary' }
  },
  {
    // Tank-mix partners (adjuvants/spreader-stickers). Audit/modal display only —
    // each CA-registered partner emits its own PUR line (boxes 23/24) on export.
    // valueType 'string' + formatter: the value is a list of objects; the form input
    // is hand-crafted (not auto-rendered), so this entry only drives the modal summary.
    name: 'tank_mix_partners',
    labelKey: 'events.chemical.fields.tankMixPartners',
    valueType: 'string',
    // No subtype gate (2026-08-31). It was ['PE','FU','HE'], but ChemicalTab offers "Add
    // adjuvant" on EVERY subtype and a spreader-sticker riding with a foliar FERTILIZER is an
    // ordinary tank mix. The result was a write-only field: a grower recorded the adjuvant, the
    // record stored it, and their own detail modal then refused to show it back — while CA PUR
    // does not report fertilizers at all, so nothing else displayed it either.
    //
    // Widening is safe without a `visibleWhen`: the formatter below returns null for an empty
    // or absent list, and the resolver skips a null-valued field, so a record with no partners
    // renders no row.
    surfaces: { modal: 'details' },
    formatter: (value) => {
      if (!Array.isArray(value) || value.length === 0) return null;
      const names = value
        .map((p) =>
          p && typeof p === 'object'
            ? String(
                (p as Record<string, unknown>).commercial_name ||
                  (p as Record<string, unknown>).epa_registration_number ||
                  ''
              )
            : ''
        )
        .filter(Boolean);
      return names.length ? names.join(', ') : null;
    }
  },

  // ---- F21: GG authorizer (FV-GFS 32.02.01 #10) + FSMA supervisor review (112.161(b)) ----
  // Farmer/audit-facing only (modal + form). No consumer surface — sign-off is an
  // operational/compliance record, not consumer-facing.
  {
    name: 'authorizer_name',
    labelKey: 'events.chemical.fields.authorizerName',
    valueType: 'string',
    visibleForSubtypes: ['PE', 'FU', 'HE'],
    surfaces: { modal: 'secondary', form: 'secondary' }
  },
  {
    name: 'reviewer_name',
    // Common key, not a chemical-specific one (2026-08-31): the same three sign-off fields are
    // now declared on production, soil and pest too, and the chemical duplicates were
    // title-cased ("Reviewed By" / "Supervisor Reviewed") where every other common label is
    // sentence case. One field, one label, whatever the event family.
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
    name: 'reviewed',
    labelKey: 'events.common.fields.reviewed',
    valueType: 'boolean',
    formatter: formatBoolean,
    // Only surface when true (a positive sign-off signal); avoids "Reviewed: ✗" noise.
    visibleWhen: (e) => e.reviewed === true || e.reviewed === 'true',
    surfaces: { modal: 'secondary', form: 'secondary' }
  },

  // ---- Additional details (ALL subtypes) ----
  {
    name: 'application_details',
    labelKey: 'events.chemical.fields.applicationDetails',
    valueType: 'text',
    surfaces: {
      modal: 'details',
      form: 'details'
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
      consumer_card: 'secondary'
    }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
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
    surfaces: {
      card: 'immediate',
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
