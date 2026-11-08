/**
 * "You told us" repeats the area the way the farmer gave it (2026-11-08).
 *
 * A field-work activity over 123 m² showed "Area entered: 0.0 acres → Converted: 0.0
 * hectares" in the carbon box. The production response carries only its acre conversion
 * (0.03), and the box printed it with `toFixed(1)`. A row headed "You told us" was reporting a
 * value nobody entered, and it was zero.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import enUS from '../../../i18n/lang/en-US.json';
import { CarbonImpactPreview } from '../CarbonImpactPreview';

const en = enUS as Record<string, string>;

// The demo record the bug was seen on: mowing, 123 m², 45.4 L of fuel.
const fieldWork = {
  co2e: 105,
  calculation_method: 'production',
  breakdown: {
    production_activity: 'mowing_floor_management',
    area_covered_acres: 123 / 4046.86,
    area_covered_hectares: 0.0123,
    actual_fuel_consumed_gallons: 12,
    diesel_emission_factor_kg_per_gallon: 8.78
  }
};

const show = (formData: Record<string, unknown>, calculation = fieldWork) => {
  render(
    <IntlProvider locale="en-US" messages={en}>
      <ChakraProvider theme={theme}>
        <CarbonImpactPreview
          eventType="production"
          formData={formData}
          calculation={calculation as never}
        />
      </ChakraProvider>
    </IntlProvider>
  );
  fireEvent.click(screen.getByText(en['carbon.details.show']));
};

afterEach(cleanup);

describe('the area under "You told us"', () => {
  it('is the value and unit the form holds', () => {
    show({ type: 'FM', area_covered: '123', area_unit: 'm2' });
    expect(screen.getByText('123 m²')).toBeInTheDocument();
    expect(screen.getByText('0.012 hectares')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/0\.0 (acres|hectares)/);
  });

  it('acres convert without a conversion row saying zero', () => {
    show({ type: 'FM', area_covered: '0.5', area_unit: 'acres' });
    expect(screen.getByText('0.5 acres')).toBeInTheDocument();
    expect(screen.getByText('0.2 hectares')).toBeInTheDocument();
  });

  it('hectares need no conversion row', () => {
    show({ type: 'FM', area_covered: '2', area_unit: 'ha' });
    expect(screen.getByText('2 hectares')).toBeInTheDocument();
    expect(screen.queryByText(en['carbonPreview.label.converted'])).toBeNull();
  });

  it('without the form values, the response figure keeps its digits instead of rounding to 0.0', () => {
    show({ type: 'FM' });
    expect(screen.getByText('0.03 acres')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/0\.0 (acres|hectares)/);
  });
});

describe('the production form hands the box what was entered', () => {
  it('passes the live area and unit, not the values it mounted with', () => {
    const tab = readFileSync(
      join(process.cwd(), 'src/views/Dashboard/Dashboard/components/forms/ProductionTab.jsx'),
      'utf8'
    );
    const props = tab.slice(
      tab.indexOf('<CarbonImpactPreview'),
      tab.indexOf('calculation={carbonCalculation}')
    );
    expect(props).toContain("area_covered: watch('area_covered')");
    expect(props).toContain("area_unit: watch('area_unit')");
  });
});
