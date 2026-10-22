// @vitest-environment jsdom
/**
 * One record, one request: the record detail, the edit form and ApplicationGroupNotice ask for
 * the same event with ids typed differently (numbers, route strings). RTK Query's default key
 * JSON-stringifies the args, so 7 and "7" were separate cache entries and separate GETs.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

import baseApi from 'store/api/baseApi';
import { historyApi } from 'store/api/historyApi';

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

afterEach(() => vi.unstubAllGlobals());

describe('getEvent', () => {
  it('keeps one cache entry for a record, however its ids are typed', async () => {
    // Not a request count: jsdom's AbortSignal is not the one Node's fetch accepts, so no
    // request is sent here. The cache key is what decides whether a second request is made.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}'))
    );
    const store = makeStore();
    const asNumbers = { companyId: 1, farmId: 2, eventId: 7, eventType: 2 };
    const asStrings = { companyId: '1', farmId: '2', eventId: '7', eventType: '2' };
    await store.dispatch((historyApi as any).endpoints.getEvent.initiate(asNumbers));
    await store.dispatch((historyApi as any).endpoints.getEvent.initiate(asStrings));
    const keys = Object.keys((store.getState() as any)[baseApi.reducerPath].queries).filter((k) =>
      k.startsWith('getEvent')
    );
    expect(keys).toHaveLength(1);
    // A different record is its own entry.
    await store.dispatch(
      (historyApi as any).endpoints.getEvent.initiate({ ...asNumbers, eventId: 8 })
    );
    const after = Object.keys((store.getState() as any)[baseApi.reducerPath].queries).filter((k) =>
      k.startsWith('getEvent')
    );
    expect(after).toHaveLength(2);
  });
});
