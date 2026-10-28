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
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  (window as any).google = { maps: { Size: class {}, Point: class {} } };
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

  it('snaps a corner tapped beside a neighbouring parcel onto its corner', () => {
    const onChange = vi.fn();
    const neighbour = [
      { lat: 44.541, lng: -123.109 },
      { lat: 44.541, lng: -123.107 },
      { lat: 44.539, lng: -123.107 },
      { lat: 44.539, lng: -123.109 }
    ];
    render(
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en" messages={m} onError={() => undefined}>
          <ParcelBoundaryEditor
            path={[]}
            onChange={onChange}
            neighbours={[{ id: 9, name: 'East', path: neighbour }]}
            center={{ lat: 44.54, lng: -123.11 }}
            zoom={17}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    // About 3 m from the neighbour's NW corner: well inside 14 px at zoom 17 (~0.85 m/px).
    act(() => lastMap().onClick(at({ lat: 44.54102, lng: -123.10903 })));
    const [placed] = onChange.mock.calls[0][0];
    expect(placed.lat).toBeCloseTo(44.541, 9);
    expect(placed.lng).toBeCloseTo(-123.109, 9);
  });

  it('has no Google fullscreen (it hid Undo); one finger moves the map only in full screen', () => {
    renderEditor(field);
    expect(lastMap().options).toMatchObject({
      fullscreenControl: false,
      gestureHandling: 'cooperative'
    });
    seen.maps = [];
    render(
      <ChakraProvider theme={theme}>
        <IntlProvider locale="en" messages={m} onError={() => undefined}>
          <ParcelBoundaryEditor
            fullscreen
            path={field}
            onChange={() => undefined}
            center={{ lat: 44.54, lng: -123.11 }}
          />
        </IntlProvider>
      </ChakraProvider>
    );
    expect(lastMap().options).toMatchObject({
      fullscreenControl: false,
      gestureHandling: 'greedy'
    });
  });

  describe('finding the farm', () => {
    // The parts of a google.maps.Map the editor moves.
    const fakeMap = () => ({
      fitBounds: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      getZoom: () => 4,
      getCenter: () => ({ toJSON: () => ({ lat: 0, lng: 0 }) })
    });
    const geocoded: string[] = [];
    const withGeocoder = (status: string) => {
      geocoded.length = 0;
      (window as any).google = {
        maps: {
          Size: class {},
          Point: class {},
          event: { addListenerOnce: vi.fn() },
          LatLngBounds: class {
            extend() {}
          },
          Geocoder: class {
            geocode(req: { address: string }, cb: (r: unknown[], s: string) => void) {
              geocoded.push(req.address);
              cb(
                status === 'OK'
                  ? [
                      {
                        formatted_address: 'Tangent, OR, USA',
                        geometry: {
                          location: { toJSON: () => ({ lat: 44.54, lng: -123.1 }) },
                          viewport: {
                            toJSON: () => ({ north: 44.6, south: 44.5, east: -123, west: -123.2 })
                          },
                          location_type: 'APPROXIMATE'
                        }
                      }
                    ]
                  : [],
                status
              );
            }
          }
        }
      };
    };
    const renderFinding = (props: Partial<React.ComponentProps<typeof ParcelBoundaryEditor>>) =>
      render(
        <ChakraProvider theme={theme}>
          <IntlProvider locale="en" messages={m} onError={() => undefined}>
            <ParcelBoundaryEditor
              path={[]}
              onChange={() => undefined}
              center={{ lat: 36.7378, lng: -119.7871 }}
              {...props}
            />
          </IntlProvider>
        </ChakraProvider>
      );

    it('a pasted Google Maps link moves the map to the pin, no geocoder involved', async () => {
      withGeocoder('REQUEST_DENIED');
      renderFinding({});
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      fireEvent.change(screen.getByLabelText(m['map.search.label']), {
        target: { value: 'https://www.google.com/maps/@44.5402,-123.1089,17z' }
      });
      fireEvent.click(screen.getByRole('button', { name: m['map.search.button'] }));
      await waitFor(() =>
        expect(map.setCenter).toHaveBeenCalledWith({ lat: 44.5402, lng: -123.1089 })
      );
      expect(map.setZoom).toHaveBeenCalledWith(17);
      expect(geocoded).toEqual([]);
    });

    it('Enter in the box searches; it never submits the form around the map', async () => {
      withGeocoder('OK');
      const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
      render(
        <ChakraProvider theme={theme}>
          <IntlProvider locale="en" messages={m} onError={() => undefined}>
            <form onSubmit={onSubmit}>
              <ParcelBoundaryEditor
                path={[]}
                onChange={() => undefined}
                center={{ lat: 0, lng: 0 }}
              />
            </form>
          </IntlProvider>
        </ChakraProvider>
      );
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      const box = screen.getByLabelText(m['map.search.label']);
      fireEvent.change(box, { target: { value: 'Tangent, OR' } });
      fireEvent.keyDown(box, { key: 'Enter' });
      await waitFor(() => expect(map.fitBounds).toHaveBeenCalled());
      expect(onSubmit).not.toHaveBeenCalled();
      expect(screen.getByText('Showing Tangent, OR, USA.')).toBeInTheDocument();
    });

    it("with no location on file, opens on the whole country and looks up the farm's address", async () => {
      withGeocoder('OK');
      renderFinding({ locationUnknown: true, farmAddress: '123 Main St, Tangent, OR, 97389' });
      // Not the placeholder field in Fresno.
      expect(lastMap().center).toEqual({ lat: 39.8283, lng: -98.5795 });
      expect(lastMap().zoom).toBe(4);
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      await waitFor(() =>
        expect(map.fitBounds).toHaveBeenCalledWith(
          { north: 44.6, south: 44.5, east: -123, west: -123.2 },
          0
        )
      );
      expect(geocoded).toEqual(['123 Main St, Tangent, OR, 97389']);
      expect(screen.queryByText(m['parcel.boundary.noFarmLocation'])).toBeNull();
    });

    it('says the farm has no location when there is no address, or it cannot be looked up', async () => {
      withGeocoder('OK');
      const { unmount } = renderFinding({ locationUnknown: true, farmAddress: '' });
      act(() => lastMap().onLoad(fakeMap()));
      expect(await screen.findByText(m['parcel.boundary.noFarmLocation'])).toBeInTheDocument();
      expect(geocoded).toEqual([]);
      unmount();

      withGeocoder('REQUEST_DENIED');
      renderFinding({ locationUnknown: true, farmAddress: 'Tangent, OR' });
      act(() => lastMap().onLoad(fakeMap()));
      expect(await screen.findByText(m['parcel.boundary.noFarmLocation'])).toBeInTheDocument();
    });

    it('full screen opened with no location still looks up the address', async () => {
      withGeocoder('OK');
      renderFinding({
        fullscreen: true,
        fitOnOpen: false,
        locationUnknown: true,
        farmAddress: 'Tangent, OR'
      });
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      await waitFor(() => expect(map.fitBounds).toHaveBeenCalled());
      expect(geocoded).toEqual(['Tangent, OR']);
    });

    it("finds one of the farm's own parcels by name, without asking Google", async () => {
      withGeocoder('OK');
      renderFinding({
        neighbours: [
          { id: 2, name: 'River Block', path: field },
          { id: 3, name: 'Home Field East', path: field }
        ]
      });
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      fireEvent.change(screen.getByLabelText(m['map.search.label']), {
        target: { value: 'river' }
      });
      // The load-time fit to the neighbours also calls fitBounds; the search's own call is the
      // one framing the parcel's outline (field's box, 20% margin) with no extra padding.
      map.fitBounds.mockClear();
      fireEvent.click(screen.getByRole('button', { name: m['map.search.button'] }));
      await waitFor(() => expect(map.fitBounds).toHaveBeenCalledTimes(1));
      const [frame, padding] = map.fitBounds.mock.calls[0];
      expect(padding).toBe(0);
      expect(frame.north).toBeCloseTo(44.5414, 6);
      expect(frame.south).toBeCloseTo(44.5386, 6);
      expect(frame.east).toBeCloseTo(-123.1086, 6);
      expect(frame.west).toBeCloseTo(-123.1114, 6);
      expect(geocoded).toEqual([]);
      expect(screen.getByText('Showing River Block, a parcel on this farm.')).toBeInTheDocument();
    });

    it('a name that matches no parcel still goes to Google', async () => {
      withGeocoder('OK');
      renderFinding({ neighbours: [{ id: 2, name: 'River Block', path: field }] });
      act(() => lastMap().onLoad(fakeMap()));
      fireEvent.change(screen.getByLabelText(m['map.search.label']), {
        target: { value: 'Calapooia' }
      });
      fireEvent.click(screen.getByRole('button', { name: m['map.search.button'] }));
      await waitFor(() => expect(geocoded).toEqual(['Calapooia']));
    });

    it('suggests your farms as you type, and picking one takes the map there', () => {
      withGeocoder('REQUEST_DENIED');
      renderFinding({
        farms: [
          { id: 1, name: 'Calapooia Bend Farm', lat: 44.54, lng: -123.11 },
          { id: 2, name: 'Willamette Orchards', lat: 44.9, lng: -123.0 }
        ]
      });
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      const box = screen.getByLabelText(m['map.search.label']);
      fireEvent.change(box, { target: { value: 'calap' } });
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('option', { name: /Calapooia Bend Farm/ }));
      expect(map.setCenter).toHaveBeenCalledWith({ lat: 44.54, lng: -123.11 });
      expect(map.setZoom).toHaveBeenCalledWith(15);
      expect(
        screen.getByText('Showing Calapooia Bend Farm, one of your farms.')
      ).toBeInTheDocument();
      expect(screen.queryByRole('listbox')).toBeNull();
    });

    describe('Google Places', () => {
      const placesAnswering = (
        suggestions: Array<{ main: string; secondary: string }> | 'refused'
      ) => {
        const fetched: string[] = [];
        (window as any).google.maps.importLibrary = async () => ({
          AutocompleteSessionToken: class {},
          AutocompleteSuggestion: {
            fetchAutocompleteSuggestions: async (req: { input: string }) => {
              fetched.push(req.input);
              if (suggestions === 'refused') throw new Error('Places API (New) has not been used');
              return {
                suggestions: suggestions.map((s, i) => ({
                  placePrediction: {
                    placeId: `p${i}`,
                    text: { toString: () => `${s.main}, ${s.secondary}` },
                    mainText: { toString: () => s.main },
                    secondaryText: { toString: () => s.secondary },
                    toPlace: () => ({
                      fetchFields: async () => undefined,
                      location: { toJSON: () => ({ lat: 44.5, lng: -123.0 }) },
                      viewport: {
                        toJSON: () => ({ north: 44.6, south: 44.4, east: -122.9, west: -123.1 })
                      },
                      displayName: s.main,
                      formattedAddress: `140 Hill St SE, ${s.secondary}`,
                      types: ['natural_feature']
                    })
                  }
                }))
              };
            }
          }
        });
        return fetched;
      };

      it('suggests places as you type, attributed to Google, and frames the one picked', async () => {
        withGeocoder('REQUEST_DENIED');
        const fetched = placesAnswering([
          { main: 'Calapooia River', secondary: 'Oregon, USA' },
          { main: 'Calapooia Rd', secondary: 'Albany, OR, USA' }
        ]);
        renderFinding({});
        const map = fakeMap();
        act(() => lastMap().onLoad(map));
        fireEvent.change(screen.getByLabelText(m['map.search.label']), {
          target: { value: 'Calapooia' }
        });
        const river = await screen.findByRole('option', { name: /Calapooia River/ });
        expect(screen.getByText(m['map.search.poweredByGoogle'])).toBeInTheDocument();
        expect(fetched).toEqual(['Calapooia']);
        fireEvent.click(river);
        await waitFor(() =>
          expect(map.fitBounds).toHaveBeenCalledWith(
            { north: 44.6, south: 44.4, east: -122.9, west: -123.1 },
            0
          )
        );
        expect(geocoded).toEqual([]);
      });

      it('arrow keys and Enter pick a suggestion without touching the mouse', async () => {
        withGeocoder('REQUEST_DENIED');
        placesAnswering([
          { main: 'Calapooia River', secondary: 'Oregon, USA' },
          { main: 'Calapooia Rd', secondary: 'Albany, OR, USA' }
        ]);
        renderFinding({});
        act(() => lastMap().onLoad(fakeMap()));
        const box = screen.getByLabelText(m['map.search.label']);
        fireEvent.change(box, { target: { value: 'Calapooia' } });
        await screen.findByRole('option', { name: /Calapooia Rd/ });
        fireEvent.keyDown(box, { key: 'ArrowDown' });
        expect(screen.getByRole('option', { name: /Calapooia Rd/ })).toHaveAttribute(
          'aria-selected',
          'true'
        );
        fireEvent.keyDown(box, { key: 'Enter' });
        expect(
          await screen.findByText('Showing Calapooia Rd, 140 Hill St SE, Albany, OR, USA.')
        ).toBeInTheDocument();
      });

      it('with Places refused, Enter still searches through the geocoder', async () => {
        withGeocoder('OK');
        placesAnswering('refused');
        renderFinding({});
        const map = fakeMap();
        act(() => lastMap().onLoad(map));
        const box = screen.getByLabelText(m['map.search.label']);
        fireEvent.change(box, { target: { value: 'Tangent' } });
        // Let the debounced Places call fail first.
        await new Promise((r) => setTimeout(r, 400));
        fireEvent.keyDown(box, { key: 'Enter' });
        await waitFor(() => expect(geocoded).toEqual(['Tangent']));
        await waitFor(() => expect(map.fitBounds).toHaveBeenCalled());
      });
    });

    it('waits for the farm to load before deciding it has no address', () => {
      withGeocoder('OK');
      renderFinding({ locationUnknown: true, farmAddress: undefined });
      act(() => lastMap().onLoad(fakeMap()));
      expect(screen.queryByText(m['parcel.boundary.noFarmLocation'])).toBeNull();
      expect(geocoded).toEqual([]);
    });
  });

  describe('use my location', () => {
    const fakeMap = () => ({
      fitBounds: vi.fn(),
      setCenter: vi.fn(),
      setZoom: vi.fn(),
      getZoom: () => 16,
      getCenter: () => ({ toJSON: () => ({ lat: 0, lng: 0 }) })
    });
    const withPosition = (
      answer:
        | { coords: { latitude: number; longitude: number; accuracy: number } }
        | { code: number }
    ) => {
      Object.defineProperty(navigator, 'geolocation', {
        configurable: true,
        value: {
          getCurrentPosition: (ok: (p: unknown) => void, fail: (e: unknown) => void) =>
            'coords' in answer ? ok(answer) : fail(answer)
        }
      });
    };

    it('puts the map where the grower is standing', async () => {
      withPosition({ coords: { latitude: 44.5402, longitude: -123.1089, accuracy: 8.4 } });
      renderEditor([]);
      const map = fakeMap();
      act(() => lastMap().onLoad(map));
      fireEvent.click(screen.getByRole('button', { name: m['map.search.useMyLocation'] }));
      await waitFor(() =>
        expect(map.setCenter).toHaveBeenCalledWith({ lat: 44.5402, lng: -123.1089 })
      );
      expect(map.setZoom).toHaveBeenCalledWith(17);
      expect(screen.getByText('Showing your location (within 8 m).')).toBeInTheDocument();
    });

    it('an unanswered permission prompt never locks the search', () => {
      vi.useFakeTimers();
      try {
        // The browser neither grants nor refuses: neither callback ever fires.
        Object.defineProperty(navigator, 'geolocation', {
          configurable: true,
          value: { getCurrentPosition: () => undefined }
        });
        renderEditor([]);
        act(() => lastMap().onLoad(fakeMap()));
        fireEvent.click(screen.getByRole('button', { name: m['map.search.useMyLocation'] }));
        // Find stays usable while the prompt waits (review on #218).
        expect(screen.getByRole('button', { name: m['map.search.button'] })).toBeEnabled();
        act(() => {
          vi.advanceTimersByTime(30000);
        });
        expect(screen.getByRole('button', { name: m['map.search.useMyLocation'] })).toBeEnabled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('says how to unblock it when the browser refuses', async () => {
      withPosition({ code: 1 });
      renderEditor([]);
      act(() => lastMap().onLoad(fakeMap()));
      fireEvent.click(screen.getByRole('button', { name: m['map.search.useMyLocation'] }));
      expect(await screen.findByText(m['map.search.locationDenied'])).toBeInTheDocument();
    });
  });
});
