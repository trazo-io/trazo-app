/**
 * The review pages must not report a transport failure as a withdrawn link.
 *
 * The 2026-09-06 audit created a certifier link and watched it fail to open MINUTES LATER,
 * while the farmer's own dashboard showed it active and unexpired. The page said
 * "This link is no longer available … It may have expired or been withdrawn." The root cause
 * was never established, and it did not need to be: the page was asserting a fact about the
 * grower's intent from an error it had not classified.
 *
 * Neither page had a single test mounting it. These are those tests.
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import CertifierReview from '../CertifierReview';
import BuyerReview from '../../BuyerReview/BuyerReview';

const renderPage = (Component: React.ComponentType, path: string) =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en-US" messages={enMessages as any} onError={() => undefined}>
        <MemoryRouter initialEntries={[`${path}/tok-123`]}>
          <Routes>
            <Route path={`${path}/:token`} element={<Component />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const respondWith = (status: number) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      operation_name: 'Calapooia Bend Farm',
      operation_city: 'Tangent',
      operation_state: 'OR',
      certification_type: 'organic',
      period_start: null,
      period_end: null,
      expires_at: '2026-12-31T00:00:00Z',
      label: 'Inspection',
      seasons: []
    })
  });

const GONE = enMessages['certifierReview.unavailable.title'];
const TEMPORARY = enMessages['certifierReview.temporary.title'];
const BUYER_GONE = enMessages['buyerReview.notFound.title'];
const BUYER_TEMPORARY = enMessages['buyerReview.temporary.title'];

describe.each([
  ['CertifierReview', CertifierReview, '/certifier-review', GONE, TEMPORARY],
  ['BuyerReview', BuyerReview, '/buyer-review', BUYER_GONE, BUYER_TEMPORARY]
])('%s', (_name, Component, path, goneCopy, temporaryCopy) => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('says the link is gone on a 404', async () => {
    global.fetch = respondWith(404) as unknown as typeof fetch;
    renderPage(Component as React.ComponentType, path);
    await waitFor(() => expect(screen.getByText(goneCopy)).toBeTruthy());
    expect(screen.queryByText(temporaryCopy)).toBeNull();
  });

  it('does NOT say the link is gone when throttled', async () => {
    global.fetch = respondWith(429) as unknown as typeof fetch;
    renderPage(Component as React.ComponentType, path);
    await waitFor(() => expect(screen.getByText(temporaryCopy)).toBeTruthy());
    expect(screen.queryByText(goneCopy)).toBeNull();
  });

  it('does NOT say the link is gone on a server error', async () => {
    global.fetch = respondWith(502) as unknown as typeof fetch;
    renderPage(Component as React.ComponentType, path);
    await waitFor(() => expect(screen.getByText(temporaryCopy)).toBeTruthy());
    expect(screen.queryByText(goneCopy)).toBeNull();
  });

  it('does NOT say the link is gone on a network or CORS failure', async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch;
    renderPage(Component as React.ComponentType, path);
    await waitFor(() => expect(screen.getByText(temporaryCopy)).toBeTruthy());
    expect(screen.queryByText(goneCopy)).toBeNull();
  });

  it('renders the operation for a healthy link', async () => {
    global.fetch = respondWith(200) as unknown as typeof fetch;
    renderPage(Component as React.ComponentType, path);
    await waitFor(() =>
      expect(screen.getAllByText(/Calapooia Bend Farm/).length).toBeGreaterThan(0)
    );
    expect(screen.queryByText(goneCopy)).toBeNull();
    expect(screen.queryByText(temporaryCopy)).toBeNull();
  });
});
