import React, { useEffect, useCallback, useState } from 'react';
import {
  Box,
  Flex,
  Progress,
  Text,
  Tag,
  SimpleGrid,
  Stat,
  StatNumber,
  StatHelpText,
  Icon,
  Button,
  useColorModeValue,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Stack,
  Divider,
  Badge,
  Alert,
  AlertIcon,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  AlertTitle,
  AlertDescription,
  Collapse,
  IconButton,
  Spinner,
  Container,
  Tooltip,
  List,
  ListItem,
  ListIcon
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import { StandardPage } from 'components/Design/StandardComponents';
import {
  FaBuilding,
  FaMapMarkedAlt,
  FaLeaf,
  FaQrcode,
  FaDatabase,
  FaSync,
  FaChartBar,
  FaPlus,
  FaCreditCard,
  FaCog,
  FaHeadset,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowUp,
  FaFileInvoiceDollar,
  FaPlusCircle,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaExternalLinkAlt,
  FaCrown,
  FaShieldAlt,
  FaExclamationTriangle
} from 'react-icons/fa';
import { useSelector, useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from 'store';
import { Company } from 'types/company';
import { useGetCompanyQuery } from 'store/api/companyApi';
import {
  useGetBillingDashboardQuery,
  useGetBlockchainSubscriptionStatusQuery,
  useLazyGetBlockchainSubscriptionStatusQuery,
  useCancelSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useAddAddonMutation,
  useSetDefaultPaymentMethodMutation,
  useCreateCheckoutSessionMutation,
  useSubscribeBlockchainMutation
} from 'store/api/billingApi';
import { setCompany } from 'store/features/companySlice';
import { MastercardIcon, VisaIcon, PayPalIcon } from 'components/Icons/Icons';
import { FaWallet, FaRocket, FaEnvelope, FaGift } from 'react-icons/fa';
import config from 'config/environment';

// Helper functions
const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

const formatPrice = (price: number | null | undefined, quantity: number = 1): string => {
  if (price === null || price === undefined || price === 0) return '$0.00';
  const numPrice = Number(price);
  if (isNaN(numPrice)) return '$0.00';
  const total = numPrice * Math.max(quantity, 0);
  return `$${total.toFixed(2)}`;
};

const getDaysRemaining = (trialEndDate: string | Date | null | undefined): number => {
  if (!trialEndDate) return 0;
  try {
    const end = new Date(trialEndDate);
    if (isNaN(end.getTime())) return 0;
    const now = new Date();
    const diffTime = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  } catch (error) {
    console.error('Error calculating days remaining:', error);
    return 0;
  }
};

const getTrialProgressPercentage = (subscription: any): number => {
  if (!subscription || !subscription.trial_end || !subscription.current_period_start) {
    return 0;
  }
  try {
    const start = new Date(subscription.current_period_start);
    const end = new Date(subscription.trial_end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const now = new Date();
    const totalDuration = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    if (totalDuration <= 0) return 0;
    if (elapsed <= 0) return 0;
    if (elapsed >= totalDuration) return 100;
    return Math.round((elapsed / totalDuration) * 100);
  } catch (error) {
    console.error('Error calculating trial progress:', error);
    return 0;
  }
};

function UnifiedSubscriptionDashboard() {
  const intl = useIntl();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const toast = useToast();
  const activeCompany = useSelector((state: RootState) => state.company.currentCompany) as Company;
  const isLoadingCompany = useSelector((state: RootState) => state.company.isLoading);

  const textColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('white', 'gray.700');
  const tabBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [showAddons, setShowAddons] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isEarlyAccessOpen, onOpen: onEarlyAccessOpen, onClose: onEarlyAccessClose } = useDisclosure();
  const [earlyAccessPlanName, setEarlyAccessPlanName] = useState<string | null>(null);

  // API Queries
  const { refetch: refetchCompany, isLoading: isRefreshing } = useGetCompanyQuery(
    activeCompany?.id?.toString() || '',
    {
      skip: !activeCompany?.id,
      refetchOnMountOrArgChange: false
    }
  );

  const {
    data: dashboardData = { subscription: [], addons: [], paymentMethods: [], invoices: [] },
    isLoading: isDashboardLoading,
    refetch: refetchDashboard
  } = useGetBillingDashboardQuery(undefined, {
    skip: !activeCompany,
    refetchOnMountOrArgChange: true
  });

  const { data: blockchainStatus, refetch: refetchBlockchainStatus } =
    useGetBlockchainSubscriptionStatusQuery({});
  const [syncBlockchainStatus] = useLazyGetBlockchainSubscriptionStatusQuery();

  // Mutations
  const [cancelSubscription, { isLoading: isCancellingSubscription }] =
    useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivatingSubscription }] =
    useReactivateSubscriptionMutation();
  const [addAddon, { isLoading: isAddingAddon }] = useAddAddonMutation();
  const [setDefaultPaymentMethod] = useSetDefaultPaymentMethodMutation();
  const [createCheckoutSession, { isLoading: isCreatingCheckoutSession }] =
    useCreateCheckoutSessionMutation();
  const [subscribeBlockchain, { isLoading: isSubscribingBlockchain }] =
    useSubscribeBlockchainMutation();

  // Extract data
  const subscription =
    Array.isArray(dashboardData?.subscription) && dashboardData.subscription.length > 0
      ? dashboardData.subscription[0]
      : activeCompany?.subscription;
  const plan = subscription?.plan;
  const features = plan?.features || {};
  const isTrial = subscription?.status === 'trialing';
  const addons = dashboardData?.addons || [];
  const paymentMethods = dashboardData?.paymentMethods || [];
  const invoices = dashboardData?.invoices || [];

  const hasSubscription = subscription && Object.keys(subscription).length > 0;

  // Handle refresh from URL params
  const queryParams = new URLSearchParams(location.search);
  const fromAddon = queryParams.get('from_addon') === 'true';
  const fromBlockchainSubscription = queryParams.get('blockchain_subscription') === 'success';
  const blockchainSessionId = queryParams.get('session_id') || '';

  const handleRefreshData = useCallback(async () => {
    try {
      const result = await refetchCompany();
      if (result.error) throw result.error;
      if (result.data) {
        dispatch(setCompany(result.data));
        toast({
          title: intl.formatMessage({ id: 'app.dataRefreshed' }),
          status: 'success',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: intl.formatMessage({ id: 'app.errorRefreshingData' }),
        status: 'error',
        duration: 5000
      });
    }
  }, [refetchCompany, toast, intl, dispatch]);

  // Auto-refresh after add-on purchase
  useEffect(() => {
    if (fromAddon) {
      toast({
        title: intl.formatMessage({ id: 'app.addonPurchaseSuccessful' }),
        description: intl.formatMessage({ id: 'app.addonPurchaseSuccessDescription' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      handleRefreshData();
      setTimeout(() => handleRefreshData(), 3000);
      setTimeout(() => handleRefreshData(), 8000);
      navigate(location.pathname, { replace: true });
    }
  }, [fromAddon, handleRefreshData, navigate, toast, intl, location.pathname]);

  // Auto-sync blockchain status after successful subscription
  useEffect(() => {
    if (fromBlockchainSubscription) {
      // Call sync endpoint to validate with Stripe and update database
      const syncStatus = async () => {
        try {
          // First sync with Stripe to update the database
          // Pass the session_id if available for direct validation
          const syncResult = await syncBlockchainStatus({
            sync: true,
            session_id: blockchainSessionId || undefined
          });
          console.log('Blockchain sync result:', syncResult);

          // Wait a moment for database to update
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Refetch the status to update UI
          const refetchResult = await refetchBlockchainStatus();
          console.log('Blockchain refetch result:', refetchResult);

          toast({
            title: intl.formatMessage({ id: 'app.blockchainSubscriptionSuccessful' }),
            description: intl.formatMessage({ id: 'app.blockchainSubscriptionSuccessDescription' }),
            status: 'success',
            duration: 5000,
            isClosable: true
          });

          // Clear the URL params AFTER sync completes
          navigate(location.pathname, { replace: true });
        } catch (error) {
          console.error('Error syncing blockchain status:', error);
          // Still clear URL params on error
          navigate(location.pathname, { replace: true });
        }
      };
      syncStatus();
    }
  }, [
    fromBlockchainSubscription,
    blockchainSessionId,
    syncBlockchainStatus,
    refetchBlockchainStatus,
    navigate,
    toast,
    intl,
    location.pathname
  ]);

  // Usage Metrics Calculation
  const countTotalParcels = (): number => {
    try {
      if (!activeCompany?.establishments || !Array.isArray(activeCompany.establishments)) return 0;
      return activeCompany.establishments.reduce((total, establishment) => {
        if (!establishment || typeof establishment !== 'object') return total;
        const parcelCount = establishment.parcels?.length || 0;
        return total + Math.max(0, parcelCount);
      }, 0);
    } catch (error) {
      console.error('Error counting parcels:', error);
      return 0;
    }
  };

  // Helper to calculate total parcels limit
  // Total = parcels_per_establishment × establishments (or unlimited if either is -1)
  const calculateTotalParcelsLimit = () => {
    const parcelsPerEst = features?.max_parcels_per_establishment;
    const maxEst = features?.max_establishments;

    // -1 means unlimited
    if (parcelsPerEst === -1 || maxEst === -1) {
      return -1; // Unlimited
    }

    // Calculate total: parcels per establishment × number of establishments
    const perEst = Math.max(0, parcelsPerEst || 0);
    const establishments = Math.max(0, maxEst || 0);
    return perEst * establishments;
  };

  // Helper to format limit display (handles -1 = unlimited)
  const formatLimit = (limit: number) => {
    return limit === -1 ? -1 : Math.max(0, limit);
  };

  // Helper to get per-establishment parcel distribution with status
  const getEstablishmentParcelDistribution = () => {
    if (!activeCompany?.establishments || !Array.isArray(activeCompany.establishments)) {
      return [];
    }

    const maxParcelsPerEst = features?.max_parcels_per_establishment ?? 0;
    const isUnlimitedPerEst = maxParcelsPerEst === -1;

    return activeCompany.establishments.map((establishment) => {
      const parcelCount = establishment.parcels?.length || 0;
      const isAtLimit = !isUnlimitedPerEst && parcelCount >= maxParcelsPerEst;
      const hasCapacity = isUnlimitedPerEst || parcelCount < maxParcelsPerEst;
      const remainingSlots = isUnlimitedPerEst ? -1 : Math.max(0, maxParcelsPerEst - parcelCount);

      return {
        id: establishment.id,
        name: establishment.name || `Establishment ${establishment.id}`,
        parcelCount,
        maxParcels: maxParcelsPerEst,
        isAtLimit,
        hasCapacity,
        remainingSlots,
        isUnlimited: isUnlimitedPerEst
      };
    });
  };

  // Check if any establishment has available capacity
  const getAvailableCapacityInfo = () => {
    const distribution = getEstablishmentParcelDistribution();
    const establishmentsWithCapacity = distribution.filter((est) => est.hasCapacity);
    const establishmentsAtLimit = distribution.filter((est) => est.isAtLimit);
    const totalRemaining = distribution.reduce(
      (sum, est) => sum + (est.isUnlimited ? 0 : est.remainingSlots),
      0
    );

    return {
      distribution,
      establishmentsWithCapacity,
      establishmentsAtLimit,
      totalRemaining,
      hasAnyCapacity: establishmentsWithCapacity.length > 0
    };
  };

  const usageMetrics = [
    {
      icon: FaBuilding,
      name: 'app.establishments',
      used: Math.max(0, activeCompany?.establishments?.length || 0),
      limit: formatLimit(features?.max_establishments ?? 0),
      colorScheme: 'blue'
    },
    {
      icon: FaMapMarkedAlt,
      name: 'app.parcels',
      used: countTotalParcels(),
      limit: formatLimit(calculateTotalParcelsLimit()),
      colorScheme: 'green'
    },
    {
      icon: FaLeaf,
      name: 'app.productions',
      used: Math.max(0, subscription?.used_productions || 0),
      limit: formatLimit(features?.max_productions_per_year ?? 0),
      colorScheme: 'orange'
    },
    {
      icon: FaQrcode,
      name: 'app.scans',
      used: Math.max(0, subscription?.scan_count || 0),
      limit: formatLimit(features?.monthly_scan_limit ?? 0),
      colorScheme: 'purple'
    },
    {
      icon: FaDatabase,
      name: 'app.storage',
      used: Math.max(0, Number(subscription?.used_storage_gb) || 0),
      limit: formatLimit(features?.storage_limit_gb ?? 0),
      unit: 'GB',
      colorScheme: 'cyan'
    }
  ];

  // Handlers
  const handleCancelSubscription = async () => {
    if (!subscription) return;
    try {
      await cancelSubscription(subscription.id).unwrap();
      toast({
        title: intl.formatMessage({ id: 'app.subscriptionCanceled' }),
        description: intl.formatMessage({ id: 'app.subscriptionCanceledDescription' }),
        status: 'info',
        duration: 5000,
        isClosable: true
      });
      refetchDashboard();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.errorCancelingSubscription' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleReactivateSubscription = async () => {
    if (!subscription) return;
    try {
      await reactivateSubscription(subscription.id).unwrap();
      toast({
        title: intl.formatMessage({ id: 'app.subscriptionReactivated' }),
        description: intl.formatMessage({ id: 'app.subscriptionReactivatedDescription' }),
        status: 'success',
        duration: 5000,
        isClosable: true
      });
      refetchDashboard();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.errorReactivatingSubscription' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleOpenAddonModal = (addon: any) => {
    if (!config.PAYMENTS_ENABLED) {
      setEarlyAccessPlanName(addon?.name || 'Add-on');
      onEarlyAccessOpen();
      return;
    }
    setSelectedAddon(addon);
    setAddonQuantity(1);
    onOpen();
  };

  const handleAddAddon = async () => {
    if (!subscription || !selectedAddon) return;
    try {
      const response = await addAddon({
        subscriptionId: subscription.id,
        addonId: selectedAddon.id,
        quantity: addonQuantity,
        return_url: window.location.origin + `/admin/dashboard/subscription?from_addon=true`
      }).unwrap();

      onClose();

      if (response?.url) {
        toast({
          title: intl.formatMessage({ id: 'app.redirectingToCheckout' }),
          description: intl.formatMessage({ id: 'app.addonPurchaseRedirect' }),
          status: 'info',
          duration: 3000,
          isClosable: true
        });
        window.location.href = response.url;
      } else {
        toast({
          title: intl.formatMessage({ id: 'app.addonAdded' }),
          description: intl.formatMessage({ id: 'app.addonAddedDescription' }),
          status: 'success',
          duration: 5000,
          isClosable: true
        });
        setSelectedAddon(null);
        setAddonQuantity(1);
        refetchDashboard();
      }
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.errorAddingAddon' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleAddPaymentMethod = useCallback(() => {
    if (!activeCompany?.id) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.companyNotSelected' }),
        status: 'error',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    createCheckoutSession({
      company_id: activeCompany.id,
      mode: 'setup',
      success_url: window.location.href + '?refresh=true',
      cancel_url: window.location.href
    })
      .unwrap()
      .then((response) => {
        if (response && response.url) {
          window.location.href = response.url;
        }
      })
      .catch((error) => {
        toast({
          title: intl.formatMessage({ id: 'app.error' }),
          description: intl.formatMessage({ id: 'app.errorCreatingCheckout' }),
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      });
  }, [activeCompany, createCheckoutSession, toast, intl]);

  const handleSetDefaultPaymentMethod = useCallback(
    (paymentMethodId: string) => {
      if (!paymentMethodId) return;

      setDefaultPaymentMethod(paymentMethodId)
        .unwrap()
        .then(() => {
          toast({
            title: intl.formatMessage({ id: 'app.success' }),
            description: intl.formatMessage({ id: 'app.paymentMethodSetAsDefault' }),
            status: 'success',
            duration: 3000,
            isClosable: true
          });
          refetchDashboard();
        })
        .catch((error) => {
          toast({
            title: intl.formatMessage({ id: 'app.error' }),
            description: intl.formatMessage({ id: 'app.errorSettingDefaultPaymentMethod' }),
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        });
    },
    [setDefaultPaymentMethod, toast, intl, refetchDashboard]
  );

  const handleSubscribeBlockchain = useCallback(async () => {
    if (!config.PAYMENTS_ENABLED) {
      setEarlyAccessPlanName('Blockchain Verification');
      onEarlyAccessOpen();
      return;
    }

    if (!hasSubscription) {
      toast({
        title: intl.formatMessage({ id: 'app.subscriptionRequired' }),
        description: intl.formatMessage({ id: 'subscription.needActiveForBlockchain' }),
        status: 'warning',
        duration: 5000,
        isClosable: true
      });
      return;
    }

    try {
      const response = await subscribeBlockchain().unwrap();
      if (response.checkout_url) {
        window.location.href = response.checkout_url;
      }
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.errorCreatingCheckout' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [subscribeBlockchain, hasSubscription, toast, intl, onEarlyAccessOpen]);

  const isLoading =
    isDashboardLoading ||
    isRefreshing ||
    isCancellingSubscription ||
    isReactivatingSubscription ||
    isAddingAddon ||
    isCreatingCheckoutSession ||
    isSubscribingBlockchain;

  // Return null while loading - this keeps the app-level loading visible
  // and prevents any intermediate states from flashing
  if (isLoadingCompany || isDashboardLoading || !activeCompany) {
    return null;
  }

  if (!hasSubscription) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'app.subscription' })}
        description={intl.formatMessage({ id: 'app.noActiveSubscription' })}
        showBackButton
        onBack={() => navigate(-1)}
      >
        <Card>
          <CardBody textAlign="center" py={10}>
            <Icon as={FaInfoCircle} boxSize={12} color="blue.500" mb={4} />
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              {intl.formatMessage({ id: 'app.noActiveSubscription' })}
            </Text>
            <Text mb={6} maxW="lg" mx="auto" color="gray.600">
              {intl.formatMessage({ id: 'app.noSubscriptionDescription' })}

            </Text>
            <Button
              colorScheme="green"
              size="lg"
              onClick={() => navigate('/admin/dashboard/pricing')}
            >
              {intl.formatMessage({ id: 'app.viewPlans' })}
            </Button>
          </CardBody>
        </Card>
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.subscription' })}
      description={intl.formatMessage({ id: 'app.manageYourSubscriptionAndTrackUsage' })}
      showBackButton
      onBack={() => navigate(-1)}
      headerAction={
        <Button
          leftIcon={<FaSync />}
          colorScheme="green"
          variant="outline"
          size="sm"
          isLoading={isLoading}
          onClick={() => {
            refetchDashboard();
            handleRefreshData();
          }}
        >
          {intl.formatMessage({ id: 'app.refresh' })}
        </Button>
      }
    >
      <VStack spacing={6} align="stretch">
        {/* Trial Banner */}
        {isTrial && (
          <Card
            mb={6}
            borderLeftWidth="4px"
            borderLeftColor="green.500"
            overflow="hidden"
            position="relative"
          >
            <Box
              position="absolute"
              bottom={0}
              left={0}
              height="4px"
              bg="green.400"
              width={`${getTrialProgressPercentage(subscription)}%`}
            />
            <CardBody>
              <Flex
                direction={{ base: 'column', md: 'row' }}
                justify="space-between"
                align={{ base: 'start', md: 'center' }}
              >
                <Box mb={{ base: 3, md: 0 }}>
                  <Text fontSize="lg" fontWeight="bold" color="green.700" mb={2}>
                    {intl.formatMessage({ id: 'app.trialActive' })}
                  </Text>
                  <Text color="gray.700">
                    {intl.formatMessage(
                      { id: 'app.trialEndsOn' },
                      {
                        date: formatDate(subscription?.trial_end)
                      }
                    )}
                    {' · '}
                    <Text as="span" fontWeight="bold">
                      {getDaysRemaining(subscription?.trial_end)}{' '}
                      {intl.formatMessage({ id: 'app.daysRemaining' })}
                    </Text>
                  </Text>
                </Box>
                <Button
                  colorScheme="green"
                  size="md"
                  onClick={() => navigate('/admin/dashboard/pricing')}
                  rightIcon={<Icon as={FaCrown} />}
                >
                  {intl.formatMessage({ id: 'app.upgradeNow' })}
                </Button>
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* Main Content with Tabs */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody p={0}>
            <Tabs variant="enclosed" colorScheme="blue">
              <TabList px={{ base: 2, md: 6 }} pt={{ base: 3, md: 6 }} borderBottom="1px" borderColor={borderColor}>
                <Tab
                  fontSize={{ base: 'xs', md: 'md' }}
                  whiteSpace="nowrap"
                  px={{ base: 2, md: 4 }}
                  _selected={{
                    color: 'blue.600',
                    borderColor: 'blue.600',
                    fontWeight: 'semibold'
                  }}
                >
                  <Icon as={FaChartBar} mr={{ base: 1, md: 2 }} boxSize={{ base: 3, md: 4 }} />
                  {intl.formatMessage({ id: 'app.overview' })}
                </Tab>
                <Tab
                  fontSize={{ base: 'xs', md: 'md' }}
                  whiteSpace="nowrap"
                  px={{ base: 2, md: 4 }}
                  _selected={{
                    color: 'blue.600',
                    borderColor: 'blue.600',
                    fontWeight: 'semibold'
                  }}
                >
                  <Icon as={FaCreditCard} mr={{ base: 1, md: 2 }} boxSize={{ base: 3, md: 4 }} />
                  {intl.formatMessage({ id: 'app.billing' })}
                </Tab>
                <Tab
                  fontSize={{ base: 'xs', md: 'md' }}
                  whiteSpace="nowrap"
                  px={{ base: 2, md: 4 }}
                  _selected={{
                    color: 'blue.600',
                    borderColor: 'blue.600',
                    fontWeight: 'semibold'
                  }}
                >
                  <Icon as={FaFileInvoiceDollar} mr={{ base: 1, md: 2 }} boxSize={{ base: 3, md: 4 }} />
                  {intl.formatMessage({ id: 'app.invoices' })}
                </Tab>
              </TabList>

              <TabPanels>
                {/* Overview Tab */}
                <TabPanel p={{ base: 3, md: 6 }}>
                  <VStack spacing={6} align="stretch">
                    {/* Current Plan Card */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.currentPlan' })}
                      </Text>
                      <Card bg={tabBg} borderWidth="1px" borderColor={borderColor}>
                        <CardBody>
                          <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'start' }} mb={4} gap={3}>
                            <Box>
                              <Flex wrap="wrap" align="center" gap={2} mb={2}>
                                <Text fontSize={{ base: 'xl', md: '2xl' }} fontWeight="bold" color={textColor} whiteSpace="nowrap">
                                  {plan?.name}
                                </Text>
                                <Badge
                                  colorScheme={
                                    subscription?.status === 'active' ||
                                    subscription?.status === 'trialing'
                                      ? 'green'
                                      : subscription?.status === 'canceled'
                                      ? 'red'
                                      : 'gray'
                                  }
                                  fontSize="sm"
                                  px={2}
                                  py={1}
                                >
                                  {intl.formatMessage({ id: `subscription.status${(subscription?.status || 'unknown').charAt(0).toUpperCase() + (subscription?.status || 'unknown').slice(1)}` })}
                                </Badge>
                              </Flex>
                              <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" color="blue.600">
                                ${plan?.price}
                                <Text as="span" fontSize={{ base: 'md', md: 'lg' }} color="gray.500" fontWeight="normal">
                                  /{intl.formatMessage({ id: `app.${plan?.interval}` })}
                                </Text>
                              </Text>
                            </Box>
                            <HStack spacing={2} justify={{ base: 'flex-start', md: 'flex-end' }}>
                              {subscription?.cancel_at_period_end ? (
                                <Button
                                  size="sm"
                                  colorScheme="blue"
                                  onClick={handleReactivateSubscription}
                                  isLoading={isReactivatingSubscription}
                                >
                                  {intl.formatMessage({ id: 'app.reactivate' })}
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    colorScheme="blue"
                                    variant="outline"
                                    onClick={() => navigate('/admin/dashboard/pricing')}
                                  >
                                    {intl.formatMessage({ id: 'app.changePlan' })}
                                  </Button>
                                  <Button
                                    size="sm"
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={handleCancelSubscription}
                                    isLoading={isCancellingSubscription}
                                  >
                                    {intl.formatMessage({ id: 'app.cancel' })}
                                  </Button>
                                </>
                              )}
                            </HStack>
                          </Flex>

                          {subscription?.cancel_at_period_end && (
                            <Alert status="warning" borderRadius="md" mb={4}>
                              <AlertIcon />
                              <Text fontSize="sm">
                                {intl.formatMessage({ id: 'app.subscriptionWillCancel' })}{' '}
                                {formatDate(subscription?.current_period_end)}
                              </Text>
                            </Alert>
                          )}

                          {subscription?.pending_plan && (
                            <Alert status="info" borderRadius="md" mb={4}>
                              <AlertIcon />
                              <Text fontSize="sm">
                                {intl.formatMessage(
                                  { id: 'app.pendingDowngradeTo' },
                                  { planName: subscription.pending_plan.name }
                                )}
                              </Text>
                            </Alert>
                          )}

                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'app.currentPeriod' })}
                              </Text>
                              <Text fontWeight="medium">
                                {formatDate(subscription?.current_period_start)} -{' '}
                                {formatDate(subscription?.current_period_end)}
                              </Text>
                            </Box>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'app.nextBillingDate' })}
                              </Text>
                              <Text fontWeight="medium">
                                {formatDate(subscription?.current_period_end)}
                              </Text>
                            </Box>
                          </SimpleGrid>
                        </CardBody>
                      </Card>
                    </Box>

                    {/* Usage Warnings */}
                    {subscription?.usage_warnings && subscription.usage_warnings.length > 0 && (
                      <VStack spacing={3} mb={4}>
                        {subscription.usage_warnings.map((warning: any) => (
                          <Alert
                            key={warning.metric}
                            status={warning.level === 'critical' ? 'error' : 'warning'}
                            borderRadius="md"
                            variant="left-accent"
                          >
                            <AlertIcon />
                            <Box flex="1">
                              <AlertTitle fontSize="sm">
                                {warning.label}: {intl.formatMessage(
                                  { id: 'app.usagePercentUsed' },
                                  { percentage: warning.percentage }
                                )}
                              </AlertTitle>
                              <AlertDescription fontSize="xs">
                                {intl.formatMessage(
                                  { id: 'app.usageOfLimit' },
                                  { used: warning.used, limit: warning.limit }
                                )}{' '}
                                {warning.level === 'critical'
                                  ? intl.formatMessage({ id: 'app.usageWarningCritical' })
                                  : intl.formatMessage({ id: 'app.usageWarningNear' })}
                              </AlertDescription>
                            </Box>
                            <Button
                              size="xs"
                              colorScheme={warning.level === 'critical' ? 'red' : 'orange'}
                              variant="outline"
                              onClick={() => navigate('/admin/dashboard/pricing')}
                            >
                              {intl.formatMessage({ id: 'app.usageWarningUpgrade' })}
                            </Button>
                          </Alert>
                        ))}
                      </VStack>
                    )}

                    {/* Usage Metrics */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.usageMetrics' })}
                      </Text>
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                        {usageMetrics.map((metric) => {
                          const isUnlimited = metric.limit === -1;
                          const percentage = isUnlimited
                            ? 0
                            : Math.round((metric.used / Math.max(metric.limit, 1)) * 100);

                          // Enhanced Parcels card with hierarchical breakdown
                          if (metric.name === 'app.parcels') {
                            const capacityInfo = getAvailableCapacityInfo();
                            const maxParcelsPerEst = features?.max_parcels_per_establishment ?? 0;
                            const maxEstablishments = features?.max_establishments ?? 0;
                            const isUnlimitedPerEst = maxParcelsPerEst === -1;
                            const isUnlimitedEst = maxEstablishments === -1;
                            const hasEstablishmentsAtLimit = capacityInfo.establishmentsAtLimit.length > 0;

                            return (
                              <Card
                                key={metric.name}
                                borderColor={hasEstablishmentsAtLimit ? 'orange.200' : borderColor}
                                bg={cardBg}
                                _hover={{ boxShadow: 'md' }}
                                gridColumn={{ base: 'span 1', lg: 'span 2' }}
                              >
                                <CardBody>
                                  <Flex align="center" mb={3}>
                                    <Icon
                                      as={metric.icon}
                                      mr={3}
                                      boxSize={5}
                                      color={`${metric.colorScheme}.500`}
                                    />
                                    <Text fontWeight="medium">
                                      {intl.formatMessage({ id: metric.name })}
                                    </Text>
                                    {hasEstablishmentsAtLimit && (
                                      <Tooltip
                                        label={intl.formatMessage(
                                          { id: 'app.someEstablishmentsAtLimit' },
                                          {
                                            count: capacityInfo.establishmentsAtLimit.length
                                          }
                                        )}
                                        placement="top"
                                      >
                                        <Badge ml={2} colorScheme="orange" fontSize="xs">
                                          <Icon as={FaExclamationTriangle} mr={1} />
                                          {capacityInfo.establishmentsAtLimit.length}{' '}
                                          {intl.formatMessage({ id: 'app.atLimit' })}
                                        </Badge>
                                      </Tooltip>
                                    )}
                                  </Flex>

                                  {/* Total Capacity */}
                                  <Stat mb={3}>
                                    <StatNumber fontSize="xl">
                                      {metric.used}
                                      <Text as="span" fontSize="md" color="gray.500">
                                        /
                                        {isUnlimited
                                          ? intl.formatMessage({ id: 'app.unlimited' })
                                          : metric.limit}{' '}
                                        {intl.formatMessage({ id: 'app.totalCapacity' })}
                                      </Text>
                                    </StatNumber>
                                    <StatHelpText mb={0}>
                                      {isUnlimited
                                        ? intl.formatMessage({ id: 'app.unlimited' })
                                        : `${percentage}% ${intl.formatMessage({ id: 'app.used' })}`}
                                    </StatHelpText>
                                  </Stat>
                                  <Progress
                                    value={isUnlimited ? 0 : percentage}
                                    size="sm"
                                    colorScheme={metric.colorScheme}
                                    borderRadius="full"
                                    mb={4}
                                  />

                                  {/* Limit Structure Explanation */}
                                  <Box
                                    bg="gray.50"
                                    p={3}
                                    borderRadius="lg"
                                    mb={4}
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                  >
                                    <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={2}>
                                      {intl.formatMessage({ id: 'app.limitStructure' })}
                                    </Text>
                                    <VStack align="start" spacing={1}>
                                      <HStack>
                                        <Icon as={FaMapMarkedAlt} color="green.500" boxSize={3} />
                                        <Text fontSize="sm" color="gray.600">
                                          {isUnlimitedPerEst
                                            ? intl.formatMessage({ id: 'app.unlimitedParcelsPerEst' })
                                            : intl.formatMessage(
                                                { id: 'app.maxParcelsPerEstablishment' },
                                                { count: maxParcelsPerEst }
                                              )}
                                        </Text>
                                      </HStack>
                                      <HStack>
                                        <Icon as={FaBuilding} color="blue.500" boxSize={3} />
                                        <Text fontSize="sm" color="gray.600">
                                          {isUnlimitedEst
                                            ? intl.formatMessage({ id: 'app.unlimitedEstablishments' })
                                            : intl.formatMessage(
                                                { id: 'app.maxEstablishments' },
                                                { count: maxEstablishments }
                                              )}
                                        </Text>
                                      </HStack>
                                      {!isUnlimited && (
                                        <HStack>
                                          <Text fontSize="sm" color="gray.500">
                                            = {metric.limit}{' '}
                                            {intl.formatMessage({ id: 'app.totalParcelsCapacity' })}
                                          </Text>
                                        </HStack>
                                      )}
                                    </VStack>
                                  </Box>

                                  {/* Per-Establishment Distribution */}
                                  {capacityInfo.distribution.length > 0 && (
                                    <Box>
                                      <Text
                                        fontSize="sm"
                                        fontWeight="semibold"
                                        color="gray.700"
                                        mb={2}
                                      >
                                        {intl.formatMessage({ id: 'app.currentDistribution' })}
                                      </Text>
                                      <VStack align="stretch" spacing={2}>
                                        {capacityInfo.distribution.map((est) => {
                                          const estPercentage = est.isUnlimited
                                            ? 0
                                            : Math.round(
                                                (est.parcelCount / Math.max(est.maxParcels, 1)) * 100
                                              );
                                          return (
                                            <Box
                                              key={est.id}
                                              p={2}
                                              borderRadius="lg"
                                              borderWidth="1px"
                                              borderColor={est.isAtLimit ? 'orange.200' : 'gray.200'}
                                              bg={est.isAtLimit ? 'orange.50' : 'white'}
                                            >
                                              <Flex justify="space-between" align="center" mb={1}>
                                                <HStack>
                                                  <Icon
                                                    as={est.isAtLimit ? FaExclamationTriangle : FaCheckCircle}
                                                    color={est.isAtLimit ? 'orange.500' : 'green.500'}
                                                    boxSize={3}
                                                  />
                                                  <Text fontSize="sm" fontWeight="medium">
                                                    {est.name}
                                                  </Text>
                                                </HStack>
                                                <HStack spacing={2}>
                                                  <Text fontSize="sm" color="gray.600">
                                                    {est.parcelCount}/
                                                    {est.isUnlimited
                                                      ? intl.formatMessage({ id: 'app.unlimited' })
                                                      : est.maxParcels}
                                                  </Text>
                                                  {est.isAtLimit ? (
                                                    <Badge colorScheme="orange" fontSize="xs">
                                                      {intl.formatMessage({ id: 'app.atLimit' })}
                                                    </Badge>
                                                  ) : (
                                                    <Badge colorScheme="green" fontSize="xs">
                                                      {est.remainingSlots}{' '}
                                                      {intl.formatMessage({ id: 'app.slotsAvailable' })}
                                                    </Badge>
                                                  )}
                                                </HStack>
                                              </Flex>
                                              <Progress
                                                value={est.isUnlimited ? 0 : estPercentage}
                                                size="xs"
                                                colorScheme={est.isAtLimit ? 'orange' : 'green'}
                                                borderRadius="full"
                                              />
                                            </Box>
                                          );
                                        })}
                                      </VStack>
                                    </Box>
                                  )}

                                  {/* Helpful tip when some establishments are at limit */}
                                  {hasEstablishmentsAtLimit && capacityInfo.hasAnyCapacity && (
                                    <Alert status="info" mt={4} borderRadius="lg" fontSize="sm">
                                      <AlertIcon boxSize={4} />
                                      <Box>
                                        <AlertTitle fontSize="sm">
                                          {intl.formatMessage({ id: 'app.parcelCapacityTip' })}
                                        </AlertTitle>
                                        <AlertDescription fontSize="xs">
                                          {intl.formatMessage(
                                            { id: 'app.parcelCapacityTipDescription' },
                                            {
                                              remaining: capacityInfo.totalRemaining,
                                              establishments:
                                                capacityInfo.establishmentsWithCapacity.length
                                            }
                                          )}
                                        </AlertDescription>
                                      </Box>
                                    </Alert>
                                  )}
                                </CardBody>
                              </Card>
                            );
                          }

                          // Standard metric card for other metrics
                          return (
                            <Card
                              key={metric.name}
                              borderColor={borderColor}
                              bg={cardBg}
                              _hover={{ boxShadow: 'md' }}
                            >
                              <CardBody>
                                <Flex align="center" mb={3}>
                                  <Icon
                                    as={metric.icon}
                                    mr={3}
                                    boxSize={5}
                                    color={`${metric.colorScheme}.500`}
                                  />
                                  <Text fontWeight="medium">
                                    {intl.formatMessage({ id: metric.name })}
                                  </Text>
                                </Flex>
                                <Stat mb={2}>
                                  <StatNumber fontSize="xl">
                                    {metric.used}
                                    <Text as="span" fontSize="md" color="gray.500">
                                      /
                                      {isUnlimited
                                        ? intl.formatMessage({ id: 'app.unlimited' })
                                        : metric.limit}{' '}
                                      {metric.unit}
                                    </Text>
                                  </StatNumber>
                                  <StatHelpText mb={0}>
                                    {isUnlimited
                                      ? intl.formatMessage({ id: 'app.unlimited' })
                                      : `${percentage}% ${intl.formatMessage({ id: 'app.used' })}`}
                                  </StatHelpText>
                                </Stat>
                                <Progress
                                  value={isUnlimited ? 0 : percentage}
                                  size="sm"
                                  colorScheme={metric.colorScheme}
                                  borderRadius="full"
                                />
                              </CardBody>
                            </Card>
                          );
                        })}
                      </SimpleGrid>
                    </Box>

                    {/* Plan Features */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.planFeatures' })}
                      </Text>
                      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                        <Card borderWidth="1px" borderColor="green.200" bg="green.50">
                          <CardBody>
                            <Flex align="center" mb={3}>
                              <Icon as={FaLeaf} mr={3} boxSize={5} color="green.500" />
                              <Text fontWeight="bold" color="green.700">
                                {intl.formatMessage({ id: 'app.transparencyTracking' })}
                              </Text>
                            </Flex>
                            <Text
                              fontSize="lg"
                              fontWeight="bold"
                              color="green.600"
                              mb={1}
                              textTransform="capitalize"
                            >
                              {intl.formatMessage({ id: 'app.included' })}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({ id: 'app.transparencyTrackingDescription' })}
                            </Text>
                          </CardBody>
                        </Card>

                        <Card borderWidth="1px" borderColor="purple.200" bg="purple.50">
                          <CardBody>
                            <Flex align="center" mb={3}>
                              <Icon as={FaHeadset} mr={3} boxSize={5} color="purple.500" />
                              <Text fontWeight="bold" color="purple.700">
                                {intl.formatMessage({ id: 'app.supportResponse' })}
                              </Text>
                            </Flex>
                            <Text fontSize="2xl" fontWeight="bold" color="purple.600" mb={1}>
                              {features?.support_response_time || 48}h
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({ id: 'app.supportResponseDescription' })}
                            </Text>
                          </CardBody>
                        </Card>

                        <Card
                          borderWidth="1px"
                          borderColor={features?.priority_support ? 'orange.200' : 'gray.200'}
                          bg={features?.priority_support ? 'orange.50' : 'gray.50'}
                        >
                          <CardBody>
                            <Flex align="center" mb={3}>
                              <Icon
                                as={features?.priority_support ? FaCheckCircle : FaTimesCircle}
                                mr={3}
                                boxSize={5}
                                color={features?.priority_support ? 'orange.500' : 'gray.400'}
                              />
                              <Text
                                fontWeight="bold"
                                color={features?.priority_support ? 'orange.700' : 'gray.600'}
                              >
                                {intl.formatMessage({ id: 'app.prioritySupport' })}
                              </Text>
                            </Flex>
                            <Text
                              fontSize="lg"
                              fontWeight="bold"
                              color={features?.priority_support ? 'orange.600' : 'gray.500'}
                              mb={1}
                            >
                              {features?.priority_support
                                ? intl.formatMessage({ id: 'app.included' })
                                : intl.formatMessage({ id: 'app.notIncluded' })}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {features?.priority_support
                                ? intl.formatMessage({ id: 'app.prioritySupportDescription' })
                                : intl.formatMessage({ id: 'app.upgradeForPrioritySupport' })}
                            </Text>
                          </CardBody>
                        </Card>
                      </SimpleGrid>
                    </Box>

                    {/* Blockchain Verification */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.blockchainVerification' })}
                      </Text>
                      <Card
                        borderWidth="1px"
                        borderColor={
                          blockchainStatus?.blockchainSubscribed ? 'green.200' : 'gray.200'
                        }
                      >
                        <CardBody>
                          <Flex justify="space-between" align="center">
                            <Flex align="center">
                              <Icon
                                as={FaShieldAlt}
                                mr={3}
                                boxSize={6}
                                color={
                                  blockchainStatus?.blockchainSubscribed ? 'green.500' : 'gray.400'
                                }
                              />
                              <Box>
                                <Text fontWeight="bold" fontSize="lg">
                                  {blockchainStatus?.blockchainSubscribed
                                    ? intl.formatMessage({ id: 'app.blockchainActive' })
                                    : intl.formatMessage({ id: 'app.blockchainNotActive' })}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {blockchainStatus?.blockchainSubscribed
                                    ? intl.formatMessage({
                                        id: 'app.blockchainVerifiedDescription'
                                      })
                                    : intl.formatMessage({ id: 'app.blockchainAddCta' })}
                                </Text>
                              </Box>
                            </Flex>
                            {!blockchainStatus?.blockchainSubscribed && (
                              <Button
                                colorScheme="green"
                                size="sm"
                                onClick={handleSubscribeBlockchain}
                                isLoading={isSubscribingBlockchain}
                              >
                                {intl.formatMessage({ id: 'app.addVerification' })}
                              </Button>
                            )}
                          </Flex>
                        </CardBody>
                      </Card>
                    </Box>

                    {/* Add-ons Section - Always visible */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.addons' })}
                      </Text>

                      <VStack spacing={4} align="stretch">
                        {/* Current Add-ons */}
                        {subscription?.addons &&
                          Array.isArray(subscription.addons) &&
                          subscription.addons.length > 0 && (
                            <Box>
                              <Text fontWeight="medium" mb={2}>
                                {intl.formatMessage({ id: 'app.currentAddons' })}
                              </Text>
                              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                                {subscription.addons.map((addonItem: any) => (
                                  <Card key={addonItem.id} size="sm">
                                    <CardBody>
                                      <Flex justify="space-between" align="center">
                                        <Box>
                                          <Text fontWeight="medium">{addonItem.addon?.name}</Text>
                                          <Text fontSize="sm" color="gray.600">
                                            {intl.formatMessage({ id: 'subscription.addonQuantity' }, { quantity: addonItem.quantity })}
                                          </Text>
                                        </Box>
                                        <Badge colorScheme="green" fontSize="md">
                                          {formatPrice(addonItem.addon?.price, addonItem.quantity)}
                                        </Badge>
                                      </Flex>
                                    </CardBody>
                                  </Card>
                                ))}
                              </SimpleGrid>
                            </Box>
                          )}

                        {/* Available Add-ons - Filter out Blockchain if already subscribed */}
                        <Box>
                          <Text fontWeight="medium" mb={2}>
                            {intl.formatMessage({ id: 'app.availableAddons' })}
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                            {addons
                              .filter((addon: any) => {
                                // Basic validation
                                if (!addon || !addon.id || !addon.name || !addon.price) {
                                  return false;
                                }
                                // Hide Blockchain Verification if already subscribed
                                const isBlockchainAddon =
                                  addon.slug === 'blockchain-verification' ||
                                  addon.name.toLowerCase().includes('blockchain');
                                if (isBlockchainAddon && blockchainStatus?.blockchainSubscribed) {
                                  return false;
                                }
                                return true;
                              })
                              .map((addon: any) => (
                                <Card
                                  key={addon.id}
                                  size="sm"
                                  _hover={{ boxShadow: 'md', borderColor: 'blue.300' }}
                                >
                                  <CardBody>
                                    <Flex justify="space-between" align="start">
                                      <Box flex="1">
                                        <Text fontWeight="medium">{addon.name}</Text>
                                        <Text fontSize="sm" color="gray.600" mb={2}>
                                          {addon.description}
                                        </Text>
                                        <Badge colorScheme="blue">{formatPrice(addon.price)}</Badge>
                                      </Box>
                                      <Button
                                        size="sm"
                                        colorScheme="blue"
                                        variant="outline"
                                        ml={3}
                                        onClick={() => handleOpenAddonModal(addon)}
                                      >
                                        <FaPlus />
                                      </Button>
                                    </Flex>
                                  </CardBody>
                                </Card>
                              ))}
                          </SimpleGrid>
                        </Box>
                      </VStack>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Billing Tab */}
                <TabPanel p={{ base: 3, md: 6 }}>
                  <VStack spacing={6} align="stretch">
                    {/* Payment Methods */}
                    <Box>
                      <Flex justify="space-between" align="center" mb={4}>
                        <Text fontSize="lg" fontWeight="bold">
                          {intl.formatMessage({ id: 'app.paymentMethods' })}
                        </Text>
                        <Button
                          size="sm"
                          leftIcon={<FaPlus />}
                          colorScheme="blue"
                          isLoading={isCreatingCheckoutSession}
                          onClick={handleAddPaymentMethod}
                        >
                          {intl.formatMessage({ id: 'app.addPaymentMethod' })}
                        </Button>
                      </Flex>

                      {paymentMethods.length > 0 ? (
                        <Stack spacing={3}>
                          {paymentMethods.map((method: any, index: number) => (
                            <Card key={index} size="sm">
                              <CardBody>
                                <Flex justify="space-between" align="center">
                                  <Flex align="center">
                                    <Box
                                      w="40px"
                                      h="40px"
                                      borderRadius="md"
                                      bg="gray.100"
                                      display="flex"
                                      alignItems="center"
                                      justifyContent="center"
                                      mr={3}
                                    >
                                      {method.card_brand === 'visa' ? (
                                        <VisaIcon w="70%" h="70%" />
                                      ) : method.card_brand === 'mastercard' ? (
                                        <MastercardIcon w="70%" h="70%" />
                                      ) : (
                                        <Icon as={FaWallet} w="60%" h="60%" />
                                      )}
                                    </Box>
                                    <Box>
                                      <Text fontWeight="medium">
                                        {method.card_brand.charAt(0).toUpperCase() +
                                          method.card_brand.slice(1)}
                                        {method.is_default && (
                                          <Badge ml={2} colorScheme="green" fontSize="xs">
                                            {intl.formatMessage({ id: 'subscription.defaultBadge' })}
                                          </Badge>
                                        )}
                                      </Text>
                                      <Text fontSize="sm" color="gray.600">
                                        {intl.formatMessage({ id: 'subscription.cardExpiry' }, { last4: method.last_4, expMonth: method.exp_month, expYear: method.exp_year })}
                                      </Text>
                                    </Box>
                                  </Flex>
                                  {!method.is_default && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      colorScheme="blue"
                                      onClick={() => handleSetDefaultPaymentMethod(method.id)}
                                    >
                                      {intl.formatMessage({ id: 'subscription.setDefault' })}
                                    </Button>
                                  )}
                                </Flex>
                              </CardBody>
                            </Card>
                          ))}
                        </Stack>
                      ) : (
                        <Card>
                          <CardBody textAlign="center" py={8}>
                            <Icon as={FaCreditCard} boxSize={10} color="gray.300" mb={3} />
                            <Text color="gray.500" mb={4}>
                              {intl.formatMessage({ id: 'app.noPaymentMethods' })}
                            </Text>
                            <Button
                              colorScheme="blue"
                              leftIcon={<FaPlus />}
                              isLoading={isCreatingCheckoutSession}
                              onClick={handleAddPaymentMethod}
                            >
                              {intl.formatMessage({ id: 'app.addPaymentMethod' })}
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </Box>

                    {/* Billing Information */}
                    <Box>
                      <Text fontSize="lg" fontWeight="bold" mb={4}>
                        {intl.formatMessage({ id: 'app.billingInformation' })}
                      </Text>
                      <Card>
                        <CardBody>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.companyName' })}
                              </Text>
                              <Text fontWeight="medium">{activeCompany?.name}</Text>
                            </Box>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.email' })}
                              </Text>
                              <Text fontWeight="medium">{activeCompany?.email}</Text>
                            </Box>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.phone' })}
                              </Text>
                              <Text fontWeight="medium">{activeCompany?.phone || '-'}</Text>
                            </Box>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.taxId' })}
                              </Text>
                              <Text fontWeight="medium">{activeCompany?.tax_id || '-'}</Text>
                            </Box>
                          </SimpleGrid>
                        </CardBody>
                      </Card>
                    </Box>
                  </VStack>
                </TabPanel>

                {/* Invoices Tab */}
                <TabPanel p={{ base: 3, md: 6 }}>
                  <VStack spacing={6} align="stretch">
                    <Text fontSize="lg" fontWeight="bold">
                      {intl.formatMessage({ id: 'app.invoiceHistory' })}
                    </Text>

                    {invoices.length > 0 ? (
                      <Stack spacing={3}>
                        {invoices.map((invoice: any, index: number) => (
                          <Card key={index} size="sm">
                            <CardBody>
                              <Flex justify="space-between" align="center">
                                <Box>
                                  <Text fontWeight="medium">
                                    {intl.formatMessage({ id: 'subscription.invoiceLabel' }, { number: invoice.number || invoice.id })}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    {formatDate(invoice.created || invoice.invoice_date)} ·{' '}
                                    {formatPrice((invoice.amount_paid || invoice.amount) / 100)}
                                  </Text>
                                </Box>
                                <HStack>
                                  <Badge
                                    colorScheme={invoice.status === 'paid' ? 'green' : 'gray'}
                                    fontSize="xs"
                                  >
                                    {invoice.status}
                                  </Badge>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    colorScheme="blue"
                                    rightIcon={<FaExternalLinkAlt />}
                                    as="a"
                                    href={invoice.invoice_pdf}
                                    target="_blank"
                                  >
                                    {intl.formatMessage({ id: 'subscription.download' })}
                                  </Button>
                                </HStack>
                              </Flex>
                            </CardBody>
                          </Card>
                        ))}
                      </Stack>
                    ) : (
                      <Card>
                        <CardBody textAlign="center" py={8}>
                          <Icon as={FaFileInvoiceDollar} boxSize={10} color="gray.300" mb={3} />
                          <Text color="gray.500">
                            {intl.formatMessage({ id: 'app.noInvoicesYet' })}
                          </Text>
                        </CardBody>
                      </Card>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>

      {/* Early Access Modal */}
      <Modal isOpen={isEarlyAccessOpen} onClose={onEarlyAccessClose} isCentered size="md">
        <ModalOverlay />
        <ModalContent borderRadius="xl" mx={4}>
          <ModalHeader pb={2}>
            <HStack spacing={3}>
              <Icon as={FaRocket} color="green.500" boxSize={5} />
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {intl.formatMessage({ id: 'app.earlyAccess.title' })}
              </Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <Text fontSize="sm" color="gray.600" lineHeight="1.7">
                {intl.formatMessage({ id: 'app.earlyAccess.bodyExisting' })}
              </Text>
              <Box bg="green.50" p={4} borderRadius="lg" borderLeft="4px solid" borderLeftColor="green.400">
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  {intl.formatMessage({ id: 'app.earlyAccess.foundingMember' })}
                </Text>
              </Box>
              {earlyAccessPlanName && (
                <HStack spacing={2} bg="gray.50" p={3} borderRadius="md">
                  <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {intl.formatMessage({ id: 'app.earlyAccess.selectedPlan' })}: <strong>{earlyAccessPlanName}</strong>
                  </Text>
                </HStack>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter pt={2} gap={3}>
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                onEarlyAccessClose();
                window.location.href = 'mailto:oscar@trazo.io?subject=Early Access - ' + (earlyAccessPlanName || 'Trazo');
              }}
              leftIcon={<Icon as={FaEnvelope} />}
            >
              {intl.formatMessage({ id: 'app.earlyAccess.contactUs' })}
            </Button>
            <Button
              colorScheme="green"
              size="md"
              onClick={() => {
                onEarlyAccessClose();
                navigate('/admin/dashboard');
              }}
              leftIcon={<Icon as={FaRocket} />}
            >
              {intl.formatMessage({ id: 'app.goToDashboard' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add-on Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{intl.formatMessage({ id: 'app.addAddon' })}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedAddon && (
              <VStack spacing={4} align="stretch">
                <Box>
                  <Text fontWeight="bold" fontSize="lg">
                    {selectedAddon.name}
                  </Text>
                  <Text color="gray.600">{selectedAddon.description}</Text>
                </Box>
                <Box>
                  <Text mb={2}>{intl.formatMessage({ id: 'app.quantity' })}</Text>
                  <NumberInput
                    value={addonQuantity}
                    min={1}
                    max={100}
                    onChange={(valueString) => setAddonQuantity(parseInt(valueString) || 1)}
                  >
                    <NumberInputField />
                    <NumberInputStepper>
                      <NumberIncrementStepper />
                      <NumberDecrementStepper />
                    </NumberInputStepper>
                  </NumberInput>
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">
                    {intl.formatMessage({ id: 'app.unitPrice' })}:{' '}
                    {formatPrice(selectedAddon.price)}
                  </Text>
                  <Text fontWeight="bold" fontSize="lg">
                    {intl.formatMessage({ id: 'app.total' })}:{' '}
                    {formatPrice(selectedAddon.price, addonQuantity)}
                  </Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              {intl.formatMessage({ id: 'app.cancel' })}
            </Button>
            <Button colorScheme="green" onClick={handleAddAddon} isLoading={isAddingAddon}>
              {intl.formatMessage({ id: 'app.addAddon' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}

export default UnifiedSubscriptionDashboard;
