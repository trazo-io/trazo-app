/**
 * Farm home parcels are rows (2026-11-06): every parcel visible, statuses that mean what their
 * colour says, and no image placeholder for a parcel without a photo.
 *
 * Replaced CarouselHorizontal: fixed 310px tiles in a horizontal scroller (four of twenty parcels
 * on screen), a leaf placeholder in a 120px image box, and a green dot beside "Active".
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChakraProvider } from '@chakra-ui/react';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';

vi.mock('hooks/useBatchS3Images', () => ({
  useBatchS3Images: () => ({ presignedUrls: {}, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useCreateParcelMutation: () => [vi.fn(), { isLoading: false }]
}));

import FarmParcelsCard, { FarmParcel } from '../FarmParcelsCard';

const parcels: FarmParcel[] = Array.from({ length: 12 }, (_, i) => ({
  id: 100 + i,
  name: `Block ${i + 1}`,
  area: 4,
  product: i === 1 ? 'Walnuts' : null,
  application_status: ['complete', 'in_progress', 'not_started'][i % 3],
  evidence_status: i === 0 ? 'outstanding' : 'complete',
  evidence_missing: i === 0 ? [{}, {}] : [],
  has_current_production: i === 1
}));

function renderCard(list: FarmParcel[] = parcels) {
  const store = configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 18,
          establishments: [{ id: 21, parcels: list }],
          subscription: {
            status: 'active',
            plan: { slug: 'compliance', features: { max_parcels_per_establishment: -1 } },
            effective_limits: { max_parcels_per_establishment: -1 }
          }
        }
      })
    }
  });
  return render(
    <Provider store={store}>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ChakraProvider>
          <MemoryRouter>
            <FarmParcelsCard farmId={21} parcels={list} />
          </MemoryRouter>
        </ChakraProvider>
      </IntlProvider>
    </Provider>
  );
}

describe('farm home parcels', () => {
  it('lists every parcel as a row, with the count and total acres', () => {
    renderCard();
    expect(screen.getAllByTestId('farm-parcel-row')).toHaveLength(12);
    expect(screen.getByText('12 parcels · 118.6 ac')).toBeTruthy();
  });

  it('opens each parcel and starts an application that has not begun', () => {
    renderCard();
    const rows = screen.getAllByTestId('farm-parcel-row');
    const open = within(rows[0]).getByRole('link', { name: 'Open Block 1' });
    expect(open.getAttribute('href')).toBe('/admin/dashboard/farm/21/parcel/100');
    const start = within(rows[2]).getByRole('link', { name: 'Start the parcel application' });
    expect(start.getAttribute('href')).toBe('/admin/dashboard/farm/21/parcel/102/application');
  });

  it('shows the answers and the evidence still outstanding together', () => {
    renderCard();
    const first = screen.getAllByTestId('farm-parcel-row')[0];
    expect(first.textContent).toContain('Answers complete');
    expect(first.textContent).toContain('2 evidence items');
  });

  it('says a season is underway in words, with no image placeholder for a parcel without a photo', () => {
    const { container } = renderCard();
    const second = screen.getAllByTestId('farm-parcel-row')[1];
    expect(second.textContent).toContain('Season underway');
    expect(second.textContent).toContain('Walnuts');
    expect(container.querySelectorAll('img')).toHaveLength(0);
  });

  it('offers "New parcel" in the header when the plan allows another', () => {
    renderCard();
    expect(screen.getByRole('button', { name: 'New parcel' })).toBeTruthy();
  });
});
