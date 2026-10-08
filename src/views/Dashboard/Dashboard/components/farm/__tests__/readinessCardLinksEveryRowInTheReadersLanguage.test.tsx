/**
 * The farm-home readiness card, read on the Spanish dashboard.
 *
 * Oscar, 2026-10-08, on the card: "did you add the links here that we told above? and also
 * ... there are some issues with translations". Two gaps on main: the operation row for logged
 * products missing from the materials list had no link, only a green sentence that read like
 * one; and the "Full detail in ..." hint printed the audit export's English section name inside
 * a Spanish sentence. The export is an English document, so the Spanish line quotes the English
 * heading the reader will find and gives its name in Spanish. Red on the old card.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';

vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetCertifierReadinessQuery: () => ({
    data: {
      establishment_id: 2,
      production: {
        id: 23,
        name: 'Liberty 2026',
        finish_date: null,
        is_finished: false,
        parcel_id: 12
      },
      findings: [
        {
          label: 'Input traceability (§ 205.103)',
          row_key: 'input_traceability',
          status: 'FAIL',
          detail: '3/5 inputs have supplier on file',
          section_hint: 'Input Material Application Records section'
        },
        {
          label: 'Documentation depth',
          row_key: 'documentation_depth',
          status: 'REVIEW',
          detail: 'few photos',
          section_hint: 'Event logs + Photo Evidence sections'
        },
        {
          label: 'Something new (§ 205.999)',
          row_key: 'something_new',
          status: 'REVIEW',
          detail: 'no name for this one',
          section_hint: 'Somewhere section'
        }
      ],
      outstanding_count: 3,
      checked_count: 16
    },
    isLoading: false,
    isUninitialized: false,
    isError: false
  })
}));

vi.mock('store/api/certifierLinkApi', () => ({
  useGetOperationReadinessQuery: () => ({
    data: {
      applicable: true,
      blockers: [],
      warnings: [
        {
          key: 'unmatched_materials',
          code: 'unmatched_materials.unlisted',
          params: { count: 2, products: ['Rex Lime Sulfur', 'Serenade Opti'], overflow: 0 },
          status: 'warning',
          title: '2 logged products are not on your materials list',
          detail: '',
          fix: ''
        }
      ],
      checked_items: []
    },
    isLoading: false,
    isUninitialized: false
  })
}));

const { default: CertifierReadinessCard } = await import('../CertifierReadinessCard');

function renderCard(locale: string, messages: Record<string, string>) {
  return render(
    <MemoryRouter>
      <ChakraProvider>
        <IntlProvider locale={locale} messages={messages}>
          <CertifierReadinessCard companyId={1} farmId={2} />
        </IntlProvider>
      </ChakraProvider>
    </MemoryRouter>
  );
}

describe('readiness card links every row, in the reader language', () => {
  it('links the logged-products row to the plan identity panel', () => {
    renderCard('es-419', es419 as Record<string, string>);
    const link = screen.queryByTestId('readiness-operation-link-unmatched_materials');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/osp/module/materials_application#logged-names'
    );
    expect(link!.textContent).toContain('Resolver aquí');
  });

  it('names the audit export section in Spanish and quotes its English heading', () => {
    const { container } = renderCard('es-419', es419 as Record<string, string>);
    const text = container.textContent || '';
    expect(text).toContain(
      'Detalle completo en la sección «Input Material Application Records» (Registros de aplicación de insumos) de tu exportación de auditoría'
    );
    expect(text).toContain(
      'Detalle completo en las secciones «Event logs + Photo Evidence» (Registros de actividades y Evidencia fotográfica) de tu exportación de auditoría'
    );
    expect(text).not.toContain('en Input Material Application Records section');
    // A row the catalogue does not know yet still says where to look.
    expect(text).toContain('Somewhere section');
  });

  it('keeps the English line as it was', () => {
    const { container } = renderCard('en-US', enUS as Record<string, string>);
    expect(container.textContent).toContain(
      'Full detail in the Input Material Application Records section of your audit export'
    );
  });
});
