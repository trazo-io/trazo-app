/**
 * Weather Event Registry.
 *
 * 8 subtypes: FR(Frost), DR(Drought), HL(Hailstorm), HT(High Temp),
 * TS(Tropical Storm), HW(High Winds), HH(High Humidity), LH(Low Humidity).
 *
 * Many Weather fields live in extra_data (not formal model columns).
 * The serializer extracts them into the response object, so the registry
 * can reference them by name as if they were model fields.
 */

import type { EventRegistryEntry, FieldConfig, FieldFormatter, WeatherSubtype } from './registry';
import {
  formatDate,
  formatDurationHours,
  formatDurationMinutes,
  formatHumidityPercent,
  formatKilometersPerHour,
  formatMillimeters,
  formatTemperature
} from './formatters';

type WeatherData = Record<string, unknown>;

// A zero or negative duration is "nothing recorded", not "0 hours": the card used to drop it
// and must keep doing so now that the unit text lives in the shared formatters.
const positiveOnly =
  (format: FieldFormatter<number | string>): FieldFormatter<number | string, WeatherData> =>
  (value, event, intl) => {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return Number.isFinite(num) && num > 0 ? format(value, event, intl) : null;
  };

const WEATHER_FIELDS: readonly FieldConfig<unknown, WeatherData>[] = [
  // ---- Core (ALL subtypes) ----
  {
    // `observation` is rendered by EventDetailsModal as the top "Field Notes"
    // card (reading event.description — frontend renames observation→description
    // before POSTing to satisfy CommonEvent.description NOT NULL). We do NOT
    // declare a `modal` surface here to avoid duplicating the same text in the
    // Detailed Information grid below the Field Notes card.
    name: 'observation',
    labelKey: 'events.weather.fields.observation',
    valueType: 'text',
    surfaces: {
      form: 'immediate',
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

  // ---- Frost (FR) ----
  {
    name: 'lower_temperature',
    labelKey: 'events.weather.fields.lowerTemperature',
    valueType: 'number',
    visibleForSubtypes: ['FR'],
    formatter: formatTemperature,
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    // HW form captures `protection_measures` (separate field), not way_of_protection.
    // Only FR and HL forms collect way_of_protection.
    name: 'way_of_protection',
    labelKey: 'events.weather.fields.protectionMethod',
    valueType: 'string',
    visibleForSubtypes: ['FR', 'HL'],
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // HW-specific companion to way_of_protection; the form collects this as
    // a distinct field to capture wind-specific mitigations (securing
    // equipment, protecting young plants, etc.).
    name: 'protection_measures',
    labelKey: 'events.weather.fields.protectionMeasures',
    valueType: 'string',
    visibleForSubtypes: ['HW'],
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- Drought (DR) ----
  {
    name: 'water_deficit',
    labelKey: 'events.weather.fields.waterDeficit',
    valueType: 'string',
    visibleForSubtypes: ['DR'],
    formatter: formatMillimeters,
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },

  // ---- Hailstorm (HL) ----
  // Sprint 2 Epic 2.1.3 removed the `diameter` and `weight` form inputs
  // (excessive detail, no consumer impact). The registry entries were
  // pruned to match so the resolver doesn't render empty slots.

  // ---- High Temperature (HT) ----
  {
    name: 'highest_temperature',
    labelKey: 'events.weather.fields.highestTemperature',
    valueType: 'number',
    visibleForSubtypes: ['HT'],
    formatter: formatTemperature,
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'start_date',
    labelKey: 'events.weather.fields.startDate',
    valueType: 'string',
    visibleForSubtypes: ['HT'],
    formatter: formatDate,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'end_date',
    labelKey: 'events.weather.fields.endDate',
    valueType: 'string',
    visibleForSubtypes: ['HT'],
    formatter: formatDate,
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- Storm / Wind (TS, HW) ----
  {
    name: 'wind_speed',
    labelKey: 'events.weather.fields.windSpeed',
    valueType: 'string',
    visibleForSubtypes: ['TS', 'HW'],
    formatter: formatKilometersPerHour,
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },
  {
    name: 'precipitation_amount',
    labelKey: 'events.weather.fields.precipitationAmount',
    valueType: 'string',
    visibleForSubtypes: ['TS'],
    formatter: formatMillimeters,
    surfaces: {
      timeline: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },

  // ---- Humidity (HH, LH) ----
  {
    name: 'humidity_level',
    labelKey: 'events.weather.fields.humidityLevel',
    valueType: 'string',
    visibleForSubtypes: ['HH', 'LH'],
    formatter: formatHumidityPercent,
    surfaces: {
      timeline: 'hero',
      card: 'hero',
      modal: 'hero',
      form: 'immediate',
      consumer_card: 'hero',
      consumer_timeline: 'hero'
    }
  },

  // ---- Shared across multiple subtypes ----
  // Duration is only captured by the form for HL/TS/HW/HH/LH. FR uses
  // lower_temperature only, DR uses water_deficit only, HT uses start_date/
  // end_date instead. Restrict visibility to avoid rendering empty slots.
  //
  // ONE storage key, TWO units (AC-01, 2026-10-26): the hail form asks "Duration (minutes)"
  // and the other four ask hours (WeatherTab.jsx), both writing `duration`. A single hours
  // formatter printed a 7-minute hailstorm as "7 hours". The resolver gates each entry by
  // subtype and loops entry by entry, so two entries with disjoint `visibleForSubtypes` give
  // each subtype its own unit without the formatter having to guess the subtype from the event.
  // Keep the two surface blocks identical.
  {
    name: 'duration',
    labelKey: 'events.weather.fields.duration',
    valueType: 'string',
    visibleForSubtypes: ['HL'],
    formatter: positiveOnly(formatDurationMinutes),
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    name: 'duration',
    labelKey: 'events.weather.fields.duration',
    valueType: 'string',
    visibleForSubtypes: ['TS', 'HW', 'HH', 'LH'],
    // Rendered as a bare "Duration: 2" — two what? The form labels this field
    // "Storm duration in hours" (WeatherTab.jsx), so the unit is known; it was just never
    // attached on the way out. On several weather subtypes this is the ONLY field on the
    // card, so a unitless number was most of what a shopper got.
    formatter: positiveOnly(formatDurationHours),
    surfaces: {
      timeline: 'immediate',
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'immediate'
    }
  },
  {
    // Only the TS (Tropical Storm) form collects damage_assessment. HL and HW
    // forms do not, so restricting visibility keeps the slot from rendering
    // empty for those subtypes. If HL/HW damage fields are added later, widen
    // this list in lockstep with form + backend changes.
    name: 'damage_assessment',
    labelKey: 'events.weather.fields.damageAssessment',
    valueType: 'string',
    visibleForSubtypes: ['TS'],
    surfaces: {
      card: 'immediate',
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },
  {
    name: 'crop_impact',
    labelKey: 'events.weather.fields.cropImpact',
    valueType: 'string',
    visibleForSubtypes: ['HH', 'LH'],
    surfaces: {
      modal: 'immediate',
      form: 'immediate',
      consumer_card: 'secondary'
    }
  },

  // ---- CommonEvent fields ----
  {
    name: 'performed_by',
    labelKey: 'events.common.fields.performedBy',
    valueType: 'string',
    surfaces: { modal: 'details', form: 'details' }
  },
  {
    // Display-only: a weather observation is recorded against the parcel, not a crop, so
    // WeatherTab has no variety/growth-stage input. These columns exist on CommonEvent and
    // render if something else populates them; declaring a `form` surface for an input
    // that does not exist just guarantees a permanently empty field.
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
  }
];

export const weatherEventRegistry: EventRegistryEntry<WeatherSubtype, WeatherData> = {
  eventType: 0,
  eventTypeName: 'weather',
  labelKey: 'events.types.weather',
  subtypes: [
    { code: 'FR', labelKey: 'events.weather.subtypes.frost', photoTier: 'optional' },
    { code: 'DR', labelKey: 'events.weather.subtypes.drought', photoTier: 'optional' },
    { code: 'HL', labelKey: 'events.weather.subtypes.hailstorm', photoTier: 'optional' },
    { code: 'HT', labelKey: 'events.weather.subtypes.highTemperature', photoTier: 'optional' },
    { code: 'TS', labelKey: 'events.weather.subtypes.tropicalStorm', photoTier: 'optional' },
    { code: 'HW', labelKey: 'events.weather.subtypes.highWinds', photoTier: 'optional' },
    { code: 'HH', labelKey: 'events.weather.subtypes.highHumidity', photoTier: 'optional' },
    { code: 'LH', labelKey: 'events.weather.subtypes.lowHumidity', photoTier: 'optional' }
  ],
  defaultPhotoTier: 'optional',
  fields: WEATHER_FIELDS
};
