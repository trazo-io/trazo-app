/**
 * The wizard and the server agree on what an application is and which values a crew message may
 * not fill (OSP alignment audit T29). The server refuses the save when this rule is broken
 * (`fieldnotes/services/confirmation.py`); a wizard that drifted from it would let a supervisor fill
 * a value and then be refused at save, or withhold one the server allows.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

import {
  INPUT_FIELD,
  isApplicationRecord,
  PEST_APPLICATION_TYPES,
  SOIL_APPLICATION_TYPES,
  withoutInputValues
} from '../crewNoteApplication';

const BACKEND = join(__dirname, '../../../../../trazo-back/fieldnotes/services/confirmation.py');

const backend = (): string => {
  try {
    return readFileSync(BACKEND, 'utf8');
  } catch {
    throw new Error(`trazo-back must sit beside trazo-app to run this guard: ${BACKEND}`);
  }
};

describe('crew-note application rule matches the server', () => {
  it('uses the same input-field pattern', () => {
    const m = backend().match(/INPUT_FIELD = re\.compile\(\s*r"([^"]+)"\s*r"([^"]+)"/);
    expect(m, 'INPUT_FIELD not found in confirmation.py').not.toBeNull();
    expect(INPUT_FIELD.source).toBe((m as RegExpMatchArray)[1] + (m as RegExpMatchArray)[2]);
  });

  it('uses the same soil and pest application types', () => {
    const src = backend();
    const set = (name: string) =>
      [...(src.match(new RegExp(`${name} = \\{([^}]*)\\}`))?.[1] ?? '').matchAll(/"([A-Z]+)"/g)]
        .map((x) => x[1])
        .sort();
    expect([...SOIL_APPLICATION_TYPES].sort()).toEqual(set('SOIL_APPLICATION_TYPES'));
    expect([...PEST_APPLICATION_TYPES].sort()).toEqual(set('PEST_APPLICATION_TYPES'));
  });
});

describe('crew-note application rule', () => {
  it('follows the record type and its own fields', () => {
    expect(isApplicationRecord(2, {})).toBe(true);
    expect(isApplicationRecord(5, { type: 'OM' })).toBe(true);
    expect(isApplicationRecord(5, { type: 'ST', amendment_product_name: 'Gypsum' })).toBe(true);
    expect(isApplicationRecord(5, { type: 'ST' })).toBe(false);
    expect(isApplicationRecord(6, { type: 'BR' })).toBe(true);
    expect(isApplicationRecord(6, { type: 'SC' })).toBe(false);
    expect(isApplicationRecord(3, { commercial_name: 'x' })).toBe(false);
  });

  it('withholds product, rate, quantity, area and unit values', () => {
    const { allowed, withheld } = withoutInputValues({
      commercial_name: 'Feather meal',
      volume_numeric: 40,
      volume_unit: 'lb',
      area_numeric: 2,
      weather_conditions: 'dry',
      duration: '2 h'
    });
    expect(withheld.sort()).toEqual([
      'area_numeric',
      'commercial_name',
      'volume_numeric',
      'volume_unit'
    ]);
    expect(allowed).toEqual({ weather_conditions: 'dry', duration: '2 h' });
  });
});
