/**
 * Activities — establishment-level calendar + list + verb entry (WS-4a).
 *
 * The QO-parity Activities surface, Trazo-shaped: a month calendar an inspector
 * understands, a list view, and a "Log activity" verb picker. Verbs are the ENTRY
 * layer only — each routes into the existing event flow with the matching event_type
 * preset (the registry stays the field source of truth; the deep wizard
 * consolidation is WS-4b).
 *
 * Route: /admin/dashboard/farm/:farmId/activities
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Flex,
  Grid,
  Icon,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorMode,
  useDisclosure,
  VStack,
  Wrap,
  WrapItem
} from '@chakra-ui/react';
import { FaCalendarAlt, FaChevronLeft, FaChevronRight, FaListUl, FaPlus } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import {
  StandardButton,
  StandardCard,
  StandardInput,
  StandardPage,
  StandardPageLoading,
  StandardPagination,
  StandardSearchInput,
  StandardSegmentedControl,
  StandardSelect
} from 'components/Design/StandardComponents';
import type { Parcel } from 'types/company';
import { ACTIVITY_VERBS } from 'config/activityVerbs';
import { activitySummary, activityTitle } from 'config/events/narrative';
import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { VerbPickerGrid } from 'components/Events/VerbPickerGrid';
import { useGetActivityFeedQuery } from 'store/api/activityFeedApi';
import type { ActivityRow } from 'store/api/activityFeedApi';
import type { RootState } from 'store/index';
import { useTour } from 'hooks/useTour';
import { ActivityDetailModal } from './ActivityDetailModal';
import { ActivityListItem, TYPE_BADGE } from './ActivityListItem';
import { CALENDAR_FAMILY, TYPE_ICON } from 'config/events/eventTypeAppearance';

/**
 * Verb → event_type mapping now lives in the SHARED config (config/activityVerbs) so
 * this page, the parcel Add Event menu, and NewEvent's chooser render one vocabulary
 * (plan Part 1 #38, WS-4b). Storage stays the existing 8 models.
 */
/** Rows per page in the list view. */
const ACTIVITY_PAGE_SIZE = 25;

const VERBS = ACTIVITY_VERBS;

/**
 * Chips a day cell shows before it stops and offers the rest.
 *
 * The cell is 88px tall; a fourth chip does not fit without either scrolling inside a grid
 * square or growing every row in the month to match the busiest day. So the overflow is
 * handled by a DAY SHEET instead — which is also the only way to read a truncated chip in
 * full. Before that sheet existed the `+N` was a plain `<Text>`, and activities 4..n on a
 * spray day were unreachable from the calendar at all.
 */
const DAY_CHIP_LIMIT = 3;

/**
 * One height for every control in the filter row.
 *
 * `StandardButton` hard-codes `minH="44px"` (the touch floor), so a `size="sm"` select next to
 * it renders 32px and the row reads as a mistake rather than a set. Chakra's `md` select is
 * 40px, so the height is stated rather than inferred from a size token.
 */
const FILTER_CONTROL_H = '44px';

/**
 * Calendar days in, calendar days out — never `toISOString()`.
 *
 * `d.toISOString()` converts to UTC first, so local midnight on the 1st becomes the PREVIOUS
 * day for anyone east of Greenwich; `new Date('2026-08-04')` is parsed AS UTC midnight, so it
 * renders as Aug 3 for anyone west of it. Both ends of the trip have to read local parts.
 */
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;
const isoToLocalDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Date-range presets for the LIST view. The calendar does not get one: its month cursor
 * already IS the range, and a second, disagreeing date control on the same screen is how you
 * end up explaining to a grower why an August activity is missing from August.
 */
type RangeKey = 'all' | 'last30' | 'last90' | 'thisYear' | 'lastYear' | 'custom';
const RANGE_KEYS: RangeKey[] = ['all', 'last30', 'last90', 'thisYear', 'lastYear', 'custom'];

