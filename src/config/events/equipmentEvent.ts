/**
 * Equipment Event Registry (event type 4).
 *
 * DEPRECATED MODEL, LIVE DATA. `EquipmentEvent` was superseded by `ProductionEvent` subtype
 * 'EM', so the UI no longer offers Equipment as a choice when creating an event — but rows
 * created before that merge are still in the database and still render on the consumer
 * timeline's "full record" view.
 *
 * This entry used to be an empty placeholder (`fields: []`), which meant
 * `getFieldsForSurface(4, …)` returned nothing and every equipment event silently fell back
 * to the legacy English-only display path. That is why it is filled in now: not to encourage
 * new equipment events, but so the existing ones display like everything else and localize
 * into es-419.
 *
 * Field names below mirror exactly what `PublicHistorySerializer.get_events()` emits for the
 * equipment family — note they are the LEGACY column names (`hours_operated`, `area_worked`,
 * `equipment` for the machine name), which differ from ProductionEvent's
 * (`equipment_hours`, `area_covered`, `equipment_type`). That difference is the reason this
 * cannot simply be aliased onto the production registry.
 */

import type { EquipmentSubtype, EventRegistryEntry, FieldConfig } from './registry';
import { formatArea, formatFuelConsumption, formatNumber } from './formatters';

type EquipmentData = Record<string, unknown>;

// Operation-type code -> ENGLISH label. Mirrors EQUIPMENT_OPERATION_TYPE in
// trazo-back/common/field_registry.py and the equipment_operation_type map in
// utils/fieldDisplayUtils.ts (kept identical on purpose, so the registry and legacy paths
// cannot disagree about what "MN" means).
//
// English, not i18n keys, because `getFieldsForSurface` takes no `intl` — registry
// formatters are locale-blind by design in this codebase (see the note in
// localizeFieldValue). Localization happens downstream: ConsumerEventCard runs every
// resolved value through `localizeFieldValue(value, intl.locale)`, which looks the English
// string up in `utils/fieldValues.es.ts`. Returning a dotted i18n key here would render the
// key itself on screen.
const OPERATION_TYPE_LABELS: Record<string, string> = {
  FC: 'Fuel Consumption',
  MN: 'Maintenance',
  RE: 'Repair',
  CA: 'Calibration',
  BD: 'Breakdown',
  EI: 'Inspection',
  CL: 'Cleaning'
};

const lookupLabel = (table: Record<string, string>, v: unknown): string | null =>
  typeof v === 'string' && v !== '' ? table[v] ?? v : null;

const EQUIPMENT_FIELDS: readonly FieldConfig<unknown, EquipmentData>[] = [
  {
    name: 'name',
    labelKey: 'events.equipment.fields.operationName',
    valueType: 'string',
    surfaces: { card: 'hero', modal: 'hero', consumer_card: 'hero' }
  },
  {
    // The machine itself. Serialized as `equipment` (from EquipmentEvent.equipment_name).
    name: 'equipment',
    labelKey: 'events.equipment.fields.equipmentName',
    valueType: 'string',
    surfaces: { timeline: 'immediate', modal: 'immediate', consumer_card: 'immediate' }
  },
  {
    name: 'operation_type',
    labelKey: 'events.equipment.fields.operationType',
    valueType: 'enum',
    formatter: (v) => lookupLabel(OPERATION_TYPE_LABELS, v),
    surfaces: { timeline: 'immediate', modal: 'immediate', consumer_card: 'immediate' }
  },
  {
    name: 'equipment_type',
    labelKey: 'events.equipment.fields.equipmentType',
    valueType: 'string',
    surfaces: { modal: 'secondary', consumer_card: 'secondary' }
  },
  {
    name: 'area_worked',
    labelKey: 'events.equipment.fields.areaWorked',
    valueType: 'number',
    formatter: formatArea,
    unitField: 'area_unit',
    surfaces: { modal: 'immediate', consumer_card: 'immediate' }
  },
  {
    name: 'hours_operated',
    labelKey: 'events.equipment.fields.hoursOperated',
    valueType: 'number',
    formatter: formatNumber,
    surfaces: { modal: 'secondary', consumer_card: 'secondary' }
  },
  {
    // Carbon-relevant, so it must NOT be promoted to a hero tier on any consumer surface —
    // `surfaces.ts` enforces allowsHeroCarbon:false there (FTC guard).
    name: 'fuel_consumed',
    labelKey: 'events.equipment.fields.fuelConsumed',
    valueType: 'number',
    formatter: formatFuelConsumption,
    unitField: 'fuel_unit',
    carbonRelevant: true,
    surfaces: { modal: 'secondary' }
  },
  {
    name: 'fuel_type',
    labelKey: 'events.equipment.fields.fuelType',
    valueType: 'enum',
    enumSource: 'fuel_types',
    carbonRelevant: true,
    surfaces: { modal: 'details' }
  },
  {
    // Farmer self-assessment. Kept off consumer surfaces deliberately: it is an unverified
    // self-grade, and the backend no longer lets it influence carbon either (see the
    // production_efficiency note in the carbon calculators).
    name: 'operation_efficiency',
    labelKey: 'events.equipment.fields.operationEfficiency',
    valueType: 'enum',
    // Shared enum — same three values as ProductionEvent.production_efficiency, so reuse
    // its option list rather than defining a parallel label map.
    enumSource: 'production_efficiency',
    surfaces: { modal: 'details' }
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
    surfaces: { card: 'immediate', modal: 'details', form: 'details' }
  },
  {
    // Omitted from consumer surfaces on purpose: ConsumerEventCard renders `observation`
    // verbatim as "Farmer's Field Notes" above the field grid, so listing it again in
    // Additional Information would duplicate it. Same rationale as weatherEvent.ts.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: { modal: 'details' }
  },
  {
    // The PRIVATE half of the note pair. `observation` above publishes in the grower's own words;
    // this is the box for everything they need recorded and no buyer should read.
    //
    // ⛔ No `preview`, no `consumer_card`, no `timeline`:
    //   - `consumer_card` would publish it, the one thing it must never do (the server also
    //     strips it — `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`).
    // Equipment has no form tab of its own (merged into Production in the UI), so this declares
    // `modal` only: a `form` surface would promise an input no tab can render.
    //   - `preview` is the "how consumers will see this event" card built from RAW WIZARD DATA,
    //     so showing it there would tell the grower a shopper is about to read it.
    name: 'private_note',
    labelKey: 'events.common.fields.privateNote',
    helpKey: 'events.common.help.privateNoteAudience',
    valueType: 'text',
    surfaces: {
      modal: 'secondary'
    }
  },
];

export const equipmentEventRegistry: EventRegistryEntry<EquipmentSubtype, EquipmentData> = {
  eventType: 4,
  eventTypeName: 'equipment',
  labelKey: 'events.types.equipment',
  subtypes: [
    { code: 'FC', labelKey: 'events.equipment.subtypes.fuelConsumption', photoTier: 'optional' },
    { code: 'MN', labelKey: 'events.equipment.subtypes.maintenance', photoTier: 'optional' },
    { code: 'RE', labelKey: 'events.equipment.subtypes.repair', photoTier: 'optional' },
    { code: 'CA', labelKey: 'events.equipment.subtypes.calibration', photoTier: 'optional' },
    { code: 'BD', labelKey: 'events.equipment.subtypes.breakdown', photoTier: 'optional' },
    { code: 'EI', labelKey: 'events.equipment.subtypes.inspection', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'optional',
  fields: EQUIPMENT_FIELDS
};
