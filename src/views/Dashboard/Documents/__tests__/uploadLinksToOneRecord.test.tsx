/**
 * The Documents page: a file can be filed against one activity record, and an upload is labelled
 * by who uploaded it (pilot rehearsal 2026-10, findings 4 and 5).
 *
 * Finding 4: the May 15 Entrust SC spray had a supplier invoice, and the filing dialog could
 * point it at the season and no finer. Finding 5: the operator's upload read "Farmer upload".
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const upload = vi.fn((_args: Record<string, unknown>) => ({ unwrap: () => Promise.resolve({}) }));
let docs: Record<string, unknown>[] = [];
const historyQuery = vi.fn();

vi.mock('store/api/documentsApi', () => ({
  useGetFarmDocumentsQuery: () => ({
    data: docs,
    isLoading: false,
    isUninitialized: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn()
  }),
  useUploadFarmDocumentMutation: () => [upload, { isLoading: false }],
  useDeleteFarmDocumentMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('store/api/historyApi', () => ({
  useGetFarmProductionsQuery: () => ({ data: [{ id: 5, name: 'Bartlett pears 2026' }] }),
  useGetHistoryQuery: (...args: unknown[]) => historyQuery(...args)
}));
vi.mock('hooks/useTour', () => ({ useTour: () => undefined }));
vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 17 } } })
}));

import DocumentsPage from '../index';

const renderPage = (url = '/admin/dashboard/farm/33/documents') =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>} onError={() => {}}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/admin/dashboard/farm/:farmId/documents" element={<DocumentsPage />} />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('filing a document against one record', () => {
  it('offers the chosen production records and sends the record with the upload', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockImplementation((id: string, opts: { skip?: boolean }) => ({
      data:
        opts?.skip || !id
          ? undefined
          : {
              events: [
                {
                  id: 801,
                  event_type: 2,
                  type: 'PE',
                  name: 'Entrust SC, codling moth',
                  date: '2026-05-15T08:00:00Z'
                }
              ]
            }
    }));
    const { container } = renderPage();
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })] }
    });

    const production = await screen.findByLabelText(enUS['documents.filing.field.production']);
    expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).toBeNull();
    fireEvent.change(production, { target: { value: '5' } });

    await waitFor(() =>
      expect(
        screen.queryByLabelText(enUS['documents.filing.field.record']),
        'no record picker once a production is chosen'
      ).not.toBeNull()
    );
    const record = screen.getByLabelText(enUS['documents.filing.field.record']);
    const option = screen.getByRole('option', { name: /Entrust SC, codling moth/ });
    expect(option.textContent).toContain('May 15, 2026');
    fireEvent.change(record, { target: { value: '2:801' } });

    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      companyId: '17',
      farmId: '33',
      history: 5,
      eventType: 2,
      eventId: 801
    });
  });

  it('sends no record when none is chosen', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockReturnValue({ data: undefined });
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['%PDF'], 'receipt.pdf', { type: 'application/pdf' })] }
    });
    fireEvent.click(await screen.findByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).not.toHaveProperty('eventId');
  });
});

describe('a file on a spray or amendment record is its receipt only when said so (back #207)', () => {
  const sprayRecord = (id: string, opts: { skip?: boolean }) => ({
    data:
      opts?.skip || !id
        ? undefined
        : {
            events: [
              {
                id: 801,
                event_type: 2,
                type: 'PE',
                name: 'Entrust SC',
                date: '2026-05-15T08:00:00Z'
              }
            ]
          }
  });
  const stageFile = (container: HTMLElement) =>
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })] }
    });

  it('asks what the file is, sends no receipt kind for another file, and the receipt kind when chosen', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockImplementation(sprayRecord);
    const { container } = renderPage();
    stageFile(container);
    fireEvent.change(await screen.findByLabelText(enUS['documents.filing.field.production']), {
      target: { value: '5' }
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).not.toBeNull()
    );
    // No record yet: nothing to be a receipt of.
    expect(screen.queryByLabelText(enUS['documents.filing.field.fileKind'])).toBeNull();
    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.record']), {
      target: { value: '2:801' }
    });
    const kind = screen.getByLabelText(
      enUS['documents.filing.field.fileKind']
    ) as HTMLSelectElement;
    // Never a receipt by default from the shelf: a lab report filed here must not read as one.
    expect(kind.value).toBe('attachment');
    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).not.toHaveProperty('sourceKind');

    upload.mockClear();
    stageFile(container);
    fireEvent.change(await screen.findByLabelText(enUS['documents.filing.field.production']), {
      target: { value: '5' }
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).not.toBeNull()
    );
    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.record']), {
      target: { value: '2:801' }
    });
    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.fileKind']), {
      target: { value: 'receipt' }
    });
    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      eventType: 2,
      eventId: 801,
      sourceKind: 'receipt'
    });
  });

  it("arriving from the trace's missing-receipt gap, the file is filed as the receipt", async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockImplementation(sprayRecord);
    const { container } = renderPage(
      '/admin/dashboard/farm/33/documents?production=5&record=2:801&kind=receipt'
    );
    stageFile(container);
    const kind = (await screen.findByLabelText(
      enUS['documents.filing.field.fileKind']
    )) as HTMLSelectElement;
    expect(kind.value).toBe('receipt');
    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      history: 5,
      eventType: 2,
      eventId: 801,
      sourceKind: 'receipt'
    });
  });
});

describe('a seed purchase record takes a receipt; a harvest does not (2026-10-24)', () => {
  // `type` on these rows is the i18n key the server sends; `production_type` is the code.
  const seasonRecords = (id: string, opts: { skip?: boolean }) => ({
    data:
      opts?.skip || !id
        ? undefined
        : {
            events: [
              {
                id: 901,
                event_type: 1,
                type: 'event.production.planting',
                production_type: 'PL',
                name: 'Draper, Fall Creek',
                date: '2026-04-02T08:00:00Z'
              },
              {
                id: 902,
                event_type: 1,
                type: 'event.production.harvesting',
                production_type: 'HA',
                name: 'First pick',
                date: '2026-07-20T08:00:00Z'
              }
            ]
          }
  });
  const stageFile = (container: HTMLElement) =>
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })] }
    });

  it('asks what the file is on a planting, with the seed-tag warning, and never on a harvest', async () => {
    docs = [];
    upload.mockClear();
    historyQuery.mockImplementation(seasonRecords);
    const { container } = renderPage();
    stageFile(container);
    fireEvent.change(await screen.findByLabelText(enUS['documents.filing.field.production']), {
      target: { value: '5' }
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).not.toBeNull()
    );
    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.record']), {
      target: { value: '1:902' }
    });
    expect(screen.queryByLabelText(enUS['documents.filing.field.fileKind'])).toBeNull();

    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.record']), {
      target: { value: '1:901' }
    });
    fireEvent.change(screen.getByLabelText(enUS['documents.filing.field.fileKind']), {
      target: { value: 'receipt' }
    });
    expect(
      screen.getByText(new RegExp(enUS['documents.filing.field.fileKindSeedHelp']))
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      eventType: 1,
      eventId: 901,
      sourceKind: 'receipt'
    });
  });

  it("files the trace's seed receipt as a receipt even before the season's records load", async () => {
    docs = [];
    upload.mockClear();
    // The history query is still pending: no records, so no subtype to read.
    historyQuery.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderPage(
      '/admin/dashboard/farm/33/documents?production=5&record=1:901&kind=receipt'
    );
    stageFile(container);
    const kind = (await screen.findByLabelText(
      enUS['documents.filing.field.fileKind']
    )) as HTMLSelectElement;
    expect(kind.value).toBe('receipt');
    fireEvent.click(screen.getByRole('button', { name: enUS['documents.filing.confirm'] }));
    await waitFor(() => expect(upload).toHaveBeenCalled());
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      history: 5,
      eventType: 1,
      eventId: 901,
      sourceKind: 'receipt'
    });
  });
});

describe('same-day records can be told apart in the picker (Astra AC-12, 2026-10-26)', () => {
  // Two unnamed input applications on one day, as the server sends them: `type` is the i18n
  // key, `chemical_type` / `production_type` the code, and no `name` (nulls are dropped).
  const sameDay = (id: string, opts: { skip?: boolean }) => ({
    data:
      opts?.skip || !id
        ? undefined
        : {
            events: [
              {
                id: 811,
                event_type: 2,
                type: 'event.chemical.pesticide',
                chemical_type: 'PE',
                commercial_name: 'Entrust SC',
                date: '2026-10-18T07:15:00Z'
              },
              {
                id: 812,
                event_type: 2,
                type: 'event.chemical.fungicide',
                chemical_type: 'FU',
                commercial_name: 'Kocide 3000',
                date: '2026-10-18T15:40:00Z'
              },
              {
                id: 813,
                event_type: 1,
                type: 'event.production.harvesting',
                production_type: 'HA',
                date: '2026-10-18T09:05:00Z'
              }
            ]
          }
  });

  it('labels each record with its time, activity and product', async () => {
    docs = [];
    historyQuery.mockImplementation(sameDay);
    const { container } = renderPage();
    fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, {
      target: { files: [new File(['%PDF'], 'invoice.pdf', { type: 'application/pdf' })] }
    });
    fireEvent.change(await screen.findByLabelText(enUS['documents.filing.field.production']), {
      target: { value: '5' }
    });
    await waitFor(() =>
      expect(screen.queryByLabelText(enUS['documents.filing.field.record'])).not.toBeNull()
    );
    const picker = screen.getByLabelText(
      enUS['documents.filing.field.record']
    ) as HTMLSelectElement;
    const label = (value: string) =>
      [...picker.options].find((o) => o.value === value)?.textContent ?? '';
    const time = (iso: string) =>
      new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      });

    const spray = label('2:811');
    const copper = label('2:812');
    expect(spray).not.toBe(copper);
    expect(spray).toContain('Entrust SC');
    expect(spray).toContain(time('2026-10-18T07:15:00Z'));
    expect(copper).toContain('Kocide 3000');
    expect(copper).toContain(time('2026-10-18T15:40:00Z'));
    expect(spray).toContain(enUS['activities.verb.input_application']);

    // The subtype comes from the code, not from the i18n key in `type`.
    const harvest = label('1:813');
    expect(harvest).toContain(enUS['activities.verb.harvest']);
    expect(harvest).not.toContain(enUS['activities.verb.field_work']);
  });
});

describe('who an upload came from', () => {
  it('names the uploader and never claims farmer authorship', () => {
    historyQuery.mockReturnValue({ data: undefined });
    docs = [
      {
        id: 9,
        public_id: 'x',
        folder: 'uploads',
        folder_display: 'Uploads',
        source: 'upload',
        source_display: 'Farmer upload',
        title: 'Spray log scan',
        content_type: 'application/pdf',
        size_bytes: 2048,
        linked_section: '',
        parcel: null,
        history: null,
        tags: [],
        is_deletable: true,
        created_by_name: 'Pilot Operator',
        created_at: '2026-10-15T10:00:00Z'
      }
    ];
    renderPage();
    expect(screen.queryAllByText('Uploaded by Pilot Operator').length).toBeGreaterThan(0);
    expect(screen.queryByText('Farmer upload')).toBeNull();
  });
});
