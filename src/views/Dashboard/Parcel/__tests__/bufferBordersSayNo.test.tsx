/**
 * A border can say No, and an unanswered border stays unanswered (2026-11-06).
 *
 * CCOF ORGB49 D1 asks per border "Organic? (Y/N)" and "crop grown in buffer? (Y/N)"; OTCO C2 2.2
 * asks the crop column. The editor had a checkbox for the first (unticked read the same as never
 * answered) and only a crop-name field for the second (no way to say No).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { ChakraProvider } from '@chakra-ui/react';

import enUS from '../../../../i18n/lang/en-US.json';
import { BufferEditor } from '../ParcelApplicationWizard';
import type { BufferZoneRow } from 'store/api/parcelApplicationApi';

const renderEditor = (rows: BufferZoneRow[], onChange = vi.fn()) => {
  render(
    <ChakraProvider>
      <IntlProvider
        locale="en-US"
        messages={enUS as Record<string, string>}
        onError={() => undefined}>
        <BufferEditor rows={rows} canWrite onChange={onChange} />
      </IntlProvider>
    </ChakraProvider>
  );
  return onChange;
};

const selectFor = (label: RegExp) => {
  const text = screen.getByText(label);
  const field = text.closest('[role="group"]') ?? text.parentElement?.parentElement;
  const select = field?.querySelector('select');
  if (!select) throw new Error(`no select under ${label}`);
  return select as HTMLSelectElement;
};

describe('BufferEditor border answers', () => {
  it('shows an unanswered border as not answered, and a stated no as no', () => {
    renderEditor([
      { direction: 'North', adjoining_land_use: 'Conventional apples', adjacent_is_organic: false },
      { direction: 'South', adjoining_land_use: 'Oak woodland' }
    ]);
    const organic = screen
      .getAllByText(/Is the adjoining land certified organic\?/)
      .map(
        (t) =>
          (t.closest('[role="group"]') ?? t.parentElement?.parentElement)?.querySelector('select')
            ?.value
      );
    expect(organic).toEqual(['no', '']);
  });

  it('a no to the buffer crop clears a crop name the server would refuse beside it', () => {
    const onChange = renderEditor([{ direction: 'East', crop_grown_in_buffer: 'Alfalfa' }]);
    fireEvent.change(selectFor(/Is a crop grown in the buffer\?/), { target: { value: 'no' } });
    expect(onChange).toHaveBeenCalledWith([
      { direction: 'East', crop_grown_in_buffer: '', buffer_crop_grown: false }
    ]);
  });

  it('records the distance from prohibited-material applications in feet', () => {
    const onChange = renderEditor([
      { direction: 'West', adjoining_land_use: 'Conventional pears' }
    ]);
    const label = screen.getByText(/Distance from prohibited-material applications \(ft\)/);
    const input = (
      label.closest('[role="group"]') ?? label.parentElement?.parentElement
    )?.querySelector('input');
    fireEvent.change(input as HTMLInputElement, { target: { value: '60' } });
    expect(onChange).toHaveBeenCalledWith([
      {
        direction: 'West',
        adjoining_land_use: 'Conventional pears',
        prohibited_use_distance_ft: 60
      }
    ]);
  });
});
