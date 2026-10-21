/**
 * On a farm with no parcel, the readiness card names the parcel first.
 *
 * Reproduced 2026-10-19 on a virgin Starter organic account (signed up through the real form, a
 * farm, zero parcels), the state the first inbound grower left in. The card's first row was the
 * Organic Fraud Prevention Plan, whose link ("Upload a plan on the farm profile") is the first
 * action on the page, and uploading an OFPP is what that grower did. "Add a parcel first" was the
 * THIRD row, below the fold at 375px. Without a parcel there is no season, no template and no record,
 * so every other season-side step waits on it.
 *
 * A conventional farm (no NOP checks) showed only "Start a production to see what your certifier
 * will ask for", which cannot be done without a parcel, and offered nothing to tap.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';

let parcels: Array<{ id: number }> = [];
let applicable = true;

// The three blockers a new organic farm gets from the server, IN THE SERVER'S ORDER.
const NEW_FARM_BLOCKERS = ['ofpp', 'osp', 'records'].map((key) => ({
  key,
  code: { ofpp: 'ofpp.missing', osp: 'osp.none', records: 'records.none' }[key],
  params: {},
  status: 'blocker',
  title: '',
  detail: '',
  fix: ''
}));

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: {
        currentCompany: {
          id: 1,
          establishments: [{ id: 2, parcels }],
          subscription: {
            status: 'active',
            plan: { slug: 'starter', features: { compliance_exports: false } },
            effective_limits: { compliance_exports: false }
          }
        }
      }
    })
}));

vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetCertifierReadinessQuery: () => ({
    data: { establishment_id: 2, production: null, findings: [], checked_count: 0 },
    isLoading: false,
    isUninitialized: false,
    isError: false
  })
}));

vi.mock('store/api/certifierLinkApi', () => ({
  useGetOperationReadinessQuery: () => ({
    data: applicable
      ? { applicable: true, blockers: NEW_FARM_BLOCKERS, warnings: [], checked_items: [] }
      : { applicable: false, blockers: [], warnings: [], checked_items: [] },
    isLoading: false,
    isUninitialized: false
  })
}));

const { default: CertifierReadinessCard } = await import('../CertifierReadinessCard');

function renderCard(locale = 'en-US', messages: Record<string, string> = enUS) {
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

/** The item keys in the order the rows are PAINTED, read from each row's own link. */
function paintedRowOrder(): string[] {
  const findings = screen.getByTestId('readiness-operation-findings');
  const links = findings.querySelectorAll('[data-testid^="readiness-operation-link-"]');
  const keys = Array.from(links)
    .map((el) => el.getAttribute('data-testid')!.replace('readiness-operation-link-', ''))
    .filter((k) => ['ofpp', 'osp', 'records'].includes(k));
  // Proves the read found the rows; an empty list would make every order assertion vacuous.
  expect(keys.length, 'all three rows rendered a link').toBe(3);
  return keys;
}

beforeEach(() => {
  parcels = [];
  applicable = true;
});

describe('organic farm, no parcel: the parcel row comes first', () => {
  it('paints records before the OFPP and the OSP', () => {
    renderCard();
    expect(paintedRowOrder()).toEqual(['records', 'ofpp', 'osp']);
    expect(screen.getByTestId('readiness-operation-link-records').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/parcel/add'
    );
  });

  it('hides nothing: the count and every item stay', () => {
    renderCard();
    const text = screen.getByTestId('readiness-operation-findings').textContent || '';
    expect(text).toContain('No Organic Fraud Prevention Plan on file in Trazo');
    expect(text).toContain('No Organic System Plan on file in Trazo');
  });

  it('keeps the server order once the farm has a parcel', () => {
    // The parcel is the rung only while it is missing; after that, check order is the order.
    parcels = [{ id: 5 }];
    renderCard();
    expect(paintedRowOrder()).toEqual(['ofpp', 'osp', 'records']);
  });
});

describe('farm without NOP checks, no parcel: name the parcel, not a production', () => {
  it('says the farm has no parcel and links to adding one', () => {
    applicable = false;
    renderCard();
    expect(screen.getByText(enUS['certifierReadiness.noParcel'])).toBeTruthy();
    expect(screen.queryByText(enUS['certifierReadiness.noProduction'])).toBeNull();
    const link = screen.getByTestId('readiness-add-first-parcel');
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/2/parcel/add');
    expect(link.textContent).toContain(enUS['certifierReadiness.recordsAddParcel']);
  });

  it('says the same in Spanish', () => {
    applicable = false;
    renderCard('es-419', es419 as Record<string, string>);
    const link = screen.getByTestId('readiness-add-first-parcel');
    expect(link.textContent).toContain('Primero agrega una parcela');
    expect(screen.getByText(/se lleva en una parcela\. Esta finca/)).toBeTruthy();
  });

  it('keeps "start a production" once there is a parcel to start it on', () => {
    applicable = false;
    parcels = [{ id: 5 }];
    renderCard();
    expect(screen.getByText(enUS['certifierReadiness.noProduction'])).toBeTruthy();
    expect(screen.queryByTestId('readiness-add-first-parcel')).toBeNull();
  });
});
