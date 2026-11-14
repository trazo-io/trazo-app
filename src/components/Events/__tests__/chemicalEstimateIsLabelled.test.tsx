/**
 * A spray or fertilizer figure that is an estimate says so, on every surface that shows it
 * (2026-11-13, with trazo-back `carbon.tests.test_chemical_estimate_is_labelled`).
 *
 * Every chemical figure used to be stored and served as resting on published factors, so the
 * detail modal showed "From recorded inputs" beside an application pass estimated from the area
 * treated (a Trazo litres-per-hectare rate), a Trazo estimate factor, or a figure whose
 * manufacturing was left out. The backend now serves `verification_status: 'estimate'` with
 * `estimate_reasons` (codes), and the form preview gets `figure_basis` and `fuel_basis` in the
 * breakdown. The preview also printed an assumed active-ingredient percentage ("25% (default)").
 *
 * Parity: the reason codes are read from the sibling trazo-back checkout (CI checks out
 * trazo-back main beside trazo-app), so a code the backend adds without copy here fails.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import theme from '../../../theme/theme';
import enUS from '../../../i18n/lang/en-US.json';
import esLatam from '../../../i18n/lang/es-419.json';
import { CarbonImpactPreview } from '../CarbonImpactPreview';
import { EventDetailsModal } from '../../Modals/EventDetailsModal';
import {
  ESTIMATE_REASON_CODES,
  estimateReasonMessageIds,
  showsAreaEstimateLabel,
  showsEstimateLabel,
  showsInputsBadge
} from '../../../utils/carbonStatus';

vi.mock('store/api/historyApi', () => ({
  useDeleteEventMutation: () => [vi.fn(), { isLoading: false }],
  useGetEventQuery: () => ({ data: undefined })
}));
vi.mock('store/api/amendmentsApi', () => ({
  useGetEventAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendEventMutation: () => [vi.fn(), { isLoading: false }],
  useGetSeasonAmendmentsQuery: () => ({ data: undefined, isLoading: false }),
  useAmendSeasonMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/documentsApi', () => ({ useGetFarmDocumentsQuery: () => ({ data: [] }) }));
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ canWrite: true }) }));
vi.mock('store/api/crewNoteApi', () => ({
  useGetCrewNoteQuery: () => ({ data: { crew_note: null } })
}));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 1 } } })
}));

const en = enUS as Record<string, string>;
const es = esLatam as Record<string, string>;
const FACTORS_PY = join(
  __dirname,
  '../../../../../trazo-back/carbon/services/verified_emission_factors.py'
);

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: !/max-width/.test(query),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    })
  });
});
afterEach(cleanup);

const DIESEL = {
  value: 10.21,
  unit: 'kg_CO2_per_gallon',
  source: 'EPA Greenhouse Gas Emission Factors Hub (40 CFR Part 98)',
  provenance: 'published'
};

/** A copper spray from a paper log: 5 lb, 30%, 4 acres, no fuel entered. */
const AREA_ESTIMATED_SPRAY = {
  co2e: 9.4,
  calculation_method: 'optimized_v2_optimized_per_input_factors',
  verification_status: 'estimate',
  original_volume_applied: 5,
  original_volume_unit: 'lbs',
  original_area_treated: 4,
  original_area_unit: 'acres',
  breakdown: {
    chemical_type: 'FU',
    fungicide_subtype: 'copper',
    chemical_subtype_used: 'copper_fungicide',
    active_ingredient_percentage: 30,
    active_ingredient_kg: 0.68,
    concentration_source: 'user_provided',
    emission_factor_kg_co2_per_kg: 5.5,
    manufacturing_emissions_kg_co2e: 3.7,
    application_emissions_kg_co2e: 5.7,
    application_fuel_liters: 6.47,
    application_fuel_gallons: 1.71,
    application_fuel_type: 'diesel',
    application_method: 'air_blast',
    epa_diesel_factor_kg_co2_per_gallon: 10.21,
    application_pass_basis: 'estimated_application_fuel',
    fuel_basis: {
      measured: false,
      emission_factor: DIESEL,
      assumed_fuel_is_diesel: false,
      assumed_rate: {
        value: 4,
        unit: 'L/ha',
        source: 'Trazo estimate of application fuel per hectare, by application method',
        provenance: 'internal_estimate'
      },
      estimated_from: 'area_and_application_method'
    },
    figure_basis: 'estimate',
    estimate_reasons: ['application_fuel_estimated_from_area', 'trazo_estimate_factor']
  }
};

