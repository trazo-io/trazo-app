/**
 * "Find a place": suggestions as the grower types, and the map goes to the one they pick.
 *
 * Two groups, the grower's own first:
 *   - Your farms: the company's farms, and this farm's parcels, matched by name in Trazo. Instant,
 *     no API, and the place a grower with several blocks most often looks for: Google has never
 *     heard of "Home Field East".
 *   - Places: Google Places suggestions (towns, roads, rivers, businesses), like Google Maps.
 * Pasted coordinates or a Google Maps link become one "Go to" row. If Places is unavailable (the
 * API is not enabled for the key, or the network refuses it), Enter or Find falls back to the
 * geocoder, so the box is never dead.
 *
 * Built as an ARIA combobox: arrows move through the rows, Enter picks, Escape closes. Not a
 * nested <form>: it sits inside the parcel wizard's form, where Enter would submit the wizard.
 * Rows follow the global search's pattern (rounded rows, green.50 + green.200 for the active one,
 * uppercase xs group headers).
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Box, Flex, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react';
import { MdMyLocation, MdPlace } from 'react-icons/md';
import { FaMapMarkedAlt, FaTractor } from 'react-icons/fa';

import { StandardButton } from 'components/Design';
import { StandardSearchInput } from 'components/Design/StandardComponents';
import {
  findPlace,
  matchFarms,
  matchParcels,
  parseCoordinates,
  suggestPlaces
} from 'utils/mapPlaceSearch';
import type { FoundPlace, PlaceSuggestion } from 'utils/mapPlaceSearch';
import type { LatLng } from 'utils/parcelPolygon';

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
  /** This farm's parcels, searched by name. */
  parcels?: Array<{ name: string; path: LatLng[] }>;
  /** The company's farms, searched by name (those with coordinates on file). */
  farms?: Array<{ id: number | string; name: string; lat?: number | null; lng?: number | null }>;
  /** Where Places suggestions lean (the map's area), without excluding the rest. */
  bias?: LatLng;
}

// Longer than the API's own 15 s timeout, which only counts once the prompt is answered.
const LOCATE_GIVE_UP_MS = 30000;
// Wait for a pause in typing before asking Google: every keystroke is a billable request.
const SUGGEST_DEBOUNCE_MS = 250;
const SUGGEST_MIN_CHARS = 3;

type Outcome =
  | { kind: 'idle' }
  | { kind: 'shown'; place: FoundPlace; others: FoundPlace[] }
  | { kind: 'none'; query: string }
  | { kind: 'unavailable' }
  | { kind: 'locationDenied' }
  | { kind: 'locationFailed' };

type Row =
  | { key: string; group: 'own'; place: FoundPlace }
  | { key: string; group: 'places'; suggestion: PlaceSuggestion };

