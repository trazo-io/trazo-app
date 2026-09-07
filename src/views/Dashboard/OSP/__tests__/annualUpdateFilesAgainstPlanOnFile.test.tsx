/**
 * A § 205.406(a) filing continues the plan the CERTIFIER holds — not the version the screen
 * happens to be focused on.
 *
 * WHY THIS EXISTS
 * ---------------
 * Found 2026-09-07, alongside the blank `02-annual-update.pdf`. The card posted
 * `prior_osp: focusedOspId`, and focus defaults to the newest version — the working DRAFT. So
 * a filing made here recorded "the changes to v4" against a plan the certifying agent has
 * never seen, while § 205.406(a)(1) asks for the changes to the PREVIOUS plan. It read
 * correctly on screen the entire time; only the lineage an inspector follows was wrong.
 *
 * The card now names the version it continues, and the version it will be recorded as
 * producing, before the farmer fills anything in.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

const createUpdate = vi.fn((_args: { data: Record<string, unknown> }) => ({
  unwrap: () => Promise.resolve({})
}));
vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: [] }),
  useCreateOSPAnnualUpdateMutation: () => [createUpdate, { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }]
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

const V3 = { id: 65, version_number: 3, status: 'active' } as any;
const V4_DRAFT = { id: 66, version_number: 4, status: 'draft' } as any;

const renderCard = (props: Record<string, unknown> = {}) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={V3}
          currentYear={2026}
          {...props}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('annual update files against the plan on file', () => {
  it('names the version the filing continues', () => {
    renderCard();
    expect(
      screen.getByText(/This filing continues OSP v3 — the plan your certifier holds\./)
    ).toBeInTheDocument();
  });

  it('names the draft it will be recorded as producing', () => {
    renderCard({ producesDraft: V4_DRAFT });
    expect(
      screen.getByText(/It will be recorded as producing v4, the draft you are preparing\./)
    ).toBeInTheDocument();
  });

  it('says nothing about a draft when none is open', () => {
    renderCard();
    expect(screen.queryByText(/will be recorded as producing/)).toBeNull();
  });

  it('posts the plan on file as prior_osp, never the draft', () => {
    // The defect in one assertion: with v4 open, the row must still say v3.
    createUpdate.mockClear();
    renderCard({ producesDraft: V4_DRAFT });
    fireEvent.change(screen.getByLabelText(/Changes Summary|Summary of changes/i), {
      target: { value: 'Buffer widened to 45 ft.' }
    });
    fireEvent.click(screen.getByRole('button', { name: /File annual update|Save/i }));
    expect(createUpdate).toHaveBeenCalled();
    expect(createUpdate.mock.calls[0]?.[0].data.prior_osp).toBe(65);
  });
});
