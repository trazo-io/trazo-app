/**
 * The plan's access rule and the record findings are two things, shown apart.
 *
 * Run 8b, finding 8b-01 (Astra, 2026-10-12, a new Starter organic account in es-419): the farm
 * card showed three document rows under a badge reading "Bloquea el envío a la certificadora",
 * and the OFPP row said SOE 2024 "prohíbe la certificación". On Starter the first thing that
 * refuses a review link is the PLAN (`require_compliance_exports`), not the documents, and the
 * documents are not a certification decision Trazo can make.
 *
 * Now: Starter gets an access notice from the plan, separate from the findings; the findings say
 * what is not on file in Trazo and never mention plans; a farm whose plan includes review links
 * gets the badge "Trazo requires these records before creating a review link", Trazo's own gate
 * stated as Trazo's.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../../i18n/lang/en-US.json';
import es419 from '../../../../../../i18n/lang/es-419.json';

type Subscription = Record<string, unknown> | null;

const STARTER: Subscription = {
  status: 'active',
  plan: { slug: 'starter', features: { compliance_exports: false } },
  effective_limits: { compliance_exports: false }
};
const COMPLIANCE: Subscription = {
  status: 'active',
  plan: { slug: 'compliance-yearly', features: { compliance_exports: true } },
  effective_limits: { compliance_exports: true }
};
const PILOT: Subscription = {
  status: 'active',
  plan: { slug: 'pilot', features: { compliance_exports: true, is_pilot: true } },
  effective_limits: { compliance_exports: true }
};

let subscription: Subscription = STARTER;
let parcels: Array<{ id: number }> = [];

// The three blockers a new organic farm gets from the server (pinned on the backend by
// test_certifier_access_links: exactly ofpp, osp, records).
const NEW_FARM_BLOCKERS = [
  {
    key: 'ofpp',
    code: 'ofpp.missing',
    params: {},
    status: 'blocker',
    title: '',
    detail: '',
    fix: ''
  },
  { key: 'osp', code: 'osp.none', params: {}, status: 'blocker', title: '', detail: '', fix: '' },
  {
    key: 'records',
    code: 'records.none',
    params: {},
    status: 'blocker',
    title: '',
    detail: '',
    fix: ''
  }
];
let blockers = NEW_FARM_BLOCKERS;

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: {
        currentCompany: { id: 1, establishments: [{ id: 2, parcels }], subscription }
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
    data: { applicable: true, blockers, warnings: [], checked_items: [] },
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

const PLAN_WORDS = /compliance|starter|pricing|upgrade|subscription|suscripci/i;

beforeEach(() => {
  subscription = STARTER;
  parcels = [];
  blockers = NEW_FARM_BLOCKERS;
});

describe('Starter: an access notice from the plan, and the findings on their own', () => {
  it('shows the access notice and all three findings, with no plan wording in the findings', () => {
    renderCard();
    const notice = screen.queryByTestId('readiness-access-notice');
    expect(notice, 'Starter shows the access notice').not.toBeNull();
    expect(notice!.textContent).toContain('Certifier review links are part of Compliance.');
    expect(within(notice!).getByTestId('readiness-access-notice-link').getAttribute('href')).toBe(
      '/admin/dashboard/pricing'
    );

    const findings = screen.getByTestId('readiness-operation-findings');
    const text = findings.textContent || '';
    expect(text).toContain('No Organic Fraud Prevention Plan on file in Trazo');
    expect(text).toContain('No Organic System Plan on file in Trazo');
    expect(text).toContain('No production records on file in Trazo');
    expect(text).not.toMatch(PLAN_WORDS);
    // The share-gate badge is the plan-allowed farm's; on Starter the notice says why first.
    expect(text).not.toContain('Trazo requires these records before creating a review link');
    expect(text).not.toContain('Blocks certifier sharing');
  });

  it('says the same in Spanish, with the notice apart from the findings', () => {
    renderCard('es-419', es419 as Record<string, string>);
    expect(screen.getByTestId('readiness-access-notice').textContent).toContain(
      'Los enlaces de revisión para tu certificadora son parte de Compliance.'
    );
    const text = screen.getByTestId('readiness-operation-findings').textContent || '';
    expect(text).toContain('No hay un Plan de Prevención de Fraude Orgánico archivado en Trazo');
    expect(text).not.toMatch(PLAN_WORDS);
    expect(text).not.toContain('prohíbe la certificación');
  });

  it('gives the OFPP row two next actions and a person to ask', () => {
    renderCard();
    expect(screen.getByTestId('readiness-operation-link-ofpp').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/profile'
    );
    expect(screen.getByTestId('readiness-operation-link-ofpp-module').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/osp/module/g2_0_fraud_prevention'
    );
    expect(screen.getByTestId('readiness-operation-link-ofpp-help').getAttribute('href')).toBe(
      'mailto:oscar@trazo.io'
    );
  });

  it('sends the records row to where a season is added, never back to this page', () => {
    renderCard();
    const noParcel = screen.getByTestId('readiness-operation-link-records');
    expect(noParcel.getAttribute('href')).toBe('/admin/dashboard/farm/2/parcel/add');
  });

  it('sends the records row to start a season on the first parcel when one exists', () => {
    parcels = [{ id: 12 }];
    renderCard();
    const link = screen.getByTestId('readiness-operation-link-records');
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/2/parcel/12/production/add');
    expect(link.getAttribute('href')).not.toBe('/admin/dashboard/farm/2');
  });
});

describe('a plan that includes review links: Trazo states its own gate, no access notice', () => {
  it.each([
    ['Compliance', COMPLIANCE],
    ['pilot', PILOT]
  ])('%s farm without an OFPP', (_label, sub) => {
    subscription = sub;
    renderCard();
    expect(screen.queryByTestId('readiness-access-notice')).toBeNull();
    const findings = screen.getByTestId('readiness-operation-findings');
    expect(findings.textContent).toContain(
      'Trazo requires these records before creating a review link'
    );
    expect(findings.textContent).toContain('No Organic Fraud Prevention Plan on file in Trazo');
  });

  it('says the gate in Spanish', () => {
    subscription = PILOT;
    renderCard('es-419', es419 as Record<string, string>);
    expect(screen.getByTestId('readiness-operation-findings').textContent).toContain(
      'Trazo requiere estos registros antes de crear un enlace de revisión'
    );
  });

  it('drops the OFPP row once the server stops reporting it (G2.0 completed or a plan uploaded)', () => {
    subscription = PILOT;
    blockers = NEW_FARM_BLOCKERS.filter((b) => b.key !== 'ofpp');
    renderCard();
    expect(screen.queryByTestId('readiness-operation-link-ofpp')).toBeNull();
    expect(screen.getByTestId('readiness-operation-findings').textContent).not.toContain(
      'Fraud Prevention Plan'
    );
  });
});
