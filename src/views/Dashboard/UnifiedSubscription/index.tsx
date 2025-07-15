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
  Spinner
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
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
  FaShieldAlt
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
  useCancelSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useAddAddonMutation,
  useSetDefaultPaymentMethodMutation,
  useCreateCheckoutSessionMutation,
  useSubscribeBlockchainMutation
} from 'store/api/billingApi';
import { setCompany } from 'store/features/companySlice';
import { MastercardIcon, VisaIcon, PayPalIcon } from 'components/Icons/Icons';
import { FaWallet } from 'react-icons/fa';

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

  const textColor = useColorModeValue('gray.700', 'white');
  const cardBg = useColorModeValue('white', 'gray.700');
  const tabBg = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [showAddons, setShowAddons] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

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

  const { data: blockchainStatus } = useGetBlockchainSubscriptionStatusQuery();

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

  const usageMetrics = [
    {
      icon: FaBuilding,
      name: 'app.establishments',
      used: Math.max(0, activeCompany?.establishments?.length || 0),
      limit: Math.max(0, features?.max_establishments || 0),
      colorScheme: 'blue'
    },
    {
      icon: FaMapMarkedAlt,
      name: 'app.parcels',
      used: countTotalParcels(),
      limit: Math.max(0, features?.max_parcels || 0),
      colorScheme: 'green'
    },
    {
      icon: FaLeaf,
      name: 'app.productions',
      used: Math.max(0, subscription?.used_productions || 0),
      limit: Math.max(0, features?.max_productions_per_year || 0),
      colorScheme: 'orange'
    },
    {
      icon: FaQrcode,
      name: 'app.scans',
      used: Math.max(0, subscription?.scan_count || 0),
      limit: Math.max(0, features?.monthly_scan_limit || 0),
      colorScheme: 'purple'
    },
    {
      icon: FaDatabase,
      name: 'app.storage',
      used: Math.max(0, Number(subscription?.used_storage_gb) || 0),
      limit: Math.max(0, features?.storage_limit_gb || 0),
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
            description: intl.formatMessage({ id: 'app.errorSettingPaymentMethod' }),
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        });
    },
    [setDefaultPaymentMethod, toast, intl, refetchDashboard]
  );

  const handleSubscribeBlockchain = useCallback(async () => {
    if (!hasSubscription) {
      toast({
        title: intl.formatMessage({ id: 'app.subscriptionRequired' }),
        description: 'You need an active subscription to add blockchain verification',
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
  }, [subscribeBlockchain, hasSubscription, toast, intl]);

  const isLoading =
    isDashboardLoading ||
    isRefreshing ||
    isCancellingSubscription ||
    isReactivatingSubscription ||
    isAddingAddon ||
    isCreatingCheckoutSession ||
    isSubscribingBlockchain;

  if (!activeCompany) {
    return (
      <Box pt={{ base: '120px', md: '60px', xl: '60px' }}>
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          <AlertTitle mr={2}>{intl.formatMessage({ id: 'app.noActiveCompany' })}</AlertTitle>
          <AlertDescription>
            {intl.formatMessage({ id: 'app.selectCompanyToManageBilling' })}
          </AlertDescription>
        </Alert>
      </Box>
    );
  }

  if (isDashboardLoading) {
    return (
      <Box pt={{ base: '120px', md: '60px', xl: '60px' }}>
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" />
          <Text color="gray.500">{intl.formatMessage({ id: 'app.loading' })}</Text>
        </VStack>
      </Box>
    );
  }

  if (!hasSubscription) {
    return (
      <Box pt={{ base: '120px', md: '60px', xl: '60px' }}>
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
              colorScheme="blue"
              size="lg"
              onClick={() => navigate('/admin/dashboard/pricing')}
            >
              {intl.formatMessage({ id: 'app.viewPlans' })}
            </Button>
          </CardBody>
        </Card>
      </Box>
    );
  }

  return (
    <Box pt={{ base: '120px', md: '60px', xl: '60px' }}>
      {/* Header with Refresh */}
      <Flex mb={6} justifyContent="space-between" alignItems="center">
        <Box>
          <Text fontSize="2xl" fontWeight="bold" color={textColor}>
            {intl.formatMessage({ id: 'app.subscriptionAndUsage' })}
          </Text>
          <Text color="gray.500">
            {intl.formatMessage({ id: 'app.manageYourSubscriptionAndTrackUsage' })}
          </Text>
        </Box>
        <Button
          leftIcon={<FaSync />}
          colorScheme="blue"
          variant="outline"
          isLoading={isLoading}
          onClick={() => {
            refetchDashboard();
            handleRefreshData();
          }}
        >
          {intl.formatMessage({ id: 'app.refresh' })}
        </Button>
      </Flex>

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
      <Card>
        <CardBody p={0}>
          <Tabs variant="enclosed" colorScheme="blue">
            <TabList px={6} pt={6} borderBottom="1px" borderColor={borderColor}>
              <Tab
                _selected={{
                  color: 'blue.600',
                  borderColor: 'blue.600',
                  fontWeight: 'semibold'
                }}
              >
                <Icon as={FaChartBar} mr={2} />
                {intl.formatMessage({ id: 'app.overview' })}
              </Tab>
              <Tab
                _selected={{
                  color: 'blue.600',
                  borderColor: 'blue.600',
                  fontWeight: 'semibold'
                }}
              >
                <Icon as={FaCreditCard} mr={2} />
                {intl.formatMessage({ id: 'app.billing' })}
              </Tab>
              <Tab
                _selected={{
                  color: 'blue.600',
                  borderColor: 'blue.600',
                  fontWeight: 'semibold'
                }}
              >
                <Icon as={FaFileInvoiceDollar} mr={2} />
                {intl.formatMessage({ id: 'app.invoices' })}
              </Tab>
            </TabList>

            <TabPanels>
              {/* Overview Tab */}
              <TabPanel p={6}>
                <VStack spacing={6} align="stretch">
                  {/* Current Plan Card */}
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      {intl.formatMessage({ id: 'app.currentPlan' })}
                    </Text>
                    <Card bg={tabBg} borderWidth="1px" borderColor={borderColor}>
                      <CardBody>
                        <Flex justify="space-between" align="start" mb={4}>
                          <Box>
                            <HStack mb={2}>
                              <Text fontSize="2xl" fontWeight="bold" color={textColor}>
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
                                {subscription?.status?.charAt(0).toUpperCase() +
                                  subscription?.status?.slice(1)}
                              </Badge>
                            </HStack>
                            <Text fontSize="3xl" fontWeight="bold" color="blue.600">
                              ${plan?.price}
                              <Text as="span" fontSize="lg" color="gray.500" fontWeight="normal">
                                /{intl.formatMessage({ id: `app.${plan?.interval}` })}
                              </Text>
                            </Text>
                          </Box>
                          <VStack align="end" spacing={2}>
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
                          </VStack>
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

                  {/* Usage Metrics */}
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      {intl.formatMessage({ id: 'app.usageMetrics' })}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
                      {usageMetrics.map((metric) => (
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
                                  /{metric.limit} {metric.unit}
                                </Text>
                              </StatNumber>
                              <StatHelpText mb={0}>
                                {Math.round((metric.used / Math.max(metric.limit, 1)) * 100)}%{' '}
                                {intl.formatMessage({ id: 'app.used' })}
                              </StatHelpText>
                            </Stat>
                            <Progress
                              value={(metric.used / Math.max(metric.limit, 1)) * 100}
                              size="sm"
                              colorScheme={metric.colorScheme}
                              borderRadius="full"
                            />
                          </CardBody>
                        </Card>
                      ))}
                    </SimpleGrid>
                  </Box>

                  {/* Plan Features */}
                  <Box>
                    <Text fontSize="lg" fontWeight="bold" mb={4}>
                      {intl.formatMessage({ id: 'app.planFeatures' })}
                    </Text>
                    <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                      <Card borderWidth="1px" borderColor="blue.200" bg="blue.50">
                        <CardBody>
                          <Flex align="center" mb={3}>
                            <Icon as={FaCog} mr={3} boxSize={5} color="blue.500" />
                            <Text fontWeight="bold" color="blue.700">
                              {intl.formatMessage({ id: 'app.iotAutomation' })}
                            </Text>
                          </Flex>
                          <Text fontSize="2xl" fontWeight="bold" color="blue.600" mb={1}>
                            {features?.iot_automation_level || 50}%
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {intl.formatMessage({ id: 'app.iotAutomationDescription' })}
                          </Text>
                        </CardBody>
                      </Card>

                      <Card borderWidth="1px" borderColor="green.200" bg="green.50">
                        <CardBody>
                          <Flex align="center" mb={3}>
                            <Icon as={FaLeaf} mr={3} boxSize={5} color="green.500" />
                            <Text fontWeight="bold" color="green.700">
                              {intl.formatMessage({ id: 'app.carbonTracking' })}
                            </Text>
                          </Flex>
                          <Text
                            fontSize="lg"
                            fontWeight="bold"
                            color="green.600"
                            mb={1}
                            textTransform="capitalize"
                          >
                            {features?.carbon_tracking === 'manual'
                              ? intl.formatMessage({ id: 'app.manual' })
                              : intl.formatMessage({ id: 'app.automated' })}{' '}
                            {intl.formatMessage({ id: 'app.mode' })}
                          </Text>
                          <Text fontSize="sm" color="gray.600">
                            {features?.carbon_tracking === 'manual'
                              ? intl.formatMessage({ id: 'app.manualCarbonTrackingDescription' })
                              : intl.formatMessage({
                                  id: 'app.automatedCarbonTrackingDescription'
                                })}
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
                                {blockchainStatus?.blockchainSubscribed ? 'Active' : 'Not Active'}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {blockchainStatus?.blockchainSubscribed
                                  ? 'Your carbon data is being verified on blockchain'
                                  : 'Add blockchain verification for $5/month'}
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
                              Add Verification
                            </Button>
                          )}
                        </Flex>
                      </CardBody>
                    </Card>
                  </Box>

                  {/* Add-ons Section */}
                  <Box>
                    <Flex justify="space-between" align="center" mb={4}>
                      <Text fontSize="lg" fontWeight="bold">
                        {intl.formatMessage({ id: 'app.addons' })}
                      </Text>
                      <IconButton
                        aria-label="Toggle add-ons"
                        icon={showAddons ? <FaChevronUp /> : <FaChevronDown />}
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowAddons(!showAddons)}
                      />
                    </Flex>

                    <Collapse in={showAddons} animateOpacity>
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
                                            Quantity: {addonItem.quantity}
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

                        {/* Available Add-ons */}
                        <Box>
                          <Text fontWeight="medium" mb={2}>
                            {intl.formatMessage({ id: 'app.availableAddons' })}
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
                            {addons
                              .filter(
                                (addon: any) => addon && addon.id && addon.name && addon.price
                              )
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
                    </Collapse>
                  </Box>
                </VStack>
              </TabPanel>

              {/* Billing Tab */}
              <TabPanel p={6}>
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
                                          Default
                                        </Badge>
                                      )}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      •••• {method.last_4} | Expires: {method.exp_month}/
                                      {method.exp_year}
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
                                    Set Default
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
                              Company Name
                            </Text>
                            <Text fontWeight="medium">{activeCompany?.name}</Text>
                          </Box>
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              Email
                            </Text>
                            <Text fontWeight="medium">{activeCompany?.email}</Text>
                          </Box>
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              Phone
                            </Text>
                            <Text fontWeight="medium">{activeCompany?.phone || '-'}</Text>
                          </Box>
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              Tax ID
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
              <TabPanel p={6}>
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
                                  Invoice #{invoice.number || invoice.id}
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
                                  Download
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
    </Box>
  );
}

export default UnifiedSubscriptionDashboard;
