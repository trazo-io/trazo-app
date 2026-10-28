/**
 * "Find a place": a town, a road, pasted coordinates or a Google Maps link, and the map goes
 * there. Above the boundary editor, so a grower can reach a field before drawing it.
 *
 * Not a nested <form>: it sits inside the parcel wizard's form, where Enter would submit the
 * wizard. Enter is caught here and searches instead.
 */
import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { MdMyLocation } from 'react-icons/md';

import { StandardButton } from 'components/Design';
import { StandardSearchInput } from 'components/Design/StandardComponents';
import { findPlace } from 'utils/mapPlaceSearch';
import type { FoundPlace } from 'utils/mapPlaceSearch';

export interface MapPlaceSearchProps {
  onLocate: (place: FoundPlace) => void;
  /** Fills the box (the farm's typed address) until the grower types in it themselves. */
  defaultQuery?: string;
  /** What a found place is reported as; `{place}` is its name. */
  foundMessageId?: string;
  /**
   * Say so when the match is the middle of a town, ZIP code or road rather than a point:
   * where the result becomes the FARM's coordinates, that difference matters.
   */
  warnApproximate?: boolean;
  /**
   * Offer "Use my location": a grower standing in the field can put the map on it without
   * knowing a single place name. The ONLY caller of `navigator.geolocation` in the app (guard:
   * geolocationOnlyOnTheMap.test.ts), since Permissions-Policy allows it for every page.
   */
  allowMyLocation?: boolean;
}

// Longer than the API's own 15 s timeout, which only counts once the prompt is answered.
const LOCATE_GIVE_UP_MS = 30000;

type Outcome =
  | { kind: 'idle' }
  | { kind: 'shown'; place: FoundPlace; others: FoundPlace[] }
  | { kind: 'none'; query: string }
  | { kind: 'unavailable' }
  | { kind: 'locationDenied' }
  | { kind: 'locationFailed' };

export const MapPlaceSearch = ({
  onLocate,
  defaultQuery = '',
  foundMessageId = 'map.search.showing',
  warnApproximate = false,
  allowMyLocation = false
}: MapPlaceSearchProps) => {
  const intl = useIntl();
  const [query, setQuery] = useState(defaultQuery);
  const typedRef = useRef(false);
  useEffect(() => {
    if (!typedRef.current) setQuery(defaultQuery);
  }, [defaultQuery]);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });

  const go = (place: FoundPlace, others: FoundPlace[]) => {
    onLocate(place);
    setOutcome({ kind: 'shown', place, others });
  };

  const search = async () => {
    const text = query.trim();
    if (!text || busy) return;
    setBusy(true);
    const result = await findPlace(text);
    setBusy(false);
    if (result.status === 'found') {
      const [first, ...others] = result.places;
      go(first, others);
    } else if (result.status === 'none') {
      setOutcome({ kind: 'none', query: text });
    } else {
      setOutcome({ kind: 'unavailable' });
    }
  };

  const canLocate = allowMyLocation && typeof navigator !== 'undefined' && !!navigator.geolocation;
  // Its own flag, not the search's `busy`: a permission prompt can sit unanswered, or be
  // dismissed without either callback firing (the API's timeout only starts after the prompt),
  // and while it did, Find was disabled too (review on #218). The fallback timer frees the
  // button; an answer that arrives later still moves the map.
  const [locating, setLocating] = useState(false);
  const locateTimerRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(locateTimerRef.current), []);
  const doneLocating = () => {
    clearTimeout(locateTimerRef.current);
    setLocating(false);
  };
  const useMyLocation = () => {
    if (!canLocate || locating) return;
    setLocating(true);
    locateTimerRef.current = setTimeout(() => setLocating(false), LOCATE_GIVE_UP_MS);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        doneLocating();
        const metres = Math.round(position.coords.accuracy);
        go(
          {
            label: intl.formatMessage({ id: 'map.search.myLocation' }, { metres }),
            center: { lat: position.coords.latitude, lng: position.coords.longitude },
            approximate: metres > 100
          },
          []
        );
      },
      (error) => {
        doneLocating();
        setOutcome({ kind: error.code === 1 ? 'locationDenied' : 'locationFailed' });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  };

  // Messages sit under the field in the help-text style StandardField uses (xs, gray.600), so
  // the search reads as one more form control, not a banner of its own.
  const helpText = (children: React.ReactNode) => (
    <Text fontSize="xs" color="gray.600" mt={1}>
      {children}
    </Text>
  );

  return (
    <Box>
      <HStack spacing={2} align="start">
        <StandardSearchInput
          flex="1"
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            typedRef.current = true;
            setQuery(e.target.value);
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              search();
            }
          }}
          placeholder={intl.formatMessage({ id: 'map.search.placeholder' })}
          aria-label={intl.formatMessage({ id: 'map.search.label' })}
          enterKeyHint="search"
        />
        {/* Secondary weight: on the boundary step the page's primary action is Continue. */}
        <StandardButton
          type="button"
          variant="outline"
          onClick={search}
          isLoading={busy}
          flexShrink={0}>
          {intl.formatMessage({ id: 'map.search.button' })}
        </StandardButton>
      </HStack>

      {canLocate && (
        <StandardButton
          type="button"
          size="sm"
          variant="ghost"
          leftIcon={<MdMyLocation />}
          onClick={useMyLocation}
          isLoading={locating}
          mt={1}
          px={1}>
          {intl.formatMessage({ id: 'map.search.useMyLocation' })}
        </StandardButton>
      )}

      <Box role="status" aria-live="polite">
        {outcome.kind === 'shown' && (
          <VStack align="stretch" spacing={1}>
            {helpText(intl.formatMessage({ id: foundMessageId }, { place: outcome.place.label }))}
            {warnApproximate &&
              outcome.place.approximate &&
              helpText(intl.formatMessage({ id: 'map.search.approximate' }))}
            {outcome.others.length > 0 && (
              <HStack spacing={2} flexWrap="wrap" pt={1}>
                <Text fontSize="xs" color="gray.600">
                  {intl.formatMessage({ id: 'map.search.notThisOne' })}
                </Text>
                {outcome.others.map((other) => (
                  <StandardButton
                    key={other.label}
                    type="button"
                    size="xs"
                    variant="ghost"
                    onClick={() =>
                      go(other, [
                        outcome.place,
                        ...outcome.others.filter((o) => o.label !== other.label)
                      ])
                    }>
                    {other.label}
                  </StandardButton>
                ))}
              </HStack>
            )}
          </VStack>
        )}
        {outcome.kind === 'none' &&
          helpText(intl.formatMessage({ id: 'map.search.none' }, { query: outcome.query }))}
        {outcome.kind === 'unavailable' &&
          helpText(intl.formatMessage({ id: 'map.search.unavailable' }))}
        {outcome.kind === 'locationDenied' &&
          helpText(intl.formatMessage({ id: 'map.search.locationDenied' }))}
        {outcome.kind === 'locationFailed' &&
          helpText(intl.formatMessage({ id: 'map.search.locationFailed' }))}
      </Box>
    </Box>
  );
};

export default MapPlaceSearch;
