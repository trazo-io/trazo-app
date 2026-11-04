/**
 * Run 8 (R8-27, Astra 2026-10-05): the certifier review page showed red "FAIL" badges for input
 * traceability and chemical completeness under an organic dossier title, the
 * not-a-compliance-decision disclaimer sat at the bottom of a long page, and English row names
 * appeared under Spanish framing. A readiness row says whether a record is present; it is not a
 * certifier's verdict.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
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
  total_findings: 2,
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
          detail: '2 applications lack a lot number',
          section_hint: 'Input Material Application Records section'
        },
        {
          label: 'Compost (§ 205.203(c)(2))',
          row_key: 'compost',
          status: 'REVIEW',
          detail: 'C:N basis not stated',
          section_hint: null
        }
      ]
    }
  ]
};

const renderAt = (locale: string, messages: Record<string, string>) => {
  global.fetch = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () => (String(url).includes('/readiness') ? READINESS : META)
  })) as unknown as typeof fetch;
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messages} onError={() => undefined}>
        <MemoryRouter initialEntries={['/certifier-review/tok-1']}>
          <Routes>
            <Route path="/certifier-review/:token" element={<CertifierReview />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('readiness on the certifier review page is not a verdict', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('says Missing / For review, never FAIL, and states its scope before the findings', async () => {
    const { container } = renderAt('en-US', enMessages as Record<string, string>);
    await waitFor(() => expect(screen.queryByText('Missing')).not.toBeNull());
    expect(screen.queryByText('For review')).not.toBeNull();
    expect(container.textContent).not.toMatch(/\bFAIL\b/);
    const text = container.textContent || '';
    const disclaimer = text.indexOf(
      (enMessages as Record<string, string>)['certifierReview.readinessDisclaimer']
    );
    expect(disclaimer).toBeGreaterThan(-1);
    expect(disclaimer).toBeLessThan(text.indexOf('2 applications lack a lot number'));
  });

  it('opens with a link to the trace, above the readiness findings (production review, 2026-10-21)', async () => {
    const { container } = renderAt('en-US', enMessages as Record<string, string>);
    await waitFor(() => expect(screen.queryByText('Missing')).not.toBeNull());
    const jump = screen.getByRole('link', {
      name: (enMessages as Record<string, string>)['certifierReview.traceback.jump']
    });
    expect(jump.getAttribute('href')).toBe('#certifier-traceback');
    expect(container.querySelector('#certifier-traceback')).not.toBeNull();
    const text = container.textContent || '';
    expect(text.indexOf(jump.textContent || '')).toBeLessThan(text.indexOf('Missing'));
  });

  it("names the rows in the reader's language", async () => {
    const { container } = renderAt('es-419', esMessages as Record<string, string>);
    await waitFor(() => expect(screen.queryByText('Falta')).not.toBeNull());
    expect(container.textContent).toContain('Trazabilidad de insumos (§ 205.103)');
    expect(container.textContent).not.toContain('Input traceability');
  });

  it('paints no finding red', () => {
    const src = require('node:fs').readFileSync(
      require('node:path').resolve(process.cwd(), 'src/views/CertifierReview/CertifierReview.tsx'),
      'utf8'
    );
    const fn = src.slice(
      src.indexOf('function findingStyle'),
      src.indexOf('function findingLabel')
    );
    // Since 2026-11-04 findings render through StatusRow, whose `crit`/`warn` tones ARE red and
    // orange. Banning only the colour names would let a verdict back in under a tone name.
    expect(fn).not.toMatch(/red|orange|'crit'|'warn'/);
    expect(fn).toMatch(/'neutral'/);
  });
});
