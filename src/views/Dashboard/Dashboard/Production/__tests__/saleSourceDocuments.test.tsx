/**
 * A sale's invoice or bill of lading is attached to that sale, with its kind.
 *
 * OSP alignment audit 2026-10, T22: the audit-trail exhibit printed invoice and BOL numbers with
 * nothing behind them. A file attached here is filed against the sale (`sales_record`) and the
 * season (`history`), and rides in the packet under audit-trail/sale-<id>/.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const upload = vi.fn((_args: Record<string, unknown>) => ({ unwrap: () => Promise.resolve({}) }));
let docs: Record<string, unknown>[] = [];

vi.mock('store/api/documentsApi', () => ({
  SALE_SOURCE_KINDS: ['invoice', 'bill_of_lading', 'packout', 'other'],
  useGetFarmDocumentsQuery: () => ({ data: docs }),
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }]
}));

import SaleSourceDocuments from '../SaleSourceDocuments';

const renderIt = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <SaleSourceDocuments companyId="1" farmId="2" saleId={77} historyId={5} canWrite />
      </IntlProvider>
    </ChakraProvider>
  );

describe('sale source documents', () => {
  it('says plainly when only the typed numbers exist', () => {
    docs = [];
    renderIt();
    expect(screen.getByText(/No source document attached/)).toBeInTheDocument();
  });

  it('files the document against the sale, the season, and its kind', async () => {
    docs = [];
    upload.mockClear();
    renderIt();
    fireEvent.change(screen.getByLabelText('Document type'), {
      target: { value: 'bill_of_lading' }
    });
    fireEvent.change(screen.getByTestId('sale-source-input-77'), {
      target: { files: [new File(['x'], 'bol.pdf')] }
    });
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      salesRecord: 77,
      history: 5,
      sourceKind: 'bill_of_lading'
    });
  });

  it('names an attached document with its kind', () => {
    docs = [{ id: 9, title: 'INV-0912', source_kind: 'invoice' }];
    renderIt();
    expect(screen.getByText('Invoice: INV-0912')).toBeInTheDocument();
  });
});
