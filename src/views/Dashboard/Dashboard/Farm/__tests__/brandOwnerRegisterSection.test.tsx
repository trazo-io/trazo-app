/**
 * The brand-owner register on the farm profile (2026-11-07).
 *
 * The form asks for the copy each status owes: a certificate with its issue date for a certified
 * owner, the certifier's agreement for an uncertified one. A certificate cannot be saved without its
 * issue date, as the server requires.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../i18n/lang/en-US.json';
import BrandOwnerRegisterSection from '../BrandOwnerRegisterSection';

const add = vi.fn();
let owners: unknown[] = [];

vi.mock('store/api/brandOwnerApi', () => ({
  useGetBrandOwnersQuery: () => ({ data: owners, isLoading: false }),
  useAddBrandOwnerMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => add(...a) }),
    { isLoading: false }
  ],
  useUpdateBrandOwnerMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteBrandOwnerMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('components/Certifications/CertifyingAgentPicker', () => ({
  default: () => <div data-testid="agent-picker" />
}));

const renderAt = (url = '/admin/dashboard/farm/1/profile') =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter initialEntries={[url]}>
          <BrandOwnerRegisterSection companyId="3" farmId="1" />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('BrandOwnerRegisterSection', () => {
  beforeEach(() => {
    // jsdom has no layout: the highlighted owner scrolls itself into view.
    Element.prototype.scrollIntoView = vi.fn();
    owners = [];
    add.mockReset();
    add.mockResolvedValue({});
  });

  it('asks a certified owner for its certificate and an uncertified one for the agreement', () => {
    renderAt();
    fireEvent.click(screen.getByText('Add brand owner'));
    expect(screen.getByText('Copy of its organic certificate')).toBeTruthy();
    expect(screen.queryByText(/private-label or co-packer agreement$/)).toBeNull();
    fireEvent.change(screen.getByDisplayValue('Certified organic'), {
      target: { value: 'not_certified' }
    });
    expect(screen.queryByText('Copy of its organic certificate')).toBeNull();
    expect(
      screen.getByText("Copy of your certifier's private-label or co-packer agreement")
    ).toBeTruthy();
  });

  it('saves the owner with what was typed', async () => {
    renderAt();
    fireEvent.click(screen.getByText('Add brand owner'));
    const inputs = screen
      .getByTestId('brand-owner-form')
      .querySelectorAll('input:not([type=file])');
    fireEvent.change(inputs[0], { target: { value: 'Cascade Fresh LLC' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(add).toHaveBeenCalled());
    expect(add.mock.calls[0][0].data).toMatchObject({
      name: 'Cascade Fresh LLC',
      certification_status: 'certified'
    });
  });

  it('scrolls to the register when the plan links to it with no owner named', () => {
    renderAt('/admin/dashboard/farm/1/profile#brand-owners');
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('shows each owner with the state the plan prints', () => {
    owners = [
      {
        id: 7,
        name: 'Cascade Fresh LLC',
        brand_names: 'Cascade Fresh',
        products: '',
        certification_status: 'certified',
        certification_status_display: 'Certified organic operation',
        certifier_name: '',
        nop_operation_id: '',
        certificate_document: null,
        certificate_issued_on: null,
        agreement_document: null,
        notes: '',
        state: 'certificate_missing'
      }
    ];
    renderAt('/admin/dashboard/farm/1/profile?brandOwner=7');
    expect(screen.getByText('No copy of its organic certificate is on file.')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
  });
});
