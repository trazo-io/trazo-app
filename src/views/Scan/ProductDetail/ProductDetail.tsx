import React, { useEffect, useState, Suspense } from 'react';
import {
  Avatar,
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
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  useBreakpointValue,
  useToast,
  Progress,
  Spinner,
  Skeleton,
  Link,
  Divider
} from '@chakra-ui/react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  extractProductionIdFromCurrentURL,
  verifySecureQR,
  getQRAccessMetadata
} from 'utils/qrParser';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { setAuthRedirectAction } from '../../../utils/authRedirect';
import { MdTimeline } from 'react-icons/md';
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
  FaAward,
  FaClipboardList,
  FaExclamationTriangle,
  FaRecycle
} from 'react-icons/fa';
import { BsStarFill, BsStarHalf, BsStar, BsShieldCheck } from 'react-icons/bs';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// API imports - Using single transparency API (consolidated from dual requests)
import { useTransparencyCelebration } from '../../../hooks/useTransparencyCelebration';
import {
  useGetTransparencyDetailsQuery,
  useVerifyBlockchainIntegrityQuery
} from '../../../store/api/transparencyQrApi';
import { useCreateScanMutation } from '../../../store/api/historyApi';
import { addPendingScanToken } from '../../../utils/pendingScanStorage';
import { hasAnalyticsConsent } from '../../../components/Privacy/ConsentBanner';
import { HarvestInfoCard } from './components/HarvestInfoCard';

// Data normalization imports
import { normalizeBackendEventData } from '../../../utils/eventDataNormalizer';
import { StandardizedEvent } from '../../../types/standardizedEvents';

// Modern components (keeping the ones you like)
import { CarbonHeroSection } from '../../../components/QR/CarbonHeroSection';
import TrustSummaryHeader from '../../../components/QR/TrustSummaryHeader';
import { UltraMobileProductionJourney, CompanyFarmInfo } from './components';

// Certification badge
import CertificationBadge from '../../../components/Certifications/CertificationBadge';
import OrganicClaimBadge from '../../../components/Certifications/OrganicClaimBadge';

// Other components
import { ModernTrazoLoader } from './components/ModernTrazoLoader';
import { ModernErrorState } from './components/ModernErrorState';
import { HeroShimmer, JourneyShimmer, TransparencyShimmer } from './components/TrazoShimmers';
import { StandardImageGallery } from '../../../components/ImageGallery';
import QuickFeedback from '../../../components/ConsumerFeedback/QuickFeedback';
// Progressive loading for mobile performance - load heavy components only when needed
const CarbonImpactExplainer = React.lazy(
  () => import('../../../components/Education/CarbonImpactExplainer')
);

