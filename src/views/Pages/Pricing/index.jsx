import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorModeValue,
  Spinner,
  useToast,
  Badge,
  VStack,
  Heading,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Button,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton
} from '@chakra-ui/react';
import {
  FaCheckCircle,
  FaBuilding,
  FaMapMarkedAlt,
  FaLeaf,
  FaQrcode,
  FaDatabase,
  FaHeadset,
  FaCreditCard,
  FaShieldAlt,
  FaStar,
  FaRocket,
  FaCrown,
  FaIndustry,
  FaGift,
  FaHandshake,
  FaEnvelope,
  FaQuestionCircle,
  FaChevronDown,
  FaMicrophone,
  FaMagic
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { loadStripe } from '@stripe/stripe-js';
import config from 'config/environment';
import { useGetPlansQuery, useCreateCheckoutSessionMutation } from 'store/api/subscriptionApi';
import { useSubscribeBlockchainMutation, useGetAddonsQuery, useChangePlanMutation, useStartTrialMutation } from 'store/api/billingApi';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// Import Trazo Design System
import {
  StandardPage,
  StandardCard,
  StandardButton,
  StandardAlert,
  StandardSection
} from 'components/Design';

// Load Stripe outside of component to avoid recreating it on every render
const stripePromise = loadStripe(import.meta.env.VITE_APP_STRIPE_PUBLIC_KEY);

function Pricing({ inDashboard = false, companyId: directCompanyId = null }) {
  // Theme colors for dark mode support
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const textColorStrong = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const intl = useIntl();

  const t = (id) => intl.formatMessage({ id });

  // Add detection for new company context
  const [isNewCompany, setIsNewCompany] = React.useState(false);

  React.useEffect(() => {
    // Check if user just created a company (could be a URL param or localStorage flag)
    const urlParams = new URLSearchParams(window.location.search);
    const newCompanyFlag = urlParams.get('newCompany') || localStorage.getItem('newCompanyCreated');
    if (newCompanyFlag) {
      setIsNewCompany(true);
      localStorage.removeItem('newCompanyCreated'); // Clear the flag
    }
  }, []);

  const [activeInterval, setActiveInterval] = useState('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isUpgradeFlow, setIsUpgradeFlow] = useState(false);
  const [upgradeResourceType, setUpgradeResourceType] = useState(null);

  // Get user and company directly from Redux state instead of useAuth
  const user = useSelector((state) => state.userState.user);
  const activeCompany = useSelector((state) => state.company.currentCompany);

  const toast = useToast();

  // Use RTK Query hooks with cache busting
  const {
    data: plans = [],
    isLoading: loading,
    error,
    refetch
  } = useGetPlansQuery(activeInterval, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });
  const { data: addons = [] } = useGetAddonsQuery();
  const [createCheckoutSession] = useCreateCheckoutSessionMutation();
  const [subscribeBlockchain] = useSubscribeBlockchainMutation();
  const [changePlan] = useChangePlanMutation();
  const [startTrial, { isLoading: isStartingTrial }] = useStartTrialMutation();
  const [downgradePlanId, setDowngradePlanId] = useState(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const { isOpen: isDowngradeOpen, onOpen: onDowngradeOpen, onClose: onDowngradeClose } = useDisclosure();
  const { isOpen: isEarlyAccessOpen, onOpen: onEarlyAccessOpen, onClose: onEarlyAccessClose } = useDisclosure();
  const [earlyAccessPlanName, setEarlyAccessPlanName] = useState(null);
  const cancelRef = useRef();

  const [addonQuantities, setAddonQuantities] = useState({
    'extra-production': 1,
    'extra-parcel': 1,
    'extra-storage': 1,
    'blockchain-verification': 1
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [newCompanyFlow, setNewCompanyFlow] = useState(false);
  const [urlCompanyId, setUrlCompanyId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const newCompany = searchParams.get('new_company') === 'true';
    const companyIdParam = searchParams.get('company_id');
    const returnPath = searchParams.get('return');
    const resourceType = searchParams.get('resource');

    if (resourceType) {
      setUpgradeResourceType(resourceType);
    }

    if (returnPath === 'form') {
      setIsUpgradeFlow(true);
    }

    if (newCompany && companyIdParam) {
      setNewCompanyFlow(true);
      setUrlCompanyId(companyIdParam);
    }

    // Save the return path for after subscription
    if (returnPath) {
      localStorage.setItem('subscription_return_path', returnPath);
    }
  }, [location]);

  // Handle successful subscription completion
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const status = searchParams.get('status');
    const planSubscribed = searchParams.get('plan_subscribed');

    // Only handle success if we're actually on the pricing page (not coming from Stripe redirect)
    if (status === 'success' && !searchParams.get('session_id')) {
      toast({
        title: t('app.subscriptionSuccessful'),
        description: t('app.subscriptionSuccessfulDescription'),
        status: 'success',
        duration: 8000,
        isClosable: true
      });

      // Show blockchain add-on suggestion after successful subscription
      if (planSubscribed === 'true') {
        setTimeout(() => {
          toast({
            title: t('app.wantAddBlockchainVerification'),
            description: t('app.scrollDownBlockchainOffer'),
            status: 'info',
            duration: 10000,
            isClosable: true,
            position: 'top'
          });
        }, 3000);
      }

      // Handle return path
      const returnPath = localStorage.getItem('subscription_return_path');
      if (returnPath) {
        localStorage.removeItem('subscription_return_path');
        if (returnPath === 'form') {
          navigate('/admin/dashboard');
        }
      }

      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [location, toast, navigate, t]);

  // Get company ID for subscription
  const getCompanyId = () => {
    if (directCompanyId) return directCompanyId;
    if (urlCompanyId) return urlCompanyId;
    if (activeCompany && typeof activeCompany === 'object' && 'id' in activeCompany) {
      return activeCompany.id;
    }
    return null;
  };

  // Filter and sort plans properly
  const displayPlans = useMemo(() => {
    if (!plans || plans.length === 0) return [];

    // console.log('Raw plans data:', plans); // Debug log (disabled for production)

    // Separate Starter plan (shows in all interval views)
    const starterPlan = plans.find((plan) => plan.slug === 'starter');

    // Filter paid plans by interval
    let intervalFiltered = plans.filter(
      (plan) => plan.slug !== 'starter' && plan.interval === activeInterval
    );

    // Remove duplicates by name, preferring plans with proper slugs and higher prices
    const uniquePlans = intervalFiltered.reduce((acc, plan) => {
      const existingPlan = acc.find((p) => p.name === plan.name);

      if (!existingPlan) {
        // No existing plan with this name, add it
        acc.push(plan);
      } else {
        // Plan with same name exists, keep the better one
        const currentPrice =
          typeof plan.price === 'number' ? plan.price : parseFloat(plan.price) || 0;
        const existingPrice =
          typeof existingPlan.price === 'number'
            ? existingPlan.price
            : parseFloat(existingPlan.price) || 0;

        // Prefer plans with proper slugs (containing interval) and higher prices
        const hasProperSlug = plan.slug?.includes(plan.interval);
        const existingHasProperSlug = existingPlan.slug?.includes(existingPlan.interval);

        if (hasProperSlug && !existingHasProperSlug) {
          // Replace with plan that has proper slug
          const index = acc.findIndex((p) => p.name === plan.name);
          acc[index] = plan;
        } else if (hasProperSlug === existingHasProperSlug && currentPrice > existingPrice) {
          // Both have same slug quality, prefer higher price (newer plan)
          const index = acc.findIndex((p) => p.name === plan.name);
          acc[index] = plan;
        }
      }
      return acc;
    }, []);

    // Define the correct plan order
    const planOrder = ['basic', 'standard', 'corporate', 'enterprise'];

    // Sort by the defined order
    const sorted = uniquePlans.sort((a, b) => {
      const aIndex = planOrder.findIndex((order) => a.name.toLowerCase().includes(order));
      const bIndex = planOrder.findIndex((order) => b.name.toLowerCase().includes(order));

      // If both plans are found in the order, sort by index
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }

      // If only one is found, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;

      // If neither is found, sort by price
      return a.price - b.price;
    });

    // Limit to 4 paid plans maximum
    const paidPlans = sorted.slice(0, 4);

    // Only show Starter if user has never had a subscription (trial is one-time)
    const hasSubscription = activeCompany?.subscription?.id || activeCompany?.has_subscription;
    const limitedPlans =
      starterPlan && !hasSubscription ? [starterPlan, ...paidPlans] : paidPlans;

    // console.log('Filtered and sorted plans:', limitedPlans); // Debug log (disabled for production)

    // If in upgrade flow, filter to show only higher tier plans
    if (isUpgradeFlow && activeCompany?.subscription?.plan?.name) {
      const currentPlanName = activeCompany.subscription.plan.name.toLowerCase();
      const currentIndex = planOrder.findIndex((plan) => currentPlanName.includes(plan));

      if (currentIndex !== -1) {
        return limitedPlans.filter((plan) => {
          const planIndex = planOrder.findIndex((p) => plan.name.toLowerCase().includes(p));
          return planIndex > currentIndex;
        });
      }
    }

    return limitedPlans;
  }, [plans, activeInterval, isUpgradeFlow, activeCompany]);

  // Early check to prevent rendering during Stripe success flow.
  // All hooks must be called above this point (Rules of Hooks).
  const searchParams = new URLSearchParams(window.location.search);
  const isStripeSuccessFlow =
    searchParams.get('session_id') && searchParams.get('success') === 'true';
  const preventPricingPage = localStorage.getItem('prevent_pricing_page') === 'true';
  const skipPricingRender = localStorage.getItem('skip_pricing_render') === 'true';

  if (isStripeSuccessFlow || preventPricingPage || skipPricingRender) {
    console.log('Pricing page: Skipping render due to Stripe success flow');
    return null;
  }

  // Enhanced blockchain subscription with plan integration
  const handleSubscribeBlockchain = async () => {
    const companyId = getCompanyId();
    if (!companyId) {
      toast({
        title: t('app.error'),
        description: t('app.companyRequiredError'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setCheckoutLoading(true);

    try {
      console.log('Creating blockchain subscription for company:', companyId);

      const result = await subscribeBlockchain().unwrap();

      console.log('Blockchain subscription result:', result);

      // Handle different response formats
      let sessionId = null;
      let checkoutUrl = null;

      if (result.sessionId || result.session_id) {
        sessionId = result.sessionId || result.session_id;
      } else if (result.checkout_url) {
        checkoutUrl = result.checkout_url;
      } else if (result.url) {
        checkoutUrl = result.url;
      }

      if (checkoutUrl) {
        // Direct redirect to URL
        window.location.href = checkoutUrl;
      } else if (sessionId) {
        // Use Stripe's redirectToCheckout
        const stripe = await stripePromise;
        const { error } = await stripe.redirectToCheckout({
          sessionId: sessionId
        });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Invalid response format: missing sessionId or checkout_url');
      }
    } catch (error) {
      console.error('Blockchain subscription error:', error);

      // Enhanced error handling
      let errorMessage = t('app.blockchainSubscriptionError');

      if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Check if the error is due to missing subscription
      if (errorMessage.includes('subscription') || errorMessage.includes('plan')) {
        toast({
          title: t('app.subscriptionRequiredTitle'),
          description: t('app.subscriptionRequiredForBlockchain'),
          status: 'warning',
          duration: 7000,
          isClosable: true
        });
      } else {
        toast({
          title: t('app.blockchainSubscriptionErrorTitle'),
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } finally {
      setCheckoutLoading(false);
    }
  };

  const getRecommendedPlan = (plans) => {
    // CONSISTENT recommendation - Standard is "Most Popular"
    // Best practice: Same recommendation regardless of user journey state
    // This builds trust and follows top SaaS patterns (Stripe, Notion, Slack)
    return plans.find((plan) => plan.name.toLowerCase().includes('standard')) || plans[1];
  };

  const getPlanIcon = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('starter')) return FaGift;
    if (name.includes('basic')) return FaLeaf;
    if (name.includes('standard')) return FaRocket;
    if (name.includes('corporate')) return FaCrown;
    if (name.includes('enterprise')) return FaIndustry;
    return FaLeaf;
  };

  const getPlanColor = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('starter')) return 'teal';
    if (name.includes('basic')) return 'green';
    if (name.includes('standard')) return 'blue';
    if (name.includes('corporate')) return 'purple';
    if (name.includes('enterprise')) return 'orange';
    return 'green';
  };

  const handleSubscribe = async (planId) => {
    // Early Access intercept: show modal instead of Stripe checkout
    if (!config.PAYMENTS_ENABLED) {
      const selectedPlan = plans.find((p) => p.id === planId);
      setEarlyAccessPlanName(selectedPlan?.name || '');
      onEarlyAccessOpen();
      return;
    }

    const companyId = getCompanyId();
    if (!companyId) {
      toast({
        title: t('app.error'),
        description: t('app.companyIdRequired'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    setCheckoutLoading(true);

    try {
      console.log('Creating checkout session with:', {
        plan_id: planId,
        company_id: companyId,
        interval: activeInterval, // Include the current interval
        success_url: `${window.location.origin}/admin/dashboard/pricing?status=success&plan_subscribed=true`,
        cancel_url: window.location.href
      });

      const result = await createCheckoutSession({
        plan_id: planId,
        company_id: companyId,
        interval: activeInterval, // Send the active interval (monthly/yearly)
        success_url: `${window.location.origin}/admin/dashboard/pricing?status=success&plan_subscribed=true`,
        cancel_url: window.location.href
      }).unwrap();

      console.log('Checkout session result:', result);

      // Handle different response formats from different APIs
      let sessionId = null;
      let checkoutUrl = null;

      if (result.sessionId) {
        // subscriptionApi format
        sessionId = result.sessionId;
      } else if (result.session_id) {
        // billingApi format
        sessionId = result.session_id;
      } else if (result.url) {
        // Direct URL format
        checkoutUrl = result.url;
      }

      const stripe = await stripePromise;

      if (checkoutUrl) {
        // Direct redirect to URL
        window.location.href = checkoutUrl;
      } else if (sessionId) {
        // Use Stripe's redirectToCheckout
        const { error } = await stripe.redirectToCheckout({
          sessionId: sessionId
        });

        if (error) {
          throw new Error(error.message);
        }
      } else {
        throw new Error('Invalid response format: missing sessionId or url');
      }
    } catch (error) {
      console.error('Subscription error:', error);

      // Enhanced error handling
      let errorMessage = error.message || t('app.subscriptionErrorDescription');

      if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.data?.message) {
        errorMessage = error.data.message;
      }

      toast({
        title: t('app.subscriptionError'),
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartTrial = async () => {
    const companyId = getCompanyId();
    if (!companyId) return;

    try {
      await startTrial({ companyId }).unwrap();
      toast({
        title: t('app.trialStarted'),
        description: t('app.trialStartedDescription'),
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      navigate('/admin/dashboard/billing');
    } catch (error) {
      toast({
        title: t('app.error'),
        description: error?.data?.error || t('app.trialStartError'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleDowngrade = (planId) => {
    const companyId = getCompanyId();
    if (!companyId) return;
    setDowngradePlanId(planId);
    onDowngradeOpen();
  };

  const confirmDowngrade = async () => {
    const companyId = getCompanyId();
    if (!companyId || !downgradePlanId) return;

    setIsDowngrading(true);
    try {
      const result = await changePlan({ companyId, planId: downgradePlanId }).unwrap();
      toast({
        title: t('app.downgradeScheduled'),
        description: result.status || t('app.downgradeScheduledDescription'),
        status: 'info',
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: t('app.error'),
        description: error?.data?.error || t('app.downgradeError'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsDowngrading(false);
      setDowngradePlanId(null);
      onDowngradeClose();
    }
  };

  // Detect expired trial (Starter plan with canceled/expired status)
  const subscriptionStatus = activeCompany?.subscription?.status;
  const subscriptionPlanSlug = activeCompany?.subscription?.plan?.slug || '';
  const isTrialExpired =
    subscriptionPlanSlug.includes('starter') &&
    (subscriptionStatus === 'expired' || subscriptionStatus === 'canceled');

  // Get current plan name for comparison
  // The subscription structure is: activeCompany.subscription.plan.name
  const currentPlanName = activeCompany?.subscription?.plan?.name?.toLowerCase() || '';
  const isCurrentPlan = (planName) => {
    if (!currentPlanName) return false;
    // Handle both exact matches and partial matches (e.g., "Basic" matches "basic-monthly")
    const planLower = planName.toLowerCase();
    return (
      currentPlanName === planLower ||
      currentPlanName.includes(planLower) ||
      planLower.includes(currentPlanName.split('-')[0])
    );
  };

  // Check if selecting a plan would be a downgrade (lower tier than current)
  // Upgrade-only policy: Users must contact support to downgrade
  const isDowngrade = (targetPlanName) => {
    if (!currentPlanName) return false; // No current plan = not a downgrade
    const planOrder = ['starter', 'basic', 'standard', 'corporate', 'enterprise'];
    const currentIndex = planOrder.findIndex((p) => currentPlanName.includes(p));
    const targetIndex = planOrder.findIndex((p) => targetPlanName.toLowerCase().includes(p));
    // If target plan is lower tier than current, it's a downgrade
    return currentIndex !== -1 && targetIndex !== -1 && targetIndex < currentIndex;
  };

  return (
    <StandardPage
      title={
        newCompanyFlow || isNewCompany
          ? t('app.companyCreatedSuccessTitle')
          : isTrialExpired
          ? t('app.trialExpiredTitle')
          : t('app.selectPlan')
      }
      description={
        newCompanyFlow || isNewCompany
          ? intl.formatMessage(
              { id: 'app.companyReadySelectPlan' },
              { name: activeCompany?.name || t('app.newCompany') }
            )
          : isTrialExpired
          ? t('app.trialExpiredDescription')
          : t('app.upgradePlanUnlockFeatures')
      }
      showBackButton={!newCompanyFlow && !isNewCompany}
      onBack={() => navigate(-1)}
    >
      {/* Welcome Badge for New Companies - Modern 2025 Style */}
      {(newCompanyFlow || isNewCompany) && (
        <Box textAlign="center" mb={10}>
          <Badge
            colorScheme="green"
            variant="solid"
            fontSize="sm"
            px={6}
            py={2}
            borderRadius="full"
            fontWeight="semibold"
            textTransform="none"
          >
            {t('app.step2SelectPlan')}
          </Badge>
        </Box>
      )}

      {/* Upgrade Context Banner */}
      {isUpgradeFlow && (
        <StandardAlert
          status="info"
          title={t('app.updateYourPlanTitle')}
          description={
            upgradeResourceType === 'establishment'
              ? t('app.needMoreEstablishments')
              : upgradeResourceType === 'parcel'
              ? t('app.needMoreParcels')
              : t('app.upgradeForMoreResources')
          }
        />
      )}

      {/* Plans Section */}
      <StandardSection
        title={t('app.subscriptionPlansTitle')}
        description={t('app.designedForFarmersSubtitle')}
        className="plans-section"
      >
        {/* Interval Toggle */}
        <VStack spacing={8} w="full">
          <VStack spacing={4}>
            <Text fontSize="sm" color="gray.600" textAlign="center">
              {t('app.chooseBillingCycle')}
            </Text>
            <HStack
              spacing={1}
              bg="gray.100"
              p={1}
              borderRadius="lg"
              role="group"
              aria-label={t('app.chooseBillingCycle')}
            >
              <StandardButton
                variant={activeInterval === 'monthly' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveInterval('monthly')}
                borderRadius="md"
                px={6}
                aria-pressed={activeInterval === 'monthly'}
                aria-label={t('app.monthlyLabel')}
              >
                {t('app.monthlyLabel')}
              </StandardButton>
              <StandardButton
                variant={activeInterval === 'yearly' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveInterval('yearly')}
                borderRadius="md"
                px={6}
                aria-pressed={activeInterval === 'yearly'}
                aria-label={t('app.annualLabel')}
              >
                <HStack spacing={2}>
                  <Text>{t('app.annualLabel')}</Text>
                  <Badge colorScheme="green" fontSize="xs" px={2} py={1} borderRadius="full">
                    {t('app.annualDiscount')}
                  </Badge>
                </HStack>
              </StandardButton>
            </HStack>
          </VStack>

          {/* Plans Grid */}
          {loading ? (
            <VStack spacing={4} py={12}>
              <Spinner size="xl" color="green.500" />
              <Text color="gray.500">{t('app.loadingPlans')}</Text>
              <StandardButton
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                isLoading={loading}
              >
                {t('app.refreshPricing')}
              </StandardButton>
            </VStack>
          ) : displayPlans.length === 0 ? (
            <StandardAlert
              status="info"
              title={t('app.alreadyHighestPlanTitle')}
              description={t('app.contactSalesForCustom')}
            />
          ) : (
            <SimpleGrid
              columns={{ base: 1, md: 2, lg: Math.min(displayPlans.length, 5) }}
              spacing={5}
              w="full"
              justifyItems="center"
              maxW="1600px"
              mx="auto"
            >
              {displayPlans.map((plan) => {
                const isRecommended = plan.id === getRecommendedPlan(displayPlans)?.id;
                const planIcon = getPlanIcon(plan.name);
                const planColor = getPlanColor(plan.name);
                const isCurrent = isCurrentPlan(plan.name);

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ width: '100%', maxWidth: '300px' }}
                  >
                    <StandardCard
                      variant={isCurrent ? 'elevated' : isRecommended ? 'elevated' : 'outline'}
                      borderColor={
                        isCurrent ? 'blue.400' : isRecommended ? `${planColor}.400` : 'gray.100'
                      }
                      borderWidth={isCurrent ? '2px' : isRecommended ? '2px' : '1px'}
                      bg={isCurrent ? 'blue.50' : 'white'}
                      position="relative"
                      overflow="hidden"
                      h="full"
                      display="flex"
                      flexDirection="column"
                      boxShadow={isRecommended ? 'xl' : 'sm'}
                      _hover={{ boxShadow: 'xl' }}
                    >
                      {/* Current Plan Badge */}
                      {isCurrent && (
                        <Badge
                          position="absolute"
                          top={4}
                          left={4}
                          colorScheme="blue"
                          variant="solid"
                          fontSize="xs"
                          px={3}
                          py={1}
                          borderRadius="full"
                          fontWeight="bold"
                          zIndex={2}
                        >
                          {t('app.currentPlanBadge')}
                        </Badge>
                      )}
                      {/* Recommended Badge */}
                      {isRecommended && !isCurrent && (
                        <Badge
                          position="absolute"
                          top={-3}
                          left="50%"
                          transform="translateX(-50%)"
                          colorScheme={planColor}
                          variant="solid"
                          fontSize="xs"
                          px={4}
                          py={1.5}
                          borderRadius="full"
                          fontWeight="semibold"
                          textTransform="uppercase"
                          letterSpacing="wide"
                          zIndex={2}
                        >
                          {t('app.recommendedBadge')}
                        </Badge>
                      )}

                      <Box pb={4} pt={6}>
                        <VStack spacing={4} align="center">
                          {/* Plan Icon */}
                          <Box
                            p={3}
                            bg={`${planColor}.100`}
                            borderRadius="full"
                            border="2px solid"
                            borderColor={`${planColor}.200`}
                          >
                            <Icon as={planIcon} boxSize={8} color={`${planColor}.600`} />
                          </Box>

                          {/* Plan Name & Description */}
                          <VStack spacing={2} textAlign="center">
                            <Heading as="h3" size="lg" color="gray.800" fontWeight="bold">
                              {plan.name}
                            </Heading>
                            <Text
                              color="gray.600"
                              fontSize="sm"
                              textAlign="center"
                              minH="50px"
                              px={2}
                              lineHeight="1.5"
                              display="flex"
                              alignItems="center"
                            >
                              {plan.description}
                            </Text>
                          </VStack>

                          {/* Pricing */}
                          <VStack spacing={2}>
                            {plan.slug === 'starter' ? (
                              <>
                                <Text fontSize="3xl" fontWeight="bold" color="teal.600">
                                  {t('app.starterTrialLength')}
                                </Text>
                                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                                  {t('app.starterNoCreditCard')}
                                </Text>
                              </>
                            ) : (
                              <>
                                <HStack align="baseline" justify="center">
                                  <Text fontSize="3xl" fontWeight="bold" color={`${planColor}.600`}>
                                    $
                                    {(() => {
                                      const price =
                                        typeof plan.price === 'number'
                                          ? plan.price
                                          : parseFloat(plan.price) || 0;
                                      return price.toFixed(2);
                                    })()}
                                  </Text>
                                  <VStack spacing={0} align="start">
                                    <Text color="gray.500" fontSize="sm" fontWeight="medium">
                                      /
                                      {activeInterval === 'monthly'
                                        ? t('app.perMonthShort')
                                        : t('app.perYearShort')}
                                    </Text>
                                  </VStack>
                                </HStack>
                                {activeInterval === 'yearly' && (
                                  <Text fontSize="sm" color="gray.500">
                                    $
                                    {(() => {
                                      const price =
                                        typeof plan.price === 'number'
                                          ? plan.price
                                          : parseFloat(plan.price) || 0;
                                      return (price / 12).toFixed(0);
                                    })()}
                                    {t('app.billedAnnually')}
                                  </Text>
                                )}
                              </>
                            )}
                          </VStack>
                        </VStack>
                      </Box>

                      <CardBody py={5} flex="1">
                        <VStack spacing={4} align="stretch" h="full">
                          <Box textAlign="center" mb={3}>
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              color="gray.700"
                              textTransform="uppercase"
                              letterSpacing="wide"
                            >
                              {t('app.featuresIncluded')}
                            </Text>
                            <Box w="40px" h="1px" bg={`${planColor}.300`} mx="auto" mt={2} />
                          </Box>

                          {/* Core Features */}
                          {plan.features?.max_establishments && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaBuilding} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {plan.features.max_establishments === -1
                                  ? t('app.unlimitedEstablishmentsFeature')
                                  : plan.features.max_establishments === 1
                                  ? intl.formatMessage(
                                      { id: 'app.establishmentCount' },
                                      { count: 1 }
                                    )
                                  : intl.formatMessage(
                                      { id: 'app.establishmentsCount' },
                                      { count: plan.features.max_establishments }
                                    )}
                              </Text>
                            </HStack>
                          )}

                          {(plan.features?.max_parcels ||
                            plan.features?.max_parcels_per_establishment) && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaMapMarkedAlt} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {plan.features.max_parcels_per_establishment
                                  ? plan.features.max_parcels_per_establishment === -1
                                    ? t('app.unlimitedParcelsPerEstablishment')
                                    : plan.features.max_parcels_per_establishment === 1
                                    ? intl.formatMessage(
                                        { id: 'app.parcelPerEstablishment' },
                                        { count: 1 }
                                      )
                                    : intl.formatMessage(
                                        { id: 'app.parcelsPerEstablishment' },
                                        { count: plan.features.max_parcels_per_establishment }
                                      )
                                  : plan.features.max_parcels === -1
                                  ? t('app.unlimitedParcelsFeature')
                                  : plan.features.max_parcels === 1
                                  ? intl.formatMessage({ id: 'app.parcelCount' }, { count: 1 })
                                  : intl.formatMessage(
                                      { id: 'app.parcelsCount' },
                                      { count: plan.features.max_parcels }
                                    )}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.max_productions_per_year && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaLeaf} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {plan.features.max_productions_per_year === -1
                                  ? t('app.unlimitedProductionsPerYear')
                                  : plan.features.max_productions_per_year === 1
                                  ? intl.formatMessage(
                                      { id: 'app.productionPerYear' },
                                      { count: 1 }
                                    )
                                  : intl.formatMessage(
                                      { id: 'app.productionsPerYear' },
                                      { count: plan.features.max_productions_per_year }
                                    )}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.monthly_scan_limit && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaQrcode} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {plan.features.monthly_scan_limit === -1
                                  ? t('app.unlimitedQrScans')
                                  : intl.formatMessage(
                                      { id: 'app.qrScansPerMonth' },
                                      { count: plan.features.monthly_scan_limit.toLocaleString() }
                                    )}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.storage_limit_gb && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaDatabase} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {plan.features.storage_limit_gb === -1
                                  ? t('app.unlimitedStorageFeature')
                                  : intl.formatMessage(
                                      { id: 'app.storageGbFeature' },
                                      { size: plan.features.storage_limit_gb }
                                    )}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.support_response_time && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaHeadset} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {intl.formatMessage(
                                  { id: 'app.supportInHours' },
                                  { hours: plan.features.support_response_time }
                                )}
                              </Text>
                            </HStack>
                          )}

                          {/* Transparency Tracking - Available on all plans */}
                          <HStack spacing={2} align="center">
                            <Icon as={FaLeaf} color={`${planColor}.500`} boxSize={4} />
                            <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                              {intl.formatMessage({ id: 'app.transparencyTracking' })}
                            </Text>
                          </HStack>

                          {/* AI Event Templates - Available on all plans */}
                          {plan.features?.ai_event_templates && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaMagic} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.aiEventTemplatesFeature')}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.priority_support && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaStar} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.prioritySupportFeature')}
                              </Text>
                            </HStack>
                          )}

                          {/* Enterprise Features */}
                          {plan.features?.dedicated_support && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaHeadset} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.dedicatedSupportFeature')}
                              </Text>
                            </HStack>
                          )}

                          {/* Voice Recording */}
                          {plan.features?.voice_recording && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaMicrophone} color={`${planColor}.500`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.voiceRecordingFeature')}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </CardBody>

                      <Box pt={4} pb={6} px={4}>
                        <VStack spacing={3} w="full">
                          {/* Starter: Free trial CTA */}
                          {plan.slug === 'starter' ? (
                            <StandardButton
                              variant="primary"
                              size="md"
                              leftIcon={<Icon as={FaGift} />}
                              w="full"
                              h="10"
                              fontSize="sm"
                              fontWeight="bold"
                              colorScheme="teal"
                              onClick={handleStartTrial}
                              isLoading={isStartingTrial}
                              loadingText={t('app.processing')}
                              isDisabled={isCurrentPlan('starter')}
                              aria-label={t('app.starterTrialCta')}
                            >
                              {isCurrentPlan('starter')
                                ? t('app.currentPlanButton')
                                : t('app.starterTrialCta')}
                            </StandardButton>
                          ) : isDowngrade(plan.name) ? (
                            <Tooltip
                              label={t('subscription.downgradeTooltip')}
                              placement="top"
                              hasArrow
                            >
                              <Box w="full">
                                <StandardButton
                                  variant="outline"
                                  size="md"
                                  leftIcon={<Icon as={FaChevronDown} />}
                                  w="full"
                                  h="10"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  colorScheme="orange"
                                  onClick={() => handleDowngrade(plan.id)}
                                  isLoading={isDowngrading && downgradePlanId === plan.id}
                                  loadingText={t('app.processing')}
                                  aria-label={`${t('app.downgrade')} ${plan.name}`}
                                >
                                  {t('app.downgrade')}
                                </StandardButton>
                              </Box>
                            </Tooltip>
                          ) : (
                            /* Current or Upgrade: Show appropriate button */
                            <StandardButton
                              variant={isCurrent ? 'solid' : isRecommended ? 'primary' : 'outline'}
                              size="md"
                              onClick={() => !isCurrent && handleSubscribe(plan.id)}
                              isLoading={checkoutLoading && !isCurrent}
                              loadingText={t('app.processingPayment')}
                              leftIcon={<Icon as={isCurrent ? FaCheckCircle : FaCreditCard} />}
                              w="full"
                              h="10"
                              fontSize="sm"
                              fontWeight="bold"
                              colorScheme={isCurrent ? 'blue' : planColor}
                              isDisabled={isCurrent}
                              aria-label={
                                isCurrent
                                  ? `${t('app.currentPlanButton')}: ${plan.name}`
                                  : `${t('app.selectPlanButton')}: ${plan.name}`
                              }
                              _hover={
                                isCurrent
                                  ? {}
                                  : {
                                      transform: 'translateY(-1px)',
                                      boxShadow: 'md'
                                    }
                              }
                            >
                              {isCurrent
                                ? t('app.currentPlanButton')
                                : newCompanyFlow || isNewCompany
                                ? t('app.startFreeTrialButton')
                                : t('app.selectPlanButton')}
                            </StandardButton>
                          )}

                          {plan.features?.trial_with_card_days && (
                            <HStack spacing={1} justify="center">
                              <Icon as={FaGift} color="green.500" boxSize={3} />
                              <Text fontSize="xs" color="gray.500" textAlign="center">
                                {intl.formatMessage(
                                  { id: 'app.freeTrialIncluded' },
                                  { days: plan.features.trial_with_card_days }
                                )}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    </StandardCard>
                  </motion.div>
                );
              })}
            </SimpleGrid>
          )}
        </VStack>
      </StandardSection>

      {/* Compact Blockchain Add-on Section */}
      <StandardSection
        title={t('app.blockchainVerificationSection')}
        description={t('app.addImmutableCarbonData')}
      >
        <Box maxW="4xl" mx="auto">
          <StandardCard variant="outline" borderColor="green.200" bg="green.50">
            <CardBody p={4}>
              <VStack spacing={4}>
                {/* Compact Header */}
                <HStack spacing={3} w="full" align="center" justify="space-between">
                  <HStack spacing={3} flex={1}>
                    <Box p={2} bg="green.100" borderRadius="full">
                      <Icon as={FaShieldAlt} boxSize={6} color="green.600" />
                    </Box>

                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontWeight="bold" color="gray.700" fontSize="sm">
                        {t('app.immutableCarbonRecords')}
                      </Text>
                      <Text color="gray.500" fontSize="xs">
                        {t('app.addImmutableCarbonData')}
                      </Text>
                    </VStack>
                  </HStack>

                  <VStack spacing={0} align="center" minW="60px">
                    <Text fontSize="xl" fontWeight="bold" color="green.600">
                      ${addons.find(a => a.slug === 'blockchain-verification')?.price ?? 15}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      /{t('app.perMonthShort')}
                    </Text>
                  </VStack>
                </HStack>

                {/* Compact Benefits */}
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} w="full">
                  <HStack
                    spacing={2}
                    p={2}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.100"
                  >
                    <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="xs" fontWeight="bold" color="gray.700">
                        {t('app.usdaVerificationFeature')}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {t('app.automaticCompliance')}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack
                    spacing={2}
                    p={2}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.100"
                  >
                    <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="xs" fontWeight="bold" color="gray.700">
                        {t('app.carbonCreditsFeature')}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {t('app.marketAccess')}
                      </Text>
                    </VStack>
                  </HStack>

                  <HStack
                    spacing={2}
                    p={2}
                    bg="white"
                    borderRadius="md"
                    border="1px solid"
                    borderColor="green.100"
                  >
                    <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                    <VStack align="start" spacing={0} flex={1}>
                      <Text fontSize="xs" fontWeight="bold" color="gray.700">
                        {t('app.immutableRecordsFeature')}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {t('app.transparentBlockchain')}
                      </Text>
                    </VStack>
                  </HStack>
                </SimpleGrid>

                {/* Action Section */}
                <VStack spacing={3} w="full">
                  {activeCompany?.subscription ? (
                    <VStack spacing={2} w="full">
                      <Text fontSize="xs" color="green.600" textAlign="center" fontWeight="medium">
                        {t('app.perfectYouHaveActivePlan')}
                      </Text>
                      <HStack spacing={2} justify="center">
                        <StandardButton
                          variant="primary"
                          size="sm"
                          onClick={handleSubscribeBlockchain}
                          isLoading={checkoutLoading}
                          loadingText={t('app.processingPayment')}
                          leftIcon={<Icon as={FaShieldAlt} />}
                          colorScheme="green"
                        >
                          {t('app.addBlockchainPrice')}
                        </StandardButton>
                        <StandardButton
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/admin/dashboard')}
                          leftIcon={<Icon as={FaRocket} />}
                        >
                          {t('app.goToDashboard')}
                        </StandardButton>
                      </HStack>
                    </VStack>
                  ) : (
                    <VStack spacing={1} w="full">
                      <Text fontSize="xs" color="blue.600" textAlign="center" fontWeight="medium">
                        {t('app.selectPlanFirstBlockchain')}
                      </Text>
                      <Text fontSize="xs" color="gray.500" textAlign="center" maxW="sm">
                        {t('app.afterSubscribingBlockchain')}
                      </Text>
                    </VStack>
                  )}
                </VStack>
              </VStack>
            </CardBody>
          </StandardCard>
        </Box>
      </StandardSection>

      {/* Benefits Section - Modern 2025 Style */}
      <Box mt={4}>
        <StandardSection
          title={intl.formatMessage({ id: 'app.whyChooseTrazo' })}
          description={intl.formatMessage({ id: 'app.designedForFarmers' })}
        >
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} maxW="1200px" mx="auto">
            {[
              {
                icon: FaLeaf,
                color: 'green',
                titleId: 'app.agriculturalFocus',
                descId: 'app.agriculturalFocusDescription'
              },
              {
                icon: FaQrcode,
                color: 'blue',
                titleId: 'app.totalTraceability',
                descId: 'app.totalTraceabilityDescription'
              },
              {
                icon: FaHandshake,
                color: 'purple',
                titleId: 'app.consumerTrust',
                descId: 'app.consumerTrustDescription'
              }
            ].map((benefit, index) => (
              <motion.div
                key={index}
                whileHover={{ y: -4, scale: 1.01 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Card
                  bg={cardBgColor}
                  borderRadius="xl"
                  boxShadow="sm"
                  border="1px solid"
                  borderColor={borderColor}
                  h="full"
                  _hover={{ boxShadow: 'md' }}
                  transition="all 0.2s"
                >
                  <CardBody p={6} textAlign="center">
                    <VStack spacing={4}>
                      <Box
                        p={4}
                        bg={`${benefit.color}.50`}
                        borderRadius="full"
                        w="64px"
                        h="64px"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <Icon as={benefit.icon} boxSize={7} color={`${benefit.color}.500`} />
                      </Box>
                      <Heading size="sm" color={textColorStrong}>
                        {intl.formatMessage({ id: benefit.titleId })}
                      </Heading>
                      <Text color={mutedTextColor} fontSize="sm" lineHeight="1.6">
                        {intl.formatMessage({ id: benefit.descId })}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </SimpleGrid>
        </StandardSection>
      </Box>

      {/* FAQ Section - Trazo Standard Pattern */}
      <StandardSection
        title={intl.formatMessage({ id: 'app.faq' })}
        description={intl.formatMessage({ id: 'app.faqDescription' })}
      >
        <Box maxW="800px" mx="auto">
          <VStack spacing={4} align="stretch">
            <FAQCard
              question={intl.formatMessage({ id: 'app.faqCanChangePlan' })}
              answer={intl.formatMessage({ id: 'app.faqCanChangePlanAnswer' })}
            />
            <FAQCard
              question={intl.formatMessage({ id: 'app.faqHowTrialWorks' })}
              answer={intl.formatMessage({ id: 'app.faqHowTrialWorksAnswer' })}
            />
            <FAQCard
              question={intl.formatMessage({ id: 'app.faqBlockchainIncluded' })}
              answer={intl.formatMessage({ id: 'app.faqBlockchainIncludedAnswer' })}
            />
          </VStack>
        </Box>
      </StandardSection>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog
        isOpen={isDowngradeOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDowngradeClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              {t('app.downgradeConfirmTitle')}
            </AlertDialogHeader>
            <AlertDialogBody>
              {t('app.downgradeConfirmMessage')}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDowngradeClose}>
                {t('app.cancel')}
              </Button>
              <Button
                colorScheme="orange"
                onClick={confirmDowngrade}
                ml={3}
                isLoading={isDowngrading}
              >
                {t('app.confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      {/* Early Access Modal */}
      <Modal isOpen={isEarlyAccessOpen} onClose={onEarlyAccessClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl" mx={4}>
          <ModalHeader pb={2}>
            <HStack spacing={3}>
              <Icon as={FaRocket} color="green.500" boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {t('app.earlyAccess.title')}
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                {t('app.earlyAccess.body')}
              </Text>
              <Box bg="green.50" p={4} borderRadius="lg" borderLeft="4px solid" borderLeftColor="green.400">
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  {t('app.earlyAccess.foundingMember')}
                </Text>
              </Box>
              {earlyAccessPlanName && (
                <HStack spacing={2} bg="gray.50" p={3} borderRadius="md">
                  <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {t('app.earlyAccess.selectedPlan')}: <strong>{earlyAccessPlanName}</strong>
                  </Text>
                </HStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter pt={2} gap={3}>
            <StandardButton
              variant="outline"
              size="md"
              onClick={() => {
                onEarlyAccessClose();
                window.location.href = 'mailto:oscar@trazo.io?subject=Early Access - ' + (earlyAccessPlanName || 'Trazo');
              }}
              leftIcon={<Icon as={FaEnvelope} />}
            >
              {t('app.earlyAccess.contactUs')}
            </StandardButton>
            <StandardButton
              variant="primary"
              size="md"
              colorScheme="green"
              onClick={() => {
                onEarlyAccessClose();
                handleStartTrial();
              }}
              leftIcon={<Icon as={FaGift} />}
            >
              {t('app.earlyAccess.startTrial')}
            </StandardButton>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}

// FAQ Card Component - Trazo Standard Pattern (from EducationFAQ.tsx)
const FAQCard = ({ question, answer }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');

  return (
    <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm">
      <CardBody p={6}>
        <VStack align="stretch" spacing={4}>
          {/* Question */}
          <HStack
            justify="space-between"
            align="center"
            cursor="pointer"
            onClick={() => setIsExpanded(!isExpanded)}
            _hover={{ opacity: 0.8 }}
          >
            <Heading size="sm" color={textColor} flex={1} pr={4}>
              {question}
            </Heading>
            <Icon
              as={FaChevronDown}
              color="green.500"
              transform={isExpanded ? 'rotate(180deg)' : 'none'}
              transition="transform 0.2s"
              flexShrink={0}
            />
          </HStack>

          {/* Answer - only show when expanded */}
          {isExpanded && (
            <Box pl={4} borderLeft="3px solid" borderColor="green.200">
              <Text fontSize="sm" color={mutedTextColor} lineHeight="1.6">
                {answer}
              </Text>
            </Box>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
};

export default Pricing;
