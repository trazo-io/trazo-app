/**
 * The California DPR Restricted Materials Permit section belongs to California farms.
 *
 * 🔴 Audit T05, in its most concrete form. The block was gated on the PRODUCT NAME alone —
 * a ten-word keyword list containing `sulfur`, `spinosad`, `entrust` and three coppers, which
 * are ordinary organic inputs used everywhere. So an Oregon grower logging a copper fungicide
 * was shown a California county permit section asking for a permit number, an issuing county
 * and an expiry date that do not exist outside California, with nothing on screen saying it did
 * not apply to them. "Optional does not mean effortless": the cost is the farmer having to work
 * out that a required-looking compliance section is irrelevant.
 *
 * The sibling identity block (operator ID / site ID / county — DPR-PML-017C boxes 3, 8 and 10)
 * has always been state-gated. This section was the one that was not.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
// @ts-expect-error — ChemicalTab-ENHANCED is a .jsx module with no type declarations. The two
// existing tests that mount it (formRenderConformance, subtypeAskedOnce) carry the identical
// TS7016 in the typecheck baseline; suppressing it here keeps this file off that baseline
// rather than adding a seventh entry to it.
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';

const messages = enUS as unknown as Record<string, string>;

/** `useFarmState` reads the establishment matching the route's farmId out of the store. */
const storeForState = (state: string | null) =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Test Farm', state, country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

/** A copper fungicide: on the CA restricted keyword list, and an everyday organic input. */
const RESTRICTED_PRODUCT = {
  type: 'FU',
  chemical_subtype: 'FU',
  commercial_name: 'Kocide 3000 copper hydroxide'
};

const renderChemicalTab = (farmState: string | null) =>
  render(
    <Provider store={storeForState(farmState)}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => undefined}>
                  <ChemicalTab
                    initialValues={RESTRICTED_PRODUCT}
                    hideActions
                    onSubmitHandler={() => undefined}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const permitFieldPresent = (container: HTMLElement) =>
  container.querySelector('[name="ca_dpr_permit_number"]') !== null;

describe('the CA DPR restricted-materials permit section', () => {
  it('is shown to a CALIFORNIA farm using a restricted product', async () => {
    // The mirror. Without it, hiding the section everywhere would also pass.
    const { container } = renderChemicalTab('CA');
    await waitFor(() => expect(permitFieldPresent(container)).toBe(true));
  });

  it('is NOT shown to an Oregon farm using the same product', async () => {
    const { container } = renderChemicalTab('OR');
    await waitFor(() =>
      expect(screen.queryAllByText(/Kocide|Chemical/i).length).toBeGreaterThan(0)
    );
    expect(permitFieldPresent(container)).toBe(false);
  });

  it('is NOT shown when the farm state is unknown', async () => {
    // Fail closed: inventing a Californian obligation for a farm whose state we cannot read is
    // worse than omitting an optional section.
    const { container } = renderChemicalTab(null);
    await waitFor(() => expect(screen.queryAllByText(/Chemical/i).length).toBeGreaterThan(0));
    expect(permitFieldPresent(container)).toBe(false);
  });
});
