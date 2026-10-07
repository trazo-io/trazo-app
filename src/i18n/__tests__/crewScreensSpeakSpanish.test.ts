/**
 * The crew lead's daily screens read in Spanish, in tuteo, with one name for the plan.
 *
 * Recordkeeping review S8 (F-18, F-24, F-28, 2026-10-07): journey b at 375 px in es-419 found
 * the wizard half English ("Required", "Preview", "Fungicide Concentration", unit and option
 * lists, "Harvesting" / "Equipment Maintenance" written into the record as its name), usted
 * pockets on the pages the crew sees, two names for the plan, an ICU plural with no `one`,
 * an offline toast titled "Error" and an efficiency preset nobody chose. Red on the old
 * catalogues and sources.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

import en from '../lang/en-US.json';
import es from '../lang/es-419.json';

const EN = en as Record<string, string>;
const ES = es as Record<string, string>;
const src = (p: string) => readFileSync(resolve(__dirname, '../../', p), 'utf8');

describe('the crew screens speak Spanish', () => {
  it('the wizard words the review found in English have keys in both catalogues', () => {
    for (const key of [
      'events.section.badge.required',
      'events.wizard.timingHint',
      'events.wizard.preview',
      'app.notSavedYet',
      'events.chemical.concentration.productConcentration',
      'events.chemical.concentration.help.percent',
      'events.chemical.concentration.help.pickType',
      'events.production.help.eventName',
      'events.production.help.harvestMethod',
      'events.production.help.efficiencyUnset',
      'events.equipmentOperation.CL',
      'events.units.hectares',
      'events.units.pounds',
      'events.units.acreFeet'
    ]) {
      expect(EN[key], `${key} missing in en-US`).toBeTruthy();
      expect(ES[key], `${key} missing in es-419`).toBeTruthy();
      expect(ES[key]).not.toBe(EN[key]);
    }
    expect(ES['events.section.badge.required']).toBe('Obligatorio');
    expect(ES['events.wizard.preview']).toBe('Vista previa');
  });

  it('the tabs route the words through intl instead of printing them', () => {
    const production = src('views/Dashboard/Dashboard/components/forms/ProductionTab.jsx');
    const chemical = src('views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED.jsx');
    const wizard = src('views/Dashboard/Dashboard/components/forms/NewEvent.jsx');
    expect(production).not.toMatch(/<option value="ha">Hectares<\/option>/);
    expect(production).not.toMatch(/<option value="lbs">Pounds<\/option>/);
    expect(production).not.toMatch(/label: 'Cleaning - Equipment cleaning/);
    expect(production).toContain('PRODUCTION_TYPE_LABEL_KEYS');
    expect(production).not.toMatch(/\|\| 'normal'/);
    expect(chemical).not.toMatch(/\? 'Fungicide Concentration'/);
    expect(wizard).not.toMatch(/badge=\{isEdit \? undefined : 'Required'\}/);
    expect(wizard).not.toMatch(/^\s*Preview\s*$/m);
    expect(wizard).toContain("'app.notSavedYet'");
  });

  it('a template does not pre-answer the efficiency, and the registry default is empty', () => {
    expect(src('config/events/templateAccelerators.ts')).not.toMatch(/'production_efficiency'/);
    expect(src('config/quickEventFields.ts')).not.toMatch(/default: 'normal'/);
  });

  it('the crew pages use tuteo, one plan name, and the plural knows one', () => {
    for (const key of [
      'activities.pickVerb',
      'activities.pickVerbHint',
      'certifierReadiness.subtitle',
      'production.field.quantityHelp',
      'quickAdd.fields.yieldQuantityHelp',
      'finishProduction.qualityGrade.placeholder',
      'upload.addPhotos',
      'upload.tapToCapture',
      'osp.modules.pageDescription',
      'production.section.publicPage'
    ]) {
      expect(ES[key], key).not.toMatch(
        /\b(usted|su|sus|elija|seleccione|agregue|toque|siga|complete|hizo)\b/i
      );
    }
    expect(ES['activities.pickVerb']).toBe('¿Qué hiciste?');
    const catalogue = JSON.stringify(ES);
    expect(catalogue).not.toContain('Plan Orgánico del Sistema');
    expect(ES['consumer.journey.viewFullRecord']).toMatch(/one \{/);
    expect(EN['consumer.journey.viewFullRecord']).toMatch(/one \{/);
  });
});
