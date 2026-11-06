/**
 * The farm-home records card states counts, with their window, and nothing else.
 *
 * Rebuilt 2026-11-05. The old card printed "367% scan growth" in green under a visitor count,
 * kept a dormant "Unlock Premium Features" headline for retired-ladder contracts and a "Building
 * Trust / creating consumer confidence" headline past 500 scans, and the server filled an unknown
 * visitor count with `max(1, scans // 30)`. These tests pin the replacement.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../i18n/lang/en-US.json';

let metrics: Record<string, unknown> = {};
let skipped = false;
vi.mock('store/api/dashboardMetricsApi', () => ({
  useGetFarmDashboardMetricsQuery: () =>
    skipped
      ? { data: undefined, isLoading: false, isUninitialized: true, error: undefined }
      : { data: { metrics }, isLoading: false, isUninitialized: false, error: undefined }
}));

import SmartUsageCard from '../SmartUsageCard';

const renderCard = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter>
          <SmartUsageCard companyId={1} farmId={2} buyerPagePath="/admin/dashboard/farm/2/buyer" />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const row = (label: string) => screen.getByText(label).closest('div')!.parentElement!;

describe('farm-home records card', () => {
  beforeEach(() => {
    skipped = false;
    metrics = {
      consumer_reach: 1,
      monthly_scans: 14,
      scored_productions: 9,
      total_documented_events: 513,
      total_productions: 12,
      productions_in_progress: 3,
      // A stale server still sending a retired field must not bring it back on screen.
      scan_growth_percentage: 367
    };
  });

  it('shows each count beside its label, scans and visitors under one stated window', () => {
    renderCard();
    expect(row('Activities logged').textContent).toContain('513');
    expect(row('Seasons underway').textContent).toContain('3');
    expect(row('Finished seasons').textContent).toContain('9');
    expect(row('QR scans').textContent).toContain('14');
    expect(row('Unique visitors').textContent).toContain('1');
    expect(screen.getByText('Buyer page, last 30 days')).toBeTruthy();
  });

  it('prints no percentage and no upsell or trust headline', () => {
    const { container } = renderCard();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/%/);
    expect(text).not.toMatch(/premium|trust|confidence|scale/i);
  });

  it('says an unknown visitor count is not recorded, never a number', () => {
    metrics = { ...metrics, consumer_reach: null };
    renderCard();
    expect(screen.queryByText('Unique visitors')).toBeNull();
    expect(screen.getByTestId('visitors-not-recorded').textContent).toMatch(/not recorded/);
  });

  it('links to the buyer page', () => {
    renderCard();
    const link = screen.getByRole('link', { name: /Share your QR codes/ });
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/2/buyer');
  });

  it('does not call a query that has not run yet a failure', () => {
    skipped = true;
    const { container } = renderCard();
    expect(container.textContent).not.toMatch(/Unable/i);
  });
});
