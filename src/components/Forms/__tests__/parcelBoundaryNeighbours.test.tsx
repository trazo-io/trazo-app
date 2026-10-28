/**
 * The boundary step, opened from the parcel page's "Edit outline" shortcut.
 *
 * It opens straight on the map (`initialStep`), and the farm's other parcels are drawn on it,
 * read-only, with their names, so an outline is placed against its neighbours rather than
 * guessed from memory. A neighbour takes no clicks: a click on it must still add a point to the
 * outline being drawn, or drawing next to a neighbour would be impossible.
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { StandardParcelFormTransparency } from '../StandardParcelForm_Transparency';

const drawn = vi.hoisted(() => ({
  polygons: [] as Array<Record<string, unknown>>,
  markers: [] as Array<Record<string, any>>,
  maps: [] as Array<Record<string, any>>
}));

vi.mock('@react-google-maps/api', () => {
  const OverlayView = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  (OverlayView as any).OVERLAY_LAYER = 'overlayLayer';
  return {
    useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
    GoogleMap: (props: Record<string, any>) => {
      drawn.maps.push(props);
      return <div data-testid="google-map">{props.children}</div>;
    },
    Polygon: (props: { options?: Record<string, unknown> }) => {
      drawn.polygons.push(props.options ?? {});
      return null;
    },
    Marker: (props: Record<string, any>) => {
      drawn.markers.push(props);
      return null;
    },
    OverlayView
  };
});
vi.mock('../../Upload', () => ({ TrazoImageUpload: () => null }));
// The corner handles build their icon from `google.maps.Size` / `Point` once a corner exists.
(window as any).google = { maps: { Size: class {}, Point: class {} } };

const m = enMessages as Record<string, string>;
const square = (lat: number) => [
  { lat, lng: 1 },
  { lat, lng: 2 },
  { lat: lat + 1, lng: 2 }
];

const renderForm = (props: Record<string, unknown>) =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en" messages={m} onError={() => undefined}>
        <StandardParcelFormTransparency
          onSubmit={() => undefined}
          onCancel={() => undefined}
          isEdit
          initialData={{ name: 'North', area: 4 }}
          {...props}
        />
      </IntlProvider>
    </ChakraProvider>
  );

describe('parcel boundary step: the farm around the outline', () => {
  it('opens on the boundary step when asked to', () => {
    renderForm({ initialStep: 1 });
    expect(screen.getByTestId('google-map')).toBeInTheDocument();
    expect(screen.getByText(m['parcel.boundary.drawHint'])).toBeInTheDocument();
  });

  it("draws the farm's other parcels with their names, and they take no clicks", () => {
    drawn.polygons = [];
    renderForm({
      initialStep: 1,
      otherParcels: [
        { id: 2, name: 'South', path: square(1) },
        { id: 3, name: 'East', path: square(3) }
      ]
    });
    expect(screen.getByText('South')).toBeInTheDocument();
    expect(screen.getByText('East')).toBeInTheDocument();
    expect(
      screen.getByText("The farm's other 2 parcels are outlined in blue, with their names.")
    ).toBeInTheDocument();
    // No outline drawn yet for North, so every polygon on the map is a neighbour (renders repeat).
    expect(drawn.polygons.length).toBeGreaterThan(0);
    expect(drawn.polygons.every((options) => options.clickable === false)).toBe(true);
  });

  it('says nothing about other parcels on a farm with none', () => {
    renderForm({ initialStep: 1 });
    expect(screen.queryByText(/other .*parcel/i)).toBeNull();
  });

  it('opened from the shortcut, the outline saves from its own step', () => {
    // A quick-added parcel has no description, and the description step blocks Continue:
    // without a save here the grower could fix the outline and never keep it.
    const onSubmit = vi.fn();
    renderForm({
      initialStep: 1,
      saveFromBoundary: true,
      onSubmit,
      initialData: {
        name: 'North',
        area: 4,
        transparency_description: '',
        polygon: square(5)
      }
    });
    expect(screen.queryByRole('button', { name: m['app.continue'] })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.saveOutline'] }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      name: 'North',
      transparency_description: '',
      polygon: square(5)
    });
  });

  it('Undo takes back a dragged corner, not just the last corner added', () => {
    // "Undo last point" removed the newest corner whatever the last change was, so a corner
    // dragged to the wrong fence had no way back but dragging it again.
    const onSubmit = vi.fn();
    drawn.markers = [];
    renderForm({
      initialStep: 1,
      saveFromBoundary: true,
      onSubmit,
      initialData: { name: 'North', area: 4, transparency_description: '', polygon: square(5) }
    });
    const undo = screen.getByRole('button', { name: m['parcel.boundary.undo'] });
    expect(undo).toBeDisabled();
    const moved = { lat: 5.5, lng: 0.5 };
    act(() => drawn.markers.slice(-3)[0].onDragEnd({ latLng: { toJSON: () => moved } }));
    expect(drawn.markers.slice(-3)[0].position).toEqual(moved);
    fireEvent.click(undo);
    expect(drawn.markers.slice(-3).map((h) => h.position)).toEqual(square(5));
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.saveOutline'] }));
    expect(onSubmit.mock.calls[0][0].polygon).toEqual(square(5));
  });

  // A 100 m square at 44.5°N: one hectare, 2.5 acres.
  const M_LAT = 1 / 111319.49;
  const M_LNG = M_LAT / Math.cos((44.5 * Math.PI) / 180);
  const hectare = (lat0: number, lng0: number) => [
    { lat: lat0, lng: lng0 },
    { lat: lat0, lng: lng0 + 100 * M_LNG },
    { lat: lat0 - 100 * M_LAT, lng: lng0 + 100 * M_LNG },
    { lat: lat0 - 100 * M_LAT, lng: lng0 }
  ];

  it('says what the outline measures, and points out a big gap with the typed area', () => {
    renderForm({
      initialStep: 1,
      // `area` is stored in hectares: 4.0469 ha = 10 acres typed on the first step.
      initialData: { name: 'North', area: 4.0469, polygon: hectare(44.5, -123.1) }
    });
    expect(screen.getByText('The outline measures 2.5 acres (1 ha).')).toBeInTheDocument();
    expect(screen.getByText(/That is 75% less than the 10 acres entered/)).toBeInTheDocument();
  });

  it('says nothing about a gap when the outline and the typed area agree', () => {
    renderForm({
      initialStep: 1,
      initialData: { name: 'North', area: 1.05, polygon: hectare(44.5, -123.1) }
    });
    expect(screen.queryByText(/than the .* acres entered/)).toBeNull();
  });

  it('names a neighbouring parcel the outline shares ground with, not one it shares a fence with', () => {
    renderForm({
      initialStep: 1,
      initialData: { name: 'North', area: 1, polygon: hectare(44.5, -123.1) },
      otherParcels: [
        { id: 2, name: 'River', path: hectare(44.5 - 50 * M_LAT, -123.1 + 50 * M_LNG) },
        { id: 3, name: 'Fence', path: hectare(44.5, -123.1 + 100 * M_LNG) }
      ]
    });
    expect(screen.getByText(/This outline overlaps River\./)).toBeInTheDocument();
    expect(screen.queryByText(/overlaps .*Fence/)).toBeNull();
  });

  it('opens the editor on full screen and comes back with Done', async () => {
    renderForm({ initialStep: 1, initialData: { name: 'North', area: 1, polygon: square(5) } });
    expect(screen.getAllByTestId('google-map')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.openFullscreen'] }));
    // The full-screen editor replaces the inline one; it is not stacked on top of it.
    expect(
      await screen.findByRole('button', { name: m['parcel.boundary.closeFullscreen'] })
    ).toBeInTheDocument();
    expect(screen.getAllByTestId('google-map')).toHaveLength(1);
    // Focus starts on Done, never on Clear boundary, where one Enter would wipe the outline.
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: m['parcel.boundary.closeFullscreen'] })
      ).toHaveFocus()
    );
    // The full-screen footer carries Undo with the status, not just the map.
    expect(screen.getAllByRole('button', { name: m['parcel.boundary.undo'] })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.closeFullscreen'] }));
    await waitFor(() => expect(screen.getAllByTestId('google-map')).toHaveLength(1));
  });

  // A map the grower has moved: what `onLoad` + `onIdle` hand the editor.
  const reportCamera = (center: { lat: number; lng: number }, zoom: number) => {
    const map = drawn.maps[drawn.maps.length - 1];
    const fake = { getCenter: () => ({ toJSON: () => center }), getZoom: () => zoom };
    act(() => {
      map.onLoad(fake);
      map.onIdle();
    });
  };

  it("records the camera the grower left the map on, over the farm's coordinates", () => {
    const onSubmit = vi.fn();
    drawn.maps = [];
    renderForm({
      initialStep: 1,
      saveFromBoundary: true,
      onSubmit,
      establishmentCoordinates: { lat: 44.54, lng: -123.11 },
      initialData: { name: 'North', area: 4, transparency_description: '' }
    });
    reportCamera({ lat: 44.6, lng: -123.2 }, 18);
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.saveOutline'] }));
    expect(onSubmit.mock.calls[0][0].map_metadata).toEqual({
      center: { lat: 44.6, lng: -123.2 },
      zoom: 18
    });
  });

  it('full screen opens where the inline map was, with no second map hidden behind it', async () => {
    drawn.maps = [];
    renderForm({ initialStep: 1, initialData: { name: 'North', area: 1 } });
    reportCamera({ lat: 44.6, lng: -123.2 }, 18);
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.openFullscreen'] }));
    // One map: the inline one is unmounted, so it cannot fit itself to the outline drawn in
    // full screen and report its own camera over the grower's.
    await waitFor(() => expect(screen.getAllByTestId('google-map')).toHaveLength(1));
    const fullscreen = drawn.maps[drawn.maps.length - 1];
    expect(fullscreen.center).toEqual({ lat: 44.6, lng: -123.2 });
    expect(fullscreen.zoom).toBe(18);
    // The grower moves the full-screen map; Done brings the inline map back THERE.
    reportCamera({ lat: 44.7, lng: -123.3 }, 17);
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.closeFullscreen'] }));
    await waitFor(() => {
      const inline = drawn.maps[drawn.maps.length - 1];
      expect(inline.center).toEqual({ lat: 44.7, lng: -123.3 });
      expect(inline.zoom).toBe(17);
    });
  });
});
