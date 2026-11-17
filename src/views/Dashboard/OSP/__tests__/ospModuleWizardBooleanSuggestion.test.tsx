/**
 * A yes/no suggestion reads as Yes or No, never "true" (2026-11-17).
 *
 * Boolean questions carry no options, so the suggestion box printed the raw value: "Suggested from
 * your records: true" under G8.0's sodium nitrate question and G4.0's restricted materials questions.
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
  useParams: () => ({ farmId: '3', moduleKey: 'g8_0_record_keeping' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

const DEFINITION = {
  key: 'g8_0_record_keeping',
  code: 'G8.0',
  title: { en: 'Record Keeping' },
  nop_cites: ['§ 205.103'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'recordkeeping_description',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'c_import_export',
      title: { en: 'C. Import & export' },
      education: [],
      visible_when: [],
      questions: [
        {
          key: 'sodium_nitrate_used',
          kind: 'boolean',
          label: { en: 'Do you use sodium nitrate (Chilean nitrate) to produce organic crops?' },
          coaching: null,
          options: [],
          required: false,
          visible_when: [],
          nop_cite: '§ 205.602(h)',
          prefill: { source: 'sodium_nitrate_evidence' },
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
    data: [{ id: '11', version_number: 2, status: 'draft' }],
    isLoading: false,
    isFetching: false
  }),
  useCreateOSPMutation: () => [vi.fn(), { isLoading: false }],
  useGetOSPQuery: () => ({ data: undefined }),
  useGetOSPModuleQuery: () => ({
    data: {
      definition: DEFINITION,
      answers: {},
      response: { not_applicable: false },
      suggestions: {
        sodium_nitrate_used: {
          value: true,
          basis: '1 record of sodium nitrate on 2026-11-17: Sodium nitrate.',
          count: 1
        }
      }
    },
    isLoading: false
  }),
  useSaveOSPModuleMutation: () => [vi.fn(), { isLoading: false }],
  useNewOSPVersionMutation: () => [vi.fn(), { isLoading: false }]
}));

const { default: OSPModuleWizard } = await import('../OSPModuleWizard');

describe('OSPModuleWizard: a yes/no suggestion', () => {
  it('names the suggested answer as Yes, not true', () => {
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPModuleWizard />
        </IntlProvider>
      </ChakraProvider>
    );
    const title = screen.getByText('Suggested from your records:');
    const line = title.parentElement as HTMLElement;
    expect(line).toHaveTextContent('Suggested from your records: Yes');
    expect(line).not.toHaveTextContent('true');
  });
});
