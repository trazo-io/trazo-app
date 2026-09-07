/**
 * A past § 205.406 filing must show what an inspector asks of it — and must not invent a
 * status Trazo cannot know.
 *
 * WHAT THE ROW USED TO SAY
 * ------------------------
 * Reporting year, a two-line change summary, and a "Submitted" pill. That answers neither
 * question a returning farmer actually has in renewal season: WHEN did we file, and WHICH
 * version of the plan did that filing move us to. `prior_osp` was carried as a bare database
 * id, which nobody can read as a plan version.
 *
 * THE ONE THAT IS A COMPLIANCE DECISION, NOT A DESIGN ONE
 * ------------------------------------------------------
 * `certifier_acknowledged_at` is read-only on the serializer and written by nothing in the
 * product — only a seeder and Django admin. For a real farmer it is therefore always null.
 * Rendering "Acknowledgment pending" against it would put a permanent amber warning on every
 * filing the operation has ever made, and would assert that Trazo tracks certifier replies. It
 * does not. An absent acknowledgment is not evidence the certifier withheld one — the same
 * rule that keeps an unanswered OSP question from being reported as "no".
 *
 * So acknowledgment renders ONLY as a positive fact, when a date is on record.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

const updates = [
  {
    id: 1,
    reporting_year: 2026,
    changes_summary: 'Grandevo added in February; hedgerow planting completed.',
    additions: [],
    deletions: [],
    prior_osp: 59,
    prior_osp_version: 1,
    new_osp: 61,
    new_osp_version: 3,
    submitted_at: '2026-08-21T11:37:30Z',
    certifier_acknowledged_at: null
  },
  {
    id: 2,
    reporting_year: 2025,
    changes_summary: 'No material changes.',
    additions: [],
    deletions: [],
    prior_osp: 59,
    prior_osp_version: 1,
    new_osp: null,
    new_osp_version: null,
    submitted_at: '2025-01-10T00:00:00Z',
    certifier_acknowledged_at: '2025-02-03T00:00:00Z'
  }
];

vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: updates }),
  useCreateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOSPAnnualUpdateMutation: () => [vi.fn(), { isLoading: false }]
}));

import OSPAnnualUpdateCard from '../OSPAnnualUpdateCard';

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" onError={() => {}}>
        <OSPAnnualUpdateCard
          companyId="1"
          farmId="2"
          planOnFile={{ id: 61, version_number: 3, status: 'active' } as any}
          currentYear={2026}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('annual update history', () => {
  it('shows when each filing was made', () => {
    renderCard();
    // The date, not just a "Submitted" pill. "Did we file on time?" is a § 205.406 question.
    expect(screen.getByText('Filed Aug 21, 2026')).toBeInTheDocument();
  });

  it('renders the filing date the operator submitted, not the viewer-local one', () => {
    // The 2025 filing is stored 2025-01-10T00:00:00Z. `submitted_at` is a DateTimeField, so an
    // ISO datetime falls through `parseDateOnly`'s YYYY-MM-DD pattern and `formatDateOnly`
    // renders it in the viewer's zone — "Jan 9, 2025" anywhere west of UTC. vitest pins
    // TZ=America/Los_Angeles precisely so this class fails here instead of on a farm.
    //
    // Asserted on the exact day, not a loose /2025/: the looser matcher passed against the
    // off-by-one and is what let the bug through the first time.
    renderCard();
    expect(screen.getByText('Filed Jan 10, 2025')).toBeInTheDocument();
    expect(screen.queryByText('Filed Jan 9, 2025')).not.toBeInTheDocument();
  });

  it('names the plan versions the filing moved between', () => {
    renderCard();
    expect(screen.getByText('Plan v1 → v3')).toBeInTheDocument();
  });

  it('says "reaffirmed" when the filing produced no new version', () => {
    // § 205.406 explicitly allows a pure "no material changes" attestation. A null new_osp is
    // that case, not missing data, and must not read as an incomplete filing.
    renderCard();
    expect(screen.getByText('Plan v1 reaffirmed')).toBeInTheDocument();
  });

  it('shows an acknowledgment that is on record', () => {
    // Stored 2025-02-03T00:00:00Z — same DateTimeField trap as the filing date above.
    renderCard();
    expect(screen.getByText('Certifier acknowledged Feb 3, 2025')).toBeInTheDocument();
  });

  it('offers Edit on a filing the certifier has not acknowledged', () => {
    // The 2026 filing is unacknowledged, so it stays correctable — a certifier asking for a
    // fix must not hit a wall.
    renderCard();
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
  });

  it('withdraws Edit once the certifier has acknowledged, and says why', () => {
    // The 2025 filing IS acknowledged and the server answers 423. Offering Edit would let a
    // farmer reopen it, retype a summary and only be refused on save — losing the work and
    // reading as a bug rather than a rule.
    renderCard();
    expect(screen.getByText('Acknowledged — as filed')).toBeInTheDocument();
    // Two filings, one Edit button: the acknowledged one has none.
    expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(1);
  });

  it('never renders a pending-acknowledgment state', () => {
    // FENCING, not a regression test — and worth being precise about. The old row had no
    // pending treatment either, so this assertion would have passed before the change. It
    // exists because the neighbouring change-notifications panel DOES render an
    // "Acknowledgment pending" pill, and copying that pattern here is the obvious next edit
    // someone makes. There it is right: a farmer can record that notification's
    // acknowledgment. Here it is wrong: the field is read-only and nothing writes it.
    renderCard();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/not acknowledged/i)).not.toBeInTheDocument();
    // Exactly one acknowledgment line — the 2026 filing has none and must stay silent.
    expect(screen.getAllByText(/Certifier acknowledged/)).toHaveLength(1);
  });
});