export const MapPlaceSearch = ({
  onLocate,
  defaultQuery = '',
  foundMessageId = 'map.search.showing',
  warnApproximate = false,
  allowMyLocation = false,
  parcels = [],
  farms = [],
  bias
}: MapPlaceSearchProps) => {
  const intl = useIntl();
  const listId = useId();
  const [query, setQuery] = useState(defaultQuery);
  const typedRef = useRef(false);
  useEffect(() => {
    if (!typedRef.current) setQuery(defaultQuery);
  }, [defaultQuery]);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Google suggestions for the current text. `placesDown` sticks once Places has refused, so a
  // key without the API stops asking on every keystroke and Enter goes to the geocoder instead.
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [placesDown, setPlacesDown] = useState(false);
  const sessionRef = useRef<{ token?: unknown }>({});
  const requestRef = useRef(0);

  const text = query.trim();
  const point = useMemo(() => parseCoordinates(text), [text]);
  const own: FoundPlace[] = useMemo(() => {
    if (!text || !typedRef.current) return [];
    if (point) {
      return [
        {
          label: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`,
          center: point,
          approximate: false
        }
      ];
    }
    return [...matchFarms(text, farms), ...matchParcels(text, parcels)];
  }, [text, point, farms, parcels]);

  useEffect(() => {
    const id = ++requestRef.current;
    setSuggestions([]);
    if (
      placesDown ||
      point ||
      !typedRef.current ||
      text.length < SUGGEST_MIN_CHARS ||
      !window.google?.maps?.importLibrary
    ) {
      setSuggesting(false);
      return undefined;
    }
    setSuggesting(true);
    const timer = setTimeout(() => {
      suggestPlaces(text, sessionRef.current, { bias, language: intl.locale })
        .then((found) => {
          if (id === requestRef.current) setSuggestions(found);
        })
        .catch(() => {
          if (id === requestRef.current) setPlacesDown(true);
        })
        .finally(() => {
          if (id === requestRef.current) setSuggesting(false);
        });
    }, SUGGEST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `bias` moves with the map; asking again for every pan would bill for nothing.
  }, [text, point, placesDown, intl.locale]);

  const rows: Row[] = [
    ...own.map((place, i) => ({ key: `own-${i}`, group: 'own' as const, place })),
    ...suggestions.map((suggestion) => ({
      key: `places-${suggestion.id}`,
      group: 'places' as const,
      suggestion
    }))
  ];
  const showList = open && (rows.length > 0 || suggesting);
  useEffect(() => setActive(0), [text, suggestions.length]);

  const go = (place: FoundPlace, others: FoundPlace[] = []) => {
    onLocate(place);
    setOutcome({ kind: 'shown', place, others });
    setOpen(false);
  };

  const pick = async (row: Row) => {
    if (row.group === 'own') {
      go(row.place);
      return;
    }
    setBusy(true);
    try {
      const place = await row.suggestion.resolve();
      if (place) go(place);
      else setOutcome({ kind: 'none', query: text });
    } catch {
      setOutcome({ kind: 'unavailable' });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  // Enter or Find: the highlighted row if the list has one; otherwise the old path, coordinates
  // or the geocoder, so a key without Places still finds towns once Geocoding is enabled.
  const submit = async () => {
    if (!text || busy) return;
    // Only a row the grower can SEE highlighted: after Escape (or a blur) the list is closed and
    // Enter searches the typed text, never the suggestion they just dismissed (review on #222).
    if (showList && active >= 0 && rows[active]) {
      pick(rows[active]);
      return;
    }
    setBusy(true);
    const result = await findPlace(text);
    setBusy(false);
    setOpen(false);
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
        go({
          label: intl.formatMessage({ id: 'map.search.myLocation' }, { metres }),
          center: { lat: position.coords.latitude, lng: position.coords.longitude },
          approximate: metres > 100
        });
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

  const groupHeader = (id: string, trailing?: React.ReactNode) => (
    <HStack justify="space-between" px={3} pt={2} pb={1}>
      <Text fontSize="xs" fontWeight="semibold" color="gray.600" textTransform="uppercase">
        {intl.formatMessage({ id })}
      </Text>
      {trailing}
    </HStack>
  );

  const rowView = (row: Row, index: number) => {
    const isActive = index === active;
    const icon =
      row.group === 'places'
        ? MdPlace
        : row.place.kind === 'farm'
        ? FaTractor
        : row.place.kind === 'parcel'
        ? FaMapMarkedAlt
        : MdPlace;
    const main =
      row.group === 'places'
        ? row.suggestion.main
        : row.place.kind
        ? row.place.label
        : intl.formatMessage({ id: 'map.search.goTo' }, { place: row.place.label });
    const secondary =
      row.group === 'places'
        ? row.suggestion.secondary
        : row.place.kind === 'farm'
        ? intl.formatMessage({ id: 'map.search.kindFarm' })
        : row.place.kind === 'parcel'
        ? intl.formatMessage({ id: 'map.search.kindParcel' })
        : '';
    return (
      <Flex
        key={row.key}
        id={`${listId}-${index}`}
        role="option"
        aria-selected={isActive}
        align="center"
        gap={3}
        px={3}
        py={2}
        minH="44px"
        borderRadius="lg"
        cursor="pointer"
        bg={isActive ? 'green.50' : 'transparent'}
        border="1px solid"
        borderColor={isActive ? 'green.200' : 'transparent'}
        _hover={{ bg: isActive ? 'green.50' : 'gray.50' }}
        // Keep focus in the input: a blur closing the list must not eat the click.
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setActive(index)}
        onClick={() => pick(row)}>
        <Icon as={icon} color={row.group === 'places' ? 'gray.500' : 'green.700'} boxSize={4} />
        <Box minW={0}>
          <Text fontSize="sm" fontWeight="medium" color="gray.800" noOfLines={1}>
            {main}
          </Text>
          {secondary && (
            <Text fontSize="xs" color="gray.600" noOfLines={1}>
              {secondary}
            </Text>
          )}
        </Box>
      </Flex>
    );
  };

  const ownCount = own.length;

  return (
    <Box>
      <HStack spacing={2} align="start">
        <Box position="relative" flex="1">
          <StandardSearchInput
            value={query}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              typedRef.current = true;
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => typedRef.current && setOpen(true)}
            onBlur={() => setOpen(false)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submit();
              } else if (e.key === 'ArrowDown' && rows.length) {
                e.preventDefault();
                if (!open) setActive(-1);
                setOpen(true);
                setActive((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === 'ArrowUp' && rows.length) {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === 'Escape') {
                setOpen(false);
                setActive(-1);
              }
            }}
            placeholder={intl.formatMessage({ id: 'map.search.placeholder' })}
            aria-label={intl.formatMessage({ id: 'map.search.label' })}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={showList}
            aria-controls={listId}
            aria-activedescendant={
              showList && active >= 0 && rows[active] ? `${listId}-${active}` : undefined
            }
            autoComplete="off"
            enterKeyHint="search"
          />
          {showList && (
            <Box
              id={listId}
              role="listbox"
              aria-label={intl.formatMessage({ id: 'map.search.label' })}
              position="absolute"
              top="calc(100% + 4px)"
              left={0}
              right={0}
              zIndex="dropdown"
              bg="white"
              border="1px solid"
              borderColor="gray.200"
              borderRadius="xl"
              boxShadow="lg"
              p={1}
              maxH="320px"
              overflowY="auto">
              {ownCount > 0 && (
                <>
                  {/* Pasted coordinates are one "Go to" row, not one of the grower's farms. */}
                  {!point && groupHeader('map.search.groupOwn')}
                  {rows.slice(0, ownCount).map((row, i) => rowView(row, i))}
                </>
              )}
              {(suggestions.length > 0 || suggesting) && (
                <>
                  {groupHeader(
                    'map.search.groupPlaces',
                    // Google's terms: Places suggestions shown away from a Google map carry the
                    // attribution; here it rides on the list itself, whatever sits around it.
                    <Text fontSize="xs" color="gray.500">
                      {intl.formatMessage({ id: 'map.search.poweredByGoogle' })}
                    </Text>
                  )}
                  {suggesting && suggestions.length === 0 ? (
                    <HStack px={3} py={2} spacing={2}>
                      <Spinner size="xs" color="green.700" />
                      <Text fontSize="xs" color="gray.600">
                        {intl.formatMessage({ id: 'map.search.searching' })}
                      </Text>
                    </HStack>
                  ) : (
                    rows.slice(ownCount).map((row, i) => rowView(row, ownCount + i))
                  )}
                </>
              )}
            </Box>
          )}
        </Box>
        {/* Secondary weight: on the boundary step the page's primary action is Continue. */}
        <StandardButton
          type="button"
          variant="outline"
          onClick={submit}
          // Keep focus (and the open list) in the box: Find then does exactly what Enter does.
          onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
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
            {helpText(
              intl.formatMessage(
                {
                  id:
                    outcome.place.kind === 'parcel'
                      ? 'map.search.showingParcel'
                      : outcome.place.kind === 'farm'
                      ? 'map.search.showingFarm'
                      : foundMessageId
                },
                { place: outcome.place.label }
              )
            )}
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
