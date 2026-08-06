/**
 * General Event Registry.
 *
 * No subtypes — free-form activity logging for any farm operation
 * that doesn't fit the 6 specialized event types.
 */

import type { EventRegistryEntry, FieldConfig } from './registry';
import {
  formatBoolean,
  formatDate,
  formatDurationHours,
  formatNumber,
  lookupEnumLabel,
  formatConsumerContaminationIncident
} from './formatters';

type GeneralData = Record<string, unknown>;

// Activity type labels — proper names for abbreviated/truncated values
const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  maintenance: 'Maintenance',
  planning: 'Planning',
  training: 'Training',
  documentation: 'Documentation',
  inspection: 'Inspection',
  meeting: 'Meeting',
  community: 'Community',
  precision_ag: 'Precision Agriculture',
  emergency: 'Emergency',
  other: 'Other'
};

const formatActivityType = (v: unknown): string | null => {
  if (typeof v !== 'string' || v === '') return null;
  // Hide the generic "Other" label on consumer surfaces — it adds no value
  // when a specific category (Training, Inspection, etc.) wasn't chosen.
  if (v === 'other') return null;
  // The form writes values this map does not cover (live data had `quality_control`),
  // and the old `?? v` printed the raw slug on the consumer card.
  return lookupEnumLabel(ACTIVITY_TYPE_LABELS, v);
};

const GENERAL_FIELDS: readonly FieldConfig<unknown, GeneralData>[] = [
  {
    name: 'name',
    labelKey: 'events.general.fields.name',
    valueType: 'string',
    required: true,
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
    name: 'activity_type',
    labelKey: 'events.general.fields.activityType',
    valueType: 'enum',
    enumSource: 'general_activity_types',
    formatter: formatActivityType,
    required: true,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // NOTE: consumer_card intentionally omitted — the activity name is already
    // rendered as the card hero title (via generateTitle → rawData.name).
    // Keeping it here would duplicate the title in Key Details.
    // Display-only: GeneralTab collects the event's `name`, not a separate `activity_name`.
    // The backend column exists and is shown if populated, but there is no input for it —
    // a `form` surface here would promise one that has never existed.
    name: 'activity_name',
    labelKey: 'events.general.fields.activityName',
    valueType: 'string',
    surfaces: {
      modal: 'immediate'
    }
  },
  {
    name: 'duration',
    labelKey: 'events.general.fields.duration',
    valueType: 'string',
    formatter: formatDurationHours,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'people_involved',
    labelKey: 'events.general.fields.peopleInvolved',
    valueType: 'number',
    formatter: formatNumber,
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    // See weatherEvent.ts for the full rationale: modal surface omitted so
    // the Field Notes top card isn't duplicated in the Detailed Information grid.
    name: 'observation',
    labelKey: 'events.common.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'secondary',
      preview: 'secondary',
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
    // Display-only: "other farm activity" covers admin, training and maintenance, which are
    // not crop-specific, so GeneralTab has no variety/growth-stage input. Declaring a
    // `form` surface for an input that does not exist guarantees a permanently empty field.
    name: 'variety',
    labelKey: 'events.common.fields.variety',
    valueType: 'string',
    surfaces: { modal: 'details' }
  },
  {
    name: 'growth_stage',
    labelKey: 'events.common.fields.growthStage',
    valueType: 'enum',
    enumSource: 'growth_stages',
    surfaces: { modal: 'details' }
  },

  // ---- NOP Compliance: Contamination Incident Reporting (7 CFR 205.201(b)) ----
  // All contamination fields share the same visibility gate: they only render when
  // `is_contamination_incident` is true. Django defaults `is_contamination_incident`
  // and `certifier_notified` to False (not null), so without this gate every
  // General/Other event would show "Is Contamination Incident: ✗" in Detailed
  // Information — pure noise on the 99%+ of events that are not incidents.
  {
    name: 'is_contamination_incident',
    labelKey: 'events.general.fields.isContaminationIncident',
    // A consumer surface must not report an incident as a bare "✓". The glyph reads as
    // POSITIVE — the one place a checkmark is exactly backwards — and "Is Contamination
    // Incident" is internal phrasing. The field is gated to render only when true, so the
    // consumer wording states plainly that something was recorded; the source, affected area
    // and corrective action render beside it. Withholding it was never an option: an incident
    // the grower logged is precisely what a transparency record exists to carry.
    consumerLabelKey: 'events.consumer.fields.contaminationIncident',
    consumerFormatter: formatConsumerContaminationIncident,
    valueType: 'boolean',
    formatter: formatBoolean,
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'contamination_source',
    labelKey: 'events.general.fields.contaminationSource',
    valueType: 'enum',
    enumSource: 'contamination_sources',
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'contamination_affected_area',
    labelKey: 'events.general.fields.contaminationAffectedArea',
    valueType: 'number',
    formatter: formatNumber,
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'corrective_action_taken',
    labelKey: 'events.general.fields.correctiveActionTaken',
    placeholderKey: 'events.general.fields.correctiveActionTakenPlaceholder',
    valueType: 'text',
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'corrective_action_date',
    labelKey: 'events.general.fields.correctiveActionDate',
    valueType: 'date',
    // Without this the raw ISO string ("2026-03-17") renders verbatim — `valueType: 'date'`
    // is metadata, not behaviour; the resolver's defaultFormatter just stringifies.
    formatter: formatDate,
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'certifier_notified',
    labelKey: 'events.general.fields.certifierNotified',
    valueType: 'boolean',
    formatter: formatBoolean,
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'certifier_notification_date',
    labelKey: 'events.general.fields.certifierNotificationDate',
    valueType: 'date',
    formatter: formatDate,
    visibleWhen: (e) => Boolean(e.is_contamination_incident),
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  }
];

export const generalEventRegistry: EventRegistryEntry<null, GeneralData> = {
  eventType: 3,
  eventTypeName: 'general',
  labelKey: 'events.types.general',
  subtypes: [],
  defaultPhotoTier: 'optional',
  fields: GENERAL_FIELDS
};
