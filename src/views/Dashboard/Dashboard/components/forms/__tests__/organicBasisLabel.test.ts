/**
 * Run 8b R3 (observation 3): the input form's organic-basis field was labelled with a question,
 * "What shows this input is allowed for organic use?", while the soil and pest forms already
 * said "Organic basis". The question now sits in the help line, and the label names the field
 * the same way on every grower form. The soil select also printed five English option texts
 * on the Spanish form.
 *
 * Read from source and the catalogues: the label key, the offered values and the option text
 * are fixed at authoring time, and this is the existing pattern for the same field
 * (unknownOrganicBasis.test.ts).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';

const FORMS = 'views/Dashboard/Dashboard/components/forms';
const src = (rel: string) => readFileSync(resolve(process.cwd(), 'src', FORMS, rel), 'utf8');
const EN = enUS as Record<string, string>;
const ES = es419 as Record<string, string>;

// Every grower-facing organic-basis label, by the form that renders it.
const LABEL_KEYS: Array<[string, string]> = [
  ['ChemicalTab-ENHANCED.jsx', 'events.chemical.form.organicBasis'],
  ['SoilManagementTab.jsx', 'events.soil.fields.amendmentOrganicApproved'],
  ['PestManagementTab.jsx', 'events.pest.fields.beneficialOrganicApproved']
];

/** The JSX of the soil amendment's organic-basis select, from its register call to its close. */
const soilOrganicSelect = (): string => {
  const soil = src('SoilManagementTab.jsx');
  const start = soil.indexOf("{...register('amendment_organic_approved')}");
  expect(start, 'soil organic-basis select found').toBeGreaterThan(-1);
  // Comments dropped: the ones in this select talk about "<option>" in prose.
  return soil
    .slice(start, soil.indexOf('</StandardSelect>', start))
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
};

describe('the organic-basis field is named the same on every grower form', () => {
  for (const [form, key] of LABEL_KEYS) {
    it(`${form} labels it "Organic basis" / "Base orgánica"`, () => {
      expect(src(form), `${form} renders ${key}`).toContain(`'${key}'`);
      expect(EN[key]).toBe('Organic basis');
      expect(ES[key]).toBe('Base orgánica');
    });
  }

  it('the question moved into the chemical help line, in both languages', () => {
    expect(EN['events.chemical.form.organicBasisHelp']).toMatch(
      /^What shows this input is allowed for organic use\? /
    );
    expect(ES['events.chemical.form.organicBasisHelp']).toMatch(
      /^¿Qué muestra que este insumo está permitido en producción orgánica\? /
    );
    expect(EN['events.chemical.form.organicBasisPlaceholder']).toBe('Select the organic basis...');
    expect(ES['events.chemical.form.organicBasisPlaceholder']).toBe(
      'Selecciona la base orgánica...'
    );
  });

  it('the chemical label carries no stale English default', () => {
    const chem = src('ChemicalTab-ENHANCED.jsx');
    expect(chem).not.toContain('How is this input verified for organic use?');
    expect(chem).not.toContain('Select verification basis...');
  });
});

describe('certifier review stays an answer the grower can record', () => {
  it('certifier_approved is offered on the chemical and soil forms', () => {
    expect(src('ChemicalTab-ENHANCED.jsx')).toMatch(/<option value="certifier_approved">/);
    expect(soilOrganicSelect()).toMatch(/<option value="certifier_approved">/);
  });
});

describe('the soil organic-basis select prints no literal option text', () => {
  it('every option label comes from the catalogue', () => {
    const select = soilOrganicSelect();
    const options = [...select.matchAll(/<option\b[^>]*>([\s\S]*?)<\/option>/g)];
    expect(options.length, 'options found').toBeGreaterThanOrEqual(7);
    const literal = options
      .map((m) => m[1].trim())
      .filter((body) => !body.startsWith('{intl.formatMessage('));
    expect(literal, 'option text written in JSX renders English on the Spanish form').toEqual([]);
  });
});
