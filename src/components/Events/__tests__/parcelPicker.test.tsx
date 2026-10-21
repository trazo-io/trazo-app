/**
 * The parcel picker: one selection, two ways to make it (List and Map).
 *
 * jsdom has no Google Maps, so the loader reports ready and each outline renders as a stub that
 * records whether it is clickable; the name pills render for real (they are the second tap target).
 * What is under test is the picker's contract: List is the default and the accessible path, both
 * modes edit the same selection, a parcel the server would refuse cannot be picked on either, a
 * parcel without an outline is pickable only in the List, and a map that cannot load falls back
 * to the List and says so.
 */
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enUS from '../../../i18n/lang/en-US.json';
import type { ParcelGeometry } from '../../../store/api/parcelGeometryApi';
import { ParcelPicker, type PickerParcel } from '../ParcelPicker';

const loader = vi.hoisted(() => ({ key: 'test-key' }));

vi.mock('components/Map/mapsLoaderOptions', () => ({
  googleMapsLoaderOptions: () => ({ googleMapsApiKey: loader.key, language: 'en', region: 'US' })
}));

vi.mock('@react-google-maps/api', () => {
  const OverlayView = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  (OverlayView as any).OVERLAY_MOUSE_TARGET = 'overlayMouseTarget';
  return {
    useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
    GoogleMap: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="google-map">{children}</div>
    ),
    Polygon: ({ options, onClick }: { options: { clickable: boolean }; onClick?: () => void }) => (
      <div data-testid="outline" data-clickable={String(options.clickable)} onClick={onClick} />
    ),
    OverlayView
  };
});

const SQUARE = [
  { lat: 1, lng: 1 },
  { lat: 1, lng: 2 },
  { lat: 2, lng: 2 }
];

const PARCELS: PickerParcel[] = [
  { id: 1, name: 'North', area: 5, open_season_count: 1 },
  { id: 2, name: 'South', area: 3, open_season_count: 1 },
  { id: 3, name: 'Closed', area: 2, open_season_count: 0 },
  { id: 4, name: 'Unmapped', area: 1, open_season_count: 1 }
];

const geo = (id: number, name: string, path: typeof SQUARE | null): ParcelGeometry => ({
  id,
  name,
  area: 1,
  path,
  has_boundary: !!path,
  center: null,
  open_season_count: 1,
  known_block_ids: []
});

const GEOMETRY = [
  geo(1, 'North', SQUARE),
  geo(2, 'South', SQUARE),
  geo(3, 'Closed', SQUARE),
  geo(4, 'Unmapped', null)
];

const Harness = ({
  geometry = GEOMETRY,
  onIds
}: {
  geometry?: ParcelGeometry[];
  onIds?: (ids: number[]) => void;
}) => {
  const [ids, setIds] = useState<number[]>([]);
  return (
    <ChakraProvider>
      <IntlProvider locale="en-US" messages={enUS}>
        <ParcelPicker
          parcels={PARCELS}
          geometry={geometry}
          originParcelId={1}
          selectedIds={ids}
          onChange={(next) => {
            setIds(next);
            onIds?.(next);
          }}
          legend="Parcels on this farm"
        />
      </IntlProvider>
    </ChakraProvider>
  );
};

describe('ParcelPicker', () => {
  it('opens on the List, the accessible path', () => {
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Parcels on this farm' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('offers no Map when no parcel has an outline', () => {
    render(<Harness geometry={[geo(1, 'North', null)]} />);
    expect(screen.queryByRole('button', { name: 'Map' })).not.toBeInTheDocument();
  });

  it('a tap on the map and a tick in the list edit the same selection', async () => {
    let last: number[] = [];
    render(<Harness onIds={(ids) => (last = ids)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await waitFor(() => expect(screen.getByTestId('google-map')).toBeInTheDocument());

    fireEvent.click(screen.getByText('South'));
    expect(last).toEqual([2]);
    expect(screen.getByText('2 parcels selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'List' }));
    expect(screen.getByRole('checkbox', { name: /South/ })).toBeChecked();
  });

  it('a parcel the server would refuse cannot be picked on the map either', async () => {
    let last: number[] = [];
    render(<Harness onIds={(ids) => (last = ids)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    await waitFor(() => expect(screen.getAllByTestId('outline')).toHaveLength(3));
    // North is the origin (locked), Closed has no open season: only South is clickable.
    expect(screen.getAllByTestId('outline').map((o) => o.getAttribute('data-clickable'))).toEqual([
      'false',
      'true',
      'false'
    ]);
    fireEvent.click(screen.getByText('Closed'));
    expect(last).toEqual([]);
  });

  it('says how many parcels have no outline and can only be picked in the List', async () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(
      await screen.findByText('1 parcel has no outline on file: pick it in List.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Unmapped')).not.toBeInTheDocument();
  });

  it('falls back to the List and says so when the map cannot load', async () => {
    loader.key = '';
    try {
      render(<Harness />);
      fireEvent.click(screen.getByRole('button', { name: 'Map' }));
      expect(
        await screen.findByText('The map could not load. Pick the parcels in the list.')
      ).toBeInTheDocument();
      expect(screen.getByRole('group', { name: 'Parcels on this farm' })).toBeInTheDocument();
    } finally {
      loader.key = 'test-key';
    }
  });
});
