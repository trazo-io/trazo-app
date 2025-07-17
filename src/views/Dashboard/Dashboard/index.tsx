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
  Box
} from '@chakra-ui/react';
import { S3Image } from 'components/Design';
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
import React, { useEffect, useState } from 'react';
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
import CardWithBackground from './components/CardWithBackground';
import CardWithImage from 'components/Card/CardWithImage';
import CarouselHorizontal from 'components/Carousel/CarouselHorizontal';
import { FaPlus, FaLeaf, FaWifi } from 'react-icons/fa';
import LineChart from 'components/Charts/LineChart';
import MiniStatistics from './components/MiniStatistics';
import SalesOverview from './components/SalesOverview';
import bgImage from 'assets/img/backgroundImage.png';
import defaultEstablishmentImage from 'assets/img/basic-auth.png';
// assets
import imageFarm from 'assets/img/imageFarm.png';
import { useSelector } from 'react-redux';
import CarbonSummaryCard from './components/establishment/CarbonSummaryCard';
import CarbonDashboard from './Establishment/CarbonDashboard';
import IoTDashboard from './Establishment/IoTDashboard';
import TrialStatusBanner from 'components/Trial/TrialStatusBanner';
import GuidedOnboarding from 'components/Onboarding/GuidedOnboarding';
import { useOnboarding } from 'hooks/useOnboarding';

