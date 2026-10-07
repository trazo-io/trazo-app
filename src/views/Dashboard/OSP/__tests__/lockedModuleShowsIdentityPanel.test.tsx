/**
 * An active plan's materials module still offers the identity panel.
 *
 * Review of app #90: the drift banner's "Confirm names on the plan" link opens the materials
 * module of the plan the findings were measured against, which is the ACTIVE plan. That plan
 * is locked, the locked document lists answers only, and the identity panel lived inside an
 * `info` question's embed that the document drops. The link landed on a page with nothing to
 * act on. Identity decisions are made against the active plan, so the panel renders under the
 * locked document. Red on the old code.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 7 } } })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3', moduleKey: 'materials_application' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

const question = (key: string, kind: string, label: string, embed: string | null = null) => ({
  key,
  kind,
  label: { en: label },
  coaching: null,
  options: [],
  required: false,
  visible_when: [],
  nop_cite: null,
  prefill: null,
  parcel_field: null,
  embed,
  placeholder: null,
  max_length: null
});

const DEFINITION = {
  key: 'materials_application',
  code: 'M',
  title: { en: 'Materials Application' },
  nop_cites: ['§ 205.601'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'inputs_list',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'p1',
      title: { en: 'Your materials list' },
      education: [],
      visible_when: [],
      questions: [
        question('q_list', 'info', 'Input materials on this plan', 'approved_inputs'),
        question('q_all_entered', 'yes_no', 'Every input material I use is entered in this list')
      ]
    }
  ]
};

const ANSWERS = { q_all_entered: { value: 'yes' } };

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({
    data: [{ id: '11', version_number: 3, status: 'active' }],
    isLoading: false,
    isFetching: false
  }),
  useCreateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useGetOSPQuery: () => ({ data: undefined }),
  useGetOSPModuleQuery: () => ({
    data: {
      definition: DEFINITION,
      answers: ANSWERS,
      response: { not_applicable: false },
      suggestions: {}
    },
    isLoading: false
  }),
  useSaveOSPModuleMutation: () => [vi.fn(), { isLoading: false }],
  useNewOSPVersionMutation: () => [vi.fn(), { isLoading: false }],
  useGetMaterialIdentitiesQuery: () => ({
    data: {
      identities: [
        {
          source: 'chemical',
          name_key: 'serenade opti',
          name: 'Serenade Opti',
          uses: 12,
          first_use: '2025-04-28',
          last_use: '2026-05-18',
          status: 'unreviewed',
          decision: null,
          history: [],
          events: [],
          suggestions: []
        }
      ],
      targets: []
    }
  }),
  useDecideMaterialIdentityMutation: () => [vi.fn(), { isLoading: false }],
  useWithdrawMaterialIdentityMutation: () => [vi.fn(), { isLoading: false }]
}));

const { default: OSPModuleWizard } = await import('../OSPModuleWizard');

describe('a locked materials module keeps the identity panel', () => {
  it('renders "Logged names not on the plan" with the #logged-names anchor on an active plan', async () => {
    const { container } = render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPModuleWizard />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(await screen.findByText('Logged names not on the plan')).toBeTruthy();
    expect(container.querySelector('#logged-names')).not.toBeNull();
  });
});
