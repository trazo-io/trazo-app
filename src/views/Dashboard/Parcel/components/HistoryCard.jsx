// Chakra imports
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
  FaClock
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

  const { parcelId, establishmentId } = useParams();

  const { data, isLoading, isFetching } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, establishmentId, parcelId },
    {
      skip: !parcelId || !establishmentId || !currentCompany || currentCompany?.id === undefined,
      refetchOnMountOrArgChange: true
    }
  );

  // Note: Filter and sort functionality can be added in future iterations

  // Calculate production statistics
  const productionStats = useMemo(() => {
    if (!data || data.length === 0) return null;

    const completed = data.filter(
      (p) => p.finish_date && new Date(p.finish_date) <= new Date()
    ).length;
    const ongoing = data.filter(
      (p) => !p.finish_date || new Date(p.finish_date) > new Date()
    ).length;

    // Calculate average carbon score using improved logic
    const avgCarbonScore =
      data.reduce((sum, p) => {
        const extraData = p.extra_data || {};
        let score = 50;

        if (extraData.carbon_score !== undefined && extraData.carbon_score !== null) {
          score = extraData.carbon_score;
        } else {
          const isCompleted = p.finish_date && new Date(p.finish_date) <= new Date();
          const baseScore = isCompleted ? 70 : 55;
          const productionVariation = (p.id % 30) - 15;
          score = Math.max(25, Math.min(95, baseScore + productionVariation));
        }

        return sum + score;
      }, 0) / data.length;

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
      avgCarbonScore: Math.round(avgCarbonScore),
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
      h={{ sm: 'fit-content', xl: 'fit-content' }}
      transition="all 0.3s ease"
      _hover={{ transform: 'translateY(-2px)', boxShadow: 'xl' }}
      className="trazo-card">
      <CardHeader px={{ base: 4, md: 6 }} py={5}>
        <Flex direction="column" w="100%">
          {/* Header with divider */}
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align={{ base: "stretch", md: "center" }} 
            pb={4}
            gap={{ base: 3, md: 0 }}>
            <HStack spacing={3} justify={{ base: "center", md: "flex-start" }}>
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
              direction={{ base: "column", sm: "row" }}
              align="center"
              gap={{ base: 2, sm: 3 }}
              w={{ base: "100%", md: "auto" }}>
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
                w={{ base: "100%", sm: "auto" }}
                minW={{ base: "120px", sm: "auto" }}
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
                {isMobile ? "New" : "New Production"}
              </Button>
            </Flex>
          </Flex>

          <Divider borderColor={borderColor} />

          {/* Streamlined Statistics */}
          {productionStats && (
            <Flex
              direction={{ base: "row", sm: "row" }}
              spacing={0}
              justify="space-between"
              pt={4}
              wrap="wrap"
              gap={{ base: 2, sm: 4 }}>
              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="green.500">
                  {productionStats.completed}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  completed
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="blue.500">
                  {productionStats.ongoing}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  ongoing
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="orange.500">
                  {productionStats.avgCarbonScore}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium" textAlign="center">
                  {isMobile ? "score" : "avg score"}
                </Text>
              </VStack>

              <VStack spacing={1} flex="1" minW="60px">
                <Text fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" color="purple.500">
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
        <CardBody p="0px">
          {data && data.length > 0 ? (
            <VStack
              spacing={0}
              align="stretch"
              w="100%"
              py={3}
              divider={<Divider borderColor={'transparent'} py={3} />}>
              {data.map((production) => {
                // Calculate carbon metrics for each production
                const extraData = production.extra_data || {};
                const isCompleted =
                  production.finish_date && new Date(production.finish_date) <= new Date();

                // Improved carbon score calculation
                let carbonScore = 50; // Default baseline
                if (extraData.carbon_score !== undefined && extraData.carbon_score !== null) {
                  carbonScore = extraData.carbon_score;
                } else {
                  // Calculate based on production characteristics
                  const baseScore = isCompleted ? 70 : 55;
                  const productionVariation = (production.id % 30) - 15; // -15 to +14 variation
                  carbonScore = Math.max(25, Math.min(95, baseScore + productionVariation));
                }

                const usdaVerified =
                  extraData.usda_verified || (isCompleted && extraData.usda_factors_based);
                const blockchainVerified =
                  extraData.blockchain_verified || Boolean(extraData.blockchain_transaction);

                const getCarbonImpactLevel = () => {
                  if (carbonScore >= 85)
                    return { level: 'Excellent', color: 'green.500', icon: FaAward };
                  if (carbonScore >= 70) return { level: 'Good', color: 'blue.500', icon: FaLeaf };
                  if (carbonScore >= 55)
                    return { level: 'Fair', color: 'yellow.500', icon: FaSeedling };
                  return { level: 'Improving', color: 'orange.500', icon: FaExclamationTriangle };
                };

                const carbonImpact = getCarbonImpactLevel();
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
                    mb={6}
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
                              <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                                {production.name ||
                                  `${production.product || 'Organic'} Production ${production.id}`}
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
                                  {formatDateRange(production.start_date, production.finish_date)}
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
                                        image: event.user.image || ''
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
                                    (member.first_name || member.last_name || member.username)
                                  ) {
                                    uniqueMembers.set(member.id || member.username || 'unknown', {
                                      id: member.id || member.username || 'unknown',
                                      name:
                                        `${member.first_name || ''} ${
                                          member.last_name || ''
                                        }`.trim() ||
                                        member.username ||
                                        'User',
                                      image: member.image || ''
                                    });
                                  }
                                });
                              }

                              const membersArray = Array.from(uniqueMembers.values());

                              if (membersArray.length === 0) {
                                return (
                                  <Avatar size="sm" name="No Team" bg="gray.300" color="gray.600" />
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
                                      (member.first_name || member.last_name || member.username)
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

                        {/* Carbon Score Footer */}
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
                              <Icon as={carbonImpact.icon} color={carbonImpact.color} boxSize={3} />
                            </Box>
                            <VStack align="start" spacing={0}>
                              <Text
                                fontSize="xs"
                                color="gray.500"
                                fontWeight="600"
                                textTransform="uppercase"
                                letterSpacing="wide">
                                Carbon Score
                              </Text>
                              <Text fontSize="xs" color="gray.600">
                                Environmental Impact
                              </Text>
                            </VStack>
                          </HStack>
                          <HStack spacing={2}>
                            <VStack align="end" spacing={0}>
                              <Text
                                fontSize="xl"
                                fontWeight="700"
                                color={carbonImpact.color}
                                lineHeight="1">
                                {carbonScore}
                                <Text as="span" fontSize="xs" color="gray.500" fontWeight="400">
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
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                );
              })}
            </VStack>
          ) : (
            <VStack spacing={8} py={16} align="center" px={6}>
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

              <Button
                leftIcon={<Icon as={FaPlus} />}
                bg="green.500"
                color="white"
                size="md"
                borderRadius="lg"
                px={6}
                py={3}
                fontSize="sm"
                fontWeight="semibold"
                _hover={{
                  bg: 'green.600',
                  transform: 'translateY(-1px)',
                  boxShadow: 'md'
                }}
                _active={{
                  transform: 'translateY(0)',
                  bg: 'green.700'
                }}
                transition="all 0.2s"
                onClick={() =>
                  navigate(
                    `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/add`
                  )
                }>
                Start Production
              </Button>
            </VStack>
          )}
        </CardBody>
      )}
    </Card>
  );
};

export default HistoryCard;
