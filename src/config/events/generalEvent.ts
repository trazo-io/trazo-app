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
  formatConsumerContaminationIncident,
  isAffirmativeFlag
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
    // 🔴 A NUMBER OF HOURS, not free text, because that is what the form collects and what the
    // value has to survive as. MEASURED 2026-10-20: a crew message ("about three hours") answered
    // `duration: "3 hours"`, the banner formatted it as "Duration: 3 hours" and the operator
    // tapped, and the input underneath stayed EMPTY: it is `type="number"` (`duration_hours` in
    // GeneralTab), and a browser discards a non-numeric value silently.
    //
    // Declaring it a string meant the voice sanitiser took its string branch and passed the raw
    // answer through. As a number the same sanitiser reads "3 hours" as 3 and DROPS anything it
    // cannot read as a number ("all morning"), so the banner stops promising what the form
    // cannot hold. The model column stays a CharField and `formatDurationHours` renders either,
    // so nothing downstream changes.
    valueType: 'number',
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
    // The PRIVATE half of the note pair. `observation` above publishes in the grower's own words;
    // this is the box for everything they need recorded and no buyer should read.
    //
    // ⛔ No `preview`, no `consumer_card`, no `timeline`:
    //   - `consumer_card` would publish it, the one thing it must never do (the server also
    //     strips it — `PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS`).
    //   - `preview` is the "how consumers will see this event" card built from RAW WIZARD DATA,
    //     so showing it there would tell the grower a shopper is about to read it.
    name: 'private_note',
    labelKey: 'events.common.fields.privateNote',
    helpKey: 'events.common.help.privateNoteAudience',
    valueType: 'text',
    surfaces: {
      form: 'immediate',
      modal: 'secondary'
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
  {
    // Farm block / row / section beneath the parcel. Present on CommonEvent, so every event
    // type carries it — and it is already emitted as CA PUR box 22 (Block ID) by
    // pur_export_service.py. It is also where a COG Pro migration lands "Row/Section ID".
    name: 'block_id',
    labelKey: 'events.common.fields.blockId',
    valueType: 'string',
    // Modal only, deliberately. The value DISPLAYS whenever it is set — including when a COG Pro
    // migration lands "Row/Section ID" here — but there is no form input, because this tab has no
    // Field Details section and adding one for a single optional field would bloat the form.
    // Block identity is regulatory for pesticide applications (CA PUR box 22 -> ChemicalEvent)
    // and agronomically meaningful for production/soil/pest work; a weather observation, a
    // business transaction and a general note are not block-scoped in the same way.
    surfaces: { modal: 'details' }
  },

  // ---- Contamination Incident Reporting — § 205.400(f)(1) + § 205.272 ----
  // Corrected 2026-08-15: § 205.201(b) is the "substitute another government plan for the
  // OSP" clause, not a contamination provision.
  // All contamination fields share the same visibility gate: they only render when
  // `is_contamination_incident` is true. Django defaults `is_contamination_incident` to False
  // (`certifier_notified` is null until answered, OV-RK-C15), so without this gate every
  // General/Other event would show "Is Contamination Incident: ✗" in Detailed
  // Information — pure noise on the 99%+ of events that are not incidents.
  {
    name: 'is_contamination_incident',
    labelKey: 'events.general.fields.isContaminationIncident',
    // A consumer surface must not report an incident as a bare "✓". The glyph reads as
    // POSITIVE — the one place a checkmark is exactly backwards — and "Is Contamination
    // Incident" is internal phrasing. The field is gated to render only when true, so the
    // consumer wording states plainly that something was recorded; the source, the affected
    // area and the resolution date render beside it. (NOT the corrective-action narrative —
    // that is owner-gated server-side, which is why it lost its consumer tier below.)
    // Withholding it was never an option: an incident the grower logged is precisely what a
    // transparency record exists to carry.
    consumerLabelKey: 'events.consumer.fields.contaminationIncident',
    consumerFormatter: formatConsumerContaminationIncident,
    valueType: 'boolean',
    formatter: formatBoolean,
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
    // NO consumer_card, matching its sibling `certifier_notified` below. The server never
    // sends this to a shopper: PublicHistorySerializer owner-gates it because the operator's
    // narrative routinely names the certifier, the lab and the neighbouring farm the drift
    // came from. Declaring a consumer tier for a value the API always nulls did nothing on the
    // card itself — but the producer's EventDetailsModal derives its "On your buyer page"
    // badge from exactly this map, so the grower was told a field was published that never
    // could be. A tier here is a promise about the payload, not a preference.
    surfaces: {
      modal: 'secondary',
      form: 'secondary'
    }
  },
  {
    name: 'corrective_action_date',
    labelKey: 'events.general.fields.correctiveActionDate',
    // "Corrective Action Date" is the right label beside the corrective action. On a consumer
    // card there IS no corrective action — the narrative is owner-gated above — so that label
    // points at something the shopper cannot see and reads as a missing row. What the date
    // actually tells them is when the incident was resolved, which is a fact on its own.
    consumerLabelKey: 'events.consumer.fields.contaminationResolvedOn',
    valueType: 'date',
    // Without this the raw ISO string ("2026-03-17") renders verbatim — `valueType: 'date'`
    // is metadata, not behaviour; the resolver's defaultFormatter just stringifies.
    formatter: formatDate,
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
    visibleWhen: (e) => isAffirmativeFlag(e.is_contamination_incident),
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
