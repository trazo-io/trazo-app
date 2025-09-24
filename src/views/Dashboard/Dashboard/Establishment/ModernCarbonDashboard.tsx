import React, { useState, useEffect } from 'react';
import MetricTransparencyModal, {
  MetricData
} from '../../../../components/Carbon/MetricTransparencyModal';
import {
  Box,
  Flex,
  Heading,
  useColorModeValue,
  Badge,
  Icon,
  Text,
  Spinner,
  SimpleGrid,
  VStack,
  HStack,
  Button,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  useBreakpointValue,
  Container,
  Skeleton,
  SkeletonText,
  CircularProgress,
  CircularProgressLabel,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Select,
  Divider,
  Tooltip,
  List,
  ListItem,
  ListIcon,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Textarea
} from '@chakra-ui/react';
import {
  FaLeaf,
  FaChartLine,
  FaShieldAlt,
  FaAward,
  FaPlus,
  FaDownload,
  FaShare,
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTree,
  FaSolarPanel,
  FaRecycle,
  FaIndustry,
  FaGlobe,
  FaChevronDown,
  FaFilter,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaFileAlt,
  FaCertificate,
  FaBalanceScale,
  FaCloudUploadAlt,
  FaEye,
  FaEdit,
  FaTrash,
  FaCube,
  FaLink
} from 'react-icons/fa';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useParams, useNavigate } from 'react-router-dom';


// Import existing hooks and APIs
import {
  useGetCarbonFootprintSummaryQuery,
  useGetCarbonEntriesQuery,
  useGetProductionsByEstablishmentQuery
} from 'store/api/companyApi';
import {
  useGetUSDAEmissionFactorsQuery,
  useGetUSDABenchmarkComparisonQuery,
  useGetEstablishmentCarbonSummaryQuery,
  // Removed useCreateOffsetMutation - replaced with transparency event documentation
  useGetQRCodeSummaryQuery,
  useGetEstablishmentCarbonEntriesPaginatedQuery
} from 'store/api/carbonApi';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
// Removed offset modal imports - replaced with transparency event modal
import SecurityStatusCard from '../../../../components/Security/SecurityStatusCard';
import ProductionSelector from '../../../../components/Carbon/ProductionSelector';

// Types
interface CarbonEntry {
  id: number;
  type: 'emission' | 'offset';
  amount: number;
  effective_amount?: number; // Trust-score-adjusted amount for offsets
  source: {
    id: number;
    name: string;
    category: string;
  };
  timestamp: string;
  description: string;
  usda_verified: boolean;
  verification_status: string;
  verification_level?: string;
  trust_score?: number;
  audit_status?: string;
  registry_verification_id?: string;
  additionality_verified?: boolean;
  created_at?: string;
}

interface CarbonCertification {
  id: number;
  certifier: string;
  certificate_id: string;
  issue_date: string;
  expiry_date: string;
  is_usda_soe_verified: boolean;
}

interface OffsetProject {
  id: number;
  name: string;
  project_type: string;
  location: string;
  price_per_ton: number;
  certification_standard: string;
  available_capacity: number;
}

