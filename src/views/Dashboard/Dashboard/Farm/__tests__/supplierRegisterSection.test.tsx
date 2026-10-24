/**
 * The supplier register on the farm page: a supplier's certificate copies, the spellings its
 * records use, and the spellings on records that no supplier holds yet.
 *
 * Backend contract: certifications/tests/test_supplier_register.py. Here: a spelling is attached
 * only by the grower's choice, a trace's "Fix it here" lands on the right supplier or spelling,
 * and a supplier the records name cannot be deleted from the page.
 */
import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { calls, record, state } = vi.hoisted(() => {
  const calls: Record<string, any[]> = {};
  const record = (name: string) => () => {
    const fn = (args: any) => {
      (calls[name] ||= []).push(args);
      return { unwrap: () => Promise.resolve({ id: 501 }) };
    };
    return [fn, { isLoading: false }];
  };
  const state: { suppliers: any[]; unconfirmed: any[] } = { suppliers: [], unconfirmed: [] };
  return { calls, record, state };
});

vi.mock('store/api/supplierApi', () => ({
  useGetSuppliersQuery: () => ({ data: state.suppliers, isLoading: false }),
  useGetUnconfirmedSpellingsQuery: () => ({ data: state.unconfirmed }),
  useAddSupplierMutation: record('addSupplier'),
  useUpdateSupplierMutation: record('updateSupplier'),
  useDeleteSupplierMutation: record('deleteSupplier'),
  useAddSupplierSpellingMutation: record('addSpelling'),
  useRemoveSupplierSpellingMutation: record('removeSpelling'),
  useAddSupplierCertificateMutation: record('addCertificate'),
  useRemoveSupplierCertificateMutation: record('removeCertificate')
}));
vi.mock('store/api/documentsApi', () => ({
  useUploadFarmDocumentMutation: record('upload')
}));
vi.mock('components/Certifications/CertifyingAgentPicker', () => ({
  default: () => <span data-testid="certifier-picker" />
}));

import enUS from '../../../../../i18n/lang/en-US.json';
import SupplierRegisterSection from '../SupplierRegisterSection';

const messages = enUS as unknown as Record<string, string>;

const COLUMBIA = {
  id: 12,
  public_id: 'x',
  name: 'Columbia Nursery',
  organic_status: 'certified',
  organic_status_display: 'SERVER DISPLAY STRING',
  nop_operation_id: '8150001234',
  certifier_name: 'Washington State Department of Agriculture',
  notes: '',
  archived: false,
  archived_at: null,
  names: [{ id: 1, name: 'Columbia Nursery' }],
  certificates: [
    {
      id: 3,
      document: 88,
      document_title: 'Columbia Nursery certificate 2025',
      issued_on: '2025-02-10',
      anniversary_date: null,
      original_effective_date: null,
      created_at: ''
    }
  ],
  records_count: 2
};

const renderAt = (url = '/admin/dashboard/farm/1/profile') =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={messages}>
        <MemoryRouter initialEntries={[url]}>
          <SupplierRegisterSection companyId="9" farmId="1" state="WA" />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('SupplierRegisterSection', () => {
  beforeEach(() => {
    for (const k of Object.keys(calls)) delete calls[k];
    state.suppliers = [];
    state.unconfirmed = [];
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("lists a supplier's certificate copies and the records that name it", () => {
    state.suppliers = [COLUMBIA];
    renderAt();
    // Once as the supplier, once as the spelling its records use.
    expect(screen.getAllByText('Columbia Nursery')).toHaveLength(2);
    expect(
      screen.getByText(
        messages['suppliers.certificate.row']
          .replace('{date}', '2025-02-10')
          .replace('{title}', 'Columbia Nursery certificate 2025')
      )
    ).toBeTruthy();
    expect(screen.getByText('2 planting records name this supplier')).toBeTruthy();
    // The status in the reader's language, never the server's English display string.
    expect(screen.getByText(messages['suppliers.status.certified'])).toBeTruthy();
    // A supplier the records name stays on file: there is no delete, only archive.
    const row = screen.getByTestId('supplier-12');
    expect(within(row).queryByRole('button', { name: messages['suppliers.delete'] })).toBeNull();
    expect(within(row).getByRole('button', { name: messages['suppliers.archive'] })).toBeTruthy();
  });

  it('attaches a spelling from the records only when the grower picks the supplier', () => {
    state.suppliers = [COLUMBIA];
    state.unconfirmed = [{ name: 'columbia nursery inc', records: 3 }];
    renderAt();
    const strip = screen.getByTestId('unconfirmed-spelling');
    const attach = within(strip).getByRole('button', {
      name: messages['suppliers.unconfirmed.attach']
    });
    // Nothing is chosen for them, so nothing can be attached yet.
    expect(attach.hasAttribute('disabled')).toBe(true);
    fireEvent.change(within(strip).getByRole('combobox'), { target: { value: '12' } });
    fireEvent.click(attach);
    expect(calls.addSpelling).toEqual([
      { companyId: '9', farmId: '1', supplierId: 12, name: 'columbia nursery inc' }
    ]);
  });

  it("a trace's fix link opens the supplier it names", () => {
    state.suppliers = [COLUMBIA, { ...COLUMBIA, id: 13, name: 'Willow Drive Nursery' }];
    renderAt('/admin/dashboard/farm/1/profile?supplier=12');
    expect(screen.getByTestId('supplier-12').getAttribute('data-highlighted')).toBe('true');
    expect(screen.getByTestId('supplier-13').getAttribute('data-highlighted')).toBeNull();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('a spelling no supplier holds can be added as a new supplier, prefilled', () => {
    state.unconfirmed = [{ name: 'Willow Drive Nursery', records: 1 }];
    renderAt('/admin/dashboard/farm/1/profile?supplierSpelling=Willow%20Drive%20Nursery');
    fireEvent.click(screen.getByRole('button', { name: messages['suppliers.unconfirmed.create'] }));
    expect((screen.getByDisplayValue('Willow Drive Nursery') as HTMLInputElement).value).toBe(
      'Willow Drive Nursery'
    );
  });

  it('never calls anything verified', () => {
    state.suppliers = [COLUMBIA];
    const { container } = renderAt();
    expect(container.textContent || '').not.toMatch(/verified/i);
  });
});
