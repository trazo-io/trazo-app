// @vitest-environment jsdom
/**
 * Saving the farm form must update the farm the dashboard header reads, not only the RTK cache.
 *
 * Pilot rehearsal 2026-10-17, finding 9: after editing the farm's state from OR to WA the farm
 * header kept "OR" until a reload. The header (`views/Dashboard/Dashboard/index.tsx`) and the farm
 * switcher read `state.company.currentCompany.establishments`, which is set once at sign-in by
 * `setCompany` and is not an RTK Query cache entry. `editFarm` invalidated the 'Company' tag and
 * patched the `getFarm` cache, neither of which reaches that slice.
 *
 * Behavioural: a real store with the real api middleware and company reducer, a stubbed fetch, and
 * assertions on the Redux state the header renders from.
 */
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import baseApi from 'store/api/baseApi';
// Side-effect import: registers `editFarm` on baseApi (companyApi has no default export).
import 'store/api/companyApi';
import companyReducer from 'store/features/companySlice';

/** Same shim as confirmingANoteRefreshesTheQueue.test.ts: jsdom's AbortSignal vs undici Request. */
class PermissiveRequest {
  url: string;
  method: string;

  constructor(input: unknown, init: Record<string, unknown> = {}) {
    this.url = typeof input === 'string' ? input : String((input as { url?: string })?.url ?? '');
    this.method = String(init.method ?? 'GET');
    Object.assign(this, init);
  }

  clone() {
    return this;
  }
}

const FARM_BEFORE = {
  id: 148,
  name: 'Astra Orchard',
  city: 'Hood River',
  state: 'OR',
  parcels: [{ id: 249, name: 'Block A' }]
};

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, company: companyReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }).concat(baseApi.middleware),
    preloadedState: {
      company: {
        currentCompany: { id: 7, name: 'Astra', establishments: [FARM_BEFORE] } as any,
        currentFarm: FARM_BEFORE as any,
        isLoading: false
      }
    }
  });

const respond = (status: number, body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  );

// What `UpdateEstablishmentSerializer` returns: the saved fields, no `parcels`.
const PATCH_RESPONSE = { id: 148, name: 'Astra Orchard', city: 'Yakima', state: 'WA' };

describe('editFarm updates the farm held in Redux', () => {
  beforeEach(() => {
    global.Request = PermissiveRequest as unknown as typeof global.Request;
  });

  it('shows the saved city and state without a reload, keeping the parcels', async () => {
    global.fetch = vi.fn(() => respond(200, PATCH_RESPONSE)) as unknown as typeof global.fetch;
    const store = makeStore();

    await store
      .dispatch(
        (baseApi.endpoints as any).editFarm.initiate({
          companyId: 7,
          farmId: '148',
          establishmentData: { city: 'Yakima', state: 'WA' }
        })
      )
      .unwrap();

    const farm = store.getState().company.currentCompany!.establishments![0] as any;
    expect(farm.state).toBe('WA');
    expect(farm.city).toBe('Yakima');
    // Merged, not replaced: the PATCH response carries no parcels.
    expect(farm.parcels).toEqual(FARM_BEFORE.parcels);
    expect((store.getState().company.currentFarm as any).state).toBe('WA');
  });

  it('leaves the farm untouched when the save fails', async () => {
    global.fetch = vi.fn(() =>
      respond(400, { state: ['Not a US state'] })
    ) as unknown as typeof global.fetch;
    const store = makeStore();

    await store.dispatch(
      (baseApi.endpoints as any).editFarm.initiate({
        companyId: 7,
        farmId: '148',
        establishmentData: { state: 'ZZ' }
      })
    );

    const farm = store.getState().company.currentCompany!.establishments![0] as any;
    expect(farm.state).toBe('OR');
    expect(farm.city).toBe('Hood River');
  });
});
