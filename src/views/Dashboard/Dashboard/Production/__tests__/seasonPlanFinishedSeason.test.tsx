/**
 * The season plan on a FINISHED season is a retrospective, not a checklist (2026-08-26).
 *
 * Found on the prod demo farm: a finished production rendered all 16 plan rows as
 * "Planned · 0 of 16 logged". A plan is a forward-looking artifact — on a closed season
 * "Planned" promises work that can never happen, and a zero-fulfilment panel misreads a
 * season that may be fully documented free-form as an empty one. Pins:
 *
 *  - finished + nothing fulfilled  -> the card does not render at all;
 *  - finished + partly fulfilled   -> collapsed retrospective ("N of M ... logged",
 *    opt-in row list), unfulfilled rows say "Not logged", never "Planned", no "Log this";
 *  - open season                   -> the checklist, with "Log this" on each pending row.
 *    Since 2026-11-06 a pending row carries no "Planned" pill: "Log this" already says it,
 *    and nine identical pills were noise.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import messages from '../../../../../i18n/lang/en-US.json';

let planData: any = { items: [], completeness: null };

vi.mock('store/api/seasonPlanApi', () => ({
  useGetSeasonPlanQuery: () => ({ data: planData, isLoading: false }),
  useUpdateSeasonPlanItemMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('components/Design/ResponsiveModal', () => ({ ResponsiveModal: () => null }));
vi.mock('components/Modals/CorrectRecordModal', () => ({ CorrectRecordModal: () => null }));

import { SeasonPlanSection } from '../SeasonPlanSection';

const item = (id: number, status: 'pending' | 'logged' | 'skipped', extra: object = {}) => ({
  id,
  name: `Practice ${id}`,
  status,
  planned_window: 'March - April',
  skipped_reason: '',
  event_type: 1,
  event_subtype: 'HA',
  fulfilled_by_id: status === 'logged' ? 900 + id : null,
  fulfilled_by_event_type: status === 'logged' ? 1 : null,
  ...extra
});

const renderSection = (props: Partial<React.ComponentProps<typeof SeasonPlanSection>> = {}) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" messages={messages as any}>
        <SeasonPlanSection productionId="uuid-1" farmId="167" parcelId="303" canWrite {...props} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('season plan on a finished season', () => {
  it('renders NOTHING when the season is finished and no plan item was fulfilled', () => {
    planData = {
      items: [item(1, 'pending'), item(2, 'pending'), item(3, 'pending')],
      completeness: { logged: 0, total: 3, skipped: 0 }
    };
    renderSection({ isFinished: true });
    expect(screen.queryByText('Season plan')).toBeNull();
    expect(screen.queryByText('Planned')).toBeNull();
  });

  it('collapses to a retrospective when finished and partly fulfilled; rows say "Not logged"', () => {
    planData = {
      items: [item(1, 'logged'), item(2, 'pending'), item(3, 'skipped')],
      completeness: { logged: 1, total: 3, skipped: 1 }
    };
    renderSection({ isFinished: true });
    // Collapsed: summary + opt-in, no rows yet.
    expect(screen.getByText(/This season is closed\. 1 of 2 planned practices/)).toBeTruthy();
    expect(screen.queryByText('Practice 2')).toBeNull();

    fireEvent.click(screen.getByText('Show the season plan'));
    expect(screen.getByText('Practice 2')).toBeTruthy();
    // The honest badge: a fact, never a promise — and no logging controls.
    expect(screen.getByText('Not logged')).toBeTruthy();
    expect(screen.queryByText('Planned')).toBeNull();
    expect(screen.queryByText('Log this')).toBeNull();
  });

  it('keeps the working checklist on an OPEN season', () => {
    planData = {
      items: [item(1, 'logged'), item(2, 'pending')],
      completeness: { logged: 1, total: 2, skipped: 0 }
    };
    renderSection({ isFinished: false });
    expect(screen.getByText('Practice 2')).toBeTruthy();
    expect(screen.queryByText('Planned')).toBeNull();
    expect(screen.queryByText('Not logged')).toBeNull();
    expect(screen.getByText('Log this')).toBeTruthy();
    expect(screen.queryByText(/This season is closed/)).toBeNull();
  });
});
