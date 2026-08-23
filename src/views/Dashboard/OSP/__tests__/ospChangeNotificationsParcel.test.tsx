/**
 * A § 205.400(f) notice can name its parcel, and filing one says what to update next.
 *
 * "West buffer on Home Field West widened to 45 ft" was filed on this panel while the parcel's
 * own application went on printing 30 ft — the notice and the record never met. The panel now
 * offers the farm's parcels (optional), sends the chosen one as `parcel`, shows it on the filed
 * row, and after filing names the record to update for that category, with a link to the parcel
 * application when one was named. Nothing is written to the record from the notice.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
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
      sel({
        company: {
          currentCompany: {
            id: 1,
            establishments: [
              {
                id: 2,
                parcels: [
                  { id: 105, name: 'Home Field West' },
                  { id: 106, name: 'River Block' }
                ]
              }
            ]
          }
        }
      })
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

describe('change notification ↔ parcel', () => {
  it('offers the farm’s parcels and sends the chosen one with the notice', async () => {
    renderPanel();
    const parcelSelect = screen.getByTestId('osp-cn-parcel') as HTMLSelectElement;
    expect(Array.from(parcelSelect.options).map((o) => o.textContent)).toEqual(
      expect.arrayContaining(['Home Field West', 'River Block'])
    );

    // category is the first select on the form
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'practice_input_procedure_change' } });
    fireEvent.change(document.querySelector('textarea')!, {
      target: { value: 'West buffer widened from 30 ft to 45 ft.' }
    });
    fireEvent.change(parcelSelect, { target: { value: '105' } });
    fireEvent.click(screen.getByText('Record change notification'));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const sent = (createMock.mock.calls[0] as any)[0].data;
    expect(sent.parcel).toBe(105);
    expect(sent.change_category).toBe('practice_input_procedure_change');
  });

  it('after filing, names the record to update and links the parcel application', async () => {
    renderPanel();
    const selects = document.querySelectorAll('select');
    fireEvent.change(selects[0], { target: { value: 'practice_input_procedure_change' } });
    fireEvent.change(document.querySelector('textarea')!, { target: { value: 'Buffer widened.' } });
    fireEvent.change(screen.getByTestId('osp-cn-parcel'), { target: { value: '105' } });
    fireEvent.click(screen.getByText('Record change notification'));

    const next = await screen.findByTestId('osp-cn-next-step');
    expect(next.textContent).toContain('Now make the plan say the same thing');
    expect(next.textContent).toContain('buffer rows, materials list, rotation');
    const link = next.querySelector('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/2/parcel/105/application');
  });

  it('shows the parcel on a filed notice', () => {
    notifications = [
      {
        id: 1,
        change_category: 'practice_input_procedure_change',
        change_category_display: 'Practice / input / procedure change — § 205.400(f)(2)',
        description: 'West buffer widened from 30 ft to 45 ft.',
        date_notified: '2028-01-14',
        method: 'written',
        documentation_timing: 'submitted_at_notification',
        certifier_acknowledged_at: null,
        cfr_reference: '§ 205.400(f)(2)',
        is_immediate: false,
        parcel: 105,
        parcel_name: 'Home Field West'
      }
    ];
    renderPanel();
    expect(screen.getAllByText('Home Field West').length).toBeGreaterThan(1); // badge + select option
  });
});