/** The same spray with diesel entered and a published product factor on a weighed amount. */
const FROM_RECORDED_INPUTS = {
  ...AREA_ESTIMATED_SPRAY,
  verification_status: 'factors_verified',
  breakdown: {
    ...AREA_ESTIMATED_SPRAY.breakdown,
    fungicide_subtype: 'synthetic',
    chemical_subtype_used: 'auto-detected',
    application_pass_basis: 'actual_application_fuel',
    fuel_basis: {
      measured: true,
      emission_factor: DIESEL,
      assumed_fuel_is_diesel: false,
      assumed_rate: null,
      estimated_from: null
    },
    figure_basis: 'published_factors',
    estimate_reasons: []
  }
};

/** No concentration, and no fuel or area: manufacturing left out, no pass, nothing to show. */
const NO_CONCENTRATION_NOTHING_ELSE = {
  co2e: 0,
  calculation_method: 'optimized_v2_optimized_per_input_factors',
  verification_status: 'estimate',
  not_estimated: true,
  breakdown: {
    chemical_type: 'FU',
    fungicide_subtype: 'copper',
    concentration_source: 'not_recorded',
    emission_factor_kg_co2_per_kg: 5.5,
    manufacturing_emissions_kg_co2e: 0,
    manufacturing_emissions_omitted: true,
    manufacturing_omitted_code: 'concentration_not_recorded',
    application_emissions_kg_co2e: 0,
    application_pass_basis: 'application_not_estimated',
    figure_basis: 'estimate',
    estimate_reasons: ['concentration_not_recorded', 'application_not_estimated']
  }
};

/** No concentration, recorded fuel: a figure, from the pass only. */
const NO_CONCENTRATION_WITH_FUEL = {
  ...FROM_RECORDED_INPUTS,
  co2e: 5.7,
  verification_status: 'estimate',
  breakdown: {
    ...FROM_RECORDED_INPUTS.breakdown,
    fungicide_subtype: 'copper',
    active_ingredient_percentage: undefined,
    active_ingredient_kg: undefined,
    concentration_source: 'not_recorded',
    manufacturing_emissions_kg_co2e: 0,
    manufacturing_emissions_omitted: true,
    manufacturing_omitted_code: 'concentration_not_recorded',
    figure_basis: 'estimate',
    estimate_reasons: ['concentration_not_recorded']
  }
};

const preview = (
  calculation: object,
  messages: Record<string, string> = en,
  locale = 'en-US',
  open = true
) => {
  render(
    <IntlProvider locale={locale} messages={messages}>
      <ChakraProvider theme={theme}>
        <CarbonImpactPreview
          eventType="Chemical"
          formData={{ type: 'FU' }}
          calculation={calculation as never}
        />
      </ChakraProvider>
    </IntlProvider>
  );
  if (open) fireEvent.click(screen.getByText(messages['carbon.details.show']));
};

