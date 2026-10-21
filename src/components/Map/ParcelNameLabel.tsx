/**
 * A parcel's name, small, in the middle of its outline. On the overlay layer with no pointer
 * events: it is a label, so a click on it reaches the map (the boundary editor adds a point
 * there). Dark pill, white text, so it reads on any imagery. Long names are cut, the full
 * name stays in the title.
 */
import React from 'react';
import { OverlayView } from '@react-google-maps/api';
import { Text } from '@chakra-ui/react';

import { outlineCenter } from './neighbourOutline';

const MAX_NAME = 18;

export const ParcelNameLabel = ({
  name,
  path
}: {
  name: string;
  path: Array<{ lat: number; lng: number }>;
}) => (
  <OverlayView position={outlineCenter(path)} mapPaneName={OverlayView.OVERLAY_LAYER}>
    <Text
      as="span"
      title={name}
      display="inline-block"
      transform="translate(-50%, -50%)"
      pointerEvents="none"
      whiteSpace="nowrap"
      px={1.5}
      py={0.5}
      borderRadius="full"
      bg="blackAlpha.700"
      color="white"
      fontSize="10px"
      fontWeight="semibold"
      lineHeight="1.2">
      {name.length > MAX_NAME ? `${name.slice(0, MAX_NAME - 1)}…` : name}
    </Text>
  </OverlayView>
);
