/**
 * Every parcel of a farm on one satellite map: tap a parcel to add or remove it.
 *
 * The Map half of the parcel picker (`components/Events/ParcelPicker.tsx`). It shares the List's
 * selection, so the two modes can never disagree. The List stays the accessible path: the
 * outlines and their name pills are pointer targets only (`aria-hidden`), and the picker says so
 * on screen. Parcels with no outline on file cannot be drawn and are picked in the List.
 *
 * Loads the Maps bundle through the shared options (`googleMapsLoaderOptions`) so it never
 * reloads the script another map on the page already loaded. No extra libraries and no `mapId`:
 * the production CSP (netlify.toml) allows the base bundle, which Polygon and OverlayView need,
 * and nothing more.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { GoogleMap, OverlayView, Polygon, useLoadScript } from '@react-google-maps/api';
import { Box, HStack, Icon, Text } from '@chakra-ui/react';
import { FaCheck, FaLock } from 'react-icons/fa';

import { googleMapsLoaderOptions } from 'components/Map/mapsLoaderOptions';
import type { ParcelGeometry } from 'store/api/parcelGeometryApi';

// Theme hexes, never ad-hoc colours: green.500 / green.700 for selected, white for available,
// gray.400 for a parcel that cannot be picked. Selection is ALSO shown by the check icon on the
// name pill, so colour never carries the meaning alone.
const STYLE = {
  available: { fillColor: '#FFFFFF', fillOpacity: 0.15, strokeColor: '#FFFFFF', strokeWeight: 2 },
  selected: { fillColor: '#4CAF50', fillOpacity: 0.45, strokeColor: '#2E7D32', strokeWeight: 3 },
  disabled: { fillColor: '#9E9E9E', fillOpacity: 0.3, strokeColor: '#9E9E9E', strokeWeight: 1 }
};

// The parcel dashboard's view (CardWithMap): satellite imagery, so a grower recognises the rows
// and the outlines are drawn on the farm itself. The map type lives IN the options: passed
// only as the `mapTypeId` prop beside an `options` object, the map came up as a road map.
// Module-level so the object is not rebuilt (and re-applied to the map) on every render.
const MAP_OPTIONS: google.maps.MapOptions = {
  mapTypeId: 'satellite',
  // One finger scrolls the page, two move the map: the picker sits inside a long form.
  gestureHandling: 'cooperative',
  streetViewControl: false,
  mapTypeControl: false,
  // Off, unlike the parcel dashboard: the map is aria-hidden (the List is the accessible path),
  // and Google's fullscreen control is a real, tabbable button a screen reader would never
  // announce there.
  fullscreenControl: false,
  clickableIcons: false
};

const MAX_NAME = 16;
const shortName = (name: string) =>
  name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name;

// A DOM element in an overlay pane does not get its clicks by default: the map captures the
// pointer for its own drag and tap handling, so a real tap on a name pill never reached the
// button (a synthetic click did, which is why only a browser showed it). This hands the pill's
// pointer events back to the DOM.
const keepClicksOnThePill = (element: HTMLElement | null) => {
  if (element) window.google?.maps?.OverlayView?.preventMapHitsAndGesturesFrom?.(element);
};

const boxCenter = (path: { lat: number; lng: number }[]) => {
  const lats = path.map((p) => p.lat);
  const lngs = path.map((p) => p.lng);
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2
  };
};

export interface ParcelMapPickerProps {
  parcels: ParcelGeometry[];
  selectedIds: number[];
  /** Ticked and locked: the parcel the activity was opened from. */
  fixedId?: number;
  /** Parcels the server would refuse; drawn grey, not tappable. */
  disabledIds: Set<number>;
  onToggle: (parcelId: number) => void;
  /** Maps failed (no key, script error, refused key): the picker falls back to the List. */
  onUnavailable?: () => void;
}

