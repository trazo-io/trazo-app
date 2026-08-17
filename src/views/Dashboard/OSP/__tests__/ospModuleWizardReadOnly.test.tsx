/**
 * A non-draft OSP is a document, not a form — proved by RENDERING the real wizard.
 *
 * This suite used to assert that every control was DISABLED on a locked plan, which was
 * the right guarantee for the wrong shape. The controls are now absent: a locked module
 * renders <LockedModuleDocument/>, so there is no checkbox to disable, no step to advance,
 * and no primary button greyed out at the end of a form the server would refuse anyway.
 * Absent is a strictly stronger claim than disabled, so the assertions moved rather than
 * relaxed — the original defect (a farmer typing into a plan the API will not write) is
 * still guarded, one layer further out.
 *
 * The new assertion is the one the old suite never made: the page has to OFFER the way
 * out. Every locked surface used to end its explanation with "start a new version" and
 * then provide no button anywhere on the page — an instruction standing where an
 * affordance belonged. A test that only checks what the page forbids will never catch
 * that, so this one checks what it offers.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';

const saveModule = vi.fn();
const newVersion = vi.fn();
let ospStatus = 'active';

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) => fn({ company: { currentCompany: { id: 7 } } })
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ farmId: '3', moduleKey: 'pest_management' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#test">{children}</a>
}));

/** A question with every field the served definition carries — `visible_when` included. */
const question = (
  key: string,
  kind: string,
  label: string,
  options: Array<{ value: string; label: { en: string } }> = []
) => ({
  key,
  kind,
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
  max_length: null
});

const DEFINITION = {
  key: 'pest_management',
  code: 'F',
  title: { en: 'Pest Management' },
  nop_cites: ['§ 205.206'],
  education: [],
  allows_not_applicable: false,
  na_label: null,
  default_section_key: 'pest',
  repeat_per_parcel: false,
  pages: [
    {
      key: 'p1',
      title: { en: 'Practices' },
      education: [],
      visible_when: [],
      questions: [
        question('q_methods', 'checkbox_group', 'Which methods do you use?', [
          { value: 'training', label: { en: 'Staff training' } },
          { value: 'checkins', label: { en: 'Scheduled check-ins with the crew' } }
        ]),
        question('q_notes', 'textarea', 'Describe your approach'),
        question('q_lead', 'select', 'Who leads this?', [
          { value: 'owner', label: { en: 'Owner' } }
        ]),
        question('q_since', 'date', 'In place since')
      ]
    }
  ]
};

/** What the farmer actually filed — the locked page has to show these back. */
const ANSWERS = {
  q_methods: { value: ['training'] },
  q_notes: { value: 'We scout weekly and log what we find.' },
  q_lead: { value: 'owner' }
};

vi.mock('store/api/ospApi', () => ({
  useGetOSPsQuery: () => ({ data: [{ id: '11', version_number: 2, status: ospStatus }] }),
  useGetOSPModuleQuery: () => ({
    data: {
      definition: DEFINITION,
      answers: ANSWERS,
      response: { not_applicable: false },
      // A suggestion is offered for an unanswered question — on a locked plan there is no
      // control to accept it into, and no "Use suggestion" button either.
      suggestions: { q_since: { value: '2024-01-01', basis: 'From your pest events' } }
    },
    isLoading: false
  }),
  useSaveOSPModuleMutation: () => [saveModule, { isLoading: false }],
  useNewOSPVersionMutation: () => [newVersion, { isLoading: false }]
}));

// Imported after the mocks so the module under test binds to them.
const { default: OSPModuleWizard } = await import('../OSPModuleWizard');

const renderWizard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPModuleWizard />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPModuleWizard — a non-draft plan reads as a document', () => {
  beforeEach(() => {
    saveModule.mockReset();
    saveModule.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    newVersion.mockReset();
    newVersion.mockReturnValue({ unwrap: () => Promise.resolve({ id: '12', version_number: 3 }) });
    ospStatus = 'active';
  });

  it('renders no form controls at all', () => {
    renderWizard();
    // Stronger than "disabled": there is nothing on the page to type into or tick.
    expect(screen.queryByLabelText('Staff training')).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(document.querySelector('input[type="date"]')).toBeNull();
  });

  it('shows the filed answers as text, in the words the farmer chose', () => {
    renderWizard();
    expect(screen.getByText('Practices')).toBeInTheDocument();
    // The option LABEL, not its stored value — a locked module is for reading.
    expect(screen.getByText('Staff training')).toBeInTheDocument();
    expect(screen.getByText('We scout weekly and log what we find.')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    // An unanswered question is stated, not silently dropped: on a filed record the gap
    // is information the operator and the inspector both need.
    expect(screen.getByText('In place since')).toBeInTheDocument();
  });

  it('offers no wizard furniture — the work is finished, not paused', () => {
    renderWizard();
    expect(screen.queryByText('Save & continue')).toBeNull();
    expect(screen.queryByText('Continue')).toBeNull();
    expect(screen.queryByText('Complete module')).toBeNull();
    expect(screen.queryByText(/Step 1 of/)).toBeNull();
    expect(screen.queryByText('Use suggestion')).toBeNull();
  });

  it('names the actual status', () => {
    renderWizard();
    // This read "This plan has been submitted" for EVERY non-draft status.
    expect(screen.getByText(/approved and active/)).toBeInTheDocument();
    expect(screen.queryByText(/has been submitted/)).toBeNull();
  });

  it('OFFERS the way forward it tells the farmer about', () => {
    renderWizard();
    // The regression this file exists to prevent from coming back: the sentence said
    // "start a new version" while the only button that does it lived on another page.
    // Twice on purpose — once in the notice, once at the foot of the document.
    expect(screen.getAllByText('Start a new version').length).toBeGreaterThanOrEqual(1);
  });

  it('leaves everything writable on a draft', () => {
    ospStatus = 'draft';
    renderWizard();
    expect(screen.getByLabelText('Staff training')).not.toBeDisabled();
    expect(screen.getByRole('textbox')).not.toHaveAttribute('readonly');
    expect(screen.getByText('Save & continue')).toBeInTheDocument();
    expect(screen.queryByText('Start a new version')).toBeNull();
  });
});
