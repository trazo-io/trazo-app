/**
 * The fields the wizard's save refuses to send without, per event type.
 *
 * The tabs validate their own forms; this is the last gate before the request, and it must agree
 * with them. It lived inline in NewEvent.jsx with two copies of the chemical list (single parcel and
 * several parcels), and the copies drifted: the single list skipped `concentration` for hand-placed
 * pheromone dispensers, which carry no tank concentration, and the several-parcels list did not,
 * so a valid multi-parcel dispenser record was refused at save with "missing: Concentration".
 * One function, one dispenser rule.
 */
import { isDispenserRecord } from './enums';

interface SaveContext {
  /** Several parcels: amount and area are asked per parcel, on the cards, not in the form. */
  multiParcel?: boolean;
}

const isTruthyFlag = (value: unknown) => value === true || value === 'true' || value === 'on';

export const requiredFieldsForSave = (
  eventType: number,
  data: Record<string, unknown>,
  { multiParcel = false }: SaveContext = {}
): string[] => {
  switch (eventType) {
    case 2: {
      if (isTruthyFlag(data.is_summary)) {
        // Summary mode: an active-ingredient total replaces volume, area and concentration.
        return ['type', 'commercial_name', 'application_method'];
      }
      const dispenser = isDispenserRecord(
        data.type,
        data.application_method ?? data.way_of_application
      );
      // "Not on my record": the operator stated the source record does not show it (OV-FJ-C12).
      // That answers the question, so the save does not ask for a value nobody observed.
      const notOnRecord = isTruthyFlag(data.concentration_not_recorded);
      return [
        'type',
        'commercial_name',
        ...(multiParcel ? [] : ['volume_applied', 'area_treated']),
        ...(dispenser || notOnRecord ? [] : ['concentration']),
        'application_method'
      ];
    }
    case 3:
      return ['name']; // General
    case 7:
      return ['business_type']; // Business uses business_type, not the legacy `type`
    case 0: // Weather
    case 1: // Production: other fields are optional but encouraged
    case 4: // Equipment: fuel data comes from the form inputs
    case 5: // Soil
    case 6: // Pest
      return ['type'];
    default:
      return [];
  }
};

/**
 * A day with no clock time, as the wizard sends it: noon, the encoding imported day-only rows
 * use (trazo-back `cogpro_import._as_event_datetime`), so it lands on the same calendar day in
 * every zone. A placeholder, never shown as a time. '' when the value holds no day.
 */
export const dayWithoutTime = (value: unknown): string => {
  const day = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? `${day}T12:00` : '';
};

/**
 * "The time is not on my record" on an input application, as the request carries it (OV-FJ-C12).
 *
 * Always a real bool, so unticking on an edit clears the stored mark. Ticked, the date is the day
 * at the noon placeholder, whatever a voice or crew-note offer wrote into it since. `conflict` is
 * true when a CA start or completion time sits beside the tick: the server refuses that pair (the
 * mark or a time, never both), so the wizard says so before the request.
 */
export const withTimeNotRecorded = (
  data: Record<string, unknown>
): { data: Record<string, unknown>; conflict: boolean } => {
  const flagged = isTruthyFlag(data.time_not_recorded);
  if (!flagged) return { data: { ...data, time_not_recorded: false }, conflict: false };
  return {
    data: { ...data, time_not_recorded: true, date: dayWithoutTime(data.date) },
    conflict: Boolean(data.application_start || data.application_end)
  };
};
