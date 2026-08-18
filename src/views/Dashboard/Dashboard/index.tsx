// Chakra imports
import {
  Button,
  Flex,
  Grid,
  Icon,
  Image,
  Link,
  SimpleGrid,
  Text,
  useColorModeValue,
  Box,
  useBreakpointValue,
  HStack,
  VStack,
  Center,
  Tooltip
} from '@chakra-ui/react';
import { S3Image } from 'components/Design';
import { useBatchS3Images } from 'hooks/useBatchS3Images';
import { useSelector } from 'react-redux';
import { useMemo } from 'react';
// Custom icons
import {
  CartIcon,
  DocumentIcon,
  GlobeIcon,
  HomeIcon,
  WalletIcon
} from 'components/Icons/Icons.tsx';
import { FormattedMessage, useIntl } from 'react-intl';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useUserRole } from 'hooks/useUserRole';
import React, { useEffect, useState, useRef } from 'react';
import {
  dashboardTableData,
  establishmentData,
  parcelsData,
  timelineData
} from 'variables/general';

// Step 5: Progressive Loading Imports - TEMPORARILY DISABLED
// import { ProgressiveLoader, DashboardSkeleton } from 'components/Loading/ProgressiveLoader';
// import {
//   usePerformanceMonitor,
//   useProgressiveLoading,
//   useMobileOptimization
// } from 'hooks/usePerformanceMonitor';

import ActiveUsers from './components/ActiveUsers';
import BarChart from 'components/Charts/BarChart';
import Card from 'components/Card/Card';
import SmartUsageCard from './components/SmartUsageCard';
import CardWithImage from 'components/Card/CardWithImage';
import Shimmer from 'components/Shimmer/Shimmer';
import CarouselHorizontal from 'components/Carousel/CarouselHorizontal';
import { FaPlus, FaLeaf, FaWifi, FaLock } from 'react-icons/fa';
import LineChart from 'components/Charts/LineChart';
import MiniStatistics from './components/MiniStatistics';
import SalesOverview from './components/SalesOverview';
import bgImage from 'assets/img/backgroundImage.png';
// assets
import imageFarm from 'assets/img/imageFarm.png';
import TransparencySummaryCard from './components/farm/CarbonSummaryCard';
import CertifierReadinessCard from './components/farm/CertifierReadinessCard';
import CertifierDeadlinesStrip from './components/farm/CertifierDeadlinesStrip';
import TrialStatusBanner from 'components/Trial/TrialStatusBanner';
import { useTour } from 'hooks/useTour';
import { useTourScenario } from 'hooks/useTourScenario';

/**
 * Farm location line, without the dangling punctuation.
 *
 * This was `${city || zone || ''}, ${state}`, which renders a farm with no city as a bare
 * ", CA" — a stray leading comma under the farm name on the dashboard. Not hypothetical: the
 * `provision_pilot` command sets state and country but no city, so EVERY white-glove pilot
 * account created for October showed it on the first screen after login.
 */
const formatFarmLocation = (farm: { city?: string; zone?: string; state?: string }): string =>
  [farm?.city || farm?.zone, farm?.state]
    .map((p) => (p || '').trim())
    .filter(Boolean)
    .join(', ');
// // import BatchTestComponent from 'components/Debug/BatchTestComponent'; // DEBUG: Remove for production

