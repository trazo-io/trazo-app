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
import TrustSummaryHeader, { TrustSummaryHeaderProps } from '../TrustSummaryHeader';

const renderHeader = (props: Partial<TrustSummaryHeaderProps> = {}) => {
  const defaultProps: TrustSummaryHeaderProps = {
    productName: 'Orange',
    farmName: 'Coastal Valleys Farm',
    location: 'Ventura, California',
    organicClaim: { status: 'certified_organic' } as any,
    certifications: [
      { status: 'verified_via_database', certifier_name: 'CCOF', display_name: 'USDA Organic' }
    ] as any,
    transparencyScore: 100,
    documentedEventsCount: 20,
    expectedEventsCount: 15,
    blockchainStatus: 'verified',
    totalPhotoEvidenceCount: 14,
    isLoading: false
  };
  return render(
    <ChakraProvider>
      <TrustSummaryHeader {...defaultProps} {...props} />
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

  it('reports conventional farms honestly without inventing organic states', () => {
    renderHeader({
      organicClaim: { status: 'self_reported' } as any,
      certifications: []
    });
    expect(screen.getByText('Conventional, Documented')).toBeInTheDocument();
    expect(screen.queryByText('Certified Organic')).not.toBeInTheDocument();
  });
});