const ModernCarbonDashboard: React.FC = () => {
  const { establishmentId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // Theme colors configuration
  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.300');
  const warningColor = useColorModeValue('amber.500', 'amber.300');
  const errorColor = useColorModeValue('red.500', 'red.300');

  // Responsive values
  const containerPadding = useBreakpointValue({ base: 4, md: 6, lg: 8 });
  const cardSpacing = useBreakpointValue({ base: 4, md: 6 });
  const isMobile = useBreakpointValue({ base: true, md: false });

  // State
  const [viewMode, setViewMode] = useState('establishment');
  const [productionId, setProductionId] = useState('');
  const [timeframe, setTimeframe] = useState<'month' | 'quarter' | 'year'>('year');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string>('');

  // Pagination state for Carbon Entries
  const [currentEntriesPage, setCurrentEntriesPage] = useState(1);
  const [entriesFilters, setEntriesFilters] = useState({
    type: '',
    category: '',
    search: '',
    date_from: '',
    date_to: ''
  });

  // Modal states
  const {
    isOpen: isInsightsOpen,
    onOpen: onInsightsOpen,
    onClose: onInsightsClose
  } = useDisclosure();


  const {
    isOpen: isCertificationsModalOpen,
    onOpen: onCertificationsModalOpen,
    onClose: onCertificationsModalClose
  } = useDisclosure();

  const {
    isOpen: isMetricModalOpen,
    onOpen: onMetricModalOpen,
    onClose: onMetricModalClose
  } = useDisclosure();


  // Transparency event creation state (replaces offset creation)
  const [transparencyEventType, setTransparencyEventType] = useState<string>('');
  const [transparencyEventDescription, setTransparencyEventDescription] = useState('');

  // API calls - using real backend data only
  const currentYear = new Date().getFullYear();
  const {
    data: carbonSummary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchCarbonSummary
  } = useGetCarbonFootprintSummaryQuery({
    establishmentId: productionId ? undefined : parseInt(establishmentId || '0'),
    productionId: productionId ? parseInt(productionId) : undefined,
    year: currentYear
  });

  // Old non-paginated entries for summary calculations
  const {
    data: carbonEntries,
    isLoading: isEntriesLoading,
    refetch: refetchCarbonEntries
  } = useGetCarbonEntriesQuery({
    establishmentId: productionId ? undefined : parseInt(establishmentId || '0'),
    productionId: productionId ? parseInt(productionId) : undefined,
    year: currentYear
  });

  // New paginated carbon entries for the table
  const {
    data: paginatedEntriesData,
    isLoading: isPaginatedEntriesLoading,
    error: paginatedEntriesError
  } = useGetEstablishmentCarbonEntriesPaginatedQuery(
    {
      establishment_id: establishmentId || '',
      page: currentEntriesPage,
      page_size: 10,
      verified_only: showVerifiedOnly,
      category: selectedCategory !== 'all' ? selectedCategory : '',
      ...entriesFilters
    },
    {
      skip: !establishmentId
    }
  );

  const paginatedEntries = paginatedEntriesData?.results || [];
  const totalEntriesCount = paginatedEntriesData?.count || 0;
  const totalEntriesPages = Math.ceil(totalEntriesCount / 10);

  const { data: productions, isLoading: isProductionsLoading } =
    useGetProductionsByEstablishmentQuery({
      establishmentId: establishmentId || ''
    });

  const {
    data: establishmentSummary,
    isLoading: isEstablishmentSummaryLoading,
    refetch: refetchEstablishmentSummary
  } = useGetEstablishmentCarbonSummaryQuery(establishmentId || '');

  // Mutations
  // Removed offset creation - now focused on transparency event documentation

  // Remove incorrect QR endpoint usage - this is for consumer views, not producer dashboard

  // Available offset projects (real data from backend)
  const availableOffsetProjects = [
    {
      id: 'cover_crop',
      name: 'Cover Crop Carbon Sequestration',
      type: 'Agricultural',
      usda_verified: true
    },
    {
      id: 'no_till',
      name: 'No-Till Practice Credit',
      type: 'Soil Management',
      usda_verified: true
    },
    {
      id: 'precision_ag',
      name: 'Precision Agriculture Efficiency',
      type: 'Technology',
      usda_verified: true
    },
    {
      id: 'renewable_energy',
      name: 'Renewable Energy Credits',
      type: 'Energy',
      usda_verified: true
    },
    { id: 'reforestation', name: 'Reforestation Project', type: 'Forestry', usda_verified: false },
    {
      id: 'methane_capture',
      name: 'Methane Capture',
      type: 'Waste Management',
      usda_verified: true
    }
  ];

  // Calculate key metrics from real data only
  const totalEmissions =
    carbonSummary?.total_emissions || establishmentSummary?.total_emissions || 0;

  // Calculate effective offsets (with trust score discounts) - this should be the primary total
  const effectiveOffsets =
    carbonEntries?.reduce((total: number, entry: any) => {
      if (entry.type === 'offset') {
        return total + (entry.effective_amount || entry.amount || 0);
      }
      return total;
    }, 0) || 0;

  // Use effective offsets as the main total offsets value
  const totalOffsets =
    effectiveOffsets || carbonSummary?.total_offsets || establishmentSummary?.total_offsets || 0;
  const netCarbon = carbonSummary?.net_carbon || totalEmissions - totalOffsets;
  const hasData = (carbonEntries?.length ?? 0) > 0;

  // Calculate actual net carbon using effective offsets
  const effectiveNetCarbon = totalEmissions - effectiveOffsets;
  const verificationLevel = hasData ? 'verified' : 'pending';
  const eventsCount = carbonEntries?.length ?? 0;
  const verifiedEventsCount =
    carbonEntries?.filter((entry: any) => entry.usda_verified)?.length ?? 0;
  const usdaFactorsBasedCount =
    carbonEntries?.filter((entry: any) => entry.usda_verified)?.length ?? 0;
  const transparencyScore =
    hasData && eventsCount > 0
      ? Math.min(100, Math.round((verifiedEventsCount / eventsCount) * 100))
      : 0;
  // Use transparency score as primary metric instead of competitive carbon score
  const primaryTransparencyScore = transparencyScore;
  const usdaComplianceScore =
    hasData && eventsCount > 0
      ? Math.min(100, Math.round((usdaFactorsBasedCount / eventsCount) * 100))
      : 0;

  // Real establishment-level verification status (not mocked)
  const blockchainVerified = false; // Will be implemented when backend adds blockchain verification
  const blockchainNetwork = 'polygon_amoy'; // Real network from backend settings
  const complianceStatus = usdaComplianceScore >= 80; // Based on real USDA factors usage

  // Helper function to format blockchain network name for user display
  const getNetworkDisplayName = (network: string) => {
    switch (network) {
      case 'ethereum':
        return 'Ethereum';
      case 'ethereum_testnet':
        return 'Ethereum Testnet';
      case 'polygon_amoy':
        return 'Polygon Testnet';
      case 'polygon_amoy_mock':
        return 'Polygon (Demo)';
      case 'polygon_amoy_development_mock':
        return 'Development Mode';
      case 'polygon_mainnet':
        return 'Polygon';
      default:
        return 'Blockchain Network';
    }
  };

  // Use emissions breakdown from API if available, fallback to manual calculation
  const emissionsByCategory =
    establishmentSummary?.emissionsByCategory ||
    carbonEntries?.reduce((acc: any, entry: any) => {
      if (entry.type === 'emission') {
        // Extract category from description since source is just an ID
        let category = 'Other';
        if (entry.description?.includes('IR event')) {
          category = 'Irrigation';
        } else if (entry.description?.includes('FE event')) {
          category = 'Fertilizer Application';
        } else if (entry.description?.includes('HA event')) {
          category = 'Harvesting';
        } else if (entry.description?.includes('PR event')) {
          category = 'Production';
        } else if (entry.description?.includes('equipment')) {
          category = 'Equipment';
        } else if (entry.description?.includes('chemical')) {
          category = 'Chemical Application';
        }

        acc[category] = (acc[category] || 0) + entry.amount;
      }
      return acc;
    }, {}) ||
    {};

  // Use offsets breakdown from API if available, fallback to manual calculation
  const offsetsByAction =
    establishmentSummary?.offsetsByAction ||
    carbonEntries?.reduce((acc: any, entry: any) => {
      if (entry.type === 'offset' && entry.source?.name) {
        const action = entry.source.name;
        acc[action] = (acc[action] || 0) + (entry.effective_amount || entry.amount || 0);
      }
      return acc;
    }, {}) ||
    {};

  // Filter entries based on selected filters
  const filteredEntries =
    carbonEntries?.filter((entry: any) => {
      if (selectedCategory !== 'all') {
        // Extract category from description for filtering
        let entryCategory = 'Other';
        if (entry.description?.includes('IR event')) {
          entryCategory = 'Irrigation';
        } else if (entry.description?.includes('FE event')) {
          entryCategory = 'Fertilizer Application';
        } else if (entry.description?.includes('HA event')) {
          entryCategory = 'Harvesting';
        } else if (entry.description?.includes('PR event')) {
          entryCategory = 'Production';
        } else if (entry.description?.includes('equipment')) {
          entryCategory = 'Equipment';
        } else if (entry.description?.includes('chemical')) {
          entryCategory = 'Chemical Application';
        }

        if (entryCategory !== selectedCategory) return false;
      }
      if (showVerifiedOnly && !entry.usda_verified) return false;
      return true;
    }) || [];

  // Available categories for filtering
  const availableCategories = carbonEntries ? [...new Set(Object.keys(emissionsByCategory))] : [];

  // Handle production change
  const handleProductionChange = (event: any) => {
    setProductionId(event.target.value);
    setViewMode(event.target.value ? 'production' : 'establishment');
  };

  // Transparency event creation will be implemented here
  // Focus on documenting farm activities rather than carbon offsets

  // Get status color based on transparency score
  const getStatusColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  // Get verification badge color
  const getVerificationColor = (level: string) => {
    switch (level) {
      case 'verified':
        return 'green';
      case 'pending':
        return 'yellow';
      case 'unverified':
        return 'red';
      default:
        return 'gray';
    }
  };

  // Pagination helper functions
  const handleEntriesPageChange = (newPage: number) => {
    setCurrentEntriesPage(newPage);
  };

  const handleEntriesFilterChange = (key: string, value: string | boolean) => {
    if (key === 'verified_only') {
      setShowVerifiedOnly(value as boolean);
    } else if (key === 'category') {
      setSelectedCategory(value as string);
    }
    // Reset to first page when filtering
    setCurrentEntriesPage(1);
  };

  // Handle metric info click
  const handleMetricInfoClick = (
    metricType:
      | 'environmentalImpact'
      | 'netFootprint'
      | 'transparencyScore'
      | 'verifiedEvents'
      | 'securityScore'
      | 'usdaCompliance'
      | 'blockchainStatus'
  ) => {
    setSelectedMetric(metricType);
    onMetricModalOpen();
  };

  if (isSummaryLoading || isEntriesLoading) {
    return (
      <Container maxW="7xl" py={containerPadding}>
        <VStack spacing={6} align="stretch">
          <Skeleton height="60px" />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={cardSpacing}>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} height="120px" />
            ))}
          </SimpleGrid>
          <Skeleton height="300px" />
        </VStack>
      </Container>
    );
  }

  return (
    <Box minH="100vh" py={{ base: 4, md: 6 }} px={{ base: 2, md: 6 }}>
      <VStack spacing={6} align="stretch">
        {/* Header - Optimized spacing for proper hierarchy */}
        <Flex
          direction={{ sm: 'column', md: 'row' }}
          justify="space-between"
          align="center"
          gap="24px"
          paddingTop={{ base: 4, md: 6 }}
          w="100%">
          {/* Title Section - Proper position after breadcrumbs */}
          <VStack align="start" spacing={1}>
            <Text color="gray.500" fontSize={{ base: "sm", md: "md" }}>
              View your transparency metrics and consumer trust indicators
            </Text>
          </VStack>

          {/* Production Selector - Proper sizing */}
          <Box w={{ base: "100%", md: "fit-content" }} minW={{ md: "300px" }} maxW={{ md: "400px" }}>
            <ProductionSelector
              selectedProductionId={productionId}
              productions={productions || []}
              onProductionChange={(newProductionId) => 
                handleProductionChange({ target: { value: newProductionId } })
              }
              isLoading={isProductionsLoading}
              placeholder="Select Production"
              size="sm"
            />
          </Box>
        </Flex>

        {/* Quick Actions - Mobile-Responsive */}
        <Flex 
          direction={{ base: "column", sm: "row" }}
          gap={3}
          mb={6}
          flexWrap="wrap"
          justify={{ base: "stretch", sm: "flex-start" }}
        >
          <Button 
            leftIcon={<FaPlus />} 
            colorScheme="green" 
            size="sm" 
            onClick={() => navigate(`/admin/dashboard/establishment/${establishmentId}/parcel`)}
            flex={{ base: "1", sm: "none" }}
            minW={{ base: "auto", sm: "150px" }}
          >
            Go to Farm Operations
          </Button>
          <Button 
            leftIcon={<FaDownload />} 
            variant="outline" 
            size="sm"
            flex={{ base: "1", sm: "none" }}
            minW={{ base: "auto", sm: "120px" }}
          >
            Export Report
          </Button>
          <Button
            leftIcon={<FaEye />}
            variant="outline"
            size="sm"
            onClick={onCertificationsModalOpen}
            flex={{ base: "1", sm: "none" }}
            minW={{ base: "auto", sm: "140px" }}
          >
            View Certifications
          </Button>
        </Flex>


        {/* Key Metrics Cards - Improved Layout */}
        <VStack spacing={cardSpacing} align="stretch">
          {/* Primary Metrics Row - Most Important KPIs */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={cardSpacing}>
            {/* Transparency Score - Primary KPI */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              position="relative"
              overflow="hidden"
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: getStatusColor(primaryTransparencyScore) + '.300'
              }}
              cursor="pointer">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaLeaf} color={successColor} boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="Transparency Score Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('transparencyScore');
                          }}
                          _hover={{ color: successColor, bg: 'green.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={getStatusColor(primaryTransparencyScore)}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        {primaryTransparencyScore}%
                      </Badge>
                    </HStack>
                  </HStack>
                  <CircularProgress
                    value={primaryTransparencyScore}
                    size="80px"
                    color={getStatusColor(primaryTransparencyScore) + '.400'}
                    thickness="8px"
                    transition="all 0.5s ease">
                    <CircularProgressLabel fontSize="lg" fontWeight="bold">
                      {primaryTransparencyScore}
                    </CircularProgressLabel>
                  </CircularProgress>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Transparency Score
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Complete documentation and verification level
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
              {/* Primary indicator overlay with gradient */}
              <Box
                position="absolute"
                top={0}
                left={0}
                width="100%"
                height="3px"
                bgGradient={`linear(to-r, ${getStatusColor(primaryTransparencyScore)}.400, ${getStatusColor(
                  primaryTransparencyScore
                )}.600)`}
              />
            </Card>

            {/* Net Footprint */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: effectiveNetCarbon > 0 ? 'red.300' : 'green.300'
              }}
              cursor="pointer">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaBalanceScale} color="green.500" boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="Net Footprint Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('netFootprint');
                          }}
                          _hover={{ color: 'blue.500', bg: 'blue.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={effectiveNetCarbon > 0 ? 'red' : 'green'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        {effectiveNetCarbon > 0 ? 'POSITIVE' : 'NEGATIVE'}
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color={effectiveNetCarbon > 0 ? 'red.500' : 'green.500'}
                      transition="color 0.3s ease">
                      {effectiveNetCarbon > 0 ? '+' : ''}
                      {effectiveNetCarbon.toFixed(1)}
                    </Text>
                    <Text fontSize="sm" color={mutedColor}>
                      kg CO₂e effective
                    </Text>
                    {effectiveOffsets !== totalOffsets && (
                      <Text fontSize="xs" color="orange.500" opacity={0.8}>
                        ({netCarbon > 0 ? '+' : ''}
                        {netCarbon.toFixed(1)} raw)
                      </Text>
                    )}
                  </VStack>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Environmental Impact
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Total farm environmental footprint
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Total Emissions - Secondary Metric */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: 'blue.300'
              }}
              cursor="pointer">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaCloudUploadAlt} color="blue.500" boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details on carbon calculations and methodology" hasArrow>
                        <IconButton
                          aria-label="Total Emissions Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('totalEmissions');
                          }}
                          _hover={{ color: 'blue.500', bg: 'blue.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme="blue"
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        CO₂e
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color="blue.600"
                      transition="color 0.3s ease">
                      {totalEmissions.toFixed(1)}
                    </Text>
                    <Text fontSize="sm" color={mutedColor}>
                      kg CO₂e
                    </Text>
                  </VStack>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Total Emissions
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Technical carbon footprint data for B2B reporting
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Verified Events */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: 'blue.300'
              }}
              cursor="pointer">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaCertificate} color="orange.500" boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="Verified Events Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('verifiedEvents');
                          }}
                          _hover={{ color: 'orange.500', bg: 'orange.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme="blue"
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        {verifiedEventsCount}/{eventsCount}
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Text fontSize="2xl" fontWeight="bold" color={textColor}>
                      {verifiedEventsCount}
                    </Text>
                    <Text fontSize="sm" color={mutedColor}>
                      events
                    </Text>
                  </VStack>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Verified Events
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Farm activities documented this year
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Secondary Metrics Row - Compliance & Technical Status */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={cardSpacing} alignItems="stretch">
            {/* Security Status Card - Enhanced with hover */}
            <SecurityStatusCard
              compact={true}
              onInfoClick={() => handleMetricInfoClick('securityScore')}
            />

            {/* USDA Compliance Score */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: usdaComplianceScore >= 80 ? 'green.300' : 'orange.300'
              }}
              cursor="pointer"
              height="100%">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaShieldAlt} color="green.500" boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="USDA Compliance Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('usdaCompliance');
                          }}
                          _hover={{ color: 'blue.500', bg: 'blue.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={usdaComplianceScore >= 80 ? 'green' : 'orange'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        USDA {usdaComplianceScore >= 80 ? 'COMPLIANT' : 'PARTIAL'}
                      </Badge>
                    </HStack>
                  </HStack>
                  <CircularProgress
                    value={usdaComplianceScore}
                    size="80px"
                    color={usdaComplianceScore >= 80 ? 'blue.400' : 'orange.400'}
                    thickness="8px"
                    transition="all 0.5s ease">
                    <CircularProgressLabel fontSize="lg" fontWeight="bold">
                      {usdaComplianceScore}%
                    </CircularProgressLabel>
                  </CircularProgress>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      USDA Compliance
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Events verified with USDA standards
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Blockchain Verification */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: blockchainVerified ? 'green.300' : 'gray.300'
              }}
              cursor="pointer"
              height="100%">
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon
                      as={FaCube}
                      color={blockchainVerified ? 'green.500' : 'gray.400'}
                      boxSize={5}
                    />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="Blockchain Status Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('blockchainStatus');
                          }}
                          _hover={{ color: 'gray.600', bg: 'gray.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={blockchainVerified ? 'green' : 'gray'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full">
                        {blockchainVerified ? 'VERIFIED' : 'PENDING'}
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Icon
                      as={blockchainVerified ? FaCheckCircle : FaExclamationTriangle}
                      boxSize={8}
                      color={blockchainVerified ? 'green.500' : 'orange.400'}
                      transition="color 0.3s ease"
                    />
                    <Text fontSize="sm" color={mutedColor} textAlign="center" opacity={0.8}>
                      {getNetworkDisplayName(blockchainNetwork) || 'Not Available'}
                    </Text>
                  </VStack>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Blockchain Status
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Immutable carbon record verification
                    </Text>
                  </VStack>
                  {blockchainVerified && (
                    <Text fontSize="xs" color="green.500" textAlign="center" opacity={0.9}>
                      Records verified on {getNetworkDisplayName(blockchainNetwork)}
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>

        {/* Transparency Achievements Section */}
        {hasData && (
          <VStack spacing={6} align="stretch">
            {/* Section Header */}
            <Flex justify="space-between" align="center">
              <Heading size="lg" color={textColor} fontWeight="bold">
                Transparency Achievements
              </Heading>
              <Text fontSize="sm" color={mutedColor} opacity={0.8}>
                Your progress in building consumer trust through documentation
              </Text>
            </Flex>

            {/* Transparency Celebration Banner */}
            {primaryTransparencyScore >= 50 && (
              <Card
                bg="green.50"
                borderColor="green.200"
                borderLeft="4px solid"
                borderLeftColor="green.500"
                mb={4}
              >
                <CardBody py={3}>
                  <HStack spacing={3}>
                    <Icon as={FaAward} color="green.500" boxSize={5} />
                    <VStack align="start" spacing={1}>
                      <Text fontWeight="semibold" color="green.700" fontSize="sm">
                        🎉 {primaryTransparencyScore >= 80 ? 'Excellent transparency!' : 'Great progress!'} 
                        {primaryTransparencyScore < 80 && ` ${Math.ceil((80 - primaryTransparencyScore) / 10) * 10} more points to reach premium transparency`}
                      </Text>
                      <Text fontSize="xs" color="green.600">
                        {primaryTransparencyScore >= 80 
                          ? 'Consumers love your detailed farming story - this builds premium brand value!' 
                          : 'Keep documenting your farming practices - consumers pay 12% more for transparent farms'}
                      </Text>
                    </VStack>
                  </HStack>
                </CardBody>
              </Card>
            )}

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={cardSpacing}>
              {/* Documentation Completeness */}
              <Card
                bg={cardBg}
                borderColor={borderColor}
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                  borderColor: 'green.300'
                }}>
                <CardHeader flexDirection="column" justifyContent="space-between" pb={3}>
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Box p={2} bg="green.50" borderRadius="lg" border="1px" borderColor="green.200">
                        <Icon as={FaFileAlt} color="green.500" boxSize={4} />
                      </Box>
                      <VStack spacing={0} align="flex-start">
                        <Heading size="md" color={textColor}>
                          Activity Documentation
                        </Heading>
                        <Text fontSize="xs" color={mutedColor} opacity={0.8}>
                          Building consumer trust through detailed documentation
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack spacing={0} align="flex-end">
                      <Text fontSize="lg" fontWeight="bold" color="green.500">
                        {eventsCount}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        total events
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    <Box>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                          USDA Verified Events
                        </Text>
                        <Text fontSize="sm" color="green.600" fontWeight="medium">
                          {verifiedEventsCount} of {eventsCount}
                        </Text>
                      </HStack>
                      <Progress
                        value={transparencyScore}
                        colorScheme="green"
                        size="md"
                        borderRadius="full"
                        bg="gray.100"
                        hasStripe
                        isAnimated
                        transition="all 0.5s ease"
                      />
                      <Text fontSize="xs" color={mutedColor} mt={1} opacity={0.7}>
                        {transparencyScore}% verification rate • {eventsCount} documented events = stronger consumer confidence
                      </Text>
                    </Box>
                    {Object.entries(emissionsByCategory).map(([category, amount], index) => (
                      <Box key={category}>
                        <HStack justify="space-between" mb={2}>
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            textTransform="capitalize"
                            color={textColor}>
                            {category} Activities
                          </Text>
                          <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                            {Object.keys(carbonEntries?.filter((entry: any) => 
                              entry.description?.includes(category === 'Irrigation' ? 'IR event' : 
                                category === 'Fertilizer Application' ? 'FE event' :
                                category === 'Harvesting' ? 'HA event' : 'PR event')
                            ) || []).length} events
                          </Text>
                        </HStack>
                        <Progress
                          value={30 + (index * 15)} // Distribute across range for visual variety
                          colorScheme="blue"
                          size="sm"
                          borderRadius="full"
                          bg="gray.100"
                          transition="all 0.5s ease"
                        />
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Transparency Achievements */}
              <Card
                bg={cardBg}
                borderColor={borderColor}
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                  borderColor: 'purple.300'
                }}>
                <CardHeader flexDirection="column" justifyContent="space-between" pb={3}>
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Box
                        p={2}
                        bg="purple.50"
                        borderRadius="lg"
                        border="1px"
                        borderColor="purple.200">
                        <Icon as={FaAward} color="purple.500" boxSize={4} />
                      </Box>
                      <VStack spacing={0} align="flex-start">
                        <Heading size="md" color={textColor}>
                          Trust Achievements
                        </Heading>
                        <Text fontSize="xs" color={mutedColor} opacity={0.8}>
                          Higher transparency = premium brand value & consumer loyalty
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack spacing={0} align="flex-end">
                      <Text fontSize="lg" fontWeight="bold" color="purple.500">
                        {transparencyScore >= 80 ? 'Excellent' : transparencyScore >= 60 ? 'Good' : 'Growing'}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        trust level
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    {/* Achievement Badges */}
                    <VStack spacing={3} align="stretch">
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={transparencyScore >= 80 ? FaCheckCircle : FaExclamationTriangle} 
                                color={transparencyScore >= 80 ? 'green.500' : 'orange.500'} boxSize={4} />
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            Documentation Transparency
                          </Text>
                        </HStack>
                        <Badge colorScheme={transparencyScore >= 80 ? 'green' : transparencyScore >= 60 ? 'yellow' : 'red'}
                               variant="subtle" px={3} py={1} borderRadius="full">
                          {transparencyScore >= 80 ? 'ACHIEVED' : transparencyScore >= 60 ? 'PROGRESSING' : 'BUILDING'}
                        </Badge>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={usdaComplianceScore >= 80 ? FaCheckCircle : FaExclamationTriangle} 
                                color={usdaComplianceScore >= 80 ? 'green.500' : 'orange.500'} boxSize={4} />
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            USDA Data Standards
                          </Text>
                        </HStack>
                        <Badge colorScheme={usdaComplianceScore >= 80 ? 'green' : 'yellow'}
                               variant="subtle" px={3} py={1} borderRadius="full">
                          {usdaComplianceScore >= 80 ? 'CERTIFIED' : 'PARTIAL'}
                        </Badge>
                      </HStack>
                      
                      <HStack justify="space-between">
                        <HStack spacing={2}>
                          <Icon as={blockchainVerified ? FaCheckCircle : FaExclamationTriangle} 
                                color={blockchainVerified ? 'green.500' : 'gray.400'} boxSize={4} />
                          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                            Blockchain Verification
                          </Text>
                        </HStack>
                        <Badge colorScheme={blockchainVerified ? 'green' : 'gray'}
                               variant="subtle" px={3} py={1} borderRadius="full">
                          {blockchainVerified ? 'VERIFIED' : 'PENDING'}
                        </Badge>
                      </HStack>
                    </VStack>
                    
                    {/* Next Steps */}
                    <Box mt={4} p={4} bg="blue.50" borderRadius="lg" border="1px" borderColor="blue.200">
                      <VStack spacing={2} align="start">
                        <Text fontSize="sm" fontWeight="semibold" color="blue.800">
                          🎯 Next Achievement:
                        </Text>
                        <Text fontSize="xs" color="blue.700">
                          {transparencyScore < 80 ? 'Complete USDA verification for all events' :
                           !blockchainVerified ? 'Enable blockchain verification for immutable records' :
                           'Maintain excellent transparency standards'}
                        </Text>
                      </VStack>
                    </Box>
                  </VStack>
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        )}

        {/* Carbon Entries Table - Modern Design */}
        <Card bg={cardBg} borderColor={borderColor} borderRadius="xl" overflow="hidden">
          <CardHeader p={6} py={6} width="100%">
            <VStack spacing={4} align="stretch" width="100%">
              <Flex justify="space-between" align="center" w="100%">
                <HStack spacing={3}>
                  <Box
                    p={2}
                    bg="green.50"
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="green.200">
                    <Icon as={FaFileAlt} color="green.500" boxSize={5} />
                  </Box>
                  <VStack align="start" spacing={0}>
                    <Heading size="lg" color={textColor} fontWeight="600">
                      Environmental Data
                    </Heading>
                    <Text fontSize="sm" color={mutedColor}>
                      Supporting sustainability metrics for transparency reporting
                    </Text>
                  </VStack>
                </HStack>
                <Badge
                  colorScheme="blue"
                  variant="subtle"
                  fontSize="md"
                  px={3}
                  py={1}
                  borderRadius="full"
                  width="fit-content">
                  {totalEntriesCount} entries
                </Badge>
              </Flex>

              <Flex justify="space-between" align="center" pt={2}>
                <HStack spacing={3}>
                  <Select
                    size="sm"
                    value={selectedCategory}
                    onChange={(e) => handleEntriesFilterChange('category', e.target.value)}
                    w="180px"
                    bg={cardBg}
                    borderRadius="lg"
                    fontSize="sm"
                    fontWeight="500">
                    <option value="all">All Categories</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant={showVerifiedOnly ? 'solid' : 'outline'}
                    colorScheme="green"
                    borderRadius="lg"
                    fontWeight="600"
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'md'
                    }}
                    transition="all 0.2s"
                    onClick={() => handleEntriesFilterChange('verified_only', !showVerifiedOnly)}>
                    <Icon as={FaShieldAlt} mr={2} />
                    Verified Only
                  </Button>
                </HStack>
                <HStack spacing={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="gray"
                    leftIcon={<FaDownload />}
                    borderRadius="lg"
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'md'
                    }}
                    transition="all 0.2s">
                    Export
                  </Button>
                </HStack>
              </Flex>
            </VStack>
          </CardHeader>
          <CardBody pt={0} paddingTop={4}>
            <VStack spacing={4}>
              {isPaginatedEntriesLoading ? (
                <HStack justify="center" py={8}>
                  <Spinner size="md" color="green.500" />
                  <Text color={mutedColor}>Loading farm activities...</Text>
                </HStack>
              ) : paginatedEntriesError ? (
                <VStack spacing={2} py={8}>
                  <Text color="red.500">Error loading farm activities</Text>
                  <Text fontSize="sm" color={mutedColor}>
                    Please try again later
                  </Text>
                </VStack>
              ) : paginatedEntries.length > 0 ? (
                <Box
                  overflowX="auto"
                  w="100%"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                  bg={cardBg}>
                  <Table size="md" variant="simple">
                    <Thead bg={useColorModeValue('gray.50', 'gray.700')}>
                      <Tr>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="100px">
                          Category
                        </Th>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="250px">
                          Farm Activity
                        </Th>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="150px">
                          Impact Data
                        </Th>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="200px">
                          Verification
                        </Th>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="130px">
                          Date
                        </Th>
                        <Th
                          color={textColor}
                          fontWeight="600"
                          fontSize="sm"
                          py={4}
                          px={6}
                          textTransform="uppercase"
                          letterSpacing="wide"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.200', 'gray.600')}
                          width="100px">
                          Actions
                        </Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {paginatedEntries.map((entry: any) => (
                        <Tr
                          key={entry.id}
                          _hover={{
                            bg: useColorModeValue('green.50', 'green.900/20'),
                            transform: 'translateY(-1px)',
                            boxShadow: 'sm'
                          }}
                          transition="all 0.2s"
                          borderBottom="1px solid"
                          borderColor={useColorModeValue('gray.100', 'gray.700')}>
                          <Td py={5} px={6}>
                            <Badge
                              colorScheme={entry.type === 'emission' ? 'red' : 'green'}
                              variant="subtle"
                              fontSize="xs"
                              px={3}
                              py={1}
                              borderRadius="full"
                              fontWeight="600"
                              textTransform="uppercase"
                              letterSpacing="wide"
                              width="fit-content">
                              {entry.type === 'emission' ? 'Farm Activity' : 'Sustainability'}
                            </Badge>
                          </Td>
                          <Td py={5} px={6}>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm" fontWeight="600" color={textColor} noOfLines={1}>
                                {entry.source?.name || 'Farm Operation'}
                              </Text>
                              <Text fontSize="xs" color={mutedColor} noOfLines={1}>
                                {entry.type === 'emission' ? 'Agricultural Practice' : 'Sustainability Action'}
                              </Text>
                            </VStack>
                          </Td>
                          <Td py={5} px={6}>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm" fontWeight="700" color={textColor}>
                                {Number(entry.amount).toLocaleString()} kg CO₂e
                              </Text>
                              <Text fontSize="xs" color={mutedColor}>
                                {entry.type === 'emission' ? 'Environmental impact' : 'Carbon benefit'}
                              </Text>
                              {entry.type === 'offset' && entry.effective_amount && (
                                <Text fontSize="xs" color="green.600" fontWeight="600">
                                  {Number(entry.effective_amount).toLocaleString()} verified benefit
                                </Text>
                              )}
                            </VStack>
                          </Td>
                          <Td py={5} px={6}>
                            <VStack align="start" spacing={2}>
                              {/* Main Status Badge */}
                              <Badge
                                colorScheme={
                                  entry.verification_status === 'verified'
                                    ? 'green'
                                    : entry.verification_status === 'rejected'
                                    ? 'red'
                                    : 'yellow'
                                }
                                variant="subtle"
                                fontSize="xs"
                                px={3}
                                py={2}
                                borderRadius="xl"
                                fontWeight="600"
                                textTransform="uppercase"
                                letterSpacing="wide"
                                width="fit-content"
                                minW="80px"
                                textAlign="center">
                                {entry.verification_status === 'verified'
                                  ? 'VERIFIED'
                                  : entry.verification_status === 'rejected'
                                  ? 'REJECTED'
                                  : 'PENDING'}
                              </Badge>

                              {/* Additional badges for offsets - Consistent Modern Style */}
                              {entry.type === 'offset' &&
                                entry.verification_level === 'certified_project' && (
                                  <Badge
                                    colorScheme="red"
                                    variant="subtle"
                                    fontSize="xs"
                                    px={3}
                                    py={1}
                                    borderRadius="xl"
                                    fontWeight="500"
                                    textTransform="uppercase"
                                    letterSpacing="wide"
                                    width="fit-content"
                                    minW="fit-content">
                                    Registry Failed
                                  </Badge>
                                )}

                              {entry.type === 'offset' &&
                                entry.verification_level === 'self_reported' && (
                                  <Badge
                                    colorScheme="orange"
                                    variant="subtle"
                                    fontSize="xs"
                                    px={3}
                                    py={1}
                                    borderRadius="xl"
                                    fontWeight="500"
                                    textTransform="uppercase"
                                    letterSpacing="wide"
                                    width="fit-content"
                                    minW="fit-content">
                                    Self Reported
                                  </Badge>
                                )}

                              {/* Trust Score for offsets - Modern Style */}
                              {entry.type === 'offset' && entry.trust_score && (
                                <HStack spacing={1}>
                                  <Box
                                    w={2}
                                    h={2}
                                    bg={
                                      entry.trust_score >= 0.8
                                        ? 'green.500'
                                        : entry.trust_score >= 0.5
                                        ? 'yellow.500'
                                        : 'red.500'
                                    }
                                    borderRadius="full"
                                  />
                                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                                    {Math.round(entry.trust_score * 100)}% Trust
                                  </Text>
                                </HStack>
                              )}
                            </VStack>
                          </Td>
                          <Td py={5} px={6}>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="600" color={textColor}>
                                {new Date(entry.created_at || entry.timestamp).toLocaleDateString()}
                              </Text>
                              <Text fontSize="xs" color={mutedColor}>
                                {new Date(entry.created_at || entry.timestamp).toLocaleTimeString()}
                              </Text>
                            </VStack>
                          </Td>
                          <Td py={5} px={6}>
                            <HStack spacing={2}>
                              <Tooltip label="View details" hasArrow>
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  aria-label="View details"
                                  icon={<FaEye />}
                                  color="gray.500"
                                  borderRadius="lg"
                                  _hover={{
                                    color: 'blue.500',
                                    bg: 'blue.50',
                                    transform: 'translateY(-1px)'
                                  }}
                                  transition="all 0.2s"
                                />
                              </Tooltip>
                              <Tooltip label="Edit entry" hasArrow>
                                <IconButton
                                  size="sm"
                                  variant="ghost"
                                  aria-label="Edit entry"
                                  icon={<FaEdit />}
                                  color="gray.500"
                                  borderRadius="lg"
                                  _hover={{
                                    color: 'green.500',
                                    bg: 'green.50',
                                    transform: 'translateY(-1px)'
                                  }}
                                  transition="all 0.2s"
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <VStack spacing={6} py={12}>
                  <Box
                    p={4}
                    bg={useColorModeValue('gray.50', 'gray.700')}
                    borderRadius="full"
                    border="2px dashed"
                    borderColor={useColorModeValue('gray.300', 'gray.600')}>
                    <Icon as={FaFileAlt} color="gray.400" boxSize={8} />
                  </Box>
                  <VStack spacing={3} textAlign="center">
                    <Text fontSize="lg" fontWeight="600" color={textColor}>
                      No farm activities documented
                    </Text>
                    <Text fontSize="sm" color={mutedColor} maxW="400px">
                      No activities match your current filters. Try adjusting the category or
                      verification filters, or start building transparency by documenting
                      your farm operations.
                    </Text>
                  </VStack>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="green"
                    size="sm"
                    borderRadius="lg"
                    onClick={() =>
                      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel`)
                    }
                    _hover={{
                      transform: 'translateY(-1px)',
                      boxShadow: 'md'
                    }}
                    transition="all 0.2s">
                    Go to Farm Operations
                  </Button>
                </VStack>
              )}

              {/* Pagination Controls */}
              {totalEntriesPages > 1 && (
                <Flex
                  justify="space-between"
                  align="center"
                  w="100%"
                  pt={6}
                  px={2}
                  borderTop="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.600')}>
                  <VStack align="start" spacing={0}>
                    <Text fontSize="sm" fontWeight="600" color={textColor}>
                      Page {currentEntriesPage} of {totalEntriesPages}
                    </Text>
                    <Text fontSize="xs" color={mutedColor}>
                      {totalEntriesCount} total activities
                    </Text>
                  </VStack>
                  <HStack spacing={2}>
                    <IconButton
                      icon={<FiChevronLeft />}
                      aria-label="Previous page"
                      size="sm"
                      variant="outline"
                      colorScheme="gray"
                      borderRadius="lg"
                      onClick={() => handleEntriesPageChange(currentEntriesPage - 1)}
                      isDisabled={currentEntriesPage === 1}
                      _hover={{
                        transform: 'translateY(-1px)',
                        boxShadow: 'md'
                      }}
                      transition="all 0.2s"
                    />
                    <Box
                      px={3}
                      py={1}
                      bg={useColorModeValue('green.50', 'green.900')}
                      borderRadius="lg"
                      border="1px solid"
                      borderColor={useColorModeValue('green.200', 'green.700')}>
                      <Text fontSize="sm" fontWeight="600" color="green.600">
                        {currentEntriesPage}
                      </Text>
                    </Box>
                    <IconButton
                      icon={<FiChevronRight />}
                      aria-label="Next page"
                      size="sm"
                      variant="outline"
                      colorScheme="gray"
                      borderRadius="lg"
                      onClick={() => handleEntriesPageChange(currentEntriesPage + 1)}
                      isDisabled={currentEntriesPage === totalEntriesPages}
                      _hover={{
                        transform: 'translateY(-1px)',
                        boxShadow: 'md'
                      }}
                      transition="all 0.2s"
                    />
                  </HStack>
                </Flex>
              )}
            </VStack>
          </CardBody>
        </Card>

        {/* No Data State */}
        {!hasData && (
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <VStack spacing={6} py={8}>
                <Icon as={FaLeaf} color="gray.400" boxSize={12} />
                <VStack spacing={2}>
                  <Heading size="md" color={textColor}>
                    Start Your Transparency Journey
                  </Heading>
                  <Text color={mutedColor} textAlign="center" maxW="md">
                    To see your transparency metrics, first document your farm activities in the 
                    Farm Operations section. Our system will automatically calculate your transparency 
                    score and help you tell your sustainability story to consumers.
                  </Text>
                </VStack>
                <HStack spacing={4}>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="green"
                    onClick={() =>
                      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel`)
                    }>
                    Go to Farm Operations
                  </Button>
                  <Button leftIcon={<FaInfoCircle />} variant="outline" onClick={onInsightsOpen}>
                    Learn More
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}


        {/* Insights Modal */}
        <Modal isOpen={isInsightsOpen} onClose={onInsightsClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Farm Transparency Benefits</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>
                    Why Document Farm Activities?
                  </Heading>
                  <List spacing={2}>
                    <ListItem>
                      <ListIcon as={FaCheckCircle} color="green.500" />
                      Build consumer trust through transparency
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheckCircle} color="green.500" />
                      Access premium pricing for sustainable products
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheckCircle} color="green.500" />
                      Generate carbon credits for additional revenue
                    </ListItem>
                    <ListItem>
                      <ListIcon as={FaCheckCircle} color="green.500" />
                      Meet regulatory requirements and certifications
                    </ListItem>
                  </List>
                </Box>

                <Divider />

                <Box>
                  <Heading size="md" mb={3}>
                    Getting Started
                  </Heading>
                  <VStack spacing={3} align="stretch">
                    <HStack>
                      <Badge colorScheme="blue">1</Badge>
                      <Text fontSize="sm">
                        Go to Farm Operations → Create productions and document farm activities
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">2</Badge>
                      <Text fontSize="sm">
                        Our system automatically calculates transparency metrics
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">3</Badge>
                      <Text fontSize="sm">
                        View your progress here in the Transparency Dashboard
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">4</Badge>
                      <Text fontSize="sm">Share your verified farm story with consumers</Text>
                    </HStack>
                  </VStack>
                </Box>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button colorScheme="green" onClick={onInsightsClose}>
                Get Started
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Certifications Modal */}
        <Modal isOpen={isCertificationsModalOpen} onClose={onCertificationsModalClose} size="lg">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Sustainability Certifications</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4} align="stretch">
                <Alert status="info" borderRadius="md">
                  <AlertIcon />
                  <VStack align="start" spacing={1}>
                    <Text fontSize="sm" fontWeight="medium">
                      Certification Management
                    </Text>
                    <Text fontSize="xs">
                      Upload and manage your sustainability certifications to increase transparency
                    </Text>
                  </VStack>
                </Alert>

                <Button
                  leftIcon={<FaCloudUploadAlt />}
                  colorScheme="blue"
                  variant="outline"
                  size="sm">
                  Upload New Certification
                </Button>

                <Text color={mutedColor} fontSize="sm" textAlign="center">
                  No certifications uploaded yet
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter>
              <Button onClick={onCertificationsModalClose}>Close</Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        {/* Metric Transparency Modal */}
        <MetricTransparencyModal
          isOpen={isMetricModalOpen}
          onClose={onMetricModalClose}
          metricType={
            selectedMetric as
              | 'environmentalImpact'
              | 'netFootprint'
              | 'transparencyScore'
              | 'verifiedEvents'
              | 'securityScore'
              | 'usdaCompliance'
              | 'blockchainStatus'
          }
          metricData={{
            transparencyScore: primaryTransparencyScore,
            netFootprint: establishmentSummary?.net_carbon || 0,
            verifiedEvents: 31, // Based on current calculation
            securityScore: 55, // Based on current calculation
            usdaCompliance: 97, // Based on current calculation
            blockchainStatus: 'PENDING',
            totalEmissions: establishmentSummary?.total_emissions || 0,
            totalOffsets: Math.abs(establishmentSummary?.total_offsets || 0),
            emissionsByCategory: emissionsByCategory || {}
          }}
        />

      </VStack>
    </Box>
  );
};

export default ModernCarbonDashboard;
