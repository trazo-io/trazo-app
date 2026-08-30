/**
 * A farm with NO Organic System Plan must not be shown a spinner.
 *
 * THE DEFECT
 * ----------
 * `ProfileFarm`'s § 205.272 split-operation card is read-only by design and sends the
 * farmer to the one editor that owns the fact: `navigate('.../osp/module/g6_0_production')`.
 * It has no idea whether the farm has started an OSP at all.
 *
 * With no plan, `selectWorkingOsp` returns undefined, so `ospId` is undefined, so
 * `useGetOSPModuleQuery` is SKIPPED. A skipped RTK Query reports `isLoading: false` and no
 * data — and the wizard's guard was `if (isLoading || !definition) return <PageLoading/>`.
 * False || true. The page returned the loader on every render, forever: the farmer clicked
 * "Answer in your plan" and got a spinner with no plan, no error and no way back.
 *
 * WHY THE TEST IS SHAPED THIS WAY
 * -------------------------------
 * Asserting "no spinner" alone would pass on a blank page. The claim that matters is that
 * the page OFFERS the missing prerequisite and keeps the destination — the same lesson
 * `ospModuleWizardReadOnly.test.tsx` records for the locked plan: a surface that explains a
 * state without providing its action is the bug, not the fix. So this checks the start
 * affordance is present, that it calls the create mutation, and that the module renders in
 * place once a plan exists rather than the farmer being bounced to the index.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const createOSP = vi.fn();
const navigate = vi.fn();

/** Mutable so one suite can walk the farm from "no plan" to "plan exists". */
let ospList: Array<{ id: string; version_number: number; status: string }> = [];
let ospsLoading = false;
let ospsFetching = false;

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 7 } } })
}));

vi.mock('react-router-dom', () => ({
  // The exact deep link ProfileFarm builds for the § 205.272 card.
  useParams: () => ({ farmId: '3', moduleKey: 'g6_0_production' }),
  useNavigate: () => navigate,
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

const DEFINITION = {
  key: 'g6_0_production',
  code: 'G6.0',
  title: { en: 'Split Operation' },
  nop_cites: ['§ 205.272'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'production',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'p1',
      title: { en: 'Split operation' },
      education: [],
      visible_when: [],
      questions: [
        {
          key: 'q_split',
          kind: 'textarea',
          label: { en: 'Describe how organic and non-organic are kept separate' },
          coaching: null,
          options: [],
          required: false,
          visible_when: [],
          nop_cite: null,
          prefill: null,
          parcel_field: null,
          embed: null,
          placeholder: null,
          max_length: null
        }
      ]
    }
  ]
};

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({
    data: ospsLoading ? undefined : ospList,
    isLoading: ospsLoading,
    isFetching: ospsFetching
  }),
  useGetOSPQuery: () => ({ data: undefined }),
  // Mirrors the real `skip: ospId == null` contract: with no plan there is no module to
  // fetch, and RTK Query reports a SKIPPED query as `isLoading: false` with no data. That
  // combination is the whole defect.
  useGetOSPModuleQuery: () =>
    ospList.length
      ? {
          data: {
            definition: DEFINITION,
            answers: {},
            response: { not_applicable: false },
            suggestions: {}
          },
          isLoading: false
        }
      : { data: undefined, isLoading: false },
  useSaveOSPModuleMutation: () => [vi.fn(), { isLoading: false }],
  useCreateOSPMutation: () => [createOSP, { isLoading: false }],
  useNewOSPVersionMutation: () => [vi.fn(), { isLoading: false }]
}));

const { default: OSPModuleWizard } = await import('../OSPModuleWizard');

const renderWizard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPModuleWizard />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPModuleWizard — deep-linked into a farm with no OSP', () => {
  beforeEach(() => {
    ospList = [];
    ospsLoading = false;
    ospsFetching = false;
    createOSP.mockReset();
    createOSP.mockReturnValue({ unwrap: () => Promise.resolve({ id: '11', version_number: 1 }) });
    navigate.mockReset();
  });

  it('does not sit on the page loader', () => {
    renderWizard();
    // `StandardPageLoading` is a Chakra `CircularProgress`, i.e. role="progressbar". The two
    // loading cases below assert this same selector MATCHES, so a null here is a real
    // absence rather than a selector that never matched anything.
    expect(screen.queryAllByRole('progressbar')).toHaveLength(0);
  });

  it('offers the missing prerequisite instead of a dead end', async () => {
    renderWizard();
    expect(screen.getByText('Start your Organic System Plan')).toBeInTheDocument();
    const start = screen.getByRole('button', { name: 'Start my OSP' });
    await userEvent.click(start);
    await waitFor(() => expect(createOSP).toHaveBeenCalledTimes(1));
    expect(createOSP).toHaveBeenCalledWith({ companyId: '7', farmId: '3', data: {} });
  });

  it('does not silently redirect the farmer off the module they asked for', () => {
    renderWizard();
    // A redirect to the OSP index would "work" and lose the destination — the farmer came
    // here from the § 205.272 card to answer G6.0, not to browse the plan.
    expect(navigate).not.toHaveBeenCalled();
  });

  it('still shows the loader while the plan list is genuinely in flight', () => {
    ospsLoading = true;
    renderWizard();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
    expect(screen.queryByText('Start your Organic System Plan')).toBeNull();
  });

  it('does not flash the start card while the list refetches after create', () => {
    // The window between `createOSP` resolving and the invalidated list arriving: the cache
    // still holds the OLD empty array. Showing the start card again there reads as "nothing
    // happened" and invites a second click that creates a second plan.
    ospsFetching = true;
    renderWizard();
    expect(screen.queryByRole('button', { name: 'Start my OSP' })).toBeNull();
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('renders the module itself once a plan exists — the mirror', () => {
    // Without this, withholding the wizard unconditionally would also pass every test above.
    ospList = [{ id: '11', version_number: 1, status: 'draft' }];
    renderWizard();
    expect(screen.queryByText('Start your Organic System Plan')).toBeNull();
    expect(screen.getByText(/Split Operation/)).toBeInTheDocument();
    expect(
      screen.getByText('Describe how organic and non-organic are kept separate')
    ).toBeInTheDocument();
  });
});
