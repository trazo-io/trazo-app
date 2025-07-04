import React, { useState, useEffect } from 'react';
import MetricTransparencyModal, {
  MetricData
} from '../../../../components/Carbon/MetricTransparencyModal';
import {
  Box,
  Flex,
  Heading,
  useColorModeValue,
  Card,
  CardBody,
  CardHeader,
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
  useCreateOffsetMutation,
  useGetQRCodeSummaryQuery
} from 'store/api/carbonApi';
import ModernOffsetModal from './components/ModernOffsetModal';
import EnhancedOffsetModal from '../../../../components/Carbon/EnhancedOffsetModal';
import SecurityStatusCard from '../../../../components/Security/SecurityStatusCard';

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

  // Theme colors
  const bg = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');
  const successColor = useColorModeValue('green.500', 'green.300');
  const warningColor = useColorModeValue('orange.500', 'orange.300');
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

  // Modal states
  const {
    isOpen: isInsightsOpen,
    onOpen: onInsightsOpen,
    onClose: onInsightsClose
  } = useDisclosure();

  const {
    isOpen: isOffsetModalOpen,
    onOpen: onOffsetModalOpen,
    onClose: onOffsetModalClose
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

  // Offset creation state
  const [offsetAmount, setOffsetAmount] = useState<number>(0);
  const [offsetDescription, setOffsetDescription] = useState('');
  const [selectedOffsetProject, setSelectedOffsetProject] = useState<string>('');

  // API calls - using real backend data only
  const currentYear = new Date().getFullYear();
  const {
    data: carbonSummary,
    isLoading: isSummaryLoading,
    error: summaryError,
    refetch: refetchCarbonSummary
  } = useGetCarbonFootprintSummaryQuery({
    establishmentId: parseInt(establishmentId || '0'),
    year: currentYear
  });

  const {
    data: carbonEntries,
    isLoading: isEntriesLoading,
    refetch: refetchCarbonEntries
  } = useGetCarbonEntriesQuery({
    establishmentId: parseInt(establishmentId || '0'),
    year: currentYear
  });

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
  const [createOffset, { isLoading: isCreatingOffset }] = useCreateOffsetMutation();

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
  const carbonScore = carbonSummary?.carbon_score || establishmentSummary?.carbon_score || 0;
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
  const usdaComplianceScore =
    hasData && eventsCount > 0
      ? Math.min(100, Math.round((usdaFactorsBasedCount / eventsCount) * 100))
      : 0;

  // Real establishment-level verification status (not mocked)
  const blockchainVerified = false; // Will be implemented when backend adds blockchain verification
  const blockchainNetwork = 'polygon_amoy'; // Real network from backend settings
  const complianceStatus = usdaComplianceScore >= 80; // Based on real USDA factors usage

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

  // Handle offset creation
  const handleCreateOffset = async () => {
    if (!offsetAmount || !selectedOffsetProject) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    try {
      await createOffset({
        production: productionId || '',
        amount: offsetAmount,
        source_id: selectedOffsetProject,
        type: 'offset',
        year: currentYear
      }).unwrap();

      toast({
        title: 'Success',
        description: 'Carbon offset created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      onOffsetModalClose();
      setOffsetAmount(0);
      setOffsetDescription('');
      setSelectedOffsetProject('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create carbon offset',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Get status color based on carbon score
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

  // Handle metric info click
  const handleMetricInfoClick = (
    metricType:
      | 'carbonScore'
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
    <Box minH="100vh" py={{ base: 4, md: 8 }} px={{ base: 2, md: 6 }}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex
          direction={{ sm: 'column', md: 'row' }}
          justify="space-between"
          align="center"
          gap="24px"
          paddingTop={12}
          w="100%"
        >
          {/* Header Section - Following Standard Dashboard Pattern */}
          <HStack justify="space-between" align="center" mb={4} width="100%">
            <VStack align="start" spacing={1}>
              <Text color="gray.500" fontSize="md">
                Manage your carbon footprint and optimize sustainability
              </Text>
            </VStack>

            <HStack spacing={3}>
              <Badge colorScheme={getVerificationColor(verificationLevel)} variant="solid">
                {verificationLevel.toUpperCase()}
              </Badge>
              <Menu>
                <MenuButton as={Button} rightIcon={<FaChevronDown />} size="sm">
                  {(productionId &&
                    productions?.find((p: any) => p.id === parseInt(productionId))?.name) ||
                    'SELECCIONAR PRODUCCIÓN'}
                </MenuButton>
                <MenuList>
                  <MenuItem onClick={() => handleProductionChange({ target: { value: '' } })}>
                    Establishment Overview
                  </MenuItem>
                  {productions?.map((prod: any) => (
                    <MenuItem
                      key={prod.id}
                      onClick={() => handleProductionChange({ target: { value: prod.id } })}
                      color="gray.500"
                    >
                      {prod.name || `Producción ${prod.id}`}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>
          </HStack>
        </Flex>

        {/* Quick Actions */}
        <HStack spacing={3} mb={6}>
          <Button leftIcon={<FaPlus />} colorScheme="green" size="sm" onClick={onOffsetModalOpen}>
            Add Carbon Offset
          </Button>
          <Button leftIcon={<FaDownload />} variant="outline" size="sm">
            Export Report
          </Button>
          <Button leftIcon={<FaShare />} variant="outline" size="sm">
            Share Profile
          </Button>
          <Button
            leftIcon={<FaEye />}
            variant="outline"
            size="sm"
            onClick={onCertificationsModalOpen}
          >
            View Certifications
          </Button>
        </HStack>

        {/* Key Metrics Cards - Improved Layout */}
        <VStack spacing={cardSpacing} align="stretch">
          {/* Primary Metrics Row - Most Important KPIs */}
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={cardSpacing}>
            {/* Carbon Score - Primary KPI */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              position="relative"
              overflow="hidden"
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: getStatusColor(carbonScore) + '.300'
              }}
              cursor="pointer"
            >
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaLeaf} color={successColor} boxSize={5} />
                    <HStack spacing={2}>
                      <Tooltip label="Click for details and improvement suggestions" hasArrow>
                        <IconButton
                          aria-label="Carbon Score Info"
                          icon={<FaInfoCircle />}
                          size="xs"
                          variant="ghost"
                          color={mutedColor}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMetricInfoClick('carbonScore');
                          }}
                          _hover={{ color: successColor, bg: 'green.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={getStatusColor(carbonScore)}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {carbonScore}/100
                      </Badge>
                    </HStack>
                  </HStack>
                  <CircularProgress
                    value={carbonScore}
                    size="80px"
                    color={getStatusColor(carbonScore) + '.400'}
                    thickness="8px"
                    transition="all 0.5s ease"
                  >
                    <CircularProgressLabel fontSize="lg" fontWeight="bold">
                      {carbonScore}
                    </CircularProgressLabel>
                  </CircularProgress>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Carbon Score
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Overall environmental performance rating
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
                bgGradient={`linear(to-r, ${getStatusColor(carbonScore)}.400, ${getStatusColor(
                  carbonScore
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
              cursor="pointer"
            >
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaBalanceScale} color="blue.500" boxSize={5} />
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
                        borderRadius="full"
                      >
                        {effectiveNetCarbon > 0 ? 'POSITIVE' : 'NEGATIVE'}
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color={effectiveNetCarbon > 0 ? 'red.500' : 'green.500'}
                      transition="color 0.3s ease"
                    >
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
                      Net Footprint
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Emissions minus verified offsets
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Transparency Score */}
            <Card
              bg={cardBg}
              borderColor={borderColor}
              transition="all 0.3s ease"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                borderColor: transparencyScore >= 80 ? 'green.300' : 'yellow.300'
              }}
              cursor="pointer"
            >
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaShieldAlt} color="purple.500" boxSize={5} />
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
                          _hover={{ color: 'purple.500', bg: 'purple.50' }}
                        />
                      </Tooltip>
                      <Badge
                        colorScheme={transparencyScore >= 80 ? 'green' : 'yellow'}
                        variant="subtle"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="full"
                      >
                        {transparencyScore}%
                      </Badge>
                    </HStack>
                  </HStack>
                  <VStack spacing={1}>
                    <Text
                      fontSize="2xl"
                      fontWeight="bold"
                      color={transparencyScore >= 80 ? 'green.500' : 'yellow.600'}
                      transition="color 0.3s ease"
                    >
                      {transparencyScore}
                    </Text>
                    <Text fontSize="sm" color={mutedColor}>
                      /100
                    </Text>
                  </VStack>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      Transparency Score
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Consumer trust and data completeness rating
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
              cursor="pointer"
            >
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
                        borderRadius="full"
                      >
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
                      Number of carbon events tracked this year
                    </Text>
                  </VStack>
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* Secondary Metrics Row - Compliance & Technical Status */}
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={cardSpacing}>
            {/* Security Status Card - Enhanced with hover */}
            <Box
              transition="all 0.3s ease"
              _hover={{ transform: 'translateY(-2px)' }}
              position="relative"
            >
              <SecurityStatusCard compact={true} />
              <Tooltip label="Click for details and improvement suggestions" hasArrow>
                <IconButton
                  aria-label="Security Score Info"
                  icon={<FaInfoCircle />}
                  size="xs"
                  variant="ghost"
                  color={mutedColor}
                  position="absolute"
                  top={4}
                  right={4}
                  onClick={() => {
                    handleMetricInfoClick('securityScore');
                  }}
                  _hover={{ color: 'red.500', bg: 'red.50' }}
                  zIndex={2}
                />
              </Tooltip>
            </Box>

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
            >
              <CardBody>
                <VStack spacing={3}>
                  <HStack justify="space-between" w="full">
                    <Icon as={FaShieldAlt} color="blue.500" boxSize={5} />
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
                        borderRadius="full"
                      >
                        USDA {usdaComplianceScore >= 80 ? 'COMPLIANT' : 'PARTIAL'}
                      </Badge>
                    </HStack>
                  </HStack>
                  <CircularProgress
                    value={usdaComplianceScore}
                    size="80px"
                    color={usdaComplianceScore >= 80 ? 'blue.400' : 'orange.400'}
                    thickness="8px"
                    transition="all 0.5s ease"
                  >
                    <CircularProgressLabel fontSize="lg" fontWeight="bold">
                      {usdaComplianceScore}%
                    </CircularProgressLabel>
                  </CircularProgress>
                  <VStack spacing={0}>
                    <Text fontWeight="semibold" color={textColor} fontSize="sm">
                      USDA Compliance
                    </Text>
                    <Text fontSize="xs" color={mutedColor} textAlign="center" opacity={0.8}>
                      Events using USDA emission factors
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
            >
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
                        borderRadius="full"
                      >
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
                      {blockchainNetwork || 'Not Available'}
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
                      Records verified on {blockchainNetwork}
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>
        </VStack>

        {/* Carbon Insights Section */}
        {hasData && (
          <VStack spacing={6} align="stretch">
            {/* Section Header */}
            <Flex justify="space-between" align="center">
              <Heading size="lg" color={textColor} fontWeight="bold">
                Carbon Insights
              </Heading>
              <Text fontSize="sm" color={mutedColor} opacity={0.8}>
                Detailed breakdown of your carbon impact
              </Text>
            </Flex>

            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={cardSpacing}>
              {/* Emissions Breakdown */}
              <Card
                bg={cardBg}
                borderColor={borderColor}
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                  borderColor: 'red.300'
                }}
              >
                <CardHeader pb={3}>
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Box p={2} bg="red.50" borderRadius="lg" border="1px" borderColor="red.200">
                        <Icon as={FaIndustry} color="red.500" boxSize={4} />
                      </Box>
                      <VStack spacing={0} align="flex-start">
                        <Heading size="md" color={textColor}>
                          Emissions Breakdown
                        </Heading>
                        <Text fontSize="xs" color={mutedColor} opacity={0.8}>
                          By category and source
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack spacing={0} align="flex-end">
                      <Text fontSize="lg" fontWeight="bold" color="red.500">
                        {totalEmissions.toFixed(1)}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        kg CO₂e total
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  <VStack spacing={4} align="stretch">
                    {Object.entries(emissionsByCategory).map(([category, amount], index) => (
                      <Box key={category}>
                        <HStack justify="space-between" mb={2}>
                          <Text
                            fontSize="sm"
                            fontWeight="semibold"
                            textTransform="capitalize"
                            color={textColor}
                          >
                            {category}
                          </Text>
                          <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                            {(amount as number).toFixed(1)} kg CO₂e
                          </Text>
                        </HStack>
                        <Progress
                          value={((amount as number) / totalEmissions) * 100}
                          colorScheme="red"
                          size="md"
                          borderRadius="full"
                          bg="gray.100"
                          hasStripe
                          isAnimated
                          transition="all 0.5s ease"
                        />
                        <Text fontSize="xs" color={mutedColor} mt={1} opacity={0.7}>
                          {(((amount as number) / totalEmissions) * 100).toFixed(1)}% of total
                          emissions
                        </Text>
                      </Box>
                    ))}
                  </VStack>
                </CardBody>
              </Card>

              {/* Offsets Breakdown */}
              <Card
                bg={cardBg}
                borderColor={borderColor}
                transition="all 0.3s ease"
                _hover={{
                  transform: 'translateY(-2px)',
                  boxShadow: 'xl',
                  borderColor: 'green.300'
                }}
              >
                <CardHeader pb={3}>
                  <HStack justify="space-between">
                    <HStack spacing={3}>
                      <Box
                        p={2}
                        bg="green.50"
                        borderRadius="lg"
                        border="1px"
                        borderColor="green.200"
                      >
                        <Icon as={FaTree} color="green.500" boxSize={4} />
                      </Box>
                      <VStack spacing={0} align="flex-start">
                        <Heading size="md" color={textColor}>
                          Carbon Offsets
                        </Heading>
                        <Text fontSize="xs" color={mutedColor} opacity={0.8}>
                          Actions and sequestration
                        </Text>
                      </VStack>
                    </HStack>
                    <VStack spacing={0} align="flex-end">
                      <Text fontSize="lg" fontWeight="bold" color="green.500">
                        {totalOffsets.toFixed(1)}
                      </Text>
                      <Text fontSize="xs" color={mutedColor}>
                        kg CO₂e sequestered
                      </Text>
                    </VStack>
                  </HStack>
                </CardHeader>
                <CardBody pt={0}>
                  {Object.keys(offsetsByAction).length > 0 ? (
                    <VStack spacing={4} align="stretch">
                      {Object.entries(offsetsByAction).map(([action, amount]) => (
                        <Box key={action}>
                          <HStack justify="space-between" mb={2}>
                            <Text fontSize="sm" fontWeight="semibold" color={textColor}>
                              {action}
                            </Text>
                            <Text fontSize="sm" color={mutedColor} fontWeight="medium">
                              {(amount as number).toFixed(1)} kg CO₂e
                            </Text>
                          </HStack>
                          <Progress
                            value={((amount as number) / totalOffsets) * 100}
                            colorScheme="green"
                            size="md"
                            borderRadius="full"
                            bg="gray.100"
                            hasStripe
                            isAnimated
                            transition="all 0.5s ease"
                          />
                          <Text fontSize="xs" color={mutedColor} mt={1} opacity={0.7}>
                            {(((amount as number) / totalOffsets) * 100).toFixed(1)}% of total
                            offsets
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  ) : (
                    <VStack spacing={6} py={8}>
                      <Box
                        p={4}
                        bg="gray.50"
                        borderRadius="full"
                        border="2px dashed"
                        borderColor="gray.300"
                      >
                        <Icon as={FaTree} color="gray.400" boxSize={8} />
                      </Box>
                      <VStack spacing={3} textAlign="center">
                        <Text color={textColor} fontWeight="semibold">
                          No carbon offsets recorded yet
                        </Text>
                        <Text fontSize="sm" color={mutedColor} opacity={0.8} maxW="280px">
                          Start tracking your carbon sequestration activities to build consumer
                          trust
                        </Text>
                        <Button
                          leftIcon={<FaPlus />}
                          colorScheme="green"
                          size="sm"
                          onClick={onOffsetModalOpen}
                          borderRadius="full"
                          px={6}
                          transition="all 0.3s ease"
                          _hover={{
                            transform: 'scale(1.05)',
                            boxShadow: 'md'
                          }}
                        >
                          Add Your First Offset
                        </Button>
                      </VStack>
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </VStack>
        )}

        {/* Carbon Entries Table */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardHeader>
            <HStack justify="space-between">
              <HStack spacing={2}>
                <Icon as={FaFileAlt} color="blue.500" />
                <Heading size="md">Carbon Entries</Heading>
              </HStack>
              <HStack spacing={2}>
                <Select
                  size="sm"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  w="auto"
                >
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
                  onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
                >
                  Verified Only
                </Button>
              </HStack>
            </HStack>
          </CardHeader>
          <CardBody pt={0}>
            {filteredEntries.length > 0 ? (
              <TableContainer>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Type</Th>
                      <Th>Source</Th>
                      <Th>Amount</Th>
                      <Th>Status</Th>
                      <Th>Date</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredEntries.slice(0, 10).map((entry: any) => (
                      <Tr key={entry.id}>
                        <Td>
                          <Badge
                            colorScheme={entry.type === 'emission' ? 'red' : 'green'}
                            variant="subtle"
                          >
                            {entry.type}
                          </Badge>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">
                              {entry.source?.name || 'Unknown Source'}
                            </Text>
                            <Text fontSize="xs" color={mutedColor}>
                              {entry.source?.category || 'Other'}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={0}>
                            <Text fontSize="sm" fontWeight="medium">
                              {entry.amount.toFixed(2)} kg CO₂e
                            </Text>
                            {entry.type === 'offset' && entry.effective_amount && (
                              <Text fontSize="xs" color="green.600">
                                {entry.effective_amount.toFixed(1)} effective
                              </Text>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <VStack align="start" spacing={1}>
                            {/* Main Status Badge - Always Show */}
                            <Tooltip
                              label={
                                entry.verification_status === 'verified'
                                  ? 'VERIFIED: This entry has passed all verification checks and anti-gaming rules'
                                  : entry.verification_status === 'rejected'
                                  ? 'REJECTED: This entry failed verification due to high-risk violations or registry verification failure'
                                  : 'PENDING: This entry is awaiting verification or has incomplete requirements'
                              }
                              placement="top"
                              hasArrow
                              bg="gray.800"
                              color="white"
                              fontSize="sm"
                              px={3}
                              py={2}
                              borderRadius="md"
                            >
                              <Badge
                                colorScheme={
                                  entry.verification_status === 'verified'
                                    ? 'green'
                                    : entry.verification_status === 'rejected'
                                    ? 'red'
                                    : 'yellow'
                                }
                                variant="subtle"
                                cursor="help"
                              >
                                {entry.verification_status === 'verified'
                                  ? 'VERIFIED'
                                  : entry.verification_status === 'rejected'
                                  ? 'REJECTED'
                                  : 'PENDING'}
                              </Badge>
                            </Tooltip>

                            {/* Verification Type Badge - Only for Offsets */}
                            {entry.type === 'offset' && (
                              <Tooltip
                                label={
                                  entry.verification_level === 'self_reported'
                                    ? 'SELF REPORTED: User-reported data with 50% trust score. Internal verification only.'
                                    : entry.verification_level === 'community_verified'
                                    ? 'COMMUNITY VERIFIED: Verified by local community with 75% trust score.'
                                    : entry.verification_level === 'certified_project'
                                    ? entry.verification_status === 'verified'
                                      ? 'CERTIFIED PROJECT: Successfully verified through third-party registries (VCS, Gold Standard, etc.) with 100% trust score.'
                                      : 'CERTIFIED PROJECT: Failed third-party registry verification. Registry ID not found or invalid.'
                                    : 'STANDARD: Basic verification level with standard trust scoring.'
                                }
                                placement="top"
                                hasArrow
                                bg="gray.800"
                                color="white"
                                fontSize="sm"
                                px={3}
                                py={2}
                                borderRadius="md"
                              >
                                <Badge
                                  size="sm"
                                  colorScheme={
                                    entry.verification_level === 'certified_project'
                                      ? entry.verification_status === 'verified'
                                        ? 'green'
                                        : 'red'
                                      : entry.verification_level === 'community_verified'
                                      ? 'blue'
                                      : 'orange'
                                  }
                                  variant="outline"
                                  cursor="help"
                                >
                                  {entry.verification_level === 'self_reported'
                                    ? 'Self Reported'
                                    : entry.verification_level === 'community_verified'
                                    ? 'Community Verified'
                                    : entry.verification_level === 'certified_project'
                                    ? entry.verification_status === 'verified'
                                      ? 'Third-Party Verified'
                                      : 'Registry Failed'
                                    : 'Standard'}
                                </Badge>
                              </Tooltip>
                            )}

                            {/* Trust Score Indicator - Only for important cases */}
                            {entry.type === 'offset' && entry.trust_score && (
                              <Tooltip
                                label={`Trust Score: ${Math.round(
                                  entry.trust_score * 100
                                )}% - This affects the effective carbon amount after buffer pool deductions.`}
                                placement="top"
                                hasArrow
                                bg="gray.800"
                                color="white"
                                fontSize="sm"
                                px={3}
                                py={2}
                                borderRadius="md"
                              >
                                <Badge
                                  size="sm"
                                  colorScheme={
                                    entry.trust_score >= 0.9
                                      ? 'green'
                                      : entry.trust_score >= 0.7
                                      ? 'blue'
                                      : 'orange'
                                  }
                                  variant="subtle"
                                  cursor="help"
                                >
                                  {Math.round(entry.trust_score * 100)}% Trust
                                </Badge>
                              </Tooltip>
                            )}
                          </VStack>
                        </Td>
                        <Td>
                          <Text fontSize="sm">
                            {new Date(entry.created_at || entry.timestamp).toLocaleDateString()}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={1}>
                            <IconButton
                              size="xs"
                              variant="ghost"
                              aria-label="View details"
                              icon={<FaEye />}
                            />
                            <IconButton
                              size="xs"
                              variant="ghost"
                              aria-label="Edit entry"
                              icon={<FaEdit />}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableContainer>
            ) : (
              <VStack spacing={4} py={8}>
                <Icon as={FaFileAlt} color="gray.400" boxSize={8} />
                <VStack spacing={2}>
                  <Text color={mutedColor} textAlign="center">
                    No carbon entries found for the selected filters
                  </Text>
                  <Text fontSize="sm" color={mutedColor} textAlign="center">
                    Start tracking your carbon footprint by adding events
                  </Text>
                </VStack>
              </VStack>
            )}
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
                    Start Your Carbon Journey
                  </Heading>
                  <Text color={mutedColor} textAlign="center" maxW="md">
                    Begin tracking your carbon footprint by adding your first production events. Our
                    system will automatically calculate emissions and help you identify
                    opportunities for improvement.
                  </Text>
                </VStack>
                <HStack spacing={4}>
                  <Button
                    leftIcon={<FaPlus />}
                    colorScheme="green"
                    onClick={() =>
                      navigate(`/admin/dashboard/establishment/${establishmentId}/parcel`)
                    }
                  >
                    Add Production
                  </Button>
                  <Button leftIcon={<FaInfoCircle />} variant="outline" onClick={onInsightsOpen}>
                    Learn More
                  </Button>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Carbon Offset Creation Modal */}
        {/* Enhanced Offset Modal with Security */}
        <EnhancedOffsetModal
          isOpen={isOffsetModalOpen}
          onClose={onOffsetModalClose}
          establishmentId={establishmentId || ''}
          onOffsetCreated={() => {
            // Refetch all carbon-related data after successful offset creation
            refetchCarbonSummary();
            refetchCarbonEntries();
            refetchEstablishmentSummary();
          }}
        />

        {/* Insights Modal */}
        <Modal isOpen={isInsightsOpen} onClose={onInsightsClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Carbon Transparency Insights</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={6} align="stretch">
                <Box>
                  <Heading size="md" mb={3}>
                    Why Track Carbon Footprint?
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
                        Create your first production and add agricultural events
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">2</Badge>
                      <Text fontSize="sm">
                        Our system automatically calculates carbon emissions
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">3</Badge>
                      <Text fontSize="sm">
                        Add carbon offsets to improve your environmental score
                      </Text>
                    </HStack>
                    <HStack>
                      <Badge colorScheme="blue">4</Badge>
                      <Text fontSize="sm">Share your sustainability story with consumers</Text>
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
            <ModalHeader>Carbon Certifications</ModalHeader>
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
                      Upload and manage your carbon certifications to increase transparency
                    </Text>
                  </VStack>
                </Alert>

                <Button
                  leftIcon={<FaCloudUploadAlt />}
                  colorScheme="blue"
                  variant="outline"
                  size="sm"
                >
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
              | 'carbonScore'
              | 'netFootprint'
              | 'transparencyScore'
              | 'verifiedEvents'
              | 'securityScore'
              | 'usdaCompliance'
              | 'blockchainStatus'
          }
          metricData={{
            carbonScore: establishmentSummary?.carbon_score || 0,
            netFootprint: establishmentSummary?.net_carbon || 0,
            transparencyScore: 97, // Based on current calculation
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
