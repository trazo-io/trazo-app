/**
 * The parcel page's current-season timeline (2026-11-06): month groups, newest first, one line
 * per activity, the latest six and a link to the whole season, and no carbon figure in the list.
 *
 * It replaced EnhancedTimelineRow cards inside a 450px scroll box (about two visible at once).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../../i18n/lang/en-US.json';
import SeasonActivityList, { SeasonEvent } from '../SeasonActivityList';

const ev = (id: number, date: string, event_type = 1, description = `Note ${id}\nmore`) =>
  ({ id, date, event_type, description, type: 'XX' } as SeasonEvent);

const events: SeasonEvent[] = [
  ev(1, '2026-07-02T07:00:00Z'),
  ev(2, '2026-08-28T13:45:00Z', 6),
  ev(3, '2026-07-16T06:00:00Z', 2),
  ev(4, '2026-08-12T08:00:00Z'),
  ev(5, '2026-06-20T07:00:00Z'),
  ev(6, '2026-08-20T05:00:00Z'),
  ev(7, '2026-07-24T07:00:00Z'),
  ev(8, '2026-06-25T07:00:00Z')
];

const wrap = (onOpen = vi.fn(), flaggedPicks: { manure: number[]; phi: number[] } | null = null) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
        <MemoryRouter>
          <SeasonActivityList
            events={events}
            onOpen={onOpen}
            allActivitiesPath="/admin/dashboard/farm/1/activities?parcel=2&view=list"
            flaggedPicks={flaggedPicks}
          />
        </MemoryRouter>
      </IntlProvider>
    </ChakraProvider>
  );

describe('season timeline', () => {
  it('flags a pick inside a raw-manure interval on its row, and only crop-work rows', () => {
    // VID-03 (2026-11-16): once the save toast closed, the pick's row read like any other.
    // Pick ids are crop-work (ProductionEvent) ids, so a pest record numbered 2 is not the pick 2.
    wrap(vi.fn(), { manure: [6], phi: [2] });
    const rows = screen.getAllByTestId('activity-timeline-row');
    const flagged = rows.filter((r) => r.querySelector('[data-testid="activity-timeline-flag"]'));
    expect(flagged).toHaveLength(1);
    expect(flagged[0].textContent).toContain('Aug 20');
    expect(flagged[0].textContent).toContain(enUS['harvestInterval.row.manure']);
  });

  it('flags nothing when the season sent no list', () => {
    wrap();
    expect(screen.queryAllByTestId('activity-timeline-flag')).toHaveLength(0);
  });

  it('groups by month, newest month and newest activity first', () => {
    wrap();
    const months = screen.getAllByTestId('activity-timeline-month');
    expect(months.map((m) => m.querySelector('p')?.textContent)).toEqual([
      'August 2026',
      'July 2026'
    ]);
    const augustDates = within(months[0])
      .getAllByTestId('activity-timeline-row')
      .map((r) => r.querySelector('p')?.textContent);
    expect(augustDates).toEqual(['Aug 28', 'Aug 20', 'Aug 12']);
  });

  it('shows the latest six and links to the whole season on the Activities page', () => {
    // At 100 activities neither an inner scroll box nor expanding in place works: the card is a
    // summary, the Activities page (search, filters, calendar) holds the season.
    wrap();
    expect(screen.getAllByTestId('activity-timeline-row')).toHaveLength(6);
    const link = screen.getByRole('link', { name: /See all 8 activities/ });
    expect(link.getAttribute('href')).toBe('/admin/dashboard/farm/1/activities?parcel=2&view=list');
  });

  it('puts the category and only the first line of the notes under the title', () => {
    wrap();
    const first = screen.getAllByTestId('activity-timeline-row')[0];
    expect(first.textContent).toContain('Note 2');
    expect(first.textContent).not.toContain('more');
    expect(first.textContent).not.toMatch(/CO₂|CO2|kg/);
  });

  it('opens the activity it was tapped on', () => {
    const onOpen = vi.fn();
    wrap(onOpen);
    fireEvent.click(screen.getAllByTestId('activity-timeline-row')[0]);
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('keeps two activities that share an id but not a type', () => {
    // Each event model numbers its own rows; keyed on id alone, React drops one of these.
    const clash = [
      ev(1, '2026-08-02T07:00:00Z', 0, 'Rain'),
      ev(1, '2026-08-03T07:00:00Z', 5, 'Soil')
    ];
    const errors: string[] = [];
    const spy = vi.spyOn(console, 'error').mockImplementation((m) => errors.push(String(m)));
    render(
      <ChakraProvider>
        <IntlProvider locale="en-US" messages={enUS as Record<string, string>}>
          <MemoryRouter>
            <SeasonActivityList events={clash} onOpen={vi.fn()} allActivitiesPath="/a" />
          </MemoryRouter>
        </IntlProvider>
      </ChakraProvider>
    );
    spy.mockRestore();
    expect(screen.getAllByTestId('activity-timeline-row')).toHaveLength(2);
    expect(errors.filter((m) => /same key/i.test(m))).toEqual([]);
  });
});
