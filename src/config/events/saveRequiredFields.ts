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
 * A day with no clock time, as the wizard holds and sends it: the bare `YYYY-MM-DD`. The server
 * decides "a day with no time" by the SHAPE of the date it receives (review of back #395), never by
 * its clock, so `T12:00` would be a stated noon. It stores the day at its noon placeholder itself.
 * '' when the value holds no day.
 */
export const dayWithoutTime = (value: unknown): string => {
  const day = String(value ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
};

/**
 * The wizard date once "The time is not on my record" is unticked: the time typed before the tick,
 * or, when there was none (the tick arrived by an edit, a draft or a type change), the bare day so
 * that only the time is left to enter. A known day is never blanked (review of app #371).
 */
export const dateAfterUntick = (current: unknown, timeBeforeTick: string): string => {
  const day = dayWithoutTime(current);
  if (!day) return '';
  return timeBeforeTick ? `${day}T${timeBeforeTick}` : day;
};

/** Whether a wizard date is a day and nothing else (`YYYY-MM-DD`, no time part). */
export const isDayOnly = (value: unknown): boolean =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/**
 * A ticked "Not on my record" wins over any concentration a voice note, a crew note or a late
 * re-offer would merge into the form (review of app #371). The box is disabled under the tick, so a
 * merged value would leave a form that cannot be saved and cannot be fixed. Same rule as the
 * recent-input prefill guard in ChemicalTab-ENHANCED.
 */
export const withoutConcentrationUnderFlag = <T extends Record<string, unknown>>(
  values: T,
  form: Record<string, unknown> | null | undefined
): T => {
  if (!values || !('concentration' in values) || !isTruthyFlag(form?.concentration_not_recorded)) {
    return values;
  }
  const { concentration: _heldBack, ...rest } = values;
  return rest as T;
};

/**
 * "The time is not on my record" on an input application, as the request carries it (OV-FJ-C12).
 *
 * Always a real bool, so unticking on an edit clears the stored mark. Ticked, the date is the bare
 * day, whatever a voice or crew-note offer wrote into it since. `conflict` is
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
