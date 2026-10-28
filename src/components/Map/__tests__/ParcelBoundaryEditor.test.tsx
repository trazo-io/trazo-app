/**
 * The boundary editor, against the failures a farmer hit drawing a real field (2026-10-27,
 * reproduced in a browser before this was rebuilt; see the header of ParcelBoundaryEditor):
 * the map jumped after the third corner, two stacked sets of handles disagreed about where a
 * corner was, and a tap on a corner deleted it.
 *
 * jsdom has no Google Maps, so the map pieces are stand-ins that record their props and hand
 * back their handlers: the test plays the map's role, calling `onClick` / `onDragEnd` with the
 * positions Google would report.
 */
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import theme from '../../../theme/theme';
import enMessages from '../../../i18n/lang/en-US.json';
import { ParcelBoundaryEditor } from '../ParcelBoundaryEditor';
import type { LatLng } from 'utils/parcelPolygon';

type Props = Record<string, any>;
const seen = vi.hoisted(() => ({
  maps: [] as Props[],
  polygons: [] as Props[],
  markers: [] as Props[]
}));

vi.mock('@react-google-maps/api', () => {
  const OverlayView = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  (OverlayView as any).OVERLAY_LAYER = 'overlayLayer';
  return {
    GoogleMap: (props: Props) => {
      seen.maps.push(props);
      return <div data-testid="google-map">{props.children}</div>;
    },
    Polygon: (props: Props) => {
      seen.polygons.push(props);
      return null;
    },
    Marker: (props: Props) => {
      seen.markers.push(props);
      return null;
    },
    OverlayView
  };
});

(window as any).google = { maps: { Size: class {}, Point: class {} } };

const m = enMessages as Record<string, string>;
const at = (p: LatLng) => ({ latLng: { toJSON: () => p } });
const field: LatLng[] = [
  { lat: 44.541, lng: -123.111 },
  { lat: 44.541, lng: -123.109 },
  { lat: 44.539, lng: -123.109 },
  { lat: 44.539, lng: -123.111 }
];

// The parent's side of the contract: it stores whatever `onChange` hands it.
const Harness = ({ start, onChange }: { start: LatLng[]; onChange?: (p: LatLng[]) => void }) => {
  const [path, setPath] = React.useState(start);
  return (
    <ParcelBoundaryEditor
      path={path}
      onChange={(next) => {
        onChange?.(next);
        setPath(next);
      }}
      center={{ lat: 44.54, lng: -123.11 }}
    />
  );
};

const renderEditor = (start: LatLng[], onChange?: (p: LatLng[]) => void) =>
  render(
    <ChakraProvider theme={theme}>
      <IntlProvider locale="en" messages={m} onError={() => undefined}>
        <Harness start={start} onChange={onChange} />
      </IntlProvider>
    </ChakraProvider>
  );

const lastMap = () => seen.maps[seen.maps.length - 1];
// The handles of the latest render: one per corner.
const handles = (count: number) => seen.markers.slice(-count);
const ownOutline = () => seen.polygons.filter((p) => p.options?.zIndex === 1).pop() as Props;

beforeEach(() => {
  seen.maps = [];
  seen.polygons = [];
  seen.markers = [];
});

describe('ParcelBoundaryEditor', () => {
  it('never moves the camera itself while corners are added', () => {
    renderEditor([]);
    const { center, zoom } = lastMap();
    act(() => lastMap().onClick(at(field[0])));
    act(() => lastMap().onClick(at(field[1])));
    act(() => lastMap().onClick(at(field[2])));
    act(() => lastMap().onClick(at(field[3])));
    // Same object, same number: `@react-google-maps` re-applies a prop only when it changes.
    expect(lastMap().center).toBe(center);
    expect(lastMap().zoom).toBe(zoom);
    expect(zoom).toBeGreaterThanOrEqual(16);
  });

  it('has ONE set of corner handles: the outline only draws', () => {
    renderEditor(field);
    expect(ownOutline().options).toMatchObject({
      editable: false,
      draggable: false,
      clickable: false
    });
    const corners = handles(4);
    expect(corners.every((h) => h.draggable === true)).toBe(true);
    expect(corners.map((h) => h.position)).toEqual(field);
  });

  it('shows the first edge as soon as there are two corners', () => {
    renderEditor(field.slice(0, 2));
    expect(ownOutline().path).toEqual(field.slice(0, 2));
  });

  it('a tap on a corner selects it, never deletes it', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    act(() => handles(4)[1].onClick());
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Corner 2 selected. Tap the map to move it there.')).toBeVisible();
  });

  it('moves a selected corner to where the map is tapped: no dragging needed', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    act(() => handles(4)[1].onClick());
    const moved = { lat: 44.5412, lng: -123.1088 };
    act(() => lastMap().onClick(at(moved)));
    expect(onChange).toHaveBeenLastCalledWith([field[0], moved, field[2], field[3]]);
    expect(screen.queryByText(/selected\. Tap the map/)).toBeNull();
  });

  it('deletes a corner only from the selection, by the named button', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    act(() => handles(4)[3].onClick());
    fireEvent.click(screen.getByRole('button', { name: m['parcel.boundary.deleteCorner'] }));
    expect(onChange).toHaveBeenLastCalledWith(field.slice(0, 3));
  });

  it('a dragged corner moves its own handle and the outline together', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    const moved = { lat: 44.5412, lng: -123.1088 };
    act(() => handles(4)[1].onDrag(at(moved)));
    expect(ownOutline().path).toEqual([field[0], moved, field[2], field[3]]);
    act(() => handles(4)[1].onDragEnd(at(moved)));
    expect(onChange).toHaveBeenLastCalledWith([field[0], moved, field[2], field[3]]);
    expect(handles(4)[1].position).toEqual(moved);
  });

  it('refuses a drag that would cross the outline, and says so', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    // NE dragged below the south edge: NW-NE would cut across SE-SW.
    act(() => handles(4)[1].onDragEnd(at({ lat: 44.538, lng: -123.11 })));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(m['parcel.boundary.crossRefused']);
    expect(ownOutline().path).toEqual(field);
  });

  it('puts a corner tapped beside an edge into that edge', () => {
    const onChange = vi.fn();
    renderEditor(field, onChange);
    const north = { lat: 44.5415, lng: -123.11 };
    act(() => lastMap().onClick(at(north)));
    expect(onChange).toHaveBeenLastCalledWith([field[0], north, field[1], field[2], field[3]]);
  });
});
