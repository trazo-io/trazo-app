import React, { useEffect, useState, Suspense } from 'react';
import {
  Box,
  Container,
  SimpleGrid,
  VStack,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  HStack,
  Circle,
  Icon,
  Heading,
  Text,
  Flex,
  Badge,
  Button,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Progress,
  Spinner,
  Skeleton,
  Link,
  Divider
} from '@chakra-ui/react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  extractProductionIdFromCurrentURL,
  verifySecureQR,
  getQRAccessMetadata
} from 'utils/qrParser';
import PhotoVerificationGallery from './components/PhotoVerificationGallery';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { setAuthRedirectAction } from '../../../utils/authRedirect';
import { MdTimeline, MdVerified } from 'react-icons/md';
import {
  FaLeaf,
  FaCertificate,
  FaChartLine,
  FaCheckCircle,
  FaSeedling,
  FaLink,
  FaShieldAlt,
  FaUsers,
  FaLock,
  FaEye,
  FaClock,
  FaGlobe,
  FaTint,
  FaBug,
  FaMapMarkerAlt,
  FaTractor,
  FaRocket,
  FaUniversity,
  FaClipboardCheck,
  FaAward,
  FaClipboardList,
  FaCalendarAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { BsStarFill, BsStarHalf, BsStar, BsShieldCheck } from 'react-icons/bs';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// API imports - Using single transparency API (consolidated from dual requests)
import { TransparencyCelebration } from '../../../components/Notifications/TransparencyCelebration';
import { useTransparencyCelebration } from '../../../hooks/useTransparencyCelebration';
import { useGetTransparencyDetailsQuery, useVerifyBlockchainIntegrityQuery } from '../../../store/api/transparencyQrApi';
import { HarvestInfoCard } from './components/HarvestInfoCard';

// Data normalization imports
import { normalizeBackendEventData } from '../../../utils/eventDataNormalizer';
import { StandardizedEvent } from '../../../types/standardizedEvents';

// Modern components (keeping the ones you like)
import { CarbonHeroSection } from '../../../components/QR/CarbonHeroSection';
import {
  ModernSidebar,
  UltraMobileProductionJourney,
  CompanyEstablishmentInfo
} from './components';
import InstantTrustDisplay from './components/InstantTrustDisplay';

// Other components
import { ModernTrazoLoader } from './components/ModernTrazoLoader';
import { ModernErrorState } from './components/ModernErrorState';
import {
  HeroShimmer,
  JourneyShimmer,
  TransparencyShimmer,
  SidebarShimmer
} from './components/TrazoShimmers';
import { usePointsStore } from '../../../store/pointsStore';
import { CarbonScore } from '../../../components/CarbonScore';
import { StandardImageGallery } from '../../../components/ImageGallery';
import QuickFeedback from '../../../components/ConsumerFeedback/QuickFeedback';
// Progressive loading for mobile performance - load heavy components only when needed
const EnhancedTransparencyScoreDisplay = React.lazy(() =>
  import('../../../components/Transparency').then((module) => ({
    default: module.EnhancedTransparencyScoreDisplay
  }))
);
const CarbonImpactExplainer = React.lazy(
  () => import('../../../components/Education/CarbonImpactExplainer')
);

// Lightweight loading components for progressive loading
const TransparencyScoreLoader = () => (
  <Card bg="white" shadow="lg" borderRadius="xl" p={6}>
    <VStack spacing={4}>
      <HStack spacing={3} justify="center">
        <Spinner size="md" color="green.500" />
        <Text fontSize="sm" color="gray.600">
          Loading transparency details...
        </Text>
      </HStack>
      <Skeleton height="100px" borderRadius="md" />
      <HStack spacing={4} w="full">
        <Skeleton height="60px" flex={1} borderRadius="md" />
        <Skeleton height="60px" flex={1} borderRadius="md" />
        <Skeleton height="60px" flex={1} borderRadius="md" />
      </HStack>
    </VStack>
  </Card>
);

const CarbonExplainerLoader = () => (
  <Card bg="white" shadow="lg" borderRadius="xl" p={6}>
    <VStack spacing={4}>
      <HStack spacing={3} justify="center">
        <Spinner size="md" color="green.500" thickness="3px" />
        <Text fontSize="sm" color="gray.600">
          Loading carbon impact details...
        </Text>
      </HStack>
      <Skeleton height="80px" borderRadius="md" />
      <HStack spacing={3} w="full">
        <Skeleton height="40px" flex={1} borderRadius="md" />
        <Skeleton height="40px" flex={1} borderRadius="md" />
      </HStack>
    </VStack>
  </Card>
);
import {
  EducationalTooltip,
  CO2eTooltip
} from '../../../components/Education/EducationalTooltip';

// Navigation Components
import { NavigationBottomBar } from '../../../components/Navigation/NavigationBottomBar';

// Educational modal content
const EducationModal = ({
  isOpen,
  onClose,
  topic
}: {
  isOpen: boolean;
  onClose: () => void;
  topic: string | null;
}) => {
  const getModalContent = () => {
    switch (topic) {
      case 'carbon_footprint':
        return {
          title: 'Carbon Footprint Scoring',
          content: (
            <VStack align="start" spacing={6}>
              <Text fontSize="lg" color="gray.700">
                <strong>Carbon scoring</strong> measures the total greenhouse gas emissions
                throughout the entire agricultural production lifecycle, from farm operations to
                your table.
              </Text>

              <Box>
                <Heading size="sm" mb={3} color="green.600">
                  How We Calculate Carbon Scores
                </Heading>
                <VStack align="start" spacing={3}>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="green.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Farm Operations (40%)</Text>
                      <Text fontSize="sm" color="gray.600">
                        Energy use, equipment efficiency, soil management, and fertilizer
                        application
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="blue.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Transportation (25%)</Text>
                      <Text fontSize="sm" color="gray.600">
                        Distance traveled, shipping method, and logistics efficiency
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="purple.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Processing & Packaging (20%)</Text>
                      <Text fontSize="sm" color="gray.600">
                        Manufacturing energy, packaging materials, and waste reduction
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="orange.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Land Use & Soil Health (15%)</Text>
                      <Text fontSize="sm" color="gray.600">
                        Carbon sequestration, biodiversity preservation, and regenerative practices
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>

              <Box>
                <Heading size="sm" mb={3} color="green.600">
                  Score Interpretation
                </Heading>
                <SimpleGrid columns={1} spacing={2}>
                  <HStack>
                    <Badge colorScheme="green" variant="solid">
                      90-100
                    </Badge>
                    <Text fontSize="sm">Exceptional - Leading sustainability practices</Text>
                  </HStack>
                  <HStack>
                    <Badge colorScheme="green" variant="outline">
                      70-89
                    </Badge>
                    <Text fontSize="sm">Good - Above average environmental performance</Text>
                  </HStack>
                  <HStack>
                    <Badge colorScheme="yellow" variant="solid">
                      50-69
                    </Badge>
                    <Text fontSize="sm">Fair - Meeting basic sustainability standards</Text>
                  </HStack>
                  <HStack>
                    <Badge colorScheme="orange" variant="solid">
                      30-49
                    </Badge>
                    <Text fontSize="sm">Needs Improvement - Below average performance</Text>
                  </HStack>
                </SimpleGrid>
              </Box>

              <Box bg="green.50" p={4} borderRadius="md" border="1px solid" borderColor="green.200">
                <Text fontSize="sm" fontWeight="medium">
                  🌱 <strong>Why It Matters:</strong> Lower carbon scores indicate more sustainable
                  farming practices that help combat climate change and preserve our environment for
                  future generations.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'blockchain_verification':
        return {
          title: 'Blockchain Verification',
          content: (
            <VStack align="start" spacing={6}>
              <Text fontSize="lg" color="gray.700">
                <strong>Blockchain verification</strong> provides immutable, transparent proof that
                the data you see is authentic and hasn't been tampered with.
              </Text>

              <Box>
                <Heading size="sm" mb={3} color="blue.600">
                  How Blockchain Protects Your Data
                </Heading>
                <VStack align="start" spacing={3}>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="blue.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Immutable Records</Text>
                      <Text fontSize="sm" color="gray.600">
                        Once data is recorded on the blockchain, it cannot be changed or deleted
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="purple.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Transparent Verification</Text>
                      <Text fontSize="sm" color="gray.600">
                        Anyone can verify the authenticity of the data using blockchain explorers
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="green.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Decentralized Trust</Text>
                      <Text fontSize="sm" color="gray.600">
                        No single entity controls the data - it's verified by the entire network
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>

              <Box bg="blue.50" p={4} borderRadius="md" border="1px solid" borderColor="blue.200">
                <Text fontSize="sm" fontWeight="medium">
                  🔒 <strong>Your Confidence:</strong> Higher verification scores mean more reliable
                  data you can trust for your purchasing decisions.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'carbon':
      case 'carbon-scoring':
        return {
          title: 'Carbon Impact Explained',
          content: (
            <VStack align="start" spacing={6}>
              <Text fontSize="lg" color="gray.700">
                Understanding the <strong>carbon impact</strong> of your food choices helps you make
                more sustainable decisions for our planet.
              </Text>

              <Box>
                <Heading size="sm" mb={3} color="green.600">
                  What Affects Carbon Footprint
                </Heading>
                <VStack align="start" spacing={3}>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="green.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Farming Practices</Text>
                      <Text fontSize="sm" color="gray.600">
                        Soil management, fertilizer use, and equipment efficiency
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="blue.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Transportation</Text>
                      <Text fontSize="sm" color="gray.600">
                        Distance from farm to your table and shipping methods
                      </Text>
                    </Box>
                  </HStack>
                  <HStack align="start" spacing={3}>
                    <Circle size="8px" bg="purple.500" mt={2} />
                    <Box>
                      <Text fontWeight="semibold">Processing & Packaging</Text>
                      <Text fontSize="sm" color="gray.600">
                        Energy used in processing and packaging materials
                      </Text>
                    </Box>
                  </HStack>
                </VStack>
              </Box>

              <Box bg="green.50" p={4} borderRadius="md" border="1px solid" borderColor="green.200">
                <Text fontSize="sm" fontWeight="medium">
                  🌱 <strong>Your Impact:</strong> Choosing lower carbon foods helps reduce
                  greenhouse gas emissions and supports sustainable farming practices.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'transparency_impact':
        return {
          title: 'Transparency Impact',
          content: (
            <VStack align="start" spacing={4}>
              <Text fontSize="lg" color="gray.700">
                <strong>Transparency</strong> creates accountability throughout the food supply
                chain, leading to better practices and more sustainable agriculture.
              </Text>
              <Text fontSize="md" color="gray.600">
                When farmers know their data is publicly visible, they're incentivized to adopt more
                sustainable practices and maintain higher standards.
              </Text>
              <Box bg="blue.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="blue.700">
                  💡 <strong>Impact:</strong> Transparency drives positive change across the entire
                  supply chain.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'trust_indicators':
        return {
          title: 'Why You Can Trust This Farm',
          content: (
            <VStack align="start" spacing={4}>
              <Text fontSize="lg" color="gray.700">
                <strong>Transparency builds trust.</strong> Every farming event on this page was
                documented by the farmer, creating a complete record of how your food was grown.
              </Text>
              <Text fontSize="md" color="gray.600">
                More documented events means more transparency. You can see exactly what happened
                at every step, from planting to harvest.
              </Text>
              <Box bg="green.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="green.700">
                  ✓ <strong>Documented journey:</strong> Look for farms with high transparency
                  scores and detailed event documentation.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'usda-methodology':
        return {
          title: 'Our Calculation Methodology',
          content: (
            <VStack align="start" spacing={4}>
              <Text fontSize="lg" color="gray.700">
                We use <strong>science-based methodologies</strong> for calculating environmental
                impact and sustainability metrics.
              </Text>
              <Text fontSize="md" color="gray.600">
                Our calculations use publicly available emission factors from EPA and agricultural
                research data to estimate the environmental impact of farming activities.
              </Text>
              <Box bg="blue.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="blue.700">
                  📊 <strong>Methodology:</strong> All calculations use peer-reviewed emission
                  factors from published government data sources.
                </Text>
              </Box>
            </VStack>
          )
        };

      case 'regional-benchmarks':
        return {
          title: 'Regional Benchmarks',
          content: (
            <VStack align="start" spacing={4}>
              <Text fontSize="lg" color="gray.700">
                <strong>Regional benchmarks</strong> help you understand how this farm compares to
                others in the same geographic area.
              </Text>
              <Text fontSize="md" color="gray.600">
                Climate, soil conditions, and local practices vary by region, so we compare farms
                against others with similar growing conditions.
              </Text>
              <Box bg="green.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="green.700">
                  📍 <strong>Context:</strong> Regional comparisons provide meaningful insights into
                  farm performance.
                </Text>
              </Box>
            </VStack>
          )
        };
      default:
        return {
          title: 'Learn More',
          content: <Text>Educational content coming soon!</Text>
        };
    }
  };

  const modalContent = getModalContent();

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>{modalContent.title}</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>{modalContent.content}</ModalBody>
      </ModalContent>
    </Modal>
  );
};

function ProductDetail() {
  const { productionId: urlProductionId } = useParams();
  const navigate = useNavigate();
  const intl = useIntl();
  // const pointsStore = usePointsStore(); // Unused for now

  // QR Security: Extract and verify production ID from URL
  const [verifiedProductionId, setVerifiedProductionId] = useState<string | null>(null);
  const [qrVerificationError, setQrVerificationError] = useState<string | null>(null);
  const [isVerifyingQR, setIsVerifyingQR] = useState(false);

  // Get QR access metadata for analytics
  // const qrMetadata = getQRAccessMetadata(); // Unused for now

  useEffect(() => {
    const verifyQRAccess = async () => {
      // Try to extract production ID from current URL (handles secure QR format)
      const parseResult = extractProductionIdFromCurrentURL();

      if (parseResult.isSecure) {
        // This is a secure QR code, verify it
        setIsVerifyingQR(true);

        try {
          const verification = await verifySecureQR(window.location.href);

          if (verification.valid && verification.productionId) {
            setVerifiedProductionId(verification.productionId);
          } else {
            setQrVerificationError(verification.error || 'Invalid QR code');
            console.error('❌ QR verification failed:', verification.error);
          }
        } catch (error) {
          setQrVerificationError('Unable to verify QR code');
          console.error('❌ QR verification error:', error);
        } finally {
          setIsVerifyingQR(false);
        }
      } else if (parseResult.isValid) {
        // This is a legacy QR code or direct URL access
        setVerifiedProductionId(parseResult.productionId || urlProductionId);
      } else {
        // Invalid URL format
        setQrVerificationError(parseResult.error || 'Invalid URL format');
        console.error('❌ Invalid URL format:', parseResult.error);
      }
    };

    verifyQRAccess();
  }, [urlProductionId]);

  // State for instant trust display (must be declared before useEffect)
  const [showInstantTrust, setShowInstantTrust] = useState(false);
  const [instantTrustShown, setInstantTrustShown] = useState(false);

  // Show instant trust display as soon as QR is verified, before full data loads
  useEffect(() => {
    if (verifiedProductionId && !qrVerificationError && !instantTrustShown) {
      // Small delay to allow QR verification UI to complete
      const timer = setTimeout(() => {
        setShowInstantTrust(true);
        setInstantTrustShown(true);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [verifiedProductionId, qrVerificationError, instantTrustShown]);

  // Use the verified production ID for API calls
  const productionId = verifiedProductionId;

  // Get authentication state from Redux store (same as Authenticated component)
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const currentUser = useSelector((state) => state.userState.user);

  // Helper function to check if user might be authenticated via cookies
  const checkAuthFromCookies = () => {
    // Check for common auth-related cookies that might indicate authentication
    const cookieString = document.cookie;
    // Look for session-related cookies that might indicate authentication
    const hasSessionCookie =
      cookieString.includes('sessionid') ||
      cookieString.includes('csrftoken') ||
      cookieString.includes('auth') ||
      cookieString.includes('user');

    return hasSessionCookie;
  };

  // For public routes, check multiple sources for authentication
  const hasAuthCookies = checkAuthFromCookies();
  const finalIsAuthenticated = Boolean(currentUser?.id) || hasAuthCookies;
  const finalCurrentUser = currentUser;

  // Get full Redux state for debugging
  // const fullReduxState = useSelector((state) => state); // Unused for now

  // Theme colors - Mobile Optimized
  // const bgColor = useColorModeValue('gray.50', 'gray.900'); // Unused for now
  // const textColor = useColorModeValue('gray.800', 'white'); // Unused for now
  // const headerFontSize = { base: 'lg', sm: 'xl', md: '2xl', lg: '3xl' }; // Unused for now

  // API query - CONSOLIDATED: Using single transparency API call
  // ✅ 2025 OPTIMIZATION: Removed duplicate useGetCompleteSummaryQuery
  // Both timeline and transparency data now come from single endpoint
  const {
    data: completeData,
    error: completeError,
    isLoading: isCompleteLoading
  } = useGetTransparencyDetailsQuery(productionId || '', {
    skip: !productionId,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false
  });

  // Blockchain integrity check — runs whenever production is finalized (has finalization_hash)
  // OR has blockchain data (tx_hash). This closes the gap between finalization and
  // monthly batch submission: Layer 1 (event hash check) works immediately at finalization.
  const blockchainVerification = (completeData as any)?.blockchain_verification;
  const canVerifyIntegrity = !!(blockchainVerification?.tx_hash || blockchainVerification?.is_finalized);
  const {
    data: integrityData,
    isLoading: isIntegrityLoading
  } = useVerifyBlockchainIntegrityQuery(productionId || '', {
    skip: !productionId || !canVerifyIntegrity
  });

  // Helper function to get proper transparency score from backend TransparencyCalculator
  const getTransparencyScore = (): number => {
    // ✅ 2025 BEST PRACTICE: Single source of truth - transparency API
    // Consolidated from dual API approach to single transparency endpoint

    if (completeData?.quick_view?.transparency_score?.percentage !== undefined) {
      return completeData.quick_view.transparency_score.percentage;
    }

    console.warn('⚠️ Transparency API not ready - showing loading state');
    return 0; // Triggers loading state in UI instead of inconsistent score
  };

  // Helper function for consistent consumer-facing display (whole numbers)
  const getDisplayTransparencyScore = (): number => {
    const rawScore = getTransparencyScore(); // Get precise backend score (e.g., 12.5)
    return Math.round(rawScore); // Round for consumer display (e.g., 13)
  };

  // Helper function to calculate blockchain verification score
  const getBlockchainScore = (): {
    score: number;
    isVerified: boolean;
    txHash?: string;
    isTampered?: boolean;
    isPending?: boolean;
    isIntegrityChecked?: boolean;
  } => {
    const blockchainData = (completeData as any)?.blockchain_verification;

    // If integrity check detected tampering, override everything — even during pending window
    if (integrityData?.data_integrity === 'tampered') {
      return { score: 0, isVerified: false, txHash: blockchainData?.tx_hash, isTampered: true, isIntegrityChecked: true };
    }

    // Production is on-chain and verified
    if (blockchainData?.tx_hash && blockchainData?.verified) {
      const isIntegrityChecked = integrityData?.data_integrity === 'intact';
      return { score: 20, isVerified: true, txHash: blockchainData.tx_hash, isIntegrityChecked };
    }

    // Production is finalized but not yet on-chain (the gap window)
    // Layer 1 integrity check still works — show "sealed & pending" state
    if (blockchainData?.is_finalized && !blockchainData?.tx_hash) {
      const isIntegrityChecked = integrityData?.data_integrity === 'intact';
      return { score: 10, isVerified: false, isPending: true, isIntegrityChecked };
    }

    const timeline = completeData?.timeline || [];
    if (timeline.length === 0) {
      return { score: 0, isVerified: false };
    }

    // Count events that are blockchain verified
    const verifiedEvents = timeline.filter(
      (event) =>
        (event as any).blockchain_verified &&
        (event as any).blockchain_transaction &&
        (event as any).blockchain_transaction.trim() !== ''
    );

    // Calculate percentage of verified events out of total events
    const verificationPercentage = (verifiedEvents.length / timeline.length) * 100;

    // Convert to 20-point scale (max score is 20)
    const score = Math.round((verificationPercentage / 100) * 20);

    // Consider it verified if more than 50% of events are blockchain verified
    const isVerified = verificationPercentage > 50;

    return { score, isVerified, txHash: blockchainData?.tx_hash };
  };

  // Helper function to get accurate carbon footprint
  const getAccurateCarbonFootprint = (): number => {
    // Use transparency API carbon data (consolidated endpoint)
    if (completeData?.carbon_impact?.net_impact !== undefined) {
      return completeData.carbon_impact.net_impact;
    }

    // Fallback to total emissions
    if (completeData?.carbon_impact?.total_emissions !== undefined) {
      return completeData.carbon_impact.total_emissions;
    }

    return 0;
  };

  // Educational modal
  const {
    isOpen: isEducationOpen,
    onOpen: onEducationOpen,
    onClose: onEducationClose
  } = useDisclosure();
  const [educationTopic, setEducationTopic] = useState<string | null>(null);

  // Transparency celebration system
  const celebrationTransparencyData = completeData
    ? {
        transparencyScore: getTransparencyScore(),
        farmName: completeData?.farmer?.name,
        productName: completeData?.product?.name,
        eventsDocumented: completeData?.timeline?.length || 0,
        photoCount: undefined, // Only show if actual photo data available from API
        isUSDAVerified: completeData?.isUsdaVerified || false,
        isBlockchainVerified: getBlockchainScore().isVerified,
        isTrazoVerified: getTransparencyScore() >= 80,
        scansCount: completeData?.scansCount, // Load from API
        farmHistory: completeData?.farmHistory // Load from API
      }
    : null;

  const { showCelebration, celebrationData, triggerType, closeCelebration } =
    useTransparencyCelebration(celebrationTransparencyData, {
      minScoreForCelebration: 70,
      celebrateOnScan: true,
      showCelebrationOnce: true
    });

  // Navigation state - TRANSPARENCY FIRST
  const [activeSection, setActiveSection] = useState('transparency');
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const handleEducationOpen = (topic: string) => {
    setEducationTopic(topic);
    onEducationOpen();
  };

  // Navigation active section detection
  useEffect(() => {
    const handleScroll = () => {
      // Don't update if user is actively navigating
      if (isUserScrolling) return;

      const sections = [
        { id: 'transparency', element: document.getElementById('transparency-section') },
        { id: 'carbon', element: document.getElementById('carbon-section') },
        { id: 'farm', element: document.getElementById('farm-section') },
        { id: 'reviews', element: document.getElementById('reviews-section') }
      ];

      const scrollPosition = window.scrollY + 200; // Offset for header

      for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        if (section.element && section.element.offsetTop <= scrollPosition) {
          setActiveSection(section.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, [isUserScrolling]);

  // ⚠️ TRANSPARENCY FIX: Only show real reputation data, never default to 4.2
  // If reputation is missing, pass undefined so component can show "No ratings yet"
  const safeReputation =
    (completeData as any)?.reputation !== undefined
      ? Math.max(0, Math.min(5, (completeData as any)?.reputation))
      : undefined;

  // QR Verification loading state
  if (isVerifyingQR) {
    return <ModernTrazoLoader loadingStage="scanning" />;
  }

  // QR Verification error state
  if (qrVerificationError) {
    return (
      <ModernErrorState
        type="qr_verification"
        message={qrVerificationError}
        onRetry={() => window.location.reload()}
      />
    );
  }

  // Loading state - show instant trust if available, otherwise show shimmers
  if (isCompleteLoading || !productionId) {
    return (
      <Flex
        direction="column"
        pt="145px"
        alignSelf="center"
        justifySelf="center"
        overflow="hidden"
        w="100%"
      >
        <HeroShimmer />
        {/* Main content with shimmer layout */}
        <Container maxW="container.xl" py={8} centerContent>
          <Box w="100%" maxW="container.lg">
            <VStack spacing={6}>
              <JourneyShimmer />
              <TransparencyShimmer />
            </VStack>
          </Box>
        </Container>
      </Flex>
    );
  }

  // Error state
  if (completeError) {
    const error = completeError as any;
    const errorType = error?.status === 404 ? 'not_found' : 'network';

    return (
      <ModernErrorState
        type={errorType}
        title={errorType === 'not_found' ? 'Product Not Found' : 'Unable to Load Product'}
        message={
          errorType === 'not_found'
            ? 'This product information is not available. Please verify the QR code and try again.'
            : 'Please check your connection and try again, or scan a different product.'
        }
        onRetry={() => window.location.reload()}
      />
    );
  }

  // No data state
  if (!completeData) {
    return (
      <ModernErrorState
        type="not_found"
        title="No Product Data Available"
        message="Please scan a valid QR code to view product information."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Flex direction="column" alignSelf="center" justifySelf="center" overflow="hidden" w="100%">
      {/* Transparency Hero Section - Primary Navigation Target */}
      <Box id="transparency-section">
        <CarbonHeroSection
          carbonData={{
            // PRIMARY: Use backend TransparencyCalculator score (crop-specific expected events)
            score: getDisplayTransparencyScore(),
            footprint: getAccurateCarbonFootprint(),
            relatableFootprint: completeData?.relatableFootprint,
            // Remove competitive rankings - transparency-first approach
            industryPercentile: undefined,
            grade: undefined,
            level: 'transparency' // Signal this is transparency, not carbon
          }}
          trustData={{
            confidenceScore: getDisplayTransparencyScore(),
            isUSDAVerified: completeData?.isUsdaVerified || false,
            isBlockchainVerified: getBlockchainScore().isVerified,
            reviewsCount: 0,
            // ⚠️ TRANSPARENCY FIX: Pass undefined instead of fake 4.2 rating
            averageRating: safeReputation,
            scansCount: 0,
            transparencyScore: getDisplayTransparencyScore()
          }}
          productData={{
            name: (completeData as any)?.product?.name || 'Product',
            company: {
              name: (completeData as any)?.farmer?.name || 'Farm'
            },
            reputation: (completeData as any)?.reputation || 0
          }}
          isLoading={isCompleteLoading}
          onLearnMore={() => handleEducationOpen('transparency_impact')}
        />
      </Box>
      {/* Main Content Section */}
      <Container maxW="container.xl" py={8} centerContent>
        <Box w="100%" maxW="container.lg" >
          {/* Main Content Column */}
          <Box>
            <VStack spacing={8} align="stretch">
              {/* Consumer Welcome & Introduction Section */}
              <Box
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                overflow="hidden"
              >
                <Box bg="linear-gradient(135deg, green.50, blue.50)" p={6} textAlign="center">
                  <VStack spacing={4}>
                    <Circle size="60px" bg="green.100">
                      <Icon as={FaLeaf} color="green.500" boxSize={8} />
                    </Circle>
                    <VStack spacing={2}>
                      <Heading size="lg" color="gray.800">
                        Complete Farm Transparency
                      </Heading>
                      <Text color="gray.600" fontSize="lg" maxW="md">
                        You've scanned a product with comprehensive farm documentation and verified
                        transparency.
                      </Text>
                    </VStack>
                  </VStack>
                </Box>
                <Box p={6}>
                  <VStack spacing={4} textAlign="center">
                    <Text color="gray.700" fontSize="md">
                      <strong>Complete transparency you can trust:</strong>
                    </Text>
                    <SimpleGrid columns={2} spacing={4} w="full" maxW="md">
                      <HStack spacing={2}>
                        <Icon as={FaClipboardCheck} color="green.500" boxSize={4} />
                        <Text fontSize="sm">Complete records</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Icon as={FaCalendarAlt} color="blue.500" boxSize={4} />
                        <Text fontSize="sm">Timestamped events</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Icon as={FaShieldAlt} color="purple.500" boxSize={4} />
                        <Text fontSize="sm">Authentic tracking</Text>
                      </HStack>
                      <HStack spacing={2}>
                        <Icon as={FaLeaf} color="green.500" boxSize={4} />
                        <Text fontSize="sm">Environmental impact</Text>
                      </HStack>
                    </SimpleGrid>
                    <Text color="gray.600" fontSize="sm" fontStyle="italic">
                      Honest farm documentation rewarded with transparency certification.
                    </Text>
                  </VStack>
                </Box>
              </Box>

              {/* Transparency Achievement Badges - NEW Transparency-First Approach */}
              <Box
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                overflow="hidden"
              >
                <Box bg="linear-gradient(135deg, green.50, blue.50)" p={6}>
                  <VStack spacing={4}>
                    <HStack spacing={3} justify="center">
                      <Icon as={FaAward} color="green.500" boxSize={6} />
                      <Heading size="md" color="gray.800">
                        Transparency Achievement
                      </Heading>
                    </HStack>

                    {(() => {
                      const timelineCount = completeData?.timeline?.length || 0;
                      // ✅ FIX: Use API transparency score (single source of truth), not local calculation
                      const transparencyPercentage = getDisplayTransparencyScore();

                      if (transparencyPercentage >= 90) {
                        return (
                          <VStack spacing={2}>
                            <Badge
                              colorScheme="green"
                              variant="solid"
                              fontSize="md"
                              p={2}
                              borderRadius="lg"
                            >
                              🏆 Complete Transparency Champion
                            </Badge>
                            <Text color="gray.700" fontSize="sm" textAlign="center">
                              Outstanding documentation with {timelineCount} verified events
                            </Text>
                          </VStack>
                        );
                      } else if (transparencyPercentage >= 70) {
                        return (
                          <VStack spacing={2}>
                            <Badge
                              colorScheme="green"
                              variant="outline"
                              fontSize="md"
                              p={2}
                              borderRadius="lg"
                            >
                              ⭐ Transparency Leader
                            </Badge>
                            <Text color="gray.700" fontSize="sm" textAlign="center">
                              Excellent documentation with {timelineCount} verified events
                            </Text>
                          </VStack>
                        );
                      } else if (transparencyPercentage >= 50) {
                        return (
                          <VStack spacing={2}>
                            <Badge
                              colorScheme="yellow"
                              variant="solid"
                              fontSize="md"
                              p={2}
                              borderRadius="lg"
                            >
                              📋 Good Documentation
                            </Badge>
                            <Text color="gray.700" fontSize="sm" textAlign="center">
                              Solid tracking with {timelineCount} verified events
                            </Text>
                          </VStack>
                        );
                      } else {
                        return (
                          <VStack spacing={2}>
                            <Badge
                              colorScheme="gray"
                              variant="solid"
                              fontSize="md"
                              p={2}
                              borderRadius="lg"
                            >
                              🌱 Building Transparency
                            </Badge>
                            <Text color="gray.700" fontSize="sm" textAlign="center">
                              Growing documentation with {timelineCount} events recorded
                            </Text>
                          </VStack>
                        );
                      }
                    })()}
                  </VStack>
                </Box>

                <Box p={6}>
                  <HStack spacing={4} justify="center" flexWrap="wrap">
                    <VStack spacing={1}>
                      <Text fontSize="2xl" fontWeight="bold" color="green.600">
                        {getDisplayTransparencyScore()}%
                      </Text>
                      <Text fontSize="xs" color="gray.600" textAlign="center">
                        Documentation
                      </Text>
                    </VStack>
                    <VStack spacing={1}>
                      <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                        {completeData?.timeline?.length || 0}
                      </Text>
                      <Text fontSize="xs" color="gray.600" textAlign="center">
                        Events Tracked
                      </Text>
                    </VStack>
                    <VStack spacing={1}>
                      <Icon as={FaClipboardList} boxSize={7} color="green.600" />
                      <Text fontSize="xs" color="gray.600" textAlign="center">
                        Farm Documented
                      </Text>
                    </VStack>
                  </HStack>

                  <Box
                    mt={4}
                    p={3}
                    bg="green.50"
                    borderRadius="md"
                    borderLeft="3px solid"
                    borderLeftColor="green.500"
                  >
                    <Text fontSize="sm" color="green.800">
                      💡 <strong>Why transparency matters:</strong> Complete documentation helps
                      consumers trust authentic farming practices and supports farmers who share
                      their full story.
                    </Text>
                  </Box>
                </Box>
              </Box>

              {/* Consumer-Friendly Carbon Impact Explainer - Progressive Loading */}
              <Suspense fallback={<CarbonExplainerLoader />}>
                <CarbonImpactExplainer
                  carbonScore={getDisplayTransparencyScore()}
                  totalCO2e={getAccurateCarbonFootprint()}
                  productName={completeData?.product?.name || completeData?.farmer?.name}
                  relatableFootprint={completeData?.relatableFootprint}
                />
              </Suspense>

              {/* Farm Story Highlights - Consumer-Friendly */}
              <Box
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                p={6}
                shadow="sm"
                mb={6}
              >
                <VStack align="start" spacing={4}>
                  <Flex align="center" justify="space-between" w="full">
                    <Heading size="md" color="gray.800">
                      🌱 How This Food Was Grown
                    </Heading>
                    <Badge
                      colorScheme="green"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight="semibold"
                    >
                      {getDisplayTransparencyScore()}% Transparent
                    </Badge>
                  </Flex>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                    {/* Farming Practices */}
                    <HStack align="start" spacing={3}>
                      <Icon as={FaSeedling} color="green.500" size="20px" mt={1} />
                      <Box>
                        <Text fontWeight="semibold" color="gray.800">
                          {completeData?.timeline?.length || 0} Farming Events Documented
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          From planting to harvest, every step tracked
                        </Text>
                      </Box>
                    </HStack>

                    {/* Verification Status */}
                    <HStack align="start" spacing={3}>
                      <Icon
                        as={FaCertificate}
                        color="green.500"
                        size="20px"
                        mt={1}
                      />
                      <Box>
                        <Text fontWeight="semibold" color="gray.800">
                          Documented Farm Journey
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Farmer-documented practices from planting to harvest
                        </Text>
                      </Box>
                    </HStack>

                    {/* Photos & Evidence */}
                    <HStack align="start" spacing={3}>
                      <Icon as={FaCheckCircle} color="green.500" size="20px" mt={1} />
                      <Box>
                        <Text fontWeight="semibold" color="gray.800">
                          {(() => {
                            // Count actual photos from events with albums
                            const events = completeData?.timeline || [];
                            const eventsWithPhotos = events.filter(
                              (event: any) => event.album || event.hasAlbum
                            );
                            return eventsWithPhotos.length;
                          })()}{' '}
                          Photos Included
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          Visual proof of sustainable practices
                        </Text>
                      </Box>
                    </HStack>

                    {/* Blockchain Security — four states: tampered, verified, pending (sealed), not finalized */}
                    {(() => {
                      const blockchain = getBlockchainScore();

                      // STATE 1: Tamper detected (Layer 1 or Layer 2) — red warning
                      if (blockchain.isTampered) {
                        return (
                          <Box
                            bg="red.50"
                            p={3}
                            borderRadius="md"
                            border="1px solid"
                            borderColor="red.300"
                          >
                            <HStack align="start" spacing={3}>
                              <Icon
                                as={FaExclamationTriangle}
                                color="red.500"
                                boxSize="20px"
                                mt={1}
                              />
                              <Box>
                                <Text fontWeight="bold" color="red.700">
                                  Data Integrity Warning
                                </Text>
                                <Text fontSize="sm" color="red.600">
                                  {integrityData?.data_integrity_detail ||
                                    'Production data may have been modified after finalization'}
                                </Text>
                                {blockchain.txHash && (
                                  <Link
                                    href={`${import.meta.env.VITE_POLYGON_EXPLORER_URL || 'https://polygonscan.com'}/tx/${blockchain.txHash}`}
                                    isExternal
                                    fontSize="xs"
                                    color="red.500"
                                    mt={1}
                                    display="inline-block"
                                  >
                                    Verify on Explorer ↗
                                  </Link>
                                )}
                              </Box>
                            </HStack>
                          </Box>
                        );
                      }

                      // STATE 2: Fully verified on-chain — purple shield
                      if (blockchain.isVerified) {
                        return (
                          <HStack align="start" spacing={3}>
                            <Icon as={FaShieldAlt} color="purple.500" boxSize="20px" mt={1} />
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">
                                Blockchain Protected
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {blockchain.isIntegrityChecked
                                  ? 'Data integrity verified on blockchain'
                                  : 'Data permanently secured on blockchain'}
                              </Text>
                              {blockchain.txHash && (
                                <Link
                                  href={`${import.meta.env.VITE_POLYGON_EXPLORER_URL || 'https://polygonscan.com'}/tx/${blockchain.txHash}`}
                                  isExternal
                                  fontSize="xs"
                                  color="purple.500"
                                  mt={1}
                                  display="inline-block"
                                >
                                  View on Explorer ↗
                                </Link>
                              )}
                            </Box>
                          </HStack>
                        );
                      }

                      // STATE 3: Sealed (finalized) but not yet on blockchain — blue lock
                      if (blockchain.isPending) {
                        return (
                          <HStack align="start" spacing={3}>
                            <Icon as={FaShieldAlt} color="blue.500" boxSize="20px" mt={1} />
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">
                                Data Sealed
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {blockchain.isIntegrityChecked
                                  ? 'All events cryptographically sealed — blockchain submission in progress'
                                  : 'Production finalized — preparing for blockchain verification'}
                              </Text>
                            </Box>
                          </HStack>
                        );
                      }

                      // STATE 4: Not finalized yet — gray
                      return (
                        <HStack align="start" spacing={3}>
                          <Icon as={FaShieldAlt} color="gray.400" boxSize="20px" mt={1} />
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">
                              Not Yet Verified
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              Production in progress — verification available after completion
                            </Text>
                          </Box>
                        </HStack>
                      );
                    })()}
                  </SimpleGrid>

                  {/* Farm Information */}
                  <Box
                    bg="green.50"
                    p={4}
                    borderRadius="lg"
                    border="1px solid"
                    borderColor="green.200"
                    w="full"
                  >
                    <Text fontSize="sm" color="green.800" fontWeight="medium">
                      🏡 <strong>Farm:</strong> {completeData?.farmer?.name || 'Sustainable Farm'} •
                      📅 <strong>Harvest:</strong>{' '}
                      {completeData?.created_at
                        ? new Date(completeData.created_at).toLocaleDateString()
                        : 'Recently harvested'}
                    </Text>
                  </Box>
                </VStack>
              </Box>

              {/* Batch Details Card - Production traceability info */}
              {completeData?.harvestDetails && (
                <HarvestInfoCard harvestDetails={completeData.harvestDetails} />
              )}

              {/* Production Images Gallery - Visual proof of farming practices */}
              {completeData?.images && completeData.images.length > 0 && (
                <Box
                  bg="white"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  p={6}
                  mb={6}
                >
                  <StandardImageGallery
                    images={completeData.images}
                    title="Production Photos"
                    variant="consumer"
                    enablePreview={true}
                    showImageCount={true}
                    maxDisplayImages={3}
                    aspectRatio="16/9"
                  />
                </Box>
              )}

              <Divider borderColor="gray.200" />

              {/* Production Journey - Carbon Impact Section */}
              <Box id="carbon-section">
                <VStack spacing={4} align="stretch">
                  {(() => {
                    // PRIORITY 1: Use complete API timeline (includes transparency fields) if it has events
                    // Get timeline events from consolidated transparency API response
                    const events = completeData?.timeline || [];

                    if (Array.isArray(events) && events.length > 0) {
                      // Calculate carbon data per event from the total production data
                      const totalEvents = events.length;
                      const totalCO2e = getAccurateCarbonFootprint(); // Use accurate carbon data (transparency API preferred)
                      const averageCO2ePerEvent = totalEvents > 0 ? totalCO2e / totalEvents : 0;

                      // Helper function to map backend type strings to numeric event_type
                      // This handles both transparency API format (FR, DR, HL, etc.) and other formats
                      const mapBackendTypeToEventType = (backendType: string): number => {
                        if (!backendType) return 3; // Default to general events (not 8 which doesn't exist)

                        const typeStr = backendType.toLowerCase();

                        // Handle weather event subtypes from transparency API (FR=Frost, DR=Drought, HL=Hailstorm, etc.)
                        if (['fr', 'dr', 'hl', 'ht', 'ts', 'hw', 'hh', 'lh'].includes(typeStr)) {
                          return 0; // Weather events
                        }

                        // Handle other type mappings
                        if (
                          typeStr.includes('weather') ||
                          typeStr.includes('frost') ||
                          typeStr.includes('drought')
                        )
                          return 0;
                        if (
                          typeStr.includes('production') ||
                          typeStr.includes('planting') ||
                          typeStr.includes('harvest') ||
                          ['pl', 'ha', 'ir', 'pr', 'tr', 'cu', 'th', 'em'].includes(typeStr) // ✅ FIXED: Added 'cu', 'th', 'em' (Equipment Maintenance)
                        )
                          return 1;
                        if (
                          typeStr.includes('chemical') ||
                          typeStr.includes('fertilizer') ||
                          typeStr.includes('pesticide') ||
                          ['fe', 'pe', 'fu', 'he'].includes(typeStr)
                        )
                          return 2;
                        if (typeStr.includes('general')) return 3;
                        if (
                          typeStr.includes('equipment') ||
                          typeStr.includes('fuel') ||
                          typeStr.includes('machinery') ||
                          ['fc', 'mn', 're', 'ca', 'bd', 'ei'].includes(typeStr)
                        )
                          return 4;
                        if (
                          typeStr.includes('soil') ||
                          typeStr.includes('tillage') ||
                          typeStr.includes('compost') ||
                          ['st', 'pa', 'om', 'cc', 'ti', 'co'].includes(typeStr)
                        )
                          return 5;
                        if (
                          typeStr.includes('pest') ||
                          typeStr.includes('beneficial') ||
                          typeStr.includes('ipm') ||
                          ['sc', 'tm', 'br', 'pi', 'ta', 'ip'].includes(typeStr)
                        )
                          return 6;
                        if (
                          typeStr.includes('business') ||
                          typeStr.includes('certification') ||
                          typeStr.includes('audit') ||
                          ['ce', 'cm', 'in'].includes(typeStr)
                        )
                          return 7;

                        return 3; // Default to general events (types 0-7 only)
                      };

                      // Use standardized event normalization instead of manual mapping
                      const timelineEvents = events.map((event, index) => {
                        // For transparency API: use string type mapping (FR, DR, HL, etc.)
                        // For complete API: use numeric event_type directly if available
                        const eventType =
                          event.event_type !== undefined
                            ? event.event_type
                            : mapBackendTypeToEventType(event.type || 'general');

                        // For weather events from transparency API, map the type to weather_type
                        const eventForNormalization = { ...event };
                        if (eventType === 0 && event.type && !event.weather_type) {
                          eventForNormalization.weather_type = event.type; // FR, DR, HL, etc.
                          eventForNormalization.event_type = 0; // Explicitly set event_type for weather
                        }

                        // Ensure album data is preserved - CRITICAL: Don't modify album structure here
                        // The normalizer should preserve album data as-is from backend
                        // eventForNormalization.album = event.album; // Let normalizer handle this

                        // 🔧 COMPREHENSIVE FIX: Add missing chemical event fields for ALL chemical events with missing data
                        const eventId = String(event.id || '').replace(/^chemical_/, '');

                        // 🔧 IMPROVED CONDITION: Check for empty strings AND null/undefined
                        const isChemicalEventMissingFields =
                          ((!event.application_method || event.application_method === '') &&
                            (!event.way_of_application || event.way_of_application === '')) ||
                          !event.application_timing ||
                          event.application_timing === '' ||
                          ((!event.area || event.area === '') &&
                            (!event.area_covered || event.area_covered === ''));

                        if (isChemicalEventMissingFields && eventType === 2) {
                          // No hardcoded fallbacks - let fields be empty if missing from backend
                          // This ensures we only display real data, never dummy data

                          // 🔧 CRITICAL FIX: Ensure BOTH application_method fields are set for mapping system
                          // The field mapping system has both 'way_of_application' and 'application_method' mapping to the same target
                          // Copy between fields to ensure mapping system works, but never add dummy data
                          if (
                            eventForNormalization.way_of_application &&
                            !eventForNormalization.application_method
                          ) {
                            // Backend has way_of_application, copy it to application_method for mapping system
                            eventForNormalization.application_method =
                              eventForNormalization.way_of_application;
                          } else if (
                            eventForNormalization.application_method &&
                            !eventForNormalization.way_of_application
                          ) {
                            // Backend has application_method, copy it to way_of_application for mapping system
                            eventForNormalization.way_of_application =
                              eventForNormalization.application_method;
                          }
                        }

                        // Normalize backend data to standardized format
                        const standardizedEvent = normalizeBackendEventData(
                          eventType,
                          eventForNormalization,
                          {
                            preserveOriginal: false,
                            generateMockVerification: false
                          }
                        ) as StandardizedEvent & {
                          carbon_data?: any;
                          index?: number;
                          albums?: any;
                        };
                        // Add additional fields that UltraMobileProductionJourney expects
                        return {
                          ...standardizedEvent,
                          index: index,
                          // CRITICAL FIX: Preserve original album data from backend response
                          album: event.album,
                          albums: event.albums || (event.album ? [event.album] : undefined),
                          // Preserve verification_level so ConsumerEventCard can show photo gallery
                          verification_level: (event as any).verification_level,
                          // Add carbon data that UltraMobileProductionJourney expects
                          carbon_data: {
                            co2e: averageCO2ePerEvent,
                            usda_factors_used: completeData?.isUsdaVerified || false,
                            efficiency_score: completeData?.carbonScore || 0,
                            total_emissions: completeData?.totalEmissions || 0,
                            total_offsets: completeData?.totalOffsets || 0,
                            net_footprint: getAccurateCarbonFootprint(),
                            verification_confidence: ((event as any).verification_confidence
                              ? 'high'
                              : 'low') as 'high' | 'medium' | 'low',
                            cost_analysis: (event as any).cost_analysis || {}
                          }
                        };
                      });
                      return (
                        <UltraMobileProductionJourney
                          events={timelineEvents}
                          transparencyScore={getDisplayTransparencyScore()}
                          productionBlockchain={(completeData as any)?.blockchain_verification}
                        />
                      );
                    } else {
                      return (
                        <VStack spacing={3} py={8}>
                          <Icon as={MdTimeline} boxSize={16} color="gray.400" />
                          <Heading as="h4" size="md" color="gray.600">
                            {intl.formatMessage({ id: 'app.noTimelineData' }) ||
                              'No events recorded yet'}
                          </Heading>
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            {intl.formatMessage({ id: 'app.timelineComingSoon' }) ||
                              'Production journey details will be available soon'}
                          </Text>
                        </VStack>
                      );
                    }
                  })()}
                </VStack>
              </Box>
            </VStack>
          </Box>
        </Box>

        {/* Additional Information Sections */}
        <VStack spacing={8} mt={8} w="100%" maxW="container.lg">
          <Divider borderColor="gray.200" />

          {/* Producer Information Transition Section */}
          <Box
            bg="white"
            borderRadius="xl"
            border="1px solid"
            borderColor="gray.200"
            p={6}
            textAlign="center"
          >
            <VStack spacing={4}>
              <HStack spacing={3} justify="center">
                <Icon as={FaTractor} color="green.500" boxSize={6} />
                <Icon as={FaUsers} color="blue.500" boxSize={6} />
                <Icon as={FaMapMarkerAlt} color="orange.500" boxSize={6} />
              </HStack>

              <VStack spacing={2}>
                <Heading size="md" color="gray.800">
                  Meet Your Transparent Farmers
                </Heading>
                <Text color="gray.600" maxW="md" fontSize="sm">
                  Now discover the people, places, and practices behind your product. Every detail
                  is documented with complete transparency from farm to your table.
                </Text>
              </VStack>

              <HStack spacing={6} fontSize="xs" color="gray.500" flexWrap="wrap" justify="center">
                <HStack spacing={1}>
                  <Icon as={FaUsers} boxSize={3} />
                  <Text>Transparent Producer</Text>
                </HStack>
                <HStack spacing={1}>
                  <Icon as={FaUniversity} boxSize={3} />
                  <Text>Verified Farm</Text>
                </HStack>
                <HStack spacing={1}>
                  <Icon as={FaMapMarkerAlt} boxSize={3} />
                  <Text>Location</Text>
                </HStack>
                <HStack spacing={1}>
                  <Icon as={FaCertificate} boxSize={3} />
                  <Text>Documented Practices</Text>
                </HStack>
              </HStack>
            </VStack>
          </Box>

          {/* Company Establishment Info - Farm Section */}
          <Box id="farm-section">
            <CompanyEstablishmentInfo
              companyData={{
                // Use company data from the enhanced API response
                id: (completeData as any)?.farmer?.company?.id,
                name: (completeData as any)?.farmer?.company?.name || 'Company Information',
                description: (completeData as any)?.farmer?.company?.description,
                address: (completeData as any)?.farmer?.company?.address,
                city: (completeData as any)?.farmer?.company?.city,
                state: (completeData as any)?.farmer?.company?.state,
                country: (completeData as any)?.farmer?.company?.country,
                phone: (completeData as any)?.farmer?.company?.phone,
                email: (completeData as any)?.farmer?.company?.email,
                website: (completeData as any)?.farmer?.company?.website,
                facebook: (completeData as any)?.farmer?.company?.facebook,
                instagram: (completeData as any)?.farmer?.company?.instagram,
                logo: (completeData as any)?.farmer?.company?.logo,
                fiscal_id: (completeData as any)?.farmer?.company?.fiscal_id,
                contact_email: (completeData as any)?.farmer?.company?.contact_email,
                // Company overview stats for consumer transparency
                total_establishments: (completeData as any)?.farmer?.company?.total_establishments,
                total_parcels: (completeData as any)?.farmer?.company?.total_parcels,
                // Sustainability data from company onboarding (transparency-first)
                // Maps from farm_context.company_sustainability in the transparency API response
                sustainability_goals:
                  (completeData as any)?.farm_context?.company_sustainability?.goals ||
                  (completeData as any)?.farmer?.company?.sustainability_goals,
                crop_focus:
                  (completeData as any)?.farm_context?.company_sustainability?.crop_focus ||
                  (completeData as any)?.farmer?.company?.crop_focus,
                sustainability_commitment:
                  (completeData as any)?.farm_context?.company_sustainability?.commitment ||
                  (completeData as any)?.farmer?.company?.sustainability_commitment
              }}
              establishmentData={{
                // Use complete farmer/establishment data from enhanced API response
                id: (completeData as any)?.farmer?.id,
                name: (completeData as any)?.farmer?.name,
                description: (completeData as any)?.farmer?.description,
                address: (completeData as any)?.farmer?.address,
                city: (completeData as any)?.farmer?.city,
                state: (completeData as any)?.farmer?.state,
                country: (completeData as any)?.farmer?.country,
                zone: (completeData as any)?.farmer?.zone,
                latitude: (completeData as any)?.farmer?.latitude,
                longitude: (completeData as any)?.farmer?.longitude,
                contact_person: (completeData as any)?.farmer?.contact_person,
                contact_phone: (completeData as any)?.farmer?.contact_phone,
                contact_email: (completeData as any)?.farmer?.contact_email,
                email: (completeData as any)?.farmer?.email,
                phone: (completeData as any)?.farmer?.phone,
                zip_code: (completeData as any)?.farmer?.zip_code,
                facebook: (completeData as any)?.farmer?.facebook,
                instagram: (completeData as any)?.farmer?.instagram,
                about: (completeData as any)?.farmer?.about,
                main_activities: (completeData as any)?.farmer?.main_activities,
                location_highlights: (completeData as any)?.farmer?.location_highlights,
                custom_message: (completeData as any)?.farmer?.custom_message,
                is_active: (completeData as any)?.farmer?.is_active,
                crops_grown: (completeData as any)?.farmer?.crops_grown,
                sustainability_practices: (completeData as any)?.farmer?.sustainability_practices,
                employee_count: (completeData as any)?.farmer?.employee_count,
                total_acreage: (completeData as any)?.farmer?.total_acreage,
                year_established: (completeData as any)?.farmer?.year_established,
                establishment_type: (completeData as any)?.farmer?.establishment_type,
                farming_method: (completeData as any)?.farmer?.farming_method,
                location: (completeData as any)?.farmer?.location,
                rating: safeReputation,
                certifications: (completeData as any)?.farmer?.certifications || [],
                // Operational fields
                climate_zone: (completeData as any)?.farmer?.climate_zone,
                water_sources: (completeData as any)?.farmer?.water_sources,
                soil_types: (completeData as any)?.farmer?.soil_types,
                conservation_practices: (completeData as any)?.farmer?.conservation_practices,
                irrigation_methods: (completeData as any)?.farmer?.irrigation_methods
              }}
              parcelData={{
                id: (completeData as any)?.parcel?.id?.toString(),
                name: (completeData as any)?.parcel?.name,
                location: (completeData as any)?.farmer?.location,
                coordinates:
                  (completeData as any)?.farmer?.latitude &&
                  (completeData as any)?.farmer?.longitude
                    ? {
                        latitude: (completeData as any)?.farmer?.latitude,
                        longitude: (completeData as any)?.farmer?.longitude
                      }
                    : undefined,
                area: (completeData as any)?.parcel?.area,
                areaUnit: 'hectares',
                soilType: (completeData as any)?.parcel?.soilType,
                cropType: (completeData as any)?.product?.name,
                plantingDate: (completeData as any)?.start_date,
                harvestDate: (completeData as any)?.finish_date,
                elevation: (completeData as any)?.parcel?.elevation,
                slope: (completeData as any)?.parcel?.slope,
                irrigationType: (completeData as any)?.parcel?.irrigationType,
                polygon: (completeData as any)?.parcel?.polygon,
                map_metadata: (completeData as any)?.parcel?.map_metadata,
                // Additional fields for modal
                description: (completeData as any)?.parcel?.description,
                certification_type: (completeData as any)?.parcel?.certification_type,
                certified: (completeData as any)?.parcel?.certified,
                unique_code: (completeData as any)?.parcel?.unique_code,
                contact_person:
                  (completeData as any)?.parcel?.contact_person ||
                  (completeData as any)?.farmer?.contact_person,
                contact_phone:
                  (completeData as any)?.parcel?.contact_phone ||
                  (completeData as any)?.farmer?.contact_phone,
                contact_email:
                  (completeData as any)?.parcel?.contact_email ||
                  (completeData as any)?.farmer?.contact_email,
                current_history: (completeData as any)?.parcel?.current_history,
                // Transparency fields from Add Parcel form
                transparency_description: (completeData as any)?.parcel?.transparency_description,
                sustainability_practices: (completeData as any)?.parcel?.sustainability_practices,
                consumer_story: (completeData as any)?.parcel?.consumer_story,
                primary_crop: (completeData as any)?.parcel?.primary_crop,
                transparency_score: (completeData as any)?.parcel?.transparency_score,
                transparency_ready: (completeData as any)?.parcel?.transparency_ready,
                // Parcel images from album
                images: (completeData as any)?.parcel?.images,
                // Address for location details
                address: (completeData as any)?.parcel?.address,
                establishment: {
                  id: (completeData as any)?.farmer?.id,
                  name: (completeData as any)?.farmer?.name || 'Farm',
                  description: (completeData as any)?.farmer?.description,
                  location: (completeData as any)?.farmer?.location || 'Location not specified',
                  photo: (completeData as any)?.farmer?.photo
                }
              }}
            />
          </Box>

          <Divider borderColor="gray.200" />

          {/* Consumer Feedback Section */}
          <Box id="reviews-section">
            <VStack spacing={8}>
              <QuickFeedback
                productionId={productionId || ''}
                onFeedbackSubmitted={() => {}}
              />
            </VStack>
          </Box>
        </VStack>
      </Container>

      {/* Navigation Bottom Bar */}
      <NavigationBottomBar
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        onScrollStart={() => setIsUserScrolling(true)}
        onScrollEnd={() => setIsUserScrolling(false)}
      />

      {/* Education Modal */}
      <EducationModal isOpen={isEducationOpen} onClose={onEducationClose} topic={educationTopic} />
    </Flex>
  );
}

export default ProductDetail;