export default function DashboardView() {
  const intl = useIntl();
  const { farmId } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useUserRole();
  const currentLocation = useLocation();
  const [establishment, setEstablishment] = useState(null);

  // 🚀 2025 Best Practice: Welcome banner for new company joiners
  const searchParams = new URLSearchParams(currentLocation.search);
  const showWelcome = searchParams.get('welcome') === 'true';
  const joinSource = searchParams.get('source');
  const isCompanyJoin = searchParams.get('company_join') === 'true';
  const [welcomeBannerVisible, setWelcomeBannerVisible] = useState(showWelcome);

  // Clean URL parameters after showing welcome banner
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        // Remove welcome parameters from URL without causing re-render
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Product tour — auto-starts the right welcome tour based on user scenario
  const { welcomeTourId } = useTourScenario();
  useTour(welcomeTourId, { enabled: !!establishment });

  // Force horizontal scroll for ALL screen sizes - no Grid layout wrapping
  const isMobile = true; // Always use horizontal scroll layout
  const cardWidth = useBreakpointValue({
    base: '280px',
    sm: '300px',
    md: '320px',
    lg: '340px',
    xl: 'auto'
  });
  const cardHeight = useBreakpointValue({ base: '80px', md: '90px', lg: '90px', xl: '90px' });

  // State for scroll progress tracking
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isEstablishmentsScrollable, setIsEstablishmentsScrollable] = useState(false);
  const establishmentScrollRef = useRef<HTMLDivElement>(null);

  // Check if establishments content is scrollable
  const checkEstablishmentScrollability = () => {
    if (!establishmentScrollRef.current || !establishments || establishments.length <= 1) {
      setIsEstablishmentsScrollable(false);
      return;
    }

    const { scrollWidth, clientWidth } = establishmentScrollRef.current;
    const canScroll = scrollWidth > clientWidth;

    console.log('🏢 [Dashboard] Checking establishment scrollability:', {
      scrollWidth,
      clientWidth,
      canScroll,
      establishmentsLength: establishments.length
    });

    setIsEstablishmentsScrollable(canScroll);
  };

  // Scroll handler to track progress through establishments
  const handleEstablishmentScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!establishments || establishments.length <= 1) return;

    const target = e.target as HTMLDivElement;
    const scrollLeft = target.scrollLeft;
    const scrollWidth = target.scrollWidth;
    const clientWidth = target.clientWidth;
    const maxScroll = scrollWidth - clientWidth;

    // Update scrollable state based on whether there's overflow
    const canScroll = maxScroll > 0;
    if (canScroll !== isEstablishmentsScrollable) {
      setIsEstablishmentsScrollable(canScroll);
      console.log('🏢 [Dashboard] Establishment scrollable state updated:', canScroll);
    }

    if (maxScroll > 0) {
      const progress = Math.min(scrollLeft / maxScroll, 1);
      setScrollProgress(progress);
    }
  };

  // Step 5: Progressive Loading Implementation - TEMPORARILY DISABLED
  // const { metrics, markStageComplete, resetTimer } = usePerformanceMonitor();
  // const { isMobile, optimizationStrategy } = useMobileOptimization();

  // Configure progressive loading for dashboard
  // const progressiveConfig = {
  //   primaryQueries: ['company', 'establishments', 'subscription'], // Critical for UI
  //   secondaryQueries: ['statistics', 'carbon-data', 'iot-data'], // Enhancement data
  //   enableCache: true,
  //   targetTime: 3000 // 3-second target for Step 5
  // };

  // const { stage, registerQueryLoad, isLoading, primaryLoaded } =
  //   useProgressiveLoading(progressiveConfig);

  // Subscription limits check for establishment creation
  const company = useSelector((state) => state.company?.currentCompany);
  const farmCapacity = useMemo(() => {
    if (!company) return { allowed: false, limit: null as number | null, atLimit: false };

    // `effective_limits` FIRST — base plan features PLUS purchased add-ons.
    //
    // Reading `plan.features.max_establishments` alone ignores the Extra Farm add-on
    // entirely, so a grower who had just PAID for a second farm still met a disabled "Add
    // farm" button. The backend gate (`Company.can_create_establishment`) has always added
    // the add-on quantity, so the two disagreed and the UI was the stricter of the two —
    // the worst direction for a purchase to fail in.
    const subscription = company.subscription;
    const plan = company.subscription_plan || subscription?.plan;
    const limit =
      subscription?.effective_limits?.max_establishments ?? plan?.features?.max_establishments;
    if (limit == null) return { allowed: false, limit: null, atLimit: false };

    const current = company.establishments?.length || 0;
    const allowed = limit === -1 || current < limit;

    // A pilot is capped at one farm BY AGREEMENT, so the ceiling is not news and there is
    // nothing to sell them — the account is comped. `SubscriptionSerializer.get_usage_warnings`
    // already skips the farm warning for exactly this reason ("100% used — upgrade to avoid
    // service interruption would sit permanently on every pilot's page, warning about a
    // ceiling they chose"); the dashboard tile has to make the same exception or October's
    // entire cohort meets a permanent upsell on the first screen after login.
    const isPilot =
      subscription?.plan?.slug === 'pilot' || subscription?.plan?.features?.is_pilot === true;

    // At the limit is a DIFFERENT state from "no plan loaded yet". Only the first one has
    // an answer to offer, so only the first one gets the explanatory tile.
    return { allowed, limit, atLimit: !allowed && limit !== -1 && !isPilot };
  }, [company]);

  const canCreateEstablishment = farmCapacity.allowed;

  /**
   * The tile shown in place of "+ New" once the farm limit is reached.
   *
   * Previously the button simply vanished. A grower who wanted a second farm got no
   * affordance, no reason and no route — and Extra Farm, the ONE add-on Trazo sells, had
   * nowhere in the product that pointed at it from the moment it was needed. A limit the
   * user cannot see is indistinguishable from a broken page.
   *
   * The price is deliberately not quoted here. It lives on the subscription page, which is
   * the one place that reads it from the API; repeating it in a tooltip is how a stale
   * number ends up in the UI the next time it changes.
   */
  const renderFarmLimitTile = (width: any, height: any) => (
    <Tooltip
      label={intl.formatMessage({ id: 'app.farmLimitReachedHelp' }, { limit: farmCapacity.limit })}
      placement="top"
      hasArrow>
      <Button
        p="0px"
        w={width}
        h={height}
        minW={width}
        flexShrink={0}
        bg="transparent"
        color="gray.600"
        borderRadius="xl"
        border="2px dashed"
        borderColor="gray.300"
        _hover={{ bg: 'gray.50', borderColor: 'gray.400' }}
        aria-label={intl.formatMessage(
          { id: 'app.farmLimitReachedHelp' },
          { limit: farmCapacity.limit }
        )}
        onClick={() => navigate('/admin/dashboard/subscription')}>
        <Flex direction="column" align="center" justify="center" gap={0.5}>
          <Icon as={FaLock} color="gray.600" fontSize={{ base: '12px', md: '16px' }} />
          <Text fontSize="xs" fontWeight="medium" color="gray.600" textAlign="center">
            {intl.formatMessage({ id: 'app.farmLimitReached' })}
          </Text>
        </Flex>
      </Button>
    </Tooltip>
  );

  const textColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('white', 'gray.700');
  const selectedGradient = useColorModeValue(
    'linear-gradient(81.62deg, green.700 2.25%, green.600 79.87%)',
    'linear-gradient(81.62deg, green.700 2.25%, green.800 79.87%)'
  );
  const hoverBg = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('gray.200', 'green.700');

  const bgGradient = useColorModeValue(
    'linear-gradient(to right, green.50, transparent)',
    'linear-gradient(to right, green.900, transparent)'
  );
  const shadowHover = useColorModeValue(
    '0 20px 27px 0 rgba(0, 0, 0, 0.05)',
    '0 20px 27px 0 rgba(0, 0, 0, 0.2)'
  );

  const establishments = useSelector((state) => state.company.currentCompany?.establishments);

  const activeCompany = useSelector((state) => state.company.currentCompany);

  // Onboarding hook
  // Check subscription from the company
  const subscription = activeCompany?.subscription;
  const isLoadingCompany = useSelector((state) => state.company.isLoading);

  // Step 5: Register query loads for performance tracking - TEMPORARILY DISABLED
  // useEffect(() => {
  //   if (activeCompany && !isLoadingCompany) {
  //     registerQueryLoad('company', false, activeCompany);
  //   }
  //   if (establishments) {
  //     registerQueryLoad('establishments', false, establishments);
  //   }
  //   if (subscription) {
  //     registerQueryLoad('subscription', false, subscription);
  //   }
  // }, [activeCompany, establishments, subscription, isLoadingCompany, registerQueryLoad]);

  // to check for active links and opened collapses
  let location = useLocation();

  const iconBoxInside = useColorModeValue('white', 'white');
  let mainText = useColorModeValue('gray.700', 'gray.200');

  // Early check for subscription when component first renders
  // This helps catch cases before useEffect runs
  if (
    !isLoadingCompany &&
    activeCompany &&
    Object.keys(activeCompany).length > 0 &&
    'id' in activeCompany &&
    (!subscription || activeCompany.has_subscription === false) &&
    !location.pathname.includes('/pricing') &&
    !location.pathname.includes('/stripe-success')
  ) {
    console.log('DashboardView immediate check - redirecting to pricing');
    const redirectUrl = `/admin/dashboard/pricing?new_company=false&company_id=${activeCompany.id}`;
    // Use window.location for most direct redirect
    window.location.href = redirectUrl;
    // Return loading indicator to prevent rendering the rest of the component
    return (
      <Flex justify="center" align="center" h="100vh">
        {intl.formatMessage({ id: 'app.redirecting' })}
      </Flex>
    );
  }

  // verifies if routeName is the one active (in browser input)
  const activeRoute = (routeName, isDashboard = false) => {
    if (isDashboard) {
      return location.pathname.startsWith(routeName) ? 'active' : '';
    }
    return location.pathname === routeName ? 'active' : '';
  };

  useEffect(() => {
    // Removed: window.scrollTo(0, 0); - This was causing scroll reset issues
    // Step 5: Reset performance timer on component mount - TEMPORARILY DISABLED
    // resetTimer();
  }, []);

  // Add subscription check - redirect to pricing if user has company but no subscription
  useEffect(() => {
    // Skip check if we don't have company data yet or if loading
    if (isLoadingCompany || !activeCompany) {
      console.log('Skipping subscription check - company loading or not available');
      return;
    }

    console.log('Checking subscription:', {
      activeCompany,
      subscription,
      hasSubscription: activeCompany?.has_subscription,
      pathname: location.pathname,
      fullUrl: window.location.href
    });

    // Check if user has company but no subscription
    if (
      activeCompany &&
      Object.keys(activeCompany).length > 0 &&
      'id' in activeCompany &&
      (!subscription || activeCompany.has_subscription === false) &&
      !location.pathname.includes('/pricing') &&
      !location.pathname.includes('/stripe-success')
    ) {
      console.log('No subscription found, redirecting to pricing');

      // Store company ID in localStorage instead of URL parameters
      localStorage.setItem('subscription_company_id', String(activeCompany.id));

      // Redirect URL - without query parameters
      const redirectUrl = `/admin/dashboard/pricing`;

      // Try React Router navigation
      navigate(redirectUrl, {
        replace: true
      });

      // Fallback to direct browser redirect if navigation doesn't work
      setTimeout(() => {
        if (!window.location.href.includes('pricing')) {
          console.log('Fallback: Using direct browser redirect');
          window.location.href = redirectUrl;
        }
      }, 100);
    }
  }, [activeCompany, subscription, isLoadingCompany, navigate, location.pathname]);

  useEffect(() => {
    let establishment;
    if (establishments) {
      establishment = establishments.filter(
        (establishment) => establishment.id.toString() === farmId
      )[0];
      console.log('🏗️ Dashboard useEffect: Setting establishment data', {
        farmId,
        establishment: establishment?.name,
        parcelCount: establishment?.parcels?.length,
        parcels: establishment?.parcels?.map((p) => p.name || p.id)
      });
      setEstablishment(establishment);
    }
  }, [farmId, establishments]);

  // 2025 Best Practice: Batch load S3 images for establishment
  const s3Urls = useMemo(() => {
    const urls = [];
    if (establishment?.image) {
      urls.push(establishment.image);
    }
    return urls;
  }, [establishment]);

  const { presignedUrls } = useBatchS3Images({
    s3Urls,
    enabled: s3Urls.length > 0
  });

  // Redirect to first establishment when accessing root dashboard
  useEffect(() => {
    // Only redirect if we're on the exact dashboard root (not any establishment page)
    // and we have establishments but no farmId in the URL
    const isExactDashboardRoot = location.pathname === '/admin/dashboard';
    const hasEstablishments = establishments && establishments.length > 0;
    const noEstablishmentInUrl = !farmId;

    // RTK Query optimistic updates handle cache consistency, so we can redirect normally
    if (isExactDashboardRoot && hasEstablishments && noEstablishmentInUrl) {
      const firstEstablishment = establishments[0].id;
      console.log('DashboardView: Redirecting to first establishment:', firstEstablishment);
      navigate(`/admin/dashboard/farm/${firstEstablishment}`, { replace: true });
    }
  }, [location.pathname, farmId, navigate]); // Removed establishments dependency to reduce triggers

  // Check establishment scrollability on mount and when data changes
  useEffect(() => {
    // Small delay to ensure DOM is rendered
    const timer = setTimeout(checkEstablishmentScrollability, 100);
    return () => clearTimeout(timer);
  }, [establishments]);

  // Check establishment scrollability on window resize
  useEffect(() => {
    const handleResize = () => {
      checkEstablishmentScrollability();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [establishments]);

  const toggleAddEstablishment = () => {
    navigate('/admin/dashboard/farm/add');
  };

  // Step 5: Show skeleton loading for primary content until loaded - TEMPORARILY DISABLED
  // if (stage === 'initial' || isLoadingCompany) {
  //   return <ProgressiveLoader stage={stage} type="dashboard" />;
  // }

  // Step 5: Progressive rendering based on loading stage and mobile optimization - TEMPORARILY DISABLED
  // const shouldShowSecondaryContent = stage === 'complete' || optimizationStrategy === 'standard';

  // Return null while loading - keeps app-level loading visible
  if (isLoadingCompany) {
    return null;
  }

  return (
    <Flex
      flexDirection="column"
      pt={{ base: '120px', md: '75px' }}
      px={{ base: 1, md: 6 }}
      pb={{ base: 8, md: 8 }}
      minH="100vh">
      {/* Enhanced Trial Status Banner */}
      <TrialStatusBanner />

      {/* 🚀 2025 Best Practice: Welcome Banner for New Company Joiners */}
      {welcomeBannerVisible && (
        <Box
          bg="green.50"
          borderLeftWidth="4px"
          borderLeftColor="green.700"
          p={4}
          mb={4}
          borderRadius="md"
          position="relative">
          <Flex justify="space-between" align="center">
            <Box>
              <Text fontSize="lg" fontWeight="bold" color="green.800" mb={2}>
                {intl.formatMessage({ id: 'dashboard.welcomeToTeam' })}
              </Text>
              <Text color="green.700" fontSize="sm">
                {isCompanyJoin
                  ? intl.formatMessage({ id: 'dashboard.welcomeVerifiedJoined' })
                  : joinSource === 'company_join'
                  ? intl.formatMessage({ id: 'dashboard.welcomeAccountReady' })
                  : intl.formatMessage({ id: 'dashboard.welcomeExplore' })}
              </Text>
            </Box>
            <Button
              size="sm"
              variant="ghost"
              color="green.700"
              onClick={() => setWelcomeBannerVisible(false)}
              _hover={{ bg: 'green.100' }}>
              ✕
            </Button>
          </Flex>
        </Box>
      )}

      <Box>
        <Flex
          direction={{ base: 'column', xl: 'row' }}
          gap={{ base: 4, md: 4, lg: 5, xl: 6 }}
          align="flex-start">
          <Box flex="2" w="100%" pt={{ base: 3, md: 4, lg: 6, xl: 0 }}>
            <VStack spacing={3} align="stretch">
              {/* Mobile: Simple Horizontal Scrollable Layout */}
              {isMobile ? (
                <VStack spacing={6} align="stretch" w="100%">
                  <Box
                    data-tour="farm-carousel"
                    ref={establishmentScrollRef}
                    overflowX="auto"
                    overflowY="hidden"
                    pt="2px"
                    onScroll={handleEstablishmentScroll}
                    sx={{
                      '&::-webkit-scrollbar': {
                        display: 'none'
                      },
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none',
                      WebkitOverflowScrolling: 'touch'
                    }}>
                    <HStack spacing={3} py={2} px={1} w="max-content">
                      {establishments ? (
                        <>
                          {establishments.map((prop) => (
                            <NavLink
                              key={prop.id}
                              to={`/admin/dashboard/farm/${prop.id}`}
                              style={{ textDecoration: 'none' }}>
                              <Card
                                p={4}
                                cursor="pointer"
                                bg={prop.id === establishment?.id ? 'green.700' : cardBg}
                                h={cardHeight}
                                w={cardWidth}
                                minW={cardWidth}
                                maxW={cardWidth}
                                flexShrink={0}
                                className={`trazo-card establishment-card ${
                                  prop.id === establishment?.id ? 'selected' : ''
                                }`}
                                _hover={{
                                  transform: 'translateY(-2px)',
                                  boxShadow: 'lg',
                                  transition: 'all 0.2s'
                                }}>
                                <Flex align="center" gap={4} h="full" px={2}>
                                  <Box
                                    bg={prop.id === establishment?.id ? 'white' : 'green.700'}
                                    p={{ base: 3, md: 2 }}
                                    borderRadius="lg"
                                    flexShrink={0}>
                                    <HomeIcon
                                      h={{ base: '22px', md: '24px' }}
                                      w={{ base: '22px', md: '24px' }}
                                      color={prop.id === establishment?.id ? 'green.700' : 'white'}
                                    />
                                  </Box>
                                  <Box flex="1" overflow="hidden">
                                    <Text
                                      fontWeight="bold"
                                      fontSize={{ base: 'md', md: 'md' }}
                                      color={prop.id === establishment?.id ? 'white' : textColor}
                                      noOfLines={2}
                                      lineHeight="1.3"
                                      title={prop.name}>
                                      {prop.name}
                                    </Text>
                                    <Text
                                      fontSize={{ base: 'sm', md: 'sm' }}
                                      color={
                                        prop.id === establishment?.id ? 'green.100' : 'gray.500'
                                      }
                                      noOfLines={1}
                                      mt={1}
                                      title={formatFarmLocation(prop)}>
                                      {formatFarmLocation(prop)}
                                    </Text>
                                  </Box>
                                </Flex>
                              </Card>
                            </NavLink>
                          ))}
                          {canWrite &&
                            farmCapacity.atLimit &&
                            renderFarmLimitTile({ base: '60px', md: '100px' }, cardHeight)}
                          {canWrite && canCreateEstablishment && (
                            <Button
                              p="0px"
                              w={{ base: '60px', md: '100px' }}
                              h={cardHeight}
                              minW={{ base: '60px', md: '100px' }}
                              flexShrink={0}
                              bg="transparent"
                              color="green.700"
                              borderRadius="xl"
                              border="2px dashed"
                              borderColor="gray.200"
                              _hover={{
                                bg: 'green.50',
                                borderColor: 'green.600',
                                transform: 'translateY(-2px)',
                                boxShadow: 'lg'
                              }}
                              onClick={toggleAddEstablishment}>
                              <Flex direction="column" align="center" justify="center" gap={0.5}>
                                <Icon
                                  as={FaPlus}
                                  color="green.700"
                                  fontSize={{ base: '14px', md: '20px' }}
                                />
                                <Text fontSize="xs" fontWeight="medium" color="green.700">
                                  {intl.formatMessage({ id: 'app.new' })}
                                </Text>
                              </Flex>
                            </Button>
                          )}
                        </>
                      ) : null}
                    </HStack>
                  </Box>

                  {/* Dynamic progress line indicator - only show when content is actually scrollable */}
                  {isEstablishmentsScrollable && (
                    <Box w="100%" h="3px" bg="gray.200" borderRadius="full" position="relative">
                      <Box
                        h="full"
                        bg="green.700"
                        borderRadius="full"
                        w={`${scrollProgress * 100}%`}
                        position="absolute"
                        left="0"
                        top="0"
                        transition="width 0.2s ease"
                      />
                    </Box>
                  )}
                </VStack>
              ) : (
                /* Desktop: Grid Layout */
                <Grid
                  templateColumns={{
                    md: 'repeat(auto-fill, minmax(240px, 1fr))'
                  }}
                  gap={4}>
                  {establishments ? (
                    <>
                      {establishments.map((prop) => (
                        <NavLink
                          key={prop.id}
                          to={`/admin/dashboard/farm/${prop.id}`}
                          style={{ textDecoration: 'none' }}>
                          <Card
                            p={4}
                            cursor="pointer"
                            bg={prop.id === establishment?.id ? 'green.700' : cardBg}
                            h="90px"
                            minH="90px"
                            maxH="90px"
                            className={`trazo-card establishment-card ${
                              prop.id === establishment?.id ? 'selected' : ''
                            }`}
                            _hover={{
                              transform: 'translateY(-2px)',
                              boxShadow: 'lg',
                              transition: 'all 0.2s'
                            }}>
                            <Flex align="center" gap={3} h="full">
                              <Box
                                bg={prop.id === establishment?.id ? 'white' : 'green.700'}
                                p={2}
                                borderRadius="md"
                                flexShrink={0}>
                                <HomeIcon
                                  h="24px"
                                  w="24px"
                                  color={prop.id === establishment?.id ? 'green.700' : 'white'}
                                />
                              </Box>
                              <Box flex="1" overflow="hidden">
                                <Text
                                  fontWeight="bold"
                                  fontSize="md"
                                  color={prop.id === establishment?.id ? 'white' : textColor}
                                  noOfLines={1}
                                  title={prop.name}>
                                  {prop.name}
                                </Text>
                                <Text
                                  fontSize="sm"
                                  color={prop.id === establishment?.id ? 'green.100' : 'gray.500'}
                                  noOfLines={1}
                                  title={formatFarmLocation(prop)}>
                                  {formatFarmLocation(prop)}
                                </Text>
                              </Box>
                            </Flex>
                          </Card>
                        </NavLink>
                      ))}
                      {canWrite &&
                        farmCapacity.atLimit &&
                        renderFarmLimitTile(
                          { base: '60px', md: '77px' },
                          {
                            base: '70px',
                            md: '90px'
                          }
                        )}
                      {canWrite && canCreateEstablishment && (
                        <Button
                          p="0px"
                          w={{ base: '60px', md: '77px' }}
                          h={{ base: '70px', md: '90px' }}
                          bg="transparent"
                          color="green.700"
                          borderRadius="xl"
                          border="2px dashed"
                          borderColor="gray.200"
                          _hover={{
                            bg: 'green.50',
                            borderColor: 'green.600',
                            transform: 'translateY(-2px)',
                            boxShadow: 'lg'
                          }}
                          onClick={toggleAddEstablishment}>
                          <Flex direction="column" align="center" justify="center" gap={0.5}>
                            <Icon
                              as={FaPlus}
                              color="green.700"
                              fontSize={{ base: '14px', md: '20px' }}
                            />
                            <Text fontSize="xs" fontWeight="medium" color="green.700">
                              {intl.formatMessage({ id: 'app.new' }) || 'New'}
                            </Text>
                          </Flex>
                        </Button>
                      )}
                    </>
                  ) : (
                    <Text color="gray.500" fontSize="sm" textAlign="center" py={8}>
                      {intl.formatMessage({ id: 'app.noEstablishments' }) ||
                        'No establishments found. Create your first establishment to get started.'}
                    </Text>
                  )}
                </Grid>
              )}
            </VStack>
          </Box>
        </Flex>
      </Box>

      {/* Page order, top to bottom: DEADLINES → READINESS → identity/share → RECORDS.
          Dates the certifier sets, then what is outstanding against those records — FIRST,
          above the farm-profile and QR-share cards (moved 2026-08-11: those two occupied the
          hero position while the renewal question a farmer opens the app with sat below the
          fold; the code comment claimed this order but the render didn't follow it).
          The transparency score is deliberately absent from this page as of 2026-08-04 — it
          is Trazo's own completeness metric with no external deadline. Everything at the top
          here has a real external clock: § 205.406 annual updates, certificate expiries,
          CDFA renewals. The score was retired from producer UI outright on 2026-08-11. */}
      {establishment?.id && activeCompany?.id && (
        <Box width="100%" mt={{ base: 4, md: 6 }}>
          <CertifierDeadlinesStrip companyId={activeCompany.id} farmId={establishment.id} />
        </Box>
      )}

      {establishment?.id && activeCompany?.id && (
        <Box width="100%" mt={{ base: 4, md: 6 }} data-tour="certifier-readiness">
          <CertifierReadinessCard companyId={activeCompany.id} farmId={establishment.id} />
        </Box>
      )}

      <Grid
        templateColumns={{ base: '1fr', md: '1fr', lg: '1.8fr 1.2fr' }}
        templateRows={{ base: 'auto', md: '1fr auto', lg: '1fr' }}
        my={{ base: 6, md: 6 }}
        gap={{ base: 4, md: 6 }}>
        {establishment ? (
          <CardWithImage
            title={intl.formatMessage({ id: 'app.establishmentProfile' })}
            name={establishment?.name}
            description={establishment?.description}
            state={establishment?.state}
            city={establishment?.city}
            zone={establishment?.zone}
            readMoreLink={`/admin/dashboard/farm/${establishment?.id}/profile`}
            bgGradient={bgGradient}
            borderLeft="4px solid"
            borderColor="green.500"
            boxShadow={shadowHover}
            fillHeight
            _hover={{
              boxShadow: shadowHover
            }}
            image={
              establishment?.image ? (
                <S3Image
                  src={establishment.image}
                  alt="establishment image"
                  width="100%"
                  height="100%"
                  objectFit={'cover'}
                  borderRadius="15px"
                  lazy={true}
                  presignedUrl={presignedUrls[establishment.image]}
                />
              ) : undefined
            }
          />
        ) : (
          <Card minH="290px" bg={cardBg}>
            <Shimmer height="290px" borderRadius="15px" />
          </Card>
        )}

        {establishment ? (
          <Box data-tour="smart-usage-card">
            <SmartUsageCard
              // Required props for backend API call
              companyId={activeCompany?.id}
              farmId={establishment.id}
              // Smart action handlers
              onViewAnalytics={() => navigate(`/admin/dashboard/farm/${establishment.id}/buyer`)}
              onUpgradeSubscription={() => navigate('/admin/dashboard/pricing')}
              // "growth" = log more events; /productions was never a route (dead
              // link found 2026-08-11) — the Activities page is where logging lives.
              onOptimizeCarbon={() =>
                navigate(`/admin/dashboard/farm/${establishment.id}/activities`)
              }
              onShareTransparency={() =>
                navigate(`/admin/dashboard/farm/${establishment.id}/buyer`)
              }
            />
          </Box>
        ) : (
          <Card minH="290px" bg={cardBg}>
            <Shimmer height="290px" borderRadius="15px" />
          </Card>
        )}
      </Grid>

      {/* Single Transparency Overview Card for selected establishment */}
      {/* {establishment?.id && (
        <Box width="100%" mb={{ base: 4, md: 6 }} data-tour="transparency-summary">
          <TransparencySummaryCard farmId={establishment.id} />
        </Box>
      )} */}

      <Box data-tour="parcels-carousel">
        <CarouselHorizontal
          title={intl.formatMessage({ id: 'app.parcels' })}
          description={intl.formatMessage({ id: 'app.establishmentParcels' })}
          data={establishment?.parcels}
        />
      </Box>
    </Flex>
  );
}
