/**
 * PURExportModal — what the farmer sees is labelled in THEIR locale and points at the event.
 *
 * Each assertion pins a defect from the 2026-09-01 audit that was invisible in the source
 * and visible only on screen:
 *   - month names came from an English array (es-419 showed "April");
 *   - gaps rendered the server's English "Missing required: …" sentence under any locale;
 *   - two rows with box 17 blank had no date at all and were indistinguishable;
 *   - the copy said "open the event" while the row carried nothing to open it with.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

// Relative: `theme` is not one of the aliases vitest.config.ts declares.
import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import esMessages from '../../../i18n/lang/es-419.json';
import PURExportModal from '../PURExportModal';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

const INCOMPLETE_ROW = {
  event_id: 42,
  event_type: 2,
  parcel_id: 5,
  event_date: '2026-04-03T06:00:00Z',
  product_and_manufacturer: 'Kocide 3000-O / Certis USA',
  application_start: '',
  application_method: 'Ground (air-blast)',
  missing: ['operator_id', 'site_id'],
  flags: [{ code: 'county_unrecognized', county: 'Maricopa' }],
  // The CSV's English prose — must never be what the preview renders.
  notes: 'Missing required: 3. Operator ID/Permit No., 8. Site ID No.'
};

const COMPLETE_ROW = {
  ...INCOMPLETE_ROW,
  event_id: 43,
  event_date: '2026-04-18T06:00:00Z',
  product_and_manufacturer: 'Entrust SC / Corteva',
  missing: [],
  flags: [],
  notes: ''
};

const summaryWith = (rows: Array<typeof INCOMPLETE_ROW>) => ({
  establishment_id: 160,
  establishment_name: 'Blue Oak Orchards',
  month: 4,
  year: 2026,
  form: 'DPR-PML-017C',
  filing_deadline: '2026-05-10',
  application_count: rows.length,
  complete_count: rows.filter((r) => r.missing.length === 0).length,
  incomplete_count: rows.filter((r) => r.missing.length > 0).length,
  rows
});

const renderModal = (locale: 'en-US' | 'es-419', rows = [INCOMPLETE_ROW, COMPLETE_ROW]) => {
  const summary = summaryWith(rows);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => summary }))
  );
  const onClose = vi.fn();
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? enMessages : esMessages}>
        <MemoryRouter>
          <PURExportModal
            isOpen
            onClose={onClose}
            establishmentId={160}
            establishmentName="Blue Oak Orchards"
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );
  return { onClose };
};

afterEach(() => {
  vi.unstubAllGlobals();
  navigateMock.mockReset();
});

describe('PURExportModal', () => {
  it('names the months in the farmer’s locale, not from an English array', async () => {
    renderModal('es-419');
    await screen.findByText('Kocide 3000-O / Certis USA');
    expect(screen.getByRole('option', { name: 'abril' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'April' })).toBeNull();
    // And the selects have accessible names — the old bare <Text> labels bound to nothing.
    expect(screen.getByLabelText('Mes')).toBeTruthy();
    expect(screen.getByLabelText('Año')).toBeTruthy();
  });

  it('labels gaps as DPR boxes in the locale and never renders the server sentence', async () => {
    renderModal('es-419');
    await screen.findByText(/3\. ID de operador\/N\.º de permiso/);
    expect(screen.getByText(/8\. N\.º de sitio/)).toBeTruthy();
    expect(screen.queryByText(/Missing required/)).toBeNull();
    // Coded flag → localized sentence with its parameter.
    expect(screen.getByText(/“Maricopa” no es un condado de California reconocido/)).toBeTruthy();
    expect(screen.getByText('Todas las casillas obligatorias completas')).toBeTruthy();
  });

  it('dates every row from the event itself, so rows with box 17 blank stay distinguishable', async () => {
    renderModal('en-US');
    // Wall-clock-as-UTC storage: formatted in UTC so the 6 a.m. spray is not the 2nd.
    expect(await screen.findByText(/Apr 3, 2026/)).toBeTruthy();
    expect(screen.getByText(/Apr 18, 2026/)).toBeTruthy();
    expect(screen.getByText(/May 10, 2026/)).toBeTruthy();
  });

  it('opens the event the row is about and closes the dialog', async () => {
    const { onClose } = renderModal('en-US');
    const [openFirst] = await screen.findAllByRole('button', { name: /Open event/ });
    fireEvent.click(openFirst);
    expect(navigateMock).toHaveBeenCalledWith(
      '/admin/dashboard/farm/160/parcel/5/event/42/change?event_type=2'
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the empty state and keeps the download disabled when there is nothing to report', async () => {
    renderModal('en-US', []);
    await screen.findByText('No reportable applications this month');
    const download = screen.getByRole('button', { name: /Download CSV/ }) as HTMLButtonElement;
    expect(download.disabled).toBe(true);
  });
});
