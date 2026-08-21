/**
 * Template accelerators for the activity wizard (WS-4 template port).
 *
 * A template is an explicit farmer CHOICE of a practice pattern — picking one
 * prefills the form with that template's quickEventFields defaults (visible,
 * editable, review-gated). This is the deliberate-selection counterpart to the
 * voice accelerator, which merges only what the AI actually heard.
 *
 * Unit fields (*_unit) are stripped from the merge: quickEventFields defaults
 * are metric-leaning ('ha'), while the tabs already default to the operation's
 * US units via useDefaultUnits() — the tab must win.
 */

import { getDefaultFieldValues } from 'config/quickEventFields';

export interface TemplateAccelerator {
  /** quickEventFields templateId */
  id: string;
  /** Backend event_type the template belongs to (1, 2, 5) */
  backendEventType: number;
  /** Subtype code the template sets on the form's `type` field */
  subtype: string;
  /** i18n key for the display name (quickAdd.template.*.name) */
  nameKey: string;
}

export const TEMPLATE_ACCELERATORS: TemplateAccelerator[] = [
  // Production (event_type 1)
  {
    id: 'planting',
    backendEventType: 1,
    subtype: 'PL',
    nameKey: 'quickAdd.template.planting.name'
  },
  {
    id: 'irrigation',
    backendEventType: 1,
    subtype: 'IR',
    nameKey: 'quickAdd.template.irrigation.name'
  },
  { id: 'harvest', backendEventType: 1, subtype: 'HA', nameKey: 'quickAdd.template.harvest.name' },
  { id: 'pruning', backendEventType: 1, subtype: 'PR', nameKey: 'quickAdd.template.pruning.name' },
  {
    id: 'transplanting',
    backendEventType: 1,
    subtype: 'TR',
    nameKey: 'quickAdd.template.transplanting.name'
  },
  {
    id: 'cultivation',
    backendEventType: 1,
    subtype: 'CU',
    nameKey: 'quickAdd.template.cultivation.name'
  },
  {
    id: 'thinning',
    backendEventType: 1,
    subtype: 'TH',
    nameKey: 'quickAdd.template.thinning.name'
  },
  {
    id: 'equipment_maintenance',
    backendEventType: 1,
    subtype: 'EM',
    nameKey: 'quickAdd.template.equipmentMaintenance.name'
  },
  {
    id: 'organic_seed_sourcing',
    backendEventType: 1,
    subtype: 'PL',
    nameKey: 'quickAdd.template.organicSeedSourcing.name'
  },
  // Chemical (event_type 2)
  {
    id: 'fertilization',
    backendEventType: 2,
    subtype: 'FE',
    nameKey: 'quickAdd.template.fertilization.name'
  },
  {
    id: 'bloom_nutrition',
    backendEventType: 2,
    subtype: 'FE',
    nameKey: 'quickAdd.template.bloomNutrition.name'
  },
  {
    id: 'pest_control',
    backendEventType: 2,
    subtype: 'PE',
    nameKey: 'quickAdd.template.pestControl.name'
  },
  {
    id: 'herbicide',
    backendEventType: 2,
    subtype: 'HE',
    nameKey: 'quickAdd.template.herbicide.name'
  },
  {
    id: 'fungicide',
    backendEventType: 2,
    subtype: 'FU',
    nameKey: 'quickAdd.template.fungicide.name'
  },
  // Soil (event_type 5)
  {
    id: 'organic_amendment',
    backendEventType: 5,
    subtype: 'OM',
    nameKey: 'quickAdd.template.organicAmendment.name'
  }
];

export const templatesForEventType = (eventType: number): TemplateAccelerator[] =>
  TEMPLATE_ACCELERATORS.filter((t) => t.backendEventType === eventType);

/**
 * Form values a template pick merges into the wizard: the subtype plus the
 * template's field defaults, minus unit fields (the tab's US defaults win).
 */
/**
 * Fields a template is allowed to prefill.
 *
 * 🔴 2026-08-19 — an ALLOW-LIST, deliberately, and it must stay one.
 *
 * The merge used to be "every quickEventFields default except *_unit", and the chemical
 * templates carry defaults that are not operational suggestions at all — they are regulatory
 * assertions about the operator's inputs:
 *
 *   organic_approved: 'no'      -> 'no' is in ORGANIC_PROHIBITED_VALUES on the backend, so
 *                                  picking the "Fungicide" template and not noticing this
 *                                  field recorded a PROHIBITED-SUBSTANCE APPLICATION. That
 *                                  resets the § 205.202(b) 36-month clock and prints the
 *                                  parcel as in-transition on the certifier packet.
 *   chemical_subtype: 'synthetic_fungicide'   -> a National List classification
 *   restricted_use_pesticide: 'false'         -> an EPA RUP statement
 *   concentration: '10-10-10' / '50%'         -> a fabricated product specification
 *   weather_conditions: 'calm_dry'            -> an observation nobody made
 *   compost_temperature_reached_131f: 'yes'   -> a § 205.203(c)(2) compost attestation
 *   seed_certification_status: 'certified_organic'  -> a § 205.204 certification claim
 *   previous_use / cleaning_protocol          -> § 205.272 commingling statements
 *
 * A template may suggest HOW MUCH and HOW. It may never answer a question that asserts a
 * compliance status, a classification, or an observation — those are the operator's to make,
 * and `cleanEventData` is a passthrough, so anything merged here reaches the saved record
 * whether the form renders the field or not.
 *
 * An allow-list because a denylist fails OPEN: the next compliance field added to
 * quickEventFields would be prefilled by default, and that is exactly how this one shipped.
 */
export const PREFILLABLE_FIELDS = new Set<string>([
  // Scope / quantity
  'area_covered',
  'area_treated',
  'volume_applied',
  'yield_quantity',
  'amendment_amount_numeric',
  'irrigation_depth',
  'transportation_distance',
  // Energy
  'fuel_type',
  'fuel_consumed',
  'equipment_hours',
  'application_fuel_type',
  'application_fuel_consumed',
  // Method / equipment — how the operation is carried out
  'application_method',
  'irrigation_method',
  'water_source',
  'equipment_type',
  'equipment_operation_type',
  'amendment_type',
  'seeds_source',
  'production_efficiency',
  'operation_efficiency'
]);

export const templatePrefillValues = (tpl: TemplateAccelerator): Record<string, unknown> => {
  const defaults = getDefaultFieldValues(tpl.id);
  const merged: Record<string, unknown> = { type: tpl.subtype };
  Object.entries(defaults).forEach(([key, value]) => {
    // Unit fields are stripped for a different reason: quickEventFields defaults are
    // metric-leaning ('ha') while the tabs already default to the operation's US units via
    // useDefaultUnits(), and the tab must win.
    if (key.endsWith('_unit')) return;
    if (!PREFILLABLE_FIELDS.has(key)) return;
    merged[key] = value;
  });
  return merged;
};
