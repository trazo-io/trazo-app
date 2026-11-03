/**
 * The equipment register on the farm profile (2026-11-11): CCOF G6.0 C, OTCO C9 9.1, WSDA 2121 I.
 *
 * "Not stated" saves as null, never as no, and the state line words the server's missing codes.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../i18n/lang/en-US.json';
import EquipmentRegisterSection from '../EquipmentRegisterSection';

const add = vi.fn();
let items: unknown[] = [];
let loadFailed = false;
vi.mock('store/api/productionEquipmentApi', () => ({
  useGetProductionEquipmentQuery: () =>
    loadFailed
      ? { data: undefined, isLoading: false, isError: true }
      : { data: items, isLoading: false },
  useAddProductionEquipmentMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => add(...a) }),
    { isLoading: false }
  ],
  useUpdateProductionEquipmentMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteProductionEquipmentMutation: () => [vi.fn(), { isLoading: false }]
}));

const renderAt = (url = '/admin/dashboard/farm/1/profile') =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter initialEntries={[url]}>
          <EquipmentRegisterSection companyId="3" farmId="1" />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('EquipmentRegisterSection', () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    items = [];
    loadFailed = false;
    add.mockReset();
    add.mockResolvedValue({});
  });

  it('saves not stated as null, never as no', async () => {
    renderAt();
    fireEvent.click(screen.getByText('Add equipment'));
    const form = screen.getByTestId('equipment-form');
    fireEvent.change(form.querySelector('input') as HTMLInputElement, {
      target: { value: 'Air-blast sprayer' }
    });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(add).toHaveBeenCalled());
    const { data } = add.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(data.name).toBe('Air-blast sprayer');
    expect(data.dedicated_organic).toBeNull();
    expect(data.rinsed).toBeNull();
    expect(data.ownership).toBe('');
  });

  it('words what the server says is missing, with a review badge', () => {
    items = [
      {
        id: 7,
        name: 'Bin trailer',
        use: 'transport',
        use_display: 'Transport',
        dedicated_organic: false,
        ownership: 'own',
        ownership_display: 'Owned',
        cleaning_method: '',
        cleaning_materials: '',
        rinsed: null,
        rinse_detail: '',
        notes: '',
        state: 'incomplete',
        missing: ['cleaning_method', 'rinsed']
      }
    ];
    renderAt();
    expect(screen.getByTestId('equipment-state').textContent).toBe(
      'Not stated yet: how it is cleaned before organic use; whether it is rinsed.'
    );
    expect(screen.getByText('Review')).toBeTruthy();
    expect(
      screen.getByText('Transport · Also used on non-organic crops or land · Owned')
    ).toBeTruthy();
  });

  it('a failed load is not an empty register', () => {
    loadFailed = true;
    renderAt();
    expect(screen.getByTestId('equipment-load-failed')).toBeTruthy();
    expect(screen.queryByText('No equipment is recorded yet.')).toBeNull();
  });
});
