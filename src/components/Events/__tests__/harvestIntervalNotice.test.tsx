/**
 * VID-03 (recordkeeping checklist run, 2026-11-16): a pick logged 40 days after raw manure on a
 * 120-day crop was named once, in the save toast, and then nowhere. The record's detail now says
 * it, in both locales, with readable dates, the rule and what to do; a record with no conflict
 * says nothing. Rows, not boxes (2026-11-17): the facts are open, the rule and what to do fold
 * behind a link.
 */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import enUS from '../../../i18n/lang/en-US.json';
import es419 from '../../../i18n/lang/es-419.json';

const detail = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('store/api/historyApi', () => ({
  useGetEventQuery: () => ({ data: detail.data })
}));

import { HarvestIntervalNotice } from '../HarvestIntervalNotice';

const MANURE = {
  application_id: 48,
  pick_id: 228,
  applied: '2026-10-01',
  picked: '2026-11-10',
  days: 40,
  interval_days: 120,
  recorded_as: 'raw'
};
const PHI = {
  application_id: 12,
  pick_id: 228,
  product: 'Entrust SC',
  applied: '2026-11-08',
  picked: '2026-11-10',
  days: 2,
  phi_days: '3'
};

const mount = (locale: 'en-US' | 'es-419' = 'en-US') =>
  render(
    <Provider
      store={configureStore({ reducer: { company: () => ({ currentCompany: { id: 1 } }) } })}>
      <ChakraProvider>
        <IntlProvider
          locale={locale}
          messages={(locale === 'en-US' ? enUS : es419) as Record<string, string>}>
          <HarvestIntervalNotice farmId="1" eventId="228" eventType={1} />
        </IntlProvider>
      </ChakraProvider>
    </Provider>
  );

afterEach(() => {
  detail.data = undefined;
});

const allText = (container: HTMLElement) => container.textContent ?? '';

describe('HarvestIntervalNotice', () => {
  it('says on the pick which application, with readable dates, as a warning row', () => {
    detail.data = { manure_conflicts: [MANURE] };
    const { container } = mount();
    const row = screen.getByTestId('harvest-interval-manure');
    expect(row.textContent).toContain(enUS['harvestInterval.manure.title']);
    expect(
      screen.getByText(
        'Raw manure applied Oct 1, 2026: picked Nov 10, 2026, 40 days after (interval 120 days)'
      )
    ).toBeInTheDocument();
    expect(allText(container)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('folds the rule and what to do behind a link, and opens them on a tap', () => {
    detail.data = { manure_conflicts: [MANURE] };
    mount();
    expect(screen.queryByText(enUS['harvestInterval.manure.body'])).toBeNull();
    const toggle = screen.getByRole('button', { name: enUS['harvestInterval.showWhy'] });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    const body = screen.getByText(enUS['harvestInterval.manure.body']);
    expect(body.textContent).toContain('7 CFR 205.203(c)(1)');
    expect(body.textContent).toContain('correct the record');
    expect(screen.getByRole('button', { name: enUS['harvestInterval.hideWhy'] })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('says it in Spanish with Spanish dates', () => {
    detail.data = { manure_conflicts: [MANURE] };
    const { container } = mount('es-419');
    const text = allText(container);
    expect(text).toContain(es419['harvestInterval.manure.title']);
    expect(text).toContain(es419['harvestInterval.showWhy']);
    expect(text).toContain('Estiércol crudo aplicado el 1 oct 2026');
    expect(text).toContain('cosechado el 10 nov 2026');
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('names a spray inside its PHI the same way, in its own row', () => {
    detail.data = { phi_conflicts: [PHI], manure_conflicts: [] };
    mount();
    expect(screen.getByTestId('harvest-interval-phi').textContent).toContain(
      enUS['harvestInterval.phi.title']
    );
    expect(screen.queryByTestId('harvest-interval-manure')).toBeNull();
    expect(
      screen.getByText(
        'Entrust SC, applied Nov 8, 2026: picked Nov 10, 2026, 2 days after (PHI 3 days)'
      )
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: enUS['harvestInterval.showWhy'] }));
    expect(screen.getByText(enUS['harvestInterval.phi.body']).textContent).toContain(
      '7 U.S.C. § 136j(a)(2)(G)'
    );
  });

  it('gives a pick inside both one row per kind, with no wrapper of its own', () => {
    detail.data = { manure_conflicts: [MANURE], phi_conflicts: [PHI] };
    const { container } = mount();
    const manure = screen.getByTestId('harvest-interval-manure');
    const phi = screen.getByTestId('harvest-interval-phi');
    // Siblings, so the sheet's StatusList draws its hairline between them.
    expect(manure.parentElement).toBe(phi.parentElement);
    expect(manure.parentElement).toBe(container);
  });

  it('says nothing for a record with no conflict, or one that is not checked', () => {
    for (const data of [{ manure_conflicts: [], phi_conflicts: [] }, {}, undefined]) {
      detail.data = data;
      const { container, unmount } = mount();
      // ChakraProvider's own env span is the only node; the notice adds none.
      expect(container.querySelector('[data-testid^="harvest-interval"]')).toBeNull();
      expect(container.textContent).toBe('');
      unmount();
    }
  });
});
