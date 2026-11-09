/**
 * What each off-farm facility takes (2026-11-09): CCOF G6.1 C2 / G6.2 A2, OTCO C7 7.7-2 / 7.10-2.
 *
 * The crops are the server's, read from the production records linked to the facility; the editor
 * saves only the operator's products and packaging form.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';
import FacilityProductsEditor, { cropsLine } from '../FacilityProductsEditor';

const update = vi.fn();
vi.mock('store/api/postHarvestFacilityApi', () => ({
  useUpdatePostHarvestFacilityMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => update(...a) }),
    { isLoading: false }
  ]
}));

// The product rows have their own test (facilityProductRows.test.tsx).
vi.mock('../FacilityProductRows', () => ({ default: () => null }));

const facility = (over: Record<string, unknown> = {}) => ({
  id: 4,
  name: 'Valley Packers',
  facility_type: 'packer',
  facility_type_display: 'Packer / Packing Shed',
  role: 'handling',
  role_display: 'Handles the crop',
  verification_status: 'unverified',
  verification_status_display: 'Unverified',
  is_verified: false,
  cert_is_current: null,
  public_id: 'x',
  products_detail: '',
  crops_recorded: [
    { crop: 'Blueberries', years: [2025, 2026] },
    { crop: 'Garlic', years: [2026] }
  ],
  ...over
});

const tree = (f: Record<string, unknown>) => (
  <ChakraProvider>
    <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <FacilityProductsEditor facility={f as any} companyId="3" farmId="1" />
    </IntlProvider>
  </ChakraProvider>
);

const renderIt = (f: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <FacilityProductsEditor facility={f as any} companyId="3" farmId="1" />
      </IntlProvider>
    </ChakraProvider>
  );

describe('FacilityProductsEditor', () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue({});
  });

  it('shows the crops the records link to the facility, by season', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(cropsLine(facility() as any)).toBe('Blueberries (2025, 2026); Garlic (2026)');
    renderIt(facility());
    expect(
      screen.getByText('Crops on the records linked to it: Blueberries (2025, 2026); Garlic (2026)')
    ).toBeTruthy();
  });

  it('says when no record is linked', () => {
    renderIt(facility({ crops_recorded: [] }));
    expect(screen.getByText('No production record is linked to it yet.')).toBeTruthy();
  });

  it('follows a newer saved value while untouched', () => {
    const { rerender } = render(tree(facility({ products_detail: 'Old' })));
    rerender(tree(facility({ products_detail: 'Newer from another tab' })));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe(
      'Newer from another tab'
    );
    expect(screen.queryByText('Changed elsewhere')).toBeNull();
  });

  it('keeps an edit in progress and warns before it replaces a newer save', () => {
    const { rerender } = render(tree(facility({ products_detail: 'Old' })));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My edit' } });
    rerender(tree(facility({ products_detail: 'Newer from another tab' })));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('My edit');
    expect(screen.getByText('Changed elsewhere')).toBeTruthy();
    expect(screen.getByText(/Newer from another tab/)).toBeTruthy();
  });

  it('saves only the products the operator describes', async () => {
    renderIt(facility());
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Fresh blueberries, 1 pint clamshells' }
    });
    fireEvent.click(screen.getByText('Save products'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toEqual({
      companyId: '3',
      farmId: '1',
      facilityId: 4,
      data: { products_detail: 'Fresh blueberries, 1 pint clamshells' }
    });
  });
});
