/**
 * The sourcing part of a supplier row (2026-11-08): what is bought from it, and for an uncertified
 * broker the certified operation it buys from and its Exempt Handler Affidavit.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';
import SupplierSourcing from '../SupplierSourcing';

const update = vi.fn();
vi.mock('store/api/supplierApi', () => ({
  useUpdateSupplierMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => update(...a) }),
    { isLoading: false }
  ]
}));
vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: () => [vi.fn(), { isLoading: false }]
}));

const base = {
  id: 9,
  name: 'Harbor Produce Brokers',
  organic_status: 'certified',
  certificates: [],
  sourced_products: '',
  source_operation: '',
  exempt_handler_affidavit: null,
  exempt_handler_affidavit_title: null,
  sourcing_state: null,
  sourcing_certificate_issued_on: null
};

const renderIt = (supplier: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <SupplierSourcing supplier={supplier as any} companyId="3" farmId="1" />
      </IntlProvider>
    </ChakraProvider>
  );

describe('SupplierSourcing', () => {
  beforeEach(() => {
    update.mockReset();
    update.mockResolvedValue({});
  });

  it('asks a broker for its source and affidavit, and a certified supplier for neither', () => {
    renderIt(base);
    expect(screen.queryByText('Certified operation it buys from')).toBeNull();
    expect(screen.queryByText('Its Exempt Handler Affidavit')).toBeNull();
  });

  it('shows the broker fields for an uncertified supplier', () => {
    renderIt({ ...base, organic_status: 'not_certified' });
    expect(screen.getByText('Certified operation it buys from')).toBeTruthy();
    expect(screen.getByText('Its Exempt Handler Affidavit')).toBeTruthy();
  });

  it('saves the products bought from the supplier', async () => {
    renderIt(base);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Blueberries, fresh' } });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toMatchObject({
      supplierId: 9,
      data: { sourced_products: 'Blueberries, fresh', source_operation: '' }
    });
  });

  it('shows the state the plan prints once products are entered', () => {
    renderIt({ ...base, sourced_products: 'Blueberries', sourcing_state: 'certificate_missing' });
    expect(screen.getByText('No copy of its organic certificate is on file.')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
  });
});
