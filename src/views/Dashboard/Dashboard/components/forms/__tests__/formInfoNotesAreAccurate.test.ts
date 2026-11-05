/**
 * The activity form's info notes are info alerts, and what they say about carbon is what the
 * calculator does (2026-11-04).
 *
 * The tabs had hand-built blue boxes (blue.50 ground, blue text) for their info notes; the app
 * rule keeps blue for `Alert status="info"`, so they are StandardAlerts now. Moving them turned
 * up the copy:
 *   - The irrigation note, hardcoded English, said pump energy used "USDA NRCS pump efficiency
 *     factors (0.39 kg CO₂/kWh)". Pump ENERGY comes from the water volume and source; the CO₂
 *     factor is the EPA eGRID U.S. grid average, 0.365 (carbon/services/emission_factors.py).
 *     The equipment note beside it already said 0.365, so the form disagreed with itself.
 *   - "Solar/wind powered equipment has zero emissions": the 0.00 factor is operating emissions
 *     only, manufacture excluded (the factor's own note).
 *   - The application-fuel note said fuel "contributes significantly to chemical operation carbon
 *     footprint" (a banned term: it implies a full LCA) and that logging it "provides consumers
 *     with complete transparency" (a completeness promise, on a farmer's form).
 *   - "Certifier Notified?" was hardcoded English.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import en from 'i18n/lang/en-US.json';
import es from 'i18n/lang/es-419.json';

const FORMS = 'src/views/Dashboard/Dashboard/components/forms';
const code = (f: string) =>
  readFileSync(resolve(process.cwd(), FORMS, f), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
const EN = en as Record<string, string>;
const ES = es as Record<string, string>;

// The backend's grid factor, read from the calculator itself (CI checks trazo-back out beside us).
const BACKEND_GRID = (() => {
  const src = readFileSync(
    resolve(process.cwd(), '..', 'trazo-back', 'carbon', 'services', 'emission_factors.py'),
    'utf8'
  );
  const block = src.slice(src.indexOf('ELECTRICITY_FACTORS = {'));
  const m = block.match(/"grid":\s*\{\s*"value":\s*([0-9.]+)/);
  return m ? m[1] : '';
})();

describe('form info notes', () => {
  it('reads the backend grid factor (guards the guard)', () => {
    expect(BACKEND_GRID).toMatch(/^0\.\d+$/);
  });

  it.each(['ProductionTab.jsx', 'ChemicalTab-ENHANCED.jsx', 'GeneralTab.jsx'])(
    '%s draws no hand-built blue box',
    (f) => {
      const src = code(f);
      expect(src).not.toMatch(/bg="blue\.50"/);
      expect(src).not.toMatch(/borderLeftColor="blue\./);
      expect(src).not.toMatch(/Certifier Notified\?|NOP requires notifying/);
    }
  );

  it.each(['events.electricEquipment.body', 'events.production.electricPump.body'])(
    '%s quotes the factor the calculator uses, from its real source',
    (key) => {
      for (const [loc, cat] of [
        ['en', EN],
        ['es', ES]
      ] as const) {
        const v = cat[key];
        expect(v, `${loc} ${key}`).toBeTruthy();
        expect(v).toContain(BACKEND_GRID);
        expect(v).toMatch(/EPA eGRID/);
        expect(v).not.toMatch(/0\.39\b|NRCS/);
      }
    }
  );

  it('never calls solar or wind "zero emissions" without saying what is counted', () => {
    expect(EN['events.electricEquipment.body']).not.toMatch(/zero emissions/i);
    expect(EN['events.electricEquipment.body']).toMatch(/operating emissions only/);
    expect(ES['events.electricEquipment.body']).toMatch(/solo emisiones de operación/);
  });

  it('says nothing about a carbon footprint or consumer transparency on the fuel note', () => {
    for (const cat of [EN, ES]) {
      const v = cat['events.chemical.applicationCarbon.body'];
      expect(v).toBeTruthy();
      expect(v).not.toMatch(/footprint|consumer|transparen|huella|consumidor/i);
    }
  });

  it('keeps no orphaned copy of the old electric note', () => {
    expect(EN['events.chemical.electricEquipment.body']).toBeUndefined();
    expect(ES['events.chemical.electricEquipment.body']).toBeUndefined();
  });
});
