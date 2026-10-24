/**
 * Removed acreage carries its reason and its map (WSDA AGR 2516, expert read of 2026-10-24).
 *
 * The backend refuses a new field-removal notice without `removal_reason`; the panel asks for it
 * only for that category, names it while it is missing, and sends a chosen file as the notice's
 * `supporting_document`, which now ships in the renewal packet.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

const createMock = vi.fn(() => ({ unwrap: () => Promise.resolve({ id: 9 }) }));
let notifications: any[] = [];

vi.mock('store/api/ospApi', () => ({
  useGetOSPChangeNotificationsQuery: () => ({ data: notifications }),
  useCreateOSPChangeNotificationMutation: () => [createMock, { isLoading: false }],
  useDeleteOSPChangeNotificationMutation: () => [vi.fn(), { isLoading: false }]
}));

vi.mock('react-redux', async () => {
  const actual: any = await vi.importActual('react-redux');
  return {
    ...actual,
    useSelector: (sel: any) =>
      sel({ company: { currentCompany: { id: 1, establishments: [{ id: 2, parcels: [] }] } } })
  };
});

import OSPChangeNotificationsPanel from '../OSPChangeNotificationsPanel';

const osp: any = { id: 46, version_number: 5, status: 'active' };

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" onError={() => {}}>
        <MemoryRouter>
          <OSPChangeNotificationsPanel companyId="1" farmId="2" osp={osp} />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

const chooseCategory = (value: string) =>
  fireEvent.change(document.querySelectorAll('select')[0], { target: { value } });

describe('field removal notice', () => {
  beforeEach(() => {
    createMock.mockClear();
    notifications = [];
  });

  it('asks why only for a removal, and holds the button until it is given', () => {
    renderPanel();
    chooseCategory('acreage_field_addition');
    expect(screen.queryByText('Why did this acreage leave organic production?')).toBeNull();

    chooseCategory('field_removal');
    fireEvent.change(document.querySelectorAll('textarea')[0], {
      target: { value: '5 acres of Block C left organic production.' }
    });
    expect(
      screen.getAllByText(/Why did this acreage leave organic production\?/).length
    ).toBeGreaterThan(0);
    expect(screen.getByText('Record change notification').closest('button')).toBeDisabled();
    expect(
      screen.getByText(/Still needed: Why did this acreage leave organic production\?/)
    ).toBeTruthy();
  });

  it('sends the reason and the map with the notice', async () => {
    renderPanel();
    chooseCategory('field_removal');
    const [description, reason] = Array.from(document.querySelectorAll('textarea'));
    fireEvent.change(description, {
      target: { value: '5 acres of Block C left organic production.' }
    });
    fireEvent.change(reason, { target: { value: ' Converted to conventional. ' } });
    const map = new File(['%PDF'], 'block-c-map.pdf', { type: 'application/pdf' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [map] } });
    fireEvent.click(screen.getByText('Record change notification'));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const sent = (createMock.mock.calls[0] as any)[0].data;
    expect(sent.change_category).toBe('field_removal');
    expect(sent.removal_reason).toBe('Converted to conventional.');
    expect(sent.supporting_document).toBe(map);
  });

  it('shows the reason and the attached file on a recorded notice', () => {
    notifications = [
      {
        id: 1,
        change_category: 'field_removal',
        change_category_display: 'Removed a field — § 205.400(f)(2)',
        description: '5 acres of Block C left organic production.',
        removal_reason: 'Transferred to another grower.',
        supporting_document: 'https://example.test/signed/map.pdf',
        date_notified: '2026-09-01',
        method: 'written',
        documentation_timing: 'submitted_at_notification',
        certifier_acknowledged_at: null,
        cfr_reference: '§ 205.400(f)(2)',
        is_immediate: false,
        parcel: null,
        parcel_name: null
      }
    ];
    renderPanel();
    expect(screen.getByText('Why removed: Transferred to another grower.')).toBeTruthy();
    expect(screen.getByText('Document attached')).toBeTruthy();
  });
});
