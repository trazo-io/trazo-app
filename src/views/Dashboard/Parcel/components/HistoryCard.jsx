// Chakra imports
import React from 'react';
import { config } from 'config/environment';
import {
  Badge,
  Button,
  Box,
  VStack,
  HStack,
  CircularProgress,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  Tooltip,
  Progress,
  Avatar,
  AvatarGroup,
  IconButton,
  useBreakpointValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaPlus,
  FaFilter,
  FaSortAmountDown,
  FaCalendarAlt,
  FaCheckCircle,
  FaRegCircle,
  FaEye,
  FaEdit,
  FaArchive,
  FaEllipsisV
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useMemo, useState } from 'react';

import { useGetParcelHistoriesQuery } from 'store/api/historyApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import {
  StandardEmptyState,
  StandardSpinner,
  StandardQueryError
} from 'components/Design/StandardComponents';
import CardHeader from 'components/Card/CardHeader';
import { useUserRole } from 'hooks/useUserRole';
import { formatDateFromTimestamp } from 'utils/dateOnly';

const HistoryCard = ({ amount }) => {
  const intl = useIntl();
  const { canWrite } = useUserRole();
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const mutedTextColor = useColorModeValue('gray.600', 'gray.400');
  // ⚠️ These two were called INSIDE the productions .map() below, so the number of hook calls
  // per render tracked the number of productions — a Rules of Hooks violation that throws
  // "Rendered more hooks than during the previous render" the moment the list length changes.
  // Which is exactly what starting or finishing a production does.
  // ⚠️ The dark values here were `green.900/10` and `blue.900/10` — TAILWIND's slash-opacity
  // syntax, which Chakra does not parse. They resolved to no token and emitted an invalid CSS
  // value, so dark mode had no hover tint at all. Written as real tokens now.
  //
  // Ongoing is AMBER, not blue: `.claude/rules/frontend.md` gives in-progress to `warning`
  // and leaves blue with no meaning outside `Alert status="info"`.
  // Rows highlight on hover with a neutral wash; green belongs to the status, not the pointer.
  const rowHoverBg = useColorModeValue('gray.50', 'gray.700');
  const navigate = useNavigate();

  // Mobile responsiveness
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const currentCompany = useSelector((state) => state.company.currentCompany);
  const currentHistory = useSelector((state) => state.history?.currentHistory);

  const { parcelId, farmId } = useParams();

  // `isError` read: on a failed request `data` stays undefined and the card fell through to
  // its StandardEmptyState, telling the operator this parcel has no production history.
  const { data, isLoading, isFetching, isUninitialized, isError, refetch } =
    useGetParcelHistoriesQuery(
      { companyId: currentCompany?.id, farmId, parcelId },
      {
        skip: !parcelId || !farmId || !currentCompany || currentCompany?.id === undefined,
        // 30 s, not `true`: a result the boot prefetch fetched a second ago is fresh, and every
        // event write invalidates the 'History' tag anyway (2026-09-06).
        refetchOnMountOrArgChange: 30
      }
    );

  // Calculate production statistics with enhanced status logic
  const productionStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const completed = data.filter((p) => {
      if (!p.finish_date) return false;
      const startDate = new Date(p.start_date);
      const finishDate = new Date(p.finish_date);
      const finishDay = new Date(
        finishDate.getFullYear(),
        finishDate.getMonth(),
        finishDate.getDate()
      );
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      // Same-day productions are considered ongoing (not completed until next day)
      if (finishDay.getTime() === startDay.getTime() && finishDay.getTime() === today.getTime()) {
        return false;
      }
      return finishDay < today;
    }).length;

    const ongoing = data.filter((p) => {
      const startDate = new Date(p.start_date);
      if (!p.finish_date) return startDate <= now;

      const finishDate = new Date(p.finish_date);
      const finishDay = new Date(
        finishDate.getFullYear(),
        finishDate.getMonth(),
        finishDate.getDate()
      );
      const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());

      // Same-day productions are considered ongoing
      if (finishDay.getTime() === startDay.getTime() && finishDay.getTime() === today.getTime()) {
        return true;
      }
      return startDate <= now && finishDay >= today;
    }).length;

    // The "avg score" stat was removed 2026-08-11 with the rest of the producer-facing
    // transparency score (see the header comment on the statistics row below). It averaged the
    // stored `History.transparency_score` column, while the farm dashboard recomputed the same
    // number live via `TransparencyCalculator` — two sources, one label, free to disagree.
    // `transparency_score` still ships in this payload and is still maintained backend-side; it
    // is simply not a number this card puts in front of a grower any more.

    const totalEmissions = data.reduce((sum, p) => {
      const extraData = p.extra_data || {};
      return sum + (extraData.total_emissions || 0);
    }, 0);

    // Count total documented events across all productions
    // Use events_count from API (annotated), fallback to events array length
    const totalDocumentedEvents = data.reduce((sum, p) => {
      const eventCount = p.events_count || (p.events ? p.events.length : 0);
      return sum + eventCount;
    }, 0);

    return {
      completed,
      ongoing,
      totalEmissions: totalEmissions.toFixed(1),
      totalDocumentedEvents
    };
  }, [data]);

  // Filter and sort productions based on user selection
  const filteredAndSortedProductions = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Step 1: Filter by status
    let filtered = [...data];
    if (statusFilter === 'ongoing') {
      filtered = filtered.filter((p) => !p.finish_date);
    } else if (statusFilter === 'completed') {
      filtered = filtered.filter((p) => !!p.finish_date);
    }

    // Step 2: Sort
    if (sortBy === 'default') {
      filtered.sort((a, b) => {
        const aIsOngoing = !a.finish_date;
        const bIsOngoing = !b.finish_date;
        if (aIsOngoing && !bIsOngoing) return -1;
        if (!aIsOngoing && bIsOngoing) return 1;
        if (!aIsOngoing && !bIsOngoing) {
          return new Date(b.finish_date) - new Date(a.finish_date);
        }
        return new Date(b.start_date) - new Date(a.start_date);
      });
    } else if (sortBy === 'newest') {
      filtered.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
    } else if (sortBy === 'oldest') {
      filtered.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    }
    // The `scoreHigh` / `scoreLow` branches and their `sortableScore()` helper went with the
    // score display on 2026-08-11. `sortBy` can no longer hold either value; an unknown value
    // falls through to the payload order, same as before.

    return filtered;
  }, [data, statusFilter, sortBy]);

  return (
    <Card
      bg={cardBgColor}
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      /* No fixed height — same reason as its grid sibling TrackList. These two locked
         DIFFERENT mobile heights (650 here, 700 there) in a grid that puts them in separate
         rows on mobile, so the lock aligned nothing and only capped both. On desktop they
         share a row and CSS Grid stretches them to equal height for free. */
      transition="all 0.3s ease"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
      className="trazo-card"
      data-tour="productions-history">
      <CardHeader px={{ base: 0, md: 6 }} py={5}>
        <Flex direction="column" w="100%">
          {/* Header with divider */}
          <Flex direction="column" pb={4} gap={3}>
            {/* Title row - always horizontal */}
            <Flex direction="row" justify="space-between" align="center" w="100%">
              {/* A "Transparency Tracked" badge sat beside this title until 2026-08-11. It was
                  UNCONDITIONAL — identical on a parcel with 28 events and on one with none — so it
                  carried no information, directly above a stat row built on the house standard at
                  `Dashboard/index.tsx` ("Facts only — counts of what was actually recorded").
                  A count is a fact; a permanent badge is a slogan. Removed with the score. */}
              <Flex wrap="wrap" gap={2} align="center" flexShrink={0}>
                <Text
                  fontSize={{ base: 'md', md: 'lg' }}
                  color={textColor}
                  fontWeight="600"
                  whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'parcelPage.seasons' })}
                </Text>
              </Flex>

              {data && data.length > 1 && (
                <HStack spacing={1} flexShrink={0}>
                  <Menu>
                    <Tooltip
                      label={intl.formatMessage({ id: 'parcel.filterProductions' })}
                      placement="top">
                      <Box position="relative" display="inline-block">
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={FaFilter} />}
                          aria-label={intl.formatMessage({ id: 'parcel.filterProductions' })}
                          color={statusFilter !== 'all' ? 'green.700' : 'gray.500'}
                          _hover={{
                            color: statusFilter !== 'all' ? 'green.600' : 'gray.700',
                            bg: 'gray.100'
                          }}
                        />
                        {statusFilter !== 'all' && (
                          <Box
                            position="absolute"
                            top="1"
                            right="1"
                            w="6px"
                            h="6px"
                            bg="green.500"
                            borderRadius="full"
                            pointerEvents="none"
                          />
                        )}
                      </Box>
                    </Tooltip>
                    <MenuList minW="150px" zIndex={10}>
                      <Text
                        px={3}
                        py={1}
                        fontSize="xs"
                        fontWeight="600"
                        color="gray.500"
                        textTransform="uppercase">
                        {intl.formatMessage({ id: 'parcel.filterStatus' })}
                      </Text>
                      <MenuDivider />
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('all')}
                        fontWeight={statusFilter === 'all' ? '600' : '400'}
                        color={statusFilter === 'all' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.filterAll' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('ongoing')}
                        fontWeight={statusFilter === 'ongoing' ? '600' : '400'}
                        color={statusFilter === 'ongoing' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.filterOngoing' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('completed')}
                        fontWeight={statusFilter === 'completed' ? '600' : '400'}
                        color={statusFilter === 'completed' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.filterCompleted' })}
                      </MenuItem>
                    </MenuList>
                  </Menu>

                  {/* Sort Menu */}
                  <Menu>
                    <Tooltip
                      label={intl.formatMessage({ id: 'parcel.sortProductions' })}
                      placement="top">
                      <Box position="relative" display="inline-block">
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={FaSortAmountDown} />}
                          aria-label={intl.formatMessage({ id: 'parcel.sortProductions' })}
                          color={sortBy !== 'default' ? 'green.700' : 'gray.500'}
                          _hover={{
                            color: sortBy !== 'default' ? 'green.600' : 'gray.700',
                            bg: 'gray.100'
                          }}
                        />
                        {sortBy !== 'default' && (
                          <Box
                            position="absolute"
                            top="1"
                            right="1"
                            w="6px"
                            h="6px"
                            bg="green.500"
                            borderRadius="full"
                            pointerEvents="none"
                          />
                        )}
                      </Box>
                    </Tooltip>
                    <MenuList minW="180px" zIndex={10}>
                      <Text
                        px={3}
                        py={1}
                        fontSize="xs"
                        fontWeight="600"
                        color="gray.500"
                        textTransform="uppercase">
                        {intl.formatMessage({ id: 'parcel.sortBy' })}
                      </Text>
                      <MenuDivider />
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('default')}
                        fontWeight={sortBy === 'default' ? '600' : '400'}
                        color={sortBy === 'default' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.sortDefault' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('newest')}
                        fontWeight={sortBy === 'newest' ? '600' : '400'}
                        color={sortBy === 'newest' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.sortNewest' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('oldest')}
                        fontWeight={sortBy === 'oldest' ? '600' : '400'}
                        color={sortBy === 'oldest' ? 'green.700' : 'gray.600'}>
                        {intl.formatMessage({ id: 'parcel.sortOldest' })}
                      </MenuItem>
                      {/* "Highest score" / "Lowest score" removed 2026-08-11 with the score
                          itself. Sorting by a value the list no longer displays is the exact
                          fault these comparators were fixed for on 2026-08-04 — the order looks
                          arbitrary because the ranking key is invisible. */}
                    </MenuList>
                  </Menu>
                </HStack>
              )}
            </Flex>

            {/* New Production button - separate row on mobile */}
            {canWrite && data && data.length > 0 && !currentHistory?.product && (
              <Button
                size="sm"
                bg="green.700"
                color="white"
                leftIcon={<Icon as={FaPlus} boxSize={3} />}
                borderRadius="lg"
                fontSize="xs"
                fontWeight="semibold"
                px={4}
                py={2}
                h="32px"
                w={{ base: '100%', sm: 'auto' }}
                alignSelf={{ base: 'stretch', sm: 'flex-end' }}
                minW={{ base: '120px', sm: 'auto' }}
                _hover={{
                  bg: 'green.600',
                  transform: 'translateY(-1px)'
                }}
                _active={{
                  bg: 'green.700',
                  transform: 'translateY(0)'
                }}
                transition="all 0.2s"
                isDisabled={
                  data &&
                  data.some(
                    (production) =>
                      !production.finish_date || new Date(production.finish_date) > new Date()
                  )
                }
                onClick={() =>
                  navigate(`/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/add`)
                }>
                {isMobile
                  ? intl.formatMessage({ id: 'app.new' })
                  : intl.formatMessage({ id: 'parcelPage.newSeason' })}
              </Button>
            )}
          </Flex>

          {/* Streamlined Statistics — counts only.
              The fourth stat here was "avg score" (the transparency score). It was removed
              2026-08-11: this card was the last producer surface still rendering that number,
              and it survived the 2026-08-04 demotion only because that pass swept the farm home
              and missed the parcel view. The score is a backend KPI (nudge gates, analytics); it
              is not a headline a grower is shown. Do not reintroduce a score, grade, tier or
              letter here — see `.claude/rules/transparency-first.md`. If this row grows a fourth
              stat again, it should be a RECORDS/READINESS count, not a verdict. */}
          {/* Counts in one muted line (2026-11-06), the farm home's header pattern: three
              stat tiles under a rule said the same three numbers with three times the space. */}
          {productionStats && (
            <Text fontSize="sm" color={mutedTextColor} data-testid="parcel-seasons-summary">
              {intl.formatMessage(
                { id: 'parcelPage.seasonsSummary' },
                {
                  finished: productionStats.completed,
                  underway: productionStats.ongoing,
                  activities: productionStats.totalDocumentedEvents
                }
              )}
            </Text>
          )}
        </Flex>
      </CardHeader>

      {/* `isUninitialized`: the skip waits on `currentCompany?.id`, which hydrates from Redux
          after first paint. Skipped reports `isLoading: false` with no data, so without this
          the card fell through to its StandardEmptyState and stated that this parcel has no
          production history. */}
      {isLoading || isFetching || isUninitialized ? (
        <StandardSpinner />
      ) : isError ? (
        <StandardQueryError onRetry={refetch} />
      ) : (
        <CardBody p="0px" pb={4}>
          {data && data.length > 0 ? (
            filteredAndSortedProductions.length > 0 ? (
              // No inner scroll (2026-11-06): a parcel holds a handful of seasons, and a
              // 450px scroll box inside the page is a second scrollbar for a short list. Rows
              // split by a hairline, the farm home's pattern.
              <Box px={{ base: 0, md: 1 }}>
                <VStack
                  spacing={0}
                  align="stretch"
                  w="100%"
                  pt={1}
                  sx={{ '& > * + *': { borderTopWidth: '1px', borderTopColor: borderColor } }}>
                  {(() => {
                    return filteredAndSortedProductions.map((production, index) => {
                      return (
                        <React.Fragment key={production.id}>
                          {/* Add separator before first completed production if there are ongoing ones */}
                          {(() => {
                            // `extraData` (production.extra_data) was read here until 2026-08-11
                            // for the carbon-methodology and blockchain badges. Both rows are gone;
                            // nothing on this card reads extra_data now.
                            const now = new Date();
                            const today = new Date(
                              now.getFullYear(),
                              now.getMonth(),
                              now.getDate()
                            );
                            const startDate = new Date(production.start_date);
                            const finishDate = production.finish_date
                              ? new Date(production.finish_date)
                              : null;

                            // Simple and accurate status determination
                            let isCompleted = false;
                            let isOngoing = false;

                            if (finishDate) {
                              // If production has a finish_date, it's completed
                              isCompleted = true;
                              isOngoing = false;
                            } else {
                              // No finish date means still ongoing
                              isOngoing = startDate <= now;
                              isCompleted = false;
                            }

                            // The per-season "TRANSPARENCY SCORE / Agricultural Practices" row was
                            // removed 2026-08-11 along with the aggregate above. Successive passes
                            // had already stripped its A-F letters (2026-08-02), its tier badges and
                            // carbon fallback (2026-08-04) and its "/100" — each time leaving the
                            // grade itself in place under quieter typography. The number is a
                            // backend KPI, not a verdict to show the grower whose season it grades.
                            //
                            // `production.transparency_score` is still in this payload. It is
                            // deliberately not read here. Reintroducing it would also revive the
                            // source conflict: this column is stale-until-`update_trust_metrics()`,
                            // while the farm dashboard recomputes the same number live
                            // (`carbon/productions-flat/` stopped shipping it on 2026-09-05 — it
                            // cost the full calculator per production on every page load).

                            // CRITICAL: No hardcoded fallbacks - show only real backend data

                            // `blockchainVerified` and `usesUSDAFactors` were removed 2026-08-11
                            // with the badge row they fed; see the note at that row's old site.

                            // `getTransparencyImpactLevel()` and `carbonImpact` were removed
                            // 2026-08-04 along with the carbon fallback that fed them. Both graded
                            // a season Excellent / Good / Fair / Improving — and, worse, did so
                            // from `transparencyScore || carbonScore`, so a CARBON number could be
                            // labelled a transparency verdict.

                            // In the reader's locale, full year (2026-11-06). This was fixed
                            // to 'en-US' with a 2-digit year, so the Spanish page read
                            // "desde el Jun 20, 26" and "Mar 5, 26 - Jun 8, 26".
                            const dayMonth = { day: 'numeric', month: 'short' };
                            const full = { ...dayMonth, year: 'numeric' };
                            const formatDateRange = (startDate, endDate) => {
                              if (!endDate) {
                                return intl.formatMessage(
                                  { id: 'parcelPage.since' },
                                  { date: formatDateFromTimestamp(startDate, intl.locale, full) }
                                );
                              }
                              const sameYear =
                                String(startDate).slice(0, 4) === String(endDate).slice(0, 4);
                              const start = formatDateFromTimestamp(
                                startDate,
                                intl.locale,
                                sameYear ? dayMonth : full
                              );
                              const end = formatDateFromTimestamp(endDate, intl.locale, full);
                              return `${start} – ${end}`;
                            };

                            // Crop only when the season's name does not already say it
                            // ("Carrots 2026 — Bottom Ground A" printed "Product: Carrots" below).
                            const crop =
                              production.product &&
                              !String(production.name || '')
                                .toLowerCase()
                                .includes(String(production.product).toLowerCase())
                                ? production.product
                                : null;

                            return (
                              <Box
                                key={production.id}
                                // A row, not a boxed card (2026-11-06): no border, shadow or lift. The
                                // list draws the hairline between rows; a `border` here would cancel it.
                                // Every production opens, ongoing included.
                                //
                                // This was `isCompleted ? 'pointer' : 'default'` with a
                                // navigate() gated the same way — while the ongoing card kept
                                // its full hover treatment (lift, shadow, colour change), so it
                                // advertised a click that did nothing. The current season is
                                // the one a farmer needs most: it is where the season plan,
                                // the timeline and the audit export live, and the backend was
                                // deliberately opened for it (HistoryViewSet.get_queryset lets
                                // a producer read their OWN unpublished production "so the
                                // ProfileProduction page loads before publishing"). The page
                                // itself already renders the in-season states — the
                                // add-first-activity CTA, the canWrite gates. Only this click
                                // gate disagreed.
                                cursor="pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    navigate(
                                      `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${production.public_id}`
                                    );
                                  }
                                }}
                                transition="all 0.2s ease"
                                position="relative"
                                _hover={{ bg: rowHoverBg }}
                                onClick={() =>
                                  navigate(
                                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${production.public_id}`
                                  )
                                }>
                                <Box py={4} px={{ base: 1, md: 3 }}>
                                  <VStack align="stretch" spacing={3}>
                                    {/* Header Row - Production Info and Status */}
                                    <Flex
                                      justify="space-between"
                                      align="flex-start"
                                      gap={2}
                                      wrap={{ base: 'wrap', smd: 'nowrap' }}>
                                      <HStack spacing={3} flex={1} minW={0}>
                                        <VStack align="start" spacing={1} flex={1} minW={0}>
                                          <Text
                                            fontSize="sm"
                                            fontWeight="600"
                                            color={textColor}
                                            noOfLines={2}>
                                            {production.name ||
                                              `${production.product || 'Organic'} Production ${
                                                production.id
                                              }`}
                                          </Text>
                                          <Flex wrap="wrap" gap={2} align="center">
                                            <Badge
                                              /*
                                               * ONGOING is GREEN and COMPLETE is NEUTRAL
                                               * (2026-08-28). It ran the other way — ongoing on
                                               * `variant="warning"`, completed on a green tint —
                                               * because frontend.md reads "in progress →
                                               * variant='warning'". That rule is right for a TASK
                                               * that owes work, like an unfinished OSP module.
                                               * A growing season is not a task: a walnut block is
                                               * ongoing in March because that is what seasons do,
                                               * and there is nothing to attend to.
                                               *
                                               * Two things were wrong with amber here. It
                                               * COLLIDES: the certifier card on the same
                                               * dashboard uses this exact `warning` pill for
                                               * "Needs attention", a real call to action, so an
                                               * amber that also means "proceeding normally"
                                               * spends the one colour that is supposed to make a
                                               * grower look. And it INVERTS the product: Trazo's
                                               * whole formula is more events → more transparency,
                                               * the open season is where a grower actually logs,
                                               * yet the live season was painted caution and the
                                               * closed one success — finishing looked like the
                                               * good state and working looked like a problem.
                                               *
                                               * So: green = live, act here. Neutral = closed,
                                               * nothing owed. Never colour alone — each pill
                                               * carries its word, and the chip glyph differs
                                               * (clock vs chart).
                                               */
                                              // Same meanings, quieter (2026-11-06): a green TINT for the
                                              // live season, not solid green, and sentence case.
                                              {...(isCompleted
                                                ? { variant: 'neutral' }
                                                : { variant: 'subtle', colorScheme: 'green' })}
                                              fontSize="11px"
                                              flexShrink={0}>
                                              {isCompleted
                                                ? intl.formatMessage({
                                                    id: 'parcelPage.status.finished'
                                                  })
                                                : intl.formatMessage({
                                                    id: 'parcelPage.status.underway'
                                                  })}
                                            </Badge>
                                            <Text
                                              fontSize="xs"
                                              color="gray.600"
                                              fontWeight="medium">
                                              {[
                                                formatDateRange(
                                                  production.start_date,
                                                  production.finish_date
                                                ),
                                                intl.formatMessage(
                                                  { id: 'farmHome.seasons.activities' },
                                                  { count: production.events_count ?? 0 }
                                                ),
                                                crop
                                              ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                            </Text>
                                          </Flex>
                                        </VStack>
                                      </HStack>

                                      {/* Member Avatar */}
                                      <Box flexShrink={0}>
                                        {(() => {
                                          // Get unique team members for avatar display
                                          const uniqueMembers = new Map();

                                          if (production.events && production.events.length > 0) {
                                            production.events.forEach((event) => {
                                              if (
                                                event.user &&
                                                (event.user.first_name ||
                                                  event.user.last_name ||
                                                  event.user.username)
                                              ) {
                                                const userId =
                                                  event.user.id || event.user.username || 'unknown';
                                                if (!uniqueMembers.has(userId)) {
                                                  uniqueMembers.set(userId, {
                                                    id: userId,
                                                    name:
                                                      `${event.user.first_name || ''} ${
                                                        event.user.last_name || ''
                                                      }`.trim() ||
                                                      event.user.username ||
                                                      'User',
                                                    image: event.user.image
                                                      ? `${config.API_ROOT_URL}${event.user.image}`
                                                      : ''
                                                  });
                                                }
                                              }
                                            });
                                          }

                                          if (
                                            uniqueMembers.size === 0 &&
                                            production.members &&
                                            production.members.length > 0
                                          ) {
                                            production.members.forEach((member) => {
                                              if (
                                                member &&
                                                (member.first_name ||
                                                  member.last_name ||
                                                  member.username)
                                              ) {
                                                uniqueMembers.set(
                                                  member.id || member.username || 'unknown',
                                                  {
                                                    id: member.id || member.username || 'unknown',
                                                    name:
                                                      `${member.first_name || ''} ${
                                                        member.last_name || ''
                                                      }`.trim() ||
                                                      member.username ||
                                                      'User',
                                                    image: member.image
                                                      ? `${config.API_ROOT_URL}${member.image}`
                                                      : ''
                                                  }
                                                );
                                              }
                                            });
                                          }

                                          const membersArray = Array.from(uniqueMembers.values());

                                          if (membersArray.length === 0) {
                                            // No team is no avatar: the initials of "No Team"
                                            // read as a chip "NT" (recordkeeping review F-21).
                                            return (
                                              <Text fontSize="xs" color="gray.500">
                                                {intl.formatMessage({ id: 'parcel.noTeam' })}
                                              </Text>
                                            );
                                          }

                                          // Initials on gray, not green: green on this page means
                                          // a live season, and a person is not a status (2026-11-06).
                                          if (membersArray.length === 1) {
                                            return (
                                              <Avatar
                                                size="sm"
                                                name={membersArray[0].name}
                                                src={membersArray[0].image}
                                                bg="gray.200"
                                                color="gray.700"
                                              />
                                            );
                                          }

                                          return (
                                            <AvatarGroup size="sm" max={2}>
                                              {membersArray.slice(0, 3).map((member) => (
                                                <Avatar
                                                  key={member.id}
                                                  name={member.name}
                                                  src={member.image}
                                                  bg="gray.200"
                                                  color="gray.700"
                                                />
                                              ))}
                                            </AvatarGroup>
                                          );
                                        })()}
                                      </Box>
                                    </Flex>

                                    {/* The "Product: X / Records: N" row folded into the line under
                                        the name (2026-11-06): the crop only when the name does not
                                        already say it, and the count as "N activities", the word
                                        the summary above uses. */}
                                    {/* Traceability — FINISHED seasons only.
                                        At inspection a certifier picks a lot and traces it forward
                                        to a sale (§ 205.103(b)(2)). Measured across 166 seasons,
                                        lot_id was set on 27% and a sale on 2%, and nothing on this
                                        screen told the grower that trace would dead-end.

                                        Finished-only on purpose: an open season has not been
                                        harvested or sold yet, so "not recorded" there is a
                                        statement about the calendar, not about the record.

                                        Wording is a readiness check, never a finding or a verdict
                                        — Trazo reports what its own records show; the certifying
                                        agent decides compliance. `has_sale_record` counts a sale in
                                        EITHER store (see its serializer docstring) so this can
                                        never accuse a grower of missing a record they did enter. */}
                                    {isCompleted && (
                                      <HStack spacing={4} wrap="wrap" pt={1}>
                                        {[
                                          {
                                            key: 'lot',
                                            present: Boolean(production.lot_id),
                                            label: production.lot_id
                                              ? intl.formatMessage(
                                                  { id: 'parcel.lotIdRecorded' },
                                                  { lot: production.lot_id }
                                                )
                                              : intl.formatMessage({ id: 'parcel.lotIdMissing' })
                                          },
                                          {
                                            key: 'sale',
                                            present: Boolean(production.has_sale_record),
                                            label: production.has_sale_record
                                              ? intl.formatMessage({ id: 'parcel.saleRecorded' })
                                              : intl.formatMessage({ id: 'parcel.saleMissing' })
                                          }
                                        ].map(({ key, present, label }) => (
                                          <HStack key={key} spacing={1.5} flexShrink={0}>
                                            <Icon
                                              as={present ? FaCheckCircle : FaRegCircle}
                                              boxSize={3}
                                              color={present ? 'green.700' : 'gray.400'}
                                            />
                                            <Text
                                              fontSize="xs"
                                              color={present ? 'gray.700' : 'gray.500'}
                                              fontWeight={present ? '500' : '400'}
                                              noOfLines={1}>
                                              {label}
                                            </Text>
                                          </HStack>
                                        ))}
                                      </HStack>
                                    )}

                                    {/* The "Trust Indicator Badges" row stood here until
                                        2026-08-11: an "EPA/USDA-Sourced" chip and a "Blockchain"
                                        chip, both with an award-ribbon icon.

                                        EPA/USDA-Sourced is a statement about which EMISSION
                                        FACTORS the carbon maths used. The wording is compliance-
                                        safe and the chip was data-driven, so this is not a claim
                                        defect — it is a placement one. On a season card, under a
                                        ribbon icon, next to a grower who is thinking about their
                                        certifier, a sentence about carbon methodology reads as a
                                        credential. Carbon keeps its own row on this card and its
                                        own expandable sections; it does not need a medal here.

                                        The Blockchain chip went with it: `BLOCKCHAIN_ENABLED`
                                        defaults False and the add-on was withdrawn, so it was
                                        rendering a product that no longer exists. */}

                                    {/* The per-season score row stood here until 2026-08-11 and the
                                      carbon-score fallback under it until 2026-08-04. See the
                                      comment beside `isCompleted` above for why neither returns. */}
                                  </VStack>
                                </Box>
                              </Box>
                            );
                          })()}
                        </React.Fragment>
                      );
                    });
                  })()}
                </VStack>
              </Box>
            ) : (
              <VStack spacing={4} py={12} align="center" px={6}>
                <Icon as={FaFilter} color="gray.300" boxSize={8} />
                <Text fontSize="sm" color="gray.500" textAlign="center">
                  {intl.formatMessage({ id: 'parcel.noMatchingProductions' })}
                </Text>
                <Button
                  size="sm"
                  variant="ghost"
                  colorScheme="green"
                  onClick={() => {
                    setStatusFilter('all');
                    setSortBy('default');
                  }}>
                  {intl.formatMessage({ id: 'parcel.clearFilters' })}
                </Button>
              </VStack>
            )
          ) : (
            /* Was a hand-rolled copy of TrackList's empty state that had drifted from it:
               same seedling at `green.400` (2.01:1, under the 3.0 a non-text mark owes) but
               `spacing` 6 vs 8 and `py` 16 vs 16 against a different title size. No CTA here
               on purpose — this card lists FINISHED productions, and the one action worth
               offering ("start one") already sits in the card beside it. */
            <StandardEmptyState
              icon={FaSeedling}
              title={intl.formatMessage({ id: 'parcel.noProductionsStarted' })}
              description={intl.formatMessage({ id: 'parcel.noProductionsDescription' })}
            />
          )}
        </CardBody>
      )}
    </Card>
  );
};

export default HistoryCard;
