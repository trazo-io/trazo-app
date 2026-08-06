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
  FaAward,
  FaEye,
  FaEdit,
  FaArchive,
  FaEllipsisV,
  FaClock,
  FaCheckCircle
} from 'react-icons/fa';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useMemo, useState } from 'react';

import { useGetParcelHistoriesQuery } from 'store/api/historyApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { useUserRole } from 'hooks/useUserRole';

// Sentinels that park unscored (unfinished) productions at the END of either sort direction.
// Scores are 0-100, so these can never collide with a real value.
const UNSCORED_LAST_DESC = -1;
const UNSCORED_LAST_ASC = 101;

/**
 * The one value this card sorts and averages by: the backend transparency score of a FINISHED
 * season. Unfinished seasons have no meaningful score (the metric is measured against a whole
 * season's expected events) and display none, so they sort to the end via `fallback`.
 */
function sortableScore(production, fallback) {
  if (!production?.finish_date) return fallback;
  const score = production.transparency_score;
  return score === undefined || score === null ? fallback : score;
}

const HistoryCard = ({ amount }) => {
  const intl = useIntl();
  const { canWrite } = useUserRole();
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
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

    // Average transparency score across FINISHED, PUBLISHED seasons, from the backend column only.
    //
    // Matches `EstablishmentDashboardMetricsSerializer.get_metrics_for_establishment` exactly:
    // `published=True, finish_date__isnull=False`. Both predicates matter — the payload contains
    // finished-but-unpublished seasons, which the backend average excludes, so filtering on
    // `finish_date` alone would have reproduced the very cross-surface disagreement this change
    // set out to remove (an earlier draft of this comment claimed parity the filter did not have).
    //
    // This card previously averaged every production carrying any score-ish value — including open
    // seasons and including `extra_data.carbon_score`, a different measurement entirely.
    //
    // NB the per-row score below gates on `isCompleted` only, not `published`: an unpublished
    // finished season is still the farmer's own record and is fine to show them. It is the
    // AGGREGATE that must agree with the farm dashboard.
    const productionsWithScores = data.filter(
      (p) =>
        p.published === true &&
        !!p.finish_date &&
        p.transparency_score !== undefined &&
        p.transparency_score !== null
    );

    const avgScore =
      productionsWithScores.length > 0
        ? productionsWithScores.reduce((sum, p) => sum + p.transparency_score, 0) /
          productionsWithScores.length
        : null;

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
      avgScore: avgScore !== null ? Math.round(avgScore) : null,
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
      // Sort by the SAME value the card displays: the backend column, finished seasons only.
      // These comparators kept the `extra_data.transparency_score ?? extra_data.carbon_score`
      // fallback chain after it was removed from the display (2026-08-04), so "sort by score"
      // ordered the list by numbers that were no longer on screen — including carbon values for
      // productions whose visible score was blank.
    } else if (sortBy === 'scoreHigh') {
      filtered.sort((a, b) => sortableScore(b, UNSCORED_LAST_DESC) - sortableScore(a, UNSCORED_LAST_DESC));
    } else if (sortBy === 'scoreLow') {
      // Finite sentinel, not Infinity: two unscored productions would compare as
      // `Infinity - Infinity` → NaN. The spec coerces a NaN comparator result to +0 so it does not
      // throw, but a comparator that can produce NaN is a trap for the next reader.
      filtered.sort((a, b) => sortableScore(a, UNSCORED_LAST_ASC) - sortableScore(b, UNSCORED_LAST_ASC));
    }

    return filtered;
  }, [data, statusFilter, sortBy]);

  return (
    <Card
      bg={cardBgColor}
      borderRadius="xl"
      boxShadow="lg"
      overflow="hidden"
      h={{ base: '650px', md: '700px' }}
      maxH={{ base: '650px', md: '700px' }}
      transition="all 0.3s ease"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
      className="trazo-card"
      data-tour="productions-history"
    >
      <CardHeader px={{ base: 4, md: 6 }} py={5}>
        <Flex direction="column" w="100%">
          {/* Header with divider */}
          <Flex
            direction="column"
            pb={4}
            gap={3}
          >
            {/* Title row - always horizontal */}
            <Flex
              direction="row"
              justify="space-between"
              align="center"
              w="100%"
            >
              <Flex wrap="wrap" gap={2} align="center" flexShrink={0}>
                <Text fontSize={{ base: 'md', md: 'lg' }} color={textColor} fontWeight="600" whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'app.productions' })}
                </Text>
                <Badge
                  bg="green.50"
                  color="green.700"
                  borderRadius="md"
                  px={2}
                  py={1}
                  fontSize="xs"
                  fontWeight="500"
                  textTransform="none"
                  w="fit-content"
                  border="1px solid"
                  borderColor="green.200"
                  flexShrink={0}
                >
                  {intl.formatMessage({ id: 'parcel.transparencyTracked' })}
                </Badge>
              </Flex>

              {data && data.length > 1 && (
                <HStack spacing={1} flexShrink={0}>
                  <Menu>
                    <Tooltip label={intl.formatMessage({ id: 'parcel.filterProductions' })} placement="top">
                      <Box position="relative" display="inline-block">
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={FaFilter} />}
                          aria-label={intl.formatMessage({ id: 'parcel.filterProductions' })}
                          color={statusFilter !== 'all' ? 'green.500' : 'gray.500'}
                          _hover={{ color: statusFilter !== 'all' ? 'green.600' : 'gray.700', bg: 'gray.100' }}
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
                      <Text px={3} py={1} fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase">
                        {intl.formatMessage({ id: 'parcel.filterStatus' })}
                      </Text>
                      <MenuDivider />
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('all')}
                        fontWeight={statusFilter === 'all' ? '600' : '400'}
                        color={statusFilter === 'all' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.filterAll' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('ongoing')}
                        fontWeight={statusFilter === 'ongoing' ? '600' : '400'}
                        color={statusFilter === 'ongoing' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.filterOngoing' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setStatusFilter('completed')}
                        fontWeight={statusFilter === 'completed' ? '600' : '400'}
                        color={statusFilter === 'completed' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.filterCompleted' })}
                      </MenuItem>
                    </MenuList>
                  </Menu>

                  {/* Sort Menu */}
                  <Menu>
                    <Tooltip label={intl.formatMessage({ id: 'parcel.sortProductions' })} placement="top">
                      <Box position="relative" display="inline-block">
                        <MenuButton
                          as={IconButton}
                          size="sm"
                          variant="ghost"
                          icon={<Icon as={FaSortAmountDown} />}
                          aria-label={intl.formatMessage({ id: 'parcel.sortProductions' })}
                          color={sortBy !== 'default' ? 'green.500' : 'gray.500'}
                          _hover={{ color: sortBy !== 'default' ? 'green.600' : 'gray.700', bg: 'gray.100' }}
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
                      <Text px={3} py={1} fontSize="xs" fontWeight="600" color="gray.500" textTransform="uppercase">
                        {intl.formatMessage({ id: 'parcel.sortBy' })}
                      </Text>
                      <MenuDivider />
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('default')}
                        fontWeight={sortBy === 'default' ? '600' : '400'}
                        color={sortBy === 'default' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.sortDefault' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('newest')}
                        fontWeight={sortBy === 'newest' ? '600' : '400'}
                        color={sortBy === 'newest' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.sortNewest' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('oldest')}
                        fontWeight={sortBy === 'oldest' ? '600' : '400'}
                        color={sortBy === 'oldest' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.sortOldest' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('scoreHigh')}
                        fontWeight={sortBy === 'scoreHigh' ? '600' : '400'}
                        color={sortBy === 'scoreHigh' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.sortScoreHigh' })}
                      </MenuItem>
                      <MenuItem
                        fontSize="sm"
                        onClick={() => setSortBy('scoreLow')}
                        fontWeight={sortBy === 'scoreLow' ? '600' : '400'}
                        color={sortBy === 'scoreLow' ? 'green.500' : 'gray.600'}
                      >
                        {intl.formatMessage({ id: 'parcel.sortScoreLow' })}
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </HStack>
              )}
            </Flex>

            {/* New Production button - separate row on mobile */}
            {canWrite && data && data.length > 0 && !currentHistory?.product && (
              <Button
                size="sm"
                bg="green.500"
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
                  navigate(
                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/add`
                  )
                }
              >
                {isMobile ? intl.formatMessage({ id: 'app.new' }) : intl.formatMessage({ id: 'parcel.newProduction' })}
              </Button>
            )}
          </Flex>

          <Divider borderColor={borderColor} />

          {/* Streamlined Statistics */}
          {productionStats && (
            <Flex
              direction="row"
              spacing={0}
              justify="space-between"
              pt={4}
              gap={{ base: 1, smd: 4 }}
            >
              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="green.500">
                  {productionStats.completed}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center" whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'parcel.completed' })}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="blue.500">
                  {productionStats.ongoing}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center" whiteSpace="nowrap">
                  {intl.formatMessage({ id: 'parcel.ongoing' })}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="green.500">
                  {productionStats.avgScore !== null ? productionStats.avgScore : '--'}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center" whiteSpace="nowrap">
                  {isMobile ? intl.formatMessage({ id: 'parcel.scoreLabel' }) : intl.formatMessage({ id: 'parcel.avgScore' })}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW={0}>
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="purple.500">
                  {productionStats.totalDocumentedEvents}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center" whiteSpace="nowrap">
                  {isMobile ? intl.formatMessage({ id: 'parcel.eventsLabel' }) : intl.formatMessage({ id: 'parcel.eventsDocumented' })}
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
              pr={{ base: '8px', md: '12px' }}
              sx={{
                '&::-webkit-scrollbar': {
                  width: '8px'
                },
                '&::-webkit-scrollbar-track': {
                  bg: 'gray.100',
                  borderRadius: 'full'
                },
                '&::-webkit-scrollbar-thumb': {
                  bg: 'green.500',
                  borderRadius: 'full',
                  _hover: {
                    bg: 'green.600'
                  }
                }
              }}
            >
              <VStack spacing={4} align="stretch" w="100%" py={3} pb={6}>
                {(() => {
                  // Group productions by status for separator logic
                  const ongoingProductions = filteredAndSortedProductions.filter((p) => !p.finish_date);
                  const completedProductions = filteredAndSortedProductions.filter((p) => p.finish_date);

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
                          // Calculate transparency metrics for each production (CLAUDE.md compliance)
                          const extraData = production.extra_data || {};
                          // Enhanced production status logic for better transparency
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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

                          // Transparency score: FINISHED seasons only, backend column only.
                          //
                          // Two bugs were fixed here on 2026-08-04, both of which made this card
                          // disagree with the transparency dashboard for the same production on
                          // the same day:
                          //
                          // 1. A score was shown for ACTIVE productions. The transparency
                          //    dashboard deliberately renders "—" while a season is open, because
                          //    the score is measured against the events expected across a WHOLE
                          //    season — mid-season it is guaranteed to read low and means nothing.
                          //    This card published "80/100" for the same open season. The farmer
                          //    sees a number here and a dash there.
                          //
                          // 2. The `extra_data.transparency_score` and `extra_data.carbon_score`
                          //    fallbacks. The stored column is known to drift from the calculator,
                          //    and a CARBON score rendered under a "TRANSPARENCY SCORE" label is
                          //    simply a different measurement wearing the wrong label.
                          //
                          // TransparencyCalculator is the single source of truth. If the backend
                          // has no score for a finished season, show nothing rather than guess.
                          let transparencyScore = null;

                          if (
                            isCompleted &&
                            production.transparency_score !== undefined &&
                            production.transparency_score !== null
                          ) {
                            transparencyScore = production.transparency_score;
                          }

                          // CRITICAL: No hardcoded fallbacks - show only real backend data

                          // Blockchain verification status (actual on-chain proof)
                          const blockchainVerified = Boolean(extraData.blockchain_verified);
                          // EPA/USDA factors used (methodology indicator, NOT third-party verification)
                          const usesUSDAFactors = Boolean(extraData.usda_factors_used || extraData.usda_factors_based);

                          // `getTransparencyImpactLevel()` and `carbonImpact` were removed
                          // 2026-08-04 along with the carbon fallback that fed them. Both graded
                          // a season Excellent / Good / Fair / Improving — and, worse, did so
                          // from `transparencyScore || carbonScore`, so a CARBON number could be
                          // labelled a transparency verdict. The card shows the finished season's
                          // percentage; the transparency page explains what is missing.

                          const formatDateRange = (startDate, endDate) => {
                            const start = new Date(startDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: '2-digit'
                            });

                            if (endDate) {
                              const end = new Date(endDate).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: '2-digit'
                              });
                              return `${start} - ${end}`;
                            }

                            return `${start} - ${intl.formatMessage({ id: 'parcel.statusOngoing' })}`;
                          };

                          return (
                            <Card
                              key={production.id}
                              bg={cardBgColor}
                              borderRadius="xl"
                              boxShadow="sm"
                              border="1px solid"
                              borderColor={borderColor}
                              cursor={isCompleted ? 'pointer' : 'default'}
                              transition="all 0.2s ease"
                              position="relative"
                              _hover={
                                isCompleted
                                  ? {
                                      bg: useColorModeValue('green.50', 'green.900/10'),
                                      transform: 'translateY(-2px)',
                                      boxShadow: 'lg',
                                      borderColor: 'green.500'
                                    }
                                  : {
                                      bg: useColorModeValue('blue.50', 'blue.900/10'),
                                      borderColor: 'blue.500',
                                      transform: 'translateY(-1px)',
                                      boxShadow: 'md'
                                    }
                              }
                              _active={
                                isCompleted
                                  ? {
                                      transform: 'translateY(0px)',
                                      boxShadow: 'sm'
                                    }
                                  : {}
                              }
                              onClick={() => {
                                // Only navigate if production is completed
                                if (isCompleted) {
                                  navigate(
                                    `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/production/${production.public_id}`
                                  );
                                }
                              }}
                              className="trazo-card"
                            >
                              <CardBody p={4}>
                                <VStack align="stretch" spacing={3}>
                                  {/* Header Row - Production Info and Status */}
                                  <Flex
                                    justify="space-between"
                                    align="flex-start"
                                    gap={2}
                                    wrap={{ base: 'wrap', smd: 'nowrap' }}
                                  >
                                    <HStack spacing={3} flex={1} minW={0}>
                                      <Box
                                        p={2}
                                        bg={isCompleted ? 'green.50' : 'blue.50'}
                                        borderRadius="lg"
                                        border="1px solid"
                                        borderColor={isCompleted ? 'green.200' : 'blue.200'}
                                        flexShrink={0}
                                      >
                                        <Icon
                                          as={isCompleted ? FaChartLine : FaClock}
                                          color={isCompleted ? 'green.500' : 'blue.500'}
                                          boxSize={4}
                                        />
                                      </Box>
                                      <VStack align="start" spacing={1} flex={1} minW={0}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="600"
                                          color={textColor}
                                          noOfLines={2}
                                        >
                                          {production.name ||
                                            `${production.product || 'Organic'} Production ${
                                              production.id
                                            }`}
                                        </Text>
                                        <Flex wrap="wrap" gap={2} align="center">
                                          <Badge
                                            colorScheme={isCompleted ? 'green' : 'blue'}
                                            variant="subtle"
                                            borderRadius="full"
                                            fontSize="xs"
                                            fontWeight="600"
                                            px={2}
                                            py={1}
                                            textTransform="uppercase"
                                            letterSpacing="wide"
                                            flexShrink={0}
                                          >
                                            {isCompleted ? intl.formatMessage({ id: 'parcel.statusComplete' }) : intl.formatMessage({ id: 'parcel.statusOngoing' })}
                                          </Badge>
                                          <Text fontSize="xs" color="gray.500" fontWeight="medium" whiteSpace="nowrap">
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
                                              bg="green.500"
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
                                                bg="green.500"
                                                color="white"
                                              />
                                            ))}
                                          </AvatarGroup>
                                        );
                                      })()}
                                    </Box>
                                  </Flex>

                                  {/* Product & Team Info Row */}
                                  <Flex wrap="wrap" justify="space-between" align="center" gap={2}>
                                    <HStack spacing={1} minW={0} flex={1}>
                                      <Text fontSize="xs" color="gray.500" fontWeight="medium" whiteSpace="nowrap">
                                        {intl.formatMessage({ id: 'parcel.productLabel' })}
                                      </Text>
                                      <Text fontSize="xs" color="gray.700" fontWeight="600" noOfLines={1} minW={0}>
                                        {production.product || 'Agricultural Product'}
                                      </Text>
                                    </HStack>
                                    <HStack spacing={1} flexShrink={0}>
                                      <Text fontSize="xs" color="gray.500" fontWeight="medium" whiteSpace="nowrap">
                                        {intl.formatMessage({ id: 'parcel.teamLabel' })}
                                      </Text>
                                      <Text fontSize="xs" color="gray.700" fontWeight="500">
                                        {(() => {
                                          // Get unique team members count
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
                                                  uniqueMembers.set(userId, event.user);
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
                                                  member
                                                );
                                              }
                                            });
                                          }

                                          const membersArray = Array.from(uniqueMembers.values());
                                          return membersArray.length > 0
                                            ? intl.formatMessage({ id: 'parcel.memberCount' }, { count: membersArray.length })
                                            : intl.formatMessage({ id: 'parcel.noTeamAssigned' });
                                        })()}
                                      </Text>
                                    </HStack>
                                  </Flex>

                                  {/* Trust Indicator Badges */}
                                  {(usesUSDAFactors || blockchainVerified) && (
                                    <HStack spacing={2} wrap="wrap">
                                      {usesUSDAFactors && (
                                        <Badge
                                          colorScheme="blue"
                                          variant="subtle"
                                          fontSize="xs"
                                          borderRadius="md"
                                          px={2}
                                          py={1}
                                          fontWeight="500"
                                        >
                                          <HStack spacing={1}>
                                            <Icon as={FaAward} boxSize={2.5} />
                                            <Text>{intl.formatMessage({ id: 'carbon.badge.epaUsdaSourced' })}</Text>
                                          </HStack>
                                        </Badge>
                                      )}
                                      {blockchainVerified && (
                                        <Badge
                                          colorScheme="purple"
                                          variant="subtle"
                                          fontSize="xs"
                                          borderRadius="md"
                                          px={2}
                                          py={1}
                                          fontWeight="500"
                                        >
                                          <HStack spacing={1}>
                                            <Icon as={FaAward} boxSize={2.5} />
                                            <Text>Blockchain</Text>
                                          </HStack>
                                        </Badge>
                                      )}
                                    </HStack>
                                  )}

                                  {/* TRANSPARENCY-FIRST Score Display (per CLAUDE.md) */}
                                  {transparencyScore !== null && (
                                    <HStack
                                      justify="space-between"
                                      align="center"
                                      pt={2}
                                      borderTop="1px solid"
                                      borderColor={useColorModeValue('gray.200', 'gray.600')}
                                    >
                                      <HStack spacing={2}>
                                        <Box
                                          p={1.5}
                                          bg="green.50"
                                          borderRadius="md"
                                          border="1px solid"
                                          borderColor="green.200"
                                        >
                                          <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
                                        </Box>
                                        <VStack align="start" spacing={0}>
                                          <Text
                                            fontSize="xs"
                                            color="gray.500"
                                            fontWeight="600"
                                            textTransform="uppercase"
                                            letterSpacing={{ base: 'normal', md: 'wide' }}
                                            whiteSpace="nowrap"
                                          >
                                            {intl.formatMessage({ id: 'parcel.transparencyScoreLabel' })}
                                          </Text>
                                          <Text fontSize="xs" color="gray.600">
                                            {intl.formatMessage({ id: 'parcel.agriculturalPractices' })}
                                          </Text>
                                        </VStack>
                                      </HStack>
                                      <VStack align="end" spacing={0}>
                                        {/* "%" not "/100", and no HIGH/MEDIUM/BASIC badge.
                                            The value is a percentage everywhere else in the
                                            product; "/100" made it look like a different,
                                            points-based measure. The uppercase badge was a
                                            third grade ladder (after the A-F letters removed
                                            2026-08-02 and the tier badges removed 2026-08-04) —
                                            same self-authored verdict, louder typography. */}
                                        <Text
                                          fontSize={{ base: 'lg', md: 'xl' }}
                                          fontWeight="700"
                                          color="green.500"
                                          lineHeight="1"
                                        >
                                          {transparencyScore}%
                                        </Text>
                                      </VStack>
                                    </HStack>
                                  )}

                                  {/* The carbon-score fallback block was removed 2026-08-04. When a
                                      production had no transparency score, it rendered
                                      `extra_data.carbon_score` underneath the literal label
                                      "TRANSPARENCY SCORE / Agricultural Practices" — one
                                      measurement presented as another, with its own /100 and its
                                      own Excellent/Good/Fair badge. Carbon has its own row on this
                                      card and its own section on the transparency page. */}
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
                  onClick={() => { setStatusFilter('all'); setSortBy('default'); }}
                >
                  {intl.formatMessage({ id: 'parcel.clearFilters' })}
                </Button>
              </VStack>
            )
          ) : (
            <VStack spacing={6} py={16} align="center" px={6}>
              <VStack spacing={4} textAlign="center">
                <Icon as={FaSeedling} color="green.400" boxSize={12} />
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    {intl.formatMessage({ id: 'parcel.noProductionsStarted' })}
                  </Text>
                  <Text fontSize="sm" color="gray.500" maxW="350px" lineHeight="1.5">
                    {intl.formatMessage({ id: 'parcel.noProductionsDescription' })}
                  </Text>
                </VStack>
              </VStack>
            </VStack>
          )}
        </CardBody>
      )}
    </Card>
  );
};

export default HistoryCard;
