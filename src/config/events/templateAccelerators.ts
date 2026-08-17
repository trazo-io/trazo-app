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
export const templatePrefillValues = (tpl: TemplateAccelerator): Record<string, unknown> => {
  const defaults = getDefaultFieldValues(tpl.id);
  const merged: Record<string, unknown> = { type: tpl.subtype };
  Object.entries(defaults).forEach(([key, value]) => {
    if (!key.endsWith('_unit')) {
      merged[key] = value;
    }
  });
  return merged;
};
