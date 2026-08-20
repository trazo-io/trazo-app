/**
 * Transport, Buffer Use and Seed Search ask for what they post, and nothing else.
 *
 * These three subtypes reuse columns that used to belong exclusively to a harvest event, so
 * every field they show has TWO gates: the JSX condition that renders it, and the `RECORDS_*`
 * set in `onSubmit` that decides whether it is posted. When those disagree the farmer fills a
 * field that is silently dropped — no error, no warning, and the loss only shows up in the
 * certifier PDF weeks later.
 *
 * That is not hypothetical here. Adding these subtypes produced the mismatch three separate
 * times in one sitting:
 *   * the whole Harvest Record section was widened to TP and BU at once, so a transport asked
 *     about buffer-row disposition and a buffer disposal asked for a harvest contract;
 *   * `amount_determination` rendered for all three and posted only for HA;
 *   * `RECORDS_SEED` was declared and never used — harmless only because `...data` spreads
 *     every key, which is itself worth knowing.
 *
 * A browser check found the first. This test is what catches the next one, and it asserts
 * ABSENCE as well as presence — a field a subtype must not be asked for is as much a defect as
 * a missing one, because it invites data that will not be stored.
 */
import React from 'react';
import { render, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

// Same stubs as formRenderConformance, for the same reason: this guard inspects the real
// component's real markup, and wiring a full RTK Query store would test the harness instead
// of the form. Without them the hooks warn about missing middleware, and vitest promotes that
// warning to a thrown error — which reads as a component failure when nothing is wrong.
vi.mock('store/api/historyApi', () => ({
  useGetCurrentHistoryQuery: () => ({ data: undefined, isLoading: false }),
  useGetSeedSuppliersQuery: () => ({ data: undefined, isLoading: false }),
  useGetRecentInputsQuery: () => ({ data: undefined, isLoading: false })
}));
vi.mock('store/api/productApi', () => ({
  useGetParcelQuery: () => ({
    data: { known_block_ids: ['Block 1', 'Block 2'] },
    isLoading: false
  })
}));

import enUS from '../../../i18n/lang/en-US.json';
import ProductionTab from 'views/Dashboard/Dashboard/components/forms/ProductionTab';

const messages = enUS as unknown as Record<string, string>;

// Mirrors formRenderConformance's store exactly, including the absence of an `api` reducer:
// adding a stub one makes RTK Query warn that its middleware is missing, and that warning is
// promoted to a thrown error under this vitest config — which reads as a component failure
// when the only thing wrong is the harness.
const testStore = () =>
  configureStore({
    reducer: {
      company: () => ({
        currentCompany: {
          id: 1,
          // CA establishment whose id matches `farmId` in the route below, so `useFarm`
          // resolves and state-gated sections actually mount.
          establishments: [{ id: 1, name: 'Test Farm', state: 'CA', country: 'US' }]
        }
      })
    }
  });

const fieldsFor = (subtype: string, extra: Record<string, unknown> = {}): Set<string> => {
  const { container } = render(
    <Provider store={testStore()}>
      <MemoryRouter initialEntries={['/admin/dashboard/farm/1/parcel/2/event/add']}>
        <Routes>
          <Route
            path="/admin/dashboard/farm/:farmId/parcel/:parcelId/event/add"
            element={
              <ChakraProvider>
                <IntlProvider locale="en" messages={messages} onError={() => {}}>
                  <ProductionTab
                    initialValues={{ type: subtype, ...extra }}
                    hideActions
                    onSubmitHandler={() => {}}
                  />
                </IntlProvider>
              </ChakraProvider>
            }
          />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
  // Same reason as formRenderConformance: sections gated on watch('type') settle only after
  // the mount effect's reset, and reading straight after render() catches the earlier tree.
  act(() => {});
  const names = new Set<string>();
  container.querySelectorAll('input, select, textarea').forEach((el) => {
    const n = (el as HTMLInputElement).name;
    if (n) names.add(n);
  });
  return names;
};

describe('new activity subtypes ask for exactly their own fields', () => {
  it('Transport asks about the load, not the buffer rows', () => {
    const f = fieldsFor('TP');
    expect(f.has('harvest_destination'), 'a transport must record where the load went').toBe(true);
    expect(f.has('harvest_lot_code'), 'a transport must identify the lot it carried').toBe(true);
    expect(
      f.has('buffer_disposition'),
      'a transport was asked what happened to buffer rows — that belongs to Buffer Use, and the ' +
        'payload gate (RECORDS_BUFFER) would drop it'
    ).toBe(false);
  });

  it('Buffer Use asks about the disposition, not the handler leg', () => {
    const f = fieldsFor('BU');
    expect(f.has('buffer_disposition'), 'the whole point of the activity').toBe(true);
    expect(f.has('harvest_lot_code')).toBe(true);
    expect(
      f.has('harvest_destination'),
      'a buffer disposal has no handler destination; RECORDS_HANDLER excludes BU'
    ).toBe(false);
    expect(
      f.has('harvest_contract_number'),
      'a work order belongs to a pick or a load, not to a buffer disposal'
    ).toBe(false);
  });

  it('Seed Search asks about the search', () => {
    const f = fieldsFor('SS');
    expect(f.has('seed_certification_status')).toBe(true);
    expect(
      f.has('buffer_disposition') || f.has('harvest_destination'),
      'a seed search is not a harvest record'
    ).toBe(false);
  });

  it('Transport asks for both endpoints, and nothing else does', () => {
    // These were shipped model-first: columns, serializer and a packet table existed before
    // any input rendered them, which is the orphaned-feature shape — a field nothing can fill
    // reads as complete in every audit that greps for the DEFINITION rather than the usage.
    const tp = fieldsFor('TP');
    expect(tp.has('transport_origin')).toBe(true);
    expect(tp.has('transport_destination_address')).toBe(true);
    const ha = fieldsFor('HA');
    expect(
      ha.has('transport_origin'),
      'on a harvest the endpoints are the farm and its own storage — asking is noise'
    ).toBe(false);
  });

  it('Cleanout asks for the purge, including what happened to it', () => {
    // The purge block sits inside the cleanout branch, which needs BOTH the EM subtype and
    // equipment_operation_type 'CL'. That is correct — a purge belongs to a cleaning
    // operation, not to a repair or a calibration — so the fixture has to say so rather than
    // the gate being loosened to make a test pass.
    const em = fieldsFor('EM', { equipment_operation_type: 'CL' });
    expect(em.has('purge_material')).toBe(true);
    expect(em.has('purge_quantity')).toBe(true);
    expect(
      em.has('purge_material_end_use'),
      'the end use is the § 205.272-relevant half; the other two without it record a purge ' +
        'and answer nothing'
    ).toBe(true);
  });

  it('Harvest still asks for everything it did before', () => {
    // The mirror. Narrowing gates for the new subtypes must not narrow HA by accident — the
    // easiest way to "fix" a mismatch is to delete the field, and that would pass every
    // assertion above while quietly removing a certifier record.
    const f = fieldsFor('HA');
    for (const name of [
      'harvest_lot_code',
      'harvest_destination',
      'buffer_disposition',
      'harvest_contract_number'
    ]) {
      expect(f.has(name), `HA lost ${name}`).toBe(true);
    }
  });
});
