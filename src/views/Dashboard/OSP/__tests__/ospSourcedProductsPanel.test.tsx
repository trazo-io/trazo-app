/**
 * G6.5's panel of suppliers of bought-in organic product (2026-11-08): CCOF G6.5 A1/A2, OTCO 12.2-4.
 *
 * Lists only suppliers with products entered as bought in, words the server's `sourcing_state`, links
 * to the register after saving the page, and never shows a failed load as an empty list.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import OSPSourcedProductsPanel from '../OSPSourcedProductsPanel';

let query: Record<string, unknown> = {};
vi.mock('store/api/supplierApi', () => ({ useGetSuppliersQuery: () => query }));

const supplier = (over: Record<string, unknown>) => ({
  id: 5,
  name: 'Valley Organic Co-op',
  organic_status: 'certified',
  certifier_name: '',
  nop_operation_id: '',
  archived: false,
  names: [],
  // Oldest first on purpose: the date shown must be the server's, not the first copy's.
  certificates: [
    { id: 1, issued_on: '2024-01-10', document_title: 'Old cert' },
    { id: 2, issued_on: '2026-03-01', document_title: 'Cert' }
  ],
  sourcing_certificate_issued_on: '2026-03-01',
  records_count: 0,
  sourced_products: 'Blueberries, fresh',
  source_operation: '',
  exempt_handler_affidavit: null,
  exempt_handler_affidavit_title: null,
  sourcing_state: 'on_file',
  ...over
});

const Landed = () => {
  const l = useLocation();
  return <div data-testid="landed">{`${l.pathname}${l.search}`}</div>;
};

const renderPanel = (onNavigateAway = vi.fn(() => true)) => {
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/osp/module/g6_5_sales_soe']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/1/osp/module/g6_5_sales_soe"
              element={
                <OSPSourcedProductsPanel companyId="3" farmId="1" onNavigateAway={onNavigateAway} />
              }
            />
            <Route path="/admin/dashboard/farm/1/profile" element={<Landed />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
  return onNavigateAway;
};

describe('OSPSourcedProductsPanel', () => {
  beforeEach(() => {
    query = { data: [], isLoading: false, isError: false };
  });

  it('lists only suppliers of bought-in product, a seed supplier left out', () => {
    query = {
      data: [
        supplier({}),
        supplier({ id: 6, name: 'Columbia Nursery', sourced_products: '', sourcing_state: null })
      ],
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByText('Valley Organic Co-op')).toBeTruthy();
    expect(screen.queryByText('Columbia Nursery')).toBeNull();
    expect(screen.getByText('Bought in: Blueberries, fresh')).toBeTruthy();
    expect(screen.getByTestId('sourcing-state').textContent).toBe(
      'Newest certificate copy, issued 2026-03-01, is on file.'
    );
    expect(screen.queryByText('Review')).toBeNull();
  });

  it('flags a broker with no affidavit and names where it buys from', () => {
    query = {
      data: [
        supplier({
          name: 'Harbor Produce Brokers',
          organic_status: 'not_certified',
          certificates: [],
          source_operation: 'Valley Organic Co-op',
          sourcing_state: 'affidavit_missing'
        })
      ],
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByText('Buys from: Valley Organic Co-op')).toBeTruthy();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByText(/Exempt Handler Affidavit is needed/)).toBeTruthy();
  });

  it('opens the supplier in the register after saving the page', async () => {
    query = { data: [supplier({})], isLoading: false, isError: false };
    const saved = renderPanel();
    fireEvent.click(screen.getByText('Open in supplier register'));
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        '/admin/dashboard/farm/1/profile?supplier=5'
      )
    );
    expect(saved).toHaveBeenCalled();
  });

  it('never shows a failed load as an empty list', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderPanel();
    expect(screen.queryByTestId('osp-sourcing-empty')).toBeNull();
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
  });
});
