/**
 * The contamination incident section of the general form opens when its switch is on.
 *
 * 🔴 Broken 2026-09-08 → 2026-10-21. The tab read its switches by POSITION in a watch list
 * (`watchedFields[5]`, `[10]`), and adding `private_note` to that list (714a5835) moved every
 * later index by one. The switch turned on and nothing appeared: no source, no affected area, no
 * corrective action, so a § 205.272 incident could not be recorded, and the schema still
 * required a source, so the save failed on a field the grower could not see. Pinned through the
 * real component and the real switch, so a reordered list cannot break it again silently.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';

import baseApi from 'store/api/baseApi';
import enUS from '../../../../../../i18n/lang/en-US.json';

vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false }),
  useGetPlanMaterialsForLoggingQuery: () => ({ data: undefined, isLoading: false })
}));

// @ts-expect-error GeneralTab is a .jsx module with no type declarations.
import GeneralTab from '../GeneralTab';

const mount = (initialValues: Record<string, unknown> = {}) =>
  render(
    <Provider
      store={configureStore({
        reducer: {
          company: () => ({ currentCompany: { id: 1, establishments: [{ id: 1, name: 'F' }] } }),
          [baseApi.reducerPath]: baseApi.reducer
        },
        middleware: (getDefault) => getDefault().concat(baseApi.middleware)
      })}>
      <MemoryRouter>
        <ChakraProvider>
          <IntlProvider locale="en" messages={enUS as Record<string, string>} onError={() => {}}>
            <GeneralTab initialValues={initialValues} hideActions onSubmitHandler={() => {}} />
          </IntlProvider>
        </ChakraProvider>
      </MemoryRouter>
    </Provider>
  ).container;

const has = (container: HTMLElement, name: string) => !!container.querySelector(`[name="${name}"]`);

describe('general form: the contamination incident section', () => {
  it('opens when the grower turns the switch on', () => {
    const container = mount();
    expect(has(container, 'contamination_affected_area')).toBe(false);
    const incidentSwitch = container.querySelector('input[type="checkbox"]') as HTMLInputElement;
    fireEvent.click(incidentSwitch);
    expect(has(container, 'contamination_affected_area')).toBe(true);
    expect(has(container, 'corrective_action_taken')).toBe(true);
  });

  it('opens for a saved incident, and shows the notice date once the certifier was told', () => {
    const container = mount({ is_contamination_incident: true, certifier_notified: true });
    expect(has(container, 'contamination_affected_area')).toBe(true);
    expect(has(container, 'certifier_notification_date')).toBe(true);
  });
});
