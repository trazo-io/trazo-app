/**
 * The OSP page must not offer a document the server will refuse.
 *
 * WHY THIS EXISTS
 * ---------------
 * Found 2026-09-07 on a Starter farm (Cascade Ridge, company 131). "Download packet" was a bare
 * <a href> onto `/api/companies/131/establishments/168/osps/68/packet/`, rendered for every plan.
 * `subscriptions/gating.py` refuses it on Starter, so the click LEFT THE APP and landed the
 * grower on Django REST Framework's browsable 403 page — "HTTP 403 Forbidden", the raw JSON
 * detail, and a list of API links. The same held for each module card's PDF icon and for the
 * parcel-application PDF, all of them plain hrefs onto gated routes.
 *
 * `ComplianceExportsGuard` had existed since 2026-08-15 for exactly this and the OSP page never
 * read it. The gate has to be a state of the page, before the click — enforcement alone means the
 * app offers something it already knows it will refuse.
 *
 * The flag read here is `subscription.effective_limits.compliance_exports`, the same value the
 * backend gate answers with (`subscriptions/serializers.py::_get_effective_limits`), so a lapsed
 * Compliance farm hides the buttons instead of showing ones that 403.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

let complianceExports = false;

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: {
        currentCompany: {
          id: 7,
          establishments: [{ id: 3, parcels: [] }],
          subscription: {
            status: 'active',
            effective_limits: { compliance_exports: complianceExports }
          }
        }
      }
    })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3' }),
  useNavigate: () => vi.fn()
}));

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [] })
}));

const CERTIFYING_AGENTS = [
  {
    slug: 'wsda',
    name: 'Washington State Department of Agriculture',
    short_name: 'WSDA',
    own_numbering: true
  }
];

const DEFINITIONS = {
  modules: [
    {
      key: 'seeds',
      code: 'G3.0',
      title: { en: 'Seeds & Planting Stock' },
      nop_cites: ['§ 205.204'],
      repeat_per_parcel: false
    }
  ]
};

// The certifying-agent card and the first-run picker read the agent list. `react-redux` is
// stubbed, so the real RTK hook has no store; an empty list renders the plain picker.
vi.mock('store/api/certificationApi', () => ({
  useGetCertifyingAgentsQuery: () => ({ data: CERTIFYING_AGENTS, isLoading: false, isError: false })
}));

vi.mock('store/api/ospApi', () => ({
  // The packet control's changed-sections preview: not comparable, so the plain button renders.
  useGetPacketScopeQuery: () => ({ data: undefined, currentData: undefined }),
  useGetOSPsQuery: () => ({
    data: [{ id: '11', version_number: 2, status: 'draft' }],
    isLoading: false
  }),
  useGetOSPModuleDefinitionsQuery: () => ({ data: DEFINITIONS, isLoading: false }),
  useGetOSPModulesQuery: () => ({
    data: {
      modules: [
        { key: 'seeds', status: 'completed', progress: { answered: 4, required: 4, missing: [] } }
      ]
    },
    isLoading: false
  }),
  useCreateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useNewOSPVersionMutation: () => [vi.fn(), { isLoading: false }],
  useGetOSPReviewQuery: () => ({
    data: {
      answers_as_of: null,
      reference_date: '2026-09-07',
      is_clean: true,
      findings: [],
      stale_modules: [],
      parcels_not_named: []
    },
    isLoading: false,
    isError: false
  })
}));

const { default: OSPModuleListPage } = await import('../OSPModuleListPage');

const renderPage = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPModuleListPage />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSP module list — the Starter/Compliance export boundary', () => {
  beforeEach(() => {
    complianceExports = false;
  });

  it('offers no packet and no module PDF on a plan that cannot produce them', () => {
    renderPage();
    // Asserting the label is gone is not enough on its own — the whole failure was a LINK, so
    // assert no anchor points at the gated route either.
    expect(screen.queryByText(/Download packet/)).toBeNull();
    expect(screen.queryByLabelText(/^Download the PDF of/)).toBeNull();
    const hrefs = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs.some((h) => h?.includes('/packet/'))).toBe(false);
    expect(hrefs.some((h) => h?.includes('/module-pdf'))).toBe(false);
  });

  it('says WHY, and where the answer changes, instead of going quiet', () => {
    renderPage();
    expect(
      screen.getByText(enUS['osp.packet.complianceOnly' as keyof typeof enUS] as string)
    ).toBeInTheDocument();
    expect(screen.getByText('See Compliance')).toBeInTheDocument();
  });

  it('hands both exports back the moment the plan carries them', () => {
    complianceExports = true;
    renderPage();
    // v2 is the only version here, so the control renders as the single named button.
    expect(screen.getByText('Download packet (v2)')).toBeInTheDocument();
    // Named for its module since the rows (2026-11-07): nineteen identical "Download PDF"
    // labels told a screen reader nothing about which file.
    expect(screen.getAllByLabelText(/^Download the PDF of/).length).toBeGreaterThan(0);
    expect(
      screen.queryByText(enUS['osp.packet.complianceOnly' as keyof typeof enUS] as string)
    ).toBeNull();
  });
});
