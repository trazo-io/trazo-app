// Chakra imports
import React from 'react';
import {
  Badge,
  Button,
  Box,
  VStack,
  HStack,
  Spinner,
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
  useBreakpointValue
} from '@chakra-ui/react';
import {
  FaSeedling,
  FaChartLine,
  FaLeaf,
  FaPlus,
  FaFilter,
  FaSort,
  FaCalendarAlt,
  FaAward,
  FaExclamationTriangle,
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
import { useMemo } from 'react';

import { useGetParcelHistoriesQuery } from 'store/api/historyApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';

const HistoryCard = ({ amount }) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const navigate = useNavigate();

  // Mobile responsiveness
  const isMobile = useBreakpointValue({ base: true, md: false });

  const currentCompany = useSelector((state) => state.company.currentCompany);
  const currentHistory = useSelector((state) => state.history?.currentHistory);

  const { parcelId, establishmentId } = useParams();

  const { data, isLoading, isFetching } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, establishmentId, parcelId },
    {
      skip: !parcelId || !establishmentId || !currentCompany || currentCompany?.id === undefined,
      refetchOnMountOrArgChange: true
    }
  );

  // Note: Filter and sort functionality can be added in future iterations

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

    // Calculate average transparency score using TRANSPARENCY-FIRST approach (per CLAUDE.md)
    const avgTransparencyScore = data.reduce((sum, p) => {
      const extraData = p.extra_data || {};
      let score = null;

      // PRIMARY: Backend transparency_score (calculated with anti-gaming measures)
      if (p.transparency_score !== undefined && p.transparency_score !== null) {
        score = p.transparency_score;
      }
      // SECONDARY: Extra data transparency_score (fallback)
      else if (
        extraData.transparency_score !== undefined &&
        extraData.transparency_score !== null
      ) {
        score = extraData.transparency_score;
      }
      // TERTIARY: Carbon score (only when no transparency score available)
      else if (extraData.carbon_score !== undefined && extraData.carbon_score !== null) {
        score = extraData.carbon_score;
      }
      // CRITICAL: No hardcoded fallbacks - only use real backend data
      else {
        return sum; // Skip productions without real backend scores
      }

      return sum + score;
    }, 0);

    // Only calculate average if we have productions with actual scores
    const productionsWithScores = data.filter((p) => {
      const extraData = p.extra_data || {};
      return (
        (p.transparency_score !== undefined && p.transparency_score !== null) ||
        (extraData.transparency_score !== undefined && extraData.transparency_score !== null) ||
        (extraData.carbon_score !== undefined && extraData.carbon_score !== null)
      );
    });

    const avgScore =
      productionsWithScores.length > 0 ? avgTransparencyScore / productionsWithScores.length : null;

    const totalEmissions = data.reduce((sum, p) => {
      const extraData = p.extra_data || {};
      return sum + (extraData.total_emissions || 0);
    }, 0);

    const verified = data.filter((p) => {
      const extraData = p.extra_data || {};
      return extraData.usda_verified || extraData.blockchain_verified;
    }).length;

    return {
      completed,
      ongoing,
      avgScore: avgScore !== null ? Math.round(avgScore) : null,
      totalEmissions: totalEmissions.toFixed(1),
      verified,
      verificationRate: Math.round((verified / data.length) * 100)
    };
  }, [data]);

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
      className="trazo-card">
      <CardHeader px={{ base: 4, md: 6 }} py={5}>
        <Flex direction="column" w="100%">
          {/* Header with divider */}
          <Flex
            direction={{ base: 'column', md: 'row' }}
            justify="space-between"
            align={{ base: 'stretch', md: 'center' }}
            pb={4}
            gap={{ base: 3, md: 0 }}>
            <HStack spacing={3} justify={{ base: 'center', md: 'flex-start' }}>
              <Text fontSize="lg" color={textColor} fontWeight="600">
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
                borderColor="green.200">
                Carbon Tracked
              </Badge>
            </HStack>

            <Flex
              direction={{ base: 'column', sm: 'row' }}
              align="center"
              gap={{ base: 2, sm: 3 }}
              w={{ base: '100%', md: 'auto' }}>
              {/* Simple Controls - Hide on very small screens */}
              {data && data.length > 1 && !isMobile && (
                <HStack spacing={1}>
                  <Tooltip label="Filter productions" placement="top">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<Icon as={FaFilter} />}
                      aria-label="Filter productions"
                      color="gray.500"
                      _hover={{ color: 'gray.700', bg: 'gray.100' }}
                    />
                  </Tooltip>
                  <Tooltip label="Sort productions" placement="top">
                    <IconButton
                      size="sm"
                      variant="ghost"
                      icon={<Icon as={FaSort} />}
                      aria-label="Sort productions"
                      color="gray.500"
                      _hover={{ color: 'gray.700', bg: 'gray.100' }}
                    />
                  </Tooltip>
                </HStack>
              )}

              {/* Only show New Production button when there are existing productions AND no current production */}
              {data && data.length > 0 && !currentHistory?.product && (
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
                      `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/add`
                    )
                  }>
                  {isMobile ? 'New' : 'New Production'}
                </Button>
              )}
            </Flex>
          </Flex>

          <Divider borderColor={borderColor} />

          {/* Streamlined Statistics */}
          {productionStats && (
            <Flex
              direction={{ base: 'row', sm: 'row' }}
              spacing={0}
              justify="space-between"
              pt={4}
              wrap="wrap"
              gap={{ base: 2, sm: 4 }}>
              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="green.500">
                  {productionStats.completed}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  completed
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="blue.500">
                  {productionStats.ongoing}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  ongoing
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="green.500">
                  {productionStats.avgScore !== null ? productionStats.avgScore : '--'}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  {isMobile ? 'score' : 'avg score'}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: 'lg', md: 'xl' }} fontWeight="bold" color="purple.500">
                  {productionStats.verificationRate}%
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  verified
                </Text>
              </VStack>
            </Flex>
          )}
        </Flex>
      </CardHeader>

      {isLoading || isFetching ? (
        <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
          <Spinner size="sm" color="green.500" />
        </Flex>
      ) : (
        <CardBody p="0px" pb={4}>
          {data && data.length > 0 ? (
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
              }}>
              <VStack spacing={4} align="stretch" w="100%" py={3} pb={6}>
                {(() => {
                  // Sort productions: ongoing first, then completed by most recent
                  const sortedProductions = [...data].sort((a, b) => {
                    // Determine status for production a
                    const aFinishDate = a.finish_date ? new Date(a.finish_date) : null;
                    const aIsOngoing = !aFinishDate;

                    // Determine status for production b
                    const bFinishDate = b.finish_date ? new Date(b.finish_date) : null;
                    const bIsOngoing = !bFinishDate;

                    // If one is ongoing and the other is completed, ongoing comes first
                    if (aIsOngoing && !bIsOngoing) return -1;
                    if (!aIsOngoing && bIsOngoing) return 1;

                    // If both are completed, sort by finish date (most recent first)
                    if (!aIsOngoing && !bIsOngoing) {
                      return new Date(b.finish_date) - new Date(a.finish_date);
                    }

                    // If both are ongoing, sort by start date (most recent first)
                    return new Date(b.start_date) - new Date(a.start_date);
                  });

                  // Group productions by status for separator logic
                  const ongoingProductions = sortedProductions.filter((p) => !p.finish_date);
                  const completedProductions = sortedProductions.filter((p) => p.finish_date);

                  return sortedProductions.map((production, index) => {
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

                          // TRANSPARENCY-FIRST: Use backend transparency_score (per CLAUDE.md)
                          let transparencyScore = null;
                          let carbonScore = null;

                          // Debug: Log available data to understand backend response
                          if (production.id === 175) {
                            console.log('Production 175 data:', {
                              transparency_score: production.transparency_score,
                              confidence_score: production.confidence_score,
                              extra_data: production.extra_data,
                              all_fields: Object.keys(production)
                            });
                          }

                          // PRIMARY: Backend transparency_score (calculated with anti-gaming measures)
                          if (
                            production.transparency_score !== undefined &&
                            production.transparency_score !== null
                          ) {
                            transparencyScore = production.transparency_score;
                          }

                          // SECONDARY: Extra data transparency_score (fallback)
                          if (
                            transparencyScore === null &&
                            extraData.transparency_score !== undefined &&
                            extraData.transparency_score !== null
                          ) {
                            transparencyScore = extraData.transparency_score;
                          }

                          // TERTIARY: Carbon Score (only when no transparency score available)
                          if (
                            transparencyScore === null &&
                            extraData.carbon_score !== undefined &&
                            extraData.carbon_score !== null
                          ) {
                            carbonScore = extraData.carbon_score;
                          }

                          // CRITICAL: No hardcoded fallbacks - show only real backend data

                          // Verification status - only show if explicitly verified from backend
                          const usdaVerified = Boolean(extraData.usda_verified);
                          const blockchainVerified = Boolean(extraData.blockchain_verified);

                          // TRANSPARENCY-FIRST: Use transparency score primarily, carbon as secondary
                          const getTransparencyImpactLevel = () => {
                            const score = transparencyScore || carbonScore;
                            if (!score) return null; // No hardcoded fallbacks

                            if (score >= 85)
                              return {
                                level: 'Excellent',
                                color: 'green.500',
                                icon: FaAward,
                                type: transparencyScore ? 'Transparency' : 'Carbon',
                                score: score
                              };
                            if (score >= 70)
                              return {
                                level: 'Good',
                                color: 'blue.500',
                                icon: FaLeaf,
                                type: transparencyScore ? 'Transparency' : 'Carbon',
                                score: score
                              };
                            if (score >= 55)
                              return {
                                level: 'Fair',
                                color: 'yellow.500',
                                icon: FaSeedling,
                                type: transparencyScore ? 'Transparency' : 'Carbon',
                                score: score
                              };
                            return {
                              level: 'Improving',
                              color: 'orange.500',
                              icon: FaExclamationTriangle,
                              type: transparencyScore ? 'Transparency' : 'Carbon',
                              score: score
                            };
                          };

                          const impactData = getTransparencyImpactLevel();

                          // Define carbonImpact for carbon score fallback display
                          const carbonImpact =
                            carbonScore !== null
                              ? {
                                  level:
                                    carbonScore >= 85
                                      ? 'Excellent'
                                      : carbonScore >= 70
                                      ? 'Good'
                                      : carbonScore >= 55
                                      ? 'Fair'
                                      : 'Improving',
                                  color:
                                    carbonScore >= 85
                                      ? 'green.500'
                                      : carbonScore >= 70
                                      ? 'blue.500'
                                      : carbonScore >= 55
                                      ? 'yellow.500'
                                      : 'orange.500',
                                  icon:
                                    carbonScore >= 85
                                      ? FaAward
                                      : carbonScore >= 70
                                      ? FaLeaf
                                      : carbonScore >= 55
                                      ? FaSeedling
                                      : FaExclamationTriangle
                                }
                              : null;

                          const getScoreColor = (score) => {
                            if (score >= 80) return 'green';
                            if (score >= 60) return 'yellow';
                            return 'orange';
                          };

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

                            return `${start} - Ongoing`;
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
                                    `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/${production.id}`
                                  );
                                }
                              }}
                              className="trazo-card">
                              <CardBody p={4}>
                                <VStack align="stretch" spacing={3}>
                                  {/* Header Row - Production Info and Status */}
                                  <HStack justify="space-between" align="center" spacing={3}>
                                    <HStack spacing={3} flex={1}>
                                      <Box
                                        p={2}
                                        bg={isCompleted ? 'green.50' : 'blue.50'}
                                        borderRadius="lg"
                                        border="1px solid"
                                        borderColor={isCompleted ? 'green.200' : 'blue.200'}
                                        flexShrink={0}>
                                        <Icon
                                          as={isCompleted ? FaChartLine : FaClock}
                                          color={isCompleted ? 'green.500' : 'blue.500'}
                                          boxSize={4}
                                        />
                                      </Box>
                                      <VStack align="start" spacing={1} flex={1}>
                                        <Text
                                          fontSize="sm"
                                          fontWeight="600"
                                          color={textColor}
                                          noOfLines={1}>
                                          {production.name ||
                                            `${production.product || 'Organic'} Production ${
                                              production.id
                                            }`}
                                        </Text>
                                        <HStack spacing={2}>
                                          <Badge
                                            colorScheme={isCompleted ? 'green' : 'blue'}
                                            variant="subtle"
                                            borderRadius="full"
                                            fontSize="xs"
                                            fontWeight="600"
                                            px={2}
                                            py={1}
                                            textTransform="uppercase"
                                            letterSpacing="wide">
                                            {isCompleted ? 'Complete' : 'Ongoing'}
                                          </Badge>
                                          <Text fontSize="xs" color="gray.500" fontWeight="medium">
                                            {formatDateRange(
                                              production.start_date,
                                              production.finish_date
                                            )}
                                          </Text>
                                        </HStack>
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
                                                    ? `${
                                                        import.meta.env.VITE_APP_BACKEND_URL?.replace(
                                                          '/api',
                                                          ''
                                                        ) || 'http://localhost:8000'
                                                      }${event.user.image}`
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
                                                    ? `${
                                                        import.meta.env.VITE_APP_BACKEND_URL?.replace(
                                                          '/api',
                                                          ''
                                                        ) || 'http://localhost:8000'
                                                      }${member.image}`
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
                                              name="No Team"
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
                                  </HStack>

                                  {/* Product & Team Info Row */}
                                  <HStack justify="space-between" align="center" spacing={3}>
                                    <HStack spacing={1}>
                                      <Text fontSize="xs" color="gray.500" fontWeight="medium">
                                        Product:
                                      </Text>
                                      <Text fontSize="xs" color="gray.700" fontWeight="600">
                                        {production.product || 'Agricultural Product'}
                                      </Text>
                                    </HStack>
                                    <HStack spacing={1}>
                                      <Text fontSize="xs" color="gray.500" fontWeight="medium">
                                        Team:
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
                                            ? `${membersArray.length} member${
                                                membersArray.length > 1 ? 's' : ''
                                              }`
                                            : 'No team';
                                        })()}
                                      </Text>
                                    </HStack>
                                  </HStack>

                                  {/* Verification Badges */}
                                  {(usdaVerified || blockchainVerified) && (
                                    <HStack spacing={2} wrap="wrap">
                                      {usdaVerified && (
                                        <Badge
                                          colorScheme="blue"
                                          variant="subtle"
                                          fontSize="xs"
                                          borderRadius="md"
                                          px={2}
                                          py={1}
                                          fontWeight="500">
                                          <HStack spacing={1}>
                                            <Icon as={FaAward} boxSize={2.5} />
                                            <Text>USDA</Text>
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
                                          fontWeight="500">
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
                                      borderColor={useColorModeValue('gray.200', 'gray.600')}>
                                      <HStack spacing={2}>
                                        <Box
                                          p={1.5}
                                          bg="green.50"
                                          borderRadius="md"
                                          border="1px solid"
                                          borderColor="green.200">
                                          <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
                                        </Box>
                                        <VStack align="start" spacing={0}>
                                          <Text
                                            fontSize="xs"
                                            color="gray.500"
                                            fontWeight="600"
                                            textTransform="uppercase"
                                            letterSpacing="wide">
                                            Transparency Score
                                          </Text>
                                          <Text fontSize="xs" color="gray.600">
                                            Agricultural Practices
                                          </Text>
                                        </VStack>
                                      </HStack>
                                      <VStack align="end" spacing={0}>
                                        <Text
                                          fontSize="xl"
                                          fontWeight="700"
                                          color="green.500"
                                          lineHeight="1">
                                          {transparencyScore}
                                          <Text
                                            as="span"
                                            fontSize="xs"
                                            color="gray.500"
                                            fontWeight="400">
                                            /100
                                          </Text>
                                        </Text>
                                        <Badge
                                          colorScheme="green"
                                          variant="subtle"
                                          fontSize="xs"
                                          fontWeight="600"
                                          px={2}
                                          py={0.5}
                                          borderRadius="full"
                                          textTransform="uppercase"
                                          letterSpacing="wide">
                                          {transparencyScore >= 80
                                            ? 'HIGH'
                                            : transparencyScore >= 60
                                            ? 'MEDIUM'
                                            : 'BASIC'}
                                        </Badge>
                                      </VStack>
                                    </HStack>
                                  )}

                                  {/* Carbon Score - Secondary Display (Progressive Disclosure) */}
                                  {carbonScore !== null &&
                                    transparencyScore === null &&
                                    carbonImpact && (
                                      <HStack
                                        justify="space-between"
                                        align="center"
                                        pt={2}
                                        borderTop="1px solid"
                                        borderColor={useColorModeValue('gray.200', 'gray.600')}>
                                        <HStack spacing={2}>
                                          <Box
                                            p={1.5}
                                            bg={`${carbonImpact.color.split('.')[0]}.50`}
                                            borderRadius="md"
                                            border="1px solid"
                                            borderColor={`${carbonImpact.color.split('.')[0]}.200`}>
                                            <Icon
                                              as={carbonImpact.icon}
                                              color={carbonImpact.color}
                                              boxSize={3}
                                            />
                                          </Box>
                                          <VStack align="start" spacing={0}>
                                            <Text
                                              fontSize="xs"
                                              color="gray.500"
                                              fontWeight="600"
                                              textTransform="uppercase"
                                              letterSpacing="wide">
                                              Transparency Score
                                            </Text>
                                            <Text fontSize="xs" color="gray.600">
                                              Agricultural Practices
                                            </Text>
                                          </VStack>
                                        </HStack>
                                        <VStack align="end" spacing={0}>
                                          <Text
                                            fontSize="xl"
                                            fontWeight="700"
                                            color={carbonImpact.color}
                                            lineHeight="1">
                                            {carbonScore}
                                            <Text
                                              as="span"
                                              fontSize="xs"
                                              color="gray.500"
                                              fontWeight="400">
                                              /100
                                            </Text>
                                          </Text>
                                          <Badge
                                            colorScheme={carbonImpact.color.split('.')[0]}
                                            variant="subtle"
                                            fontSize="xs"
                                            fontWeight="600"
                                            px={2}
                                            py={0.5}
                                            borderRadius="full"
                                            textTransform="uppercase"
                                            letterSpacing="wide">
                                            {carbonImpact.level}
                                          </Badge>
                                        </VStack>
                                      </HStack>
                                    )}
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
            <VStack spacing={6} py={16} align="center" px={6}>
              <VStack spacing={4} textAlign="center">
                <Icon as={FaSeedling} color="green.400" boxSize={12} />
                <VStack spacing={2}>
                  <Text fontSize="lg" fontWeight="bold" color={textColor}>
                    No productions started yet
                  </Text>
                  <Text fontSize="sm" color="gray.500" maxW="350px" lineHeight="1.5">
                    Start tracking your agricultural production to build carbon transparency and
                    connect with consumers through QR codes
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
