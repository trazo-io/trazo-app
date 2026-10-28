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
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { StandardParcelFormTransparency } from '../StandardParcelForm_Transparency';

const drawn = vi.hoisted(() => ({
  polygons: [] as Array<Record<string, unknown>>,
  markers: [] as Array<Record<string, any>>
}));

vi.mock('@react-google-maps/api', () => {
  const OverlayView = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  (OverlayView as any).OVERLAY_LAYER = 'overlayLayer';
  return {
    useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
    GoogleMap: ({ children }: { children?: React.ReactNode }) => (
      <div data-testid="google-map">{children}</div>
    ),
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
});
