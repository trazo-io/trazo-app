/**
 * The plan-review panel lists what the records did after the plan's answers — and only lists.
 *
 * A renewal cloned from last year's plan went to the certifier reading "six parcels" with seven
 * on file. The backend now compiles, from dated records, what happened after the newest answer;
 * this panel must put that list in front of the operator before Submit, must name the parcels
 * the plan never mentions and the modules not revisited, and must never phrase any of it as a
 * verdict or a blocker.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

let review: any = {
  answers_as_of: '2026-08-21',
  reference_date: '2028-02-07',
  is_clean: false,
  findings: [
    {
      code: 'new_ground',
      message: "Ground the operation began managing after the plan's answers were written",
      count: 1,
      details: ['Muddy Creek Lease — began 2027-01-15'],
      module_key: 'parcel_application'
    },
    {
      code: 'change_notifications',
      message: "§ 205.400(f) change notifications filed after the plan's answers were written",
      count: 4,
      details: [
        '2027-01-22 — Added acreage',
        '2027-01-22 — Practice change',
        '2027-05-11 — Prohibited-substance application/drift (IMMEDIATE)',
        '2028-01-14 — Practice change'
      ],
      module_key: null
    }
  ],
  stale_modules: [
    {
      module_key: 'g4_0_rotation_soil',
      module: 'G4.0 Rotation & Soil Management',
      answered_at: '2026-08-21',
      days_before_submission: 534
    }
  ],
  parcels_not_named: ['Muddy Creek Lease']
};
let state = { isLoading: false, isError: false };

vi.mock('store/api/ospApi', () => ({
  useGetOSPReviewQuery: () => ({ data: review, ...state })
}));

import OSPPlanReviewPanel from '../OSPPlanReviewPanel';

const osp: any = { id: 46, version_number: 5, status: 'draft' };

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" onError={() => {}}>
        <OSPPlanReviewPanel companyId="1" farmId="2" osp={osp} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('OSPPlanReviewPanel', () => {
  it('shows each finding with its count and details, the unnamed parcel, and the stale module', () => {
    renderPanel();
    expect(screen.getByText(/newest answer in this plan was written 2026-08-21/i)).toBeTruthy();
    expect(screen.getByTestId('osp-review-new_ground')).toBeTruthy();
    // details render as '• <text>' inside one list item
    expect(screen.getByText(/Muddy Creek Lease — began 2027-01-15/)).toBeTruthy();
    expect(screen.getByText(/Prohibited-substance application\/drift/)).toBeTruthy();
    expect(screen.getByTestId('osp-review-parcels-not-named').textContent).toContain(
      'Muddy Creek Lease'
    );
    expect(screen.getByTestId('osp-review-stale').textContent).toContain(
      'G4.0 Rotation & Soil Management'
    );
    // headline badge: 2 findings + 1 stale + 1 unnamed parcel
    expect(screen.getByText('4 to confirm')).toBeTruthy();
  });

  it('never phrases the list as a verdict — the word "wrong" appears only in the disclaimer', () => {
    renderPanel();
    const text = document.body.textContent || '';
    expect(text).toContain('None of it is wrong by itself');
    expect(text).not.toMatch(/incorrect|invalid|must fix|blocked/i);
  });

  it('says so when nothing changed after the answers', () => {
    review = { ...review, is_clean: true, findings: [], stale_modules: [], parcels_not_named: [] };
    renderPanel();
    expect(screen.getByText('Nothing to revisit')).toBeTruthy();
    expect(screen.getByText(/No operation changes are recorded/)).toBeTruthy();
  });

  it('renders nothing on an error rather than a blank card', () => {
    state = { isLoading: false, isError: true };
    const { container } = renderPanel();
    expect(container.textContent).toBe('');
  });
});
