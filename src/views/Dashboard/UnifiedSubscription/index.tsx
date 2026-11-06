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
  VStack,
  HStack,
  AlertTitle,
  AlertDescription,
  Collapse,
  IconButton,
  Spinner,
  Container,
  Tooltip,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import CardHeader from 'components/Card/CardHeader';
import {
  StandardCard,
  StandardPage,
  StandardNumberInput,
  StandardInput
} from 'components/Design/StandardComponents';
import CancelSubscriptionModal from './CancelSubscriptionModal';
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
import { useGetCompanyQuery, useUpdateCompanyMutation } from 'store/api/companyApi';
import {
  useGetBillingDashboardQuery,
  useCancelSubscriptionMutation,
  useReactivateSubscriptionMutation,
  useAddAddonMutation,
  useSetDefaultPaymentMethodMutation,
  useCreateCheckoutSessionMutation
} from 'store/api/billingApi';
import { setCompany } from 'store/features/companySlice';
import { MastercardIcon, VisaIcon, PayPalIcon } from 'components/Icons/Icons';
import { FaWallet, FaRocket, FaEnvelope, FaGift, FaEdit } from 'react-icons/fa';
import config from 'config/environment';
import { apiErrorMessage } from 'utils/apiErrorMessage';

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

/**
 * The billing period an add-on actually charges on, from the add-on itself.
 *
 * `AddOn.interval` only started reaching the client on 2026-08-14. Before that the period lived
 * in Stripe alone and the UI printed a bare "$30.00" beside a plan labelled "/Yearly", so nothing
 * on screen distinguished $30 a month from $30 a year — and the real answer, monthly against an
 * annual plan, was the defect that made a second farm cost more than the first. Defaults to
 * yearly, matching the model default, so an older cached payload cannot silently claim "per
 * month" about a yearly charge.
 */
