/**
 * Washington spray records (WAC 16-228-1320) on the farm profile.
 *
 * - Offered only to a farm whose state resolves to Washington; a California or Oregon farm never
 *   sees it (the backend answers 404 for them).
 * - Inside the same ComplianceExportsGuard as the CA PUR card, so Starter gets the plan state of the
 *   page rather than a button that fails on click.
 * - The modal asks for a calendar year by default, or one month as a date range, and downloads a
 *   PDF or a CSV with `export_format` (never `format`, which DRF reserves).
 * - Blank items are named in the farmer's locale, and the note says whose decision acceptance is,
 *   never that the document satisfies the rule.
 */
import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

// Relative: `theme` is not one of the aliases vitest.config.ts declares.
import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
import WASprayExportCard, { isWashingtonFarm } from '../WASprayExportCard';
import WASprayExportModal, { periodParams } from '../WASprayExportModal';

const SUMMARY = {
  establishment_id: 160,
  establishment_name: 'Sunrise Block Orchard',
  rule: 'WAC 16-228-1320',
  period_start: '2026-01-01',
  period_end: '2026-12-31',
  pass_count: 2,
  product_line_count: 4,
  passes_with_blank_items: 1,
  parcels_without_map: ['South Block'],
  passes: [
    {
      number: 1,
      event_id: 42,
      event_type: 2,
      event_ids: [42, 43, 44],
      parcel_id: 5,
      parcel_name: 'North Orchard',
      block: 'B7',
      event_date: '2026-06-15',
      products: ['Entrust SC', 'Kocide 3000-O', 'Dyne-Amic'],
      blank_items: []
    },
    {
      number: 2,
      event_id: 45,
      event_type: 2,
      event_ids: [45],
      parcel_id: 6,
      parcel_name: 'South Block',
      block: '',
      event_date: '2026-07-02',
      products: ['Cyd-X'],
      blank_items: ['e', 'k']
    }
  ]
};

const messagesFor = (locale: 'en-US' | 'es-419') => (locale === 'en-US' ? enMessages : esMessages);

const stubFetch = (body: unknown = SUMMARY, ok = true, status = 200) => {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok,
    status,
    json: async () => body,
    blob: async () => new Blob(['%PDF'])
  }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const renderModal = (locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={messagesFor(locale)}>
        <MemoryRouter>
          <WASprayExportModal
            isOpen
            onClose={vi.fn()}
            establishmentId={160}
            establishmentName="Sunrise Block Orchard"
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const renderCard = (farmState: string | null) =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en-US" messages={enMessages}>
        <WASprayExportCard farmState={farmState} onOpen={vi.fn()} />
      </IntlProvider>
    </ChakraProvider>
  );

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('who is offered the Washington spray records', () => {
  it.each(['WA', 'wa', 'Washington'])('a farm in %s sees the card', (state) => {
    renderCard(state);
    expect(screen.getByText('Washington spray records')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Generate records/ })).toBeTruthy();
  });

  it.each(['CA', 'OR', 'Oregon', '', null])('a farm in %s does not', (state) => {
    renderCard(state as string | null);
    expect(screen.queryByText('Washington spray records')).toBeNull();
    expect(isWashingtonFarm(state as string | null)).toBe(false);
  });

  it('sits inside the farm profile’s Compliance guard, and the modal mounts only for Washington', () => {
    const src = readFileSync(
      join(__dirname, '../../../views/Dashboard/Dashboard/Farm/ProfileFarm.tsx'),
      'utf8'
    );
    const guardOpen = src.indexOf('<ComplianceExportsGuard>');
    const guardClose = src.indexOf('</ComplianceExportsGuard>');
    const card = src.indexOf('<WASprayExportCard');
    expect(guardOpen).toBeGreaterThan(-1);
    expect(card).toBeGreaterThan(guardOpen);
    expect(card).toBeLessThan(guardClose);
    expect(src).toMatch(/\{farmId && isWashington && \(\s*<WASprayExportModal/);
    expect(src).toContain('const isWashington = isWashingtonFarm(establishmentData?.state);');
  });
});

