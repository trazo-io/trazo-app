/**
 * The wizard says, under a "not yet known" answer, what the certifier packet does with it (backend
 * `Option.pending`). The answer is kept as given, but it does not answer the agent's question, so the
 * packet marks it for review. Until 2026-11-21 only the packet said so: the grower who chose "Not yet
 * confirmed with the district" saw an ordinary answer here.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import esLA from '../../../../i18n/lang/es-419.json';
import type { AnswerValue, ModuleQuestion } from 'config/osp/types';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 7 } } })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3', moduleKey: 'g4_2_natural_resources' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

const NOT_YET = 'Not yet confirmed with the district';

const radio = (key: string, label: string): ModuleQuestion => ({
  key,
  kind: 'radio',
  label: { en: label, es: label },
  coaching: null,
  options: [
    {
      value: 'no_confirmed',
      label: { en: 'No, confirmed', es: 'No, confirmado' },
      exclusive: false
    },
    { value: 'unknown', label: { en: NOT_YET, es: 'Todavía no' }, exclusive: false, pending: true }
  ],
  required: false,
  visible_when: [],
  nop_cite: null,
  prefill: null,
  parcel_field: null,
  embed: null,
  placeholder: null,
  max_length: null
});

const DEFINITION = {
  key: 'g4_2_natural_resources',
  code: 'G4.2',
  title: { en: 'Natural Resources' },
  nop_cites: ['§ 205.200'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'practices_procedures',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'd_water',
      title: { en: 'Water' },
      education: [],
      visible_when: [],
      questions: [
        radio('irrigation_district_additives', 'Does the district add anything to the water?'),
        radio('second_district_question', 'Does the second district add anything?'),
        // A retired question is read-only in the wizard, so its note must not say "change it".
        { ...radio('old_district_question', 'Old district question?'), retired: true }
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
    data: {
      definition: DEFINITION,
      answers: {
        irrigation_district_additives: { value: 'unknown' },
        second_district_question: { value: 'no_confirmed' },
        old_district_question: { value: 'unknown' }
      },
      response: { not_applicable: false },
      suggestions: {}
    },
    isLoading: false
  }),
  useSaveOSPModuleMutation: () => [vi.fn(), { isLoading: false }],
  useNewOSPVersionMutation: () => [vi.fn(), { isLoading: false }]
}));

const { default: OSPModuleWizard } = await import('../OSPModuleWizard');
const { QuestionField: ParcelQuestionField } = await import('../../Parcel/ParcelApplicationWizard');

describe('OSPModuleWizard: a not-yet-known answer', () => {
  it('says under the answer that the packet marks it for review', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPModuleWizard />
        </IntlProvider>
      </ChakraProvider>
    );
    const box = screen.getByTestId('osp-q-irrigation_district_additives');
    expect(within(box).getByLabelText(NOT_YET)).toBeChecked();
    expect(screen.queryByTestId('osp-q-pending-irrigation_district_additives')).not.toBeNull();
    expect(screen.queryByTestId('osp-q-pending-irrigation_district_additives')).toHaveTextContent(
      'it does not answer the question yet: the certifier packet marks it for review'
    );
  });

  it('says nothing under a real answer', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPModuleWizard />
        </IntlProvider>
      </ChakraProvider>
    );
    const box = screen.getByTestId('osp-q-second_district_question');
    expect(within(box).getByLabelText('No, confirmed')).toBeChecked();
    expect(screen.queryByTestId('osp-q-pending-second_district_question')).toBeNull();
  });
});

describe('OSPModuleWizard: a not-yet-known answer the reader cannot change', () => {
  it('keeps the note and drops the instruction to change it', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPModuleWizard />
        </IntlProvider>
      </ChakraProvider>
    );
    const note = screen.queryByTestId('osp-q-pending-old_district_question');
    expect(note).not.toBeNull();
    expect(note).toHaveTextContent('the certifier packet marks it for review');
    expect(note?.textContent).not.toMatch(/Change it here/);
    expect(screen.queryByTestId('osp-q-pending-irrigation_district_additives')).toHaveTextContent(
      'Change it here once you know'
    );
  });
});

describe('Parcel Application: a not-yet-known answer', () => {
  const renderParcel = (value: AnswerValue, canWrite = true) =>
    render(
      <ChakraProvider>
        <IntlProvider locale="es-419" messages={esLA as Record<string, string>}>
          <ParcelQuestionField
            question={radio('parcel_probe', 'Probe')}
            value={value}
            locale="es-419"
            canWrite={canWrite}
            onChange={vi.fn()}
          />
        </IntlProvider>
      </ChakraProvider>
    );

  it('carries the same note, in Spanish too', () => {
    renderParcel('unknown');
    expect(screen.queryByTestId('parcel-q-pending-parcel_probe')).not.toBeNull();
    expect(screen.queryByTestId('parcel-q-pending-parcel_probe')).toHaveTextContent(
      'todavía no responde la pregunta: el paquete para el certificador la marca para revisión'
    );
  });

  it('does not tell a reader who cannot change the answer to change it', () => {
    renderParcel('unknown', false);
    const note = screen.queryByTestId('parcel-q-pending-parcel_probe');
    expect(note).not.toBeNull();
    expect(note).toHaveTextContent('todavía no responde la pregunta');
    expect(note?.textContent).not.toMatch(/Cámbiala/);
  });

  it('says nothing under a real answer', () => {
    renderParcel('no_confirmed');
    expect(screen.getByLabelText('No, confirmado')).toBeChecked();
    expect(screen.queryByTestId('parcel-q-pending-parcel_probe')).toBeNull();
  });
});
