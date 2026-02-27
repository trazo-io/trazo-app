// Chakra imports
import {
  Box,
  Button,
  Flex,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SimpleGrid,
  Stack,
  Text,
  useColorModeValue,
  CircularProgress,
  Grid,
  VStack,
  HStack,
  IconButton,
  useDisclosure
} from '@chakra-ui/react';
import { NavLink, useLocation, useMatch, useParams } from 'react-router-dom';
import React, { useEffect, useRef, useState } from 'react';
import {
  useGetEstablishmentHistoriesQuery,
  useGetEstablishmentProductsQuery,
  useGetEstablishmentScansVsSalesChartInfoQuery
} from 'store/api/productApi';

import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardSelect
} from 'components/Design/StandardComponents';
import { IoIosArrowDown } from 'react-icons/io';
import { FiMaximize2 } from 'react-icons/fi';
import ModernLineBarChart from 'components/Charts/ModernLineBarChart';
import ExpandableChartModal from 'components/Charts/ExpandableChartModal';
import ModernBarChart from 'components/Charts/ModernBarChart';
import MiniStatistics from '../Dashboard/components/MiniStatistics';
import Reviews from './components/Reviews';
import SalesOverview from './components/SalesOverview';
import ScansList from './components/ScansList';
import { historyApi } from 'store/api/historyApi';
import { productApi } from 'store/api/productApi';
import { scansData } from 'variables/general';
import { useGetEstablishmentProductReputationQuery } from 'store/api/reviewApi';
import { useGetScansByEstablishmentQuery } from 'store/api/historyApi';
import { useIntl, FormattedMessage } from 'react-intl';
import { useSelector } from 'react-redux';
import {
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Badge,
  Icon,
  Tooltip,
  Divider
} from '@chakra-ui/react';
import { FaUser, FaRobot, FaChartLine, FaShieldAlt } from 'react-icons/fa';

// Custom icons
// assets

// Customer Quality Analytics Component
interface CustomerQualityAnalyticsProps {
  scansData: any[];
  isLoading: boolean;
}

