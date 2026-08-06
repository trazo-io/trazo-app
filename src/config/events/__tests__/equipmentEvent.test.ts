/**
 * Phase 2 / C4 — equipment events (type 4) must resolve real registry fields.
 *
 * `EquipmentEvent` is a deprecated model — it was merged into `ProductionEvent` subtype 'EM'
 * — but pre-merge rows are still in the database (41 in the dev DB when this was written)
 * and still render on the consumer timeline's full record. The registry entry used to be an
 * empty placeholder (`fields: []`), so `getFieldsForSurface(4, …)` returned nothing and every
 * one of those events silently fell through to the legacy English-only display path.
 *
 * The field NAMES matter here, and they must be the names that survive NORMALIZATION, not
 * the raw ones the API sends. The first version of this test fed a hand-built raw payload
 * straight into the resolver and passed — while the real card rendered nothing from the
 * registry, because `normalizeEquipmentEventData` sits in between and its field allowlist
 * decides what actually arrives. So the event under test is now built by running a realistic
 * API payload through the normalizer, exactly as ProductDetail does.
 */
import { describe, it, expect } from 'vitest';
import '../index';
import { getFieldsForSurface, getSubtypes } from '../index';
import { equipmentEventRegistry } from '../equipmentEvent';
import { localizeFieldValue } from '../../../utils/fieldDisplayUtils';
import { normalizeBackendEventData } from '../../../utils/eventDataNormalizer';
import en from '../../../i18n/lang/en-US.json';
import es from '../../../i18n/lang/es-419.json';

/** Shaped like PublicHistorySerializer.get_events()'s equipment dict. */
const RAW_EQUIPMENT_PAYLOAD = {
  id: 'equipment_0',
  event_type: 4,
  type: 'equipment',
  name: 'Tractor service',
  equipment: 'John Deere 5075E Tractor',
  operation_type: 'MN',
  equipment_type: 'tractor',
  hours_operated: 6,
  area_worked: 12,
  area_unit: 'acres',
  fuel_consumed: 4.5,
  fuel_unit: 'gal',
  fuel_type: 'diesel',
  block_id: 'B-7',
  operation_efficiency: 'normal',
  observation: 'Replaced hydraulic filter',
  date: '2026-05-01'
};

// What the card actually receives.
const EQUIPMENT_EVENT = normalizeBackendEventData(4, RAW_EQUIPMENT_PAYLOAD) as Record<
  string,
  unknown
>;

describe('equipment registry resolves fields for the consumer card', () => {
  const resolved = getFieldsForSurface(4, 'MN' as any, 'consumer_card', EQUIPMENT_EVENT);
  const allFields = [
    ...resolved.hero,
    ...resolved.immediate,
    ...resolved.secondary,
    ...resolved.details
  ];

  it('resolves something at all (the regression this guards)', () => {
    expect(allFields.length).toBeGreaterThan(0);
  });

  it('surfaces the machine and the operation type', () => {
    const names = allFields.map((f) => f.name);
    expect(names).toContain('equipment');
    expect(names).toContain('operation_type');
  });

  it('reads the field names that survive normalization', () => {
    const names = allFields.map((f) => f.name);
    expect(names).toContain('hours_operated');
    expect(names).toContain('area_worked');
    // The ProductionEvent spellings must NOT be what this registry looks for.
    expect(names).not.toContain('equipment_hours');
    expect(names).not.toContain('area_covered');
  });

  it('keeps the units the normalizer used to drop', () => {
    // fuel_unit / area_unit were missing from normalizeEquipmentEventData's allowlist, so
    // the card rendered "Fuel Used: 10" with no unit at all. That normalizer bug is what
    // this guards, so the assertion moved to the PRODUCER surface: `fuel_consumed` left the
    // consumer card on 2026-07-31 with the rest of the `details` tier (per-event fuel is
    // carbon minutiae, and the page has a dedicated Environmental Impact section).
    // `area_worked` still carries its unit on the consumer card, asserted below.
    expect(EQUIPMENT_EVENT.fuel_unit).toBe('gal');
    expect(EQUIPMENT_EVENT.area_unit).toBe('acres');

    const modal = getFieldsForSurface(4, 'MN' as any, 'modal', EQUIPMENT_EVENT);
    const modalFields = [...modal.hero, ...modal.immediate, ...modal.secondary, ...modal.details];
    const fuel = modalFields.find((f) => f.name === 'fuel_consumed');
    expect(fuel, 'fuel_consumed must remain available to the producer').toBeDefined();
    expect(fuel?.formattedValue).toContain('gal');

    const area = allFields.find((f) => f.name === 'area_worked');
    expect(area?.formattedValue).toContain('acres');
  });

  it('keeps per-event fuel off the consumer card', () => {
    const names = allFields.map((f) => f.name);
    expect(names).not.toContain('fuel_consumed');
    expect(names).not.toContain('fuel_type');
  });

  it('keeps the machine name the normalizer used to drop', () => {
    expect(EQUIPMENT_EVENT.equipment).toBe('John Deere 5075E Tractor');
    expect(allFields.find((f) => f.name === 'equipment')?.formattedValue).toBe(
      'John Deere 5075E Tractor'
    );
  });

  it('humanizes the operation-type code rather than showing "MN"', () => {
    const opType = allFields.find((f) => f.name === 'operation_type');
    expect(opType?.formattedValue).toBe('Maintenance');
  });

  it('emits an English value that localizeFieldValue can translate, not an i18n key', () => {
    // getFieldsForSurface takes no `intl`, so registry formatters are locale-blind and
    // localization happens downstream via localizeFieldValue -> fieldValues.es.ts. A
    // formatter that returned a dotted key here would render the key on screen; an English
    // string with no fieldValues.es entry would render untranslated on the es page.
    const opType = allFields.find((f) => f.name === 'operation_type');
    expect(opType?.formattedValue).not.toMatch(/^events\./);
    expect(localizeFieldValue(opType?.formattedValue, 'es-419')).toBe('Mantenimiento');
  });

  it('pairs numeric values with their units', () => {
    const area = allFields.find((f) => f.name === 'area_worked');
    expect(area?.formattedValue).toContain('acres');
  });

  it('keeps carbon out of the hero tier on the consumer surface (FTC guard)', () => {
    expect(resolved.hero.some((f) => f.isCarbonRelevant)).toBe(false);
  });

  it('does not duplicate the farmer notes rendered above the field grid', () => {
    expect(allFields.map((f) => f.name)).not.toContain('observation');
  });

  it('keeps the unverified self-assessed efficiency off consumer surfaces', () => {
    expect(allFields.map((f) => f.name)).not.toContain('operation_efficiency');
  });

  it('exposes all six backend sub-type codes', () => {
    expect(
      getSubtypes('equipment' as any)
        .map((s: any) => s.code)
        .sort()
    ).toEqual(['BD', 'CA', 'EI', 'FC', 'MN', 'RE']);
  });

  it('has every label key defined in BOTH locales', () => {
    const keys = [
      ...equipmentEventRegistry.fields.map((f) => f.labelKey),
      ...equipmentEventRegistry.subtypes.map((s) => s.labelKey),
      equipmentEventRegistry.labelKey
    ];
    const missing = keys.filter((k) => !(k in en) || !(k in es));
    expect(missing, `label keys missing from a locale: ${missing.join(', ')}`).toEqual([]);
  });
});
