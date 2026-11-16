/**
 * One spray on several parcels, parcel after parcel: the start and stop may differ by parcel.
 *
 * An airblast job over several blocks takes hours, and a drift question asks when THIS parcel was
 * sprayed. The spray form keeps one shared start and stop by default; "Different on each parcel"
 * hides them and the parcel cards ask each parcel's own (components/Events/MultiParcel.tsx). The
 * request side is pinned in utils/__tests__/multiParcel.test.ts and the server side in trazo-back
 * history/tests/test_multi_parcel_activity.py.
 *
 * Each "is not on the page" assertion first proves the section rendered, so an empty render
 * cannot pass.
 */
import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import { baseApi } from 'store/api/baseApi';
// @ts-expect-error: ChemicalTab-ENHANCED is a .jsx module with no type declarations.
import ChemicalTab from 'views/Dashboard/Dashboard/components/forms/ChemicalTab-ENHANCED';

afterEach(cleanup);

const SPRAY = {
  type: 'PE',
  commercial_name: 'Entrust SC',
  volume_unit: 'fl_oz',
  area_unit: 'acres',
  application_method: 'air_blast'
};

const store = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          establishments: [{ id: 1, name: 'Farm', state: 'WA', country: 'US' }]
        }
      }),
      [baseApi.reducerPath]: baseApi.reducer
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const Tab = ({
  multiTarget,
  onChoice
}: {
  multiTarget: boolean;
  onChoice?: (perParcel: boolean) => void;
}) => {
  const [timesPerParcel, setTimesPerParcel] = useState(false);
  return (
    <ChemicalTab
      initialValues={SPRAY}
      hideActions
      hideTypeSelect
      multiTarget={multiTarget}
      timesPerParcel={timesPerParcel}
      onTimesPerParcelChange={(next: boolean) => {
        setTimesPerParcel(next);
        onChoice?.(next);
      }}
      onSubmitHandler={vi.fn()}
    />
  );
};

const renderTab = (props: React.ComponentProps<typeof Tab>) =>
  render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider
                  locale="en"
                  messages={enUS as unknown as Record<string, string>}
                  onError={() => undefined}>
                  <Tab {...props} />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

const startInput = (container: HTMLElement) =>
  container.querySelector('[name="application_start"]');
const endInput = (container: HTMLElement) => container.querySelector('[name="application_end"]');

const conditionsRendered = async (container: HTMLElement) =>
  waitFor(() => expect(container.querySelector('[data-testid="spray-conditions"]')).not.toBeNull());

describe('start and stop times with several parcels', () => {
  it('one parcel: no switch, the start and stop are asked as before', async () => {
    const { container } = renderTab({ multiTarget: false });
    await conditionsRendered(container);
    expect(container.querySelector('[data-testid="times-per-parcel"]')).toBeNull();
    expect(startInput(container)).not.toBeNull();
    expect(endInput(container)).not.toBeNull();
  });

  it('several parcels: shared is the default, so the shared inputs stay', async () => {
    const { container } = renderTab({ multiTarget: true });
    await conditionsRendered(container);
    expect(screen.getByRole('button', { name: 'Same on every parcel' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(startInput(container)).not.toBeNull();
    expect(endInput(container)).not.toBeNull();
    expect(container.textContent).not.toContain("Each parcel's card below");
  });

  it('"different on each parcel" hides the shared inputs and points to the cards', async () => {
    const onChoice = vi.fn();
    const { container } = renderTab({ multiTarget: true, onChoice });
    await conditionsRendered(container);
    fireEvent.click(screen.getByRole('button', { name: 'Different on each parcel' }));
    expect(onChoice).toHaveBeenLastCalledWith(true);
    await waitFor(() => expect(startInput(container)).toBeNull());
    expect(endInput(container)).toBeNull();
    expect(container.textContent).toContain(
      "Each parcel's card below asks its own start and stop."
    );

    fireEvent.click(screen.getByRole('button', { name: 'Same on every parcel' }));
    expect(onChoice).toHaveBeenLastCalledWith(false);
    await waitFor(() => expect(startInput(container)).not.toBeNull());
  });
});
