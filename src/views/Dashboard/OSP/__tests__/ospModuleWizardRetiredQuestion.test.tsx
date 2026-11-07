/**
 * A retired question in the wizard (backend `Question.retired`, 2026.11.22; review of app #319).
 *
 * It is shown only because it holds an answer. It reads as given and cannot be changed: clearing its last
 * choice would hide it and drop the answer. It is never asked anew, so it has no asterisk, and a note says
 * newer questions replaced it. A retired question with no answer is not shown at all.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 7 } } })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3', moduleKey: 'g5_0_pest' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

const question = (
  key: string,
  label: string,
  options: Array<{ value: string; label: { en: string } }>,
  extra: Record<string, unknown> = {}
) => ({
  key,
  kind: 'checkbox_group',
  label: { en: label },
  coaching: null,
  options,
  required: false,
  visible_when: [],
  nop_cite: null,
  prefill: null,
  parcel_field: null,
  embed: null,
  placeholder: null,
  max_length: null,
  ...extra
});

const DEFINITION = {
  key: 'g5_0_pest',
  code: 'G5.0',
  title: { en: 'Pest Management' },
  nop_cites: ['§ 205.206'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'practices_procedures',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'a_prevention',
      title: { en: 'Prevention' },
      education: [],
      visible_when: [],
      questions: [
        question('practices_weeds', 'Which practices does your operation use against weeds?', [
          { value: 'mowing_grazing', label: { en: 'Mowing or grazing' } }
        ]),
        question(
          'prevention_practices',
          'Which prevention and cultural practices does your operation use?',
          [{ value: 'crop_rotation', label: { en: 'Crop rotation' } }],
          { required: true, retired: true }
        ),
        question(
          'weed_management_practices',
          'Which methods does your operation use to manage weeds?',
          [{ value: 'mowing', label: { en: 'Mowing' } }],
          { required: true, retired: true }
        )
      ]
    }
  ]
};

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({
    data: [{ id: '11', version_number: 2, status: 'draft' }],
    isLoading: false,
    isFetching: false
  }),
  useCreateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useGetOSPQuery: () => ({ data: undefined }),
  useGetOSPModuleQuery: () => ({
    // Only the first retired list holds an answer.
    data: {
      definition: DEFINITION,
      answers: { prevention_practices: { value: ['crop_rotation'] } },
      response: { not_applicable: false },
      suggestions: {}
    },
    isLoading: false
  }),
  useSaveOSPModuleMutation: () => [vi.fn(), { isLoading: false }],
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

describe('OSPModuleWizard: a retired question', () => {
  it('shows an answered retired question as given, unchangeable, unasterisked, with its note', () => {
    renderWizard();
    const box = screen.getByTestId('osp-q-prevention_practices');
    expect(within(box).getByLabelText('Crop rotation')).toBeDisabled();
    expect(within(box).getByLabelText('Crop rotation')).toBeChecked();
    expect(within(box).queryByText(/\*$/)).toBeNull();
    expect(screen.getByTestId('osp-q-retired-prevention_practices')).toHaveTextContent(
      'Earlier answer, kept as given.'
    );
  });

  it('does not show a retired question that holds no answer', () => {
    renderWizard();
    expect(screen.queryByTestId('osp-q-weed_management_practices')).toBeNull();
  });

  it('leaves the questions that replaced it open to answer', () => {
    renderWizard();
    expect(screen.getByLabelText('Mowing or grazing')).not.toBeDisabled();
    expect(screen.queryByTestId('osp-q-retired-practices_weeds')).toBeNull();
  });
});
