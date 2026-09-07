/**
 * The module LIST page on a locked plan, rendered for real.
 *
 * Three defects lived here at once and none of them had a test:
 *
 *   1. Every card's button read "Review / edit" on a plan the server refuses to write —
 *      the label keyed off the module's own progress and never looked at the plan.
 *   2. The notice said "start a new version from the narrative view" and the page had no
 *      such button anywhere. An instruction standing where an affordance belongs.
 *   3. The notice interpolated the RAW api status, so it read "This plan is active" while
 *      the wizard said "approved and active" — and in Spanish it printed the English word
 *      `active` inside a Spanish sentence.
 *
 * All three are things the page SAYS and OFFERS, which is why none of them showed up in
 * the suites that only assert what it forbids.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const createOSP = vi.fn();
const newVersion = vi.fn();
let ospStatus = 'active';

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

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({
    useGetOSPQuery: () => ({ data: undefined }),
    data: [{ id: '11', version_number: 2, status: ospStatus }],
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
  useCreateOSPMutation: () => [createOSP, { isLoading: false }],
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

describe('OSPModuleListPage — a locked plan', () => {
  beforeEach(() => {
    createOSP.mockReset();
    newVersion.mockReset();
    newVersion.mockReturnValue({ unwrap: () => Promise.resolve({ id: '12', version_number: 3 }) });
    ospStatus = 'active';
  });

  it('does not offer to edit what the server will refuse', () => {
    renderPage();
    expect(screen.queryByText('Review / edit')).toBeNull();
    expect(screen.getByText('View module')).toBeInTheDocument();
  });

  it('OFFERS the action its own notice names', () => {
    renderPage();
    expect(screen.getByText('Start a new version')).toBeInTheDocument();
  });

  it('confirms before forking, and forks the plan the page is showing', async () => {
    renderPage();
    // Asserting the button EXISTS is not the same as asserting it does anything: a dropped
    // onClick passes that check forever. This drives the whole flow instead.
    fireEvent.click(screen.getByText('Start a new version'));

    // The dialog earns its extra tap by teaching what a version is and naming the duty.
    expect(await screen.findByText(/205\.400\(f\)\(2\)/)).toBeInTheDocument();
    // Status-neutral on purpose. This dialog also opens on a SUBMITTED plan, which the
    // certifier has not approved — the copy used to assert they had.
    expect(screen.getByText(/Version 2 is kept exactly as it is/)).toBeInTheDocument();
    expect(screen.queryByText(/certifier approved it/)).toBeNull();

    // It must NOT predict the new number. The server takes max(version)+1 across the whole
    // establishment, which is not always this plan's number plus one — the narrative view
    // can have an older version selected while a newer draft already exists.
    expect(screen.queryByText(/version 3/i)).toBeNull();

    fireEvent.click(screen.getByText('Start new version'));
    await waitFor(() =>
      expect(newVersion).toHaveBeenCalledWith({ companyId: '7', farmId: '3', ospId: '11' })
    );
  });

  it('humanises the status instead of printing the api enum', () => {
    renderPage();
    expect(screen.getByText(/approved and active/)).toBeInTheDocument();
    // The raw enum reached the screen for months. `{status}` must never be the wire value.
    expect(screen.queryByText(/This plan is active,/)).toBeNull();
  });

  it('keeps the lock visible after the notice scrolls away', () => {
    renderPage();
    expect(screen.getByText('View only')).toBeInTheDocument();
  });

  it('leaves a draft alone', () => {
    ospStatus = 'draft';
    renderPage();
    expect(screen.getByText('Review / edit')).toBeInTheDocument();
    expect(screen.queryByText('View module')).toBeNull();
    expect(screen.queryByText('Start a new version')).toBeNull();
    expect(screen.queryByText('View only')).toBeNull();
  });
});
