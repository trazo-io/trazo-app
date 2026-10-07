/**
 * The certifier page lists findings; rows that are facts about scope fold behind a toggle.
 *
 * Recordkeeping review S9 (F-16, 2026-10-07): 25 "Not assessed" rows sat among 19 findings, so
 * the certifier scanned 46 rows for the 21 that carried one. The server now serves them apart
 * as `not_assessed`; the page counts findings only and offers the rest on demand. Red on the
 * old page.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import CertifierReview from '../CertifierReview';

const META = {
  operation_name: 'Calapooia Bend Farm',
  operation_city: 'Tangent',
  operation_state: 'OR',
  certification_type: 'organic',
  period_start: null,
  period_end: null,
  expires_at: '2026-12-31T00:00:00Z',
  label: 'Inspection',
  seasons: []
};

const READINESS = {
  total_findings: 1,
  total_not_assessed: 2,
  total_productions: 1,
  productions: [
    {
      production_id: 7,
      production_name: 'Duke 2026',
      finish_date: null,
      findings: [
        {
          label: 'Input traceability (§ 205.103)',
          row_key: 'input_traceability',
          status: 'FAIL',
          detail: '3/5 inputs have supplier',
          section_hint: 'Input Material Application Records section'
        }
      ],
      not_assessed: [
        { label: 'Compost (§ 205.203(c)(2))', row_key: 'compost', status: 'NA' },
        { label: 'IPM strategy (§ 205.206(a))', row_key: 'ipm_strategy', status: 'NOT ASSESSED' }
      ]
    }
  ]
};

const renderPage = () => {
  global.fetch = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('/readiness') ? READINESS : META)
  })) as unknown as typeof fetch;
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider
        locale="en-US"
        messages={enMessages as Record<string, string>}
        onError={() => undefined}>
        <MemoryRouter initialEntries={['/certifier-review/tok-1']}>
          <Routes>
            <Route path="/certifier-review/:token" element={<CertifierReview />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the certifier page and the rows not assessed', () => {
  it('shows findings only, and the rest behind a toggle', async () => {
    renderPage();
    await waitFor(() =>
      expect(screen.getByText('Input traceability (§ 205.103)')).toBeInTheDocument()
    );
    expect(screen.queryByText(/Compost \(§ 205\.203/)).toBeNull();
    const toggle = screen.getByTestId('certifier-not-assessed-toggle');
    expect(toggle).toHaveTextContent('Show the 2 rows not assessed');
    fireEvent.click(toggle);
    expect(screen.getByTestId('certifier-not-assessed-rows')).toHaveTextContent(
      /Compost \(§ 205\.203/
    );
    expect(screen.getByTestId('certifier-not-assessed-rows')).toHaveTextContent(/Not assessed/);
    expect(screen.getByTestId('certifier-not-assessed-toggle')).toHaveTextContent(
      'Hide the 2 rows not assessed'
    );
  });
});