const CarbonExplainerLoader = () => (
  <Card bg="white" shadow="lg" borderRadius="xl" p={{ base: 4, smd: 6 }}>
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
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const intl = useIntl();

  const getModalContent = () => {
    switch (topic) {
      case 'transparency_impact':
        return {
          title: intl.formatMessage({ id: 'consumer.learnMore.transparencyImpact.title' }),
          content: (
            <VStack align="start" spacing={4}>
              <Text fontSize="lg" color="gray.700">
                {intl.formatMessage({ id: 'consumer.learnMore.transparencyImpact.body1' })}
              </Text>
              <Text fontSize="md" color="gray.600">
                {intl.formatMessage({ id: 'consumer.learnMore.transparencyImpact.body2' })}
              </Text>
              <Box bg="green.50" p={4} borderRadius="md">
                <Text fontSize="sm" fontWeight="medium" color="green.700">
                  {intl.formatMessage({ id: 'consumer.learnMore.transparencyImpact.callout' })}
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

  if (isMobile) {
    return (
      <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
        <DrawerOverlay bg="blackAlpha.400" />
        <DrawerContent
          bg={bgColor}
          borderTopRadius="2xl"
          maxH="82vh"
          containerProps={{ style: { zIndex: 10000 } }}
        >
          <Box pt={3} pb={1} display="flex" justifyContent="center">
            <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
          </Box>
          <DrawerCloseButton top={4} />
          <DrawerHeader px={5} pt={2} pb={4} borderBottomWidth="1px" borderColor={borderColor}>
            {modalContent.title}
          </DrawerHeader>
          <DrawerBody px={5} py={4} overflowY="auto">
            {modalContent.content}
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent bg={bgColor} borderRadius="xl" maxH="90vh" mx={4}>
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
  const toast = useToast();
  // Proof view (?view=proof) is the link a farmer shares with a wholesale buyer. The farm's
  // direct phone/email is gated to it — a random shopper on the story view should not get the
  // producer's personal contact details (privacy / spam vector). 2026-06 audit P2-6.
  const [proofSearchParams] = useSearchParams();
  const isProofView = proofSearchParams.get('view') === 'proof';

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
    isLoading: isCompleteLoading,
    refetch: refetchTransparency
  } = useGetTransparencyDetailsQuery(productionId || '', {
    skip: !productionId,
    refetchOnMountOrArgChange: false,
    refetchOnFocus: false
  });

  // Blockchain integrity check — runs whenever production is finalized (has finalization_hash)
  // OR has blockchain data (tx_hash). This closes the gap between finalization and
  // monthly batch submission: Layer 1 (event hash check) works immediately at finalization.
  const blockchainVerification = (completeData as any)?.blockchain_verification;
  const canVerifyIntegrity = !!(
    blockchainVerification?.tx_hash || blockchainVerification?.is_finalized
  );
  const { data: integrityData, isLoading: isIntegrityLoading } = useVerifyBlockchainIntegrityQuery(
    productionId || '',
    {
      skip: !productionId || !canVerifyIntegrity
    }
  );

  // === PAGE-VIEW SCAN TRACKING ===
  // Records a scan when the user accepts analytics consent (GDPR-compliant).
  // Only fires once per page load. No scan is recorded if user declines.
  const [createScan] = useCreateScanMutation();
  const [pageViewRecorded, setPageViewRecorded] = useState(false);
  const pageLoadTime = useState(() => Date.now())[0];

  useEffect(() => {
    if (!productionId || pageViewRecorded) return;

    const recordPageViewScan = () => {
      setPageViewRecorded(true);
      createScan({
        production_id: productionId,
        explicit_consent: true,
        consent_timestamp: new Date().toISOString(),
        time_on_page: (Date.now() - pageLoadTime) / 1000,
        screen: `${window.screen.width}x${window.screen.height}`
      })
        .unwrap()
        .then((result) => {
          if (result?.claim_token && !isAuthenticated) {
            addPendingScanToken(result.claim_token);
          }
        })
        .catch(() => {
          // Best-effort — don't block the page if scan tracking fails
        });
    };

    // If consent was already granted (returning visitor), record immediately
    if (hasAnalyticsConsent()) {
      recordPageViewScan();
      return;
    }

    // Listen for consent being granted during this visit
    const handleConsentChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.consent) {
        recordPageViewScan();
      }
    };

    window.addEventListener('trazo-consent-changed', handleConsentChanged);
    return () => window.removeEventListener('trazo-consent-changed', handleConsentChanged);
  }, [productionId, pageViewRecorded, createScan, pageLoadTime, isAuthenticated]);

  // === JSON-LD STRUCTURED DATA (schema.org Product) ===
  // Injects a single <script type="application/ld+json"> into <head> when
  // the transparency payload loads; removed on unmount/data change.
  // Claim-safe by design: certifications are emitted ONLY when OID-verified
  // (status === 'verified_via_database') — never for self-reported certs.
  // No price/offers and no invented GTIN/SKU (see
  // documentation/reference/gs1-digital-link-readiness.md).
  useEffect(() => {
    if (!completeData) return;

    const data = completeData as any;
    const productName: string | undefined = data?.product?.name;
    if (!productName) return;

    const farmName: string | undefined = data?.farmer?.name;
    const practicesCount: number = data?.timeline?.length ?? 0;
    // Same hero-photo resolution as the CarbonHeroSection render below.
    // `images` is a string[] of S3 URLs (the gallery's source). images[0] is the
    // explicit cover (cover_image_url) when set, else the first auto-collected photo;
    // tolerate the legacy object shape ({image}) too. Falls back to the first
    // timeline event photo when the production has no top-level images.
    const firstImg: unknown = data?.images?.[0];
    const firstGalleryPhoto: string | undefined =
      typeof firstImg === 'string' ? firstImg : (firstImg as any)?.image;
    const heroImage: string | undefined =
      firstGalleryPhoto ||
      data?.timeline?.find((ev: any) => ev?.album?.images?.[0]?.image)?.album?.images?.[0]?.image;
    const lot: string | undefined = data?.harvestDetails?.lot_number;
    const reviews = data?.reviews;
    // Phase 3 lot gate applies to machine-readable claims too: a certified
    // FARM whose LOT is ineligible (organic_claim.can_display_organic ===
    // false) must not carry an organic Certification on this Product node —
    // JSON-LD describes THIS lot's product page, not the operation.
    const claim = data?.standard_view?.organic_claim;
    const lotSuppressed =
      claim?.status === 'certified_organic' && claim?.can_display_organic === false;
    const verifiedCerts = (data?.standard_view?.certifications || []).filter(
      (c: any) =>
        c?.status === 'verified_via_database' &&
        c?.display_name &&
        c.display_name !== 'Other' &&
        !(lotSuppressed && /usda.*organic/i.test(c.display_name))
    );

    const jsonLd: Record<string, any> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: productName,
      description: farmName
        ? `${productName} grown by ${farmName}, with ${practicesCount} documented farming practices`
        : `${productName}, with ${practicesCount} documented farming practices`
    };
    if (farmName) {
      jsonLd.brand = { '@type': 'Organization', name: farmName };
    }
    if (heroImage) {
      jsonLd.image = heroImage;
    }
    if (verifiedCerts.length > 0) {
      jsonLd.hasCertification = verifiedCerts.map((c: any) => {
        const cert: Record<string, any> = { '@type': 'Certification', name: c.display_name };
        if (c.certifier_name) {
          cert.issuedBy = { '@type': 'Organization', name: c.certifier_name };
        }
        return cert;
      });
    }
    if (reviews?.count > 0 && Number.isFinite(Number(reviews?.average))) {
      jsonLd.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: Number(reviews.average),
        reviewCount: reviews.count
      };
    }
    if (lot) {
      jsonLd.additionalProperty = [{ '@type': 'PropertyValue', name: 'Lot', value: lot }];
    }

    // Replace any stale instance, then inject the single canonical script.
    document.getElementById('trazo-product-jsonld')?.remove();
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'trazo-product-jsonld';
    // Escape "<" so a "</script>" sequence inside data can't break out.
    script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [completeData]);

  // Helper function to get proper transparency score from backend TransparencyCalculator.
  // Returns null when absent — the score is now a FARMER-dashboard KPI and is gated out of
  // the anonymous consumer payload (claim-safety, 2026-06). null means "no score on this
  // surface", NOT 0; consumer color/tone fallbacks must treat null as neutral, never as 0%.
  const getTransparencyScore = (): number | null => {
    const pct = completeData?.quick_view?.transparency_score?.percentage;
    return pct !== undefined && pct !== null ? pct : null;
  };

  // Helper function for consistent consumer-facing display (whole numbers).
  // Passes null straight through so downstream components render no graded number.
  const getDisplayTransparencyScore = (): number | null => {
    const rawScore = getTransparencyScore();
    return rawScore == null ? null : Math.round(rawScore);
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
      return {
        score: 0,
        isVerified: false,
        txHash: blockchainData?.tx_hash,
        isTampered: true,
        isIntegrityChecked: true
      };
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

    // Calculate percentage of documented events out of total events
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
        // Score is gated out of the consumer payload (claim-safety) → null here.
        // Coerced to 0 so the celebration stays suppressed on the consumer page
        // (a score "🎉 verdict" modal is the self-graded label we removed).
        transparencyScore: getTransparencyScore() ?? 0,
        farmName: completeData?.farmer?.name,
        productName: completeData?.product?.name,
        eventsDocumented: completeData?.timeline?.length || 0,
        photoCount: undefined, // Only show if actual photo data available from API
        isUSDAVerified: completeData?.isUsdaVerified || false,
        isBlockchainVerified: getBlockchainScore().isVerified,
        isTrazoVerified: (getTransparencyScore() ?? 0) >= 80,
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
        title={
          errorType === 'not_found'
            ? intl.formatMessage({
                id: 'consumer.detail.errorNotFoundTitle',
                defaultMessage: 'Product Not Found'
              })
            : intl.formatMessage({
                id: 'consumer.detail.errorLoadTitle',
                defaultMessage: 'Unable to Load Product'
              })
        }
        message={
          errorType === 'not_found'
            ? intl.formatMessage({
                id: 'consumer.detail.errorNotFoundMsg',
                defaultMessage:
                  'This product information is not available. Please verify the QR code and try again.'
              })
            : intl.formatMessage({
                id: 'consumer.detail.errorLoadMsg',
                defaultMessage:
                  'Please check your connection and try again, or scan a different product.'
              })
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
        title={intl.formatMessage({
          id: 'consumer.detail.noDataTitle',
          defaultMessage: 'No Product Data Available'
        })}
        message={intl.formatMessage({
          id: 'consumer.detail.noDataMsg',
          defaultMessage: 'Please scan a valid QR code to view product information.'
        })}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <Flex direction="column" alignSelf="center" justifySelf="center" w="100%">
      {/* Transparency Hero Section - Primary Navigation Target.
          ORDER: CarbonHeroSection (photo + glassmorphism score badge) FIRST
          for verdict-moment impact, then TrustSummaryHeader (4 pillars +
          FTC disclaimer) below. This is the 2026 grocery-aisle pattern:
          face/place + verdict above the fold; analytical detail follows. */}
      <Box id="transparency-section">
        {(() => {
          const farmerData = (completeData as any)?.farmer;
          const productData = (completeData as any)?.product;
          const farmName = farmerData?.name;
          const location =
            farmerData?.location ||
            (farmerData?.city && farmerData?.state
              ? `${farmerData.city}, ${farmerData.state}`
              : undefined);
          // The transparency payload exposes harvest completion as
          // farm_context.production_period.end (transparency_response_formatter.py:198).
          // Neither top-level finish_date nor product.end_date exist on this
          // endpoint — which is why the hero never showed a harvest date.
          const harvestDate =
            (completeData as any)?.farm_context?.production_period?.end ||
            (completeData as any)?.finish_date;
          // First production photo (S3 URL) — hero background. `images` is a
          // string[]; images[0] is the explicit cover (cover_image_url) when set,
          // else the first auto-collected photo. Tolerate the legacy {image}
          // shape, then fall back to the first timeline event photo, then to the
          // score-tinted gradient inside CarbonHeroSection when none exist.
          const firstImg: unknown = (completeData as any)?.images?.[0];
          const firstGalleryPhoto =
            typeof firstImg === 'string' ? firstImg : (firstImg as any)?.image;
          const heroPhotoUrl =
            firstGalleryPhoto ||
            (completeData as any)?.timeline?.find((ev: any) => ev?.album?.images?.[0]?.image)?.album
              ?.images?.[0]?.image;
          const blockchainScore = getBlockchainScore();
          const blockchainStatus = blockchainScore.isTampered
            ? 'tampered'
            : blockchainScore.isVerified
            ? 'verified'
            : blockchainScore.isPending
            ? 'pending'
            : null;
          // Single source of truth for the photo count: the canonical images array the
          // gallery actually renders (completeData.images). Summing per-event album images
          // double-counted vs the gallery (pillar showed 24 while the gallery showed 20) —
          // 2026-06 audit P1-6. All photo counts now agree with what the consumer can see.
          const totalPhotoEvidenceCount = (completeData as any)?.images?.length ?? 0;
          const transparencyDetails = (completeData as any)?.standard_view?.transparency_details;

          // Claim-safe hero badge inputs: lead with the OID-verified
          // certification (third-party), never the self-created score.
          const organicClaim = (completeData as any)?.standard_view?.organic_claim;
          const heroCertifications = (completeData as any)?.standard_view?.certifications || [];
          const oidVerifiedCert = heroCertifications.find(
            (c: any) => c.status === 'verified_via_database'
          );
          // Phase 3: can_display_organic is the server's final verdict — it
          // goes false when the LOT is ineligible (prohibited input, cert not
          // valid at harvest, crop not in scope) even on a certified farm.
          const certifiedLabel =
            organicClaim?.status === 'certified_organic' &&
            organicClaim?.can_display_organic !== false &&
            oidVerifiedCert
              ? intl.formatMessage({
                  id: 'consumer.trust.certifiedOrganic',
                  defaultMessage: 'Certified Organic'
                })
              : null;
          // The transparency payload exposes the lot as
          // harvestDetails.lot_number (transparency_views.py:451) — there is
          // no top-level lot_id on this endpoint.
          const lotId = (completeData as any)?.harvestDetails?.lot_number;
          // Real consumer reviews (top-level "reviews" on the transparency
          // payload — distinct from the legacy "reputation" field).
          const consumerReviews = (completeData as any)?.reviews;

          return (
            <>
              <CarbonHeroSection
                carbonData={{
                  score: getDisplayTransparencyScore(),
                  footprint: getAccurateCarbonFootprint(),
                  relatableFootprint: completeData?.relatableFootprint,
                  grade: undefined,
                  level: 'transparency'
                }}
                trustData={{
                  confidenceScore: getDisplayTransparencyScore(),
                  isUSDAVerified: completeData?.isUsdaVerified || false,
                  isBlockchainVerified: getBlockchainScore().isVerified,
                  reviewsCount: consumerReviews?.count ?? 0,
                  averageRating: consumerReviews?.average ?? safeReputation,
                  scansCount: 0,
                  transparencyScore: getDisplayTransparencyScore()
                }}
                productData={{
                  name: productData?.name || 'Product',
                  company: { name: farmName || 'Farm' },
                  reputation: (completeData as any)?.reputation || 0
                }}
                heroPhotoUrl={heroPhotoUrl}
                harvestDate={harvestDate}
                certifiedLabel={certifiedLabel}
                certifierName={oidVerifiedCert?.certifier_name}
                practicesCount={completeData?.timeline?.length ?? 0}
                lotId={lotId}
                isLoading={isCompleteLoading}
                onLearnMore={() => handleEducationOpen('transparency_impact')}
              />
              <TrustSummaryHeader
                productName={productData?.name}
                farmName={farmName}
                location={location}
                harvestDate={harvestDate}
                lotId={lotId}
                organicClaim={organicClaim}
                certifications={heroCertifications}
                transparencyScore={getDisplayTransparencyScore()}
                documentedEventsCount={completeData?.timeline?.length ?? 0}
                expectedEventsCount={transparencyDetails?.expected_events}
                blockchainStatus={blockchainStatus}
                totalPhotoEvidenceCount={totalPhotoEvidenceCount}
                onMethodologyClick={() => handleEducationOpen('transparency_impact')}
                isLoading={isCompleteLoading}
              />
            </>
          );
        })()}
      </Box>
      {/* Main Content Section — bottom padding clears the fixed mobile
          NavigationBottomBar (~64px) so the last card is never hidden
          behind it. */}
      <Container maxW="container.xl" pt={8} pb={{ base: 24, xl: 8 }} centerContent>
        <Box w="100%" maxW="container.lg">
          {/* Main Content Column */}
          <Box>
            <VStack spacing={8} align="stretch">
              {/* Farm Identity block — company-first hierarchy (replaced the
                  generic "What This Farmer Shares" welcome card, 2026-06).
                  Tier 1: the farmer's own stored "about" text.
                  Tier 2: parcel consumer story or company sustainability text.
                  Tier 3: compact factual one-liner (no icon grid).
                  Quoted lines are REAL stored text only, truncated at a word
                  boundary — never invented copy. */}
              {(() => {
                const farmerData = (completeData as any)?.farmer;
                const identityFarmName: string = farmerData?.name || 'This farm';
                const identityLocation =
                  farmerData?.location ||
                  (farmerData?.city && farmerData?.state
                    ? `${farmerData.city}, ${farmerData.state}`
                    : undefined);

                const cleanText = (value: unknown): string =>
                  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';

                const truncateAtWord = (text: string, max = 140): string => {
                  if (text.length <= max) return text;
                  const cut = text.slice(0, max);
                  const lastSpace = cut.lastIndexOf(' ');
                  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
                };

                // Tier 1 source: person-like story written by the farmer.
                const aboutText = cleanText(farmerData?.about);
                // Tier 2 sources: parcel consumer story, then company
                // sustainability text (farm_context.company_sustainability).
                const parcelStory = cleanText((completeData as any)?.parcel?.consumer_story);
                const sustainabilityText =
                  cleanText(
                    (completeData as any)?.farm_context?.company_sustainability?.commitment
                  ) ||
                  cleanText((completeData as any)?.farm_context?.company_sustainability?.goals);

                // Photo: establishment photo, then company logo, then first
                // parcel album image (parcel.images is string[]).
                const farmPhotoUrl: string | undefined =
                  farmerData?.photo ||
                  farmerData?.company?.logo ||
                  (completeData as any)?.parcel?.images?.[0];

                const storyText = aboutText || parcelStory || sustainabilityText;

                if (!storyText) {
                  // Tier 3 — compact fallback, single factual line.
                  return (
                    <Box
                      bg="white"
                      borderRadius="xl"
                      border="1px solid"
                      borderColor="gray.200"
                      p={{ base: 4, smd: 6 }}
                    >
                      <HStack spacing={3} align="flex-start">
                        <Circle size="36px" bg="green.50" flexShrink={0}>
                          <Icon as={FaLeaf} color="green.500" boxSize={4} />
                        </Circle>
                        <Text color="gray.700" fontSize={{ base: 'sm', smd: 'md' }}>
                          {intl.formatMessage(
                            {
                              id: 'consumer.detail.farmIdentityFallback',
                              defaultMessage:
                                '{farm} records its growing practices on Trazo. The documented timeline appears below.'
                            },
                            { farm: identityFarmName }
                          )}
                        </Text>
                      </HStack>
                    </Box>
                  );
                }

                // Tier 1 / Tier 2 — photo + farm name + one quoted story line.
                return (
                  <Box
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    p={{ base: 4, smd: 6 }}
                  >
                    <HStack spacing={{ base: 3, smd: 4 }} align="flex-start">
                      <Avatar
                        src={farmPhotoUrl}
                        name={identityFarmName}
                        size="lg"
                        bg="green.100"
                        color="green.700"
                        flexShrink={0}
                      />
                      <VStack align="start" spacing={1} flex={1} minW={0}>
                        <Heading size={{ base: 'sm', smd: 'md' }} color="gray.800" noOfLines={2}>
                          {identityFarmName}
                        </Heading>
                        {identityLocation && (
                          <HStack spacing={1} color="gray.500">
                            <Icon as={FaMapMarkerAlt} boxSize={3} />
                            <Text fontSize="xs" noOfLines={1}>
                              {identityLocation}
                            </Text>
                          </HStack>
                        )}
                        <Text
                          color="gray.600"
                          fontSize={{ base: 'sm', smd: 'md' }}
                          fontStyle="italic"
                          pt={1}
                        >
                          “{truncateAtWord(storyText)}”
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                );
              })()}

              {/* Transparency Achievement card removed (2026-06): it duplicated
                  the hero badge and its tier names ("Complete Transparency
                  Champion", "Transparency Leader") were implied comparative
                  rankings with no baseline — FTC 16 CFR 260.6(d) exposure.
                  The factual events count lives in the hero badge. */}

              {/* ── Card 2: Certification & Practices (conditional) ── */}
              {(() => {
                const organicClaim = (completeData as any)?.standard_view?.organic_claim;
                const allCertifications =
                  (completeData as any)?.standard_view?.certifications || [];
                const organicSummary = (completeData as any)?.standard_view?.organic_summary;

                // When OrganicClaimBadge is active for certified organic, the USDA Organic
                // certification is already represented there — filter it out of the list
                // to avoid redundant display. Show its certifier as an attribution line instead.
                const showingOrganicClaim =
                  organicClaim &&
                  organicClaim.status !== 'conventional' &&
                  organicClaim.status !== 'self_reported';
                const usdaOrganicCert = showingOrganicClaim
                  ? allCertifications.find(
                      (c: any) =>
                        c.display_name === 'USDA Organic' ||
                        /usda.*organic/i.test(c.display_name || '')
                    )
                  : null;
                const otherCertifications = (
                  showingOrganicClaim
                    ? allCertifications.filter((c: any) => c !== usdaOrganicCert)
                    : allCertifications
                )
                  // "Other" is a non-meaningful cert category — never show it to consumers
                  // (CertificationBadge already skips it for primary/badge list; strip at
                  // source so it can't leak via any render branch or the JSON-LD).
                  .filter((c: any) => c.display_name !== 'Other');

                const hasContent =
                  showingOrganicClaim || allCertifications.length > 0 || organicSummary;

                if (!hasContent) return null;

                return (
                  <Box
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    overflow="hidden"
                    p={{ base: 4, smd: 6 }}
                  >
                    <VStack spacing={4} align="stretch">
                      <HStack spacing={3}>
                        <Flex
                          w={10}
                          h={10}
                          borderRadius="lg"
                          bg="green.50"
                          align="center"
                          justify="center"
                        >
                          <Icon as={FaCertificate} color="green.500" boxSize={5} />
                        </Flex>
                        <VStack align="start" spacing={0}>
                          <Text
                            as="h2"
                            fontWeight="bold"
                            fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                            color="gray.800"
                          >
                            {intl.formatMessage({ id: 'certification.manage.title' })}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {intl.formatMessage({
                              id: 'certification.manage.subtitle',
                              defaultMessage: 'Standards and claims for this product'
                            })}
                          </Text>
                        </VStack>
                      </HStack>

                      {/* Organic claim — regulatory gate per 7 CFR 205.300 / 16 CFR 260.6(d).
                          Server-side ConsumerClaimValidator decides what may be shown. */}
                      <OrganicClaimBadge claim={organicClaim} />

                      {/* USDA Organic attribution — compact source + certifier line */}
                      {usdaOrganicCert && (
                        <VStack align="start" spacing={0.5} pl={1}>
                          <Text fontSize="xs" color="gray.500">
                            {intl.formatMessage({ id: 'certification.badge.verified' })}
                          </Text>
                          {usdaOrganicCert.certifier_name && (
                            <Text fontSize="xs" color="gray.500">
                              {intl.formatMessage({ id: 'certification.manage.certifier' })}:{' '}
                              <Text as="span" color="gray.700" fontWeight="medium">
                                {usdaOrganicCert.certifier_name}
                              </Text>
                            </Text>
                          )}
                        </VStack>
                      )}

                      {/* Other (non-organic) certification details — inline, no nested card */}
                      {otherCertifications.length > 0 && (
                        <>
                          <Divider />
                          <CertificationBadge
                            certifications={otherCertifications}
                            variant="inline"
                          />
                        </>
                      )}

                      {/* Organic practices narrative */}
                      {organicSummary &&
                        (() => {
                          const isVerified = organicSummary.certification_verified;
                          // Phase 3 lot gate: a certified farm with an
                          // ineligible lot must not get the "grown on a
                          // USDA-certified organic farm" narrative — it
                          // contradicts the suppressed seal two lines up.
                          const lotSuppressed =
                            organicClaim?.status === 'certified_organic' &&
                            organicClaim?.can_display_organic === false;
                          const narrativeId = lotSuppressed
                            ? 'consumer.organic.story.lotSuppressedNarrative'
                            : isVerified
                            ? 'consumer.organic.story.verifiedNarrative'
                            : 'consumer.organic.story.selfReportedNarrative';
                          return (
                            <>
                              <Divider />
                              <VStack align="start" spacing={1.5}>
                                {organicSummary.has_input_data && (
                                  <HStack spacing={2}>
                                    <Icon as={FaLeaf} color="green.600" boxSize={3.5} mt="2px" />
                                    <Text fontSize="sm" color="gray.700">
                                      {organicSummary.all_inputs_organic
                                        ? intl.formatMessage(
                                            { id: 'consumer.organic.story.allInputsApproved' },
                                            { count: organicSummary.total_chemical_inputs }
                                          )
                                        : intl.formatMessage(
                                            { id: 'consumer.organic.story.someInputsApproved' },
                                            {
                                              approved: organicSummary.organic_approved_inputs,
                                              total: organicSummary.total_chemical_inputs
                                            }
                                          )}
                                    </Text>
                                  </HStack>
                                )}
                                <Text fontSize="sm" color="gray.600">
                                  {intl.formatMessage({ id: narrativeId })}
                                </Text>
                              </VStack>
                            </>
                          );
                        })()}

                      {/* Documented practices — GTM-v3 "real vs. fake organic" differentiator.
                          FACTS the farmer logged (integrated grazing, cover crops, on-farm compost),
                          never a grade, verdict, or regenerative badge (transparency-first.md /
                          EU ECGT 2024/825). The list is full for a real practice-based grower and
                          empty for an input-substitution farm — the difference shows itself. */}
                      {(() => {
                        const practices =
                          (completeData as any)?.standard_view?.practice_summary?.practices || [];
                        if (!practices.length) return null;
                        const iconFor = (key: string) =>
                          key === 'cover_crops'
                            ? FaSeedling
                            : key === 'on_farm_compost'
                            ? FaRecycle
                            : FaLeaf;
                        // Localize raw codes (sheep, hedgerow, barn_owl_box, …) → readable, translated
                        // labels. defaultMessage = Title-Cased English fallback so it never shows a raw code.
                        const titleCase = (t: string) =>
                          (t || '')
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase())
                            .trim();
                        const locList = (codes: string[], group: string) =>
                          (codes || [])
                            .filter(Boolean)
                            .map((c) =>
                              intl.formatMessage({
                                id: `consumer.habitat.${group}.${c}`,
                                defaultMessage: titleCase(c)
                              })
                            )
                            .join(', ');
                        const labelFor = (p: any) => {
                          if (p.key === 'integrated_grazing') {
                            const animals = locList(p.animal_types, 'animal');
                            return animals
                              ? intl.formatMessage(
                                  {
                                    id: 'consumer.practices.grazingAnimals',
                                    defaultMessage: 'Integrated grazing: {animals}'
                                  },
                                  { animals }
                                )
                              : intl.formatMessage({
                                  id: 'consumer.practices.grazing',
                                  defaultMessage: 'Integrated grazing'
                                });
                          }
                          if (p.key === 'cover_crops') {
                            const species = (p.species || []).join(', ');
                            return species
                              ? intl.formatMessage(
                                  {
                                    id: 'consumer.practices.coverCropsSpecies',
                                    defaultMessage: 'Cover crops: {species}'
                                  },
                                  { species }
                                )
                              : intl.formatMessage({
                                  id: 'consumer.practices.coverCrops',
                                  defaultMessage: 'Cover cropping'
                                });
                          }
                          if (p.key === 'on_farm_compost') {
                            return intl.formatMessage({
                              id: 'consumer.practices.compost',
                              defaultMessage: 'On-farm compost'
                            });
                          }
                          if (p.key === 'habitat_development') {
                            const types = locList(p.habitat_types, 'type');
                            return types
                              ? intl.formatMessage(
                                  {
                                    id: 'consumer.practices.habitatDev',
                                    defaultMessage: 'Habitat established: {types}'
                                  },
                                  { types }
                                )
                              : intl.formatMessage({
                                  id: 'consumer.practices.habitatDevGeneric',
                                  defaultMessage: 'Habitat development'
                                });
                          }
                          if (p.key === 'nesting_shelter') {
                            const types = locList(p.structures, 'structure');
                            return types
                              ? intl.formatMessage(
                                  {
                                    id: 'consumer.practices.nestingShelter',
                                    defaultMessage: 'Nesting & shelter: {types}'
                                  },
                                  { types }
                                )
                              : intl.formatMessage({
                                  id: 'consumer.practices.nestingShelterGeneric',
                                  defaultMessage: 'Nesting & shelter structures'
                                });
                          }
                          return intl.formatMessage({
                            id: 'consumer.practices.documented',
                            defaultMessage: 'Documented practice'
                          });
                        };
                        return (
                          <>
                            <Divider />
                            <VStack align="start" spacing={1.5}>
                              <Text fontSize="xs" fontWeight="semibold" color="gray.500">
                                {intl.formatMessage({
                                  id: 'consumer.practices.title',
                                  defaultMessage: 'Documented farming practices'
                                })}
                              </Text>
                              {practices.map((p: any) => (
                                <HStack key={p.key} spacing={2} align="start">
                                  <Icon
                                    as={iconFor(p.key)}
                                    color="green.600"
                                    boxSize={3.5}
                                    mt="2px"
                                  />
                                  <Text fontSize="sm" color="gray.700">
                                    {labelFor(p)}
                                  </Text>
                                </HStack>
                              ))}
                            </VStack>
                          </>
                        );
                      })()}

                      {/* Continuous proof messaging — only for non-organic verified certs */}
                      {!organicSummary &&
                        (() => {
                          const hasVerifiedCert = allCertifications.some(
                            (c: any) => c.status === 'verified_via_database'
                          );
                          if (!hasVerifiedCert) return null;
                          const eventCount = completeData?.timeline?.length || 0;
                          return (
                            <>
                              <Divider />
                              <Text fontSize="sm" color="gray.600">
                                {intl.formatMessage(
                                  { id: 'consumer.certification.verifiedContinuousProof' },
                                  { eventCount }
                                )}
                              </Text>
                            </>
                          );
                        })()}
                    </VStack>
                  </Box>
                );
              })()}

              {/* Farm Story Highlights - Consumer-Friendly */}
              <Box
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                p={{ base: 4, smd: 6 }}
                shadow="sm"
                mb={6}
              >
                <VStack align="start" spacing={4}>
                  <HStack spacing={3}>
                    <Flex
                      w={10}
                      h={10}
                      borderRadius="lg"
                      bg="green.50"
                      align="center"
                      justify="center"
                    >
                      <Icon as={FaTractor} color="green.500" boxSize={5} />
                    </Flex>
                    <VStack align="start" spacing={0}>
                      <Text
                        as="h2"
                        fontWeight="bold"
                        fontSize={{ base: 'md', smd: 'lg', lg: 'xl' }}
                        color="gray.800"
                      >
                        {intl.formatMessage({ id: 'consumer.howGrown.title' })}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {intl.formatMessage({
                          id: 'consumer.howGrown.subtitle',
                          defaultMessage: 'Practices and proof from the field'
                        })}
                      </Text>
                    </VStack>
                  </HStack>

                  <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                    {/* Farming Events */}
                    <HStack align="start" spacing={3}>
                      <Icon as={FaSeedling} color="green.500" size="20px" mt={1} />
                      <Box>
                        <Text fontWeight="semibold" color="gray.800">
                          {intl.formatMessage(
                            { id: 'consumer.howGrown.eventsDocumented' },
                            { count: completeData?.timeline?.length || 0 }
                          )}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {intl.formatMessage({ id: 'consumer.howGrown.eventsSubtitle' })}
                        </Text>
                      </Box>
                    </HStack>

                    {/* Photos & Evidence — hidden when zero. "0 Photos …
                        Visual evidence from the field" read like a broken
                        empty state and advertised the absence of evidence. */}
                    {(() => {
                      // Same source as the RECORDS pillar + gallery (P1-6): count the photos
                      // the consumer can actually see, not events-with-photos.
                      const photoEventCount = (completeData as any)?.images?.length ?? 0;
                      if (photoEventCount === 0) return null;
                      return (
                        <HStack align="start" spacing={3}>
                          <Icon as={FaCheckCircle} color="green.500" size="20px" mt={1} />
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">
                              {intl.formatMessage(
                                { id: 'consumer.howGrown.photosIncluded' },
                                { count: photoEventCount }
                              )}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({ id: 'consumer.howGrown.photosSubtitle' })}
                            </Text>
                          </Box>
                        </HStack>
                      );
                    })()}

                    {/* Blockchain Security — five states: tampered, verified, sealed, finished/not-recorded, in-progress */}
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
                                  {intl.formatMessage({
                                    id: 'consumer.blockchain.dataIntegrityWarning',
                                    defaultMessage: 'Data Integrity Warning'
                                  })}
                                </Text>
                                <Text fontSize="sm" color="red.600">
                                  {integrityData?.data_integrity_detail ||
                                    intl.formatMessage({
                                      id: 'consumer.blockchain.dataIntegrityWarningDetail',
                                      defaultMessage:
                                        'Production data may have been modified after finalization'
                                    })}
                                </Text>
                                {blockchain.txHash && (
                                  <Link
                                    href={`${
                                      import.meta.env.VITE_POLYGON_EXPLORER_URL ||
                                      'https://polygonscan.com'
                                    }/tx/${blockchain.txHash}`}
                                    isExternal
                                    fontSize="xs"
                                    color="red.500"
                                    mt={1}
                                    display="inline-block"
                                  >
                                    {intl.formatMessage({
                                      id: 'consumer.blockchain.checkPublicRecord',
                                      defaultMessage: 'Check the public record ↗'
                                    })}
                                  </Link>
                                )}
                              </Box>
                            </HStack>
                          </Box>
                        );
                      }

                      // STATE 2: Recorded on-chain — green shield (Trazo brand)
                      if (blockchain.isVerified) {
                        return (
                          <HStack align="start" spacing={3}>
                            <Icon as={FaShieldAlt} color="green.500" boxSize="20px" mt={1} />
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">
                                {intl.formatMessage({
                                  id: 'consumer.blockchain.blockchainRecorded',
                                  defaultMessage: 'Blockchain Recorded'
                                })}
                              </Text>
                              {/* "Tamper-proof" overclaims — blockchain proves the
                                  record is unchanged since sealing, not that it was
                                  accurate when submitted. */}
                              <Text fontSize="sm" color="gray.600">
                                {blockchain.isIntegrityChecked
                                  ? intl.formatMessage({
                                      id: 'consumer.blockchain.recordUnchanged',
                                      defaultMessage:
                                        'Record unchanged since sealing — integrity check passed'
                                    })
                                  : intl.formatMessage({
                                      id: 'consumer.blockchain.recordSealed',
                                      defaultMessage:
                                        'Record sealed on the Polygon blockchain after submission'
                                    })}
                              </Text>
                              {blockchain.txHash && (
                                <Link
                                  href={`${
                                    import.meta.env.VITE_POLYGON_EXPLORER_URL ||
                                    'https://polygonscan.com'
                                  }/tx/${blockchain.txHash}`}
                                  isExternal
                                  fontSize="xs"
                                  color="green.600"
                                  mt={1}
                                  display="inline-block"
                                >
                                  {intl.formatMessage({
                                    id: 'consumer.blockchain.checkPublicRecord',
                                    defaultMessage: 'Check the public record ↗'
                                  })}
                                </Link>
                              )}
                            </Box>
                          </HStack>
                        );
                      }

                      // STATE 3: Sealed (finalized) but not yet on blockchain — gray lock
                      if (blockchain.isPending) {
                        return (
                          <HStack align="start" spacing={3}>
                            <Icon as={FaShieldAlt} color="gray.500" boxSize="20px" mt={1} />
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">
                                {intl.formatMessage({
                                  id: 'consumer.blockchain.dataSealed',
                                  defaultMessage: 'Data Sealed'
                                })}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {blockchain.isIntegrityChecked
                                  ? intl.formatMessage({
                                      id: 'consumer.blockchain.allEventsSealed',
                                      defaultMessage:
                                        'All events cryptographically sealed — blockchain submission in progress'
                                    })
                                  : intl.formatMessage({
                                      id: 'consumer.blockchain.productionFinalized',
                                      defaultMessage:
                                        'Production finalized — preparing for blockchain recording'
                                    })}
                              </Text>
                            </Box>
                          </HStack>
                        );
                      }

                      // STATE 4: Production finished but not blockchain-recorded
                      // (blockchain is an optional $15/mo add-on per Trazo pricing)
                      const finishDate = (completeData as any)?.finish_date;
                      if (finishDate) {
                        return (
                          <HStack align="start" spacing={3}>
                            <Icon as={FaShieldAlt} color="gray.400" boxSize="20px" mt={1} />
                            <Box>
                              <Text fontWeight="semibold" color="gray.800">
                                {intl.formatMessage({
                                  id: 'consumer.blockchain.notBlockchainRecorded',
                                  defaultMessage: 'Not Blockchain-Recorded'
                                })}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {intl.formatMessage({
                                  id: 'consumer.blockchain.notBlockchainRecordedDetail',
                                  defaultMessage:
                                    'Production documented through farmer-reported events. Blockchain recording is an optional add-on.'
                                })}
                              </Text>
                            </Box>
                          </HStack>
                        );
                      }

                      // STATE 5: Truly in-progress (no finish_date) — gray
                      return (
                        <HStack align="start" spacing={3}>
                          <Icon as={FaShieldAlt} color="gray.400" boxSize="20px" mt={1} />
                          <Box>
                            <Text fontWeight="semibold" color="gray.800">
                              {intl.formatMessage({
                                id: 'consumer.blockchain.notYetRecorded',
                                defaultMessage: 'Not Yet Recorded'
                              })}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({
                                id: 'consumer.blockchain.notYetRecordedDetail',
                                defaultMessage:
                                  'Production in progress — blockchain recording available after completion (optional add-on).'
                              })}
                            </Text>
                          </Box>
                        </HStack>
                      );
                    })()}
                  </SimpleGrid>

                  {/* P2-5: removed redundant green "Farm: / Harvest:" box — farm
                      name already renders as the hero h1 and harvest date already
                      appears in the hero overlay + HARVEST trust pillar. Lot/harvest
                      now surfaces exactly 3 places: hero (glance), pillar (trust
                      strip), Batch Details card (full detail). */}
                </VStack>
              </Box>

              {/* Batch Details Card - Production traceability info */}
              {completeData?.harvestDetails && (
                <HarvestInfoCard harvestDetails={completeData.harvestDetails} />
              )}

              {/* Production Images Gallery - Visual proof of farming practices */}
              {completeData?.images && completeData.images.length > 0 ? (
                <Box
                  bg="white"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="gray.200"
                  p={{ base: 4, smd: 6 }}
                  mb={6}
                >
                  <StandardImageGallery
                    images={completeData.images}
                    title={intl.formatMessage({
                      id: 'consumer.detail.productionPhotos',
                      defaultMessage: 'Production Photos'
                    })}
                    variant="consumer"
                    enablePreview={true}
                    showImageCount={true}
                    maxDisplayImages={3}
                    aspectRatio="16/9"
                  />
                </Box>
              ) : (
                /* Explicit empty state — a 0-photo batch used to make the whole gallery card
                   vanish silently (2026-06 audit P2-9). One muted line is clearer. */
                <Box
                  bg="gray.50"
                  borderRadius="xl"
                  border="1px dashed"
                  borderColor="gray.200"
                  p={{ base: 4, smd: 5 }}
                  mb={6}
                  textAlign="center"
                >
                  <Text fontSize="sm" color="gray.500">
                    {intl.formatMessage({
                      id: 'consumer.detail.noPhotos',
                      defaultMessage:
                        'No photos for this batch — the written records below still document the season.'
                    })}
                  </Text>
                </Box>
              )}

              <Divider borderColor="gray.200" />

              {/* Environmental Impact + Production Journey */}
              <Box id="carbon-section">
                <VStack spacing={4} align="stretch">
                  {/* Consumer-Friendly Carbon Impact Explainer - Progressive Loading */}
                  <Suspense fallback={<CarbonExplainerLoader />}>
                    <CarbonImpactExplainer
                      totalCO2e={getAccurateCarbonFootprint()}
                      productName={completeData?.product?.name || completeData?.farmer?.name}
                      relatableFootprint={completeData?.relatableFootprint}
                      backendComparisons={completeData?.carbon_impact?.comparisons}
                      consumerContext={completeData?.carbon_impact?.consumer_context}
                    />
                  </Suspense>

                  {(() => {
                    // PRIORITY 1: Use complete API timeline (includes transparency fields) if it has events
                    // Get timeline events from consolidated transparency API response
                    const events = completeData?.timeline || [];

                    if (Array.isArray(events) && events.length > 0) {
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
                          // Phase 2: backend-computed curated-journey flag — the
                          // normalizer drops unknown keys (preserveOriginal: false)
                          is_highlight: (event as any).is_highlight,
                          // Add carbon data that UltraMobileProductionJourney expects
                          carbon_data: {
                            // Real per-event carbon when the backend computed it; never an
                            // even split of the total across events (that fabricated a
                            // per-event figure — 2026-06 audit P2-2). 0 = not separately known.
                            co2e: (event as any).extra_data?.carbon_calculation?.co2e || 0,
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
                          productionId={productionId || undefined}
                        />
                      );
                    } else {
                      return (
                        <VStack spacing={3} py={8}>
                          <Icon as={MdTimeline} boxSize={16} color="gray.400" />
                          <Heading as="h4" size="md" color="gray.600">
                            {intl.formatMessage({
                              id: 'app.noTimelineData',
                              defaultMessage: 'No events documented yet'
                            })}
                          </Heading>
                          <Text fontSize="sm" color="gray.400" textAlign="center">
                            {intl.formatMessage({
                              id: 'app.timelineComingSoon',
                              defaultMessage:
                                "This farm hasn't published growing details for this batch yet — check back soon."
                            })}
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

          {/* Farm Section — intro + company info */}
          <Box id="farm-section" w="100%">
            <VStack spacing={6} align="stretch">
              {/* Producer Information Transition Section */}
              <Box
                bg="white"
                borderRadius="xl"
                border="1px solid"
                borderColor="gray.200"
                p={{ base: 4, smd: 6 }}
                textAlign="center"
              >
                <VStack spacing={4}>
                  <HStack spacing={3} justify="center">
                    <Icon as={FaTractor} color="green.500" boxSize={6} />
                    <Icon as={FaUsers} color="green.500" boxSize={6} />
                    <Icon as={FaMapMarkerAlt} color="green.500" boxSize={6} />
                  </HStack>

                  <VStack spacing={2}>
                    <Heading size={{ base: 'sm', smd: 'md', lg: 'lg' }} color="gray.800">
                      {intl.formatMessage({
                        id: 'consumer.detail.meetFarmers',
                        defaultMessage: 'Meet Your Transparent Farmers'
                      })}
                    </Heading>
                    <Text color="gray.600" maxW="md" fontSize="sm">
                      {intl.formatMessage({
                        id: 'consumer.detail.meetFarmersSubtitle',
                        defaultMessage: 'The people, places, and practices behind your product.'
                      })}
                    </Text>
                  </VStack>

                  <HStack
                    spacing={5}
                    fontSize="xs"
                    color="gray.500"
                    flexWrap="wrap"
                    justify="center"
                  >
                    <HStack spacing={1}>
                      <Icon as={FaUsers} boxSize={3} />
                      <Text>
                        {intl.formatMessage({
                          id: 'consumer.detail.producer',
                          defaultMessage: 'Producer'
                        })}
                      </Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={FaUniversity} boxSize={3} />
                      <Text>
                        {intl.formatMessage({
                          id: 'consumer.detail.documentedFarm',
                          defaultMessage: 'Documented Farm'
                        })}
                      </Text>
                    </HStack>
                    <HStack spacing={1}>
                      <Icon as={FaMapMarkerAlt} boxSize={3} />
                      <Text>
                        {intl.formatMessage({
                          id: 'consumer.detail.location',
                          defaultMessage: 'Location'
                        })}
                      </Text>
                    </HStack>
                  </HStack>
                </VStack>
              </Box>

              <CompanyFarmInfo
                showContactInfo={isProofView}
                companyData={{
                  // Use company data from the enhanced API response
                  id: (completeData as any)?.farmer?.company?.id,
                  name: (completeData as any)?.farmer?.company?.name || 'Company Information',
                  description: (completeData as any)?.farmer?.company?.description,
                  address: (completeData as any)?.farmer?.company?.address,
                  city: (completeData as any)?.farmer?.company?.city,
                  state: (completeData as any)?.farmer?.company?.state,
                  country: (completeData as any)?.farmer?.company?.country,
                  website: (completeData as any)?.farmer?.company?.website,
                  facebook: (completeData as any)?.farmer?.company?.facebook,
                  instagram: (completeData as any)?.farmer?.company?.instagram,
                  logo: (completeData as any)?.farmer?.company?.logo,
                  // Defense-in-depth (2026-06-14): company PII (phone, email,
                  // contact_email, fiscal_id/Tax ID) is intentionally NOT passed to
                  // the consumer modals. The transparency endpoint already nulls these
                  // (P2-6), so this is zero-behavior-change — it just guarantees the
                  // Contact/Legal modal sections can never render PII even if the
                  // backend stripping regresses. Buyers use the BuyerDocRequest form.
                  // Company overview stats for consumer transparency
                  total_establishments: (completeData as any)?.farmer?.company
                    ?.total_establishments,
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
                  // Defense-in-depth (2026-06-14): farmer PII (contact_person,
                  // contact_phone, contact_email, email, phone) is intentionally NOT
                  // passed to the consumer modals. The transparency endpoint already
                  // nulls these (P2-6); this guarantees the Contact modal section can
                  // never render PII even if the backend stripping regresses.
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
            </VStack>
          </Box>

          <Divider borderColor="gray.200" />

          {/* Consumer Feedback Section */}
          <Box id="reviews-section" w="100%">
            <VStack spacing={8} align="stretch">
              <QuickFeedback
                productionId={productionId || ''}
                reviewsCount={(completeData as any)?.reviews?.count ?? 0}
                onFeedbackSubmitted={() => {
                  toast({
                    title: intl.formatMessage({
                      id: 'consumer.detail.feedbackThanksTitle',
                      defaultMessage: 'Thanks for your feedback!'
                    }),
                    description: intl.formatMessage({
                      id: 'consumer.detail.feedbackThanksDesc',
                      defaultMessage: 'Your scan helps this farm show real engagement.'
                    }),
                    status: 'success',
                    duration: 4000,
                    isClosable: true
                  });
                  // Refresh transparency payload so the new review/rating shows
                  refetchTransparency();
                }}
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
