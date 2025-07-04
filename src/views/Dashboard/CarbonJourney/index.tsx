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
  Stack,
  Circle,
  Flex,
  Box,
  useBreakpointValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaChartLine,
  FaCalendar,
  FaQrcode,
  FaStar,
  FaMapMarkerAlt,
  FaTractor,
  FaAward,
  FaSearch,
  FaFilter,
  FaDownload
} from 'react-icons/fa';
import { MdEco, MdVerified, MdTimeline, MdInsights, MdHistory, MdTrendingUp } from 'react-icons/md';
import { BsStar, BsStarFill, BsStarHalf } from 'react-icons/bs';
import { format } from 'date-fns';
import { NavLink } from 'react-router-dom';
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

export default function CarbonJourney() {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [activeTab, setActiveTab] = useState(0);

  // API queries for data
  const { data: productions, isLoading: scansLoading } = useGetUserProductionScansQuery();
  const { data: reviews, isLoading: reviewsLoading } = useGetUserReviewsQuery();

  // Journey statistics
  const [shopStats, setShopStats] = useState({
    totalScans: 0,
    totalReviews: 0,
    avgTransparencyScore: 0,
    carbonFootprintRevealed: '0',
    sustainableFarmsFound: 0,
    daysActive: 0,
    currentStreak: 0
  });

  useEffect(() => {
    // Calculate journey statistics
    if (productions && reviews) {
      const totalScans = productions.length || 0;
      const totalReviews = reviews.length || 0;
      const avgScore =
        productions.reduce((acc, prod) => acc + (prod.certificate_percentage || 0), 0) /
        (totalScans || 1);

      setShopStats({
        totalScans,
        totalReviews,
        avgTransparencyScore: Math.round(avgScore),
        carbonFootprintRevealed: (totalScans * 1.8).toFixed(1),
        sustainableFarmsFound: new Set(productions?.map((p) => p.establishment_name)).size || 0,
        daysActive: Math.max(totalScans, totalReviews),
        currentStreak: Math.min(7, totalScans) // Based on scan frequency
      });
    }
  }, [productions, reviews]);

  const renderSustainabilityStars = (score: number) => {
    const rating = score / 20; // Convert 0-100 to 0-5 stars
    return (
      <Stack direction="row" spacing="1px">
        {[1, 2, 3, 4, 5].map((index) => (
          <Icon
            key={index}
            as={rating >= index ? BsStarFill : rating > index - 0.5 ? BsStarHalf : BsStar}
            w="14px"
            h="14px"
            color="green.400"
          />
        ))}
      </Stack>
    );
  };

  const getTransparencyGrade = (score: number) => {
    if (score >= 90) return { grade: 'A+', color: 'green' };
    if (score >= 80) return { grade: 'A', color: 'green' };
    if (score >= 70) return { grade: 'B', color: 'blue' };
    if (score >= 60) return { grade: 'C', color: 'yellow' };
    return { grade: 'D', color: 'red' };
  };

  return (
    <StandardPage
      title="My Shopping History"
      description="See all the products you've scanned and reviewed"
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
              icon={MdVerified}
              iconColor="blue.600"
              iconBg="blue.100"
              value={`${shopStats.avgTransparencyScore || 0}%`}
              label="Products with Data"
              tooltip={{
                label: 'Products with Data',
                explanation:
                  "This shows what percentage of products you've scanned have complete environmental information available. Higher percentages mean more transparency about farming practices and carbon impact. Some products may be pending analysis."
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
            description={`You've checked ${shopStats.totalScans} products and found ${shopStats.sustainableFarmsFound} sustainable farms. Every scan helps you make better choices.`}
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
                  description="Your journey through agricultural carbon footprints"
                >
                  <VStack spacing={4}>
                    {!scansLoading &&
                      productions?.map((production, index) => {
                        const transparencyData = getTransparencyGrade(
                          production.certificate_percentage || 0
                        );

                        return (
                          <NavLink
                            key={index}
                            to={`/production/${production.id}/`}
                            style={{ width: '100%' }}
                          >
                            <StandardCard variant="outline" padding={6}>
                              <HStack spacing={6} align="start">
                                {production.images?.length > 0 && (
                                  <Image
                                    src={production.images[0]}
                                    w="80px"
                                    h="80px"
                                    borderRadius="lg"
                                    objectFit="cover"
                                    shadow="sm"
                                  />
                                )}

                                <VStack align="start" spacing={3} flex={1}>
                                  <HStack justify="space-between" w="full">
                                    <VStack align="start" spacing={1}>
                                      <Text fontSize="lg" fontWeight="bold" color="gray.700">
                                        {typeof production.product === 'object'
                                          ? production.product?.name || 'Unknown Product'
                                          : production.product || 'Unknown Product'}
                                      </Text>
                                      <HStack spacing={2}>
                                        <Icon as={FaMapMarkerAlt} color="gray.500" boxSize={3} />
                                        <Text fontSize="sm" color="gray.600">
                                          {production.establishment_name ||
                                            production.parcel?.establishment?.name ||
                                            production.establishment?.name ||
                                            'Unknown Farm'}
                                        </Text>
                                      </HStack>
                                      <Text fontSize="xs" color="gray.500">
                                        {production.date &&
                                        !isNaN(new Date(production.date).getTime())
                                          ? format(new Date(production.date), 'MMMM dd, yyyy')
                                          : 'Date not available'}
                                      </Text>
                                    </VStack>

                                    <VStack align="end" spacing={2}>
                                      <Badge
                                        colorScheme={transparencyData.color}
                                        variant="solid"
                                        fontSize="sm"
                                      >
                                        Grade {transparencyData.grade}
                                      </Badge>
                                      {renderSustainabilityStars(
                                        production.certificate_percentage || 0
                                      )}
                                    </VStack>
                                  </HStack>

                                  <VStack spacing={2} w="full">
                                    <HStack justify="space-between" w="full">
                                      <ConsumerTooltip
                                        label="Environmental Score"
                                        explanation="Environmental Score rates how sustainable the farming practices are, from 0-100%. It includes factors like organic certification, water usage, soil health, and carbon storage practices. Higher scores mean more environmentally friendly farming."
                                      >
                                        <Text
                                          fontSize="sm"
                                          color="gray.600"
                                          cursor="help"
                                          textDecoration="underline"
                                          textDecorationStyle="dotted"
                                        >
                                          Environmental Score
                                        </Text>
                                      </ConsumerTooltip>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="medium"
                                        color={
                                          !production.certificate_percentage
                                            ? 'gray.400'
                                            : 'gray.700'
                                        }
                                      >
                                        {production.certificate_percentage
                                          ? `${production.certificate_percentage}%`
                                          : 'No data'}
                                      </Text>
                                    </HStack>
                                    <Progress
                                      value={production.certificate_percentage || 0}
                                      size="sm"
                                      colorScheme={transparencyData.color}
                                      borderRadius="full"
                                      w="full"
                                    />
                                  </VStack>
                                </VStack>
                              </HStack>
                            </StandardCard>
                          </NavLink>
                        );
                      })}
                  </VStack>
                </StandardSection>
              </TabPanel>

              {/* Reviews Tab */}
              <TabPanel p={0}>
                <StandardSection
                  title="Sustainability Reviews"
                  description="Your impact-driven feedback on carbon transparency"
                >
                  <VStack spacing={4}>
                    {!reviewsLoading &&
                      reviews?.map((review, index) => (
                        <NavLink
                          key={index}
                          to={`/production/${review.history.id}/`}
                          style={{ width: '100%' }}
                        >
                          <StandardCard variant="outline" padding={6}>
                            <HStack spacing={6} align="start">
                              {review.history.images?.length > 0 && (
                                <Image
                                  src={review.history.images[0]}
                                  w="80px"
                                  h="80px"
                                  borderRadius="lg"
                                  objectFit="cover"
                                  shadow="sm"
                                />
                              )}

                              <VStack align="start" spacing={3} flex={1}>
                                <HStack justify="space-between" w="full">
                                  <VStack align="start" spacing={1}>
                                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                                      {review.headline}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      {typeof review.history.product === 'object'
                                        ? review.history.product?.name || 'Unknown Product'
                                        : review.history.product || 'Unknown Product'}
                                    </Text>
                                    <Text fontSize="xs" color="gray.500">
                                      {review.date && !isNaN(new Date(review.date).getTime())
                                        ? format(new Date(review.date), 'MMMM dd, yyyy')
                                        : 'Date not available'}
                                    </Text>
                                  </VStack>

                                  <VStack align="end" spacing={1}>
                                    {renderSustainabilityStars(review.rating * 20)}
                                    <Badge colorScheme="green" variant="subtle" fontSize="xs">
                                      Sustainability Review
                                    </Badge>
                                  </VStack>
                                </HStack>

                                <Text color="gray.600" fontSize="sm" noOfLines={2}>
                                  {review.written_review}
                                </Text>

                                <HStack spacing={4} fontSize="xs" color="gray.500">
                                  <Text>
                                    Farm:{' '}
                                    {typeof review.history.parcel === 'object'
                                      ? review.history.parcel?.name || 'Unknown'
                                      : review.history.parcel || 'Unknown'}
                                  </Text>
                                  <Text>•</Text>
                                  <Text>Carbon Focus</Text>
                                </HStack>
                              </VStack>
                            </HStack>
                          </StandardCard>
                        </NavLink>
                      ))}
                  </VStack>
                </StandardSection>
              </TabPanel>

              {/* Impact Timeline Tab */}
              <TabPanel p={0}>
                <StandardSection
                  title="Carbon Discovery Timeline"
                  description="Your journey through agricultural transparency"
                >
                  <VStack spacing={6}>
                    <StandardGrid columns={{ base: 1, md: 3 }} spacing={6}>
                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="green.100" color="green.600">
                            <Icon as={MdTimeline} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <StatLabel>Journey Started</StatLabel>
                            <StatNumber color="green.600">{shopStats.totalScans}</StatNumber>
                            <StatHelpText>days ago</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>

                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="blue.100" color="blue.600">
                            <Icon as={MdTrendingUp} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <StatLabel>Current Streak</StatLabel>
                            <StatNumber color="blue.600">
                              {shopStats.sustainableFarmsFound}
                            </StatNumber>
                            <StatHelpText>consecutive days</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>

                      <StandardCard variant="flat" padding={6}>
                        <VStack spacing={3}>
                          <Circle size="50px" bg="teal.100" color="teal.600">
                            <Icon as={MdEco} boxSize={6} />
                          </Circle>
                          <Stat textAlign="center">
                            <ConsumerTooltip
                              label="Carbon Revealed"
                              explanation="Carbon Revealed shows the total amount of CO₂ information you've uncovered by scanning products. Each scan reveals the hidden environmental cost of food production. kg CO₂e means 'kilograms of carbon dioxide equivalent' - the standard way to measure all greenhouse gas emissions."
                            >
                              <StatLabel
                                cursor="help"
                                textDecoration="underline"
                                textDecorationStyle="dotted"
                              >
                                Carbon Revealed
                              </StatLabel>
                            </ConsumerTooltip>
                            <StatNumber color="teal.600">
                              {shopStats.carbonFootprintRevealed}
                            </StatNumber>
                            <StatHelpText>kg CO₂e revealed</StatHelpText>
                          </Stat>
                        </VStack>
                      </StandardCard>
                    </StandardGrid>

                    <StandardAlert
                      status="info"
                      title="Your Shopping Reviews"
                      description="Every scan and review contributes to agricultural transparency. You're helping create a more sustainable food system through informed choices."
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