const modal = (carbonData: object, locale = 'en-US', messages = en) =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messages}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2']}>
          <EventDetailsModal
            isOpen
            onClose={vi.fn()}
            event={
              {
                id: 90,
                description: 'Copper spray, north block.',
                date: '2026-04-20T00:00:00Z',
                created_by: 7,
                type: 'FU',
                event_type: 2,
                carbon_data: carbonData
              } as never
            }
            members={[]}
            farmId="1"
            parcelId="2"
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('every reason the calculator can send has copy', () => {
  it('the app knows exactly the backend codes, and each is worded in both locales', () => {
    const source = readFileSync(FACTORS_PY, 'utf8');
    const block = source.slice(source.indexOf('CHEMICAL_ESTIMATE_REASONS = {'));
    const codes = [...block.slice(0, block.indexOf('}')).matchAll(/^\s+"([a-z_]+)":/gm)].map(
      (m) => m[1]
    );
    expect(codes.length, 'read no reason code from trazo-back').toBeGreaterThanOrEqual(9);
    expect([...ESTIMATE_REASON_CODES].sort()).toEqual([...codes].sort());
    const missing = codes.filter(
      (c) => !en[`carbon.estimateReason.${c}`] || !es[`carbon.estimateReason.${c}`]
    );
    expect(missing).toEqual([]);
  });

  it('no new string says "verified" or carries an em dash', () => {
    const keys = [
      'carbon.badge.estimate',
      'carbon.badge.estimateCaption',
      'carbon.notEstimatedFromRecord',
      'carbon.assumedFuel.explainApplicationPass',
      ...ESTIMATE_REASON_CODES.map((c) => `carbon.estimateReason.${c}`)
    ];
    for (const key of keys) {
      for (const messages of [en, es]) {
        expect(messages[key], key).toBeTruthy();
        expect(messages[key], key).not.toMatch(/verifi/i);
        expect(messages[key], key).not.toContain('\u2014');
      }
    }
  });

  it('an unknown code is dropped rather than printed raw', () => {
    expect(estimateReasonMessageIds(['npk_not_recorded', 'something_new'])).toEqual([
      'carbon.estimateReason.npk_not_recorded'
    ]);
  });
});

describe('carbonStatus: an estimate never gets the inputs badge', () => {
  const estimate = { co2e: 9.4, verification_status: 'estimate', usda_factors_based: true };

  it('the estimate label and the inputs badge are mutually exclusive', () => {
    expect(showsInputsBadge(estimate)).toBe(false);
    expect(showsEstimateLabel(estimate)).toBe(true);
    expect(showsAreaEstimateLabel(estimate)).toBe(false);
    expect(showsEstimateLabel({ ...estimate, co2e: 0 })).toBe(false);
    expect(showsEstimateLabel({ ...estimate, not_estimated: true })).toBe(false);
    expect(
      showsEstimateLabel({
        co2e: 4,
        verification_status: 'epa_usda_sourced',
        usda_factors_based: true
      })
    ).toBe(false);
  });
});

