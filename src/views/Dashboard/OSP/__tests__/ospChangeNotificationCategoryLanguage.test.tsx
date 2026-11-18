/**
 * A change notification is titled in the reader's language (2026-11-17).
 *
 * Each row was titled with `change_category_display`, the backend's English label, so on es-419
 * every notice read "Prohibited-substance application/drift — § 205.400(f)(1) (IMMEDIATE)". The
 * row now takes its label from the category code, through the keys the form's select already
 * uses; a code with no key keeps the backend label instead of printing a raw key.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';

import es419 from '../../../../i18n/lang/es-419.json';

let notifications: any[] = [];

vi.mock('store/api/ospApi', () => ({
  useGetOSPChangeNotificationsQuery: () => ({ data: notifications }),
  useCreateOSPChangeNotificationMutation: () => [vi.fn(), { isLoading: false }],
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

const es = es419 as Record<string, string>;
const osp: any = { id: 46, version_number: 5, status: 'active' };

const notice = (change_category: string, change_category_display: string) => ({
  id: change_category.length,
  change_category,
  change_category_display,
  description: 'Buffer rows flagged.',
  date_notified: '2026-07-02',
  cfr_reference: '7 CFR 205.400(f)(1)',
  is_immediate: change_category === 'prohibited_substance_application',
  certifier_acknowledged_at: null,
  parcel_name: null,
  removal_reason: '',
  supporting_document: null
});

const renderPanel = () =>
  render(
    <ChakraProvider>
      <IntlProvider locale="es-419" messages={es} onError={() => {}}>
        <MemoryRouter>
          <OSPChangeNotificationsPanel companyId="1" farmId="2" osp={osp} />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('change notification titles', () => {
  it('names the category in Spanish, not the backend English', () => {
    notifications = [
      notice(
        'prohibited_substance_application',
        'Prohibited-substance application/drift — § 205.400(f)(1) (IMMEDIATE)'
      )
    ];
    renderPanel();
    const row = screen.getByTestId('change-notification-row');
    expect(row.textContent).toContain(
      es['osp.changeNotifications.category.prohibited_substance_application']
    );
    expect(row.textContent).not.toContain('IMMEDIATE');
  });

  it('keeps the backend label for a category it has no key for', () => {
    notifications = [notice('a_category_added_later', 'A category added later')];
    renderPanel();
    expect(screen.getByTestId('change-notification-row').textContent).toContain(
      'A category added later'
    );
  });
});
