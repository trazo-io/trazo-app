/**
 * The parcel page's application card names what the parcel form still needs (2026-11-06).
 *
 * It replaced a solid green header button whose label concatenated its own status ("Parcel
 * Application · In progress (1)") and kept the missing items in a hover-only tooltip.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import enUS from '../../../../../i18n/lang/en-US.json';
import ParcelApplicationCard from '../ParcelApplicationCard';

const wrap = (ui: React.ReactElement) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter>{ui}</MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('parcel application card', () => {
  it('lists each missing block of the parcel form as its own row', () => {
    wrap(
      <ParcelApplicationCard
        farmId={1}
        parcelId={2}
        status="in_progress"
        missing={['map', 'land_history']}
      />
    );
    const list = screen.getByTestId('parcel-application-missing');
    expect(list.textContent).toContain('Field map');
    expect(list.textContent).toContain('3 years of land history');
    expect(screen.getByText('In progress')).toBeTruthy();
    const link = screen.getByRole('link', { name: /Open the parcel application/ });
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/1/parcel/2/application');
  });

  it('shows the evidence still outstanding WITH the answers, never the answers alone', () => {
    wrap(
      <ParcelApplicationCard
        farmId={1}
        parcelId={2}
        status="complete"
        missing={[]}
        evidenceStatus="outstanding"
        evidenceMissing={[{}]}
      />
    );
    const card = screen.getByTestId('parcel-application-card');
    expect(card.textContent).toContain('Answers complete');
    expect(card.textContent).toContain('1 evidence item');
  });

  it('offers to start an application that has not begun', () => {
    wrap(<ParcelApplicationCard farmId={1} parcelId={2} status="not_started" missing={['map']} />);
    expect(screen.getByRole('link', { name: /Start the parcel application/ })).toBeTruthy();
  });
});
