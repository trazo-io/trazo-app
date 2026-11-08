/**
 * What WSDA's AGR 2519 asks of a facility another operation runs, that its record does not hold:
 * street address, zip, the form's activities, and for a third party with no certificate number, how
 * it is exempt (§ 205.101).
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';
import FacilityAgr2519Editor from '../FacilityAgr2519Editor';

const update = vi.fn();
vi.mock('store/api/postHarvestFacilityApi', () => ({
  useUpdatePostHarvestFacilityMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => update(...a) }),
    { isLoading: false }
  ]
}));

const facility = (over: Record<string, unknown> = {}) =>
  ({
    id: 4,
    public_id: 'x',
    name: 'Valley Cold Storage',
    facility_type: 'cold_storage',
    facility_type_display: 'Cold Storage',
    role: 'storage',
    role_display: 'Stores the crop only',
    operated_by: 'another_operation',
    is_own: false,
    verification_status: 'pending',
    verification_status_display: 'Pending',
    is_verified: false,
    cert_is_current: null,
    address: '',
    postal_code: '',
    activities: [],
    exemption_basis: '',
    certification_number: '',
    ...over
  } as never);

const renderEditor = (f = facility()) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <FacilityAgr2519Editor facility={f} companyId="1" farmId="2" />
      </IntlProvider>
    </ChakraProvider>
  );

describe('FacilityAgr2519Editor', () => {
  beforeEach(() => update.mockReset().mockResolvedValue({}));

  it("saves the activities in the form's order, whatever order they were ticked in", async () => {
    renderEditor();
    fireEvent.click(screen.getByLabelText('Storage of bulk, unpackaged organic products'));
    fireEvent.click(screen.getByLabelText('Pre-sizing, sorting, hydrocooling crops'));
    fireEvent.change(screen.getByLabelText('Zip code'), { target: { value: '98801' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].data).toEqual({
      address: '',
      postal_code: '98801',
      activities: ['presizing_sorting_hydrocooling', 'bulk_storage'],
      exemption_basis: ''
    });
  });

  it('asks how a third party with no certificate number is exempt', () => {
    renderEditor();
    expect(
      screen.getByLabelText('How this third party is exempt from certification')
    ).toBeInTheDocument();
  });

  it('does not ask it of a certified third party, and does not send it', async () => {
    renderEditor(facility({ certification_number: 'WSDA-1234' }));
    expect(screen.queryByLabelText('How this third party is exempt from certification')).toBeNull();
    fireEvent.click(screen.getByLabelText('Record storage'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0].data).not.toHaveProperty('exemption_basis');
  });

  it('shows the four groups of the form', () => {
    renderEditor();
    for (const legend of [
      'General activities',
      'Production activities',
      'Handling activities that are potentially exempt',
      'Handling activities that require certification'
    ]) {
      expect(screen.getByText(legend)).toBeInTheDocument();
    }
  });
});
