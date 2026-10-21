/**
 * "Trace a sale" on the certifier review link: the operation's own chain, read-only.
 *
 * Backend contract: certifications/tests/test_certifier_review_traceback.py. Here: the reviewer
 * sees the missing links as facts (no "how to fix", no fix buttons), files open through the
 * token route only when shared, and a 404 or a 429 never reads as a withdrawn link.
 */
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import enUS from '../../../i18n/lang/en-US.json';
import ReviewTraceback from '../ReviewTraceback';

const messages = enUS as unknown as Record<string, string>;
const API = 'http://api.test/api';

const TRACE = {
  sale: {
    date: '2026-09-27',
    buyer: 'Columbia Valley Fruit Packers',
    quantity: '41 bins',
    invoice: 'CVFP-2026-1240',
    bol: 'BR-2026-5602',
    organic_on_invoice: true,
    label_category: 'organic',
    documents: [
      { title: 'BR-2026-5602 bin receipt', kind: 'bill_of_lading', file_id: 'abc-123' },
      { title: 'packout.pdf', kind: 'packout', file_id: null }
    ]
  },
  picks_linked: true,
  picks: [{ lot_code: 'HON-NB2-20260926', date: '2026-09-26', quantity: '41 bins', documents: [] }],
  season: {
    name: 'Honeycrisp 2026',
    crop: 'Honeycrisp Apple',
    parcel: 'North Bench',
    lot_id: 'CRO-HON-2026'
  },
  inputs: [
    {
      kind: 'chemical',
      event_id: 9,
      event_type: 'FU',
      date: '2026-04-02',
      product: 'Lime sulfur',
      block: 'NB-1',
      supplier: 'Valley Ag Supply',
      invoice: 'VAS-26-0412',
      lot: 'LS-2611',
      listing: 'recorded_by_farm',
      other_block: false,
      documents: []
    }
  ],
  balance: {
    harvested: '79 bins',
    sold: '79 bins',
    packed_out: '',
    difference: '0 bins',
    not_computed: false,
    sold_not_organic_count: 0
  },
  gaps: [
    {
      hop: 'inputs',
      code: 'input_without_document',
      field: 'receipt_document',
      ref: 9,
      kind: 'chemical'
    }
  ]
};

const reply = (status: number, body: unknown = {}) =>
  Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) } as Response);

const renderIt = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={messages}>
        <ReviewTraceback token="tok" apiRoot={API} />
      </IntlProvider>
    </ChakraProvider>
  );

