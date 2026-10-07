/**
 * The buyer page prints no "Sustainability Commitment" list from the sign-up goals.
 *
 * Recordkeeping review F-11 (2026-10-07): six tiles ticked at company sign-up ("Soil Health
 * Focus", "Clean Energy Use", ...) printed on the public buyer page as a "Sustainability
 * Commitment" list, a public environmental-benefit claim with no record behind any of them
 * (16 CFR 260.4 class; the self-created label class ECGT 2024/825 bans). The stored field stays;
 * the wizard stopped asking and this surface stopped printing. Red on the old component.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import { CompanyFarmInfo } from '../ProductDetail/components/CompanyFarmInfo';
import enUS from '../../../i18n/lang/en-US.json';

describe('the buyer page and the sign-up goals', () => {
  it('prints no Sustainability Commitment list even when goals are stored', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <CompanyFarmInfo
            companyData={
              {
                name: 'Silver Reef Farms',
                description: 'Family orchard on the Calapooia.',
                sustainability_goals: ['Soil Health Focus', 'Renewable Energy Use']
              } as never
            }
          />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(screen.getByText('Silver Reef Farms')).toBeTruthy();
    expect(screen.queryByText('Sustainability Commitment')).toBeNull();
    expect(screen.queryByText('Soil Health Focus')).toBeNull();
  });
});
