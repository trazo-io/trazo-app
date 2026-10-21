/**
 * Pheromone dispensers for mating disruption can be recorded as what they are.
 *
 * Browser run on a WA organic apple orchard, 2026-10-20. Mating disruption is a few hundred
 * dispensers per acre, hung in the canopy by hand. The input-application form offered no count
 * unit, no hand-placement method, and required a pesticide concentration, so the grower guessed
 * a weight, picked a spray method, and the certifier packet printed a spray.
 *
 * Mirrors trazo-back `common/field_registry.py`: UNIT_VOLUME `dispensers`, APPLICATION_METHOD
 * `hand_dispenser` (pinned server-side by history/tests/test_pheromone_dispensers.py).
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import { buildChemicalSchema } from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';
import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';
import { FIELD_VALUE_ES } from '../../../utils/fieldValues.es';
import { APPLICATION_METHOD_LABELS, formatApplicationMethod } from '../chemicalEvent';
import {
  APPLICATION_METHODS_BY_CHEMICAL_TYPE,
  HAND_DISPENSER_METHOD,
  VOLUME_UNITS
} from '../enums';
import { formatVolume } from '../formatters';
import { requiredFieldsForSave } from '../saveRequiredFields';

const FORMS = path.resolve(__dirname, '../../../views/Dashboard/Dashboard/components/forms');
const CHEMICAL_TAB = fs.readFileSync(path.join(FORMS, 'ChemicalTab-ENHANCED.jsx'), 'utf8');
const NEW_EVENT = fs.readFileSync(path.join(FORMS, 'NewEvent.jsx'), 'utf8');

/** The one punctuation mark the new copy must not use (escaped so this file holds none). */
const EM_DASH = '\u2014';

const intl = { formatMessage: ({ id }: { id: string }) => id };

/** A complete pesticide record, minus whatever the case under test leaves out. */
const record = (overrides: Record<string, string>) => ({
  type: 'PE',
  commercial_name: 'Isomate CM Flex',
  volume_numeric: '1200',
  volume_unit: 'dispensers',
  area_numeric: '4',
  area_unit: 'acres',
  application_method: HAND_DISPENSER_METHOD,
  concentration: '',
  ...overrides
});

const issuesOn = (field: string, data: Record<string, string>): string[] => {
  const result = buildChemicalSchema(intl).safeParse(data);
  if (result.success) return [];
  return result.error.issues
    .filter((issue: { path: (string | number)[] }) => issue.path[0] === field)
    .map((issue: { message: string }) => issue.message);
};
const concentrationIssues = (data: Record<string, string>) => issuesOn('concentration', data);

/** The JSX of the one select for `name` that offers the full unit list. */
const unitSelect = (name: string): string => {
  const blocks: string[] = [];
  for (
    let at = CHEMICAL_TAB.indexOf(`name="${name}"`);
    at !== -1;
    at = CHEMICAL_TAB.indexOf(`name="${name}"`, at + 1)
  ) {
    blocks.push(CHEMICAL_TAB.slice(at, CHEMICAL_TAB.indexOf('</StandardSelect>', at)));
  }
  const full = blocks.filter((b) => b.includes('app.unit.milliliters'));
  expect(full).toHaveLength(1);
  return full[0];
};