const addonPeriodLabel = (
  addon: { interval?: string },
  intl: { formatMessage: (d: any) => string }
): string =>
  intl.formatMessage({
    id: addon?.interval === 'monthly' ? 'app.addon.perMonth' : 'app.addon.perYear'
  });

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

  // Controlled so the tab bar and its panels share one source of truth (and so a future
  // deep-link like ?tab=billing has something to set).
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedAddon, setSelectedAddon] = useState<any>(null);
  const [addonQuantity, setAddonQuantity] = useState(1);
  const [showAddons, setShowAddons] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isEarlyAccessOpen,
    onOpen: onEarlyAccessOpen,
    onClose: onEarlyAccessClose
  } = useDisclosure();
  const { isOpen: isCancelOpen, onOpen: onCancelOpen, onClose: onCancelClose } = useDisclosure();
  const {
    isOpen: isBillingEditOpen,
    onOpen: onBillingEditOpen,
    onClose: onBillingEditClose
  } = useDisclosure();
  const [earlyAccessPlanName, setEarlyAccessPlanName] = useState<string | null>(null);
  const [billingForm, setBillingForm] = useState({
    contact_email: '',
    contact_phone: '',
    fiscal_id: ''
  });

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
  } = useGetBillingDashboardQuery(activeCompany?.id?.toString(), {
    skip: !activeCompany?.id,
    refetchOnMountOrArgChange: true
  });

  // Mutations
  const [cancelSubscription, { isLoading: isCancellingSubscription }] =
    useCancelSubscriptionMutation();
  const [reactivateSubscription, { isLoading: isReactivatingSubscription }] =
    useReactivateSubscriptionMutation();
  const [addAddon, { isLoading: isAddingAddon }] = useAddAddonMutation();
  const [setDefaultPaymentMethod] = useSetDefaultPaymentMethodMutation();
  const [createCheckoutSession, { isLoading: isCreatingCheckoutSession }] =
    useCreateCheckoutSessionMutation();
  const [updateCompany, { isLoading: isUpdatingBilling }] = useUpdateCompanyMutation();

  // Extract data.
  //
  // BOTH SOURCES MUST DESCRIBE THE SAME COMPANY. They are the same SHAPE either way — the
  // company endpoint serializes its `subscription` with the very same SubscriptionSerializer,
  // `effective_limits` and all — so this preference is about FRESHNESS, not fields:
  // `dashboardData` refetches on mount and after every billing mutation (`refetchDashboard`),
  // while `activeCompany.subscription` is only as current as the last company fetch. The
  // fallback is what paints while that request is in flight, or if it failed.
  //
  // Preferring the fetched copy is only safe because the query is now keyed and scoped by
  // `activeCompany.id`. While it was `useGetBillingDashboardQuery(undefined)` against an
  // unscoped, unordered `.first()`, this line preferred an ARBITRARY company's plan over the
  // active one's, and the usage meters below took their limits from it while taking their
  // parcel and farm counts from `activeCompany` — a "Corporate, 3/16 parcels" reading on a
  // Compliance farm with unlimited parcels.
  const subscription =
    Array.isArray(dashboardData?.subscription) && dashboardData.subscription.length > 0
      ? dashboardData.subscription[0]
      : activeCompany?.subscription;
  const plan = subscription?.plan;
  // Use effective_limits (base plan + add-ons) when available, fall back to base features
  const features = subscription?.effective_limits || plan?.features || {};
  const isTrial = subscription?.status === 'trialing';
  // Pilot = Compliance comped by agreement (provision_pilot), not a billed plan. Two sharp
  // edges if rendered as one: the red Cancel button (a pilot has no charge to stop, and ending
  // one is a conversation per the pilot agreement) and "Next Billing Date", which for a pilot is
  // actually their certifier renewal anchor.
  const isPilot = (plan as any)?.slug === 'pilot' || (plan as any)?.features?.is_pilot === true;
  // Starter is FREE FOREVER (2026-08-13) — no trial, no renewal, no billing date. Its
  // subscription carries `current_period_end = null` on purpose, so the billing grid below would
  // otherwise print "Next billing date: -" and "Current period: 13/08/2026 - -", which reads as
  // missing data on the one plan whose selling point is that nothing is ever due.
  const isFreeForever = (plan as any)?.slug === 'starter';
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

  // Blockchain subscribe/sync machinery removed 2026-08-12. The add-on was withdrawn
  // 2026-08-03 and its visible card removed 2026-08-06, but the mutation, status queries,
  // and the post-checkout sync effect survived — dead paths selling a product Trazo no
  // longer offers. The AddOn row stays inactive backend-side; nothing here references it.

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
      colorScheme: 'green',
      // One farm on a one-farm plan is the plan's shape, not a warning: it painted a solid red
      // bar and icon on every Compliance and pilot account (screen audit 2026-11-06). Over the
      // limit (a downgrade that kept its farms) still reads red.
      atLimitIsNormal: true
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
      // Its OWN label, not the shared `app.productions` (which HistoryCard also renders as a
      // plain heading). The limit is `max_productions_per_year` and the count is what the quota
      // gate counts — productions CREATED in the current calendar year — so a bare "Productions"
      // invited a farmer with two lifetime seasons to read this as a lifetime total.
      name: 'subscription.usage.productionsThisYear',
      used: Math.max(0, subscription?.used_productions || 0),
      limit: formatLimit(features?.max_productions_per_year ?? 0),
      colorScheme: 'green'
    },
    {
      icon: FaQrcode,
      name: 'app.scans',
      used: Math.max(0, subscription?.scan_count || 0),
      // QR scans are deliberately unlimited on every plan (monthly_scan_limit was
      // deleted 2026-08-25 — it was never enforced, and the buyer page is the
      // demonstration that sells the paid tier). The count stays: it is the
      // engagement fact; -1 renders as unlimited like the other uncapped rows.
      limit: -1,
      colorScheme: 'green'
    },
    {
      icon: FaDatabase,
      name: 'app.storage',
      used: Math.max(0, Number(subscription?.used_storage_gb) || 0),
      limit: formatLimit(features?.storage_limit_gb ?? 0),
      unit: 'GB',
      colorScheme: 'green'
    }
  ];

  // Handlers
  const handleCancelSubscription = async ({
    reason,
    feedback
  }: {
    reason: string;
    feedback: string;
  }) => {
    if (!subscription) return;
    try {
      await cancelSubscription({
        subscriptionId: Number(subscription.id),
        reason,
        feedback
      }).unwrap();
      // Closed HERE, not by the button's onClick, so a failed request leaves the modal open
      // with the customer's typed feedback intact instead of dismissing the dialog and showing
      // an error toast over a page that still says "active". The modal clears its own fields
      // when it closes.
      onCancelClose();
      toast({
        title: intl.formatMessage({ id: 'app.subscriptionCanceled' }),
        description: intl.formatMessage({ id: 'app.subscriptionCanceledDescription' }),
        status: 'info',
        duration: 8000,
        isClosable: true
      });
      refetchDashboard();
    } catch (error) {
      // The backend answers a specific message for a subscription that cannot be cancelled at
      // all (Starter, pilot). Showing the generic "something went wrong" over it would hide the
      // only sentence that explains why the button did nothing.
      const detail = (error as any)?.data?.error;
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: detail || intl.formatMessage({ id: 'app.errorCancelingSubscription' }),
        status: 'error',
        duration: 8000,
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
        description:
          apiErrorMessage(error) ?? intl.formatMessage({ id: 'app.errorReactivatingSubscription' }),
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
        return_url: `/admin/dashboard/subscription`
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
        description: apiErrorMessage(error) ?? intl.formatMessage({ id: 'app.errorAddingAddon' }),
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
      success_url: `${window.location.origin}/admin/dashboard/subscription?refresh=true`,
      cancel_url: `${window.location.origin}/admin/dashboard/subscription`
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
          description:
            apiErrorMessage(error) ?? intl.formatMessage({ id: 'app.errorCreatingCheckout' }),
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
            title: intl.formatMessage({ id: 'subscription.toast.paymentMethodUpdated' }),
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
            description:
              apiErrorMessage(error) ??
              intl.formatMessage({ id: 'app.errorSettingDefaultPaymentMethod' }),
            status: 'error',
            duration: 5000,
            isClosable: true
          });
        });
    },
    [setDefaultPaymentMethod, toast, intl, refetchDashboard]
  );

  const handleOpenBillingEdit = useCallback(() => {
    setBillingForm({
      contact_email: (activeCompany as any)?.contact_email || '',
      contact_phone: (activeCompany as any)?.contact_phone || '',
      fiscal_id: (activeCompany as any)?.fiscal_id || ''
    });
    onBillingEditOpen();
  }, [activeCompany, onBillingEditOpen]);

  const handleSaveBillingInfo = useCallback(async () => {
    if (!activeCompany?.id) return;
    try {
      await updateCompany({
        companyId: activeCompany.id,
        companyData: {
          contact_email: billingForm.contact_email,
          contact_phone: billingForm.contact_phone,
          fiscal_id: billingForm.fiscal_id
        }
      }).unwrap();
      toast({
        title: intl.formatMessage({ id: 'subscription.toast.billingSaved' }),
        description: intl.formatMessage({ id: 'subscription.billingInfoUpdated' }),
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      onBillingEditClose();
      refetchCompany();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description:
          apiErrorMessage(error) ??
          intl.formatMessage({ id: 'subscription.billingInfoUpdateError' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  }, [activeCompany, billingForm, updateCompany, toast, intl, onBillingEditClose, refetchCompany]);

  const isLoading =
    isDashboardLoading ||
    isRefreshing ||
    isCancellingSubscription ||
    isReactivatingSubscription ||
    isAddingAddon ||
    isCreatingCheckoutSession;

  // Return null while loading - this keeps the app-level loading visible
  // and prevents any intermediate states from flashing
  if (isLoadingCompany || isDashboardLoading || !activeCompany) {
    return null;
  }

  if (!hasSubscription) {
    return (
      <StandardPage
        title={intl.formatMessage({ id: 'app.subscription' })}
        description={intl.formatMessage({ id: 'app.noActiveSubscription' })}>
        <StandardCard mb={0}>
          <Box textAlign="center" py={4}>
            <Icon as={FaInfoCircle} boxSize={12} color="green.700" mb={4} />
            <Text fontSize="xl" fontWeight="bold" mb={4}>
              {intl.formatMessage({ id: 'app.noActiveSubscription' })}
            </Text>
            <Text mb={6} maxW="lg" mx="auto" color="gray.600">
              {intl.formatMessage({ id: 'app.noSubscriptionDescription' })}
            </Text>
            <Button
              colorScheme="green"
              size="lg"
              onClick={() => navigate('/admin/dashboard/pricing')}>
              {intl.formatMessage({ id: 'app.viewPlans' })}
            </Button>
          </Box>
        </StandardCard>
      </StandardPage>
    );
  }

  return (
    <StandardPage
      title={intl.formatMessage({ id: 'app.subscription' })}
      description={intl.formatMessage({ id: 'app.manageYourSubscriptionAndTrackUsage' })}
      // `headerAction` is StandardCard's prop — StandardPage takes `rightAction`, so this
      // Refresh button was silently dropped and had never rendered on this page.
      rightAction={
        <Button
          leftIcon={<FaSync />}
          colorScheme="green"
          variant="outline"
          size="sm"
          minH="44px"
          isLoading={isLoading}
          onClick={() => {
            refetchDashboard();
            handleRefreshData();
          }}>
          {intl.formatMessage({ id: 'app.refresh' })}
        </Button>
      }>
      <VStack spacing={6} align="stretch">
        {/* Trial Banner */}
        {isTrial && (
          <Card
            mb={6}
            borderLeftWidth="4px"
            borderLeftColor="green.500"
            overflow="hidden"
            position="relative">
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
                align={{ base: 'start', md: 'center' }}>
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
                  minH="44px"
                  onClick={() => navigate('/admin/dashboard/pricing')}
                  rightIcon={<Icon as={FaCrown} />}>
                  {intl.formatMessage({ id: 'app.upgradeNow' })}
                </Button>
              </Flex>
            </CardBody>
          </Card>
        )}

        {/* Main Content with Tabs */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody p={0}>
            <Tabs variant="unstyled" index={tabIndex} onChange={setTabIndex}>
              <TabList
                px={{ base: 2, md: 6 }}
                pt={{ base: 3, md: 6 }}
                borderBottom="1px solid"
                borderColor="gray.200"
                overflowX="auto"
                sx={{ scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
                <Tab
                  fontSize={{ base: 'xs', md: 'sm' }}
                  whiteSpace="nowrap"
                  minH="44px"
                  flexShrink={0}
                  px={{ base: 3, md: 4 }}
                  fontWeight="medium"
                  color="gray.600"
                  borderBottom="2px solid"
                  borderColor="transparent"
                  mb="-1px"
                  borderRadius="0"
                  _hover={{ color: 'green.600' }}
                  _selected={{
                    color: 'green.600',
                    borderColor: 'green.500',
                    fontWeight: 'semibold'
                  }}>
                  <Icon as={FaChartBar} mr={{ base: 1, md: 2 }} boxSize={{ base: 3, md: 4 }} />
                  {intl.formatMessage({ id: 'app.overview' })}
                </Tab>
                <Tab
                  fontSize={{ base: 'xs', md: 'sm' }}
                  whiteSpace="nowrap"
                  minH="44px"
                  flexShrink={0}
                  px={{ base: 3, md: 4 }}
                  fontWeight="medium"
                  color="gray.600"
                  borderBottom="2px solid"
                  borderColor="transparent"
                  mb="-1px"
                  borderRadius="0"
                  _hover={{ color: 'green.600' }}
                  _selected={{
                    color: 'green.600',
                    borderColor: 'green.500',
                    fontWeight: 'semibold'
                  }}>
                  <Icon as={FaCreditCard} mr={{ base: 1, md: 2 }} boxSize={{ base: 3, md: 4 }} />
                  {intl.formatMessage({ id: 'app.billing' })}
                </Tab>
                <Tab
                  fontSize={{ base: 'xs', md: 'sm' }}
                  whiteSpace="nowrap"
                  minH="44px"
                  flexShrink={0}
                  px={{ base: 3, md: 4 }}
                  fontWeight="medium"
                  color="gray.600"
                  borderBottom="2px solid"
                  borderColor="transparent"
                  mb="-1px"
                  borderRadius="0"
                  _hover={{ color: 'green.600' }}
                  _selected={{
                    color: 'green.600',
                    borderColor: 'green.500',
                    fontWeight: 'semibold'
                  }}>
                  <Icon
                    as={FaFileInvoiceDollar}
                    mr={{ base: 1, md: 2 }}
                    boxSize={{ base: 3, md: 4 }}
                  />
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
                      <StandardCard variant="outline" mb={0}>
                        <Flex
                          direction={{ base: 'column', md: 'row' }}
                          justify="space-between"
                          align={{ base: 'stretch', md: 'start' }}
                          mb={4}
                          gap={3}>
                          <Box>
                            <Flex wrap="wrap" align="center" gap={2} mb={2}>
                              <Text
                                fontSize={{ base: 'xl', md: '2xl' }}
                                fontWeight="bold"
                                color={textColor}
                                whiteSpace="nowrap">
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
                                py={1}>
                                {intl.formatMessage({
                                  id: `subscription.status${
                                    (subscription?.status || 'unknown').charAt(0).toUpperCase() +
                                    (subscription?.status || 'unknown').slice(1)
                                  }`
                                })}
                              </Badge>
                            </Flex>
                            {isPilot ? (
                              <Text
                                fontSize={{ base: '2xl', md: '3xl' }}
                                fontWeight="bold"
                                color="green.700">
                                {intl.formatMessage({ id: 'subscription.pilotComplimentary' })}
                              </Text>
                            ) : (
                              <Text
                                fontSize={{ base: '2xl', md: '3xl' }}
                                fontWeight="bold"
                                color="green.700">
                                ${plan?.price}
                                {/* No interval on a free-forever plan: "$0.00/Monthly" states a
                                    billing cadence for something that never bills, and sits two
                                    lines above the copy promising no billing date. The Plan row
                                    keeps `interval="monthly"` for schema reasons; that is a
                                    storage detail, not a fact about the customer. */}
                                {!isFreeForever && (
                                  <Text
                                    as="span"
                                    fontSize={{ base: 'md', md: 'lg' }}
                                    color="gray.500"
                                    fontWeight="normal">
                                    /{intl.formatMessage({ id: `app.${plan?.interval}` })}
                                  </Text>
                                )}
                              </Text>
                            )}
                          </Box>
                          <HStack spacing={2} justify={{ base: 'flex-start', md: 'flex-end' }}>
                            {subscription?.cancel_at_period_end ? (
                              <Button
                                size="sm"
                                onClick={handleReactivateSubscription}
                                isLoading={isReactivatingSubscription}>
                                {intl.formatMessage({ id: 'app.reactivate' })}
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  minH="44px"
                                  variant="outline"
                                  onClick={() => navigate('/admin/dashboard/pricing')}>
                                  {intl.formatMessage({ id: 'app.changePlan' })}
                                </Button>
                                {/* A pilot has nothing to cancel: it is comped by agreement, so
                                    there is no charge to stop and ending one is a conversation.
                                    Starter is hidden for the same reason — it is free forever.

                                    ⚠️ This is a RENDER gate and proves nothing on its own. The
                                    endpoint refuses both independently
                                    (`SubscriptionViewSet._uncancellable_reason`), because a
                                    stale tab or a direct POST never sees this condition. Until
                                    2026-08-22 only this check existed, and the endpoint happily
                                    stamped a pending cancellation onto the free-forever tier. */}
                                {!isPilot && !isFreeForever && (
                                  <Button
                                    size="sm"
                                    minH="44px"
                                    colorScheme="red"
                                    variant="ghost"
                                    onClick={onCancelOpen}
                                    isLoading={isCancellingSubscription}>
                                    {intl.formatMessage({ id: 'app.cancel' })}
                                  </Button>
                                )}
                              </>
                            )}
                          </HStack>
                        </Flex>

                        {isPilot && (
                          <Alert status="info" mb={4} variant="left-accent">
                            <AlertIcon />
                            <Text fontSize="sm">
                              {intl.formatMessage({ id: 'subscription.pilotNoBilling' })}
                            </Text>
                          </Alert>
                        )}

                        {/* A declined card had NO surface here at all — `past_due` appeared
                            nowhere in the frontend. The farm simply started getting 403s worded
                            "your subscription plan does not allow creating more parcels", which
                            is false and gives the farmer nothing to act on. The plan now stays
                            live for the whole of Stripe's retry window, so this banner is the
                            only thing that tells them to fix the card before it runs out.
                            `warning`, not `error`: nothing is broken yet. */}
                        {subscription?.status === 'past_due' && (
                          <Alert status="warning" mb={4}>
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.pastDueTitle' })}
                              </AlertTitle>
                              <AlertDescription fontSize="sm" display="block">
                                {intl.formatMessage({ id: 'subscription.pastDueBody' })}
                              </AlertDescription>
                              <Button
                                size="sm"
                                minH="44px"
                                mt={2}
                                colorScheme="green"
                                onClick={handleAddPaymentMethod}
                                isLoading={isCreatingCheckoutSession}>
                                {intl.formatMessage({ id: 'subscription.pastDueCta' })}
                              </Button>
                            </Box>
                          </Alert>
                        )}

                        {/* The farm has lapsed to Starter. Says what SURVIVED, because the
                            previous behaviour deleted nothing but behaved as though it had. */}
                        {isFreeForever && subscription?.cancellation_requested_at && (
                          <Alert status="info" mb={4}>
                            <AlertIcon />
                            <Box>
                              <AlertTitle fontSize="sm">
                                {intl.formatMessage({ id: 'subscription.lapsedTitle' })}
                              </AlertTitle>
                              <AlertDescription fontSize="sm" display="block">
                                {intl.formatMessage({ id: 'subscription.lapsedBody' })}
                              </AlertDescription>
                            </Box>
                          </Alert>
                        )}

                        {subscription?.cancel_at_period_end && (
                          <Alert status="warning" mb={4}>
                            <AlertIcon />
                            <Text fontSize="sm">
                              {intl.formatMessage({ id: 'app.subscriptionWillCancel' })}{' '}
                              {formatDate(subscription?.current_period_end)}
                            </Text>
                          </Alert>
                        )}

                        {subscription?.pending_plan && (
                          <Alert status="info" mb={4}>
                            <AlertIcon />
                            <Text fontSize="sm">
                              {intl.formatMessage(
                                { id: 'app.pendingDowngradeTo' },
                                { planName: subscription.pending_plan.name }
                              )}
                            </Text>
                          </Alert>
                        )}

                        {isFreeForever ? (
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              {intl.formatMessage({ id: 'subscription.billing' })}
                            </Text>
                            <Text fontWeight="medium">
                              {intl.formatMessage({ id: 'subscription.freeForeverNoBilling' })}
                            </Text>
                          </Box>
                        ) : (
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {intl.formatMessage({ id: 'app.currentPeriod' })}
                              </Text>
                              <Text fontWeight="medium">
                                {/* A comped pilot can carry no end date: print the start alone,
                                    never "8/21/2026 - -" (screen audit 2026-11-06). */}
                                {formatDate(subscription?.current_period_start)}
                                {subscription?.current_period_end
                                  ? ` – ${formatDate(subscription.current_period_end)}`
                                  : ''}
                              </Text>
                            </Box>
                            {subscription?.current_period_end ? (
                              <Box>
                                <Text color="gray.500" fontSize="sm">
                                  {/* For a pilot, current_period_end is the certifier renewal
                                    anchor set by provision_pilot — recorded, never billed. */}
                                  {intl.formatMessage({
                                    id: isPilot
                                      ? 'subscription.pilotThrough'
                                      : 'app.nextBillingDate'
                                  })}
                                </Text>
                                <Text fontWeight="medium">
                                  {formatDate(subscription?.current_period_end)}
                                </Text>
                              </Box>
                            ) : null}
                          </SimpleGrid>
                        )}
                      </StandardCard>
                    </Box>

                    {/* Usage Warnings */}
                    {subscription?.usage_warnings && subscription.usage_warnings.length > 0 && (
                      <VStack spacing={3} mb={4}>
                        {subscription.usage_warnings.map((warning: any) => (
                          <Alert
                            key={warning.metric}
                            status={warning.level === 'critical' ? 'error' : 'warning'}
                            variant="left-accent">
                            <AlertIcon />
                            <Box flex="1">
                              <AlertTitle fontSize="sm">
                                {/* Localised from `warning.metric`, not printed from
                                    `warning.label`. The label is an English string built in
                                    `SubscriptionSerializer.get_usage_warnings` ("Photo storage
                                    (GB)", "QR scans this month"), so a Spanish-locale farmer
                                    read an English alert. The metric key is stable and is
                                    already the React key; the raw label stays as the fallback
                                    so a metric added backend-side degrades to English rather
                                    than to a missing-translation blank. */}
                                {intl.formatMessage({
                                  id: `app.usageMetric.${warning.metric}`,
                                  defaultMessage: warning.label
                                })}
                                :{' '}
                                {intl.formatMessage(
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
                              size="sm"
                              minH="44px"
                              flexShrink={0}
                              colorScheme={warning.level === 'critical' ? 'red' : 'orange'}
                              variant="outline"
                              onClick={() => navigate('/admin/dashboard/pricing')}>
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
                          // Utilisation, not identity: green until it matters, amber as the
                          // limit approaches, red once it is reached. `metric.colorScheme` is
                          // the fallback for the unlimited case.
                          const usageScheme = isUnlimited
                            ? metric.colorScheme
                            : (metric as { atLimitIsNormal?: boolean }).atLimitIsNormal &&
                              metric.used === metric.limit
                            ? 'gray'
                            : percentage >= 100
                            ? 'red'
                            : percentage >= 80
                            ? 'orange'
                            : 'green';

                          // Enhanced Parcels card with hierarchical breakdown
                          if (metric.name === 'app.parcels') {
                            const capacityInfo = getAvailableCapacityInfo();
                            const maxParcelsPerEst = features?.max_parcels_per_establishment ?? 0;
                            const maxEstablishments = features?.max_establishments ?? 0;
                            const isUnlimitedPerEst = maxParcelsPerEst === -1;
                            const isUnlimitedEst = maxEstablishments === -1;
                            const hasEstablishmentsAtLimit =
                              capacityInfo.establishmentsAtLimit.length > 0;

                            return (
                              <Card
                                key={metric.name}
                                borderColor={hasEstablishmentsAtLimit ? 'orange.200' : borderColor}
                                bg={cardBg}
                                _hover={{ boxShadow: 'md' }}
                                gridColumn={{ base: 'span 1', lg: 'span 2' }}>
                                <CardBody>
                                  <Flex align="center" mb={3}>
                                    <Icon
                                      as={metric.icon}
                                      mr={3}
                                      boxSize={5}
                                      color={`${usageScheme}.700`}
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
                                        placement="top">
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
                                        : `${percentage}% ${intl.formatMessage({
                                            id: 'app.used'
                                          })}`}
                                    </StatHelpText>
                                  </Stat>
                                  <Progress
                                    value={isUnlimited ? 0 : percentage}
                                    size="sm"
                                    colorScheme={usageScheme}
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
                                    borderColor="gray.200">
                                    <Text
                                      fontSize="sm"
                                      fontWeight="semibold"
                                      color="gray.700"
                                      mb={2}>
                                      {intl.formatMessage({ id: 'app.limitStructure' })}
                                    </Text>
                                    <VStack align="start" spacing={1}>
                                      <HStack>
                                        <Icon as={FaMapMarkedAlt} color="green.500" boxSize={3} />
                                        <Text fontSize="sm" color="gray.600">
                                          {isUnlimitedPerEst
                                            ? intl.formatMessage({
                                                id: 'app.unlimitedParcelsPerEst'
                                              })
                                            : intl.formatMessage(
                                                { id: 'app.maxParcelsPerEstablishment' },
                                                { count: maxParcelsPerEst }
                                              )}
                                        </Text>
                                      </HStack>
                                      <HStack>
                                        <Icon as={FaBuilding} color="green.500" boxSize={3} />
                                        <Text fontSize="sm" color="gray.600">
                                          {isUnlimitedEst
                                            ? intl.formatMessage({
                                                id: 'app.unlimitedEstablishments'
                                              })
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
                                        mb={2}>
                                        {intl.formatMessage({ id: 'app.currentDistribution' })}
                                      </Text>
                                      <VStack align="stretch" spacing={2}>
                                        {capacityInfo.distribution.map((est) => {
                                          const estPercentage = est.isUnlimited
                                            ? 0
                                            : Math.round(
                                                (est.parcelCount / Math.max(est.maxParcels, 1)) *
                                                  100
                                              );
                                          return (
                                            <Box
                                              key={est.id}
                                              p={2}
                                              borderRadius="lg"
                                              borderWidth="1px"
                                              borderColor={
                                                est.isAtLimit ? 'orange.200' : 'gray.200'
                                              }
                                              bg={est.isAtLimit ? 'orange.50' : 'white'}>
                                              <Flex justify="space-between" align="center" mb={1}>
                                                <HStack>
                                                  <Icon
                                                    as={
                                                      est.isAtLimit
                                                        ? FaExclamationTriangle
                                                        : FaCheckCircle
                                                    }
                                                    color={
                                                      est.isAtLimit ? 'orange.500' : 'green.500'
                                                    }
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
                                                  ) : est.isUnlimited ? (
                                                    <Badge colorScheme="green" fontSize="xs">
                                                      {intl.formatMessage({ id: 'app.unlimited' })}
                                                    </Badge>
                                                  ) : (
                                                    <Badge colorScheme="green" fontSize="xs">
                                                      {est.remainingSlots}{' '}
                                                      {intl.formatMessage({
                                                        id: 'app.slotsAvailable'
                                                      })}
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
                                    <Alert status="info" mt={4} fontSize="sm">
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

                          // Storage card — one bar, two segments.
                          //
                          // Storage is a single number to the quota and two different things
                          // to the farmer: photos can be pruned, generated documents cannot
                          // be deleted at all. Showing only the total made the bar
                          // unactionable, and it was WRONG until the DMS started being
                          // counted at all — the whole document shelf was invisible to it.
                          //
                          // Only the photo half is enforced. Saying that out loud matters
                          // more than the split: a farmer who reads "18 of 25 GB" and assumes
                          // their certificate upload is about to fail will stop uploading
                          // certificates, which is the opposite of what the product needs.
                          if (metric.name === 'app.storage') {
                            const breakdown = subscription?.storage_breakdown;
                            const mediaBytes = Math.max(0, Number(breakdown?.media_bytes) || 0);
                            const documentsBytes = Math.max(
                              0,
                              Number(breakdown?.documents_bytes) || 0
                            );
                            // Percentages come from BYTES, not from the GB figures. Dividing
                            // two already-rounded numbers rounds twice, and at this scale the
                            // second rounding is the whole value.
                            const limitBytes = isUnlimited
                              ? 0
                              : Math.max(metric.limit, 0) * 1024 ** 3;
                            // Utilisation is scored on the ENFORCED half. Turning the bar red
                            // because of documents would warn about a wall that does not exist.
                            const mediaPct =
                              limitBytes <= 0
                                ? 0
                                : Math.min(100, Math.round((mediaBytes / limitBytes) * 100));
                            const documentsPct =
                              limitBytes <= 0
                                ? 0
                                : Math.min(
                                    100 - mediaPct,
                                    Math.round((documentsBytes / limitBytes) * 100)
                                  );
                            const mediaScheme = isUnlimited
                              ? 'green'
                              : mediaPct >= 100
                              ? 'red'
                              : mediaPct >= 80
                              ? 'orange'
                              : 'green';

                            // Each legend line picks its OWN unit from raw bytes.
                            //
                            // The two categories live at different scales. MEASURED on Blue
                            // Oak Orchards: 21 real certifier documents — audit dossier, PUR
                            // export, two OSP packets, module PDFs, workbook, snapshot, lot
                            // tags — weigh 0.95 MB in total. Printed as GB to 2dp that is
                            // "Documents 0.00 GB" sitting beside a list of 21 files: correct,
                            // and indistinguishable from a meter that is not working. Photos
                            // meanwhile run to gigabytes and want GB.
                            const fmtBytes = (bytes: number) => {
                              if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
                              if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
                              if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
                              return `${bytes} B`;
                            };

                            // "0% used" beside a non-zero number is the same failure one line
                            // up: true, and it reads as nothing being counted.
                            const usedPct = mediaPct + documentsPct;
                            const usedPctLabel =
                              usedPct === 0 && mediaBytes + documentsBytes > 0
                                ? '<1'
                                : `${usedPct}`;

                            return (
                              <StandardCard key={metric.name} variant="outline" mb={0}>
                                <Flex align="center" mb={3}>
                                  <Icon
                                    as={metric.icon}
                                    mr={3}
                                    boxSize={5}
                                    color={`${mediaScheme}.700`}
                                  />
                                  <Text fontWeight="medium">
                                    {intl.formatMessage({ id: metric.name })}
                                  </Text>
                                </Flex>
                                <Stat mb={2}>
                                  <StatNumber fontSize="xl">
                                    {metric.used.toFixed(2)}
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
                                      : `${usedPctLabel}% ${intl.formatMessage({
                                          id: 'app.used'
                                        })}`}
                                  </StatHelpText>
                                </Stat>

                                {/* Segmented track. Chakra's Progress renders one value, so
                                    the two segments are laid out directly. */}
                                <Flex
                                  h="8px"
                                  w="full"
                                  bg="gray.100"
                                  borderRadius="full"
                                  overflow="hidden"
                                  mb={3}
                                  role="img"
                                  aria-label={intl.formatMessage(
                                    { id: 'app.storageBreakdownLabel' },
                                    {
                                      photos: fmtBytes(mediaBytes),
                                      documents: fmtBytes(documentsBytes)
                                    }
                                  )}>
                                  <Box w={`${mediaPct}%`} bg={`${mediaScheme}.500`} h="full" />
                                  <Box w={`${documentsPct}%`} bg="gray.400" h="full" />
                                </Flex>

                                {/* Legend. Segment order matches the bar; the colour is never
                                    the only carrier — each row is labelled. */}
                                <VStack align="stretch" spacing={1} mb={3}>
                                  <Flex align="center" justify="space-between">
                                    <HStack spacing={2}>
                                      <Box
                                        w="8px"
                                        h="8px"
                                        borderRadius="full"
                                        bg={`${mediaScheme}.500`}
                                      />
                                      <Text fontSize="sm" color="gray.700">
                                        {intl.formatMessage({ id: 'app.storagePhotos' })}
                                      </Text>
                                    </HStack>
                                    <Text fontSize="sm" color="gray.700">
                                      {fmtBytes(mediaBytes)}
                                    </Text>
                                  </Flex>
                                  <Flex align="center" justify="space-between">
                                    <HStack spacing={2}>
                                      <Box w="8px" h="8px" borderRadius="full" bg="gray.400" />
                                      <Text fontSize="sm" color="gray.700">
                                        {intl.formatMessage({ id: 'app.storageDocuments' })}
                                      </Text>
                                    </HStack>
                                    <Text fontSize="sm" color="gray.700">
                                      {fmtBytes(documentsBytes)}
                                    </Text>
                                  </Flex>
                                </VStack>

                                <Text fontSize="xs" color="gray.600">
                                  {intl.formatMessage({ id: 'app.storageDocumentsNeverBlocked' })}
                                </Text>
                              </StandardCard>
                            );
                          }

                          // Standard metric card for other metrics
                          return (
                            <StandardCard key={metric.name} variant="outline" mb={0}>
                              <Flex align="center" mb={3}>
                                <Icon
                                  as={metric.icon}
                                  mr={3}
                                  boxSize={5}
                                  color={`${usageScheme}.700`}
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
                                colorScheme={usageScheme}
                                borderRadius="full"
                              />
                            </StandardCard>
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
                        {/* Was "Transparency Tracking ... documentation and verification" —
                            pivot-era framing, and "verification" is the unsafe verb
                            (verification-language rules). The plan's actual value is the
                            recordkeeping artifacts. */}
                        <Card borderWidth="1px" borderColor="green.200" bg="green.50">
                          <CardBody>
                            <Flex align="center" mb={3}>
                              <Icon as={FaShieldAlt} mr={3} boxSize={5} color="green.500" />
                              <Text fontWeight="bold" color="green.700">
                                {intl.formatMessage({ id: 'subscription.featureRecordkeeping' })}
                              </Text>
                            </Flex>
                            <Text
                              fontSize="lg"
                              fontWeight="bold"
                              color="green.700"
                              mb={1}
                              textTransform="capitalize">
                              {intl.formatMessage({ id: 'app.included' })}
                            </Text>
                            <Text fontSize="sm" color="gray.600">
                              {intl.formatMessage({
                                id: 'subscription.featureRecordkeepingDescription'
                              })}
                            </Text>
                          </CardBody>
                        </Card>

                        <Card borderWidth="1px" borderColor="green.200" bg="green.50">
                          <CardBody>
                            <Flex align="center" mb={3}>
                              <Icon as={FaHeadset} mr={3} boxSize={5} color="green.700" />
                              <Text fontWeight="bold" color="green.800">
                                {intl.formatMessage({ id: 'app.supportResponse' })}
                              </Text>
                            </Flex>
                            <Text fontSize="2xl" fontWeight="bold" color="green.700" mb={1}>
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
                          bg={features?.priority_support ? 'orange.50' : 'gray.50'}>
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
                                color={features?.priority_support ? 'orange.700' : 'gray.600'}>
                                {intl.formatMessage({ id: 'app.prioritySupport' })}
                              </Text>
                            </Flex>
                            <Text
                              fontSize="lg"
                              fontWeight="bold"
                              color={features?.priority_support ? 'orange.600' : 'gray.500'}
                              mb={1}>
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

                    {/* Blockchain Verification card removed 2026-08-06.
                        The add-on was withdrawn 2026-08-03 and its AddOn row seeded
                        is_active=False — but this card rendered unconditionally, ignoring
                        that data, so the app kept offering a product the backend no longer
                        sells. BLOCKCHAIN_ENABLED now defaults false. See
                        documentation/strategy/TRAZO-OCTOBER-2026-PLAN.md §10.8. */}

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
                                  <StandardCard
                                    key={addonItem.id}
                                    variant="outline"
                                    mb={0}
                                    padding={{ base: 0, md: 3 }}>
                                    <Flex justify="space-between" align="center">
                                      <Box>
                                        <Text fontWeight="medium">{addonItem.addon?.name}</Text>
                                        <Text fontSize="sm" color="gray.600">
                                          {intl.formatMessage(
                                            { id: 'subscription.addonQuantity' },
                                            { quantity: addonItem.quantity }
                                          )}
                                        </Text>
                                      </Box>
                                      <Badge colorScheme="green" fontSize="md">
                                        {formatPrice(addonItem.addon?.price, addonItem.quantity)}{' '}
                                        {addonPeriodLabel(addonItem.addon || {}, intl)}
                                      </Badge>
                                    </Flex>
                                  </StandardCard>
                                ))}
                              </SimpleGrid>
                            </Box>
                          )}

                        {/* Available Add-ons (the API only serves active rows) */}
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
                                  _hover={{ boxShadow: 'md', borderColor: 'green.300' }}>
                                  <CardBody>
                                    <Flex justify="space-between" align="start">
                                      <Box flex="1">
                                        <Text fontWeight="medium">{addon.name}</Text>
                                        <Text fontSize="sm" color="gray.600" mb={2}>
                                          {addon.description}
                                        </Text>
                                        {/* The period comes from the add-on's own `interval`,
                                            never a hardcoded "per month". It used to be
                                            hardcoded because every add-on billed monthly; Extra
                                            Farm is now $149/YEAR (it was $30/mo — $360/yr against
                                            a $249/yr plan, so farm #2 cost more than farm #1),
                                            and a fixed suffix would have printed the new price
                                            under the old period. */}
                                        <Badge variant="neutral">
                                          {formatPrice(addon.price)} {addonPeriodLabel(addon, intl)}
                                        </Badge>
                                      </Box>
                                      <Button
                                        size="sm"
                                        minH="44px"
                                        variant="outline"
                                        ml={3}
                                        onClick={() => handleOpenAddonModal(addon)}>
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
                          minH="44px"
                          leftIcon={<FaPlus />}
                          isLoading={isCreatingCheckoutSession}
                          onClick={handleAddPaymentMethod}>
                          {intl.formatMessage({ id: 'app.addPaymentMethod' })}
                        </Button>
                      </Flex>

                      {paymentMethods.length > 0 ? (
                        <Stack spacing={3}>
                          {paymentMethods.map((method: any, index: number) => (
                            <StandardCard
                              key={index}
                              variant="outline"
                              mb={0}
                              padding={{ base: 0, md: 3 }}>
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
                                    mr={3}>
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
                                          {intl.formatMessage({
                                            id: 'subscription.defaultBadge'
                                          })}
                                        </Badge>
                                      )}
                                    </Text>
                                    <Text fontSize="sm" color="gray.600">
                                      {intl.formatMessage(
                                        { id: 'subscription.cardExpiry' },
                                        {
                                          last4: method.last_4,
                                          expMonth: method.exp_month,
                                          expYear: method.exp_year
                                        }
                                      )}
                                      {(() => {
                                        const now = new Date();
                                        const expDate = new Date(method.exp_year, method.exp_month);
                                        const threeMonths = new Date(
                                          now.getFullYear(),
                                          now.getMonth() + 3
                                        );
                                        if (expDate <= now) {
                                          return (
                                            <Badge ml={2} colorScheme="red" fontSize="xs">
                                              {intl.formatMessage({
                                                id: 'subscription.cardExpired'
                                              })}
                                            </Badge>
                                          );
                                        } else if (expDate <= threeMonths) {
                                          return (
                                            <Badge ml={2} colorScheme="orange" fontSize="xs">
                                              {intl.formatMessage({
                                                id: 'subscription.cardExpiringSoon'
                                              })}
                                            </Badge>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </Text>
                                  </Box>
                                </Flex>
                                {!method.is_default && (
                                  <Button
                                    size="sm"
                                    minH="44px"
                                    variant="ghost"
                                    onClick={() => handleSetDefaultPaymentMethod(method.id)}>
                                    {intl.formatMessage({ id: 'subscription.setDefault' })}
                                  </Button>
                                )}
                              </Flex>
                            </StandardCard>
                          ))}
                        </Stack>
                      ) : (
                        <StandardCard mb={0}>
                          <Box textAlign="center" py={2}>
                            <Icon as={FaCreditCard} boxSize={10} color="gray.300" mb={3} />
                            <Text color="gray.500" mb={4}>
                              {intl.formatMessage({ id: 'app.noPaymentMethods' })}
                            </Text>
                            <Button
                              minH="44px"
                              leftIcon={<FaPlus />}
                              isLoading={isCreatingCheckoutSession}
                              onClick={handleAddPaymentMethod}>
                              {intl.formatMessage({ id: 'app.addPaymentMethod' })}
                            </Button>
                          </Box>
                        </StandardCard>
                      )}
                    </Box>

                    {/* Billing Information */}
                    <Box>
                      <Flex justify="space-between" align="center" mb={4}>
                        <Text fontSize="lg" fontWeight="bold">
                          {intl.formatMessage({ id: 'app.billingInformation' })}
                        </Text>
                        <Button
                          size="sm"
                          minH="44px"
                          leftIcon={<FaEdit />}
                          variant="ghost"
                          onClick={handleOpenBillingEdit}>
                          {intl.formatMessage({ id: 'subscription.editBillingInfo' })}
                        </Button>
                      </Flex>
                      <StandardCard mb={0}>
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
                            <Text fontWeight="medium">
                              {(activeCompany as any)?.contact_email || '-'}
                            </Text>
                          </Box>
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              {intl.formatMessage({ id: 'subscription.phone' })}
                            </Text>
                            <Text fontWeight="medium">
                              {(activeCompany as any)?.contact_phone || '-'}
                            </Text>
                          </Box>
                          <Box>
                            <Text color="gray.500" fontSize="sm">
                              {intl.formatMessage({ id: 'subscription.taxId' })}
                            </Text>
                            <Text fontWeight="medium">
                              {(activeCompany as any)?.fiscal_id || '-'}
                            </Text>
                          </Box>
                        </SimpleGrid>
                      </StandardCard>
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
                          <StandardCard
                            key={index}
                            variant="outline"
                            mb={0}
                            padding={{ base: 0, md: 3 }}>
                            <Flex justify="space-between" align="center">
                              <Box>
                                <Text fontWeight="medium">
                                  {intl.formatMessage(
                                    { id: 'subscription.invoiceLabel' },
                                    { number: invoice.number || invoice.id }
                                  )}
                                </Text>
                                <Text fontSize="sm" color="gray.600">
                                  {formatDate(invoice.created_at || invoice.invoice_date)} ·{' '}
                                  {formatPrice(invoice.amount)}
                                </Text>
                              </Box>
                              <HStack>
                                <Badge
                                  colorScheme={
                                    invoice.status === 'paid'
                                      ? 'green'
                                      : invoice.status === 'open'
                                      ? 'yellow'
                                      : invoice.status === 'uncollectible' ||
                                        invoice.status === 'void'
                                      ? 'red'
                                      : 'gray'
                                  }
                                  fontSize="xs">
                                  {invoice.status}
                                </Badge>
                                {invoice.invoice_pdf && (
                                  <Button
                                    size="sm"
                                    minH="44px"
                                    variant="ghost"
                                    rightIcon={<FaExternalLinkAlt />}
                                    as="a"
                                    href={invoice.invoice_pdf}
                                    target="_blank">
                                    {intl.formatMessage({ id: 'subscription.download' })}
                                  </Button>
                                )}
                              </HStack>
                            </Flex>
                          </StandardCard>
                        ))}
                      </Stack>
                    ) : (
                      <StandardCard mb={0}>
                        <Box textAlign="center" py={2}>
                          <Icon as={FaFileInvoiceDollar} boxSize={10} color="gray.300" mb={3} />
                          <Text color="gray.500">
                            {intl.formatMessage({ id: 'app.noInvoicesYet' })}
                          </Text>
                        </Box>
                      </StandardCard>
                    )}
                  </VStack>
                </TabPanel>
              </TabPanels>
            </Tabs>
          </CardBody>
        </Card>
      </VStack>

      {/* Billing Info Edit Modal */}
      <Modal
        isOpen={isBillingEditOpen}
        onClose={onBillingEditClose}
        isCentered
        size="md"
        scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl" maxH="90vh" mx={4}>
          <ModalHeader>{intl.formatMessage({ id: 'subscription.editBillingInfo' })}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({ id: 'subscription.email' })}
                </FormLabel>
                <StandardInput
                  type="email"
                  value={billingForm.contact_email}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, contact_email: e.target.value })
                  }
                  placeholder="billing@example.com"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({ id: 'subscription.phone' })}
                </FormLabel>
                <StandardInput
                  type="tel"
                  value={billingForm.contact_phone}
                  onChange={(e) =>
                    setBillingForm({ ...billingForm, contact_phone: e.target.value })
                  }
                  placeholder="+1 (555) 000-0000"
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {intl.formatMessage({ id: 'subscription.taxId' })}
                </FormLabel>
                <StandardInput
                  value={billingForm.fiscal_id}
                  onChange={(e) => setBillingForm({ ...billingForm, fiscal_id: e.target.value })}
                  placeholder="EIN / Tax ID"
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onBillingEditClose}>
              {intl.formatMessage({ id: 'app.cancel' })}
            </Button>
            <Button
              colorScheme="green"
              onClick={handleSaveBillingInfo}
              isLoading={isUpdatingBilling}>
              {intl.formatMessage({ id: 'app.save' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Early Access Modal */}
      <Modal
        isOpen={isEarlyAccessOpen}
        onClose={onEarlyAccessClose}
        isCentered
        size="md"
        scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl" maxH="90vh" mx={4}>
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
              <Box
                bg="green.50"
                p={4}
                borderRadius="lg"
                borderLeft="4px solid"
                borderLeftColor="green.400">
                <Text fontSize="sm" color="green.700" fontWeight="medium">
                  {intl.formatMessage({ id: 'app.earlyAccess.foundingMember' })}
                </Text>
              </Box>
              {earlyAccessPlanName && (
                <HStack spacing={2} bg="gray.50" p={3} borderRadius="md">
                  <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
                  <Text fontSize="sm" color="gray.600">
                    {intl.formatMessage({ id: 'app.earlyAccess.selectedPlan' })}:{' '}
                    <strong>{earlyAccessPlanName}</strong>
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
                window.location.href =
                  'mailto:oscar@trazo.io?subject=Early Access - ' +
                  (earlyAccessPlanName || 'Trazo');
              }}
              leftIcon={<Icon as={FaEnvelope} />}>
              {intl.formatMessage({ id: 'app.earlyAccess.contactUs' })}
            </Button>
            <Button
              colorScheme="green"
              size="md"
              onClick={() => {
                onEarlyAccessClose();
                navigate('/admin/dashboard');
              }}
              leftIcon={<Icon as={FaRocket} />}>
              {intl.formatMessage({ id: 'app.goToDashboard' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Add-on Modal */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered size="md" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent borderRadius="xl" maxH="90vh" mx={4}>
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
                  {selectedAddon.slug === 'extra-storage' && (
                    <Text color="green.700" fontSize="sm" mt={1} fontWeight="medium">
                      {intl.formatMessage({ id: 'subscription.addonStorageUnit' })}
                    </Text>
                  )}
                  {selectedAddon.slug === 'extra-establishment' && (
                    <Text color="green.700" fontSize="sm" mt={1} fontWeight="medium">
                      {intl.formatMessage({ id: 'subscription.addonEstablishmentUnit' })}
                    </Text>
                  )}
                  {selectedAddon.slug === 'extra-parcel' && (
                    <Text color="green.700" fontSize="sm" mt={1} fontWeight="medium">
                      {intl.formatMessage({ id: 'subscription.addonParcelUnit' })}
                    </Text>
                  )}
                  {selectedAddon.slug === 'extra-production' && (
                    <Text color="green.700" fontSize="sm" mt={1} fontWeight="medium">
                      {intl.formatMessage({ id: 'subscription.addonProductionUnit' })}
                    </Text>
                  )}
                </Box>
                <Box>
                  <Text mb={2}>{intl.formatMessage({ id: 'app.quantity' })}</Text>
                  <StandardNumberInput
                    value={addonQuantity}
                    min={1}
                    max={100}
                    onChange={(valueString) => setAddonQuantity(parseInt(valueString) || 1)}
                  />
                </Box>
                <Box>
                  <Text color="gray.600" fontSize="sm">
                    {intl.formatMessage({ id: 'app.unitPrice' })}:{' '}
                    {formatPrice(selectedAddon.price)} {addonPeriodLabel(selectedAddon, intl)}
                  </Text>
                  <Text fontWeight="bold" fontSize="lg">
                    {intl.formatMessage({ id: 'app.total' })}:{' '}
                    {formatPrice(selectedAddon.price, addonQuantity)}{' '}
                    {addonPeriodLabel(selectedAddon, intl)}
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

      <CancelSubscriptionModal
        isOpen={isCancelOpen}
        onClose={onCancelClose}
        onConfirm={handleCancelSubscription}
        planName={plan?.name || ''}
        periodEndLabel={
          subscription?.current_period_end ? formatDate(subscription.current_period_end) : undefined
        }
        isSubmitting={isCancellingSubscription}
        exceeds={(subscription as any)?.downgrade_preview?.exceeds || []}
      />
    </StandardPage>
  );
}

export default UnifiedSubscriptionDashboard;
