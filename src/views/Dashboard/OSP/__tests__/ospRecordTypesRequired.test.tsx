/**
 * Required record types on the § 11 panel (OSP alignment audit 2026-10, T17-F1).
 *
 * The records statement now covers every record the plan's own answers require, so the panel
 * says which ones are required and why, and offers a way to say a required record is NOT kept,
 * with a reason. Saying so is never a way out: the panel tells the operator the packet will list
 * it as missing, and the statement below still cannot be Yes.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../i18n/lang/en-US.json';

const markNotKept = vi.fn((_args: Record<string, unknown>) => ({
  unwrap: () => Promise.resolve({})
}));

vi.mock('react-redux', () => ({
  useSelector: (fn: (s: unknown) => unknown) =>
    fn({
      company: {
        currentCompany: {
          subscription: { status: 'active', effective_limits: { compliance_exports: true } }
        }
      }
    })
}));

const base = {
  group: 'What types of records do you maintain for organic crop production?',
  cfr_cite: '7 CFR 205.103(b)(2)',
  status: 'not_evidenced_in_trazo',
  count: 0,
  basis: '',
  external_by_design: false,
  free_text: false,
  custom_label: null,
  suggested: false,
  confirmed_at: null,
  confirmed_by: null,
  carried_from_version: null
};

const ROWS = [
  {
    ...base,
    key: 'input_material_application',
    label: 'Input/material application',
    confirmed: false,
    required: true,
    required_state: 'not_confirmed',
    required_because: 'the materials list says input materials are used'
  },
  {
    ...base,
    key: 'compost_production',
    label: 'Compost production records',
    confirmed: false,
    not_kept: true,
    not_kept_reason: 'no compost made here',
    required: true,
    required_state: 'not_kept',
    required_because: 'the compost section describes compost made on the operation'
  },
  { ...base, key: 'tillage', label: 'Tillage', confirmed: false }
];

vi.mock('store/api/ospApi', () => ({
  useGetOSPRecordTypesQuery: () => ({
    data: {
      summary: {
        total: 3,
        evidenced: 0,
        confirmed: 0,
        awaiting_confirmation: 0,
        external_by_design: 0,
        evidence_check_failed: 0
      },
      record_types: ROWS
    },
    isLoading: false,
    isError: false
  }),
  useConfirmOSPRecordTypesMutation: () => [vi.fn(), { isLoading: false }],
  useMarkOSPRecordTypeNotKeptMutation: () => [markNotKept, { isLoading: false }],
  useGetOSPAttachmentsQuery: () => ({ data: { workbooks: [] }, isLoading: false })
}));

const { default: OSPRecordTypesPanel } = await import('../OSPRecordTypesPanel');

const renderPanel = () =>
  render(
    <ChakraProvider>
      <MemoryRouter>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <OSPRecordTypesPanel
            companyId="7"
            farmId="3"
            osp={{ id: '11', status: 'draft', version_number: 1 } as never}
            onNavigateAway={() => Promise.resolve(true)}
          />
        </IntlProvider>
      </MemoryRouter>
    </ChakraProvider>
  );

describe('required record types', () => {
  it('says which records the plan requires and why', () => {
    renderPanel();
    expect(
      screen.getByText('Required by your plan: the materials list says input materials are used')
    ).toBeInTheDocument();
    expect(screen.queryAllByText(/Required by your plan/)).toHaveLength(2);
  });

  it('shows a not-kept statement as missing, not as an answer', () => {
    renderPanel();
    expect(
      screen.getByText(
        'You state this record is not kept: no compost made here. Your packet lists it as missing.'
      )
    ).toBeInTheDocument();
  });

  it('records "not kept" only with a reason, for a required unconfirmed row', async () => {
    markNotKept.mockClear();
    renderPanel();
    // Offered once: on the required, unconfirmed, not-yet-stated row only.
    const buttons = screen.getAllByRole('button', { name: "We don't keep this" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0]);
    const save = screen.getByRole('button', { name: 'Record as not kept' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Why this record is not kept'), {
      target: { value: 'inputs logged by the custom applicator' }
    });
    fireEvent.click(save);
    await waitFor(() => expect(markNotKept).toHaveBeenCalled());
    expect(markNotKept.mock.calls[0]?.[0]).toMatchObject({
      key: 'input_material_application',
      reason: 'inputs logged by the custom applicator'
    });
  });

  it('keeps the form open and the reason typed when the save fails', async () => {
    // Review of app #61: the save had no catch, so a refused request was an unhandled
    // rejection and the operator could not tell whether the statement was recorded.
    markNotKept.mockClear();
    markNotKept.mockReturnValueOnce({ unwrap: () => Promise.reject(new Error('refused')) });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: "We don't keep this" }));
    fireEvent.change(screen.getByLabelText('Why this record is not kept'), {
      target: { value: 'kept by the applicator' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record as not kept' }));
    await waitFor(() => expect(markNotKept).toHaveBeenCalled());
    expect(
      (screen.getByLabelText('Why this record is not kept') as HTMLTextAreaElement).value
    ).toBe('kept by the applicator');
  });
});
