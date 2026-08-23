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
  Divider,
  useBreakpointValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaChartLine,
  FaPlus,
  FaFilter,
  FaSortAmountDown,
  FaCalendarAlt,
  FaCheckCircle,
  FaRegCircle,
  FaEye,
  FaEdit,
  FaArchive,
  FaEllipsisV,
  FaClock
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useMemo, useState } from 'react';

import { useGetParcelHistoriesQuery } from 'store/api/historyApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { StandardEmptyState } from 'components/Design/StandardComponents';
import CardHeader from 'components/Card/CardHeader';
import { useUserRole } from 'hooks/useUserRole';
import { formatDateFromTimestamp } from 'utils/dateOnly';

const HistoryCard = ({ amount }) => {
  const intl = useIntl();
  const { canWrite } = useUserRole();
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
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
  const completedHoverBg = useColorModeValue('green.50', 'green.900');
  const ongoingHoverBg = useColorModeValue('amber.50', 'amber.900');
  const navigate = useNavigate();

  // Mobile responsiveness
  const isMobile = useBreakpointValue({ base: true, md: false });

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');

  const currentCompany = useSelector((state) => state.company.currentCompany);
  const currentHistory = useSelector((state) => state.history?.currentHistory);

  const { parcelId, farmId } = useParams();

  const { data, isLoading, isFetching } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, farmId, parcelId },
    {
      skip: !parcelId || !farmId || !currentCompany || currentCompany?.id === undefined,
      refetchOnMountOrArgChange: true
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
                  {intl.formatMessage({ id: 'app.productions' })}
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
                  : intl.formatMessage({ id: 'parcel.newProduction' })}
              </Button>
            )}
          </Flex>

          <Divider borderColor={borderColor} />

          {/* Streamlined Statistics — counts only.
              The fourth stat here was "avg score" (the transparency score). It was removed
              2026-08-11: this card was the last producer surface still rendering that number,
              and it survived the 2026-08-04 demotion only because that pass swept the farm home
              and missed the parcel view. The score is a backend KPI (nudge gates, analytics); it
              is not a headline a grower is shown. Do not reintroduce a score, grade, tier or
              letter here — see `.claude/rules/transparency-first.md`. If this row grows a fourth
              stat again, it should be a RECORDS/READINESS count, not a verdict. */}
          {productionStats && (
            <Flex
              direction="row"
              spacing={0}
              justify="space-between"
              pt={4}
              gap={{ base: 1, smd: 4 }}>
              {/* All three numbers are NEUTRAL, and that is the rule, not a preference.
                  `.claude/rules/frontend.md`: "Status colour = meaning, never decoration… a
                  plain fact or count → neutral." None of these three is a status — they are
                  counts, and the label under each already says which. Colouring them by metric
                  identity broke down immediately: "ongoing" rendered `orange.800`, so a farm
                  with nothing in progress showed a dark red-brown 0 that reads as an error
                  when it is neutral (often good), while "completed" stayed green even at 0,
                  where green would be exactly wrong. `orange.*` is also not a Trazo token at
                  all — the theme defines `amber`; `orange.800` silently resolved to CHAKRA's
                  #7B341E, a different accent. */}
              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.700">
                  {productionStats.completed}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="medium"
                  textAlign="center"
                  whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'parcel.completed' })}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.700">
                  {productionStats.ongoing}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="medium"
                  textAlign="center"
                  whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'parcel.ongoing' })}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="gray.700">
                  {productionStats.totalDocumentedEvents}
                </Text>
                <Text
                  fontSize="xs"
                  color="gray.500"
                  fontWeight="medium"
                  textAlign="center"
                  whiteSpace="nowrap">
                  {isMobile
                    ? intl.formatMessage({ id: 'parcel.eventsLabel' })
                    : intl.formatMessage({ id: 'parcel.eventsDocumented' })}
                </Text>
              </VStack>
            </Flex>
          )}
        </Flex>
      </CardHeader>

      {isLoading || isFetching ? (
        <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
          <CircularProgress isIndeterminate color="green.500" size="40px" />
        </Flex>
      ) : (
        <CardBody p="0px" pb={4}>
          {data && data.length > 0 ? (
            filteredAndSortedProductions.length > 0 ? (
              <Box
                maxH={{ base: '400px', md: '450px' }}
                overflowY="auto"
                /*
                  MEASURED 2026-08-23 at 430px: the cards inside this scroll region sat 35px
                  from the card's left edge and 51px from its right — 16px off centre, which
                  reads as a layout mistake rather than a margin.

                  `pr` alone was reserving room for the scrollbar, so the pad landed on ONE
                  side and the scrollbar's own 8px landed on the same side. `scrollbarGutter:
                  'stable both-edges'` is the property built for this: it reserves the gutter
                  symmetrically, so the content stays centred whether or not a scrollbar is
                  showing — which also matters because a phone paints an OVERLAY scrollbar
                  (0px) while this desktop browser paints a classic one (8px), so a hand-tuned
                  one-sided offset can only ever be right on one of them.
                */
                px={{ base: '8px', md: '12px' }}
                sx={{
                  // Reserved symmetrically so the list stays centred; see the note above.
                  scrollbarGutter: 'stable both-edges',
                  '&::-webkit-scrollbar': {
                    width: '8px'
                  },
                  '&::-webkit-scrollbar-track': {
                    bg: 'gray.100',
                    borderRadius: 'full'
                  },
                  // Neutral, not brand: a scrollbar says "there is more content", which is
                  // not a brand statement, and green.500 on this track is 2.64:1 anyway.
                  '&::-webkit-scrollbar-thumb': {
                    bg: 'gray.500',
                    borderRadius: 'full',
                    _hover: {
                      bg: 'gray.600'
                    }
                  }
                }}>
                <VStack spacing={4} align="stretch" w="100%" py={3} pb={6}>
                  {(() => {
                    // Group productions by status for separator logic
                    const ongoingProductions = filteredAndSortedProductions.filter(
                      (p) => !p.finish_date
                    );
                    const completedProductions = filteredAndSortedProductions.filter(
                      (p) => p.finish_date
                    );

                    return filteredAndSortedProductions.map((production, index) => {
                      // Check if this is the first completed production (for separator)
                      const isFirstCompleted =
                        completedProductions.length > 0 &&
                        production.id === completedProductions[0].id;
                      const shouldShowSeparator = isFirstCompleted && ongoingProductions.length > 0;

                      return (
                        <React.Fragment key={production.id}>
                          {/* Add separator before first completed production if there are ongoing ones */}
                          {shouldShowSeparator && (
                            <Box py={4}>
                              <Divider borderColor={borderColor} borderWidth="1px" />
                            </Box>
                          )}
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
                            // while the farm dashboard and `carbon/productions-flat/` each
                            // recompute the same number live.

                            // CRITICAL: No hardcoded fallbacks - show only real backend data

                            // `blockchainVerified` and `usesUSDAFactors` were removed 2026-08-11
                            // with the badge row they fed; see the note at that row's old site.

                            // `getTransparencyImpactLevel()` and `carbonImpact` were removed
                            // 2026-08-04 along with the carbon fallback that fed them. Both graded
                            // a season Excellent / Good / Fair / Improving — and, worse, did so
                            // from `transparencyScore || carbonScore`, so a CARBON number could be
                            // labelled a transparency verdict.

                            const formatDateRange = (startDate, endDate) => {
                              const start = formatDateFromTimestamp(startDate, 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              });

                              if (endDate) {
                                const end = formatDateFromTimestamp(endDate, 'en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: '2-digit'
                                });
                                return `${start} - ${end}`;
                              }

                              return `${start} - ${intl.formatMessage({
                                id: 'parcel.statusOngoing'
                              })}`;
                            };

                            return (
                              <Card
                                key={production.id}
                                bg={cardBgColor}
                                borderRadius="xl"
                                boxShadow="sm"
                                border="1px solid"
                                borderColor={borderColor}
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
                                _hover={
                                  isCompleted
                                    ? {
                                        bg: completedHoverBg,
                                        transform: 'translateY(-2px)',
                                        boxShadow: 'lg',
                                        // green.500 is 2.78:1 — a hover border is a boundary
                                        // and owes 3.0. green.600 (4.12) is the palette's
                                        // documented BOUNDARY green.
                                        borderColor: 'green.600'
                                      }
                                    : {
                                        bg: ongoingHoverBg,
                                        borderColor: 'amber.800',
                                        transform: 'translateY(-1px)',
                                        boxShadow: 'md'
                                      }
                                }
                                // Ongoing cards used to have no press state, because they were
                                // not clickable. They are now, so they press.
                                _active={{ transform: 'translateY(0px)', boxShadow: 'sm' }}
                                onClick={() =>
                                  navigate(
                                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${production.public_id}`
                                  )
                                }
                                className="trazo-card">
                                <CardBody py={4} px={{ base: 0, md: 4 }}>
                                  <VStack align="stretch" spacing={3}>
                                    {/* Header Row - Production Info and Status */}
                                    <Flex
                                      justify="space-between"
                                      align="flex-start"
                                      gap={2}
                                      wrap={{ base: 'wrap', smd: 'nowrap' }}>
                                      <HStack spacing={3} flex={1} minW={0}>
                                        <Box
                                          p={2}
                                          bg={isCompleted ? 'green.50' : 'amber.50'}
                                          borderRadius="lg"
                                          border="1px solid"
                                          borderColor={isCompleted ? 'green.200' : 'amber.200'}
                                          flexShrink={0}>
                                          {/* One hue per state. This used to be a `blue.50`
                                              tint with a `blue.200` border around an
                                              `orange.800` glyph — three hues for one status,
                                              two of them from palettes the theme does not
                                              define (`orange.*` is Chakra's; the theme has
                                              `amber`). MEASURED: amber.900 is 3.79:1 on white,
                                              clearing the 3.0 a non-text mark owes. */}
                                          <Icon
                                            as={isCompleted ? FaChartLine : FaClock}
                                            color={isCompleted ? 'green.700' : 'amber.900'}
                                            boxSize={4}
                                          />
                                        </Box>
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
                                              // in-progress = the `warning` variant, matching the
                                              // OSP module list. NOT colorScheme="amber": the
                                              // theme's amber scale tops out at #E65100, so an
                                              // amber pill is 2.63:1 — `warning` is 7.62:1.
                                              {...(isCompleted
                                                ? { colorScheme: 'green', variant: 'subtle' }
                                                : { variant: 'warning' })}
                                              borderRadius="full"
                                              fontSize="xs"
                                              fontWeight="600"
                                              px={2}
                                              py={1}
                                              textTransform="uppercase"
                                              letterSpacing="wide"
                                              flexShrink={0}>
                                              {isCompleted
                                                ? intl.formatMessage({
                                                    id: 'parcel.statusComplete'
                                                  })
                                                : intl.formatMessage({
                                                    id: 'parcel.statusOngoing'
                                                  })}
                                            </Badge>
                                            <Text
                                              fontSize="xs"
                                              color="gray.500"
                                              fontWeight="medium"
                                              whiteSpace="nowrap">
                                              {formatDateRange(
                                                production.start_date,
                                                production.finish_date
                                              )}
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
                                            return (
                                              <Avatar
                                                size="sm"
                                                name={intl.formatMessage({ id: 'parcel.noTeam' })}
                                                bg="gray.300"
                                                color="gray.600"
                                              />
                                            );
                                          }

                                          if (membersArray.length === 1) {
                                            return (
                                              <Avatar
                                                size="sm"
                                                name={membersArray[0].name}
                                                src={membersArray[0].image}
                                                bg="green.700"
                                                color="white"
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
                                                  bg="green.700"
                                                  color="white"
                                                />
                                              ))}
                                            </AvatarGroup>
                                          );
                                        })()}
                                      </Box>
                                    </Flex>

                                    {/* Product & Team Info Row */}
                                    <Flex
                                      wrap="wrap"
                                      justify="space-between"
                                      align="center"
                                      gap={2}>
                                      <HStack spacing={1} minW={0} flex={1}>
                                        <Text
                                          fontSize="xs"
                                          color="gray.500"
                                          fontWeight="medium"
                                          whiteSpace="nowrap">
                                          {intl.formatMessage({ id: 'parcel.productLabel' })}
                                        </Text>
                                        <Text
                                          fontSize="xs"
                                          color="gray.700"
                                          fontWeight="600"
                                          noOfLines={1}
                                          minW={0}>
                                          {production.product || 'Agricultural Product'}
                                        </Text>
                                      </HStack>
                                      <HStack spacing={1} flexShrink={0}>
                                        {/* Records in THIS season.
                                            Replaced "Team: N member" 2026-08-11. Team size is
                                            near-constant for the ICP (mid-size wholesale orchards
                                            run one or two operators), so it read the same on every
                                            card — while the card said nothing about the one thing
                                            it is a list OF. The aggregate "28 events documented"
                                            above spans every season on the parcel; this is the
                                            per-season number a grower needs when a certifier asks
                                            about one year. `events_count` was already on the wire,
                                            annotated in `get_optimized_list_queryset`. */}
                                        <Text
                                          fontSize="xs"
                                          color="gray.500"
                                          fontWeight="medium"
                                          whiteSpace="nowrap">
                                          {intl.formatMessage({ id: 'parcel.recordsLabel' })}
                                        </Text>
                                        <Text fontSize="xs" color="gray.700" fontWeight="600">
                                          {production.events_count ?? 0}
                                        </Text>
                                      </HStack>
                                    </Flex>

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
                                </CardBody>
                              </Card>
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
