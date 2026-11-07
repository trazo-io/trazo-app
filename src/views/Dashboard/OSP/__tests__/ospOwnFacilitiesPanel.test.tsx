/**
 * The operation's own facilities on G6.4 §B and G6.2 §A (2026-11-07): OTCO C7 7.1, 7.2-1, 7.7-2 OWN;
 * CCOF G6.4 A1, G6.2 B1.
 *
 * The panel lists only facilities the operation runs, with their full address and OWN, never a
 * certificate state; saves them as `this_operation` with no certificate fields; and uploads a layout
 * separately. A failed load is never an empty list.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import OSPOwnFacilitiesPanel, { fullAddress } from '../OSPOwnFacilitiesPanel';

let query: Record<string, unknown> = {};
const add = vi.fn();
const update = vi.fn();
const upload = vi.fn();
const unwrapping = (fn: ReturnType<typeof vi.fn>, value: unknown) =>
  fn.mockImplementation(() => ({ unwrap: () => Promise.resolve(value) }));

vi.mock('store/api/postHarvestFacilityApi', () => ({
  useGetPostHarvestFacilitiesQuery: () => query,
  useAddPostHarvestFacilityMutation: () => [add, { isLoading: false }],
  useUpdatePostHarvestFacilityMutation: () => [update, { isLoading: false }],
  useUploadFacilityLayoutMutation: () => [upload, { isLoading: false }]
}));

const facility = (over: Record<string, unknown>) => ({
  id: 7,
  name: 'Home packing shed',
  facility_type: 'packer',
  facility_type_display: 'Packer / Packing Shed',
  role: 'both',
  role_display: 'Stores and handles the crop',
  operated_by: 'this_operation',
  is_own: true,
  address: '100 Farm Rd',
  city: 'Tangent',
  state: 'OR',
  postal_code: '97389',
  country: 'USA',
  layout_document: null,
  cert_is_current: null,
  ...over
});

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPOwnFacilitiesPanel companyId="3" farmId="1" />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPOwnFacilitiesPanel', () => {
  beforeEach(() => {
    query = { data: [], isLoading: false, isError: false };
    add.mockReset();
    update.mockReset();
    upload.mockReset();
  });

  it('lists only own facilities, with the full address and OWN, never a certificate state', () => {
    query = {
      data: [
        facility({}),
        facility({ id: 8, name: 'Valley Huller', operated_by: 'another_operation', is_own: false })
      ],
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getAllByTestId('own-facility-row')).toHaveLength(1);
    expect(screen.getByText('Home packing shed')).toBeTruthy();
    expect(screen.queryByText('Valley Huller')).toBeNull();
    expect(screen.getByText('100 Farm Rd, Tangent, OR 97389, USA')).toBeTruthy();
    expect(screen.getByText('Run by this operation, under its own certificate (OWN)')).toBeTruthy();
    expect(screen.getByText('No layout attached')).toBeTruthy();
    expect(screen.queryByText(/certificate on file|date not stated|expired/i)).toBeNull();
  });

  it('a failed load says so instead of showing an empty list', () => {
    query = { data: undefined, isLoading: false, isError: true };
    renderPanel();
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
    expect(screen.queryByText(/No facility you run yourself/)).toBeNull();
  });

  it('adds a facility as the operation’s own, with no certificate fields, then uploads its layout', async () => {
    unwrapping(add, { id: 42 });
    unwrapping(upload, { id: 42 });
    renderPanel();
    fireEvent.click(screen.getByText('Add a facility you run'));
    expect(screen.queryByLabelText(/certificate/i)).toBeNull();
    fireEvent.change(screen.getByLabelText(/Facility name/), { target: { value: 'North cooler' } });
    fireEvent.change(screen.getByLabelText('Zip / postal code'), { target: { value: '97389' } });
    const file = new File(['%PDF'], 'layout.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Layout'), { target: { files: [file] } });
    fireEvent.click(screen.getByText('Save facility'));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    const sent = add.mock.calls[0][0].data;
    expect(sent.operated_by).toBe('this_operation');
    expect(sent.name).toBe('North cooler');
    expect(sent.postal_code).toBe('97389');
    expect(Object.keys(sent).some((k) => k.startsWith('cert'))).toBe(false);
    expect(upload.mock.calls[0][0]).toMatchObject({ facilityId: 42, file });
  });

  it('a failed layout upload keeps the saved facility and a retry updates it, never adds another', async () => {
    unwrapping(add, { id: 42 });
    upload.mockImplementationOnce(() => ({ unwrap: () => Promise.reject(new Error('too big')) }));
    unwrapping(update, { id: 42 });
    renderPanel();
    fireEvent.click(screen.getByText('Add a facility you run'));
    fireEvent.change(screen.getByLabelText(/Facility name/), { target: { value: 'North cooler' } });
    const file = new File(['%PDF'], 'layout.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Layout'), { target: { files: [file] } });
    fireEvent.click(screen.getByText('Save facility'));
    await waitFor(() =>
      expect(screen.getByText(/The facility was saved, but the layout did not upload/)).toBeTruthy()
    );
    expect(screen.queryByText('The facility was not saved')).toBeNull();
    unwrapping(upload, { id: 42 });
    fireEvent.click(screen.getByText('Save facility'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(add).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].facilityId).toBe(42);
  });

  it('formats the address from the parts recorded', () => {
    expect(fullAddress({ city: 'Tangent', state: 'OR' })).toBe('Tangent, OR');
    expect(fullAddress({})).toBe('');
  });
});
