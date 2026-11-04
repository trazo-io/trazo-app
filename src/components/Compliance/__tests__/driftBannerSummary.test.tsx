/**
 * The collapsed drift banner (2026-11-04 redesign): names the inputs, counts INPUTS not
 * records, and leads with the action that clears the finding.
 *
 * Seen at 390px on the Calapooia specimen: one jug logged on two days was listed twice under a
 * title that said "3 logged inputs" over what was two inputs. And the clearing action used to
 * exist only after "Show details" was pressed.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import enUS from '../../../i18n/lang/en-US.json';
import type { DriftWarning } from 'types/standardizedEvents';
import DriftFindingsBanner from '../DriftFindingsBanner';

const finding = (
  id: number,
  input: string,
  date: string,
  provisional = false
): { id: number; date: string; drift_warning: DriftWarning } => ({
  id,
  date,
  drift_warning: {
    detected_at: '2026-10-06T23:16:42Z',
    osp_id: 6,
    osp_version: 3,
    input_label: input,
    reason: `'${input}' is not confirmed against the plan's inputs list.`,
    reason_code: 'unresolved',
    reason_params: { input, possibleMatches: [] },
    provisional,
    resolved_via: 'unresolved',
    resolved_id: null,
    resolved_name: input,
    cfr_reference: '7 CFR 205.400(f)(2)'
  }
});

const wrap = (node: React.ReactNode) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS}>
        <MemoryRouter initialEntries={['/admin/dashboard/farm/2/parcel/10/production/21']}>
          <Routes>
            <Route
              path="/admin/dashboard/farm/:farmId/parcel/:parcelId/production/:productionId"
              element={node}
            />
          </Routes>
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const SAWDUST = 'Douglas-fir sawdust, untreated';

describe('DriftFindingsBanner, collapsed', () => {
  it('groups records of the same input and counts inputs in the title', () => {
    wrap(
      <DriftFindingsBanner
        events={[
          finding(1, SAWDUST, '2026-03-17T08:00:00Z'),
          finding(2, SAWDUST, '2026-03-18T08:00:00Z'),
          finding(3, 'Grandevo WDG', '2026-07-09T08:00:00Z')
        ]}
      />
    );
    expect(screen.getByText('2 inputs not confirmed against your active OSP')).toBeTruthy();
    const rows = screen.getByTestId('drift-summary').querySelectorAll('li');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain(SAWDUST);
    expect(rows[0].textContent).toContain('2 records');
    // A single record shows its date, formatted like the rest of the page, in UTC.
    expect(rows[1].textContent).toContain('Jul 9, 2026');
    expect(screen.queryByText(/2026-07-09/)).toBeNull();
  });

  it('shows the clearing action without expanding, and keeps the explanation behind details', () => {
    wrap(<DriftFindingsBanner events={[finding(1, 'Grandevo WDG', '2026-07-09T08:00:00Z')]} />);
    expect(screen.getByTestId('drift-confirm-identities-link').getAttribute('href')).toBe(
      '/admin/dashboard/farm/2/osp/module/materials_application#logged-names'
    );
    expect(screen.getByRole('button', { name: 'Show details' }).getAttribute('aria-expanded')).toBe(
      'false'
    );
  });

  it('counts the inputs past the third instead of listing them', () => {
    wrap(
      <DriftFindingsBanner
        events={['A', 'B', 'C', 'D', 'E'].map((n, i) =>
          finding(i, `Input ${n}`, '2026-05-01T08:00:00Z')
        )}
      />
    );
    const rows = screen.getByTestId('drift-summary').querySelectorAll('li');
    expect(rows).toHaveLength(4);
    expect(rows[3].textContent).toBe('and 2 more');
  });

  it('offers no plan link for a draft-only set, where there is no filed plan to confirm against', () => {
    wrap(
      <DriftFindingsBanner events={[finding(1, 'Grandevo WDG', '2026-07-09T08:00:00Z', true)]} />
    );
    expect(screen.queryByTestId('drift-confirm-identities-link')).toBeNull();
    expect(screen.getByText('1 input not yet on your draft plan')).toBeTruthy();
  });
});