describe('pheromone dispensers', () => {
  it('the catalogue offers a count unit and a hand-placement method for insecticides only', () => {
    expect(VOLUME_UNITS.map((u) => u.value)).toContain('dispensers');
    expect(HAND_DISPENSER_METHOD).toBe('hand_dispenser');
    expect(APPLICATION_METHODS_BY_CHEMICAL_TYPE.PE.map((m) => m.value)).toContain('hand_dispenser');
    for (const subtype of ['FE', 'FU', 'HE']) {
      expect(
        APPLICATION_METHODS_BY_CHEMICAL_TYPE[subtype].map((m) => m.value),
        subtype
      ).not.toContain('hand_dispenser');
    }
  });

  it('the form offers both, on the amount and on the purchase', () => {
    expect(unitSelect('volume_unit')).toContain('value="dispensers"');
    expect(unitSelect('quantity_purchased_unit')).toContain('value="dispensers"');
    expect(CHEMICAL_TAB).toContain('<option value="hand_dispenser">');
  });

  it('every new key exists in both locales', () => {
    const en = enUS as Record<string, string>;
    const es = es419 as Record<string, string>;
    for (const key of [
      'app.unit.dispensers',
      'events.units.volume.dispensers',
      'events.applicationMethods.handDispenser',
      'events.chemical.methods.handDispenser',
      'events.chemical.concentration.help.dispenser',
      'app.pur.flag.product_amount_is_count',
      'events.chemical.validation.dispensersNeedDispenserMethod'
    ]) {
      expect(en[key], key).toBeTruthy();
      expect(es[key], key).toBeTruthy();
      expect(en[key], key).not.toContain(EM_DASH);
      expect(es[key], key).not.toContain(EM_DASH);
    }
  });

  it('a dispenser record needs no concentration', () => {
    expect(concentrationIssues(record({}))).toEqual([]);
  });

  it('a spray still does', () => {
    expect(concentrationIssues(record({ application_method: 'ground_spray' }))).toEqual([
      'events.chemical.validation.concentrationRequired'
    ]);
  });

  it('a concentration typed on a dispenser record is still checked', () => {
    // An application rate in the concentration box is refused whatever the method.
    expect(concentrationIssues(record({ concentration: '300 per acre' }))).toEqual([
      'events.chemical.validation.concentrationLooksLikeRate'
    ]);
  });

  it('a stale dispenser method on a non-pesticide waives nothing (review on app#166)', () => {
    // Switching the type away from PE leaves the method behind in the form state.
    for (const type of ['FU', 'HE', 'FE']) {
      expect(concentrationIssues(record({ type, volume_unit: 'gal' })), type).not.toEqual([]);
    }
  });

  it('the count unit is refused on anything but a dispenser application', () => {
    expect(issuesOn('volume_unit', record({}))).toEqual([]);
    expect(
      issuesOn('volume_unit', record({ application_method: 'ground_spray', concentration: '2%' }))
    ).toEqual(['events.chemical.validation.dispensersNeedDispenserMethod']);
    expect(issuesOn('volume_unit', record({ type: 'FU', concentration: '2%' }))).toEqual([
      'events.chemical.validation.dispensersNeedDispenserMethod'
    ]);
  });

  it('the form offers the count unit to pesticides only, or to a record already holding it', () => {
    for (const name of ['volume_unit', 'quantity_purchased_unit']) {
      expect(unitSelect(name)).toMatch(
        /\(chemicalType === 'PE' \|\| field\.value === 'dispensers'\) && \(\s*<option value="dispensers">/
      );
    }
  });

  it("the wizard's own required-field gate agrees with the form, on one parcel and on several", () => {
    // The gate is one function now. It used to be two inline lists that drifted: the several-
    // parcels copy required a concentration from dispensers, refusing a valid record at save.
    expect(NEW_EVENT).toContain('requiredFieldsForSave(backendEventType, enhancedData');
    const dispenser = { type: 'PE', application_method: 'hand_dispenser' };
    expect(requiredFieldsForSave(2, dispenser)).not.toContain('concentration');
    expect(requiredFieldsForSave(2, dispenser, { multiParcel: true })).not.toContain(
      'concentration'
    );
    const spray = { type: 'FU', application_method: 'ground_spray' };
    expect(requiredFieldsForSave(2, spray)).toContain('concentration');
    expect(requiredFieldsForSave(2, spray, { multiParcel: true })).toContain('concentration');
  });

  it('a record view prints the method in words and the amount as a count', () => {
    expect(APPLICATION_METHOD_LABELS.hand_dispenser).toBe(
      'Hand-applied dispensers (mating disruption)'
    );
    expect(formatApplicationMethod('hand_dispenser')).toBe(
      'Hand-applied dispensers (mating disruption)'
    );
    expect(FIELD_VALUE_ES['Hand-applied dispensers (mating disruption)']).toBe(
      'Difusores colocados a mano (confusión sexual)'
    );
    expect(FIELD_VALUE_ES.dispensers).toBe('difusores');
    expect(formatVolume(300, { volume_unit: 'dispensers' } as never)).toBe('300 dispensers');
  });
});
