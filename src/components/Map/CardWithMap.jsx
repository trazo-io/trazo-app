// Chakra imports
import { Box, Button, Flex, Icon, Portal, Spacer, Text, VStack } from '@chakra-ui/react';
import { GoogleMap, Polygon, useLoadScript } from '@react-google-maps/api';
import React, { useEffect, useState } from 'react';
import { FaMapMarkedAlt } from 'react-icons/fa';

// Custom components
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody.tsx';
import Shimmer from 'components/Shimmer/Shimmer';
import { useIntl } from 'react-intl';
import { googleMapsLoaderOptions } from 'components/Map/mapsLoaderOptions';
import { toLatLngPath } from 'utils/parcelPolygon';
import { NEIGHBOUR_OUTLINE } from 'components/Map/neighbourOutline';
import { ParcelNameLabel } from 'components/Map/ParcelNameLabel';

// Utility function to calculate polygon center
const calculatePolygonCenter = (points) => {
  if (!points || points.length === 0) {
    return { lat: -31.27006513500534, lng: -57.199462864720985 }; // Default center
  }

  // Calculate bounds
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  // Calculate center
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  return { lat: centerLat, lng: centerLng };
};

// Utility function to calculate appropriate zoom level based on polygon bounds
const calculatePolygonZoom = (points) => {
  if (!points || points.length === 0) {
    return 16; // Default zoom
  }

  // Calculate bounds
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  points.forEach((point) => {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  });

  // Calculate the span of the polygon
  const latSpan = Math.abs(maxLat - minLat);
  const lngSpan = Math.abs(maxLng - minLng);
  const maxSpan = Math.max(latSpan, lngSpan);

  // Add padding factor to ensure polygon doesn't touch edges (20% padding)
  const paddedSpan = maxSpan * 1.4;

  // More conservative zoom levels to ensure full polygon visibility
  if (paddedSpan > 2.0) return 6;
  if (paddedSpan > 1.0) return 7;
  if (paddedSpan > 0.5) return 8;
  if (paddedSpan > 0.3) return 9;
  if (paddedSpan > 0.2) return 10;
  if (paddedSpan > 0.1) return 11;
  if (paddedSpan > 0.05) return 12;
  if (paddedSpan > 0.02) return 13;
  if (paddedSpan > 0.01) return 14;
  return 15;
};

// Export utilities for reuse in forms and other components
export { calculatePolygonCenter, calculatePolygonZoom };

/**
 * `menu`: optional, rendered over the map's top-right corner, left of Google's fullscreen
 * control (the parcel page passes its "Edit outline" shortcut).
 *
 * `otherParcels`: optional `[{ id, name, path }]`, the farm's other parcels, drawn in the
 * neighbour style around this one. The view stays on this parcel: only the neighbours that
 * fall inside it show, the map never zooms out to fit the farm.
 *
 * `name`: optional, this parcel's name, labelled on its outline like the neighbours'.
 * The consumer pages pass none of these.
 */
