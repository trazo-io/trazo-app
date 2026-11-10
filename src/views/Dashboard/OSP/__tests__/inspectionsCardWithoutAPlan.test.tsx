/**
 * The certifier inspections card does not depend on a plan being on file.
 *
 * Until 2026-11-09 the narratives page returned early with only the "create your plan" prompt
 * when the farm had no OSP in Trazo, so a farm whose plan lives on paper could never record an
 * inspection. The Business event form now links every farm to the card
 * (`?section=certifier-inspections`), so the card renders on that page too and the link scrolls
 * to it once on arrival.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';

const plans = vi.hoisted(() => ({ list: [] as unknown[] }));

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({
    data: plans.list,
    isLoading: false,
    isUninitialized: false,
    isError: false
  }),
  useGetOSPQuery: () => ({ data: undefined, isLoading: false }),
  useCreateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useSubmitOSPMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/companyApi', () => ({ useGetFarmQuery: () => ({ data: undefined }) }));
vi.mock('hooks/useMeasurementSystem', () => ({ useFarm: () => null, useFarmState: () => 'WA' }));
vi.mock('hooks/useUserRole', () => ({ useUserRole: () => ({ isSetupOperator: false }) }));
vi.mock('components/Guards/ComplianceExportsGuard', () => ({
  useComplianceExports: () => ({ hasComplianceExports: false })
}));
vi.mock('../CertifierInspectionsCard', () => ({
  default: ({ farmId }: { farmId: string }) => (
    <div data-testid="certifier-inspections-card-stub">{farmId}</div>
  ),
  UnresolvedCertifierNoticesLine: () => null
}));

import OSPView from '../OSPView';

const store = () =>
  configureStore({
    reducer: {
      company: () => ({ currentCompany: { id: 1, establishments: [{ id: 7, state: 'WA' }] } })
    }
  });

const mount = (search = '') =>
  render(
    <Provider store={store()}>
      <MemoryRouter initialEntries={[`/admin/dashboard/farm/7/osp/narratives${search}`]}>
        <ChakraProvider>
          <IntlProvider locale="en" messages={enUS as Record<string, string>} onError={() => {}}>
            <Routes>
              <Route path="/admin/dashboard/farm/:farmId/osp/narratives" element={<OSPView />} />
            </Routes>
          </IntlProvider>
        </ChakraProvider>
      </MemoryRouter>
    </Provider>
  );

const scrollIntoView = vi.fn();
// vitest 0.34 records no `this` per call, so the element scrolled to is kept by hand.
let scrolledTo: Element[] = [];

beforeEach(() => {
  plans.list = [];
  scrolledTo = [];
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = function (this: Element, ...args: unknown[]) {
    scrolledTo.push(this);
    scrollIntoView(...args);
  };
});
afterEach(cleanup);

describe('certifier inspections card on the no-plan-yet page', () => {
  it('renders next to the create-your-plan prompt', () => {
    const { getByTestId, getByText } = mount();
    expect(getByText((enUS as Record<string, string>)['osp.none'])).toBeTruthy();
    expect(getByTestId('certifier-inspections-card-stub').textContent).toBe('7');
  });

  it('scrolls to the card once when the link names it', () => {
    const { getByTestId } = mount('?section=certifier-inspections');
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    const target = scrolledTo[0];
    expect(target.contains(getByTestId('certifier-inspections-card-stub'))).toBe(true);
  });

  it('does not scroll without the section parameter', () => {
    mount();
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
