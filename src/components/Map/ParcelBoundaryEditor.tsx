/**
 * The boundary editor: a satellite map on which a grower taps a parcel's corners.
 *
 * The parent owns the outline (and its Undo history); this owns how the map is touched. Every
 * edit arrives through `onChange` as a whole new path, already checked: an edit that would make
 * the outline cross itself is refused and said so, never stored.
 *
 * Rebuilt 2026-10-27 after a farmer could not draw a field with it. What was wrong, reproduced
 * in a browser, so none of it comes back:
 *   - The map re-centred and re-zoomed itself after every corner from the third on (a
 *     coarse zoom table capped at 15), so the fourth tap landed hundreds of metres from where
 *     the grower aimed. The camera is now the grower's: fitted ONCE when the map opens, then
 *     only moved by them. `center`/`zoom` are read once and never passed again.
 *   - There were two sets of corner handles stacked on each other: the polygon's own
 *     `editable` handles and a layer of markers. Dragging the visible marker panned the map;
 *     dragging the handle under it moved the outline and left the marker behind. And the
 *     polygon's path listeners went deaf after the first edit, because `@react-google-maps`
 *     replaces the path object (`setPath`) on every render, so the next tap silently undid
 *     the drag. Now there is one set of handles, these markers, and the polygon only draws.
 *   - Tapping a corner deleted it, with no way back on a phone where a tap and the start of
 *     a drag are hard to tell apart. A tap now SELECTS the corner: tap the map to move it
 *     there, or delete it. That is also the way to move a corner without dragging, which
 *     WCAG 2.2 SC 2.5.7 (Dragging Movements) asks for.
 *   - The whole outline was `draggable`, so one stray drag slid the field off its fences.
 *
 * A corner placed within a few pixels of a neighbouring parcel's corner or edge snaps onto it,
 * so two parcels on one fence share the line. `fullscreen` fills a dialog (the form's
 * full-screen editor) and lets one finger move the map, which inline would steal the page's
 * scroll.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import { Box, Flex, HStack, Text } from '@chakra-ui/react';
import { FaTrash } from 'react-icons/fa';

import { StandardAlert, StandardButton } from 'components/Design';
import { NEIGHBOUR_OUTLINE } from 'components/Map/neighbourOutline';
import { ParcelNameLabel } from 'components/Map/ParcelNameLabel';
import {
  insertAtNearestEdge,
  isSelfIntersecting,
  metresPerPixel,
  snapToNeighbours
} from 'utils/parcelPolygon';
import type { LatLng } from 'utils/parcelPolygon';
import { findPlace } from 'utils/mapPlaceSearch';
import type { FoundPlace } from 'utils/mapPlaceSearch';
import { MapPlaceSearch } from 'components/Map/MapPlaceSearch';

// green.500 for a closed outline, orange for one still short of three corners (the same
// colours the editor always used; neighbours are blue, see neighbourOutline).
const CLOSED = '#4CAF50';
const OPEN = '#FB8C00';
const SELECTED_RING = '#1B5E20';

// A 44px touch target around a 22px dot: the size a fingertip can find on a phone (the old
// 16px dot was below WCAG 2.5.8's 24px floor). The transparent ring is part of the image, so
// the whole 44px takes the tap and the drag.
const HANDLE_PX = 44;
const handleIcon = (fill: string, selected: boolean): google.maps.Icon => {
  const r = selected ? 13 : 11;
  const ring = selected
    ? `<circle cx="22" cy="22" r="${
        r + 4
      }" fill="none" stroke="${SELECTED_RING}" stroke-width="3"/>`
    : '';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${HANDLE_PX}" height="${HANDLE_PX}">` +
    `<circle cx="22" cy="22" r="22" fill="#000" fill-opacity="0.001"/>` +
    ring +
    `<circle cx="22" cy="22" r="${r}" fill="${fill}" stroke="#fff" stroke-width="3"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    size: new google.maps.Size(HANDLE_PX, HANDLE_PX),
    scaledSize: new google.maps.Size(HANDLE_PX, HANDLE_PX),
    anchor: new google.maps.Point(HANDLE_PX / 2, HANDLE_PX / 2)
  };
};

// A single small parcel would otherwise zoom past the satellite imagery.
const MAX_FIT_ZOOM = 18;
// A farm's coordinates with nothing drawn yet: close enough to tell one field from the next.
// The old 13 showed a whole valley, and every grower's first job was to zoom in.
const FIELD_ZOOM = 16;
// A farm with no location on file: the whole contiguous US, which reads as "not there yet".
// It opened on a field in Fresno at field zoom instead, so a Washington grower landed 1,000 km
// away on a field that looked like it could be theirs.
const NO_LOCATION_CAMERA = { center: { lat: 39.8283, lng: -98.5795 }, zoom: 4 };
// Zoomed in this far from the no-location view, the grower has chosen a place.
const GROWER_CAMERA_ZOOM = 10;
// A searched point with no area of its own (pasted coordinates): close enough to see fences.
const POINT_ZOOM = 17;

// How close (in screen pixels, so it feels the same at any zoom) a corner must land to a
// neighbouring parcel's corner or edge to snap onto it.
const SNAP_PX = 14;

const mapOptions = (fullscreen: boolean): google.maps.MapOptions => ({
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  // Off: Google's fullscreen shows the bare map, without Undo, Delete corner or the status,
  // so a grower who used it was left drawing with no way back. The form opens its own full
  // screen editor, which carries them.
  fullscreenControl: false,
  // Inline, one finger scrolls the page and two move the map: the editor sits inside a long
  // form. Full screen there is no page to scroll, so one finger moves the map.
  gestureHandling: fullscreen ? 'greedy' : 'cooperative',
  clickableIcons: false,
  mapTypeId: 'satellite',
  // Double-tap would zoom AND add a corner where the grower tapped twice.
  disableDoubleClickZoom: true
});
const INLINE_OPTIONS = mapOptions(false);
const FULLSCREEN_OPTIONS = mapOptions(true);

export interface ParcelBoundaryEditorProps {
  path: LatLng[];
  /** A checked edit: the whole new path. */
  onChange: (next: LatLng[]) => void;
  /** The farm's other parcels, drawn read-only so the outline is placed against them. */
  neighbours?: Array<{ id: number; name: string; path: LatLng[] }>;
  /** Where to open when there is nothing to fit to (the farm's coordinates). */
  center: LatLng;
  /** The saved zoom, used only with `center`. */
  zoom?: number;
  /** The camera after the grower moves it: what `map_metadata` records. */
  onViewChange?: (view: { center: LatLng; zoom: number }) => void;
  height?: string;
  /**
   * Fill the parent (a full-screen dialog): the map takes every pixel left after `footer`,
   * and one finger moves it.
   */
  fullscreen?: boolean;
  /** False to open exactly on `center`/`zoom` (re-opening where the grower just was). */
  fitOnOpen?: boolean;
  /** Rendered under the editor's own bars: the full-screen dialog's status and controls. */
  footer?: React.ReactNode;
  /** The farm has no coordinates on file: `center` is a placeholder, not the farm. */
  locationUnknown?: boolean;
  /**
   * The farm's postal address, looked up when its location is unknown. `undefined` while the
   * farm is still loading; an empty string when it has no address either.
   */
  farmAddress?: string;
}

