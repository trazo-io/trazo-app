/**
 * A consumer surface may never mint its own green environmental badge.
 *
 * Until 2026-09-23 the buyer page passed `carbon_impact.net_impact` (emissions MINUS
 * purchased offsets) into this card as `totalCO2e`, and the card rendered
 * "Very Low Emissions" with a green "Carbon Stored" badge whenever that figure went
 * negative. Offsets are self-entered and self-marked verified
 * (`carbon/views_security_enhanced.py::create_secure_carbon_offset`), so a farm could
 * award itself a public environmental claim by recording enough of them.
 *
 * That is the self-created sustainability label EU ECGT 2024/825 bans (live 2026-09-27),
 * and an FTC 16 CFR 260.5 (carbon offsets) / 260.4 (general environmental benefit) claim.
 * It is the same class as the transparency score retired in 2026-06 and it SURVIVED that
 * sweep because it was a colour and an icon rather than a number — which is exactly why
 * this guard reads the rendered output AND the source, not just one of them.
 *
 * Pinned here:
 *   1. a negative total renders no green claim, no badge, no "carbon stored" language;
 *   2. the card's source carries none of the retired strings;
 *   3. the buyer page does not read `net_impact` for the figure it shows a shopper.
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { CarbonImpactExplainer } from '../CarbonImpactExplainer';
import enUS from '../../../i18n/lang/en-US.json';

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

/** Language that asserts a net environmental BENEFIT rather than reporting a quantity. */
const BENEFIT_CLAIMS = [
  /carbon\s*stored/i,
  /carbon\s*negative/i,
  /climate\s*positive/i,
  /very\s*low\s*emissions/i,
  /carbon\s*neutral/i,
  /net\s*zero/i
];

describe('consumer carbon card — no self-created environmental badge', () => {
  it('renders no benefit claim when the figure it is handed is negative', () => {
    // Defence in depth: the buyer page now sends gross emissions, which cannot be
    // negative. Should any caller regress, the card must still refuse to make a claim.
    const { container } = renderCard({
      totalCO2e: -85.2,
      productName: 'Chandler Walnuts',
      consumerContext: {
        kg_per_kg: 0,
        per_kg_miles: 0,
        per_kg_phone_charges: 0,
        has_per_kg_data: false
      }
    });

    const rendered = container.textContent ?? '';
    for (const claim of BENEFIT_CLAIMS) {
      expect(rendered).not.toMatch(claim);
    }
    expect(screen.queryByText(/stored/i)).toBeNull();

    // No green claim card, and with nothing measurable to report, nothing at all.
    expect(rendered.trim()).toBe('');
  });

  it('still reports a real positive figure — this guard removes claims, not facts', () => {
    renderCard({
      totalCO2e: 412.37,
      productName: 'Chandler Walnuts',
      consumerContext: {
        kg_per_kg: 0,
        per_kg_miles: 0,
        per_kg_phone_charges: 0,
        has_per_kg_data: false
      },
      backendComparisons: { driving_miles: 1160.1, trees_per_year: 19, kwh_electricity: 1057 }
    });

    expect(screen.getByText('Environmental Impact')).toBeInTheDocument();
    expect(screen.getByText('412.4')).toBeInTheDocument();
  });

  it('carries none of the retired benefit strings in its source or its catalogues', () => {
    const source = readFileSync(
      resolve(__dirname, '../CarbonImpactExplainer.tsx'),
      'utf-8'
    );
    // The removal comment names them on purpose; strip it before scanning.
    const withoutComments = source.replace(/\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/g, '');

    expect(withoutComments).not.toMatch(/carbonExplainer\.carbonStored/);
    expect(withoutComments).not.toMatch(/carbonExplainer\.lowEmissions/);
    expect(withoutComments).not.toMatch(/isNegativeEmissions/);

    for (const key of Object.keys(messages)) {
      expect(key).not.toMatch(/carbonExplainer\.(carbonStored|lowEmissions)/);
    }
  });

  it('the buyer page reads gross emissions, never the offset-netted figure', () => {
    const page = readFileSync(
      resolve(__dirname, '../../../views/Scan/ProductDetail/ProductDetail.tsx'),
      'utf-8'
    );
    const start = page.indexOf('const getAccurateCarbonFootprint');
    expect(start).toBeGreaterThan(-1);
    // Bound by the function's own closing brace. ⛔ Not by a following comment: there are
    // two "// Educational modal" strings in this file and the first precedes the function,
    // which silently yields an empty slice and an assertion that can never fail.
    const fn = page.slice(start, page.indexOf('\n  };', start));

    expect(fn).toContain('carbon_impact?.total_emissions');
    // net_impact stays on the payload for the farmer's dashboard; it must not be the
    // number a shopper is shown.
    expect(fn).not.toContain('net_impact');
  });
});
