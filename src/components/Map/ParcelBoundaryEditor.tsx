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
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { GoogleMap, Marker, Polygon } from '@react-google-maps/api';
import { Box, HStack, Text } from '@chakra-ui/react';
import { FaTrash } from 'react-icons/fa';

import { StandardButton } from 'components/Design';
import { NEIGHBOUR_OUTLINE } from 'components/Map/neighbourOutline';
import { ParcelNameLabel } from 'components/Map/ParcelNameLabel';
import { insertAtNearestEdge, isSelfIntersecting } from 'utils/parcelPolygon';
import type { LatLng } from 'utils/parcelPolygon';

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

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: true,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: true,
  // One finger scrolls the page, two move the map: the editor sits inside a long form.
  gestureHandling: 'cooperative',
  clickableIcons: false,
  mapTypeId: 'satellite',
  // Double-tap would zoom AND add a corner where the grower tapped twice.
  disableDoubleClickZoom: true
};

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
}

export const ParcelBoundaryEditor = ({
  path,
  onChange,
  neighbours = [],
  center,
  zoom,
  onViewChange,
  height = '400px'
}: ParcelBoundaryEditorProps) => {
  const intl = useIntl();
  const mapRef = useRef<google.maps.Map | null>(null);
  const fittedRef = useRef(false);
  const editedRef = useRef(false);
  // Read once: passed again, `@react-google-maps` would re-apply them on every change.
  const [initialCamera] = useState(() => ({ center, zoom: zoom ?? FIELD_ZOOM }));

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

  // The farm's coordinates can load after the map (new parcel, nothing to fit to yet).
  useEffect(() => {
    const map = mapRef.current;
    if (map && !fittedRef.current && !editedRef.current) map.setCenter(center);
  }, [center]);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      fitOnce();
    },
    [fitOnce]
  );

  const onIdle = () => {
    const map = mapRef.current;
    const mapCenter = map?.getCenter();
    if (!map || !mapCenter || !onViewChange) return;
    onViewChange({ center: mapCenter.toJSON(), zoom: map.getZoom() ?? initialCamera.zoom });
  };

  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const point = e.latLng.toJSON();
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
    <Box>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height }}
        center={initialCamera.center}
        zoom={initialCamera.zoom}
        onLoad={onLoad}
        onIdle={onIdle}
        onClick={onMapClick}
        options={MAP_OPTIONS}>
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
            onDrag={(e) => e.latLng && setDragPath(withCorner(index, e.latLng.toJSON()))}
            onDragEnd={(e) => {
              setDragPath(null);
              if (!e.latLng || !commit(withCorner(index, e.latLng.toJSON()))) {
                setRevision((r) => r + 1);
              }
            }}
          />
        ))}
      </GoogleMap>

      {selected !== null && (
        <HStack
          role="status"
          spacing={3}
          px={4}
          py={3}
          bg="green.50"
          borderTop="1px solid"
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
        <Text role="alert" px={4} py={3} fontSize="sm" color="gray.800" bg="amber.50">
          {intl.formatMessage({ id: 'parcel.boundary.crossRefused' })}
        </Text>
      )}
    </Box>
  );
};

export default ParcelBoundaryEditor;