describe('form preview', () => {
  it('an area-estimated pass: "Estimated fuel", the Trazo rate in litres, the reasons, no inputs badge', () => {
    preview(AREA_ESTIMATED_SPRAY);
    expect(screen.getByText(en['carbon.badge.estimatedFuel'])).toBeInTheDocument();
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
    expect(
      screen.getByText(en['carbon.assumedFuel.explainApplicationPass'].replace('{rate}', '4'))
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/US average/);
    for (const code of AREA_ESTIMATED_SPRAY.breakdown.estimate_reasons) {
      expect(screen.getByText(en[`carbon.estimateReason.${code}`])).toBeInTheDocument();
    }
    // The estimated fuel is not listed under "Your application" as if it were entered.
    expect(screen.queryByText(en['carbonPreview.label.applicationFuel'])).toBeNull();
  });

  it('an estimate with no fuel basis still reads "Estimate", never the inputs badge', () => {
    preview(NO_CONCENTRATION_WITH_FUEL);
    expect(screen.getAllByText(en['carbon.badge.estimate']).length).toBeGreaterThan(0);
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
    expect(
      screen.getByText(en['carbon.estimateReason.concentration_not_recorded'])
    ).toBeInTheDocument();
  });

  it('no concentration prints no percentage and no factor that multiplied nothing', () => {
    preview(NO_CONCENTRATION_WITH_FUEL);
    expect(screen.queryByText(en['carbonPreview.chem.activeIngredient'])).toBeNull();
    expect(document.body.textContent).not.toMatch(/\(default\)/);
    expect(screen.queryByText(en['carbonPreview.chem.factor'])).toBeNull();
  });

  it('a fertilizer with no N-P-K prints no factor beside "manufacturing not included"', () => {
    // Review of app #387: the product row was guarded but the fertilizer factor row was not.
    preview({
      ...NO_CONCENTRATION_WITH_FUEL,
      breakdown: {
        ...NO_CONCENTRATION_WITH_FUEL.breakdown,
        chemical_type: 'FE',
        fungicide_subtype: undefined,
        fertilizer_subtype: 'synthetic_nitrogen',
        emission_factor_kg_co2_per_kg: 4.2,
        manufacturing_omitted_code: 'npk_not_recorded',
        estimate_reasons: ['npk_not_recorded']
      }
    });
    expect(screen.getByText(en['carbonPreview.chem.fertilizerType'])).toBeInTheDocument();
    expect(screen.queryByText(en['carbonPreview.chem.factor'])).toBeNull();
    expect(document.body.textContent).not.toMatch(/4\.20\s*kg CO₂e\/kg/);
  });

  it('a figure from recorded inputs and published factors keeps its badge', () => {
    preview(FROM_RECORDED_INPUTS);
    expect(screen.getAllByText(en['carbon.badge.epaUsdaSourced']).length).toBeGreaterThan(0);
    expect(screen.queryByText(en['carbon.badge.estimate'])).toBeNull();
    expect(screen.getByText(en['carbonPreview.label.applicationFuel'])).toBeInTheDocument();
  });

  it('a zero built from left-out parts reads "not estimated" with its reasons, in Spanish too', () => {
    preview(NO_CONCENTRATION_NOTHING_ELSE, es, 'es-419', false);
    expect(screen.getByText(es['carbon.notEstimatedFromRecord'])).toBeInTheDocument();
    expect(
      screen.getByText(es['carbon.estimateReason.concentration_not_recorded'])
    ).toBeInTheDocument();
    expect(
      screen.getByText(es['carbon.estimateReason.application_not_estimated'])
    ).toBeInTheDocument();
    expect(screen.queryByText(es['carbonPreview.noEmissions.default'])).toBeNull();
  });
});

describe('detail modal', () => {
  const served = {
    co2e: 9.4,
    usda_factors_based: false,
    calculation_basis: 'estimate',
    verification_status: 'estimate',
    estimate_reasons: ['application_fuel_estimated_from_area', 'trazo_estimate_factor'],
    calculation_method: 'calculated',
    event_type: 'chemical',
    timestamp: '2026-04-20T00:00:00Z'
  };

  it('en: the estimate chip, its caption and reasons, and no inputs badge', () => {
    modal(served);
    expect(screen.getByText(en['carbon.badge.estimate'])).toBeInTheDocument();
    expect(screen.getByText(en['carbon.badge.estimateCaption'])).toBeInTheDocument();
    expect(
      screen.getByText(en['carbon.estimateReason.application_fuel_estimated_from_area'])
    ).toBeInTheDocument();
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('es-419: the same, in Spanish', () => {
    modal(served, 'es-419', es);
    expect(screen.getByText(es['carbon.badge.estimate'])).toBeInTheDocument();
    expect(screen.getByText(es['carbon.estimateReason.trazo_estimate_factor'])).toBeInTheDocument();
    expect(screen.queryByText(es['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('a served row that still carries the published flag gets no inputs badge when it is an estimate', () => {
    modal({ ...served, usda_factors_based: true });
    expect(screen.queryByText(en['carbon.badge.epaUsdaSourced'])).toBeNull();
  });

  it('the chip is drawn neutral, never green or a colour scheme', () => {
    const code = readFileSync(join(__dirname, '../../Modals/EventDetailsModal.tsx'), 'utf8');
    const at = code.indexOf("'carbon.badge.estimate'");
    const tag = code.slice(code.lastIndexOf('<Badge', at), at);
    expect(at).toBeGreaterThan(-1);
    expect(tag).toMatch(/variant="neutral"/);
    expect(tag).not.toMatch(/green|colorScheme/);
  });
});
