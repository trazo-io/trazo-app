/**
 * G6.0 page F's equipment panel (2026-11-11): CCOF G6.0 C2, OTCO C9 9.1-1, WSDA 2121 I 1-2b.
 *
 * The panel words the server's state and links to the register on the farm profile after saving the
 * page. A failed load is never an empty list.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';
import OSPEquipmentPanel from '../OSPEquipmentPanel';

let query: Record<string, unknown> = {};
vi.mock('store/api/productionEquipmentApi', () => ({
  useGetProductionEquipmentQuery: () => query
}));

const item = (over: Record<string, unknown>) => ({
  id: 5,
  name: 'Over-the-row harvester',
  use: 'harvest',
  use_display: 'Harvest',
  dedicated_organic: true,
  ownership: 'own',
  ownership_display: 'Owned',
  cleaning_method: '',
  cleaning_materials: '',
  rinsed: null,
  rinse_detail: '',
  notes: '',
  state: 'complete',
  missing: [],
  ...over
});

const Landed = () => {
  const l = useLocation();
  return <div data-testid="landed">{`${l.pathname}${l.search}${l.hash}`}</div>;
};

const renderPanel = (onNavigateAway = vi.fn(() => true)) => {
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/1/osp/module/g6_0_production']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/1/osp/module/g6_0_production"
              element={
                <OSPEquipmentPanel companyId="3" farmId="1" onNavigateAway={onNavigateAway} />
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

describe('OSPEquipmentPanel', () => {
  beforeEach(() => {
    query = { data: [], isLoading: false, isError: false };
  });

  it('shows a complete item with no review flag', () => {
    query = { data: [item({})], isLoading: false, isError: false };
    renderPanel();
    expect(screen.getByTestId('equipment-state').textContent).toBe(
      'Says everything the equipment table asks.'
    );
    expect(screen.queryByText('Review')).toBeNull();
    expect(screen.getByText('Harvest · Dedicated to organic production · Owned')).toBeTruthy();
  });

  it('flags an item that has not said whether it is dedicated', () => {
    query = {
      data: [item({ dedicated_organic: null, state: 'incomplete', missing: ['dedicated'] })],
      isLoading: false,
      isError: false
    };
    renderPanel();
    expect(screen.getByText('Review')).toBeTruthy();
    expect(screen.getByTestId('equipment-state').textContent).toBe(
      'Not stated yet: whether it is dedicated to organic production.'
    );
  });

  it('saves the page, then opens the item in the register', async () => {
    query = { data: [item({})], isLoading: false, isError: false };
    const saved = renderPanel();
    fireEvent.click(screen.getByText('Open in the equipment register'));
    await waitFor(() =>
      expect(screen.getByTestId('landed').textContent).toBe(
        '/admin/dashboard/farm/1/profile?equipment=5#production-equipment'
      )
    );
    expect(saved).toHaveBeenCalled();
  });

  it('a failed load is not an empty register', () => {
    query = { data: undefined, isLoading: false, isError: true, error: { status: 500 } };
    renderPanel();
    expect(
      screen.getByText('The equipment register could not be loaded. Reload the page to try again.')
    ).toBeTruthy();
    expect(screen.queryByTestId('osp-equipment-empty')).toBeNull();
  });
});
