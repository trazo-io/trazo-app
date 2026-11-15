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
import { fireEvent, render, screen } from '@testing-library/react';
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
import esMessages from '../../../../i18n/lang/es-419.json';

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
    // A date in words since 2026-11-07; it was printed as the raw ISO string.
    expect(screen.getByText(/since the plan was last answered, on Aug 21, 2026/i)).toBeTruthy();
    expect(screen.getByTestId('osp-review-new_ground')).toBeTruthy();
    // A detail renders as its label, then the evidence on a quieter line (2026-11-07).
    expect(screen.getAllByText('Muddy Creek Lease').length).toBeGreaterThan(0);
    expect(screen.getByText('began 2027-01-15')).toBeTruthy();
    expect(screen.getByText(/Prohibited-substance application\/drift/)).toBeTruthy();
    expect(screen.getByTestId('osp-review-parcels-not-named').textContent).toContain(
      'Muddy Creek Lease'
    );
    expect(screen.getByTestId('osp-review-stale').textContent).toContain(
      'G4.0 Rotation & Soil Management'
    );
    // headline badge: 2 findings + 1 stale + 1 unnamed parcel
    // Items, not groups (recordkeeping review F-22): 1 + 4 records across the two findings,
    // plus the unnamed parcel and the stale module.
    expect(screen.getByText('7 to confirm')).toBeTruthy();
  });

  it('never phrases the list as a verdict, and says so in words', () => {
    renderPanel();
    const text = document.body.textContent || '';
    expect(text).toContain('not a problem by itself');
    expect(text).not.toMatch(/incorrect|invalid|must fix|blocked/i);
  });

  it('names the module that fixes a finding and opens it (2026-11-07: it was a dead end)', () => {
    const onOpenModule = vi.fn();
    render(
      <ChakraProvider>
        <IntlProvider locale="en" onError={() => {}}>
          <OSPPlanReviewPanel
            companyId="1"
            farmId="2"
            osp={osp}
            onOpenModule={onOpenModule}
            moduleName={(key) => (key === 'parcel_application' ? 'Parcel Application' : undefined)}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Open Parcel Application' }));
    expect(onOpenModule).toHaveBeenCalledWith('parcel_application');
    // A finding with no module gets no button rather than one that goes nowhere.
    expect(screen.getAllByRole('button', { name: /^Open / })).toHaveLength(1);
  });

  it('says so when nothing changed after the answers', () => {
    review = { ...review, is_clean: true, findings: [], stale_modules: [], parcels_not_named: [] };
    renderPanel();
    expect(screen.getByText('Nothing to revisit')).toBeTruthy();
    expect(screen.getByText(/No operation changes are recorded/)).toBeTruthy();
  });

  it('names a signer who is not the legally responsible contact, in Spanish too', () => {
    // Orchard specimen read (2026-11-15): two answers to who is responsible, and the review names
    // both rather than picking one.
    review = {
      ...review,
      is_clean: false,
      findings: [
        {
          code: 'responsible_person_not_legally_responsible',
          message: 'fallback',
          count: 1,
          details: [
            'Responsible person on the farm profile, printed as the signer: Karen Tollefsen',
            "Marked legally responsible in the operation's contacts: Dan Tollefsen"
          ],
          module_key: 'certification_contract'
        }
      ],
      stale_modules: [],
      parcels_not_named: []
    };
    render(
      <ChakraProvider>
        <IntlProvider locale="es-419" messages={esMessages} onError={() => {}}>
          <OSPPlanReviewPanel companyId="1" farmId="2" osp={osp} />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(
      screen.getByText(
        /no es un contacto marcado como responsable legal; indica en ambos lugares quién firma/
      )
    ).toBeTruthy();
    expect(screen.getByText(/printed as the signer: Karen Tollefsen/)).toBeTruthy();
  });

  it('renders nothing on an error rather than a blank card', () => {
    state = { isLoading: false, isError: true };
    const { container } = renderPanel();
    expect(container.textContent).toBe('');
  });
});