describe('the period it asks for', () => {
  it('is a calendar year, or one month as an inclusive date range', () => {
    expect(periodParams(2026, 0)).toBe('year=2026');
    expect(periodParams(2026, 6)).toBe('start=2026-06-01&end=2026-06-30');
    expect(periodParams(2028, 2)).toBe('start=2028-02-01&end=2028-02-29');
  });
});

describe('WASprayExportModal', () => {
  it('drops a slow preview for an earlier period and downloads the period on screen', async () => {
    // Two previews in flight: the whole year (slow) and March (fast). The year's answer lands
    // LAST and must not replace March's, and Download must ask for March.
    const year = new Date().getFullYear();
    const pending: Array<{ url: string; resolve: (body: unknown) => void }> = [];
    const respond = (body: unknown) => ({
      ok: true,
      status: 200,
      json: async () => body,
      blob: async () => new Blob(['%PDF'])
    });
    const fetchMock = vi.fn((url: string) => {
      if (!url.includes('export_format=json')) return Promise.resolve(respond({}));
      return new Promise((resolve) => {
        pending.push({ url, resolve: (body) => resolve(respond(body)) });
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn()
    });
    renderModal();
    await waitFor(() => expect(pending).toHaveLength(1));
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: '3' } });
    await waitFor(() => expect(pending).toHaveLength(2));
    expect(pending[0].url).toContain(`year=${year}`);
    expect(pending[1].url).toContain(`start=${year}-03-01&end=${year}-03-31`);

    const march = {
      ...SUMMARY,
      pass_count: 1,
      passes_with_blank_items: 0,
      passes: [{ ...SUMMARY.passes[0], products: ['March spray'], event_date: `${year}-03-10` }]
    };
    pending[1].resolve(march);
    await screen.findByText('March spray');
    pending[0].resolve(SUMMARY);
    // Let the stale response settle, then check it changed nothing.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText('March spray')).toBeTruthy();
    expect(screen.queryByText('Cyd-X')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
        `start=${year}-03-01&end=${year}-03-31&export_format=pdf`
      )
    );
  });

  it('counts spray jobs when a job on several parcels printed as one application per parcel', async () => {
    stubFetch({ ...SUMMARY, pass_count: 23, job_count: 10 });
    renderModal('en-US');
    expect(
      await screen.findByText(
        '10 spray jobs, printed as 23 applications, one per parcel or section'
      )
    ).toBeTruthy();
  });

  it('says it in Spanish too, and keeps the plain count when every job is one application', async () => {
    stubFetch({ ...SUMMARY, pass_count: 4, job_count: 1 });
    const { unmount } = renderModal('es-419');
    expect(
      await screen.findByText('1 aspersión, impresa como 4 aplicaciones, una por parcela o sección')
    ).toBeTruthy();
    unmount();
    stubFetch({ ...SUMMARY, job_count: 2 });
    renderModal('en-US');
    expect(await screen.findByText('2 applications')).toBeTruthy();
  });

  it('lists each day of a tank whose lines hold different days', async () => {
    stubFetch({
      ...SUMMARY,
      passes: [{ ...SUMMARY.passes[0], event_date: '', event_days: ['2026-06-15', '2026-06-20'] }]
    });
    renderModal('en-US');
    expect(
      await screen.findByText(/Lines recorded on different days: Jun 15, 2026, Jun 20, 2026/)
    ).toBeTruthy();
  });

  it('previews the current calendar year by default with export_format, never format', async () => {
    const fetchMock = stubFetch();
    renderModal();
    await screen.findByText('Cyd-X');
    const first = String(fetchMock.mock.calls[0][0]);
    expect(first).toContain('/productions/wa-spray-records-export/');
    expect(first).toContain(
      `establishment_id=160&year=${new Date().getFullYear()}&export_format=json`
    );
    expect(first).not.toMatch(/[?&]format=/);
    expect(fetchMock.mock.calls[0][1]).toEqual({ credentials: 'include' });
  });

  it('asks for one month as a date range when a month is picked', async () => {
    const fetchMock = stubFetch();
    renderModal();
    await screen.findByText('Cyd-X');
    fireEvent.change(screen.getByLabelText('Period'), { target: { value: '3' } });
    const year = new Date().getFullYear();
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain(
        `start=${year}-03-01&end=${year}-03-31&export_format=json`
      )
    );
  });

  it('downloads the PDF and the CSV from the same period', async () => {
    const fetchMock = stubFetch();
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:x'),
      revokeObjectURL: vi.fn()
    });
    renderModal();
    await screen.findByText('Cyd-X');
    fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('&export_format=pdf')
    );
    // One download at a time: the CSV button waits for the PDF to finish.
    const csvButton = screen.getByRole('button', { name: /Download CSV/ }) as HTMLButtonElement;
    await waitFor(() => expect(csvButton.disabled).toBe(false));
    fireEvent.click(csvButton);
    await waitFor(() =>
      expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('&export_format=csv')
    );
  });

  it('shows the plan refusal the server sends, so Starter reads why', async () => {
    stubFetch({ detail: 'Certifier documents are part of the Compliance plan.' }, false, 403);
    renderModal();
    expect(
      await screen.findByText('Certifier documents are part of the Compliance plan.')
    ).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: /Download PDF/ }) as HTMLButtonElement).disabled
    ).toBe(true);
  });

  it('names blank items and the tank in English, and says whose decision acceptance is', async () => {
    stubFetch();
    renderModal('en-US');
    expect(
      await screen.findByText(
        'Not on the record: (e) wind and temperature, (k) apparatus license plate'
      )
    ).toBeTruthy();
    expect(screen.getByText('No item is blank on this record')).toBeTruthy();
    expect(screen.getByText(/One tank, 3 products/)).toBeTruthy();
    expect(screen.getByText(/No parcel boundary is drawn for South Block/)).toBeTruthy();
    const note = screen.getByText(/is the department's decision \(WAC 16-228-1320\(5\)\)/);
    expect(note.textContent).not.toMatch(/satisf|complian|approved/i);
  });

  it('names blank items in Spanish under es-419', async () => {
    stubFetch();
    renderModal('es-419');
    expect(
      await screen.findByText(
        'No consta en el registro: (e) viento y temperatura, (k) placa del equipo de aplicación'
      )
    ).toBeTruthy();
    expect(screen.getByLabelText('Período')).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Todo el año' })).toBeTruthy();
  });
});

describe('the strings', () => {
  const keys = Object.keys(enMessages).filter((k) => k.startsWith('app.waSpray.'));

  it('exist in both locales', () => {
    expect(keys.length).toBeGreaterThan(30);
    for (const key of keys) {
      expect((esMessages as Record<string, string>)[key], key).toBeTruthy();
    }
  });

  it('never claim the document satisfies the rule, in either language', () => {
    for (const key of keys) {
      const en = (enMessages as Record<string, string>)[key];
      const es = (esMessages as Record<string, string>)[key];
      expect(en, key).not.toMatch(/satisf|complian|approved|—/i);
      expect(es, key).not.toMatch(/cumple|satisface|aprobad|—/i);
    }
  });

  it('speak neutral tuteo and say finca, never su/sus, usted or granja', () => {
    for (const key of keys) {
      const es = (esMessages as Record<string, string>)[key];
      expect(es, key).not.toMatch(
        /(^|[^A-Za-zÁÉÍÓÚáéíóúñÑ])(su|sus|usted|granja)([^A-Za-zÁÉÍÓÚáéíóúñÑ]|$)/i
      );
    }
  });
});
