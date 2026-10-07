/**
 * The drift banner names the listing the detector found and links to where the grower
 * confirms it (recordkeeping review F-01, 2026-10-07).
 *
 * On the Calapooia specimen every chemical event was "unresolved" because the record logs
 * the jug name ("Serenade Opti") and the plan lists the OMRI name. The detector stored that
 * candidate in `reason_params.possibleMatches`; the row printed "did not match any product on
 * your OSP's approved-inputs list or in the reference catalogs" and dropped it, and the
 * banner told the grower to notify the certifier. Red on the old code on an assertion.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../i18n/lang/en-US.json';
import esES from '../../../i18n/lang/es-419.json';
import DriftFindingsBanner from '../DriftFindingsBanner';

const finding = (possibleMatches: string[]) => ({
  id: 71,
  date: '2026-03-01T08:00:00Z',
  drift_warning: {
    detected_at: '2026-10-06T23:16:42Z',
    osp_id: 6,
    osp_version: 3,
    input_label: 'Serenade Opti',
    reason: `'Serenade Opti' is not confirmed against the plan's inputs list.`,
    reason_code: 'unresolved',
    reason_params: { input: 'Serenade Opti', possibleMatches },
    provisional: false,
    resolved_via: 'unresolved',
    resolved_id: null,
    resolved_name: 'Serenade Opti',
    cfr_reference: '7 CFR 205.400(f)(2)',
    omri_search_url: 'https://www.omri.org/omri-search?query=Serenade+Opti'
  }
});

const wrap = (node: React.ReactNode, locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={locale === 'en-US' ? enUS : esES}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/2/parcel/10/production/21']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/:farmId/parcel/:parcelId/production/:productionId"
              element={node}
            />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('DriftFindingsBanner names the candidate', () => {
  it('prints the closest listing and says it is not confirmed', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding(['Bayer Serenade Opti A Wettable Powder Biofungicide'])]}
      />
    );
    fireEvent.click(screen.getByText('Show details'));
    expect(
      screen.getByText(/Closest listing: Bayer Serenade Opti A Wettable Powder Biofungicide/)
    ).toBeTruthy();
    expect(screen.getByText(/Not confirmed as the same product/)).toBeTruthy();
    expect(screen.queryByText(/did not match any product/)).toBeNull();
  });

  it('says nothing matched when the detector found no candidate', () => {
    wrap(<DriftFindingsBanner events={[finding([])]} />);
    fireEvent.click(screen.getByText('Show details'));
    expect(screen.getByText(/matched nothing in OMRI, WSDA or the National List/)).toBeTruthy();
    expect(screen.queryByText(/Closest listing/)).toBeNull();
  });

  it('links to the identity panel of the materials module for this farm', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding(['Bayer Serenade Opti A Wettable Powder Biofungicide'])]}
      />
    );
    fireEvent.click(screen.getByText('Show details'));
    const link = screen.getByTestId('drift-confirm-identities-link');
    expect(link.getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/osp/module/materials_application#logged-names'
    );
  });

  it('no longer orders the grower to notify the certifier about a naming difference', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding(['Bayer Serenade Opti A Wettable Powder Biofungicide'])]}
      />
    );
    expect(screen.queryByText(/you must immediately notify your certifier/)).toBeNull();
    expect(screen.getByText(/not confirmed against your active OSP/)).toBeTruthy();
  });

  it('says the same in Spanish', () => {
    wrap(
      <DriftFindingsBanner
        events={[finding(['Bayer Serenade Opti A Wettable Powder Biofungicide'])]}
      />,
      'es-419'
    );
    fireEvent.click(screen.getByText('Ver detalles'));
    expect(screen.getByText(/Listado más cercano: Bayer Serenade Opti/)).toBeTruthy();
    expect(screen.getByTestId('drift-confirm-identities-link').textContent).toContain(
      'Confirmar nombres en el plan'
    );
  });
});