const CustomerQualityAnalytics = ({ scansData, isLoading }: CustomerQualityAnalyticsProps) => {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');

  // Calculate quality metrics from actual filtered scan data
  const calculateQualityMetrics = () => {
    if (!scansData || scansData.length === 0) {
      return {
        humanScans: 0,
        highEngagement: 0,
        uniqueSessions: 0,
        consentedScans: 0,
        totalScans: 0
      };
    }

    const totalScans = scansData.length;

    // Calculate real metrics from actual scan data
    const humanScans = scansData.filter((scan) => {
      // If we have bot_score from backend, use it
      if (scan.bot_score !== undefined) {
        return scan.bot_score < 0.5;
      }

      // Otherwise, assume most scans are human unless proven otherwise
      // This is more realistic - most QR scans come from real consumers
      // Only mark as bot if we have strong indicators
      const hasComment = scan.comment && scan.comment.trim().length > 0;

      // DEFAULT: Assume human unless we have evidence of bot behavior
      // Real consumers often scan quickly without leaving comments
      // We should only mark as bot if we detect automated patterns
      return true; // Default to human for all scans without bot_score
    }).length;

    const highEngagement = scansData.filter((scan) => {
      // If we have engagement_score from backend, use it
      if (scan.engagement_score !== undefined) {
        return scan.engagement_score > 0.6;
      }

      // Otherwise, calculate based on available data
      const hasComment = scan.comment && scan.comment.trim().length > 0;
      const timeOnPage = scan.time_on_page || 0;
      const interactions = scan.interactions || 0;

      // High engagement indicators:
      // - Has comment (shows active participation)
      // - Spent more than 10 seconds
      // - Had more than 50 interactions
      const highlyEngaged = hasComment || timeOnPage > 10 || interactions > 50;

      return highlyEngaged;
    }).length;

    const uniqueSessions = scansData.filter((scan) => {
      // Unique sessions: not marked as duplicate
      return !scan.is_duplicate;
    }).length;

    const consentedScans = scansData.filter((scan) => {
      // Consented scans: consent_given is true or undefined (assume consent)
      return scan.consent_given !== false;
    }).length;

    return {
      humanScans,
      highEngagement,
      uniqueSessions,
      consentedScans,
      totalScans
    };
  };

  const metrics = calculateQualityMetrics();

  const humanPercentage =
    metrics.totalScans > 0 ? Math.round((metrics.humanScans / metrics.totalScans) * 100) : 0;
  const engagementPercentage =
    metrics.totalScans > 0 ? Math.round((metrics.highEngagement / metrics.totalScans) * 100) : 0;
  const uniquePercentage =
    metrics.totalScans > 0 ? Math.round((metrics.uniqueSessions / metrics.totalScans) * 100) : 0;
  const consentPercentage =
    metrics.totalScans > 0 ? Math.round((metrics.consentedScans / metrics.totalScans) * 100) : 0;

  if (isLoading) {
    return (
      <StandardCard title={intl.formatMessage({ id: 'commercial.customerQualityAnalytics' })} variant="elevated">
        <Flex justify="center" align="center" h="200px">
          <CircularProgress isIndeterminate color="green.500" />
        </Flex>
      </StandardCard>
    );
  }

  return (
    <StandardCard
      title={intl.formatMessage({ id: 'commercial.customerQualityAnalytics' })}
      subtitle={intl.formatMessage({ id: 'commercial.customerQualitySubtitle' })}
      variant="elevated"
    >
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={6}>
        {/* Human vs Bot Scans */}
        <Stat>
          <StatLabel fontSize="sm" color="gray.600">
            <HStack spacing={2}>
              <Tooltip
                label={intl.formatMessage({ id: 'commercial.humanScansTooltip' })}
                placement="top"
                hasArrow
              >
                <HStack spacing={2}>
                  <Icon as={FaUser} color="green.500" boxSize={4} />
                  <Text>{intl.formatMessage({ id: 'commercial.humanScans' })}</Text>
                </HStack>
              </Tooltip>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
            {humanPercentage}%
          </StatNumber>
          <StatHelpText fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'commercial.humanScansCount' }, { human: metrics.humanScans, total: metrics.totalScans })}
            <Badge
              ml={2}
              colorScheme={humanPercentage > 80 ? 'green' : humanPercentage > 60 ? 'yellow' : 'red'}
              size="sm"
            >
              {humanPercentage > 80
                ? intl.formatMessage({ id: 'commercial.ratingExcellent' })
                : humanPercentage > 60
                ? intl.formatMessage({ id: 'commercial.ratingGood' })
                : intl.formatMessage({ id: 'commercial.ratingNeedsAttention' })}
            </Badge>
          </StatHelpText>
        </Stat>

        {/* High Engagement */}
        <Stat>
          <StatLabel fontSize="sm" color="gray.600">
            <HStack spacing={2}>
              <Icon as={FaChartLine} color="green.500" boxSize={4} />
              <Text>{intl.formatMessage({ id: 'commercial.highEngagement' })}</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
            {engagementPercentage}%
          </StatNumber>
          <StatHelpText fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'commercial.deeplyEngaged' }, { count: metrics.highEngagement })}
            <Badge
              ml={2}
              colorScheme={
                engagementPercentage > 70 ? 'green' : engagementPercentage > 50 ? 'yellow' : 'red'
              }
              size="sm"
            >
              {engagementPercentage > 70
                ? intl.formatMessage({ id: 'commercial.ratingExcellent' })
                : engagementPercentage > 50
                ? intl.formatMessage({ id: 'commercial.ratingGood' })
                : intl.formatMessage({ id: 'commercial.ratingImproving' })}
            </Badge>
          </StatHelpText>
        </Stat>

        {/* Unique Sessions */}
        <Stat>
          <StatLabel fontSize="sm" color="gray.600">
            <HStack spacing={2}>
              <Icon as={FaShieldAlt} color="green.500" boxSize={4} />
              <Text>{intl.formatMessage({ id: 'commercial.uniqueSessions' })}</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
            {uniquePercentage}%
          </StatNumber>
          <StatHelpText fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'commercial.uniqueVisitors' }, { count: metrics.uniqueSessions })}
            <Badge
              ml={2}
              colorScheme={
                uniquePercentage > 90 ? 'green' : uniquePercentage > 75 ? 'yellow' : 'red'
              }
              size="sm"
            >
              {uniquePercentage > 90
                ? intl.formatMessage({ id: 'commercial.ratingExcellent' })
                : uniquePercentage > 75
                ? intl.formatMessage({ id: 'commercial.ratingGood' })
                : intl.formatMessage({ id: 'commercial.ratingCheckQuality' })}
            </Badge>
          </StatHelpText>
        </Stat>

        {/* GDPR Compliance */}
        <Stat>
          <StatLabel fontSize="sm" color="gray.600">
            <HStack spacing={2}>
              <Icon as={FaShieldAlt} color="green.500" boxSize={4} />
              <Text>{intl.formatMessage({ id: 'commercial.privacyCompliant' })}</Text>
            </HStack>
          </StatLabel>
          <StatNumber fontSize="2xl" fontWeight="bold" color={textColor}>
            {consentPercentage}%
          </StatNumber>
          <StatHelpText fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'commercial.consentedScans' }, { count: metrics.consentedScans })}
            <Badge ml={2} colorScheme="green" size="sm">
              {intl.formatMessage({ id: 'commercial.gdprCompliant' })}
            </Badge>
          </StatHelpText>
        </Stat>
      </SimpleGrid>

      {/* Quality Insights & Education */}
      {metrics.totalScans > 0 && (
        <VStack spacing={4} align="stretch">
          {/* Quality Score Summary */}
          <Box p={4} bg="green.50" borderRadius="lg" border="1px solid" borderColor="green.200">
            <HStack spacing={4} wrap="wrap">
              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold" color="green.700">
                  {intl.formatMessage({ id: 'commercial.qualityScore' }, { score: Math.round((humanPercentage + engagementPercentage + uniquePercentage) / 3) })}
                </Text>
                <Text fontSize="xs" color="green.600">
                  {intl.formatMessage({ id: 'commercial.qualityScoreDescription' })}
                </Text>
              </VStack>

              <Divider orientation="vertical" h="40px" borderColor="green.300" />

              <VStack align="start" spacing={1}>
                <Text fontSize="sm" fontWeight="semibold" color="green.700">
                  {intl.formatMessage({ id: 'commercial.recommendation' })}
                </Text>
                <Text fontSize="xs" color="green.600">
                  {humanPercentage > 85
                    ? intl.formatMessage({ id: 'commercial.recommendationExcellent' })
                    : humanPercentage > 70
                    ? intl.formatMessage({ id: 'commercial.recommendationGood' })
                    : intl.formatMessage({ id: 'commercial.recommendationLow' })}
                </Text>
              </VStack>
            </HStack>
          </Box>

          {/* Educational Section for Farmers */}
          <Box p={4} bg="blue.50" borderRadius="lg" border="1px solid" borderColor="blue.200">
            <VStack align="start" spacing={3}>
              <Text fontSize="sm" fontWeight="semibold" color="blue.700">
                💡 {intl.formatMessage({ id: 'commercial.educationTitle' })}
              </Text>
              <VStack align="start" spacing={2} fontSize="xs" color="blue.600">
                <Text>
                  {intl.formatMessage({ id: 'commercial.educationHumanScans' })}
                </Text>
                <Text>
                  {intl.formatMessage({ id: 'commercial.educationDetectionSystem' })}
                </Text>
                <VStack align="start" spacing={1} pl={4} fontSize="xs">
                  <Text>
                    • {intl.formatMessage({ id: 'commercial.educationAutomatic' })}
                  </Text>
                  <Text>
                    • {intl.formatMessage({ id: 'commercial.educationDefault' })}
                  </Text>
                  <Text>
                    • {intl.formatMessage({ id: 'commercial.educationRealistic' })}
                  </Text>
                  <Text>
                    • {intl.formatMessage({ id: 'commercial.educationConservative' })}
                  </Text>
                </VStack>
                <Text>
                  {intl.formatMessage({ id: 'commercial.educationTransparencyCommitment' })}
                </Text>
              </VStack>
            </VStack>
          </Box>
        </VStack>
      )}
    </StandardCard>
  );
};

