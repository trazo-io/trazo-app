/**
 * § 205.406(a)(3) company-details step: what Trazo holds, each detail answered.
 *
 * The rules the screen owes the server (certifications/services/application_info_review.py):
 * nothing preselected, so a detail nobody looked at is never sent as "correct"; a detail Trazo
 * does not hold reads as not held and is typed, never filled in; a viewer sees no controls; a
 * farm manager cannot offer to change the company's own fields.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const confirm = vi.fn((_args: { answers: Record<string, { status: string; value?: string }> }) => ({
  unwrap: () => Promise.resolve(review)
}));

const detail = (
  key: string,
  label: string,
  value: string,
  extra: Record<string, unknown> = {}
) => ({
  key,
  label,
  record: 'establishment',
  field: key,
  required: true,
  value,
  held: Boolean(value),
  source: value ? `establishment.${key}` : '',
  editable: true,
  ...extra
});

let review: Record<string, unknown>;
const baseReview = () => ({
  filing: 7,
  locked: false,
  attested_unchanged: false,
  application_info_changes: '',
  can_answer: true,
  can_edit_company: true,
  details: [
    detail('legal_name', 'Business name', 'Upper Terrace Orchards LLC', { record: 'company' }),
    detail('phone', 'Phone', ''),
    detail('email', 'Email', 'laurel@upperterrace.test', { required: false })
  ]
});

let queryState: Record<string, unknown> = {};
const refetch = vi.fn();
vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetCompanyDetailsReviewQuery: () => ({
    data: review,
    isLoading: false,
    isFetching: false,
    refetch,
    ...queryState
  }),
  useConfirmCompanyDetailsMutation: () => [confirm, { isLoading: false }]
}));

import OSPCompanyDetailsStep from '../OSPCompanyDetailsStep';

const renderStep = (onApplied = vi.fn()) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPCompanyDetailsStep companyId="1" farmId="2" updateId={7} onApplied={onApplied} />
      </IntlProvider>
    </ChakraProvider>
  );

const group = (name: string) => screen.getByRole('group', { name });
const submit = () => screen.getByRole('button', { name: 'Save company details' });

describe('company details step', () => {
  beforeEach(() => {
    queryState = {};
  });

  it('preselects nothing and holds the save until every detail is answered', () => {
    review = baseReview();
    renderStep();
    for (const name of ['Business name', 'Phone', 'Email']) {
      within(group(name))
        .getAllByRole('button')
        .forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'false'));
    }
    expect(submit()).toBeDisabled();
    expect(screen.getByText(/3 details still to answer/)).toBeInTheDocument();
  });

  it('shows a detail Trazo does not hold as not held, and makes the operator type it', () => {
    review = baseReview();
    renderStep();
    expect(screen.getByText('Not held in Trazo')).toBeInTheDocument();
    fireEvent.click(within(group('Business name')).getByRole('button', { name: 'Correct' }));
    fireEvent.click(within(group('Email')).getByRole('button', { name: 'Correct' }));
    fireEvent.click(
      within(group('Phone')).getByRole('button', { name: 'Already on file with my certifier' })
    );
    expect(submit()).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Phone, as it is now/), {
      target: { value: '(541) 555-0111' }
    });
    expect(submit()).not.toBeDisabled();
  });

  it('sends every answer, with the typed value only where one was asked for', async () => {
    review = baseReview();
    confirm.mockClear();
    const onApplied = vi.fn();
    renderStep(onApplied);
    fireEvent.click(within(group('Business name')).getByRole('button', { name: 'Update' }));
    fireEvent.change(screen.getByLabelText(/Business name, as it is now/), {
      target: { value: 'Upper Terrace Farms LLC' }
    });
    fireEvent.click(
      within(group('Phone')).getByRole('button', { name: 'New since my last update' })
    );
    fireEvent.change(screen.getByLabelText(/Phone, as it is now/), {
      target: { value: '(541) 555-0199' }
    });
    fireEvent.click(within(group('Email')).getByRole('button', { name: 'Correct' }));
    fireEvent.click(submit());
    await Promise.resolve();
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0]?.[0].answers).toEqual({
      legal_name: { status: 'changed', value: 'Upper Terrace Farms LLC' },
      phone: { status: 'changed', value: '(541) 555-0199' },
      email: { status: 'correct' }
    });
    await Promise.resolve();
    expect(onApplied).toHaveBeenCalledWith(review);
  });

  it('after a save shows what was saved instead of re-asking, and can review again', async () => {
    review = baseReview();
    queryState = {};
    renderStep();
    fireEvent.click(within(group('Business name')).getByRole('button', { name: 'Correct' }));
    fireEvent.click(
      within(group('Phone')).getByRole('button', { name: 'Already on file with my certifier' })
    );
    fireEvent.change(screen.getByLabelText(/Phone, as it is now/), {
      target: { value: '(541) 555-0111' }
    });
    fireEvent.click(within(group('Email')).getByRole('button', { name: 'Correct' }));
    fireEvent.click(submit());
    expect(await screen.findByText('Saved to this update.')).toBeInTheDocument();
    expect(screen.queryByText(/still to answer/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save company details' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Review again' }));
    expect(submit()).toBeDisabled();
  });

  it('says so when the details cannot be loaded, never an empty box', () => {
    review = undefined as unknown as Record<string, unknown>;
    queryState = { isError: true };
    refetch.mockClear();
    renderStep();
    expect(
      screen.getByText('The company details for this update could not be loaded')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(refetch).toHaveBeenCalled();
    queryState = {};
  });

  it('gives a viewer no controls', () => {
    review = { ...baseReview(), can_answer: false };
    renderStep();
    expect(screen.queryByRole('group', { name: 'Business name' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save company details' })).toBeNull();
    expect(screen.getByText(/can view these details but not confirm/)).toBeInTheDocument();
  });

  it('offers a farm manager no way to change the company fields', () => {
    const r = baseReview();
    r.details[0] = { ...r.details[0], editable: false };
    review = { ...r, can_edit_company: false };
    renderStep();
    expect(within(group('Business name')).queryByRole('button', { name: 'Update' })).toBeNull();
    expect(
      within(group('Business name')).getByRole('button', { name: 'Correct' })
    ).toBeInTheDocument();
    expect(screen.getByText('Only a company admin can change this.')).toBeInTheDocument();
  });
});
