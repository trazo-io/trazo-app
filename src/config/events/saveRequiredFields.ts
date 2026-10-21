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
      return [
        'type',
        'commercial_name',
        ...(multiParcel ? [] : ['volume_applied', 'area_treated']),
        ...(dispenser ? [] : ['concentration']),
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
