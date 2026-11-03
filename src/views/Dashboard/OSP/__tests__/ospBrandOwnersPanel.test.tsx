/**
 * G7.0 page C's brand-owner panel (2026-11-07): CCOF G7.0 C, OTCO C8 8.3, WSDA 2121 N 6-7.
 *
 * The panel words the server's `state` and links to the register on the farm profile after saving
 * the page. A failed load is never an empty list.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import OSPBrandOwnersPanel from '../OSPBrandOwnersPanel';

let query: Record<string, unknown> = {};
vi.mock('store/api/brandOwnerApi', () => ({ useGetBrandOwnersQuery: () => query }));

const owner = (over: Record<string, unknown>) => ({
  id: 4,
  name: 'Cascade Fresh LLC',
  brand_names: 'Cascade Fresh',
  products: 'Gala apples, 3 lb bag: Organic',
  certification_status: 'certified',
  certification_status_display: 'Certified organic operation',
  certifier_name: 'WSDA',
  nop_operation_id: '',
  certificate_document: 9,
  certificate_issued_on: '2026-02-01',
  agreement_document: null,
  notes: '',
  state: 'on_file',
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
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/osp/module/g7_0_labeling']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/1/osp/module/g7_0_labeling"
              element={
                <OSPBrandOwnersPanel companyId="3" farmId="1" onNavigateAway={onNavigateAway} />
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

describe('OSPBrandOwnersPanel', () => {
  beforeEach(() => {
    query = { data: [], isLoading: false, isError: false };
  });

  it('names a copy on file with no review flag, and the products with their claims', () => {
    query = { data: [owner({})], isLoading: false, isError: false };
    renderPanel();
    expect(screen.getByTestId('brand-owner-state').textContent).toBe(
      'Organic certificate copy issued 2026-02-01 is on file.'
    );
    expect(screen.queryByText('Review')).toBeNull();
    expect(
      screen.getByText('Products packed under this brand: Gala apples, 3 lb bag: Organic')
    ).toBeTruthy();
    expect(document.body.textContent?.toLowerCase()).not.toContain('verified');
  });

  it('flags each state the plan flags', () => {
    query = {
      data: [
        owner({ id: 1, name: 'A', state: 'certificate_missing' }),
        owner({
          id: 2,
          name: 'B',
          certification_status: 'not_certified',
          state: 'agreement_missing'
        }),
        owner({ id: 3, name: 'C', certification_status: 'unknown', state: 'status_unknown' }),
        owner({ id: 5, name: 'D', state: 'certificate_old', certificate_issued_on: '2024-01-01' })
      ],
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getAllByText('Review')).toHaveLength(4);
    expect(screen.getByText(/more than 15 months ago/)).toBeTruthy();
    expect(screen.getByText(/private-label or co-packer agreement is needed/)).toBeTruthy();
  });

  it('opens the owner in the register after saving the page', async () => {
    query = { data: [owner({})], isLoading: false, isError: false };
    const saved = renderPanel();
    fireEvent.click(screen.getByText('Open in brand-owner register'));
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        '/admin/dashboard/farm/1/profile?brandOwner=4'
      )
    );
    expect(saved).toHaveBeenCalled();
  });

  it('stays on the page when saving it fails', async () => {
    query = { data: [owner({})], isLoading: false, isError: false };
    const saved = renderPanel(vi.fn(() => false));
    fireEvent.click(screen.getByText('Open in brand-owner register'));
    await waitFor(() => expect(saved).toHaveBeenCalled());
    expect(screen.queryByTestId('landed')).toBeNull();
  });

  it('never shows a failed load as an empty list', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderPanel();
    expect(screen.queryByTestId('osp-brand-owners-empty')).toBeNull();
    expect(screen.getByText(/could not be loaded/)).toBeTruthy();
  });

  it('tells a viewer why the list is hidden', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 403 } };
    renderPanel();
    expect(
      screen.getByText('Only company admins and farm managers can see the brand-owner list.')
    ).toBeTruthy();
  });
});
