/**
 * The parcel page's map card: this parcel in green, the farm's other parcels in the neighbour
 * style around it, and the view on this parcel (the card does not zoom out to fit the farm, so
 * only the nearby neighbours show). Consumer pages pass no neighbours and draw only the parcel.
 */
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { IntlProvider } from 'react-intl';

import enMessages from '../../../i18n/lang/en-US.json';
import { NEIGHBOUR_OUTLINE } from '../neighbourOutline';

const drawn = vi.hoisted(() => ({
  polygons: [] as Array<Record<string, unknown>>,
  map: {} as Record<string, unknown>
}));

vi.mock('@react-google-maps/api', () => {
  const OverlayView = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
  (OverlayView as any).OVERLAY_LAYER = 'overlayLayer';
  return {
    OverlayView,
    useLoadScript: () => ({ isLoaded: true, loadError: undefined }),
    GoogleMap: ({ children, ...props }: { children?: React.ReactNode }) => {
      drawn.map = props;
      return <div data-testid="google-map">{children}</div>;
    },
    Polygon: (props: { options?: Record<string, unknown> }) => {
      drawn.polygons.push(props.options ?? {});
      return null;
    }
  };
});

import CardWithMap from '../CardWithMap';

const square = (lat: number) => [
  { lat, lng: 1 },
  { lat, lng: 1.001 },
  { lat: lat + 0.001, lng: 1.001 }
];

const mount = (props: Record<string, unknown>) =>
  render(
    <ChakraProvider>
      <IntlProvider locale="en" messages={enMessages as Record<string, string>}>
        <CardWithMap polygon={square(10)} {...props} />
      </IntlProvider>
    </ChakraProvider>
  );

describe('parcel map card', () => {
  beforeEach(() => {
    drawn.polygons = [];
  });

  it('draws the neighbours in their own style, under this parcel in green', () => {
    mount({
      otherParcels: [
        { id: 2, path: square(10.002) },
        { id: 3, path: square(20) }
      ]
    });
    const neighbours = drawn.polygons.filter((o) => o === NEIGHBOUR_OUTLINE);
    const own = drawn.polygons.filter((o) => o.fillColor === '#4CAF50');
    expect(neighbours.length).toBeGreaterThan(0);
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((o) => (o.zIndex as number) > (NEIGHBOUR_OUTLINE.zIndex as number))).toBe(
      true
    );
  });

  it('keeps the view on this parcel, however far the farm reaches', () => {
    mount({ otherParcels: [{ id: 3, path: square(20) }] });
    const center = drawn.map.center as { lat: number; lng: number };
    expect(center.lat).toBeCloseTo(10.0005, 4);
  });

  it('draws only the parcel when given no neighbours (consumer pages)', () => {
    mount({});
    expect(drawn.polygons.some((o) => o === NEIGHBOUR_OUTLINE)).toBe(false);
    expect(drawn.polygons.length).toBeGreaterThan(0);
  });

  it('names every outline, this parcel included, and never cuts a long name', () => {
    mount({
      name: 'Hass Avocado Grove',
      otherParcels: [
        { id: 2, name: 'South', path: square(10.002) },
        { id: 3, name: 'A very long parcel name indeed', path: square(10.004) }
      ]
    });
    expect(screen.getByText('Hass Avocado Grove')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
    // In full: the label takes no pointer events, so no tooltip could show a cut name's rest.
    expect(screen.getByText('A very long parcel name indeed')).toBeInTheDocument();
  });
});
