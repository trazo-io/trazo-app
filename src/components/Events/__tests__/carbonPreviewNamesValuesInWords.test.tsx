/**
 * The carbon box names the activity, method, product and fuel in the reader's language, with
 * the same words the form uses (2026-11-08).
 *
 * The calculation response names things by code ("mowing_floor_management", "ground_spray",
 * "synthetic_pesticide") and the panel printed the code with its underscores swapped for
 * spaces. A Spanish farmer read "Mowing Floor Management" and "Ground Spray" in a box whose
 * every other word was translated, and an English one read a name the form never used.
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import esUY from '../../../i18n/lang/es-419.json';
import { CarbonImpactPreview } from '../CarbonImpactPreview';

const es = esUY as Record<string, string>;

const show = (
  eventType: string,
  formData: Record<string, unknown>,
  calculation: Record<string, unknown>
) => {
  render(
    <IntlProvider locale="es-419" messages={es}>
      <ChakraProvider theme={theme}>
        <CarbonImpactPreview
          eventType={eventType}
          formData={formData}
          calculation={calculation as never}
        />
      </ChakraProvider>
    </IntlProvider>
  );
  fireEvent.click(screen.getByText(es['carbon.details.show']));
};

afterEach(cleanup);

describe('carbon box values, in Spanish', () => {
  it('names a field-work activity by the subtype the form shows', () => {
    show(
      'Production',
      { type: 'MO' },
      {
        co2e: 105,
        calculation_method: 'production',
        breakdown: {
          production_activity: 'mowing_floor_management',
          actual_fuel_consumed_gallons: 12,
          diesel_emission_factor_kg_per_gallon: 8.78
        }
      }
    );
    expect(screen.getByText(es['events.production.subtypes.mowing'])).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/mowing/i);
  });

  it('names the method, product, fertilizer type and fuel of an input application', () => {
    show(
      'Chemical',
      { type: 'PE' },
      {
        co2e: 12,
        calculation_method: 'chemical',
        original_volume_applied: 40,
        original_volume_unit: 'L',
        breakdown: {
          application_method: 'ground_spray',
          chemical_subtype_used: 'synthetic_pesticide',
          active_ingredient_percentage: 25,
          application_fuel_gallons: 1.2,
          application_fuel_type: 'diesel',
          application_emissions_kg_co2e: 4
        }
      }
    );
    // The input form's own wording, which for a method depends on the product type (review of
    // app #327: the generic catalog's labels differed from the select beside the box).
    expect(
      screen.getByText(es['events.chemical.methods.groundSprayCropsSoil'])
    ).toBeInTheDocument();
    expect(
      screen.getByText(es['events.chemical.subtypeOptions.syntheticPesticide'])
    ).toBeInTheDocument();
    expect(screen.getByText(es['events.chemical.fuelTypes.diesel'])).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ground spray|synthetic pesticide/i);
  });

  it('names a slow-release fertilizer as the form does', () => {
    show(
      'Chemical',
      { type: 'FE' },
      {
        co2e: 9,
        calculation_method: 'chemical',
        breakdown: {
          application_method: 'broadcast',
          fertilizer_subtype: 'slow_release',
          manufacturing_emissions_kg_co2e: 9
        }
      }
    );
    expect(screen.getByText(es['events.chemical.subtypeOptions.slowRelease'])).toBeInTheDocument();
    expect(
      screen.getByText(es['events.chemical.methods.broadcastIncorporated'])
    ).toBeInTheDocument();
  });

  it('words the same method the way the form does for a herbicide', () => {
    show(
      'Chemical',
      { type: 'HE' },
      {
        co2e: 5,
        calculation_method: 'chemical',
        breakdown: { application_method: 'ground_spray', application_emissions_kg_co2e: 5 }
      }
    );
    expect(screen.getByText(es['events.chemical.methods.groundSprayEmergent'])).toBeInTheDocument();
  });

  it('a code no option knows still shows, as words, rather than vanishing', () => {
    show(
      'Production',
      { type: 'ZZ' },
      {
        co2e: 3,
        calculation_method: 'production',
        breakdown: {
          production_activity: 'reported_fuel_only',
          actual_fuel_consumed_gallons: 1,
          diesel_emission_factor_kg_per_gallon: 8.78
        }
      }
    );
    expect(screen.getByText('Reported fuel only')).toBeInTheDocument();
  });
});