const searchFor = (q: string) => {
  fireEvent.change(screen.getByPlaceholderText(messages['traceback.search.placeholder']), {
    target: { value: q }
  });
  fireEvent.click(screen.getByRole('button', { name: messages['traceback.search.submit'] }));
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ReviewTraceback', () => {
  it('an answer to an older request never replaces the newer one', async () => {
    // Enter in the search box submits even while the button is disabled, so a second search can
    // start before the first answers. The first (SLOW) answers LAST; the page must keep showing
    // the second's chain, never the stale list (review of app #167).
    let releaseSlow: (r: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('q=SLOW')) return new Promise<Response>((r) => (releaseSlow = r));
        if (url.includes('q=FAST'))
          return reply(200, {
            truncated: false,
            results: [
              {
                sale_id: 7,
                date: '',
                buyer: '',
                invoice: '',
                crop: '',
                parcel: '',
                season: '',
                matched_on: 'invoice'
              }
            ]
          });
        return reply(200, TRACE);
      })
    );
    renderIt();
    searchFor('SLOW');
    const input = screen.getByPlaceholderText(messages['traceback.search.placeholder']);
    fireEvent.change(input, { target: { value: 'FAST' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText(messages['traceback.hop.sale'])).toBeTruthy();
    releaseSlow(
      (await reply(200, {
        truncated: false,
        results: [
          {
            sale_id: 1,
            date: '',
            buyer: 'STALE',
            invoice: '',
            crop: '',
            parcel: '',
            season: '',
            matched_on: 'invoice'
          },
          {
            sale_id: 2,
            date: '',
            buyer: 'STALE2',
            invoice: '',
            crop: '',
            parcel: '',
            season: '',
            matched_on: 'invoice'
          }
        ]
      })) as Response
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(messages['traceback.hop.sale'])).toBeTruthy();
    expect(screen.queryByText(/STALE/)).toBeNull();
  });

  it('a body still parsing when a newer request starts is dropped too', async () => {
    // Headers arrive (the first check passes), then the body parses slowly; meanwhile a newer
    // search answers. The slow body must not land (review of app #169).
    let releaseBody: (v: unknown) => void = () => undefined;
    const slowStale = {
      truncated: false,
      results: [
        {
          sale_id: 1,
          date: '',
          buyer: 'STALE',
          invoice: '',
          crop: '',
          parcel: '',
          season: '',
          matched_on: 'invoice'
        },
        {
          sale_id: 2,
          date: '',
          buyer: 'STALE2',
          invoice: '',
          crop: '',
          parcel: '',
          season: '',
          matched_on: 'invoice'
        }
      ]
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('q=SLOW'))
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => new Promise((r) => (releaseBody = r))
          } as unknown as Response);
        if (url.includes('q=FAST'))
          return reply(200, {
            truncated: false,
            results: [
              {
                sale_id: 7,
                date: '',
                buyer: '',
                invoice: '',
                crop: '',
                parcel: '',
                season: '',
                matched_on: 'invoice'
              }
            ]
          });
        return reply(200, TRACE);
      })
    );
    renderIt();
    searchFor('SLOW');
    await new Promise((r) => setTimeout(r, 20));
    const input = screen.getByPlaceholderText(messages['traceback.search.placeholder']);
    fireEvent.change(input, { target: { value: 'FAST' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);
    expect(await screen.findByText(messages['traceback.hop.sale'])).toBeTruthy();
    releaseBody(slowStale);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText(messages['traceback.hop.sale'])).toBeTruthy();
    expect(screen.queryByText(/STALE/)).toBeNull();
  });

  it('a malformed answer is an error, not a spinner forever', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError('bad'))
        } as Response)
      )
    );
    renderIt();
    searchFor('X');
    await waitFor(() =>
      expect(screen.getByText(messages['certifierReview.traceback.unavailable'])).toBeTruthy()
    );
  });

  it("several matches are the reviewer's choice", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        reply(200, {
          truncated: false,
          results: [
            {
              sale_id: 1,
              date: '2026-09-27',
              buyer: 'A',
              invoice: 'I1',
              crop: 'C',
              parcel: 'P',
              season: 'S',
              matched_on: 'pick_lot_code'
            },
            {
              sale_id: 2,
              date: '2025-09-27',
              buyer: 'B',
              invoice: 'I2',
              crop: 'C',
              parcel: 'P',
              season: 'S',
              matched_on: 'pick_lot_code'
            }
          ]
        })
      )
    );
    renderIt();
    searchFor('HON-NB2');
    expect(await screen.findByText('2 sales match')).toBeTruthy();
    expect(screen.queryByText(messages['traceback.hop.sale'])).toBeNull();
  });

  it('one match opens the chain, read-only, files only when shared', async () => {
    const fetchMock = vi.fn((url: string) =>
      url.includes('?')
        ? reply(200, {
            truncated: false,
            results: [
              {
                sale_id: 7,
                date: '',
                buyer: '',
                invoice: '',
                crop: '',
                parcel: '',
                season: '',
                matched_on: 'invoice'
              }
            ]
          })
        : reply(200, TRACE)
    );
    vi.stubGlobal('fetch', fetchMock);
    renderIt();
    searchFor('CVFP-2026-1240');
    expect(await screen.findByText(messages['traceback.hop.sale'])).toBeTruthy();
    // Anonymous: no credentials option on any request, and only the token routes.
    for (const call of fetchMock.mock.calls) {
      expect(String(call[0]).startsWith(`${API}/certifier-review/tok/traceback/`)).toBe(true);
      expect((call as unknown[])[1]).toBeUndefined();
    }
    // The gap is a fact for the reviewer, on the input's own row (production review link,
    // 2026-10-21: a list above the rows had to be matched back to them by hand). No how-to, no
    // fix button.
    expect(
      screen.queryByText('2026-04-02 · Lime sulfur: no purchase receipt attached.')
    ).toBeNull();
    const row = screen.getByText('2026-04-02 · Lime sulfur').parentElement as HTMLElement;
    expect(row.textContent).toContain(
      `${messages['traceback.field.receipt']}: ${messages['traceback.missing.notAttached']}`
    );
    // The recorded spray type, not "Fertilizer or crop protection": § 205.206 reads a fungicide
    // differently from a fertilizer.
    expect(row.textContent).toContain(messages['events.chemical.subtypes.fungicide']);
    expect(row.textContent).not.toContain(messages['traceback.inputKind.chemical']);
    expect(screen.queryByText(messages['traceback.gapHow.input_without_document'])).toBeNull();
    expect(screen.queryByRole('button', { name: messages['traceback.gap.fix'] })).toBeNull();
    expect(screen.getByText('1 link not recorded in this chain')).toBeTruthy();
    const shared = screen.getByRole('link', { name: /Bill of lading: BR-2026-5602 bin receipt/ });
    expect(shared.getAttribute('href')).toBe(`${API}/certifier-review/tok/documents/abc-123/`);
    expect(screen.getByText(/packout\.pdf \(on file, not shared through this link\)/)).toBeTruthy();
  });

  it('a 404 says the sale is not on this link; a 429 is temporary, never "withdrawn"', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => reply(404))
    );
    const { unmount } = renderIt();
    searchFor('X');
    await waitFor(() =>
      expect(screen.getByText(messages['certifierReview.traceback.notFound'])).toBeTruthy()
    );
    unmount();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => reply(429))
    );
    renderIt();
    searchFor('X');
    await waitFor(() =>
      expect(screen.getByText(messages['certifierReview.traceback.unavailable'])).toBeTruthy()
    );
  });
});
