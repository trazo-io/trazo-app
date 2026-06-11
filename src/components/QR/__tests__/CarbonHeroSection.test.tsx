/**
 * Phase 1 claim-safety regression tests for the consumer hero.
 *
 * The numeric score + letter grade were removed from the hero (self-created
 * sustainability label — FTC 16 CFR 260.6(d) / EU ECGT exposure). The badge
 * now leads with the OID-verified certification, falling back to the factual
 * practices count. These tests pin that behavior.
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { CarbonHeroSection } from '../CarbonHeroSection';

const baseProps = {
  carbonData: { score: 100, footprint: 21.5, level: 'transparency' },
  productData: {
    name: 'Orange',
    company: { name: 'Coastal Valleys Farm' }
  },
  isLoading: false
};

const renderHero = (props: Record<string, unknown> = {}) =>
  render(
    <ChakraProvider>
      <CarbonHeroSection {...(baseProps as any)} {...props} />
    </ChakraProvider>
  );

describe('CarbonHeroSection (claim-safe hero badge)', () => {
  it('renders the certification badge with certifier and practices count', () => {
    renderHero({ certifiedLabel: 'Certified Organic', certifierName: 'CCOF', practicesCount: 20 });
    expect(screen.getByText('Certified Organic')).toBeInTheDocument();
    expect(screen.getByText('by CCOF')).toBeInTheDocument();
    expect(screen.getByText('20 practices documented')).toBeInTheDocument();
  });

  it('never renders a numeric score or letter grade', () => {
    renderHero({ certifiedLabel: 'Certified Organic', certifierName: 'CCOF', practicesCount: 20 });
    expect(screen.queryByText('100')).not.toBeInTheDocument();
    expect(screen.queryByText('A+')).not.toBeInTheDocument();
  });

  it('falls back to the practices count when not certified', () => {
    renderHero({ certifiedLabel: null, practicesCount: 20 });
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('practices documented')).toBeInTheDocument();
    expect(screen.queryByText('A+')).not.toBeInTheDocument();
  });

  it('renders lot and harvest date in the product line', () => {
    renderHero({
      certifiedLabel: 'Certified Organic',
      practicesCount: 20,
      lotId: 'ORA-2024-001',
      harvestDate: '2026-03-18T00:00:00Z'
    });
    expect(screen.getByText(/Lot ORA-2024-001/)).toBeInTheDocument();
    expect(screen.getByText(/Harvested Mar 1[78], 2026/)).toBeInTheDocument();
  });

  it('uses neutral narrative copy — no "Open Book Farm" completeness claims', () => {
    renderHero({ certifiedLabel: 'Certified Organic', practicesCount: 20 });
    expect(screen.queryByText(/Open Book Farm/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/you can see it all/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Documented growing story/i)).toBeInTheDocument();
  });
});
