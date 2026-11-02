/**
 * G3.0a's seedling supplier panel (2026-11-05): CCOF G3.0 A2, OTCO C3 3.1-2, WSDA 2121-B 1/1a.
 *
 * The panel words the server's states and links to the one editor of a supplier, the register on
 * the farm profile. Asserted here: a covering copy and a missing one read differently, a name the
 * register does not hold links to add it (never guessed onto a supplier), the wording never says
 * "verified", a failed load is not shown as an empty list, and the link saves the page first.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import OSPSeedlingSuppliersPanel from '../OSPSeedlingSuppliersPanel';

let query: Record<string, unknown> = {};

vi.mock('store/api/supplierApi', () => ({
  useGetSeedlingSuppliersQuery: () => query
}));

const row = (over: Record<string, unknown>) => ({
  name: 'Columbia Nursery',
  supplier_id: 12,
  certifier: 'WSDA',
  nop_operation_id: '8150001234',
  purchases: 1,
  latest: '2025-04-02',
  status: 'covering',
  certificate_issued_on: '2025-01-15',
  not_covered: 0,
  claims_certified: true,
  needs_certificate: true,
  ...over
});

const Landed = () => {
  const location = useLocation();
  return <div data-testid="landed">{`${location.pathname}${location.search}`}</div>;
};

const renderPanel = (onNavigateAway = vi.fn(() => true)) => {
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/osp/module/g3_1_seedlings']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/1/osp/module/g3_1_seedlings"
              element={
                <OSPSeedlingSuppliersPanel
                  companyId="3"
                  farmId="1"
                  ospId={9}
                  onNavigateAway={onNavigateAway}
                />
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

describe('OSPSeedlingSuppliersPanel', () => {
  beforeEach(() => {
    query = { data: { suppliers: [] }, isLoading: false, isError: false };
  });

  it('names a covering copy with its issue date and the supplier', () => {
    query = { data: { suppliers: [row({})] }, isLoading: false, isError: false };
    renderPanel();
    expect(screen.getByText('Columbia Nursery')).toBeTruthy();
    expect(screen.getByText(/1 transplant purchase recorded, latest 2025-04-02/)).toBeTruthy();
    expect(screen.getByTestId('osp-seedling-supplier-status').textContent).toBe(
      'Organic certificate issued 2025-01-15 covers the latest purchase.'
    );
    expect(document.body.textContent?.toLowerCase()).not.toContain('verified');
  });

  it('says when no copy is on file and counts earlier uncovered purchases', () => {
    query = {
      data: {
        suppliers: [
          row({ status: 'none_on_file', certificate_issued_on: null, purchases: 3, not_covered: 2 })
        ]
      },
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByTestId('osp-seedling-supplier-status').textContent).toBe(
      "No copy of this supplier's organic certificate is on file."
    );
    expect(
      screen.getByText('2 earlier purchases are not covered by a certificate copy on file.')
    ).toBeTruthy();
    expect(screen.getAllByText('Review')).toHaveLength(2);
  });

  it('flags nothing for a supplier that owes no copy', () => {
    query = {
      data: {
        suppliers: [
          row({
            status: 'none_on_file',
            certificate_issued_on: null,
            claims_certified: false,
            needs_certificate: false
          })
        ]
      },
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.queryByText('Review')).toBeNull();
  });

  it('sends a name the register does not hold to add it, spelled as the record writes it', async () => {
    query = {
      data: {
        suppliers: [row({ name: 'Willow Drive Nursery', supplier_id: null, status: 'unresolved' })]
      },
      isLoading: false,
      isError: false
    };
    const saved = renderPanel();
    fireEvent.click(screen.getByText('Add to supplier register'));
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        '/admin/dashboard/farm/1/profile?supplierSpelling=Willow%20Drive%20Nursery'
      )
    );
    expect(saved).toHaveBeenCalled();
  });

  it('opens a registered supplier by id', async () => {
    query = { data: { suppliers: [row({})] }, isLoading: false, isError: false };
    renderPanel();
    fireEvent.click(screen.getByText('Open in supplier register'));
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        '/admin/dashboard/farm/1/profile?supplier=12'
      )
    );
  });

  it('stays on the page when saving it fails', async () => {
    query = { data: { suppliers: [row({})] }, isLoading: false, isError: false };
    const saved = renderPanel(vi.fn(() => false));
    fireEvent.click(screen.getByText('Open in supplier register'));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(screen.queryByTestId('landed')).toBeNull();
  });

  it('never shows a failed load as an empty list', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderPanel();
    expect(screen.queryByTestId('osp-seedling-suppliers-empty')).toBeNull();
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
  });

  it('tells a viewer why the list is not shown', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 403 } };
    renderPanel();
    expect(
      screen.getByText('Only company admins and farm managers can see the supplier list.')
    ).toBeTruthy();
  });
});
