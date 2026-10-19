/**
 * Source files on the certifier review page (handoff rehearsal 2026-10-18, H-3).
 *
 * The recipient could see the Entrust invoice listed in the dossier and could not open it. With
 * the grower's per-link opt-in, each file opens through the review link; without it, the page
 * says the operation did not include them, instead of staying silent.
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
  operation_name: 'Test Block',
  operation_city: 'Chelan',
  operation_state: 'WA',
  certification_type: 'organic',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  expires_at: '2027-01-16T00:00:00Z',
  label: 'Rehearsal'
};
const READINESS = { total_findings: 0, total_productions: 0, productions: [] };
const FILES = {
  enabled: true,
  documents: [
    {
      id: '3f1c2a9e-0000-4000-8000-000000000001',
      title: 'ASTRA TEST invoice ASTRA-INV-2605-01',
      folder: 'Uploads',
      linked_to: 'Entrust SC, May 15, 2026',
      size_bytes: 48_000,
      content_type: 'application/pdf',
      uploaded_at: '2026-10-17T13:20:00Z'
    }
  ]
};

const renderWith = (
  files: unknown,
  messages: Record<string, string> = enMessages,
  locale = 'en'
) => {
  global.fetch = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    status: 200,
    json: async () =>
      String(url).includes('/readiness')
        ? READINESS
        : String(url).includes('/documents')
        ? files
        : META
  })) as unknown as typeof fetch;
  return render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messages}>
        <MemoryRouter initialEntries={['/certifier-review/tok-1']}>
          <Routes>
            <Route path="/certifier-review/:token" element={<CertifierReview />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
};

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
});

describe('certifier review page: source files', () => {
  it('lists each shared file as a link through this review link, with its record', async () => {
    renderWith(FILES);
    const section = await screen.findByTestId('certifier-source-files');
    expect(section.textContent).toContain('Source files');
    expect(section.textContent).toContain('Entrust SC, May 15, 2026');
    const link = screen.getByRole('link', { name: /ASTRA-INV-2605-01/ });
    expect(link.getAttribute('href')).toMatch(
      /\/api\/certifier-review\/tok-1\/documents\/3f1c2a9e-0000-4000-8000-000000000001\/$/
    );
    expect(section.textContent).toContain('The operation sees when a file is opened.');
  });

  it('says so when the operation did not include its files', async () => {
    renderWith({ enabled: false, documents: [] });
    const section = await screen.findByTestId('certifier-source-files');
    expect(section.textContent).toContain('did not include its source files');
    expect(screen.queryAllByTestId('certifier-source-file')).toHaveLength(0);
  });

  it('hides the section, not the page, when the list cannot be read', async () => {
    renderWith(null);
    await waitFor(() => expect(screen.getByText('Test Block')).toBeTruthy());
    expect(screen.queryByTestId('certifier-source-files')).toBeNull();
  });

  it('reads in Spanish from the catalogue', async () => {
    renderWith({ enabled: false, documents: [] }, esMessages, 'es-419');
    const section = await screen.findByTestId('certifier-source-files');
    expect(section.textContent).toContain('Archivos de respaldo');
    expect(section.textContent).toContain('no incluyó sus archivos de respaldo');
  });
});