export const ParcelBoundaryEditor = ({
  path,
  onChange,
  neighbours = [],
  center,
  zoom,
  onViewChange,
  height = '400px',
  fullscreen = false,
  fitOnOpen = true,
  footer,
  locationUnknown = false,
  farmAddress
}: ParcelBoundaryEditorProps) => {
  const intl = useIntl();
  const mapRef = useRef<google.maps.Map | null>(null);
  const fittedRef = useRef(!fitOnOpen);
  const editedRef = useRef(false);
  // Read once: passed again, `@react-google-maps` would re-apply them on every change.
  const [initialCamera] = useState(() =>
    locationUnknown ? NO_LOCATION_CAMERA : { center, zoom: zoom ?? FIELD_ZOOM }
  );
  // The farm's address was looked up and found nothing usable.
  const [addressMissed, setAddressMissed] = useState(false);
  const addressTriedRef = useRef(false);
  const [located, setLocated] = useState(false);
  const locatedRef = useRef(false);

  const [selected, setSelected] = useState<number | null>(null);
  // The outline while a corner is being dragged, so the edges follow the finger.
  const [dragPath, setDragPath] = useState<LatLng[] | null>(null);
  const [refused, setRefused] = useState(false);
  // Bumped to put a refused drag's marker back where it started.
  const [revision, setRevision] = useState(0);

  // A selection cannot outlive its corner (Undo, Clear, a delete).
  useEffect(() => {
    if (selected !== null && selected >= path.length) setSelected(null);
  }, [path.length, selected]);

  // A refusal is about the change just attempted; any later change (Undo included) ends it.
  useEffect(() => setRefused(false), [path]);

  const commit = useCallback(
    (next: LatLng[]) => {
      if (isSelfIntersecting(next)) {
        setRefused(true);
        return false;
      }
      setRefused(false);
      editedRef.current = true;
      onChange(next);
      return true;
    },
    [onChange]
  );

  const fit = useCallback((map: google.maps.Map, points: LatLng[]) => {
    const bounds = new google.maps.LatLngBounds();
    points.forEach((point) => bounds.extend(point));
    map.fitBounds(bounds, 48);
    google.maps.event.addListenerOnce(map, 'idle', () => {
      if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
    });
    fittedRef.current = true;
  }, []);

  // Open on the outline on file, else on the farm's other parcels. Either can arrive after the
  // map does, so this keeps trying, but only until the grower's first edit: fitting to the
  // outline being DRAWN is exactly the jump that threw the fourth tap off. After the first fit
  // the camera belongs to the grower.
  const fitOnce = useCallback(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || editedRef.current) return;
    if (path.length >= 3) fit(map, path);
    else if (path.length === 0 && neighbours.length > 0) {
      fit(
        map,
        neighbours.flatMap((n) => n.path)
      );
    }
  }, [fit, neighbours, path]);

  useEffect(fitOnce, [fitOnce]);

  // The farm's coordinates can load after the map (new parcel, nothing to fit to yet). From the
  // no-location view, that also means coming down to field zoom.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || fittedRef.current || editedRef.current || locationUnknown) return;
    map.setCenter(center);
    if ((map.getZoom() ?? FIELD_ZOOM) < FIELD_ZOOM - 3) map.setZoom(FIELD_ZOOM);
  }, [center, locationUnknown]);

  // A place the grower searched for, or the farm's address: frame its area, or a point at a
  // zoom where fences show. The camera is the grower's from here on.
  const moveTo = useCallback((place: FoundPlace) => {
    const map = mapRef.current;
    if (!map) return;
    if (place.viewport) {
      map.fitBounds(place.viewport, 0);
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if ((map.getZoom() ?? 0) > MAX_FIT_ZOOM) map.setZoom(MAX_FIT_ZOOM);
      });
    } else {
      map.setCenter(place.center);
      map.setZoom(POINT_ZOOM);
    }
    fittedRef.current = true;
    locatedRef.current = true;
    setLocated(true);
  }, []);

  // No coordinates on file and nothing drawn to fit to: look the farm's address up once.
  const tryFarmAddress = useCallback(() => {
    const map = mapRef.current;
    if (!map || !locationUnknown || farmAddress === undefined || addressTriedRef.current) return;
    if (fittedRef.current || editedRef.current) return;
    addressTriedRef.current = true;
    if (!farmAddress.trim()) {
      setAddressMissed(true);
      return;
    }
    findPlace(farmAddress, 1).then((result) => {
      if (result.status === 'found' && !fittedRef.current && !editedRef.current) {
        moveTo(result.places[0]);
      } else if (result.status !== 'found') {
        setAddressMissed(true);
      }
    });
  }, [farmAddress, locationUnknown, moveTo]);

  useEffect(tryFarmAddress, [tryFarmAddress]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitOnce();
      tryFarmAddress();
    },
    [fitOnce, tryFarmAddress]
  );

  const onIdle = () => {
    const map = mapRef.current;
    const mapCenter = map?.getCenter();
    if (!map || !mapCenter || !onViewChange) return;
    const zoomNow = map.getZoom() ?? initialCamera.zoom;
    if (locationUnknown && !locatedRef.current && !fittedRef.current && !editedRef.current) {
      // Still on the whole-country view: that is no camera to record. Reported, it was saved as
      // the parcel's map and read back as "the farm is here".
      if (zoomNow < GROWER_CAMERA_ZOOM) return;
      // The grower zoomed in to a place themselves: from here the camera is theirs, and the
      // farm's coordinates arriving late must not pull the map away.
      fittedRef.current = true;
    }
    onViewChange({ center: mapCenter.toJSON(), zoom: zoomNow });
  };

  const snap = (point: LatLng) => {
    if (neighbours.length === 0) return point;
    const zoomNow = mapRef.current?.getZoom() ?? initialCamera.zoom;
    return snapToNeighbours(
      point,
      neighbours.map((n) => n.path),
      SNAP_PX * metresPerPixel(point.lat, zoomNow)
    );
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = snap(e.latLng.toJSON());
    if (selected !== null) {
      const next = path.map((p, i) => (i === selected ? point : p));
      if (commit(next)) setSelected(null);
      return;
    }
    commit(insertAtNearestEdge(path, point));
  };

  const withCorner = (index: number, point: LatLng) =>
    path.map((p, i) => (i === index ? point : p));

  const drawn = dragPath ?? path;
  const colour = path.length >= 3 ? CLOSED : OPEN;

  return (
    <Flex direction="column" h={fullscreen ? '100%' : undefined}>
      {/* The search is a form row above the map, not wedged inside its frame. Full screen,
          it is a padded bar across the top of the dialog. */}
      <Box px={fullscreen ? 4 : 0} pt={fullscreen ? 3 : 0} pb={3}>
        <MapPlaceSearch onLocate={moveTo} allowMyLocation />
      </Box>
      {locationUnknown && addressMissed && !located && (
        <Box px={fullscreen ? 4 : 0}>
          <StandardAlert
            status="info"
            mb={3}
            description={intl.formatMessage({ id: 'parcel.boundary.noFarmLocation' })}
          />
        </Box>
      )}
      <Box
        flex={fullscreen ? '1' : undefined}
        minH={0}
        borderRadius={fullscreen ? 0 : 'lg'}
        overflow="hidden"
        border={fullscreen ? undefined : '1px solid'}
        borderColor="gray.200">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: fullscreen ? '100%' : height }}
          center={initialCamera.center}
          zoom={initialCamera.zoom}
          onLoad={onLoad}
          onIdle={onIdle}
          onClick={onMapClick}
          options={fullscreen ? FULLSCREEN_OPTIONS : INLINE_OPTIONS}>
          {neighbours.map((other) => (
            <React.Fragment key={other.id}>
              <Polygon path={other.path} options={NEIGHBOUR_OUTLINE} />
              <ParcelNameLabel name={other.name} path={other.path} />
            </React.Fragment>
          ))}

          {/* Draws only: no handles of its own, not draggable, and a tap inside it reaches the
            map, so a corner can be added or a selected corner moved there. From two corners,
            so the first edge shows as soon as it exists. */}
          {drawn.length >= 2 && (
            <Polygon
              path={drawn}
              options={{
                fillColor: colour,
                fillOpacity: drawn.length >= 3 ? 0.25 : 0,
                strokeColor: colour,
                strokeOpacity: 1,
                strokeWeight: 3,
                clickable: false,
                editable: false,
                draggable: false,
                // Above the neighbours' outlines.
                zIndex: 1
              }}
            />
          )}

          {path.map((point, index) => (
            <Marker
              key={`${index}-${revision}`}
              position={point}
              title={intl.formatMessage({ id: 'parcel.boundary.cornerTitle' }, { n: index + 1 })}
              icon={handleIcon(colour, index === selected)}
              draggable
              zIndex={index === selected ? 3 : 2}
              onClick={() => {
                setRefused(false);
                setSelected(index === selected ? null : index);
              }}
              onDragStart={() => {
                setSelected(null);
                setRefused(false);
              }}
              onDrag={(e) => e.latLng && setDragPath(withCorner(index, snap(e.latLng.toJSON())))}
              onDragEnd={(e) => {
                setDragPath(null);
                if (!e.latLng || !commit(withCorner(index, snap(e.latLng.toJSON())))) {
                  setRevision((r) => r + 1);
                }
              }}
            />
          ))}
        </GoogleMap>
      </Box>

      {selected !== null && (
        <HStack
          role="status"
          spacing={3}
          px={4}
          py={3}
          bg="green.50"
          // Inline, a rounded strip under the map like the status strip below it; full screen,
          // a bar across the dialog.
          mt={fullscreen ? 0 : 2}
          borderRadius={fullscreen ? 0 : 'lg'}
          borderTop={fullscreen ? '1px solid' : undefined}
          borderColor="green.100"
          justify="space-between"
          flexWrap="wrap">
          <Text fontSize="sm" color="gray.800" fontWeight="semibold">
            {intl.formatMessage({ id: 'parcel.boundary.cornerSelected' }, { n: selected + 1 })}
          </Text>
          <HStack spacing={2}>
            <StandardButton
              size="sm"
              variant="outline"
              leftIcon={<FaTrash />}
              onClick={() => {
                if (commit(path.filter((_, i) => i !== selected))) setSelected(null);
              }}>
              {intl.formatMessage({ id: 'parcel.boundary.deleteCorner' })}
            </StandardButton>
            <StandardButton size="sm" variant="outline" onClick={() => setSelected(null)}>
              {intl.formatMessage({ id: 'parcel.boundary.doneCorner' })}
            </StandardButton>
          </HStack>
        </HStack>
      )}

      {refused && (
        <Text
          role="alert"
          px={4}
          py={3}
          mt={fullscreen ? 0 : 2}
          borderRadius={fullscreen ? 0 : 'lg'}
          fontSize="sm"
          color="gray.800"
          bg="amber.50">
          {intl.formatMessage({ id: 'parcel.boundary.crossRefused' })}
        </Text>
      )}

      {footer}
    </Flex>
  );
};

export default ParcelBoundaryEditor;
