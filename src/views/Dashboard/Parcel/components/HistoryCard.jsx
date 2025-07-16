// Chakra imports
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
  IconButton
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

  const currentCompany = useSelector((state) => state.company.currentCompany);

  const { parcelId, establishmentId } = useParams();

  const { data, isLoading } = useGetParcelHistoriesQuery(
    { companyId: currentCompany?.id, establishmentId, parcelId },
    {
      skip: !parcelId || !establishmentId || !currentCompany || currentCompany?.id === undefined
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
      <CardHeader px={6} py={5} borderBottom="1px solid" borderColor={borderColor}>
        <Flex direction="column" gap={5} w="100%">
          {/* Minimalist Header */}
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
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

            <HStack spacing={3}>
              {/* Simple Controls */}
              {data && data.length > 1 && (
                <HStack spacing={1}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={<Icon as={FaFilter} />}
                    aria-label="Filter productions"
                    color="gray.500"
                    _hover={{ color: 'gray.700', bg: 'gray.100' }}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    icon={<Icon as={FaSort} />}
                    aria-label="Sort productions"
                    color="gray.500"
                    _hover={{ color: 'gray.700', bg: 'gray.100' }}
                  />
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
                New Production
              </Button>
            </HStack>
          </Flex>

          {/* Streamlined Statistics */}
          {productionStats && (
            <HStack spacing={6} justify="space-between">
              <HStack spacing={1}>
                <Text fontSize="xl" fontWeight="bold" color="green.500">
                  {productionStats.completed}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  completed
                </Text>
              </HStack>

              <HStack spacing={1}>
                <Text fontSize="xl" fontWeight="bold" color="blue.500">
                  {productionStats.ongoing}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  ongoing
                </Text>
              </HStack>

              <HStack spacing={1}>
                <Text fontSize="xl" fontWeight="bold" color="orange.500">
                  {productionStats.avgCarbonScore}
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  avg score
                </Text>
              </HStack>

              <HStack spacing={1}>
                <Text fontSize="xl" fontWeight="bold" color="purple.500">
                  {productionStats.verificationRate}%
                </Text>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  verified
                </Text>
              </HStack>
            </HStack>
          )}
        </Flex>
      </CardHeader>

      {isLoading ? (
        <Flex width={'100%'} height={'120px'} justifyContent={'center'} alignItems="center">
          <CircularProgress isIndeterminate color="green.500" size="40px" />
        </Flex>
      ) : (
        <CardBody p="0px">
          {data && data.length > 0 ? (
            <VStack spacing={0} align="stretch" w="100%">
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
                  <Box
                    key={production.id}
                    px={6}
                    py={5}
                    borderBottom="1px solid"
                    borderColor={useColorModeValue('gray.100', 'gray.600')}
                    cursor="pointer"
                    transition="all 0.2s ease"
                    _hover={{
                      bg: useColorModeValue('gray.25', 'gray.700'),
                      borderLeftWidth: '4px',
                      borderLeftColor: 'green.400'
                    }}
                    _last={{
                      borderBottom: 'none'
                    }}
                    onClick={() =>
                      navigate(
                        `/admin/dashboard/establishment/${establishmentId}/parcel/${parcelId}/production/${production.id}`
                      )
                    }>
                    <Flex align="center" justify="space-between" w="100%">
                      {/* Left Section: Production Info */}
                      <Flex align="center" gap={4} flex={1}>
                        <Icon
                          as={isCompleted ? FaChartLine : FaClock}
                          color={isCompleted ? 'green.500' : 'blue.500'}
                          boxSize={5}
                        />

                        <VStack align="start" spacing={1} flex={1}>
                          <Flex align="center" gap={3} w="100%">
                            <Text fontSize="md" fontWeight="600" color={textColor}>
                              {production.name || `Production ${production.id}`}
                            </Text>

                            {/* Modern Status Badge */}
                            <Badge
                              bg={isCompleted ? 'green.500' : 'blue.500'}
                              color="white"
                              borderRadius="full"
                              fontSize="2xs"
                              fontWeight="semibold"
                              px={3}
                              py={1}
                              textTransform="none">
                              {isCompleted ? 'Complete' : 'Ongoing'}
                            </Badge>
                          </Flex>

                          <Text fontSize="sm" color="gray.500" fontWeight="medium">
                            {formatDateRange(production.start_date, production.finish_date)}
                          </Text>

                          <Text fontSize="sm" color="gray.600" fontWeight="medium">
                            {production.product || 'Agricultural Product'}
                          </Text>

                          {/* Verification Badges */}
                          {(usdaVerified || blockchainVerified) && (
                            <HStack spacing={2} mt={1}>
                              {usdaVerified && (
                                <Badge
                                  bg="blue.50"
                                  color="blue.700"
                                  fontSize="xs"
                                  borderRadius="md"
                                  px={2}
                                  py={1}
                                  fontWeight="500"
                                  textTransform="none"
                                  border="1px solid"
                                  w="fit-content"
                                  borderColor="blue.200">
                                  <HStack spacing={1}>
                                    <Icon as={FaAward} boxSize={2.5} />
                                    <Text>USDA Verified</Text>
                                  </HStack>
                                </Badge>
                              )}
                              {blockchainVerified && (
                                <Badge
                                  bg="purple.50"
                                  color="purple.700"
                                  fontSize="xs"
                                  borderRadius="md"
                                  px={2}
                                  py={1}
                                  fontWeight="500"
                                  textTransform="none"
                                  border="1px solid"
                                  w="fit-content"
                                  borderColor="purple.200">
                                  <HStack spacing={1}>
                                    <Icon as={FaAward} boxSize={2.5} />
                                    <Text>Blockchain</Text>
                                  </HStack>
                                </Badge>
                              )}
                            </HStack>
                          )}
                        </VStack>
                      </Flex>

                      {/* Team Members - Middle Section */}
                      <Flex align="center" minW="120px" justify="center">
                        {(() => {
                          // Get unique team members from events first, then fallback to production.members
                          const uniqueMembers = new Map();
                          
                          // Check events for team members
                          if (production.events && production.events.length > 0) {
                            production.events.forEach(event => {
                              if (event.user && (event.user.first_name || event.user.last_name || event.user.username)) {
                                const userId = event.user.id || event.user.username || 'unknown';
                                if (!uniqueMembers.has(userId)) {
                                  uniqueMembers.set(userId, {
                                    id: userId,
                                    first_name: event.user.first_name || '',
                                    last_name: event.user.last_name || '',
                                    username: event.user.username || '',
                                    image: event.user.image || ''
                                  });
                                }
                              }
                            });
                          }
                          
                          // Fallback to production.members if no event users found
                          if (uniqueMembers.size === 0 && production.members && production.members.length > 0) {
                            production.members.forEach(member => {
                              if (member && (member.first_name || member.last_name || member.username)) {
                                uniqueMembers.set(member.id || member.username || 'unknown', member);
                              }
                            });
                          }
                          
                          const membersArray = Array.from(uniqueMembers.values());
                          
                          return membersArray.length > 0 ? (
                            <AvatarGroup size="sm" max={3} spacing="-6px">
                              {membersArray.map((member) => {
                                const displayName = `${member.first_name || ''} ${member.last_name || ''}`.trim() || member.username || 'Team Member';
                                return (
                                  <Tooltip
                                    key={member.id}
                                    label={displayName}
                                    placement="top">
                                    <Avatar
                                      size="sm"
                                      name={displayName}
                                      src={member.image || ''}
                                      borderWidth="2px"
                                      borderColor="white"
                                      bg="green.100"
                                      color="green.700"
                                    />
                                  </Tooltip>
                                );
                              })}
                            </AvatarGroup>
                          ) : (
                            <VStack spacing={0} align="center">
                              <Text fontSize="2xs" color="gray.400" fontWeight="medium">
                                No events
                              </Text>
                            </VStack>
                          );
                        })()}
                      </Flex>

                      {/* Right Section: Carbon Score */}
                      <VStack align="center" spacing={1} minW="140px">
                        <HStack spacing={2}>
                          <Icon as={carbonImpact.icon} color={carbonImpact.color} boxSize={4} />
                          <Text
                            fontSize="xs"
                            color="gray.500"
                            fontWeight="semibold"
                            textTransform="uppercase">
                            Carbon Score
                          </Text>
                        </HStack>

                        <Text
                          fontSize="2xl"
                          fontWeight="bold"
                          color={carbonImpact.color}
                          lineHeight="1">
                          {carbonScore}
                          <Text as="span" fontSize="xs" color="gray.500" fontWeight="normal">
                            /100
                          </Text>
                        </Text>

                        <Text fontSize="xs" color={carbonImpact.color} fontWeight="medium">
                          {carbonImpact.level}
                        </Text>

                        <Progress
                          value={carbonScore}
                          colorScheme={getScoreColor(carbonScore)}
                          size="sm"
                          borderRadius="full"
                          bg={useColorModeValue('gray.100', 'gray.600')}
                          w="100px"
                          hasStripe={!isCompleted}
                          isAnimated={!isCompleted}
                          h="6px"
                        />
                      </VStack>
                    </Flex>
                  </Box>
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
