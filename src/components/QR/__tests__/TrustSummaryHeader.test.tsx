/**
 * Phase 1 claim-safety regression tests for the consumer trust strip.
 *
 * Guards the 2026-06 redesign decisions:
 *  - Certification (third-party) leads the pillar order.
 *  - Blockchain wording is OUT of the above-the-fold trust strip.
 *  - The disclaimer is split per claim type (records vs certifications).
 *  - Harvest/lot pillar surfaces batch facts; falls back to events count.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import TrustSummaryHeader, { TrustSummaryHeaderProps } from '../TrustSummaryHeader';
import enUS from '../../../i18n/lang/en-US.json';

// TrustSummaryHeader calls useIntl(), so it needs an IntlProvider ancestor. Without one
// the suite threw at render and **zero tests ran** — and these are the claim-safety guards
// for the consumer trust strip (records are farmer-reported, certifications labelled
// separately, no invented organic state). Real en-US catalogue so a missing key shows up.
const messages = enUS as unknown as Record<string, string>;

const renderHeader = (props: Partial<TrustSummaryHeaderProps> = {}) => {
  const defaultProps: TrustSummaryHeaderProps = {
    productName: 'Orange',
    farmName: 'Coastal Valleys Farm',
    location: 'Ventura, California',
    organicClaim: { status: 'certified_organic' } as any,
    certifications: [
      { status: 'verified_via_database', certifier_name: 'CCOF', display_name: 'USDA Organic' }
    ] as any,
    documentedEventsCount: 20,
    expectedEventsCount: 15,
    blockchainStatus: 'verified',
    totalPhotoEvidenceCount: 14,
    isLoading: false
  };
  return render(
    <ChakraProvider>
      <IntlProvider locale="en" messages={messages} onError={() => {}}>
        <TrustSummaryHeader {...defaultProps} {...props} />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('TrustSummaryHeader (claim-safe trust strip)', () => {
  it('renders the certification pillar first', () => {
    renderHeader();
    const pillarLabels = screen.getAllByText(/^(PRACTICES|ORIGIN|HARVEST|EVENTS|RECORDS)$/);
    expect(pillarLabels[0]).toHaveTextContent('PRACTICES');
    expect(screen.getByText('Certified Organic')).toBeInTheDocument();
    expect(screen.getByText('via CCOF')).toBeInTheDocument();
  });

  it('never renders blockchain wording in the trust strip, even when verified', () => {
    renderHeader({ blockchainStatus: 'verified' });
    expect(screen.queryByText(/Blockchain-recorded/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tamper-evident/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Polygon/i)).not.toBeInTheDocument();
  });

  it('splits the disclaimer: records are farmer-reported, certifications labeled separately', () => {
    renderHeader();
    expect(
      screen.getByText(/Practice records are farmer-reported, not independently audited/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Certifications are labeled separately as Verified or Self-Reported/i)
    ).toBeInTheDocument();
  });

  it('renders the harvest pillar with date and lot when both exist', () => {
    renderHeader({ harvestDate: '2026-03-18T00:00:00Z', lotId: 'ORA-2024-001' });
    expect(screen.getByText('HARVEST')).toBeInTheDocument();
    expect(screen.getByText(/Harvested Mar 1[78], 2026/)).toBeInTheDocument();
    expect(screen.getByText('Lot ORA-2024-001')).toBeInTheDocument();
  });

  it('falls back to the events pillar when no harvest data exists', () => {
    renderHeader({ harvestDate: undefined, lotId: undefined });
    expect(screen.queryByText('HARVEST')).not.toBeInTheDocument();
    expect(screen.getByText('EVENTS')).toBeInTheDocument();
    expect(screen.getByText(/20 events/)).toBeInTheDocument();
  });

  it('shows photo evidence in the records pillar instead of blockchain', () => {
    renderHeader({ totalPhotoEvidenceCount: 14 });
    expect(screen.getByText('Photo-evidenced')).toBeInTheDocument();
    expect(screen.getByText(/14 photos across events/)).toBeInTheDocument();
  });

  it('withholds a claim for self-reported farms without asserting the opposite', () => {
    // This assertion used to expect "Conventional, Documented". That label was REMOVED
    // deliberately: withholding a claim and asserting the opposite are different things,
    // and a real CCOF-certified grower whose cert was not yet wired into a Certification
    // record was being shown "Conventional" above the fold to their buyers.
    // `self_reported` and `conventional` both fall through to the neutral state — we do
    // not invent a fourth state implying organic without third-party evidence, and we do
    // not assert conventional either.
    renderHeader({
      organicClaim: { status: 'self_reported' } as any,
      certifications: []
    });
    expect(screen.getByText('Practices Documented')).toBeInTheDocument();
    expect(screen.queryByText(/Conventional/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Certified Organic')).not.toBeInTheDocument();
  });
});