export default function DashboardView() {
  const intl = useIntl();
  const { establishmentId } = useParams();
  const navigate = useNavigate();
  const [establishment, setEstablishment] = useState(null);

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

  const textColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('white', 'gray.700');
  const selectedGradient = useColorModeValue(
    'linear-gradient(81.62deg, #2E7D32 2.25%, #059669 79.87%)',
    'linear-gradient(81.62deg, #2E7D32 2.25%, #1B5E20 79.87%)'
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
  const {
    isOnboardingOpen,
    closeOnboarding,
    shouldShowOnboarding,
    openOnboarding,
    resetOnboarding
  } = useOnboarding();

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
        Redirecting...
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
        (establishment) => establishment.id.toString() === establishmentId
      )[0];
      setEstablishment(establishment);
    }
  }, [establishmentId, establishments]);

  // Redirect to first establishment when accessing root dashboard
  useEffect(() => {
    // Only redirect if we're on the exact dashboard root and have establishments
    if (
      location.pathname === '/admin/dashboard' &&
      establishments &&
      establishments.length > 0 &&
      !establishmentId
    ) {
      const firstEstablishment = establishments[0].id;
      console.log('DashboardView: Redirecting to first establishment:', firstEstablishment);
      navigate(`/admin/dashboard/establishment/${firstEstablishment}`, { replace: true });
    }
  }, [location.pathname, establishments, establishmentId, navigate]);

  const toggleAddEstablishment = () => {
    navigate('/admin/dashboard/establishment/add');
  };

  // Step 5: Show skeleton loading for primary content until loaded - TEMPORARILY DISABLED
  // if (stage === 'initial' || isLoadingCompany) {
  //   return <ProgressiveLoader stage={stage} type="dashboard" />;
  // }

  // Step 5: Progressive rendering based on loading stage and mobile optimization - TEMPORARILY DISABLED
  // const shouldShowSecondaryContent = stage === 'complete' || optimizationStrategy === 'standard';

  // Simple loading check for now
  if (isLoadingCompany) {
    return (
      <Flex justify="center" align="center" h="100vh">
        Loading...
      </Flex>
    );
  }

  return (
    <Flex
      flexDirection="column"
      pt={{ base: '120px', md: '75px' }}
      pl={{ base: '0px', xl: '12px' }}>
      {/* Enhanced Trial Status Banner */}
      <TrialStatusBanner />

      {/* Test Onboarding - Remove this in production
      <Box position="fixed" top="100px" right="20px" zIndex={9999}>
        <Button 
          colorScheme="blue" 
          size="sm"
          onClick={() => {
            resetOnboarding();
            openOnboarding();
          }}
        >
          🚀 Test Onboarding
        </Button>
      </Box> */}

      {/* Guided Onboarding Modal */}
      <GuidedOnboarding
        isOpen={isOnboardingOpen}
        onClose={closeOnboarding}
        companyName={activeCompany?.name}
        currentEstablishmentId={establishmentId}
      />

      <Box>
        <Flex direction={{ base: 'column', md: 'row' }} gap={6} align="flex-start">
          <Box flex="2">
            <Grid
              templateColumns={{
                base: 'repeat(auto-fill, minmax(200px, 1fr))',
                sm: 'repeat(auto-fill, minmax(220px, 1fr))',
                md: 'repeat(auto-fill, minmax(240px, 1fr))'
              }}
              gap={{ base: 3, md: 4 }}>
              {establishments ? (
                <>
                  {establishments.map((prop) => (
                    <NavLink
                      key={prop.id}
                      to={`/admin/dashboard/establishment/${prop.id}`}
                      style={{ textDecoration: 'none' }}>
                      <Card
                        p={{ base: 3, md: 4 }}
                        cursor="pointer"
                        bg={prop.id === establishment?.id ? 'trazo.forest' : cardBg}
                        h={{ base: '80px', md: '90px' }}
                        minH={{ base: '80px', md: '90px' }}
                        maxH={{ base: '80px', md: '90px' }}
                        className={`trazo-card establishment-card ${
                          prop.id === establishment?.id ? 'selected' : ''
                        }`}
                        _hover={{
                          transform: 'translateY(-2px)',
                          boxShadow: 'lg',
                          transition: 'all 0.2s'
                        }}>
                        <Flex align="center" gap={{ base: 2, md: 3 }} h="full">
                          <Box
                            bg={prop.id === establishment?.id ? 'white' : 'trazo.forest'}
                            p={{ base: 1.5, md: 2 }}
                            borderRadius="md"
                            flexShrink={0}>
                            <HomeIcon
                              h={{ base: '20px', md: '24px' }}
                              w={{ base: '20px', md: '24px' }}
                              color={prop.id === establishment?.id ? 'trazo.forest' : 'white'}
                            />
                          </Box>
                          <Box flex="1" overflow="hidden">
                            <Text
                              fontWeight="bold"
                              fontSize={{ base: 'sm', md: 'md' }}
                              color={prop.id === establishment?.id ? 'white' : textColor}
                              noOfLines={1}
                              title={prop.name}>
                              {prop.name}
                            </Text>
                            <Text
                              fontSize={{ base: 'xs', md: 'sm' }}
                              color={prop.id === establishment?.id ? 'green.100' : 'gray.500'}
                              noOfLines={1}
                              title={`${prop.city || prop.zone || ''}, ${prop.state}`}>
                              {`${prop.city || prop.zone || ''}, ${prop.state}`}
                            </Text>
                          </Box>
                        </Flex>
                      </Card>
                    </NavLink>
                  ))}
                  <Button
                    p="0px"
                    w={{ base: '64px', md: '77px' }}
                    h={{ base: '80px', md: '90px' }}
                    bg="transparent"
                    color="trazo.forest"
                    borderRadius="xl"
                    border="2px dashed"
                    borderColor="gray.200"
                    _hover={{
                      bg: 'green.50',
                      borderColor: 'trazo.forest',
                      transform: 'translateY(-2px)',
                      boxShadow: 'lg'
                    }}
                    onClick={toggleAddEstablishment}>
                    <Flex direction="column" justifyContent="center" alignItems="center">
                      <Icon
                        as={FaPlus}
                        w={{ base: '10px', md: '12px' }}
                        h={{ base: '10px', md: '12px' }}
                        mb={{ base: '6px', md: '8px' }}
                      />
                      <Text fontSize={{ base: 'xs', md: 'sm' }} fontWeight="bold">
                        {intl.formatMessage({ id: 'app.new' })}
                      </Text>
                    </Flex>
                  </Button>
                </>
              ) : (
                <Card minH="115px" bg={cardBg} />
              )}
            </Grid>
          </Box>
        </Flex>
      </Box>

      <Grid
        templateColumns={{ md: '1fr', lg: '1.8fr 1.2fr' }}
        templateRows={{ md: '1fr auto', lg: '1fr' }}
        my="26px"
        gap="24px">
        {establishment ? (
          <CardWithImage
            title={intl.formatMessage({ id: 'app.establishmentProfile' })}
            name={establishment?.name}
            description={establishment?.description}
            state={establishment?.state}
            city={establishment?.city}
            zone={establishment?.zone}
            readMoreLink={`/admin/dashboard/establishment/${establishment?.id}/profile`}
            bgGradient={bgGradient}
            borderLeft="4px solid"
            borderColor="green.500"
            boxShadow={shadowHover}
            _hover={{
              boxShadow: shadowHover
            }}
            image={
              <S3Image
                src={establishment?.image || defaultEstablishmentImage}
                alt="establishment image"
                width="100%"
                height="100%"
                objectFit={'cover'}
                borderRadius="15px"
                lazy={true}
                fallbackSrc={defaultEstablishmentImage}
              />
            }
          />
        ) : (
          <Card minH="290px" bg={cardBg} />
        )}

        {establishment ? (
          <CardWithBackground
            backgroundImage={imageFarm}
            title={intl.formatMessage({ id: 'app.certifications' })}
            description={intl.formatMessage({ id: 'app.certifications_description' })}
          />
        ) : (
          <Card minH="290px" bg={cardBg} />
        )}
      </Grid>
      {/* Carbon Summary Card for selected establishment */}
      {establishment?.id && (
        <Box flex="1" width="100%" pb="24px" overflow="hidden">
          <CarbonSummaryCard establishmentId={establishment.id} />
        </Box>
      )}
      <CarouselHorizontal
        title={intl.formatMessage({ id: 'app.parcels' })}
        description={intl.formatMessage({ id: 'app.establishmentParcels' })}
        data={establishment?.parcels}
      />
    </Flex>
  );
}
