/**
 * General events: the form's field names and the model's, in one place.
 *
 * 🔴 MEASURED IN PRODUCTION 2026-10-20. A crew message ("Fixed the leak in the drip line")
 * offered "Activity Type: Maintenance", the operator tapped, the banner said "1 field filled",
 * and the select underneath still read "Select activity type...". The value was valid; it was
 * written under the MODEL name `activity_type` while the form's select is `name="type"`, so the
 * record was saved without the one fact the message carried.
 *
 * The rename existed only on the way OUT (submit). The voice and crew-note paths write the
 * registry's names, which are the model's, so every General field they fill landed in a key the
 * tab does not read: all three of them.
 */
export const GENERAL_FORM_TO_MODEL: Readonly<Record<string, string>> = {
  type: 'activity_type',
  duration_hours: 'duration',
  participants: 'people_involved'
};

/** The same table, read the other way, for anything writing INTO the form. */
export const GENERAL_MODEL_TO_FORM: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(GENERAL_FORM_TO_MODEL).map(([form, model]) => [model, form])
);

/**
 * The activity wizard's payload builder: form values in, request body out.
 *
 * Moved out of NewEvent's submit handler verbatim (Run 8b R4, 2026-10-15) so a test can run the
 * REAL save path on a form state, instead of asserting on state and inferring the payload. It is
 * still a passthrough with no allowlist: every key in `data` that is not undefined/null reaches
 * the request, which is why what a template or a voice merge writes into the form matters.
 *
 * `data` is the form values plus event_type/parcels/album fields. `eventTypeConfigName` is
 * NewEvent's `eventTypeConfig` name for the type in force ('weather', 'production', 'chemical',
 * 'general', 'soil_management', ...).
 */
export interface CleanEventPayloadContext {
  activeEventType: number;
  isEdit: boolean;
  eventTypeConfigName?: string;
}

