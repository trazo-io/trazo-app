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

  it('harvest, cleanout, sign-up and settings labels come from the catalogue (Run 8b, 8b-03)', () => {
    const production = src('views/Dashboard/Dashboard/components/forms/ProductionTab.jsx');
    // Option VALUES stay (stored data); the printed labels and placeholders were English.
    // The observation placeholder ("Optional: Describe…") belongs to another slice.
    expect(production).not.toMatch(/placeholder="(Select|e\.g\.|Leave blank|Name and|Optional")/);
    expect(production).not.toMatch(/<option value="[a-z_]+">[A-Z][A-Za-z/ ()-]+<\/option>/);
    expect(production).not.toMatch(/<option value="(lbs|kg|tons|bins|boxes)">\1<\/option>/);
    for (const file of [
      'views/Authentication/SignUp/AppSignUp.tsx',
      'views/Authentication/SignUp/ModernVerifyEmail.tsx'
    ]) {
      expect(src(file), file).not.toMatch(/title: '[A-Z][^']*'/);
    }
    expect(src('components/Forms/PasswordStrengthIndicator.tsx')).not.toMatch(/label="One /);
    expect(src('views/Dashboard/Dashboard/Production/QuickStartProduction.tsx')).toContain(
      'PRODUCTION_METHOD_LABEL_KEYS[value]'
    );
    for (const file of [
      'views/Dashboard/Settings/EditCompanyModal.tsx',
      'views/Dashboard/Settings/CompanyInfoTab.tsx'
    ]) {
      expect(src(file), file).not.toContain('Granja Familiar');
    }
    expect(ES['company.form.legalStructure.familyFarm']).toBe('Finca familiar');
    expect(src('views/Dashboard/Dashboard/components/forms/NewEvent.jsx')).not.toContain(
      'Please fill in all required fields'
    );
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

/**
 * Two strings a grower read on screen on 2026-10-19 while testing the crew-note flow in Spanish.
 * Both are small and both were shipped, which is the point: a missing accent and a banned dash do
 * not fail a build, do not fail a type check, and are invisible in a diff unless somebody looks at
 * the rendered page in that language.
 */
describe('Spanish copy a grower actually read', () => {
  it('spells Relación with its accent', () => {
    // "Relacion NPK" was printed in the crew-note banner under the quoted message.
    expect((es as Record<string, string>)['events.chemical.fields.npkRatio']).toBe('Relación NPK');
  });

  it('keeps the em dash out of the recent-inputs helper', () => {
    // The house rule bans the em dash in anything written for a user. This string sits directly
    // under the crew-note banner, on the one path that saves a grower from retyping a product.
    const helper = (es as Record<string, string>)['chemical.recentInputs.helper'] ?? '';
    expect(helper).not.toMatch(/—/);
    expect(helper).toContain('Reaplica un producto que ya usaste');
  });
});
