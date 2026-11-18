/**
 * The soil management form reads in the grower's language, every label and hint of it.
 *
 * Recordkeeping checklist run 2026-11-16, VID-07: in Spanish the raw-manure block rendered in
 * English ("Raw Manure Harvest Interval (7 CFR 205.203(c)(1))", "Manure Harvest Interval",
 * "Required wait period before harvest", "Manure Treatment (NOP 5006)"), and so did the compost,
 * soil test, tillage, grazing and habitat sections: 146 strings were hard-coded props. They are
 * keys now, and this guard fails if one comes back.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import enUS from '../lang/en-US.json';
import es419 from '../lang/es-419.json';

const FORM = resolve(
  __dirname,
  '../../views/Dashboard/Dashboard/components/forms/SoilManagementTab.jsx'
);
const code = readFileSync(FORM, 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\/\/.*$/gm, '');
const en = enUS as Record<string, string>;
const es = es419 as Record<string, string>;

describe('the soil form speaks the reader’s language', () => {
  it('reads the form (guards the guard)', () => {
    expect(code).toMatch(/const SoilManagementTab = forwardRef/);
  });

  it('has no hard-coded English label, hint, title, description or placeholder', () => {
    const literal =
      /\b(label|helpText|title|description|placeholder|helperText|aria-label)="[^"]*[A-Za-z][^"]*"/g;
    expect(code.match(literal) ?? []).toEqual([]);
    // A label picked by a ternary is a literal too ("Area Covered", "Fuel Consumed" survived the
    // first pass that way).
    expect(
      code.match(
        /[?:]\s*'(Area Covered|Fuel Consumed|Energy Amount|Amendment Amount|Total (fuel|quantity))[^']*'/g
      ) ?? []
    ).toEqual([]);
    // An example in a key's defaultMessage is a key; a bare 'e.g., ...' literal is not.
    expect(code).not.toMatch(/(?<!defaultMessage: )'e\.g\., /);
  });

  it('gives every form key a Spanish value of its own', () => {
    const ids = [...code.matchAll(/id: '(events\.soil\.form\.[^']+)'/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(100);
    for (const id of new Set(ids)) {
      expect(en[id], id).toBeTruthy();
      expect(es[id], id).toBeTruthy();
    }
  });

  it('says the raw-manure block in Spanish', () => {
    expect(es['events.soil.form.title.rawManureHarvestInterval7Cfr']).toBe(
      'Intervalo entre estiércol crudo y cosecha (7 CFR 205.203(c)(1))'
    );
    expect(es['events.soil.form.label.manureTreatmentNop5006']).toBe(
      'Tratamiento del estiércol (NOP 5006)'
    );
  });
});
