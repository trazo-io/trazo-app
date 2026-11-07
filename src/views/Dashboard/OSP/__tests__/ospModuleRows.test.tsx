/**
 * The OSP overview lists modules as rows in two groups (2026-11-07).
 *
 * It was a three-column grid of nineteen cards, each with a badge, three lines of § citations
 * and two buttons, and the module to work on next sat fifth, mid-grid. Pinned: the modules
 * still to answer come first, in § order, and the first of them carries the page's only filled
 * button; the answered ones follow; the citations live on the module page, not here.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const createOSP = vi.fn();
const newVersion = vi.fn();
let ospStatus = 'draft';
let noPlan = false;

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: { currentCompany: { id: 7, establishments: [{ id: 3, parcels: [] }] } }
    })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3' }),
  useNavigate: () => vi.fn()
}));

// The packet control reads the § 205.406 filings to say whether the annual update travels
// with the version it exports. `react-redux` is stubbed above, so the real RTK hook has no
// store to subscribe to — this page's own assertions are about module locking, not the packet.
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
      key: 'monitoring',
      code: 'G2.0',
      title: { en: 'Monitoring' },
      nop_cites: ['§ 205.201(a)(3)'],
      repeat_per_parcel: false
    },
    {
      key: 'seeds',
      code: 'G3.0',
      title: { en: 'Seeds & Planting Stock' },
      nop_cites: ['§ 205.204'],
      repeat_per_parcel: false
    },
    {
      key: 'rotation',
      code: 'G4.0',
      title: { en: 'Rotation & Soil Management' },
      nop_cites: ['§ 205.203'],
      repeat_per_parcel: false
    },
    {
      key: 'records',
      code: 'G8.0',
      title: { en: 'Record Keeping' },
      nop_cites: ['§ 205.103'],
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
  useGetOSPsQuery: () => ({
    useGetOSPQuery: () => ({ data: undefined }),
    data: noPlan ? [] : [{ id: '11', version_number: 2, status: ospStatus }],
    isLoading: false
  }),
  useGetOSPModuleDefinitionsQuery: () => ({ data: DEFINITIONS, isLoading: false }),
  useGetOSPModulesQuery: () => ({
    data: {
      modules: [
        {
          key: 'monitoring',
          status: 'completed',
          progress: { answered: 6, required: 6, missing: [] }
        },
        { key: 'seeds', status: 'completed', progress: { answered: 4, required: 4, missing: [] } },
        {
          key: 'rotation',
          status: 'in_progress',
          progress: { answered: 9, required: 12, missing: [] }
        },
        {
          key: 'records',
          status: 'in_progress',
          progress: { answered: 1, required: 6, missing: [] }
        }
      ]
    },
    isLoading: false
  }),
  useCreateOSPMutation: () => [createOSP, { isLoading: false }],
  useUpdateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useNewOSPVersionMutation: () => [newVersion, { isLoading: false }],
  // The page renders the plan-review panel (2026-09-07): the review belongs where the modules
  // are answered and the packet is downloaded, not only on the demoted narrative view. Clean
  // here — this suite is about the LOCK, and a review with findings would be noise in it.
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

describe('OSP overview rows', () => {
  it('lists what is still to answer first, in section order, then the answered modules', () => {
    renderPage();
    const order = screen
      .getAllByTestId(/^osp-module-[a-z]+$/)
      .map((el) => el.getAttribute('data-testid'));
    expect(order).toEqual([
      'osp-module-rotation',
      'osp-module-records',
      'osp-module-monitoring',
      'osp-module-seeds'
    ]);
    expect(screen.getByText('To answer · 2')).toBeInTheDocument();
    expect(screen.getByText('Every required answer given · 2')).toBeInTheDocument();
  });

  it('the next module is named and is the only filled button', () => {
    renderPage();
    const next = screen.getByTestId('osp-module-rotation');
    expect(within(next).getByText('Continue here')).toBeInTheDocument();
    expect(screen.getAllByText('Continue here')).toHaveLength(1);
  });

  it('shows the answer count, not the citations', () => {
    renderPage();
    expect(screen.getByText('9 of 12 required answers')).toBeInTheDocument();
    expect(screen.queryByText(/§ 205\.203/)).toBeNull();
    expect(screen.queryByText(/§ 205\.204/)).toBeNull();
  });
});
