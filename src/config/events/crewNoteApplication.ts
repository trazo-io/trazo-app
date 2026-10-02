/**
 * Applications confirmed from a crew message: which records they are, and which values the message
 * may not fill. Mirrors `fieldnotes/services/confirmation.py` in trazo-back, which refuses the save
 * when these rules are broken; `crewNoteApplicationParity.test.ts` holds the two together.
 *
 * OSP alignment audit 2026-10, T29, Oscar's boundary (2026-10-01): an application may come from a
 * crew message, but its product, rate, quantity, area and unit are typed by the confirmer from their
 * own records, never filled from the message. The rule follows the SELECTED record type and its own
 * fields, never the inbox's keyword hint.
 */

import { VOICE_UNIT_COMPANIONS } from 'utils/voiceDataMapper';

/** A value key naming an input detail. Same pattern as the server's `INPUT_FIELD`. */
export const INPUT_FIELD =
  /(product|commercial_name|manufacturer|active_ingredient|epa|lot_number|rate|quantity|amount|volume|area|dose|dosage|concentration|npk|species|_numeric|_unit|method)/i;

export const CHEMICAL = 2;
export const SOIL = 5;
export const PEST = 6;
export const SOIL_APPLICATION_TYPES = ['PA', 'OM'];
export const PEST_APPLICATION_TYPES = ['BR'];

export const isApplicationRecord = (
  eventType: number | null | undefined,
  form: Record<string, unknown>
): boolean => {
  if (eventType === CHEMICAL) return true;
  if (eventType === SOIL) {
    if (SOIL_APPLICATION_TYPES.includes(String(form.type ?? ''))) return true;
    return Object.entries(form).some(
      ([key, value]) => key.startsWith('amendment_') && String(value ?? '').trim() !== ''
    );
  }
  if (eventType === PEST) return PEST_APPLICATION_TYPES.includes(String(form.type ?? ''));
  return false;
};

/**
 * Split offered values into those the message may fill and the input details it may not.
 *
 * A unit and its amount are ONE fact (`VOICE_UNIT_COMPANIONS`): withholding either withholds both.
 * Filtering key by key kept `fuel_consumed` while withholding `fuel_unit`, so a message in litres
 * could be written against the form's default "gal" (review of app #63).
 */
export const withoutInputValues = (
  values: Record<string, unknown>
): { allowed: Record<string, unknown>; withheld: string[] } => {
  const out = new Set(Object.keys(values).filter((key) => INPUT_FIELD.test(key)));
  Object.entries(VOICE_UNIT_COMPANIONS).forEach(([unit, owners]) => {
    const pair = [unit, ...owners].filter((key) => key in values);
    if (pair.some((key) => out.has(key))) pair.forEach((key) => out.add(key));
  });
  const allowed: Record<string, unknown> = {};
  Object.entries(values).forEach(([key, value]) => {
    if (!out.has(key)) allowed[key] = value;
  });
  return { allowed, withheld: Array.from(out) };
};
