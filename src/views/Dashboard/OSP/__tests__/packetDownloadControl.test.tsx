/**
 * The packet download must name the version it exports, and say whether the § 205.406(a)
 * filing travels with it.
 *
 * WHY THIS EXISTS
 * ---------------
 * Found 2026-09-07. The control was a bare <a href> onto `selectWorkingOsp(osps)` — the
 * highest-numbered DRAFT — with no version named anywhere on the page. A grower who had filed
 * the annual update in August against v3, then started v4, downloaded the packet and found
 * `02-annual-update.pdf` reading "No annual update is on file". Two separate defects met
 * there: the server never linked a filing to the version a renewal produced (fixed in
 * `new-version`), and the client silently picked a version the operator had not chosen.
 *
 * This file covers the second. The menu must be readable as: which version, what state it is
 * in, and does the one document a renewal IS come with it.
 */
import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';

import enUS from 'i18n/lang/en-US.json';

let updates: any[] = [];
vi.mock('store/api/ospAnnualUpdateApi', () => ({
  useGetOSPAnnualUpdatesQuery: () => ({ data: updates })
}));
vi.mock('config/environment', () => ({ env: { getApiUrl: (u: string) => u } }));

import PacketDownloadControl from '../PacketDownloadControl';

const plan = (id: number, version_number: number, status: string) =>
  ({ id, version_number, status }) as any;

const renderControl = (osps: any[]) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <PacketDownloadControl companyId="1" farmId="2" osps={osps} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('packet download control', () => {
  it('names the version when there is only one plan to export', () => {
    updates = [];
    renderControl([plan(10, 1, 'active')]);
    expect(screen.getByText('Download packet (v1)')).toBeInTheDocument();
  });

  it('offers the draft AND the plan on file once they differ', async () => {
    updates = [{ id: 1, prior_osp: 10, new_osp: null, reporting_year: 2026 }];
    const { getByRole } = renderControl([plan(10, 3, 'active'), plan(11, 4, 'draft')]);
    getByRole('button').click();
    // The draft is the default a renewal wants — but the operator can now see it IS a draft,
    // and can reach the version their certifier actually holds.
    expect(await screen.findByText('v4 — draft, still being written')).toBeInTheDocument();
    expect(screen.getByText('v3 — active, on file with your certifier')).toBeInTheDocument();
  });

  it('says which version carries the annual update and which does not', async () => {
    // The exact shape of the incident: the 2026 filing is recorded against v3, the packet
    // button targets v4, and nothing said so.
    updates = [{ id: 1, prior_osp: 10, new_osp: null, reporting_year: 2026 }];
    const { getByRole } = renderControl([plan(10, 3, 'active'), plan(11, 4, 'draft')]);
    getByRole('button').click();
    expect(await screen.findByText('2026 annual update included')).toBeInTheDocument();
    expect(
      screen.getByText('No annual update attached — § 205.406(a) asks for one each year')
    ).toBeInTheDocument();
  });

  it('follows the server and reads new_osp before prior_osp', async () => {
    // `_renewal_context` looks for the filing whose `new_osp` IS this plan first. A filing
    // carried onto v4 by the fork must show against v4, not only against v3.
    updates = [{ id: 1, prior_osp: 10, new_osp: 11, reporting_year: 2026 }];
    const { getByRole } = renderControl([plan(10, 3, 'active'), plan(11, 4, 'draft')]);
    getByRole('button').click();
    expect(await screen.findAllByText('2026 annual update included')).toHaveLength(2);
  });

  it('renders nothing when the farm has no plan', () => {
    updates = [];
    // ChakraProvider always injects its own hidden `__chakra_env` span, so "empty" is asserted
    // as "offers no download", which is the fact that matters.
    renderControl([]);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
