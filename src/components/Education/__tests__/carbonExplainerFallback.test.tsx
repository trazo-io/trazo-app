/**
 * The consumer carbon card must never render as a header over an empty body.
 *
 * `consumer_context.has_per_kg_data` is false whenever `total_co2_kg_per_kg` is 0
 * (transparency_response_formatter.py:214) — which is any finished season without a
 * recorded harvest amount to divide by. Before this guard the card still painted its
 * "Environmental Impact" heading, its subtitle and the methodology expander, with nothing
 * between them: a broken-looking page that also invites the shopper to read the silence as
 * "zero emissions", a claim the records do not make (FTC 16 CFR 260.6).
 *
 * Two behaviours are pinned here:
 *   1. no per-kg but a real season total  → the season total renders, with its boundary line
 *   2. no per-kg and no total at all      → the component renders nothing
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { CarbonImpactExplainer } from '../CarbonImpactExplainer';
import enUS from '../../../i18n/lang/en-US.json';

// Real catalogue, not a stub: a missing key then surfaces as a raw id in an assertion
// instead of silently passing.
const messages = enUS as unknown as Record<string, string>;

const renderCard = (props: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <MemoryRouter>
        <IntlProvider locale="en" messages={messages} onError={() => {}}>
          <CarbonImpactExplainer {...(props as any)} />
        </IntlProvider>
      </MemoryRouter>
    </ChakraProvider>
  );

const NO_PER_KG = {
  kg_per_kg: 0,
  per_kg_miles: 0,
  per_kg_phone_charges: 0,
  has_per_kg_data: false
};

describe('CarbonImpactExplainer — no empty card', () => {
  it('falls back to the season total when the per-kg figure is unavailable', () => {
    const { container } = renderCard({
      totalCO2e: 412.37,
      productName: 'Chandler Walnuts',
      consumerContext: NO_PER_KG,
      backendComparisons: { driving_miles: 1160.1, trees_per_year: 19, kwh_electricity: 1057 }
    });

    // The card is there, and it carries a number rather than a heading over nothing.
    expect(screen.getByText('Estimated emissions from recorded work and inputs')).toBeInTheDocument();
    expect(screen.getByText("This season's total")).toBeInTheDocument();
    expect(screen.getByText('412.4')).toBeInTheDocument();

    // NOT "Your Impact": this is the farm's whole season, and reusing the per-kg card's
    // heading would tell a shopper that 412 kg is their share of it.
    expect(screen.queryByText('Your Impact')).not.toBeInTheDocument();
    // Run 8 (R8-14): the unit names CO2e, and no driving or phone comparison is drawn from an
    // estimate whose boundary does not travel with it.
    expect(screen.getByText('kg CO2e from recorded farm work and purchased inputs')).toBeInTheDocument();
    expect(screen.queryByText(/Like driving/)).not.toBeInTheDocument();

    // FTC 16 CFR 260.4(c): the boundary travels with the number, in the same block, never
    // only behind the expander.
    //
    // ⚠️ Asserts the CLAIM, not the sentence. This used to pin the exact wording
    // "Not a full life-cycle footprint: transport, packaging, and retail", which made it a prose
    // snapshot: it failed when that copy was corrected on 2026-09-08 and it would have passed
    // unchanged if the boundary had been made FALSER, so long as the words survived.
    expect(screen.getByText(/Not a full life-cycle footprint/)).toBeInTheDocument();

    // 🔴 And the two claims that must never come back. The card lists "Crop nutrient production"
    // and "Crop protection product manufacturing" among its own categories, so it cannot also say
    // it excludes the supply chain — and P2O5/K2O are `PROVENANCE_INTERNAL_ESTIMATE` ("Trazo
    // conservative estimate") with crop protection from Audsley et al. 2009, so "all factors
    // sourced from EPA and USDA" attributes our own numbers to a federal agency.
    expect(container.textContent).not.toMatch(/direct farm emissions/i);
    expect(container.textContent).not.toMatch(/not supply chain|not full supply chain/i);
    expect(container.textContent).not.toMatch(/all emission factors (are )?sourced from/i);

    expect(container.textContent).not.toContain('app.carbonExplainer');
  });

  it('formats the season total through react-intl', () => {
    renderCard({
      totalCO2e: 1234.56,
      productName: 'Chandler Walnuts',
      consumerContext: NO_PER_KG,
      backendComparisons: { driving_miles: 3473.2, trees_per_year: 57, kwh_electricity: 3165 }
    });

    // Both go through react-intl. The raw JS number rendered "1234.6" next to "3,473.2".
    expect(screen.getByText('1,234.6')).toBeInTheDocument();
    expect(screen.queryByText(/Like driving/)).not.toBeInTheDocument();
  });

  it('omits the driving comparison when the backend sent none', () => {
    renderCard({
      totalCO2e: 88,
      productName: 'Chandler Walnuts',
      consumerContext: NO_PER_KG
    });

    expect(screen.getByText('88')).toBeInTheDocument();
    expect(screen.queryByText(/Like driving/)).not.toBeInTheDocument();
  });

  it('renders nothing at all when there is no per-kg figure and no season total', () => {
    const { container } = renderCard({
      totalCO2e: 0,
      productName: 'Chandler Walnuts',
      consumerContext: NO_PER_KG
    });

    // Chakra always injects a hidden <span id="__chakra_env">, so assert on the text the
    // component would have contributed rather than on an empty node.
    expect(container.textContent).toBe('');
    expect(screen.queryByText('Estimated emissions from recorded work and inputs')).not.toBeInTheDocument();
  });

  it('still prefers the per-kg framing when the harvest amount is recorded', () => {
    renderCard({
      totalCO2e: 412.37,
      productName: 'Chandler Walnuts',
      consumerContext: {
        kg_per_kg: 0.42,
        per_kg_miles: 1.2,
        per_kg_phone_charges: 140,
        has_per_kg_data: true
      }
    });

    expect(screen.getByText('Growing 1 kg of Chandler Walnuts produced')).toBeInTheDocument();
    expect(screen.getByText('0.42')).toBeInTheDocument();
    // The season-total fallback must not appear alongside it.
    expect(screen.queryByText('Total Production Emissions')).not.toBeInTheDocument();
  });
});
