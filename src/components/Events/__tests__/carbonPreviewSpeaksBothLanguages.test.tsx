/**
 * The carbon box on the activity form speaks the reader's language (2026-11-08).
 *
 * `CarbonImpactPreview` renders on the input, field-work, soil and pest forms. Until this
 * change nearly every word in it was an English literal: a Spanish-speaking farmer got
 * "Carbon Impact Preview", "You told us:", "Emissions Sources:" and "Ways to Increase
 * Transparency" around Spanish form labels. Two of the literals were also claims
 * `compliance.md` rules out: "Direct operational emissions" under a figure that includes
 * making the input, and a "Carbon Sequestration Credit".
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import enUS from '../../../i18n/lang/en-US.json';
import esUY from '../../../i18n/lang/es-419.json';
import { CarbonImpactPreview } from '../CarbonImpactPreview';

const en = enUS as Record<string, string>;
const es = esUY as Record<string, string>;
const SRC = readFileSync(
  join(process.cwd(), 'src/components/Events/CarbonImpactPreview.tsx'),
  'utf8'
);

describe('carbon preview source', () => {
  it('every key it asks for exists in both locales', () => {
    const ids = [...SRC.matchAll(/\bt\('([a-zA-Z.]+)'/g)].map((m) => `carbonPreview.${m[1]}`);
    expect(ids.length).toBeGreaterThan(60);
    const missing = ids.filter((id) => !en[id] || !es[id]);
    expect(missing).toEqual([]);
  });

  // Comments carry the history of each wording, so both checks read the code without them.
  const CODE = SRC.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

  it('renders no English sentence as a JSX text node', () => {
    // A line that is only words, no code: JSX text. Values, units and symbols are allowed.
    const body = CODE.slice(CODE.indexOf('export const CarbonImpactPreview'));
    const textLines = body
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[A-Za-z•→][^{}<>=;()?:&|`'"]*$/.test(l) && /[a-z]{3,} [a-z]{2,}/i.test(l));
    expect(textLines).toEqual([]);
  });

  it('makes none of the claims compliance.md rules out', () => {
    const copy = Object.entries(en)
      .filter(([k]) => k.startsWith('carbonPreview.'))
      .map(([, v]) => v)
      .concat(CODE);
    for (const banned of [
      /direct operational emissions/i,
      /sequestration credit/i,
      /carbon footprint/i,
      /increase transparency/i
    ]) {
      expect(copy.filter((c) => banned.test(c)).map((c) => c.slice(0, 80))).toEqual([]);
    }
  });
});

const renderEs = (calculation: Record<string, unknown>) => {
  render(
    <IntlProvider locale="es-419" messages={es}>
      <ChakraProvider theme={theme}>
        <CarbonImpactPreview
          eventType="chemical"
          formData={{}}
          calculation={calculation as never}
        />
      </ChakraProvider>
    </IntlProvider>
  );
  fireEvent.click(screen.getByText(es['carbon.details.show']));
};

const ENGLISH_CHROME = [
  'Carbon Impact Preview',
  'Carbon estimate',
  'Direct operational emissions',
  'You told us',
  'Emissions Sources',
  'Emission sources',
  'Activity:',
  'Area Treated',
  'Area Input',
  'Nutrient Content',
  'Manufacturing:',
  'Application Equipment',
  'Fuel Combustion',
  'hectares',
  'liters',
  'gallons',
  'applied'
];

const noEnglishChrome = () => {
  const text = document.body.textContent || '';
  expect(ENGLISH_CHROME.filter((w) => text.includes(w))).toEqual([]);
};

describe('carbon preview in Spanish', () => {
  it('an input application: heading, subtitle and every breakdown row', () => {
    renderEs({
      co2e: 12.4,
      calculation_method: 'chemical',
      original_volume_applied: 40,
      original_volume_unit: 'L',
      original_area_treated: 5,
      original_area_unit: 'ha',
      breakdown: {
        application_method: 'ground_spray',
        npk_content: { N: 10, P: 5, K: 5 },
        nitrogen_kg: 4,
        phosphorus_kg: 2,
        potassium_kg: 2,
        fertilizer_subtype: 'slow_release',
        emission_factor_kg_co2_per_kg: 2.1,
        manufacturing_emissions_kg_co2e: 8.4,
        application_emissions_kg_co2e: 4,
        application_fuel_gallons: 1.2,
        application_fuel_liters: 4.5,
        application_fuel_type: 'diesel'
      }
    });
    expect(screen.getByText(es['carbonPreview.title'])).toBeInTheDocument();
    expect(screen.getByText(es['carbonPreview.subtitle'])).toBeInTheDocument();
    expect(screen.getByText(es['carbonPreview.application.title'])).toBeInTheDocument();
    expect(screen.getByText(es['carbonPreview.nutrients.title'])).toBeInTheDocument();
    expect(screen.getByText(es['carbonPreview.chem.manufacturing'])).toBeInTheDocument();
    expect(screen.getByText('40 litros')).toBeInTheDocument();
    expect(screen.getByText('5 hectáreas')).toBeInTheDocument();
    noEnglishChrome();
  });

  it('field work with an assumed fuel rate', () => {
    renderEs({
      co2e: 4.5,
      calculation_method: 'production',
      original_area_treated: 10,
      original_area_unit: 'acres',
      breakdown: {
        production_activity: 'cultivation',
        area_covered_acres: 10,
        equipment_hours: 2,
        diesel_emission_factor_kg_per_gallon: 10.21,
        fuel_basis: {
          measured: false,
          emission_factor: {
            value: 10.21,
            unit: 'kg CO2/gal',
            source: 'EPA',
            provenance: 'published'
          },
          assumed_fuel_is_diesel: false,
          assumed_rate: {
            value: 0.5,
            unit: 'gal/ha',
            source: 'Trazo',
            provenance: 'internal_estimate',
            confidence_level: 0.5
          }
        }
      }
    });
    expect(screen.getByText(es['carbonPreview.youToldUs'])).toBeInTheDocument();
    expect(screen.getByText(es['carbonPreview.sources.combustion'])).toBeInTheDocument();
    expect(screen.getByText('2 horas')).toBeInTheDocument();
    noEnglishChrome();
  });

  it('soil work that stores carbon is not called a credit', () => {
    renderEs({
      co2e: -3,
      calculation_method: 'soil',
      breakdown: {
        soil_activity: 'compost',
        area_managed: 3,
        area_unit: 'acres',
        area_emissions: -3,
        emission_factor: -1,
        total_impact: -3
      }
    });
    expect(screen.getByText(es['carbonPreview.soil.stored'])).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/cr[ée]dito|credit/i);
    noEnglishChrome();
  });
});
