/**
 * Spanish leftovers from the recordkeeping checklist run (2026-11-16, VID-07), after the soil form
 * itself was keyed (app #435): the review step printed registry values in English ("Intervalo
 * estiércol-cosecha: At least 90 days", "1 acres", "Fecha de cosecha prevista: Jun 20, 2027"), a
 * finished season "terminó el 7/12/2026" (read as 7 December; it ended 12 July), the field history
 * form's button said "Save" beside "Cancelar", a stored harvest read "Almacenado en el campo" (in
 * the field, not on the farm) and one prompt used usted.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import es419 from '../lang/es-419.json';
import { makeUnitPairFormatter } from 'config/events/formatters';
import { localizeFieldValue } from 'utils/fieldDisplayUtils';

const ES = es419 as Record<string, string>;
const read = (p: string) => readFileSync(resolve(__dirname, '../..', p), 'utf8');

describe('registry values read in Spanish on the review step', () => {
  it('says the manure interval in Spanish', () => {
    expect(localizeFieldValue('At least 90 days', 'es-419')).toBe('Al menos 90 días');
    expect(localizeFieldValue('At least 120 days', 'es-419')).toBe('Al menos 120 días');
    expect(localizeFieldValue('At least 90 days', 'en-US')).toBe('At least 90 days');
  });

  it('puts the day first in a dated value, with a Spanish month', () => {
    expect(localizeFieldValue('Jun 20, 2027', 'es-419')).toBe('20 jun 2027');
    expect(localizeFieldValue('Nov 5, 2026', 'es-419')).toBe('5 nov 2026');
    expect(localizeFieldValue('Feb 2019', 'es-419')).toBe('feb 2019');
  });

  it('translates a unit word after a quantity', () => {
    expect(localizeFieldValue('6.64 hectares', 'es-419')).toBe('6.64 hectáreas');
    expect(localizeFieldValue('12 gallons', 'es-419')).toBe('12 galones');
  });

  it('says one of a unit in the singular', () => {
    const area = makeUnitPairFormatter('area_unit');
    expect(area(1, { area_unit: 'acres' })).toBe('1 acre');
    expect(area(2, { area_unit: 'acres' })).toBe('2 acres');
    expect(area(1, { area_unit: 'hectares' })).toBe('1 hectare');
  });
});

describe('dates and labels around the activity form', () => {
  it('formats a finished season with the reader’s locale and a named month', () => {
    const src = read('views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
    const start = src.indexOf('const localDateLabel = (value) =>');
    const body = src.slice(start, src.indexOf('};', start));
    expect(body).toMatch(/formatDateOnly\(s, intl\.locale\)/);
    expect(body).toMatch(/formatDateFromTimestamp\(s, intl\.locale\)/);
    expect(body).not.toMatch(/toLocaleDateString\(\)/);
  });

  it('labels the field history save button in the reader’s language', () => {
    const src = read('views/Dashboard/Dashboard/Parcel/FieldHistorySection.tsx');
    expect(src).not.toMatch(/'Update' : 'Save'/);
    expect(ES['parcel.fieldHistory.update']).toBe('Actualizar');
  });

  it('stores a harvest on the farm, and asks in tú', () => {
    expect(ES['events.harvestDestination.stored']).toBe('Almacenado en la finca');
    expect(ES['activities.correctActivity']).toContain('Corrige');
  });
});
