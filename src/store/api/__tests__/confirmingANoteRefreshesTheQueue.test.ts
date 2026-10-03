// @vitest-environment jsdom
/**
 * Writing a record must refresh the field-notes queue, not leave it offering the note just logged.
 *
 * MEASURED 2026-09-27: `createEvent` invalidated ['Event', 'History', 'SeasonPlan'] and NOT
 * 'FieldNote'. The only invalidator of 'FieldNote' was `discardFieldNote`, and neither field-note
 * query opts into `refetchOnMountOrArgChange`, so for the default 60s `keepUnusedDataFor` the inbox
 * kept serving a note whose record had already been written. Tapping "Log this" on that stale row
 * sent its id again; `_resolve_field_note` filters `status=PENDING` so it resolved to None, and
 * `_confirm_field_note` returned early with only a `logger.info`. Result: a SECOND event for one
 * crew message, carrying no note link, with nothing on screen saying so.
 *
 * Why that is not cosmetic: § 205.103(b)(2) wants records an inspector can trace back, and two
 * spray records for one report is the kind of thing a trace-back is for. The note is also the only
 * thing tying the record to who reported it.
 *
 * BEHAVIOURAL ON PURPOSE. A source test asserting the string 'FieldNote' appears in an array is
 * exactly the kind of guard this project keeps getting burned by: it cannot see whether RTK Query
 * actually refetches, and an endpoint whose `providesTags` were dropped, or which was silently
 * skipped by an `injectEndpoints` name collision (see endpointNameCollisions.test.ts), would still
 * read correctly in source. So this drives a real store and counts the requests that leave it.
 */
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import baseApi from 'store/api/baseApi';
import fieldNoteApi from 'store/api/fieldNoteApi';
import { historyApi } from 'store/api/historyApi';

/**
 * `Request` is shimmed because the two halves of this environment disagree about AbortSignal.
 * jsdom supplies the AbortController, Node supplies `Request` from undici, and undici's
 * `RequestInit` validation rejects a foreign signal with
 * `Expected signal ("AbortSignal {}") to be an instance of AbortSignal`. `fetchBaseQuery` builds a
 * `new Request(url, config)` unconditionally, so without this every query fails before a request
 * is ever made, and the failure is swallowed into "no tags will be provided or invalidated" rather
 * than raised. It carries the two members fetchBaseQuery touches: `url` and `clone()`.
 */
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

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware)
  });

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });

/** Every request this store has made whose URL names the queue endpoint. */
const queueRequests = () =>
  (global.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls.filter((call) => {
    const target = call[0];
    const url = typeof target === 'string' ? target : String((target as Request)?.url ?? '');
    return url.includes('field-notes/') && !url.includes('/discard/');
  });

/** Invalidation refetches on a later tick, so poll rather than assert on the next microtask. */
const waitFor = async (predicate: () => boolean, label: string) => {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`timed out waiting for: ${label}`);
};

describe('a written record invalidates the field-notes queue', () => {
  beforeEach(() => {
    global.Request = PermissiveRequest as unknown as typeof global.Request;
    global.fetch = vi.fn(() => Promise.resolve(json([]))) as unknown as typeof global.fetch;
  });

  it('refetches the queue after createEvent succeeds', async () => {
    const store = makeStore();

    // Left SUBSCRIBED on purpose: an unsubscribed entry would be refetched by nobody, which is the
    // inbox-unmounted case and not the one under test. The supervisor's queue is on screen, or in
    // cache with the page one navigation away, when the record is written.
    const queue = store.dispatch(
      fieldNoteApi.endpoints.getFieldNotes.initiate({ status: 'pending' })
    );
    await queue;
    expect(queueRequests()).toHaveLength(1);

    await store.dispatch(
      historyApi.endpoints.createEvent.initiate({
        companyId: 1,
        farmId: 2,
        name: 'Spray',
        field_note: 'e6f5c2aa-0000-4000-8000-000000000001'
      })
    );

    await waitFor(
      () => queueRequests().length > 1,
      'the queue to be refetched after a record was written'
    );

    queue.unsubscribe();
  });

  /**
   * The control. Without it a test that passed because SOMETHING refetched the queue, rather than
   * because createEvent did, would look identical.
   */
  it('does not refetch the queue when createEvent fails', async () => {
    global.fetch = vi.fn((target: unknown) => {
      const url = typeof target === 'string' ? target : String((target as Request)?.url ?? '');
      if (url.includes('field-notes/')) return Promise.resolve(json([]));
      return Promise.resolve(new Response(JSON.stringify({ detail: 'nope' }), { status: 400 }));
    }) as unknown as typeof global.fetch;

    const store = makeStore();
    const queue = store.dispatch(
      fieldNoteApi.endpoints.getFieldNotes.initiate({ status: 'pending' })
    );
    await queue;
    expect(queueRequests()).toHaveLength(1);

    await store.dispatch(
      historyApi.endpoints.createEvent.initiate({ companyId: 1, farmId: 2, name: 'Spray' })
    );
    await new Promise((resolve) => setTimeout(resolve, 60));

    // A failed save wrote no record, so it spent no note and the queue is still current.
    expect(queueRequests()).toHaveLength(1);

    queue.unsubscribe();
  });
});
