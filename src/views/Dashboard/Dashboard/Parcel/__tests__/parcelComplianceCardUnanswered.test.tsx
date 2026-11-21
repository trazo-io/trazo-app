/**
 * The parcel's compliance card does not turn an unanswered treated-lumber question into "No"
 * (first-run audit, 2026-11-21). The backend field is null until the parcel application answers it.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('store/api/productApi', () => ({
  useUpdateParcelComplianceMutation: () => [vi.fn(), { isLoading: false }]
}));
vi.mock('hooks/useMeasurementSystem', () => ({ useFarmState: () => 'WA' }));

const { default: ParcelComplianceCard } = await import('../ParcelComplianceCard');

const LABEL = 'Treated lumber present (7 CFR 205.206(f))';

const renderCard = (treated: boolean | null) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <ParcelComplianceCard
          companyId="1"
          farmId="2"
          parcelId={3}
          parcel={{ name: 'Block B', treated_lumber_present: treated }}
          canWrite
        />
      </IntlProvider>
    </ChakraProvider>
  );

/** The value printed beside the treated-lumber label. */
const valueBeside = (): string => {
  const label = screen.queryByText(LABEL);
  expect(label, 'premise: the treated-lumber row is drawn').not.toBeNull();
  return label?.parentElement?.textContent?.replace(LABEL, '').trim() ?? '';
};

describe('ParcelComplianceCard: treated lumber', () => {
  it('says "Not answered" for a parcel whose application has not answered it', () => {
    renderCard(null);
    expect(valueBeside()).toBe('Not answered');
  });

  it('still says No for an answered No', () => {
    renderCard(false);
    expect(valueBeside()).toBe('No');
  });
});
