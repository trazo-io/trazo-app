/**
 * The wizard's Preview shows the SERVER's decision about an input listing, or says it cannot.
 *
 * 🔴 2026-09-03, found while filming. The grower logged an Entrust application by voice,
 * attached the OMRI listing with "Use this listing", and opened Preview ("How shoppers will see
 * this activity"). The chip read "Organic-approved · grower-reported".
 *
 * The card was not wrong to refuse. `ORGANIC_STATUS_KEYS` maps EVERY `organic_approved` value to
 * the grower-reported wording on purpose: the browser cannot see the OMRI or WSDA catalogs, so
 * a listing claim decided there would be the unearned certification-mark claim of 2026-08-09.
 * The defect was that the preview had no way to ask the only thing that may answer.
 *
 * Two states, and neither of them is a guess:
 *   - the server answered  → render exactly what the saved page will render;
 *   - it has not, or could not → say that, in words that make no claim at all.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../i18n/lang/en-US.json';

/**
 * The hook is stubbed rather than the network: `fetchBaseQuery` captures `fetch` when the api
 * module is created, so a `vi.stubGlobal('fetch')` set up inside a test is never consulted and
 * every case would silently collapse into the offline one. What the request LOOKS like is
 * pinned separately, against the source, below.
 */
let queryResult: { data?: { status: string; label: string } } = {};
const queryCalls: Array<[unknown, unknown]> = [];

vi.mock('store/api/ospApi', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    usePreviewInputStatusQuery: (arg: unknown, options: unknown) => {
      queryCalls.push([arg, options]);
      return queryResult;
    }
  };
});

// Imported AFTER the mock is declared so the modal picks up the stubbed hook.
const { EventPreviewModal } = await import('../EventPreviewModal');

const renderPreview = (formData: Record<string, unknown>, activeEventType = 2) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>} onError={() => {}}>
        <EventPreviewModal
          isOpen
          onClose={() => undefined}
          activeEventType={activeEventType}
          formData={formData as never}
        />
      </IntlProvider>
    </ChakraProvider>
  );

/** The draft as it stands the moment after "Use this listing" is tapped. */
const entrustWithListing = {
  event_type: 2,
  type: 'PE',
  chemical_type: 'PE',
  commercial_name: 'Entrust SC',
  date: '2026-09-03',
  area: '12',
  area_unit: 'acres',
  omri_product: 4471,
  organic_approved: 'omri_listed'
};

beforeEach(() => {
  queryResult = {};
  queryCalls.length = 0;
});

describe('EventPreviewModal — the input chip is the server’s answer or nothing', () => {
  it('renders the server’s decision when it has one', () => {
    queryResult = { data: { status: 'omri_listed', label: 'OMRI Listed' } };
    renderPreview(entrustWithListing);

    expect(screen.getAllByText(/OMRI Listed/i).length).toBeGreaterThan(0);
    // …and the false negative that was on camera is gone.
    expect(screen.queryByText(/grower-reported/i)).toBeNull();
  });

  it('says the check has not run rather than reporting a claim it cannot make', () => {
    queryResult = {}; // in flight, or the request failed
    renderPreview(entrustWithListing);

    expect(screen.getAllByText(/Listing check runs when you save/i).length).toBeGreaterThan(0);
    // Neither direction is guessed: no listing claimed, and no grower-reported downgrade
    // asserted over a listing the grower has attached.
    expect(screen.queryByText(/grower-reported/i)).toBeNull();
    expect(screen.queryByText(/OMRI Listed/i)).toBeNull();
  });

  it('sends the attached listing and the basis, because those decide the claim', () => {
    renderPreview(entrustWithListing);
    const [draft, options] = queryCalls[0] as [Record<string, unknown>, { skip: boolean }];
    expect(options.skip).toBe(false);
    expect(draft.omri_product).toBe(4471);
    expect(draft.commercial_name).toBe('Entrust SC');
    expect(draft.organic_approved).toBe('omri_listed');
  });

  it('asks nothing for an activity that carries no input', () => {
    renderPreview({ event_type: 1, type: 'IR', date: '2026-09-03' }, 1);
    // The hook still RUNS — it must, hooks are unconditional — but it is skipped.
    expect(queryCalls.every(([, options]) => (options as { skip: boolean }).skip)).toBe(true);
  });

  it('POSTs the draft to the dry-run endpoint, and caches rather than invalidates', () => {
    // Source-pinned because the hook itself is stubbed above. A `build.mutation` here would
    // re-run on every keystroke and could invalidate real cache entries; the endpoint reads.
    const api = readFileSync(resolve(__dirname, '../../../store/api/ospApi.ts'), 'utf8');
    const block = api.slice(api.indexOf('previewInputStatus: build.query'));
    expect(api).toContain('previewInputStatus: build.query');
    expect(block).toContain('url: INPUT_STATUS_PREVIEW_URL');
    expect(block).toContain("method: 'POST'");
    expect(block).not.toContain('invalidatesTags');
  });
});