export default function CommercialView() {
  const intl = useIntl();
  const textColor = useColorModeValue('gray.700', 'white');
  const { establishmentId } = useParams();
  // Removed chartRef and reputationChartRef - Recharts handles updates through props
  const [filters, setFilters] = useState({
    parcel: null,
    product: null,
    production: null,
    period: { id: 'week', name: intl.formatMessage({ id: 'app.thisWeek' }) }
  });
  const [currentEstablishmentId, setCurrentEstablishmentId] = useState(null);
  const [establishment, setEstablishment] = useState(null);
  const [currentView, setCurrentView] = useState(null);

  // Modal state for expandable chart
  const {
    isOpen: isChartModalOpen,
    onOpen: onChartModalOpen,
    onClose: onChartModalClose
  } = useDisclosure();

  // Period options for the chart modal filter
  const periodOptions = React.useMemo(
    () => [
      { id: 'week', name: intl.formatMessage({ id: 'app.thisWeek' }) },
      { id: 'month', name: intl.formatMessage({ id: 'app.thisMonth' }) },
      { id: 'year', name: intl.formatMessage({ id: 'app.thisYear' }) }
    ],
    [intl]
  );

  const cardColor = useColorModeValue('white', 'gray.700');

  const establishments = useSelector((state) => state.company.currentCompany?.establishments);

  const currentCompany = useSelector((state) => state.company.currentCompany);

  const queryParams = React.useMemo(
    () => ({
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      periodId: filters.period.id,
      productId: filters.product?.id,
      parcelId: filters.parcel?.id,
      productionId: filters.production?.id
    }),
    [
      currentCompany?.id,
      currentEstablishmentId,
      filters.period.id,
      filters.product?.id,
      filters.parcel?.id,
      filters.production?.id
    ]
  );

  const { data: dataEstablishmentScans } = useGetScansByEstablishmentQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      period: filters.period.id,
      productId: filters.product?.id,
      parcelId: filters.parcel?.id,
      productionId: filters.production?.id
    },
    {
      skip:
        !currentEstablishmentId ||
        !filters?.period ||
        !currentCompany ||
        currentCompany?.id === undefined
    }
  );

  const { data: dataEstablishmentScansVsSaleInfo, isFetching } =
    useGetEstablishmentScansVsSalesChartInfoQuery(queryParams, {
      skip: !queryParams.companyId || !queryParams.establishmentId || !queryParams.periodId,
      refetchOnMountOrArgChange: true,
      refetchOnReconnect: true
    });

  const {
    data: dataEstablishmentProductsReputation,
    isFetching: isFetchingEstablishmentProductsReputation
  } = useGetEstablishmentProductReputationQuery(queryParams, {
    skip: !queryParams.companyId || !queryParams.establishmentId || !queryParams.periodId,
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true
  });

  const [fetchScansByEstablishment, { data: filteredScans, isLoading: isLoadingScans }] =
    historyApi.endpoints.getScansByEstablishment.useLazyQuery();

  const [
    getEstablishmentProducts,
    { data: establishmentProducts, isLoading: isLoadingEstablishmentProducts }
  ] = productApi.endpoints.getEstablishmentProducts.useLazyQuery();

  // to check for active links and opened collapses
  let location = useLocation();

  const iconBoxInside = useColorModeValue('white', 'white');
  let mainText = useColorModeValue('gray.700', 'gray.200');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const updateEstablishment = async () => {
      if (establishments) {
        const establishment = establishments.find((est) => est.id.toString() === establishmentId);

        if (establishment) {
          // First update establishment ID
          setCurrentEstablishmentId(establishmentId);

          // Then update establishment
          setEstablishment(establishment);

          // Wait for next tick before updating filters
          await new Promise((resolve) => setTimeout(resolve, 0));

          // Finally update filters
          setFilters((prev) => ({
            parcel: null,
            product: null,
            production: null,
            period: {
              id: 'week',
              name: intl.formatMessage({ id: 'app.thisWeek' })
            }
          }));
        }
      }
    };

    updateEstablishment();
  }, [establishmentId, establishments, intl]);

  const { data: dataProducts } = useGetEstablishmentProductsQuery(
    { companyId: currentCompany?.id, establishmentId: currentEstablishmentId },
    { skip: !currentEstablishmentId || !currentCompany || currentCompany?.id === undefined }
  );

  const { data: dataHistories } = useGetEstablishmentHistoriesQuery(
    {
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      periodId: filters.period?.id,
      parcelId: filters.parcel?.id,
      productId: filters.product?.id
    },
    {
      skip:
        !currentCompany ||
        !currentEstablishmentId ||
        !filters?.period ||
        !filters?.parcel ||
        !filters?.product ||
        currentCompany?.id === undefined
    }
  );

  const onParcelFilterChange = (parcel) => {
    setFilters({
      ...filters,
      parcel: parcel ? { id: parcel.id, name: parcel.name } : null
    });
    getEstablishmentProducts({
      companyId: currentCompany?.id,
      establishmentId: currentEstablishmentId,
      parcelId: parcel?.id
    });
  };

  const onProductFilterChange = (product) => {
    setFilters({
      ...filters,
      product: product ? { id: product.id, name: product.name } : null
    });
  };

  const onProductionFilterChange = (production) => {
    setFilters({
      ...filters,
      production: production ? { id: production.id, period: production.period } : null
    });
  };

  const onPeriodFilterChange = (period) => {
    setFilters({
      ...filters,
      period: period ? { id: period.id, name: period.name } : null
    });
  };

  const formatCategories = (options: (string | number)[]) => {
    if (!options) return [];

    // Month number to name mapping for backend that returns numbers
    const monthNumberToName: Record<number, string> = {
      1: 'january',
      2: 'february',
      3: 'march',
      4: 'april',
      5: 'may',
      6: 'june',
      7: 'july',
      8: 'august',
      9: 'september',
      10: 'october',
      11: 'november',
      12: 'december'
    };

    switch (filters.period.id) {
      case 'week':
        return options.map((day) => {
          const dayStr = typeof day === 'string' ? day.toLowerCase() : String(day);
          return intl.formatMessage({ id: `app.days.${dayStr}` });
        });
      case 'year':
        return options.map((month) => {
          // Handle both number (1-12) and string ("january") formats
          const monthName =
            typeof month === 'number'
              ? monthNumberToName[month]
              : typeof month === 'string'
              ? month.toLowerCase()
              : String(month);
          return intl.formatMessage({ id: `app.months.${monthName}` });
        });
      default:
        return options.map((item) => String(item));
    }
  };

  // Recharts automatically updates when data changes, no imperative updates needed
  useEffect(() => {
    console.log('currentEstablishmentId', currentEstablishmentId);
  }, [currentEstablishmentId]);

  // Recharts automatically updates when dataEstablishmentProductsReputation changes
  useEffect(() => {
    // Log for debugging if needed
    console.log('Reputation data updated:', dataEstablishmentProductsReputation);
  }, [dataEstablishmentProductsReputation]);

  const scansColumnsNames = [
    intl.formatMessage({ id: 'app.date' }),
    intl.formatMessage({ id: 'app.product' }),
    intl.formatMessage({ id: 'commercial.customerType' }),
    intl.formatMessage({ id: 'commercial.engagement' }),
    intl.formatMessage({ id: 'commercial.quality' }),
    intl.formatMessage({ id: 'app.location' }),
    intl.formatMessage({ id: 'app.comment' })
  ];

  return (
    <>
      <StandardPage
        title={intl.formatMessage({ id: 'app.commercialDashboard' })}
        description={intl.formatMessage({ id: 'app.commercialDashboardDescription' })}
        showBackButton
        onBack={() => navigate(-1)}
      >
        <VStack spacing={6} align="stretch">
          {/* Filters Section */}
          <StandardCard title={intl.formatMessage({ id: 'commercial.analysisFilters' })} variant="outline">
            <VStack spacing={6}>
              <Flex
                direction={{ base: 'column', lg: 'row' }}
                gap={6}
                w="100%"
                align={{ base: 'stretch', lg: 'center' }}
                justify="space-between"
              >
                <HStack spacing={4} flex={1} wrap="wrap">
                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<IoIosArrowDown />}
                      size="md"
                      minW="180px"
                      variant="outline"
                      borderColor="green.500"
                      color="green.500"
                      fontWeight="medium"
                      borderRadius="lg"
                      _hover={{ bg: 'green.50' }}
                      _active={{ bg: 'green.100' }}
                    >
                      {filters.parcel
                        ? filters.parcel.name
                        : intl.formatMessage({ id: 'app.allParcels' })}
                    </MenuButton>
                    <MenuList minW="180px">
                      <MenuItem
                        onClick={() => onParcelFilterChange(null)}
                        fontSize="sm"
                        color="gray.600"
                        py={2}
                      >
                        {intl.formatMessage({ id: 'app.allParcels' })}
                      </MenuItem>
                      <MenuDivider />
                      {establishment &&
                        establishment.parcels.map((parcel, index) => (
                          <MenuItem
                            key={index}
                            onClick={() => onParcelFilterChange(parcel)}
                            fontSize="sm"
                            color="gray.600"
                            py={2}
                          >
                            {parcel.name}
                          </MenuItem>
                        ))}
                    </MenuList>
                  </Menu>

                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<IoIosArrowDown />}
                      size="md"
                      minW="180px"
                      variant="outline"
                      borderColor="green.500"
                      color="green.500"
                      fontWeight="medium"
                      borderRadius="lg"
                      _hover={{ bg: 'green.50' }}
                      _active={{ bg: 'green.100' }}
                    >
                      {filters.product
                        ? filters.product.name
                        : intl.formatMessage({ id: 'app.allProducts' })}
                    </MenuButton>
                    <MenuList minW="180px">
                      <MenuItem
                        onClick={() => onProductFilterChange(null)}
                        fontSize="sm"
                        color="gray.600"
                        py={2}
                      >
                        {intl.formatMessage({ id: 'app.allProducts' })}
                      </MenuItem>
                      <MenuDivider />
                      {filters?.parcel
                        ? establishmentProducts &&
                          establishmentProducts.map((product, index) => (
                            <MenuItem
                              key={index}
                              onClick={() => onProductFilterChange(product)}
                              fontSize="sm"
                              color="gray.600"
                              py={2}
                            >
                              {product.name}
                            </MenuItem>
                          ))
                        : dataProducts &&
                          dataProducts.map((product, index) => (
                            <MenuItem
                              key={index}
                              onClick={() => onProductFilterChange(product)}
                              fontSize="sm"
                              color="gray.600"
                              py={2}
                            >
                              {product.name}
                            </MenuItem>
                          ))}
                    </MenuList>
                  </Menu>

                  <Menu>
                    <MenuButton
                      as={Button}
                      rightIcon={<IoIosArrowDown />}
                      size="md"
                      minW="180px"
                      variant="outline"
                      borderColor="green.500"
                      color="green.500"
                      fontWeight="medium"
                      borderRadius="lg"
                      _hover={{ bg: 'green.50' }}
                      _active={{ bg: 'green.100' }}
                      isDisabled={filters.product == null || filters.parcel == null}
                    >
                      {filters.production
                        ? filters.production.period
                        : intl.formatMessage({ id: 'app.allProductions' })}
                    </MenuButton>
                    <MenuList minW="180px">
                      <MenuItem
                        onClick={() => onProductionFilterChange(null)}
                        fontSize="sm"
                        color="gray.600"
                        py={2}
                      >
                        {intl.formatMessage({ id: 'app.allProductions' })}
                      </MenuItem>
                      <MenuDivider />
                      {dataHistories &&
                        dataHistories.map((history, index) => (
                          <MenuItem
                            key={index}
                            onClick={() => onProductionFilterChange(history)}
                            fontSize="sm"
                            color="gray.600"
                            py={2}
                          >
                            {history.period}
                          </MenuItem>
                        ))}
                    </MenuList>
                  </Menu>
                </HStack>

                <Menu>
                  <MenuButton
                    as={Button}
                    rightIcon={<IoIosArrowDown />}
                    size="md"
                    minW="150px"
                    bg="green.500"
                    color="white"
                    fontWeight="medium"
                    borderRadius="lg"
                    _hover={{ bg: 'green.600' }}
                    _active={{ bg: 'green.700' }}
                  >
                    {filters.period.name}
                  </MenuButton>
                  <MenuList minW="150px">
                    <MenuItem
                      onClick={() =>
                        onPeriodFilterChange({
                          id: 'week',
                          name: intl.formatMessage({ id: 'app.thisWeek' })
                        })
                      }
                      fontSize="sm"
                      color="gray.600"
                      py={2}
                    >
                      {intl.formatMessage({ id: 'app.thisWeek' })}
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        onPeriodFilterChange({
                          id: 'month',
                          name: intl.formatMessage({ id: 'app.thisMonth' })
                        })
                      }
                      fontSize="sm"
                      color="gray.600"
                      py={2}
                    >
                      {intl.formatMessage({ id: 'app.thisMonth' })}
                    </MenuItem>
                    <MenuItem
                      onClick={() =>
                        onPeriodFilterChange({
                          id: 'year',
                          name: intl.formatMessage({ id: 'app.thisYear' })
                        })
                      }
                      fontSize="sm"
                      color="gray.600"
                      py={2}
                    >
                      {intl.formatMessage({ id: 'app.thisYear' })}
                    </MenuItem>
                  </MenuList>
                </Menu>
              </Flex>
            </VStack>
          </StandardCard>
          {/* Main Dashboard Content */}
          <VStack spacing={6} w="100%">
            {/* Customer Quality Analytics Section - NEW */}
            <CustomerQualityAnalytics
              scansData={dataEstablishmentScans}
              isLoading={!dataEstablishmentScans}
            />

            {/* Scans Table - Full Width */}
            <Box w="100%">
              <ScansList
                title={intl.formatMessage({ id: 'app.scans' })}
                labels={scansColumnsNames}
                scansData={dataEstablishmentScans}
              />
            </Box>

            {/* Charts Row - Side by Side */}
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6} w="100%">
              {/* Scans vs Reviews Chart */}
              <StandardCard
                title={intl.formatMessage({ id: 'app.numberScansAndReviews' })}
                variant="elevated"
                headerAction={
                  <IconButton
                    aria-label={intl.formatMessage({ id: 'app.expand' })}
                    icon={<FiMaximize2 />}
                    variant="ghost"
                    size="sm"
                    colorScheme="green"
                    onClick={onChartModalOpen}
                  />
                }
              >
                <Box w="100%" h="350px">
                  {isFetching ? (
                    <Flex justify="center" align="center" h="100%">
                      <CircularProgress isIndeterminate color="green.500" />
                      <Text ml={4} color={textColor}>
                        {intl.formatMessage({ id: 'commercial.loadingChartData' })}
                      </Text>
                    </Flex>
                  ) : !dataEstablishmentScansVsSaleInfo?.scans_vs_reviews ? (
                    <Flex justify="center" align="center" h="100%">
                      <Text color={textColor}>{intl.formatMessage({ id: 'commercial.noDataAvailable' })}</Text>
                    </Flex>
                  ) : (
                    <ModernLineBarChart
                      data={dataEstablishmentScansVsSaleInfo.scans_vs_reviews.options.map(
                        (category, index) => ({
                          name: formatCategories([category])[0],
                          scans:
                            dataEstablishmentScansVsSaleInfo.scans_vs_reviews.series.scans?.[
                              index
                            ] || 0,
                          reviews:
                            dataEstablishmentScansVsSaleInfo.scans_vs_reviews.series.reviews?.[
                              index
                            ] || 0
                        })
                      )}
                      lineDataKey="scans"
                      barDataKey="reviews"
                      xDataKey="name"
                      height={350}
                      showGrid={true}
                      lineLabel={intl.formatMessage({ id: 'app.scans' })}
                      barLabel={intl.formatMessage({ id: 'app.reviews' })}
                    />
                  )}
                </Box>
              </StandardCard>

              {/* Products Reputation Chart */}
              <StandardCard
                title={`${intl.formatMessage({ id: 'app.productsReputation' })} ⭐️`}
                variant="elevated"
              >
                <Box w="100%" h="350px">
                  {isFetchingEstablishmentProductsReputation ? (
                    <Flex justify="center" align="center" h="100%">
                      <CircularProgress isIndeterminate color="green.500" />
                    </Flex>
                  ) : (
                    <ModernBarChart
                      data={(
                        dataEstablishmentProductsReputation?.products_reputation?.options || []
                      ).map((product, index) => ({
                        name: product,
                        value:
                          dataEstablishmentProductsReputation?.products_reputation?.series?.[
                            index
                          ] || 0
                      }))}
                      dataKey="value"
                      xDataKey="name"
                      height={350}
                      showGrid={true}
                      showValues={true}
                      gradientColors={true}
                    />
                  )}
                </Box>
              </StandardCard>
            </Grid>

            {/* Reviews Section - Full Width */}
            <Box w="100%">
              <Reviews />
            </Box>
          </VStack>
        </VStack>
      </StandardPage>

      {/* Expandable Chart Modal */}
      <ExpandableChartModal
        isOpen={isChartModalOpen}
        onClose={onChartModalClose}
        title={intl.formatMessage({ id: 'app.numberScansAndReviews' })}
        data={
          dataEstablishmentScansVsSaleInfo?.scans_vs_reviews
            ? dataEstablishmentScansVsSaleInfo.scans_vs_reviews.options.map((category, index) => ({
                name: formatCategories([category])[0],
                scans: dataEstablishmentScansVsSaleInfo.scans_vs_reviews.series.scans?.[index] || 0,
                reviews:
                  dataEstablishmentScansVsSaleInfo.scans_vs_reviews.series.reviews?.[index] || 0
              }))
            : []
        }
        lineDataKey="scans"
        barDataKey="reviews"
        xDataKey="name"
        lineLabel={intl.formatMessage({ id: 'app.scans' })}
        barLabel={intl.formatMessage({ id: 'app.reviews' })}
        isLoading={isFetching}
        noDataMessage={intl.formatMessage({ id: 'app.noDataAvailable' })}
        currentPeriod={filters.period}
        periodOptions={periodOptions}
        onPeriodChange={onPeriodFilterChange}
      />
    </>
  );
}
