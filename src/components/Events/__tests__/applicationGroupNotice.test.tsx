/**
 * A record that is one of several from one application says so, in the detail and in the edit
 * form; a single-parcel record says nothing.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';

const detail = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('store/api/historyApi', () => ({
  useGetEventQuery: () => ({ data: detail.data })
}));

import { ApplicationGroupNotice } from '../ApplicationGroupNotice';

const m = enUS as Record<string, string>;

const mount = (variant: 'detail' | 'edit') =>
  render(
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider locale="en" messages={m}>
          <ApplicationGroupNotice
            farmId="1"
            eventId="7"
            eventType={2}
            parcelName="North"
            variant={variant}
          />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

describe('ApplicationGroupNotice', () => {
  it('names the other parcels of the application on the record', () => {
    detail.data = {
      group_records: [
        { id: 8, parcel: 2, parcel_name: 'South' },
        { id: 9, parcel: 3, parcel_name: 'East' }
      ]
    };
    mount('detail');
    expect(screen.getByText('One application on 3 parcels')).toBeInTheDocument();
    expect(screen.getByText(/also recorded on South, East/)).toBeInTheDocument();
  });

  it('says, when editing, that the change is this parcel’s only', () => {
    detail.data = { group_records: [{ id: 8, parcel: 2, parcel_name: 'South' }] };
    mount('edit');
    expect(screen.getByText(/apply to this parcel only/)).toBeInTheDocument();
    expect(screen.getByText(/also recorded on South/)).toBeInTheDocument();
  });

  it('says nothing for a single-parcel record', () => {
    detail.data = { group_records: [] };
    const { container } = mount('detail');
    expect(container.textContent).toBe('');
  });
});