export const cleanEventPayload = (
  data: Record<string, any>,
  { activeEventType, isEdit, eventTypeConfigName }: CleanEventPayloadContext
): Record<string, any> => {
  const cleaned: Record<string, any> = {};

  // System/structural fields that should NOT be sent as empty strings
  // All other fields (user inputs) CAN be cleared to empty
  const systemFields = [
    'carbon_data',
    'carbon_calculation',
    'image',
    'index',
    'companyId',
    'establishmentId',
    'parcelId',
    'extra_data'
    // NOTE: volume_unit and area_unit ARE now included - they're needed for proper unit display
  ];

  // Helper: Check if a field value should be included
  // - Always exclude undefined and null
  // - For system fields: also exclude empty strings
  // - For user fields: allow empty strings (so they can be cleared)
  const shouldIncludeField = (key: string, value: unknown): boolean => {
    if (value === undefined || value === null) return false;
    if (value === '' && systemFields.includes(key)) return false;
    return true;
  };

  // Write the notes box onto the payload.
  //
  // 🔴 2026-08-15. This used to be `finalKey = 'description'` — a RENAME, repeated in
  // six branches — and it caused two separate bugs:
  //
  //  1. DATA LOSS on edit. The notes box is prefilled from `observation` only (by
  //     design: `description` on a legacy row may be AI-template output, and seeding
  //     the box from it would promote machine copy into the quoted farmer voice on the
  //     consumer page). So a row whose text lives in `description` opens with an empty
  //     box, and the rename posted that empty string straight back over the stored
  //     description. Measured: opening a Planting event and pressing Update without
  //     touching anything replaced "Replanted 40 Hass on Duke 7 rootstock, rows 1-12,
  //     east buffer." with "Production activity: Planting".
  //  2. `observation` WAS NEVER STORED. Because it was renamed rather than copied, no
  //     event created through this form ever wrote the column — so ConsumerEventCard's
  //     "Farmer's Field Notes" block, which quotes `observation`, could never render
  //     for a form-created event.
  //
  // Both are fixed by copying instead of renaming, and by refusing to blank a stored
  // description with an empty box. The backend carries the same guard
  // (ensure_event_description) so an API client cannot reintroduce case 1.
  const applyNotesField = (target: Record<string, any>, value: unknown) => {
    target.observation = value;
    if (String(value ?? '').trim() || !isEdit) {
      target.description = value;
    }
  };

  // Events that require observation → description mapping (all except Chemical)
  const eventsWithObservation = [0, 1, 3, 4, 5, 6, 7]; // Weather, Production, Other Farm Activities, Equipment, Soil Management, Pest Management, Business

  // Special handling for weather events (activeEventType === 0)
  if (activeEventType === 0) {
    // For weather events, send fields FLAT (not in extra_data)
    // The backend serializer's to_internal_value will handle moving them to extra_data
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Use shouldIncludeField helper - allows empty strings for user fields
      if (shouldIncludeField(key, value) && !systemFields.includes(key)) {
        let finalKey = key;

        if (key === 'observation') {
          applyNotesField(cleaned, value);
          return;
        }

        cleaned[finalKey] = value;
      }
    });

    return cleaned;
  }

  // Special handling for production events (activeEventType === 1)
  if (activeEventType === 1) {
    // For production events, include the type field (PL, HA, IR, PR)
    // The backend ProductionEvent model requires this field
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Use shouldIncludeField helper - allows empty strings for user fields
      if (shouldIncludeField(key, value)) {
        let finalKey = key;

        // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
        if (key === 'operating_hours') {
          finalKey = 'equipment_hours';
        }

        if (key === 'observation') {
          applyNotesField(cleaned, value);
          return;
        }

        cleaned[finalKey] = value;
      }
    });

    return cleaned;
  }

  // SOIL MANAGEMENT EVENT MAPPING (activeEventType === 5)
  if (activeEventType === 5) {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Use shouldIncludeField helper - allows empty strings for user fields
      if (shouldIncludeField(key, value)) {
        let finalKey = key;

        // CRITICAL FIX: Map form field 'depth' to backend field 'working_depth'
        // For TI (Tillage) events, SoilManagementTab sends 'tillage_depth' instead of 'depth'
        if (key === 'depth' || key === 'tillage_depth') {
          finalKey = 'working_depth';
        }
        if (key === 'tillage_depth_unit') {
          finalKey = 'depth_unit';
        }

        if (key === 'observation') {
          applyNotesField(cleaned, value);
          return;
        }

        cleaned[finalKey] = value;
      }
    });

    return cleaned;
  }

  // GENERAL EVENT MAPPING (activeEventType === 3)
  // Frontend form uses different field names than the backend model:
  //   type → activity_type, duration_hours → duration, participants → people_involved
  // NOP contamination booleans come in as 'true'/'false' strings from the
  // Switch controllers — coerce to real booleans, and let empty date/decimal
  // fields fall through as null (backend nullable_fields also strips them).
  if (activeEventType === 3) {
    const generalBooleanKeys = new Set(['is_contamination_incident']);
    // Three states (OV-RK-C15): 'true', 'false', or unanswered. Coercing '' to false printed an
    // unanswered question as "No" on the dossier, so blank is sent as null.
    const generalTriStateKeys = new Set(['certifier_notified']);
    const generalNullableKeys = new Set([
      'contamination_source',
      'contamination_affected_area',
      'corrective_action_taken',
      'corrective_action_date',
      'certifier_notification_date'
    ]);

    Object.keys(data).forEach((key) => {
      let value = data[key];

      // Coerce NOP booleans first so shouldIncludeField sees the real type
      if (generalBooleanKeys.has(key)) {
        value = value === true || value === 'true';
        cleaned[key] = value;
        return;
      }
      if (generalTriStateKeys.has(key)) {
        cleaned[key] =
          value === true || value === 'true'
            ? true
            : value === false || value === 'false'
            ? false
            : null;
        return;
      }

      // Empty strings on nullable date/decimal/text fields must become null,
      // otherwise DateField/DecimalField reject them with 400.
      if (generalNullableKeys.has(key) && (value === '' || value == null)) {
        cleaned[key] = null;
        return;
      }

      if (shouldIncludeField(key, value)) {
        let finalKey = key;

        // Field name remapping: frontend form → backend model, from the one table that the
        // voice merge reads in reverse.
        if (GENERAL_FORM_TO_MODEL[key]) finalKey = GENERAL_FORM_TO_MODEL[key];
        if (key === 'observation') {
          applyNotesField(cleaned, value);
          return;
        }

        cleaned[finalKey] = value;
      }
    });

    return cleaned;
  }

  // UNIVERSAL MAPPING for all other event types that use observation
  if (eventsWithObservation.includes(activeEventType)) {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      // Use shouldIncludeField helper - allows empty strings for user fields
      if (shouldIncludeField(key, value)) {
        let finalKey = key;

        if (key === 'observation') {
          applyNotesField(cleaned, value);
          return;
        }

        cleaned[finalKey] = value;
      }
    });

    return cleaned;
  }

  // Default handling for Chemical events and any other event types
  // List of fields that should NOT be sent to the backend
  const excludedFields = [
    'carbon_data',
    'carbon_calculation',
    'image',
    'index', // Remove index field - not expected by backend
    'companyId', // Remove camelCase fields - use snake_case for backend
    'establishmentId',
    'parcelId'
    // NOTE: volume_unit and area_unit ARE now included - they're needed for proper unit display
  ];

  // Only exclude 'type' field for event types that don't use it
  // Weather, Production, Soil Management, and Chemical events DO use the type field for sub-types
  // SPRINT 6 FIX (2025-12-24): Added 'chemical' - Chemical events use type for FE/PE/FU/HE
  const eventTypesUsingTypeField = ['weather', 'production', 'soil_management', 'chemical'];
  // The wizard's own name for the event type in force (eventTypeConfig in NewEvent).
  const currentEventTypeName = eventTypeConfigName || 'general';

  if (!eventTypesUsingTypeField.includes(currentEventTypeName)) {
    excludedFields.push('type'); // Remove type field for event types that don't use sub-types
  }

  Object.keys(data).forEach((key) => {
    const value = data[key];

    // Use shouldIncludeField helper - allows empty strings for user fields
    // Only include valid values and exclude problematic fields
    if (shouldIncludeField(key, value) && !excludedFields.includes(key)) {
      let finalKey = key;

      // CRITICAL FIX: Map operating_hours to equipment_hours for backend compatibility
      if (key === 'operating_hours') {
        finalKey = 'equipment_hours';
      }

      if (key === 'observation') {
        applyNotesField(cleaned, value);
        return;
      }

      // CRITICAL FIX: Ensure extra_data is always a valid JSON object, not an array
      if (finalKey === 'extra_data') {
        // If extra_data is an array, convert it to an empty object
        // If it's already an object, keep it as is
        // If it's anything else, convert to empty object
        if (Array.isArray(value)) {
          cleaned[finalKey] = {}; // Convert array to empty object
        } else if (typeof value === 'object' && value !== null) {
          cleaned[finalKey] = value; // Keep valid object
        } else {
          cleaned[finalKey] = {}; // Convert other types to empty object
        }
      } else {
        cleaned[finalKey] = value;
      }
    }
  });

  return cleaned;
};
