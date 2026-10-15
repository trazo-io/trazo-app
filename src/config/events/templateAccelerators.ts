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

import { ACTIVITY_VERBS, type ActivityVerb } from 'config/activityVerbs';
import { getDefaultFieldValues, QUICK_EQUIPMENT_OPERATION_CODES } from 'config/quickEventFields';

export interface TemplateAccelerator {
  /** quickEventFields templateId */
  id: string;
  /** Backend event_type the template belongs to (1, 2, 5) */
  backendEventType: number;
  /**
   * The subtype this template is FOR. It is a filter, never a write: a template is offered only
   * on a record whose `type` already equals it, and applying one never changes `type`.
   */
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
 * A template may suggest HOW. It may never answer a question that asserts a compliance
 * status, a classification, or an observation — those are the operator's to make,
 * and `cleanEventData` is a passthrough, so anything merged here reaches the saved record
 * whether the form renders the field or not.
 *
 * An allow-list because a denylist fails OPEN: the next compliance field added to
 * quickEventFields would be prefilled by default, and that is exactly how this one shipped.
 */
export const PREFILLABLE_FIELDS = new Set<string>([
  // Run 8 (R8-03, 2026-10-05): no quantity and no energy. "Scope / quantity" (area, volume,
  // yield, amendment amount, irrigation depth, transport distance) and "Energy" (fuel type and
  // amount, equipment hours) were allowed as suggestions, so picking the Harvest template filled
  // 1 acre, 100 lb and 5 km before the grower had said anything. A number on a record is an
  // observation; it has to come from the person who made it. Only method fields remain.
  // Method / equipment — how the operation is carried out
  'application_method',
  'irrigation_method',
  'water_source',
  'equipment_type',
  'equipment_operation_type',
  'amendment_type',
  'seeds_source'
]);

/**
 * Form values a template pick merges into the wizard: the template's method defaults, minus
 * unit fields (the tab's US defaults win). NEVER `type`.
 *
 * Run 8b R4 (2026-10-15): this used to start from `{ type: tpl.subtype }`, so a template
 * re-answered the activity question. Picking "Harvest" on an Equipment cleanout record turned
 * it into a harvest while the heading, the auto-name and the cleanout preset stayed, and the
 * note typed under "certifier-only" was then saved on a subtype the buyer page shows. The
 * activity is answered in step 0 (verb tile, "Not X? Choose a different activity", voice
 * "Switch to X"); a template only fills fields for the activity already chosen.
 */
export const templatePrefillValues = (tpl: TemplateAccelerator): Record<string, unknown> => {
  const defaults = getDefaultFieldValues(tpl.id);
  const merged: Record<string, unknown> = {};
  Object.entries(defaults).forEach(([key, value]) => {
    // Unit fields are stripped for a different reason: quickEventFields defaults are
    // metric-leaning ('ha') while the tabs already default to the operation's US units via
    // useDefaultUnits(), and the tab must win.
    if (key.endsWith('_unit')) return;
    if (!PREFILLABLE_FIELDS.has(key)) return;
    merged[key] = value;
  });
  // Quick Add speaks words ('routine_maintenance'); the wizard and the backend speak codes
  // (MN). Merged raw, the Equipment maintenance template wrote a value no choice accepts.
  if (typeof merged.equipment_operation_type === 'string') {
    merged.equipment_operation_type =
      QUICK_EQUIPMENT_OPERATION_CODES[merged.equipment_operation_type] ??
      merged.equipment_operation_type;
  }
  return merged;
};

/**
 * Fields a verb tile presets as part of the activity's IDENTITY (`presetFields` in
 * config/activityVerbs). Today only `equipment_operation_type`: Cleanout is EM + 'CL'.
 * Derived, so the next preset added to a tile is covered without editing this file.
 */
export const DISCRIMINATING_PRESET_FIELDS: readonly string[] = [
  ...new Set(ACTIVITY_VERBS.flatMap((v) => Object.keys(v.presetFields || {})))
];

const isBlank = (value: unknown): boolean =>
  value === undefined || value === null || String(value).trim() === '';

export interface TemplateActivity {
  /** Backend event_type in force. */
  eventType: number | null | undefined;
  /** The wizard's current form values (`eventFormData`). */
  formData: Record<string, unknown> | null | undefined;
  /** The activity verb in force, when one was picked (tile, URL, repeat). */
  verb?: ActivityVerb;
}

/**
 * Does this template fill fields for the activity already chosen, without re-answering it?
 *
 * ONE rule for the picker and for the apply step:
 *   1. Same event type.
 *   2. The record's subtype is already answered and equals the template's. A template never
 *      answers the subtype, so a chemical record whose FE/PE/FU/HE question is still open is
 *      offered no template at all.
 *   3. For each preset that names the activity (Cleanout = EM + equipment_operation_type 'CL'),
 *      a template that carries that field must carry the activity's own value. The activity's
 *      value is the form's, falling back to the verb's preset; when neither has one, a template
 *      that would set it is refused, because setting it IS answering the activity.
 */
export const isTemplateCompatible = (
  tpl: TemplateAccelerator,
  { eventType, formData, verb }: TemplateActivity
): boolean => {
  if (eventType == null || tpl.backendEventType !== eventType) return false;
  const current = formData?.type;
  if (isBlank(current) || String(current) !== tpl.subtype) return false;
  const prefill = templatePrefillValues(tpl);
  return DISCRIMINATING_PRESET_FIELDS.every((field) => {
    if (!(field in prefill)) return true;
    const fromForm = formData?.[field];
    const activityValue = isBlank(fromForm) ? verb?.presetFields?.[field] : fromForm;
    if (isBlank(activityValue)) return false;
    return String(activityValue) === String(prefill[field]);
  });
};

/** The templates the picker offers: only those compatible with the activity in force. */
export const templatesForActivity = (activity: TemplateActivity): TemplateAccelerator[] =>
  activity.eventType == null
    ? []
    : templatesForEventType(activity.eventType).filter((tpl) =>
        isTemplateCompatible(tpl, activity)
      );

/**
 * The form after applying `tpl`, or `prev` itself (same reference, nothing changed) when the
 * template does not fit the activity. Pure, so the apply step refuses an incompatible template
 * whatever path offered it, and so the refusal is testable without mounting the wizard.
 *
 * Method fields only (`templatePrefillValues`); `type` and the identity presets are never
 * written here, so the record stays the activity the heading names.
 */
export const applyTemplateToForm = (
  prev: Record<string, unknown>,
  tpl: TemplateAccelerator,
  activity: Omit<TemplateActivity, 'formData'>
): Record<string, unknown> => {
  if (!isTemplateCompatible(tpl, { ...activity, formData: prev })) return prev;
  return { ...prev, ...templatePrefillValues(tpl) };
};
