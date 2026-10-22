/**
 * A parcel's name, small, in the middle of its outline. On the overlay layer with no pointer
 * events: it is a label, so a click on it reaches the map (the boundary editor adds a point
 * there). Dark label, white text, so it reads on any imagery. A long name wraps to a second
 * line rather than being cut: with no pointer events a tooltip could never show the rest.
 */
import React from 'react';
import { OverlayView } from '@react-google-maps/api';
import { Text } from '@chakra-ui/react';

import { outlineCenter } from './neighbourOutline';

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
      display="inline-block"
      transform="translate(-50%, -50%)"
      pointerEvents="none"
      // The overlay pane gives its children no width, so a wrapping label shrank to its
      // narrowest box and broke every word into letters. Its own text width, up to 140px,
      // wrapping between words only.
      w="max-content"
      maxW="140px"
      textAlign="center"
      whiteSpace="normal"
      wordBreak="normal"
      overflowWrap="normal"
      px={1.5}
      py={0.5}
      borderRadius="md"
      bg="blackAlpha.700"
      color="white"
      fontSize="xs"
      fontWeight="semibold"
      lineHeight="1.2">
      {name}
    </Text>
  </OverlayView>
);
