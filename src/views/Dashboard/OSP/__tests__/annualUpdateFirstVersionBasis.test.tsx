/**
 * A grower's first year on Trazo: the certifier may hold a plan Trazo has never seen.
 *
 * WHY THIS EXISTS
 * ---------------
 * Overall review 2026-11 (OV-PK-C01 / W03 / O02, P1, every pilot grower). The card told a grower
 * whose v1 was the plan they re-entered in Trazo that "This filing continues OSP v1, the plan your
 * certifier holds", and nothing compared their changes with the plan the certifier actually
 * holds: the one filed before Trazo, on the certifier's own forms. Status cannot tell the cases
 * apart, so a filing that continues a first version that has left draft asks the grower, and the
 * server refuses to sign it unanswered. A draft first version was never sent, so the server
 * answers for it and the card only says what that means.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';
import esLA from 'i18n/lang/es-419.json';

let rows: Record<string, unknown>[] = [];
const createUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
const signUpdate = vi.fn(() => ({
  unwrap: () =>
    Promise.reject({
      status: 400,
      data: {
        error: 'Not signed. Plan v1 is the first plan version in Trazo. ...',
        detail: 'Not signed. Plan v1 is the first plan version in Trazo. ...',
        code: 'prior_plan_basis_required',
        action: 'sign',
        prior_osp_version: 1
      }
    })
}));
vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: rows }),
  useCreateOSPAnnualUpdateMutation: () => [createUpdate, { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useSignOSPAnnualUpdateMutation: () => [signUpdate, { isLoading: false }],
  useFileOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useCorrectOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useGetCompanyDetailsReviewQuery: () => ({ data: undefined, isLoading: false }),
  useConfirmCompanyDetailsMutation: () => [vi.fn(), { isLoading: false }],
  FILING_METHODS: ['agent_web_form', 'agent_portal', 'email', 'mail', 'in_person']
}));

const DEFINITIONS = {
  content_version: 'test',
  modules: [
    {
      key: 'g5_0_pest',
      code: 'G5.0',
      title: { en: 'Pest, Disease & Weed Management', es: 'Manejo de plagas' },
      repeat_per_parcel: false
    },
    {
      key: 'g9_0_facility_pest',
      code: 'G9.0',
      title: { en: 'Facility Pest Management', es: 'Plagas en instalaciones' },
      repeat_per_parcel: false
    }
  ]
};
const refetchDefinitions = vi.fn();
let definitions: Record<string, unknown> = {};
vi.mock('store/api/ospApi', () => ({
  useGetOSPModuleDefinitionsQuery: () => definitions
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

// jsdom has no scrollIntoView; a refused save scrolls to the first field it names.
Element.prototype.scrollIntoView = vi.fn();

const V1_ACTIVE = { id: 59, version_number: 1, status: 'active', previous_version: null } as any;
const V1_DRAFT = { id: 70, version_number: 1, status: 'draft', previous_version: null } as any;
const V3_ACTIVE = { id: 65, version_number: 3, status: 'active', previous_version: 64 } as any;
// A backend older than 2026-11-14 sends no `previous_version`: nothing is asked.
const V1_OLD_BACKEND = { id: 59, version_number: 1, status: 'active' } as any;

const renderCard = (
  planOnFile: unknown,
  locale = 'en-US',
  messages: Record<string, string> = enUS as Record<string, string>
) =>
  render(
    <ChakraProvider>
      <IntlProvider locale={locale} messages={messages}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={planOnFile as any}
          currentYear={2027}
        />
      </IntlProvider>
    </ChakraProvider>
  );

const save = () => {
  fireEvent.change(screen.getByLabelText(/Changes Summary|Summary of changes/i), {
    target: { value: 'Added a hedgerow along the north block.' }
  });
  fireEvent.click(screen.getByRole('button', { name: /File annual update|Save/i }));
};

beforeEach(() => {
  rows = [];
  definitions = {
    data: DEFINITIONS,
    isError: false,
    isFetching: false,
    refetch: refetchDefinitions
  };
  refetchDefinitions.mockClear();
  createUpdate.mockClear();
  signUpdate.mockClear();
});

describe('a filing that continues the first plan version in Trazo', () => {
  it('asks what the certifier holds instead of claiming it holds this version', () => {
    renderCard(V1_ACTIVE);
    expect(screen.getByText(/your first plan version in Trazo\./)).toBeInTheDocument();
    expect(
      screen.getByText('Did your certifier receive this plan from Trazo?')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /Yes, I sent them this version from Trazo/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('radio', { name: /No, they hold the plan I filed before Trazo/ })
    ).toBeInTheDocument();
    expect(screen.queryByText(/the plan your certifier holds\./)).toBeNull();
  });

  it('says Trazo has no copy and renames the unchanged list when the certifier holds the older plan', () => {
    renderCard(V1_ACTIVE);
    expect(screen.queryByTestId('annual-agent-file-hint')).toBeNull();
    fireEvent.click(
      screen.getByRole('radio', { name: /No, they hold the plan I filed before Trazo/ })
    );
    expect(screen.getByTestId('annual-agent-file-hint')).toHaveTextContent(
      'Trazo has no copy of the plan your certifier holds, so it cannot list what changed.'
    );
    expect(
      screen.getByText('Sections unchanged since the plan your certifier holds')
    ).toBeInTheDocument();
    expect(screen.queryByText('Sections unchanged since the prior OSP')).toBeNull();
  });

  it('sends the answer with the filing', () => {
    renderCard(V1_ACTIVE);
    fireEvent.click(
      screen.getByRole('radio', { name: /No, they hold the plan I filed before Trazo/ })
    );
    save();
    expect(createUpdate).toHaveBeenCalledTimes(1);
    expect(createUpdate.mock.calls[0]?.[0].data).toMatchObject({
      prior_osp: 59,
      prior_plan_basis: 'agent_file'
    });
  });

  it('asks in Spanish too', () => {
    renderCard(V1_ACTIVE, 'es-419', esLA as Record<string, string>);
    expect(screen.getByText('¿Tu certificador recibió este plan desde Trazo?')).toBeInTheDocument();
  });
});

describe('filings the question does not apply to', () => {
  it('a later version keeps the plan-on-file line and sends no answer', () => {
    renderCard(V3_ACTIVE);
    expect(
      screen.getByText(/This filing continues OSP v3, the plan your certifier holds\./)
    ).toBeInTheDocument();
    expect(screen.queryByText('Did your certifier receive this plan from Trazo?')).toBeNull();
    save();
    expect(createUpdate.mock.calls[0]?.[0].data).not.toHaveProperty('prior_plan_basis');
  });

  it('a draft first version is never asked, and claims nothing before the server answers', () => {
    // Review of app #389: an applicant's certifier holds no plan; only the server knows which it is.
    renderCard(V1_DRAFT);
    expect(screen.queryByText('Did your certifier receive this plan from Trazo?')).toBeNull();
    expect(screen.queryByTestId('annual-agent-file-hint')).toBeNull();
    expect(screen.queryByText('Sections unchanged since the plan your certifier holds')).toBeNull();
    save();
    expect(createUpdate.mock.calls[0]?.[0].data).not.toHaveProperty('prior_plan_basis');
  });

  it('a saved draft filing the server answered says Trazo has no copy of the plan on file', () => {
    rows = [
      {
        id: 3,
        prior_osp: 70,
        prior_osp_version: 1,
        reporting_year: 2027,
        revision_number: 1,
        changes_summary: 'Saved draft.',
        additions: [],
        deletions: [],
        signed_at: null,
        submitted_at: null,
        is_locked: false,
        prior_plan_basis: 'agent_file',
        basis_question_applies: false
      }
    ];
    renderCard(V1_DRAFT);
    expect(screen.queryByTestId('annual-agent-file-hint')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Edit', exact: true } as any));
    expect(screen.getByTestId('annual-agent-file-hint')).toBeInTheDocument();
    expect(
      screen.getByText('Sections unchanged since the plan your certifier holds')
    ).toBeInTheDocument();
  });

  it('a backend that sends no previous_version asks nothing', () => {
    renderCard(V1_OLD_BACKEND);
    expect(screen.queryByText('Did your certifier receive this plan from Trazo?')).toBeNull();
  });
});

describe('signing an unanswered filing', () => {
  it('says what to answer, in the reader language, not the server sentence', async () => {
    rows = [
      {
        id: 1,
        prior_osp: 59,
        prior_osp_version: 1,
        new_osp_version: null,
        reporting_year: 2027,
        revision_number: 1,
        changes_summary: 'Draft row.',
        additions: [],
        deletions: [],
        signed_at: null,
        submitted_at: null,
        is_locked: false,
        prior_plan_basis: '',
        basis_question_applies: true
      }
    ];
    renderCard(V1_ACTIVE);
    const draftRow = screen.getByText(/Draft row\./).closest('div[class]')!.parentElement!
      .parentElement!;
    fireEvent.click(within(draftRow).getByRole('button', { name: 'Sign' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign this update' }));
    expect(
      await screen.findByText(
        'Before signing, say whether your certifier received plan v1 from Trazo. Edit the update to answer.'
      )
    ).toBeInTheDocument();
    expect(signUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('stating what changed against the plan the certifier holds', () => {
  const answerNo = () =>
    fireEvent.click(
      screen.getByRole('radio', { name: /No, they hold the plan I filed before Trazo/ })
    );

  it('is asked only once the certifier holds the plan filed before Trazo', () => {
    renderCard(V1_ACTIVE);
    expect(screen.queryByTestId('annual-agent-file-statement')).toBeNull();
    answerNo();
    expect(screen.getByTestId('annual-agent-file-statement')).toBeInTheDocument();
    expect(
      screen.getByText('Which sections of your plan changed since the plan your certifier holds?')
    ).toBeInTheDocument();
  });

  it('sends the sections ticked, and nothing changed as not stated', () => {
    renderCard(V1_ACTIVE);
    answerNo();
    fireEvent.click(
      screen.getByRole('checkbox', { name: /G5\.0 Pest, Disease & Weed Management/ })
    );
    save();
    expect(createUpdate.mock.calls[0]?.[0].data).toMatchObject({
      prior_plan_basis: 'agent_file',
      agent_file_changed_modules: ['g5_0_pest'],
      agent_file_nothing_changed: null
    });
  });

  it('nothing changed clears the sections and is sent as true', () => {
    renderCard(V1_ACTIVE);
    answerNo();
    fireEvent.click(screen.getByRole('checkbox', { name: /G5\.0/ }));
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Nothing changed since the plan my certifier holds' })
    );
    expect(screen.getByRole('checkbox', { name: /G5\.0/ })).not.toBeChecked();
    save();
    expect(createUpdate.mock.calls[0]?.[0].data).toMatchObject({
      agent_file_changed_modules: [],
      agent_file_nothing_changed: true
    });
  });

  it('a plan the certifier received from Trazo clears any statement', () => {
    renderCard(V1_ACTIVE);
    answerNo();
    fireEvent.click(screen.getByRole('checkbox', { name: /G5\.0/ }));
    fireEvent.click(
      screen.getByRole('radio', { name: /Yes, I sent them this version from Trazo/ })
    );
    expect(screen.queryByTestId('annual-agent-file-statement')).toBeNull();
    save();
    expect(createUpdate.mock.calls[0]?.[0].data).toMatchObject({
      prior_plan_basis: 'trazo_version',
      agent_file_changed_modules: [],
      agent_file_nothing_changed: null
    });
  });

  it("shows the server's refusal under the list", async () => {
    createUpdate.mockImplementationOnce(() => ({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: {
            agent_file_changed_modules: [
              'These sections are stated changed, and the section of the plan each belongs to is also ticked unchanged.'
            ]
          }
        })
    }));
    renderCard(V1_ACTIVE);
    answerNo();
    fireEvent.click(screen.getByRole('checkbox', { name: /G5\.0/ }));
    save();
    expect(
      await screen.findByText(/stated changed, and the section of the plan each belongs to/)
    ).toBeInTheDocument();
  });

  it('the refusal goes once the section it names is unticked', async () => {
    createUpdate.mockImplementationOnce(() => ({
      unwrap: () =>
        Promise.reject({
          status: 400,
          data: {
            agent_file_changed_modules: [
              'These sections are stated changed, and the section of the plan each belongs to is also ticked unchanged.'
            ]
          }
        })
    }));
    renderCard(V1_ACTIVE);
    answerNo();
    fireEvent.click(screen.getByRole('checkbox', { name: /G5\.0/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Practices & procedures/ }));
    save();
    await screen.findByText(/stated changed, and the section of the plan each belongs to/);
    fireEvent.click(screen.getByRole('checkbox', { name: /Practices & procedures/ }));
    expect(
      screen.queryByText(/stated changed, and the section of the plan each belongs to/)
    ).toBeNull();
  });

  it('offers no control while the plan sections are loading or failed to load', () => {
    definitions = {
      data: undefined,
      isError: false,
      isFetching: true,
      refetch: refetchDefinitions
    };
    const { unmount } = renderCard(V1_ACTIVE);
    answerNo();
    expect(screen.getByTestId('annual-agent-file-statement')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /Nothing changed since/ })).toBeNull();
    unmount();

    definitions = {
      data: undefined,
      isError: true,
      isFetching: false,
      refetch: refetchDefinitions
    };
    renderCard(V1_ACTIVE);
    answerNo();
    expect(screen.queryByRole('checkbox', { name: /Nothing changed since/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /retry|try again/i }));
    expect(refetchDefinitions).toHaveBeenCalledTimes(1);
  });

  it("a saved draft whose answer is the server's says where to state what changed", () => {
    const draft = {
      id: 3,
      prior_osp: 70,
      prior_osp_version: 1,
      new_osp_version: null,
      reporting_year: 2027,
      revision_number: 1,
      changes_summary: 'Draft row.',
      additions: [],
      deletions: [],
      signed_at: null,
      submitted_at: null,
      is_locked: false,
      prior_plan_basis: 'agent_file',
      basis_question_applies: false,
      agent_file_changed_modules: [],
      agent_file_nothing_changed: null
    };
    rows = [draft];
    const { unmount } = renderCard(V1_DRAFT);
    expect(screen.getByTestId('annual-statement-cue')).toHaveTextContent(
      'Edit this update to state which sections changed since then'
    );
    unmount();

    rows = [{ ...draft, agent_file_changed_modules: ['g5_0_pest'] }];
    renderCard(V1_DRAFT);
    expect(screen.queryByTestId('annual-statement-cue')).toBeNull();
  });
});
