/**
 * The farm page's Parcels card, empty, carries its own next step.
 *
 * Reproduced 2026-10-19 on a virgin Starter account: "No parcels yet / Create your first parcel"
 * was text only. The one way in was the dashed "+ New" tile in the card header, and at 1440px the
 * Getting Started panel sits on top of it. The empty state now carries a button that opens the
 * same two-field quick-add.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../i18n/lang/en-US.json';

vi.mock('hooks/useBatchS3Images', () => ({
  useBatchS3Images: () => ({ presignedUrls: {}, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));

import CarouselHorizontal from '../CarouselHorizontal';

function renderCard(maxParcels: number) {
  const store = configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 18,
          establishments: [{ id: 21, name: '1060', parcels: [] }],
          subscription: {
            status: 'active',
            plan: { slug: 'starter', features: { max_parcels_per_establishment: maxParcels } },
            effective_limits: { max_parcels_per_establishment: maxParcels }
          }
        }
      })
    }
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={enUS as any}>
        <ChakraProvider>
          <MemoryRouter initialEntries={['/admin/dashboard/farm/21']}>
            <Routes>
              <Route
                path="/admin/dashboard/farm/:farmId"
                element={
                  <CarouselHorizontal title="Parcels" description="Farm Parcels" data={[]} />
                }
              />
            </Routes>
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    </Provider>
  );
}

describe('Parcels card with no parcels', () => {
  it('offers "Add your first parcel" inside the empty state, and it opens the quick-add', () => {
    renderCard(-1);
    expect(screen.getByText(enUS['app.noParcelsYet'])).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: enUS['app.addFirstParcel'] }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(enUS['parcel.quickAdd.title'])).toBeTruthy();
  });

  it('offers nothing a plan at its parcel limit would refuse', () => {
    // Same gate as the header tile: a button the server refuses is a dead end of its own.
    renderCard(0);
    expect(screen.getByText(enUS['app.noParcelsYet'])).toBeTruthy();
    expect(screen.queryByRole('button', { name: enUS['app.addFirstParcel'] })).toBeNull();
  });
});