const rangeToWindow = (
  key: RangeKey,
  customStart: string,
  customEnd: string
): { start?: string; end?: string } => {
  const today = new Date();
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return localIso(d);
  };
  switch (key) {
    case 'last30':
      return { start: daysAgo(30), end: localIso(today) };
    case 'last90':
      return { start: daysAgo(90), end: localIso(today) };
    case 'thisYear':
      return { start: `${today.getFullYear()}-01-01`, end: `${today.getFullYear()}-12-31` };
    case 'lastYear':
      return { start: `${today.getFullYear() - 1}-01-01`, end: `${today.getFullYear() - 1}-12-31` };
    case 'custom':
      // Either end may be blank — an open-ended window is a legitimate ask ("everything
      // since transition"), and sending only one bound is exactly what the endpoint expects.
      return { start: customStart || undefined, end: customEnd || undefined };
    default:
      return {};
  }
};

const ActivitiesPage = () => {
  const intl = useIntl();
  /* One hook, not one per chip: `useColorModeValue` cannot be called inside the day loop, and
     the family tokens carry their own light/dark pair (see theme/styles.js `colors.family`). */
  const { colorMode } = useColorMode();
  const familyKey = (t: number) => CALENDAR_FAMILY[t] ?? 'other';
  const familyBg = (t: number) =>
    `family.${familyKey(t)}.${colorMode === 'dark' ? 'bgDark' : 'bg'}`;
  const familyFg = (t: number) =>
    `family.${familyKey(t)}.${colorMode === 'dark' ? 'fgDark' : 'fg'}`;
  const navigate = useNavigate();
  const { farmId } = useParams();
  const currentCompany = useSelector((s: RootState) => s.company.currentCompany);
  const companyId = currentCompany?.id != null ? String(currentCompany.id) : '';
  const establishment = currentCompany?.establishments?.find(
    (e: { id: number | string }) => String(e.id) === String(farmId)
  );
  // `Parcel.id` is `string | number` (types/company.ts), so annotating this as
  // `{ id: number; name: string }[]` was narrower than the data. Reuse the real type
  // rather than re-declaring a looser copy that drifts.
  const parcels: Parcel[] = establishment?.parcels ?? [];

  // First visit to the logging surface. Gated on the farm resolving, so the tour does not
  // fire against a page whose targets are still behind the loading state.
  useTour('activities-page', { enabled: !!establishment });

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const verbModal = useDisclosure();
  const [pendingVerb, setPendingVerb] = useState<(typeof VERBS)[number] | null>(null);
  // Which activity is open for reading, and which day is open in full. Both are plain row/
  // key state rather than useDisclosure: the identity IS the open condition, so they cannot
  // fall out of sync with a separate boolean.
  const [detailRow, setDetailRow] = useState<ActivityRow | null>(null);
  const [daySheetIso, setDaySheetIso] = useState<string | null>(null);
  const [parcelFilter, setParcelFilter] = useState('');
  const [rangeKey, setRangeKey] = useState<RangeKey>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const monthStart = cursor;
  const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

  // The calendar's window is its month; the list's is whatever the range filter says. The
  // list used to send NO window at all, which meant it silently asked for the farm's entire
  // history and took whatever fitted under the endpoint's cap.
  const listWindow = useMemo(
    () => (view === 'list' ? rangeToWindow(rangeKey, customStart, customEnd) : {}),
    [view, rangeKey, customStart, customEnd]
  );

  const { data, isLoading, isFetching, refetch } = useGetActivityFeedQuery(
    {
      companyId,
      farmId: farmId || '',
      start: view === 'calendar' ? localIso(monthStart) : listWindow.start,
      end: view === 'calendar' ? localIso(monthEnd) : listWindow.end,
      eventType: typeFilter ?? undefined,
      // Server-side: the endpoint caps its payload, so filtering by parcel here would hide a
      // block's older rows whenever a busier block fills the cap first.
      parcelId: parcelFilter || undefined
    },
    { skip: !companyId || !farmId }
  );

  const rows = useMemo(() => {
    let out = data?.activities ?? [];
    // The SERVER does the parcel filtering that matters (it applies before the payload caps,
    // so it is the only version that can see a quiet block's older rows). This second pass
    // exists so the TABLE can never contradict the control above it: if the response is
    // stale, cached, or served by a backend that does not know the param, the viewer sees
    // fewer rows rather than another block's rows under a label naming this one.
    if (parcelFilter) {
      out = out.filter((r) => String(r.parcel_id) === parcelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(
        (r) =>
          (r.description || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q) ||
          (r.parcel_name || '').toLowerCase().includes(q) ||
          (r.subtype || '').toLowerCase().includes(q)
      );
    }
    return out;
  }, [data, search, parcelFilter]);

  // Client-side: the activities endpoint returns the farm's whole log in one response, and the
  // list rendered every row of it. Paging is presentation only — `rows` (search-filtered) stays
  // the source of truth for the total, so the count reflects the current filter, not the farm.
  const [listPage, setListPage] = useState(1);
  // Clamped, so a list that shrinks for ANY reason — a refetch, a month change, a filter this
  // effect does not watch — can never slice past the end and paint an empty table under a pager
  // reading "Page 7 of 2".
  const listPageCount = Math.max(1, Math.ceil(rows.length / ACTIVITY_PAGE_SIZE));
  const safeListPage = Math.min(listPage, listPageCount);
  const visibleRows = useMemo(
    () => rows.slice((safeListPage - 1) * ACTIVITY_PAGE_SIZE, safeListPage * ACTIVITY_PAGE_SIZE),
    [rows, safeListPage]
  );

  // Narrowing the list should also send the viewer back to the top of it, not merely keep them
  // in range: landing on page 3 of a fresh search result is disorienting.
  useEffect(() => {
    setListPage(1);
  }, [search, typeFilter, parcelFilter, rangeKey, customStart, customEnd]);

  // The parcel select and the type pills narrow BOTH views; the range narrows the list only,
  // so it does not count as active while the calendar is showing.
  const hasActiveFilter =
    !!parcelFilter ||
    typeFilter !== null ||
    !!search.trim() ||
    (view === 'list' && rangeKey !== 'all');
  const clearFilters = () => {
    setParcelFilter('');
    setTypeFilter(null);
    setSearch('');
    setRangeKey('all');
    setCustomStart('');
    setCustomEnd('');
  };

  const byDay = useMemo(() => {
    const map = new Map<string, ActivityRow[]>();
    rows.forEach((r) => {
      if (!r.date) return;
      const key = r.date.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return map;
  }, [rows]);

  const weeks = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = firstDay.getDay();
    const daysInMonth = monthEnd.getDate();
    const cells: Array<{ day: number | null; iso?: string }> = [];
    for (let i = 0; i < startOffset; i += 1) cells.push({ day: null });
    for (let d = 1; d <= daysInMonth; d += 1) {
      cells.push({
        day: d,
        iso: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(
          d
        ).padStart(2, '0')}`
      });
    }
    while (cells.length % 7 !== 0) cells.push({ day: null });
    const out = [];
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7));
    return out;
  }, [cursor, monthEnd]);

  const typeLabel = (t: number) => intl.formatMessage({ id: `activities.type.${t}` });

  // Clicking an activity OPENS it, it does not start editing it. Edit stays one deliberate
  // button inside the detail modal — the same modal the parcel timeline opens — so nobody
  // lands in a form that mutates a certifier record just because they wanted to look.
  const openEvent = (row: ActivityRow) => setDetailRow(row);

  const daySheetRows = daySheetIso ? byDay.get(daySheetIso) ?? [] : [];

  const startVerb = (verb: (typeof VERBS)[number]) => {
    if (parcels.length === 1) {
      verbModal.onClose();
      navigate(
        `/admin/dashboard/farm/${farmId}/parcel/${parcels[0].id}/event/add?event_type=${verb.eventType}&verb=${verb.key}`
      );
      return;
    }
    setPendingVerb(verb);
  };

  const monthTitle = cursor.toLocaleDateString(intl.locale, { month: 'long', year: 'numeric' });

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'activities.pageTitle' })}
      description={intl.formatMessage({ id: 'activities.pageDescription' })}
      // The page's one primary action belongs opposite the title, not floating at the end of
      // a row of filters. Same slot the OSP/parcel pages put their action in.
      rightAction={
        <Box data-tour="activities-log">
          <StandardButton minH="44px" leftIcon={<FaPlus />} onClick={verbModal.onOpen}>
            {intl.formatMessage({ id: 'activities.log' })}
          </StandardButton>
        </Box>
      }>
      <VStack align="stretch" spacing={5}>
        <Flex
          justify="space-between"
          gap={3}
          direction={{ base: 'column', smd: 'row' }}
          align={{ base: 'stretch', smd: 'center' }}>
          <Box data-tour="activities-views">
            <StandardSegmentedControl
              ariaLabel={intl.formatMessage({ id: 'activities.view.label' })}
              value={view}
              onChange={setView}
              options={[
                {
                  key: 'calendar',
                  label: intl.formatMessage({ id: 'activities.view.calendar' }),
                  icon: FaCalendarAlt
                },
                {
                  key: 'list',
                  label: intl.formatMessage({ id: 'activities.view.list' }),
                  icon: FaListUl
                }
              ]}
            />
          </Box>

          <StandardSearchInput
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={intl.formatMessage({ id: 'activities.searchPlaceholder' })}
            maxW={{ base: 'full', smd: '280px' }}
          />
        </Flex>

        {/* ONE filter bar, not two rows.
            Activity type is a filter exactly like parcel and date are — styling it as its own
            left-aligned row while the selects sat right-aligned in a second row left a band of
            empty page between them, and implied the three narrow different things. They are
            three axes of one question, so they share a row: type toggles left, the two selects
            and Clear right.

            Deliberately NOT collapsed behind an "Add filter" button. Hiding filters costs
            discovery, and hidden ACTIVE filters are the classic "where did my rows go" bug.
            That trade only pays once there are ~4+ secondary filters or the bar wraps at
            common widths; with two selects it would add a click and a popover to save a row. */}
        <Flex
          gap={3}
          // Row above `smd`, stack below it. As a ROW the select group is a shrink-to-fit
          // flex item, which on a phone left the selects at their content width instead of
          // full-bleed — `align="stretch"` cannot widen a child of a row.
          direction={{ base: 'column', smd: 'row' }}
          align={{ base: 'stretch', smd: 'flex-end' }}
          wrap="wrap">
          <Wrap
            spacing={2}
            flex="1 1 auto"
            role="group"
            aria-label={intl.formatMessage({ id: 'activities.filter.label' })}>
            <WrapItem>
              <StandardButton
                size="sm"
                minH="44px"
                borderRadius="full"
                aria-pressed={typeFilter === null}
                variant={typeFilter === null ? 'primary' : 'outline'}
                onClick={() => setTypeFilter(null)}>
                {intl.formatMessage({ id: 'activities.filter.all' })}
              </StandardButton>
            </WrapItem>
            {[1, 2, 5, 6, 0, 7].map((t) => (
              <WrapItem key={t}>
                <StandardButton
                  size="sm"
                  minH={FILTER_CONTROL_H}
                  borderRadius="full"
                  aria-pressed={typeFilter === t}
                  variant={typeFilter === t ? 'primary' : 'outline'}
                  onClick={() => setTypeFilter(typeFilter === t ? null : t)}>
                  {typeLabel(t)}
                </StandardButton>
              </WrapItem>
            ))}
          </Wrap>

          {/* Same shape as the Buyer page's scan filters: labelled selects, stacked on a
              phone, with Clear appearing only once something is narrowing. A select with one
              option is a label wearing a chevron, so the parcel filter is rendered only on a
              farm that HAS more than one block. */}
          <Flex
            gap={3}
            align={{ base: 'stretch', smd: 'flex-end' }}
            direction={{ base: 'column', smd: 'row' }}
            wrap="wrap"
            // A one-parcel farm on the calendar has no selects to show; without this the
            // empty flex item still spends the parent's gap.
            display={parcels.length > 1 || view === 'list' || hasActiveFilter ? 'flex' : 'none'}>
            {parcels.length > 1 ? (
              <Box minW={{ base: 'full', smd: '200px' }}>
                <Text fontSize="xs" color="gray.600" mb={1}>
                  {intl.formatMessage({ id: 'activities.filter.parcel' })}
                </Text>
                <StandardSelect
                  size="md"
                  h={FILTER_CONTROL_H}
                  value={parcelFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setParcelFilter(e.target.value)
                  }
                  aria-label={intl.formatMessage({ id: 'activities.filter.parcel' })}>
                  <option value="">
                    {intl.formatMessage({ id: 'activities.filter.allParcels' })}
                  </option>
                  {parcels.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.name}
                    </option>
                  ))}
                </StandardSelect>
              </Box>
            ) : null}

            {view === 'list' ? (
              <Box minW={{ base: 'full', smd: '200px' }}>
                <Text fontSize="xs" color="gray.600" mb={1}>
                  {intl.formatMessage({ id: 'activities.filter.range' })}
                </Text>
                <StandardSelect
                  size="md"
                  h={FILTER_CONTROL_H}
                  value={rangeKey}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setRangeKey(e.target.value as RangeKey)
                  }
                  aria-label={intl.formatMessage({ id: 'activities.filter.range' })}>
                  {RANGE_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {intl.formatMessage({ id: `activities.filter.range.${key}` })}
                    </option>
                  ))}
                </StandardSelect>
              </Box>
            ) : null}

            {view === 'list' && rangeKey === 'custom' ? (
              <>
                <Box minW={{ base: 'full', smd: '170px' }}>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {intl.formatMessage({ id: 'activities.filter.from' })}
                  </Text>
                  {/* `max`/`min` cross-bind the two inputs so the browser refuses an inverted
                      window at entry, instead of the page answering "0 activities" and
                      leaving the grower to work out why. */}
                  <StandardInput
                    size="md"
                    h={FILTER_CONTROL_H}
                    type="date"
                    value={customStart}
                    max={customEnd || undefined}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomStart(e.target.value)
                    }
                    aria-label={intl.formatMessage({ id: 'activities.filter.from' })}
                  />
                </Box>
                <Box minW={{ base: 'full', smd: '170px' }}>
                  <Text fontSize="xs" color="gray.600" mb={1}>
                    {intl.formatMessage({ id: 'activities.filter.to' })}
                  </Text>
                  <StandardInput
                    size="md"
                    h={FILTER_CONTROL_H}
                    type="date"
                    value={customEnd}
                    min={customStart || undefined}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomEnd(e.target.value)
                    }
                    aria-label={intl.formatMessage({ id: 'activities.filter.to' })}
                  />
                </Box>
              </>
            ) : null}

            {hasActiveFilter ? (
              <StandardButton
                size="md"
                variant="outline"
                h={FILTER_CONTROL_H}
                onClick={clearFilters}>
                {intl.formatMessage({ id: 'activities.filter.clear' })}
              </StandardButton>
            ) : null}
          </Flex>
        </Flex>

        {/* The result count sits on its own line directly above the card it describes, rather
            than competing for width inside the bar: it is the ANSWER to the filters, not one
            of them, and a number whose digits change must not be able to shift the controls. */}
        {hasActiveFilter ? (
          <Text fontSize="sm" color="gray.600" mt={-2}>
            {intl.formatMessage({ id: 'activities.filter.matchCount' }, { count: rows.length })}
          </Text>
        ) : null}

        {/* A capped list that does not say it is capped reads as the whole log. */}
        {data?.truncated ? (
          <Alert status="info">
            <AlertIcon />
            <Text fontSize="sm">{intl.formatMessage({ id: 'activities.truncatedNotice' })}</Text>
          </Alert>
        ) : null}

        {/* `isLoading` is only the FIRST load. Changing a filter re-fetches under
            `isFetching`, and without this the previous result sat there fully interactive
            beneath a control naming something else — which is indistinguishable from a
            filter that does not work. Dim + block input while the answer is in flight. */}
        <Box
          data-tour="activities-timeline"
          opacity={!isLoading && isFetching ? 0.55 : 1}
          pointerEvents={!isLoading && isFetching ? 'none' : 'auto'}
          transition="opacity 0.15s ease"
          aria-busy={isFetching}>
          {isLoading ? (
            <StandardPageLoading />
          ) : view === 'calendar' ? (
            <StandardCard>
              <Flex justify="space-between" align="center" mb={4}>
                <StandardButton
                  variant="ghost"
                  minH="44px"
                  aria-label={intl.formatMessage({ id: 'activities.prevMonth' })}
                  onClick={() =>
                    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
                  }>
                  <FaChevronLeft />
                </StandardButton>
                <Text fontWeight="semibold" textTransform="capitalize">
                  {monthTitle}
                </Text>
                <StandardButton
                  variant="ghost"
                  minH="44px"
                  aria-label={intl.formatMessage({ id: 'activities.nextMonth' })}
                  onClick={() =>
                    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
                  }>
                  <FaChevronRight />
                </StandardButton>
              </Flex>
              <Box overflowX="auto">
                <Grid templateColumns="repeat(7, minmax(96px, 1fr))" gap={1} minW="680px">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <Text
                      key={d}
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.500"
                      textAlign="center">
                      {intl.formatMessage({ id: `activities.weekday.${d}` })}
                    </Text>
                  ))}
                  {weeks.flat().map((cell, i) => {
                    const dayRows = cell.iso ? byDay.get(cell.iso) ?? [] : [];
                    const overflow = dayRows.length - DAY_CHIP_LIMIT;
                    const dayLabel = cell.iso
                      ? isoToLocalDate(cell.iso).toLocaleDateString(intl.locale, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric'
                        })
                      : '';
                    return (
                      <Box
                        key={i}
                        minH="88px"
                        borderWidth="1px"
                        borderColor="gray.100"
                        borderRadius="md"
                        p={1}
                        bg={cell.day ? 'white' : 'gray.50'}>
                        {cell.day ? (
                          <>
                            {/* A day that HOLDS something is a way in to all of it. The date
                              strip is the trigger rather than the whole cell, because the
                              chips inside are buttons and a button cannot nest in a button.
                              Deliberate deviation from the 44px touch floor: this is a dense
                              7-column grid where a 44px header would double every row. */}
                            {dayRows.length ? (
                              <Box
                                as="button"
                                type="button"
                                w="full"
                                textAlign="left"
                                borderRadius="sm"
                                mb={1}
                                _hover={{ bg: 'green.50' }}
                                onClick={() => setDaySheetIso(cell.iso!)}
                                aria-label={intl.formatMessage(
                                  { id: 'activities.day.openDay' },
                                  { count: dayRows.length, date: dayLabel }
                                )}>
                                <Text fontSize="xs" color="gray.600" fontWeight="medium">
                                  {cell.day}
                                </Text>
                              </Box>
                            ) : (
                              <Text fontSize="xs" color="gray.500" mb={1}>
                                {cell.day}
                              </Text>
                            )}
                            <VStack align="stretch" spacing={0.5}>
                              {dayRows.slice(0, DAY_CHIP_LIMIT).map((row) => (
                                <Box
                                  key={`${row.event_type}-${row.event_id}`}
                                  as="button"
                                  type="button"
                                  textAlign="left"
                                  w="full"
                                  onClick={() => openEvent(row)}
                                  borderRadius="sm"
                                  px={1}
                                  _hover={{ bg: 'green.50' }}
                                  aria-label={intl.formatMessage(
                                    { id: 'activities.openEvent' },
                                    { title: activityTitle(row, intl), date: dayLabel }
                                  )}>
                                  {/* CAL 3 — hue AND glyph (2026-08-29).
                                      The month view is the one surface where this chip stands
                                      alone: no icon beside it, no title, no description, and a
                                      label that truncates. The single tonal green the timeline
                                      uses turns a month into identical pills, so the family
                                      needs a discriminator here — but NOT colour on its own.
                                      The glyph carries identification, the hue carries the
                                      glance, and neither has to be right by itself, which is
                                      the never-colour-alone rule already applied to status.
                                      Hues, their measurements and the mnemonic-not-evaluative
                                      rule live in theme/styles.js `colors.family`. */}
                                  <Badge
                                    variant="neutral"
                                    bg={familyBg(row.event_type)}
                                    color={familyFg(row.event_type)}
                                    fontSize="11px"
                                    maxW="full"
                                    display="flex"
                                    alignItems="center"
                                    gap={1}>
                                    <Icon
                                      as={TYPE_ICON[row.event_type] ?? TYPE_ICON[3]}
                                      boxSize="11px"
                                      flexShrink={0}
                                      aria-hidden
                                    />
                                    <Text isTruncated fontSize="11px">
                                      {activityTitle(row, intl)}
                                    </Text>
                                  </Badge>
                                </Box>
                              ))}
                              {/* Was a plain <Text>: it announced hidden activities and gave
                                no way to reach them. */}
                              {overflow > 0 ? (
                                <Box
                                  as="button"
                                  type="button"
                                  w="full"
                                  textAlign="left"
                                  px={1}
                                  borderRadius="sm"
                                  _hover={{ bg: 'green.50' }}
                                  onClick={() => setDaySheetIso(cell.iso!)}
                                  aria-label={intl.formatMessage(
                                    { id: 'activities.day.openDay' },
                                    { count: dayRows.length, date: dayLabel }
                                  )}>
                                  <Text
                                    fontSize="11px"
                                    color="green.700"
                                    fontWeight="medium"
                                    textDecoration="underline">
                                    {intl.formatMessage(
                                      { id: 'activities.day.more' },
                                      { count: overflow }
                                    )}
                                  </Text>
                                </Box>
                              ) : null}
                            </VStack>
                          </>
                        ) : null}
                      </Box>
                    );
                  })}
                </Grid>
              </Box>
            </StandardCard>
          ) : (
            <StandardCard>
              {!rows.length ? (
                // "Log your first activity" is the wrong sentence for a farm that has hundreds
                // and just filtered them all out — and it is the one that makes a grower think
                // the log was lost.
                <VStack py={8} spacing={2}>
                  <Text fontWeight="semibold">
                    {intl.formatMessage({
                      id: hasActiveFilter
                        ? 'activities.emptyFilteredTitle'
                        : 'activities.emptyTitle'
                    })}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    {intl.formatMessage({
                      id: hasActiveFilter ? 'activities.emptyFilteredBody' : 'activities.emptyBody'
                    })}
                  </Text>
                  {hasActiveFilter ? (
                    <StandardButton size="sm" variant="outline" minH="44px" onClick={clearFilters}>
                      {intl.formatMessage({ id: 'activities.filter.clear' })}
                    </StandardButton>
                  ) : null}
                </VStack>
              ) : (
                <Box>
                  {/* ONE list, two shapes.
                    A four-column table does not survive a phone. `overflowX="auto"` with no
                    floor on the table width let it shrink to the container instead of
                    scrolling, and at 390px every cell wrapped to ONE CHARACTER PER LINE — the
                    ACTIVITY and PARCEL columns rendered as vertical stacks of letters. Giving
                    it a `minW` fixed the wrapping but bought a sideways scroll, which hides the
                    parcel — the column that answers "which block?" — off-screen by default.
                    So below `md` the same rows render as cards, where the reading order is the
                    order a grower asks in: when, what kind, what happened, which block. */}
                  <VStack
                    display={{ base: 'flex', md: 'none' }}
                    align="stretch"
                    spacing={2}
                    data-testid="activities-list-cards">
                    {visibleRows.map((row) => (
                      <ActivityListItem
                        key={`${row.event_type}-${row.event_id}`}
                        row={row}
                        intl={intl}
                        onClick={() => openEvent(row)}
                      />
                    ))}
                  </VStack>

                  <Box display={{ base: 'none', md: 'block' }} overflowX="auto">
                    <Table size="sm" minW="720px">
                      <Thead>
                        {/* ACTIVITY takes the slack, so the three narrow columns keep their
                            headers on one line — PARCEL was breaking to "PARCE / L" once the
                            description column grew. */}
                        <Tr>
                          <Th whiteSpace="nowrap">
                            {intl.formatMessage({ id: 'activities.col.date' })}
                          </Th>
                          <Th whiteSpace="nowrap">
                            {intl.formatMessage({ id: 'activities.col.type' })}
                          </Th>
                          <Th w="100%">{intl.formatMessage({ id: 'activities.col.detail' })}</Th>
                          <Th whiteSpace="nowrap">
                            {intl.formatMessage({ id: 'activities.col.parcel' })}
                          </Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {visibleRows.map((row) => (
                          <Tr
                            key={`${row.event_type}-${row.event_id}`}
                            onClick={() => openEvent(row)}
                            cursor="pointer"
                            _hover={{ bg: 'green.50' }}>
                            <Td whiteSpace="nowrap">
                              <Text fontSize="sm">{row.date?.slice(0, 10) ?? '—'}</Text>
                            </Td>
                            <Td>
                              <Badge variant={TYPE_BADGE[row.event_type]} fontSize="11px">
                                {typeLabel(row.event_type)}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontSize="sm" fontWeight="medium">
                                {activityTitle(row, intl)}
                              </Text>
                              {(() => {
                                const summary = activitySummary(row, intl) || row.description;
                                return summary ? (
                                  <Text fontSize="xs" color="gray.600" noOfLines={1}>
                                    {summary}
                                  </Text>
                                ) : null;
                              })()}
                            </Td>
                            <Td>
                              <Text fontSize="sm">{row.parcel_name}</Text>
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  </Box>

                  {/* Outside the scroll container on purpose: when the pager lived inside it, a
                    sideways scroll of the table carried the pagination off with it. */}
                  <StandardPagination
                    page={safeListPage}
                    total={rows.length}
                    pageSize={ACTIVITY_PAGE_SIZE}
                    onChange={setListPage}
                    itemLabel={intl.formatMessage({ id: 'activities.item' })}
                  />
                </Box>
              )}
            </StandardCard>
          )}
        </Box>
      </VStack>

      <ResponsiveModal
        isOpen={verbModal.isOpen}
        onClose={() => {
          setPendingVerb(null);
          verbModal.onClose();
        }}
        size="lg"
        header={
          <Text fontSize="lg" fontWeight="semibold">
            {pendingVerb
              ? intl.formatMessage({ id: 'activities.pickParcel' })
              : intl.formatMessage({ id: 'activities.pickVerb' })}
          </Text>
        }>
        {pendingVerb ? (
          <VStack align="stretch" spacing={2}>
            {/*
              Neutral option rows, not outline BUTTONS.
              Step 2 used `variant="outline"`, so six parcels arrived as six green-bordered
              calls to action — six things to do rather than one choice among six — and it
              looked like a different product from step 1, which is white tiles with a grey
              border. Same tile treatment here: grey at rest, green on hover/focus, the choice
              signalled by fill and border rather than by every row shouting.
            */}
            {parcels.map((p) => (
              <Box
                key={p.id}
                as="button"
                type="button"
                textAlign="left"
                bg="white"
                color="gray.700"
                fontWeight="semibold"
                fontSize="sm"
                borderWidth="2px"
                borderColor="gray.200"
                borderRadius="xl"
                px={4}
                minH="44px"
                display="flex"
                alignItems="center"
                transition="all 0.2s ease"
                _hover={{
                  borderColor: 'green.600',
                  transform: 'translateY(-1px)',
                  boxShadow: 'lg'
                }}
                _focus={{ outline: 'none', borderColor: 'green.700', boxShadow: 'field-focus' }}
                onClick={() => {
                  verbModal.onClose();
                  setPendingVerb(null);
                  navigate(
                    `/admin/dashboard/farm/${farmId}/parcel/${p.id}/event/add?event_type=${pendingVerb.eventType}&verb=${pendingVerb.key}`
                  );
                }}>
                {p.name}
              </Box>
            ))}
          </VStack>
        ) : (
          <VerbPickerGrid onSelect={startVerb} columns={{ base: 2, smd: 2 }} />
        )}
      </ResponsiveModal>

      {/* The day sheet: every activity on one date, in full, with nothing truncated and
          nothing hidden behind a chip cap. */}
      <ResponsiveModal
        isOpen={!!daySheetIso}
        onClose={() => setDaySheetIso(null)}
        size="lg"
        header={
          <VStack align="start" spacing={0.5}>
            <Text fontSize="lg" fontWeight="semibold">
              {daySheetIso
                ? isoToLocalDate(daySheetIso).toLocaleDateString(intl.locale, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                : ''}
            </Text>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'activities.day.count' }, { count: daySheetRows.length })}
            </Text>
          </VStack>
        }>
        <VStack align="stretch" spacing={2}>
          {daySheetRows.map((row) => (
            <ActivityListItem
              key={`${row.event_type}-${row.event_id}`}
              row={row}
              intl={intl}
              showDate={false}
              onClick={() => openEvent(row)}
            />
          ))}
        </VStack>
      </ResponsiveModal>

      <ActivityDetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
        farmId={farmId || ''}
        // Deleting an event invalidates `{type:'Event'}` with no id, which does NOT match
        // the feed's `{type:'Event', id: 'feed-<farmId>'}` provider — so the calendar would
        // keep painting a row that no longer exists. Refetch explicitly.
        onDeleted={() => {
          setDaySheetIso(null);
          refetch();
        }}
      />
    </StandardPage>
  );
};

export default ActivitiesPage;