const CardWithMap = ({
  polygon: rawPolygon,
  zoom,
  center,
  menu = null,
  otherParcels = [],
  name = null
}) => {
  const intl = useIntl();
  // Seeded parcels store GeoJSON; see toLatLngPath. Memoised so the effect below does not
  // re-run on every render.
  const polygon = React.useMemo(() => toLatLngPath(rawPolygon), [rawPolygon]);
  // See the note beside the early return below.
  const [authFailed, setAuthFailed] = useState(false);
  useEffect(() => {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      setAuthFailed(true);
      if (typeof previous === 'function') previous();
    };
    return () => {
      window.gm_authFailure = previous;
    };
  }, []);

  // Language follows the APP's locale, not the browser's — see mapsLoaderOptions. Memoised on
  // `intl.locale` because useLoadScript re-reads its options on every render.
  const loaderOptions = React.useMemo(() => googleMapsLoaderOptions(intl.locale), [intl.locale]);
  const { isLoaded, loadError } = useLoadScript(loaderOptions);

  // Enhanced map centering logic - PRIORITIZE POLYGON CENTER OVER PROVIDED CENTER
  const [mapZoom, setMapZoom] = useState(() => {
    // Always calculate zoom from polygon if it exists
    if (polygon && polygon.length > 0) {
      return calculatePolygonZoom(polygon);
    }
    // Only use provided zoom if no polygon
    if (zoom) return zoom;
    return 16;
  });

  const [mapCenter, setMapCenter] = useState(() => {
    // Always calculate center from polygon if it exists
    if (polygon && polygon.length > 0) {
      return calculatePolygonCenter(polygon);
    }
    // Only use provided center if no polygon
    if (center) return center;
    return { lat: -31.27006513500534, lng: -57.199462864720985 };
  });

  useEffect(() => {
    // Update center and zoom when props change - PRIORITIZE POLYGON
    if (polygon && polygon.length > 0) {
      // Always use polygon-calculated center and zoom when polygon exists
      const newCenter = calculatePolygonCenter(polygon);
      const newZoom = calculatePolygonZoom(polygon);
      setMapCenter(newCenter);
      setMapZoom(newZoom);
    } else {
      // Only use provided props when no polygon
      if (center) {
        setMapCenter(center);
      }
      if (zoom) {
        setMapZoom(zoom);
      }
    }
  }, [zoom, center, polygon]);

  // `loadError` only fires when the SCRIPT fails to fetch. When the key loads but is
  // unauthorised — billing lapsed, quota exceeded, referrer restriction changed — Google
  // considers the load a success and paints its own overlay INSIDE the map:
  // "This page can't load Google Maps correctly. Do you own this website?", with "For
  // development purposes only" watermarked across a darkened tile. A shopper who scanned a
  // QR code sees a developer error box on a food page, which reads as a dead or fake site.
  //
  // `gm_authFailure` is Google's documented hook for exactly that state. It is global by
  // design, so it is set on mount and torn down on unmount.
  if (loadError || authFailed) return intl.formatMessage({ id: 'parcel.errorLoadingMaps' });

  // Loading: Google Maps script not yet ready
  if (!isLoaded) {
    return (
      <Card maxHeight="290.5px" p="0px">
        <CardBody p="0px" w="100%" h={{ base: '200px', lg: '290px' }} borderRadius="15px">
          <Shimmer height="100%" borderRadius="10px" />
        </CardBody>
      </Card>
    );
  }

  // Empty state: no geodata at all. A center without a polygon still renders
  // a map (Phase 3 "approximate" disclosure ships a ~1 km rounded center and
  // deliberately no field boundary) — the placeholder is only for parcels
  // that were never mapped.
  if ((!polygon || polygon.length === 0) && !center) {
    return (
      <Card maxHeight="290.5px" p="0px">
        <CardBody
          p="0px"
          w="100%"
          h={{ base: '200px', lg: '290px' }}
          borderRadius="15px"
          bg="gray.50"
          border="1px dashed"
          borderColor="gray.200"
          position="relative">
          {menu && (
            <Box position="absolute" top="10px" right="10px" zIndex={2}>
              {menu}
            </Box>
          )}
          <Flex direction="column" align="center" justify="center" h="100%" px={4}>
            <VStack spacing={2}>
              <Icon as={FaMapMarkedAlt} boxSize={10} color="gray.500" />
              <Text fontSize="sm" color="gray.600" fontWeight="500" textAlign="center">
                {intl.formatMessage({
                  id: 'parcel.mapUnavailable',
                  defaultMessage: 'Field map not available yet'
                })}
              </Text>
              <Text fontSize="xs" color="gray.500" textAlign="center">
                {intl.formatMessage({
                  id: 'parcel.coordinatesShownBelow',
                  defaultMessage: 'Coordinates shown below'
                })}
              </Text>
            </VStack>
          </Flex>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card maxHeight="290.5px" p="0px">
      <CardBody
        p="0px"
        w="100%"
        h={{ base: '200px', lg: '290px' }}
        borderRadius="15px"
        position="relative">
        {menu && (
          // Left of Google's fullscreen button (40px wide, 10px from the edge).
          <Box position="absolute" top="10px" right="60px" zIndex={2}>
            {menu}
          </Box>
        )}
        <GoogleMap
          mapContainerStyle={{
            width: '100%',
            height: '100%',
            borderRadius: '10px'
          }}
          zoom={mapZoom}
          center={mapCenter}
          mapTypeId="satellite">
          {otherParcels.map((other) => (
            <React.Fragment key={other.id}>
              <Polygon path={other.path} options={NEIGHBOUR_OUTLINE} />
              {other.name && <ParcelNameLabel name={other.name} path={other.path} />}
            </React.Fragment>
          ))}
          {polygon && polygon.length > 0 && (
            <Polygon
              path={polygon}
              options={{
                fillColor: '#4CAF50',
                fillOpacity: 0.35,
                strokeColor: '#2E7D32',
                strokeOpacity: 1,
                strokeWeight: 2,
                // Above the neighbours.
                zIndex: 1
              }}
            />
          )}
          {name && polygon && polygon.length > 2 && <ParcelNameLabel name={name} path={polygon} />}
        </GoogleMap>
      </CardBody>
    </Card>
  );
};

export default CardWithMap;
