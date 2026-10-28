/**
 * The farm form finds its own coordinates.
 *
 * Decimal degrees typed by hand were the only way in ("get these from Google Maps"), and a farm
 * without them opened its parcel map on a placeholder field in another state. The lookup reads
 * the address the grower already typed, or a pasted pin, and fills latitude and longitude; when
 * Google can only place the address at the middle of a town, it says so.
 */
// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { StandardFarmForm } from '../StandardFarmForm';

vi.mock('@react-google-maps/api', () => ({
  useLoadScript: () => ({ isLoaded: true, loadError: undefined })
}));
vi.mock('components/Map/mapsLoaderOptions', () => ({
  googleMapsLoaderOptions: () => ({ id: 'test', googleMapsApiKey: 'test-key' })
}));
vi.mock('../../Upload', () => ({ TrazoImageUpload: () => null }));

const asked: string[] = [];
(window as any).google = {
  maps: {
    Geocoder: class {
      geocode(req: { address: string }, cb: (r: unknown[], s: string) => void) {
        asked.push(req.address);
        cb(
          [
            {
              formatted_address: 'Tangent, OR 97389, USA',
              geometry: {
                location: { toJSON: () => ({ lat: 44.5412345678, lng: -123.1098765432 }) },
                viewport: {
                  toJSON: () => ({ north: 44.6, south: 44.5, east: -123, west: -123.2 })
                },
                location_type: 'APPROXIMATE'
              }
            }
          ],
          'OK'
        );
      }
    }
  }
};

const m = enMessages as Record<string, string>;

describe('farm form: coordinates from the address', () => {
  it('looks up the typed address, fills latitude and longitude, and flags a town-centre match', async () => {
    const onSubmit = vi.fn();
    render(
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en" messages={m} onError={() => undefined}>
          <StandardFarmForm
            onSubmit={onSubmit}
            onCancel={() => undefined}
            initialData={{
              name: 'Calapooia Bend',
              address: '33000 Riverside Dr',
              city: 'Tangent',
              state: 'OR',
              zipCode: '97389'
            }}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    fireEvent.click(screen.getAllByRole('button', { name: m['app.continue'] })[0]);

    const box = await screen.findByLabelText(m['map.search.label']);
    // Prefilled from the address above: the grower only presses Find.
    expect(box).toHaveValue('33000 Riverside Dr, Tangent, OR, 97389');
    fireEvent.click(screen.getByRole('button', { name: m['map.search.button'] }));

    await waitFor(() =>
      expect(screen.getByText('Coordinates set from Tangent, OR 97389, USA.')).toBeInTheDocument()
    );
    expect(asked).toEqual(['33000 Riverside Dr, Tangent, OR, 97389']);
    expect(screen.getByText(m['map.search.approximate'])).toBeInTheDocument();
    expect(screen.getByPlaceholderText(m['farm.form.latitude.placeholder'])).toHaveValue(
      '44.541235'
    );
    expect(screen.getByPlaceholderText(m['farm.form.longitude.placeholder'])).toHaveValue(
      '-123.109877'
    );
    // The section's own words are translated now, not hardcoded English.
    expect(screen.getByText(m['farm.form.coordinates.title'])).toBeInTheDocument();
  });
});