const ParcelMapPicker = ({
  parcels,
  selectedIds,
  fixedId,
  disabledIds,
  onToggle,
  onUnavailable
}: ParcelMapPickerProps) => {
  const intl = useIntl();
  const loaderOptions = useMemo(() => googleMapsLoaderOptions(intl.locale), [intl.locale]);
  const { isLoaded, loadError } = useLoadScript(loaderOptions);

  // A refused key still "loads": Google reports it only through this global hook (CardWithMap).
  const [authFailed, setAuthFailed] = useState(false);
  useEffect(() => {
    const previous = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setAuthFailed(true);
      if (typeof previous === 'function') previous();
    };
    return () => {
      (window as any).gm_authFailure = previous;
    };
  }, []);
  const unavailable = !loaderOptions.googleMapsApiKey || !!loadError || authFailed;
  useEffect(() => {
    if (unavailable) onUnavailable?.();
  }, [unavailable, onUnavailable]);

  const drawn = useMemo(() => parcels.filter((p) => p.path && p.path.length >= 3), [parcels]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const fitAll = useCallback(
    (map: google.maps.Map) => {
      const bounds = new google.maps.LatLngBounds();
      drawn.forEach((parcel) => parcel.path!.forEach((point) => bounds.extend(point)));
      if (bounds.isEmpty()) return;
      map.fitBounds(bounds, 24);
      // A single small parcel would otherwise zoom past the satellite imagery.
      google.maps.event.addListenerOnce(map, 'idle', () => {
        if ((map.getZoom() ?? 0) > 18) map.setZoom(18);
      });
    },
    [drawn]
  );

  if (unavailable) {
    return (
      <Text fontSize="sm" color="gray.700" role="status">
        {intl.formatMessage({ id: 'picker.mapUnavailable' })}
      </Text>
    );
  }
  if (!isLoaded) {
    return <Box h={{ base: '300px', md: '380px' }} borderRadius="10px" bg="gray.100" />;
  }

  return (
    <Box>
      <Box
        h={{ base: '300px', md: '380px' }}
        borderRadius="10px"
        overflow="hidden"
        aria-hidden="true">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '100%' }}
          onLoad={fitAll}
          options={MAP_OPTIONS}>
          {drawn.map((parcel) => {
            const isDisabled = disabledIds.has(parcel.id);
            const isSelected = parcel.id === fixedId || selected.has(parcel.id);
            const canToggle = !isDisabled && parcel.id !== fixedId;
            const style = isDisabled
              ? STYLE.disabled
              : isSelected
              ? STYLE.selected
              : STYLE.available;
            return (
              <React.Fragment key={parcel.id}>
                <Polygon
                  path={parcel.path!}
                  options={{
                    ...style,
                    strokeWeight: parcel.id === fixedId ? 4 : style.strokeWeight,
                    clickable: canToggle
                  }}
                  onClick={canToggle ? () => onToggle(parcel.id) : undefined}
                />
                <OverlayView
                  position={boxCenter(parcel.path!)}
                  mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}>
                  <HStack
                    as="button"
                    type="button"
                    tabIndex={-1}
                    ref={keepClicksOnThePill}
                    onClick={canToggle ? () => onToggle(parcel.id) : undefined}
                    spacing={1}
                    minH="44px"
                    px={3}
                    borderRadius="full"
                    bg={isSelected ? 'green.700' : 'white'}
                    color={isSelected ? 'white' : 'gray.800'}
                    boxShadow="md"
                    transform="translate(-50%, -50%)"
                    whiteSpace="nowrap"
                    cursor={canToggle ? 'pointer' : 'default'}
                    fontSize="sm"
                    fontWeight="semibold">
                    {isSelected && <Icon as={FaCheck} boxSize={3} />}
                    {isDisabled && <Icon as={FaLock} boxSize={3} />}
                    <span>{shortName(parcel.name)}</span>
                  </HStack>
                </OverlayView>
              </React.Fragment>
            );
          })}
        </GoogleMap>
      </Box>
    </Box>
  );
};

export default ParcelMapPicker;
