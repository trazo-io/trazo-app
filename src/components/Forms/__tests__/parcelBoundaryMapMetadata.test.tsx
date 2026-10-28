/**
 * `map_metadata` follows the farm when the map never reports a camera.
 *
 * The camera the grower leaves the boundary map on is what `map_metadata` records, and only
 * the map can report it. Seeded once at mount, the record kept the placeholder centre: the
 * farm's coordinates load after the form does, and with Google Maps failing to load the map
 * never reported anything, so the parcel saved the placeholder (review on app #216).
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { StandardParcelFormTransparency } from '../StandardParcelForm_Transparency';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: false, loadError: new Error('refused key') }),
  GoogleMap: () => null,
  Polygon: () => null,
  Marker: () => null
}));
vi.mock('../../Upload', () => ({ TrazoImageUpload: () => null }));

const m = enMessages as Record<string, string>;

describe('parcel boundary: map_metadata without a map', () => {
  it("saves the farm's coordinates that arrived after the form, not the placeholder", () => {
    const onSubmit = vi.fn();
    const form = (coords?: { lat: number; lng: number }) => (
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en" messages={m} onError={() => undefined}>
          <StandardParcelFormTransparency
            onSubmit={onSubmit}
            onCancel={() => undefined}
            isEdit
            initialStep={1}
            saveFromBoundary
            establishmentCoordinates={coords}
            initialData={{ name: 'North', area: 4, transparency_description: '' }}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    const { rerender } = render(form());
    expect(screen.getByText(m['parcel.boundary.mapError'])).toBeInTheDocument();
    rerender(form({ lat: 44.54, lng: -123.11 }));
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.saveOutline'] }));
    expect(onSubmit.mock.calls[0][0].map_metadata.center).toEqual({ lat: 44.54, lng: -123.11 });
  });
});
