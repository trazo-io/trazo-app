import React, { useState, useEffect } from 'react';
import {
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Icon,
  Badge,
  Progress,
  Image,
  Circle,
  useBreakpointValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Box,
  Flex
} from '@chakra-ui/react';
import {
  FaQrcode,
  FaMapMarkerAlt,
  FaTractor,
  FaAward,
  FaCheckCircle,
  FaEye,
  FaChevronRight,
  FaStar
} from 'react-icons/fa';
import { format } from 'date-fns';
import { useIntl } from 'react-intl';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  StandardPage,
  StandardCard,
  StandardSection,
  StandardGrid,
  StandardButton,
  StandardAlert,
  StandardMetricCard,
  ConsumerTooltip
} from '../../../components/Design/StandardComponents';
import { useGetUserProductionScansQuery, useGetUserReviewsQuery } from 'store/api/historyApi';

// Show first 5 items in main view, then "View All" navigates to dedicated page
const INITIAL_DISPLAY_COUNT = 5;

export default function CarbonJourney() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const navigate = useNavigate();
  const intl = useIntl();
  const [activeTab, setActiveTab] = useState(0);

  // API queries for data
  const { data: productions, isLoading: scansLoading } = useGetUserProductionScansQuery();
  const { data: reviews, isLoading: reviewsLoading } = useGetUserReviewsQuery();

  // Journey statistics
  const [shopStats, setShopStats] = useState({
    totalScans: 0,
    totalReviews: 0,
    totalEventsViewed: 0,
    sustainableFarmsFound: 0
  });

  useEffect(() => {
    // Calculate journey statistics based on real data
    if (productions && reviews) {
      const totalScans = productions.length || 0;
      const totalReviews = reviews.length || 0;

      // Honest metric: total documented farm events across everything the
      // user has scanned. A raw count — the old (events / scans*10)
      // percentage implied a "% of products with data" the payload cannot
      // support.
      const totalEventsViewed = productions.reduce((acc, prod) => {
        return acc + (prod.events_count || prod.total_events || 0);
      }, 0);

      setShopStats({
        totalScans,
        totalReviews,
        totalEventsViewed,
        sustainableFarmsFound: new Set(productions?.map((p) => p.establishment_name)).size || 0
      });
    }
  }, [productions, reviews]);

  // Calculate transparency based on documented events (transparency-first approach)
  const getTransparencyInfo = (production: any) => {
    // Use events_count from production data, or calculate from available data
    const eventsCount = production.events_count || production.total_events || 0;
    const hasVerification = production.is_verified || production.blockchain_verified;
    const hasPhotos = production.images?.length > 0 || production.photo_count > 0;

    // Transparency is about documentation, not carbon scores
    // More documented events = higher transparency
    let transparencyLevel = 'low';
    let color = 'gray';

    if (eventsCount >= 10 || hasVerification) {
      transparencyLevel = 'high';
      color = 'green';
    } else if (eventsCount >= 5 || hasPhotos) {
      transparencyLevel = 'medium';
      color = 'blue';
    }

    return { eventsCount, transparencyLevel, color, hasVerification, hasPhotos };
  };

  return (
    <StandardPage
      title="My Shopping History"
      description="See all the products you've scanned and reviewed"
      showBackButton
      onBack={() => navigate(-1)}
    >
      <VStack spacing={8} align="stretch">
        {/* Journey Overview Stats */}
        <StandardCard title="Your Shopping Summary" variant="elevated">
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
            <StandardMetricCard
              icon={FaQrcode}
              iconColor="green.600"
              iconBg="green.100"
              value={shopStats.totalScans}
              label="Products Scanned"
            />

            <StandardMetricCard
              icon={FaEye}
              iconColor="blue.600"
              iconBg="blue.100"
              value={shopStats.totalEventsViewed}
              label={intl.formatMessage({ id: 'consumer.journey.eventsViewed' })}
              tooltip={{
                label: intl.formatMessage({ id: 'consumer.journey.eventsViewed' }),
                explanation: intl.formatMessage({ id: 'consumer.journey.eventsViewedTooltip' })
              }}
            />

            <StandardMetricCard
              icon={FaTractor}
              iconColor="teal.600"
              iconBg="teal.100"
              value={shopStats.sustainableFarmsFound}
              label="Farms Discovered"
            />

            <StandardMetricCard
              icon={FaAward}
              iconColor="orange.600"
              iconBg="orange.100"
              value={shopStats.totalReviews}
              label="Reviews Written"
            />
          </SimpleGrid>

          <StandardAlert
            status="success"
            title="Keep Going!"
            description={`You've checked ${shopStats.totalScans} ${shopStats.totalScans === 1 ? 'product' : 'products'} and discovered ${shopStats.sustainableFarmsFound} transparent ${shopStats.sustainableFarmsFound === 1 ? 'farm' : 'farms'}. Every scan helps you make better choices.`}
          />
        </StandardCard>

        {/* Journey Details Tabs */}
        <StandardCard variant="elevated">
          <Tabs
            index={activeTab}
            onChange={setActiveTab}
            variant="soft-rounded"
            colorScheme="green"
          >
            <TabList mb={6}>
              <Tab>Scan History</Tab>
              <Tab>My Reviews</Tab>
              <Tab>Impact Timeline</Tab>
            </TabList>

            <TabPanels>
              {/* Scan History Tab */}
              <TabPanel p={0}>
                <StandardSection
                  title="Product Scans"
                  description="Discover the farming journey behind your food"
                >
                  <VStack spacing={3}>
                    {!scansLoading &&
                      productions?.slice(0, INITIAL_DISPLAY_COUNT)?.map((production, index) => {
                        const transparencyInfo = getTransparencyInfo(production);
                        const productName =
                          typeof production.product === 'object'
                            ? production.product?.name || 'Unknown Product'
                            : production.product || 'Unknown Product';
                        const farmName =
                          production.establishment_name ||
                          production.parcel?.establishment?.name ||
                          production.establishment?.name ||
                          'Unknown Farm';
                        const scanDate =
                          production.date && !isNaN(new Date(production.date).getTime())
                            ? format(new Date(production.date), 'MMM dd, yyyy')
                            : production.scanned_at
                            ? format(new Date(production.scanned_at), 'MMM dd, yyyy')
                            : 'Recently';

                        return (
                          <NavLink
                            key={production.id || index}
                            to={`/production/${production.public_id}/`}
                            style={{ width: '100%' }}
                          >
                            <Box
                              bg="white"
                              borderRadius="xl"
                              border="1px solid"
                              borderColor="gray.200"
                              p={6}
                              _hover={{
                                boxShadow: 'md',
                                borderColor: 'green.200'
                              }}
                              transition="all 0.2s"
                            >
                              <VStack spacing={4} align="stretch">
                                {/* Header with Image and Title */}
                                <Flex justify="space-between" align="center">
                                  <HStack spacing={3}>
                                    {/* Product Image */}
                                    {production.images?.length > 0 ? (
                                      <Image
                                        src={production.images[0]}
                                        w="56px"
                                        h="56px"
                                        borderRadius="xl"
                                        objectFit="cover"
                                        border="2px solid"
                                        borderColor="green.100"
                                      />
                                    ) : (
                                      <Circle
                                        size="56px"
                                        bg="green.50"
                                        border="2px solid"
                                        borderColor="green.100"
                                      >
                                        <Icon as={FaQrcode} color="green.500" boxSize={5} />
                                      </Circle>
                                    )}
                                    <VStack align="start" spacing={0}>
                                      <Text
                                        fontWeight="semibold"
                                        fontSize="md"
                                        color="gray.800"
                                        noOfLines={1}
                                      >
                                        {productName}
                                      </Text>
                                      <Text fontSize="sm" color="gray.500">
                                        {scanDate}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                  <Icon as={FaChevronRight} color="gray.400" boxSize={4} />
                                </Flex>

                                {/* Content */}
                                <VStack align="stretch" spacing={3}>
                                  <HStack spacing={1}>
                                    <Icon as={FaMapMarkerAlt} color="gray.400" boxSize={3} />
                                    <Text fontSize="sm" color="gray.600" noOfLines={1}>
                                      {farmName}
                                    </Text>
                                  </HStack>

                                  {/* Badges Row */}
                                  <HStack spacing={2} flexWrap="wrap">
                                    <Badge
                                      colorScheme={transparencyInfo.color}
                                      variant="subtle"
                                      fontSize="xs"
                                      px={2}
                                      py={0.5}
                                      borderRadius="full"
                                    >
                                      <HStack spacing={1}>
                                        <Icon as={FaEye} boxSize={2.5} />
                                        <Text>
                                          {transparencyInfo.eventsCount > 0
                                            ? `${transparencyInfo.eventsCount} ${transparencyInfo.eventsCount === 1 ? 'event' : 'events'}`
                                            : 'View'}
                                        </Text>
                                      </HStack>
                                    </Badge>
                                    {transparencyInfo.hasVerification && (
                                      <Badge
                                        colorScheme="green"
                                        variant="outline"
                                        fontSize="xs"
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                      >
                                        <HStack spacing={1}>
                                          <Icon as={FaCheckCircle} boxSize={2.5} />
                                          <Text>Verified</Text>
                                        </HStack>
                                      </Badge>
                                    )}
                                    {transparencyInfo.hasPhotos && (
                                      <Badge
                                        colorScheme="blue"
                                        variant="outline"
                                        fontSize="xs"
                                        px={2}
                                        py={0.5}
                                        borderRadius="full"
                                      >
                                        Photos
                                      </Badge>
                                    )}
                                  </HStack>
                                </VStack>
                              </VStack>
                            </Box>
                          </NavLink>
                        );
                      })}

                    {/* View All Button */}
                    {productions && productions.length > INITIAL_DISPLAY_COUNT && (
                      <StandardButton
                        variant="outline"
                        size="md"
                        w="full"
                        onClick={() => navigate('/admin/dashboard/journey/scans')}
                      >
                        View All {productions.length} Scans
                      </StandardButton>
                    )}

                    {/* Empty State */}
                    {!scansLoading && (!productions || productions.length === 0) && (
                      <Box textAlign="center" py={8}>
                        <Circle size="60px" bg="gray.100" mx="auto" mb={4}>
                          <Icon as={FaQrcode} color="gray.400" boxSize={6} />
                        </Circle>
                        <Text color="gray.600" fontWeight="medium" mb={2}>
                          No scans yet
                        </Text>
                        <Text color="gray.500" fontSize="sm">
                          Scan a product QR code to start your transparency journey
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </StandardSection>
              </TabPanel>

              {/* Reviews Tab */}
              <TabPanel p={0}>
                <StandardSection
                  title="Your Reviews"
                  description="Your feedback helps build trust in agricultural transparency"
                >
                  <VStack spacing={3}>
                    {!reviewsLoading &&
                      reviews?.slice(0, INITIAL_DISPLAY_COUNT)?.map((review, index) => {
                        const productName =
                          typeof review.history.product === 'object'
                            ? review.history.product?.name || 'Unknown Product'
                            : review.history.product || 'Unknown Product';
                        const reviewDate =
                          review.date && !isNaN(new Date(review.date).getTime())
                            ? format(new Date(review.date), 'MMM dd, yyyy')
                            : 'Recently';

                        return (
                          <NavLink
                            key={review.id || index}
                            to={`/production/${review.history.public_id}/`}
                            style={{ width: '100%' }}
                          >
                            <Box
                              bg="white"
                              borderRadius="xl"
                              border="1px solid"
                              borderColor="gray.200"
                              p={6}
                              _hover={{
                                boxShadow: 'md',
                                borderColor: 'green.200'
                              }}
                              transition="all 0.2s"
                            >
                              <VStack spacing={4} align="stretch">
                                {/* Header with Image and User Info */}
                                <Flex justify="space-between" align="center">
                                  <HStack spacing={3}>
                                    {/* Review Icon/Image */}
                                    {review.history.images?.length > 0 ? (
                                      <Image
                                        src={review.history.images[0]}
                                        w="56px"
                                        h="56px"
                                        borderRadius="xl"
                                        objectFit="cover"
                                        border="2px solid"
                                        borderColor="orange.100"
                                      />
                                    ) : (
                                      <Circle
                                        size="56px"
                                        bg="orange.50"
                                        border="2px solid"
                                        borderColor="orange.100"
                                      >
                                        <Icon as={FaStar} color="orange.500" boxSize={5} />
                                      </Circle>
                                    )}
                                    <VStack align="start" spacing={0}>
                                      <Text
                                        fontWeight="semibold"
                                        fontSize="md"
                                        color="gray.800"
                                        noOfLines={1}
                                      >
                                        {review.headline || productName}
                                      </Text>
                                      <Text fontSize="sm" color="gray.500">
                                        {reviewDate}
                                      </Text>
                                    </VStack>
                                  </HStack>
                                  <VStack align="end" spacing={1}>
                                    <Badge
                                      colorScheme="orange"
                                      variant="subtle"
                                      fontSize="xs"
                                      px={2}
                                      py={0.5}
                                      borderRadius="full"
                                    >
                                      <HStack spacing={1}>
                                        <Icon as={FaStar} boxSize={2.5} />
                                        <Text>{review.rating}/5</Text>
                                      </HStack>
                                    </Badge>
                                  </VStack>
                                </Flex>

                                {/* Review Content */}
                                <VStack align="stretch" spacing={3}>
                                  <Text
                                    fontSize="sm"
                                    color="gray.600"
                                    noOfLines={2}
                                    lineHeight="1.6"
                                  >
                                    {review.written_review || 'No comments'}
                                  </Text>
                                  <HStack spacing={4} fontSize="xs" color="gray.500">
                                    <Text>Product: {productName}</Text>
                                  </HStack>
                                </VStack>
                              </VStack>
                            </Box>
                          </NavLink>
                        );
                      })}

                    {/* View All Button */}
                    {reviews && reviews.length > INITIAL_DISPLAY_COUNT && (
                      <StandardButton
                        variant="outline"
                        size="md"
                        w="full"
                        onClick={() => navigate('/admin/dashboard/journey/reviews')}
                      >
                        View All {reviews.length} Reviews
                      </StandardButton>
                    )}

                    {/* Empty State */}
                    {!reviewsLoading && (!reviews || reviews.length === 0) && (
                      <Box textAlign="center" py={8}>
                        <Circle size="60px" bg="gray.100" mx="auto" mb={4}>
                          <Icon as={FaStar} color="gray.400" boxSize={6} />
                        </Circle>
                        <Text color="gray.600" fontWeight="medium" mb={2}>
                          No reviews yet
                        </Text>
                        <Text color="gray.500" fontSize="sm">
                          Share your thoughts on products you've scanned
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </StandardSection>
              </TabPanel>

              {/* Impact Timeline Tab */}
              <TabPanel p={0}>
                <StandardSection
                  title="Your Transparency Journey"
                  description="See how you're discovering transparent farming practices"
                >
                  <VStack spacing={6}>
                    <StandardGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="green.100" color="green.600">
                            <Icon as={FaQrcode} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <StatLabel>Products Explored</StatLabel>
                            <StatNumber color="green.600">{shopStats.totalScans}</StatNumber>
                            <StatHelpText>total scans</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>

                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="blue.100" color="blue.600">
                            <Icon as={FaTractor} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <StatLabel>Farms Discovered</StatLabel>
                            <StatNumber color="blue.600">
                              {shopStats.sustainableFarmsFound}
                            </StatNumber>
                            <StatHelpText>unique farms</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>

                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="teal.100" color="teal.600">
                            <Icon as={FaAward} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <ConsumerTooltip
                              label="Your Reviews"
                              explanation="Reviews you've written help other consumers make informed choices. Your feedback builds trust in agricultural transparency and supports farmers who document their practices."
                            >
                              <StatLabel
                                cursor="help"
                                textDecoration="underline"
                                textDecorationStyle="dotted"
                              >
                                Reviews Shared
                              </StatLabel>
                            </ConsumerTooltip>
                            <StatNumber color="teal.600">{shopStats.totalReviews}</StatNumber>
                            <StatHelpText>{shopStats.totalReviews === 1 ? 'review' : 'reviews'} written</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>
                    </StandardGrid>

                    <StandardAlert
                      status="info"
                      title="Building Trust Together"
                      description="Every scan helps you understand how your food was grown. Every review helps other consumers make informed choices. Thank you for supporting transparent agriculture!"
                    />
                  </VStack>
                </StandardSection>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </StandardCard>
      </VStack>
    </StandardPage>
  );
}
