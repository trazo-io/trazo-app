import React, { useState, useEffect, useMemo } from 'react';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  HStack,
  Icon,
  SimpleGrid,
  Text,
  useColorModeValue,
  CircularProgress,
  useToast,
  Badge,
  VStack,
  Heading,
  Tooltip,
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
  FaIndustry,
  FaGift,
  FaHandshake,
  FaEnvelope,
  FaMicrophone,
  FaMagic
} from 'react-icons/fa';
import { useIntl } from 'react-intl';
// '/pure' entry: plain '@stripe/stripe-js' injects js.stripe.com as a module
// side effect — meaning every page (including the consumer QR page) loaded
// Stripe just because App.tsx statically imports this file. The pure entry
// only injects when loadStripe() is actually called (checkout start).
import { loadStripe } from '@stripe/stripe-js/pure';
import config from 'config/environment';
import { useGetPlansQuery } from 'store/api/subscriptionApi';
import { useCreateCheckoutSessionMutation, useStartTrialMutation } from 'store/api/billingApi';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';

// Import Trazo Design System
import { StandardPage, StandardButton, StandardAlert, StandardSection } from 'components/Design';

// Lazy Stripe loader. The previous module-level loadStripe() executed on
// EVERY app load — including the consumer QR page, where the key is empty —
// throwing an uncaught IntegrationError in the shopper's console and pulling
// Stripe.js for users who can never pay. Now Stripe loads only when checkout
// actually starts, and only if a key is configured.
let _stripePromise = null;
const getStripe = () => {
  const key = import.meta.env.VITE_APP_STRIPE_PUBLIC_KEY;
  if (!key) return Promise.resolve(null);
  if (!_stripePromise) {
    _stripePromise = loadStripe(key);
  }
  return _stripePromise;
};

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

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutPlanId, setCheckoutPlanId] = useState(null);
  const [isUpgradeFlow, setIsUpgradeFlow] = useState(false);
  const [upgradeResourceType, setUpgradeResourceType] = useState(null);

  // Get user and company directly from Redux state instead of useAuth
  const activeCompany = useSelector((state) => state.company.currentCompany);

  const toast = useToast();

  // Use RTK Query hooks with cache busting. No interval argument: since the 2026-08-07
  // restructure the self-serve lineup is Starter (free) + Compliance ($249/yr) — the old
  // monthly/yearly toggle hid the ONLY paid tier on its default tab, because Compliance
  // exists solely as a yearly plan.
  const {
    data: plans = [],
    isLoading: loading,
    refetch
  } = useGetPlansQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });
  const [createCheckoutSession] = useCreateCheckoutSessionMutation();
  const [startTrial, { isLoading: isStartingTrial }] = useStartTrialMutation();
  const {
    isOpen: isEarlyAccessOpen,
    onOpen: onEarlyAccessOpen,
    onClose: onEarlyAccessClose
  } = useDisclosure();
  const [earlyAccessPlanName, setEarlyAccessPlanName] = useState(null);

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

    // Only handle success if we're actually on the pricing page (not coming from Stripe redirect)
    if (status === 'success' && !searchParams.get('session_id')) {
      toast({
        title: t('app.subscriptionSuccessful'),
        description: t('app.subscriptionSuccessfulDescription'),
        status: 'success',
        duration: 8000,
        isClosable: true
      });

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

  // The self-serve lineup: Starter (free), Compliance ($249/yr, one farm) and Operation
  // ($1,200/yr, every farm). Enterprise is a conversation, not a checkout — it is rendered below
  // as a static contact card, never priced. The API only serves active, non-pilot plans, so
  // anything else that appears here is a data bug, not a tier.
  //
  // 2026-08-17: Operation is the ceiling the page did not have. With one paid tier capped at a
  // single farm, a six-farm business paid $994 (Compliance + 5 Extra Farm) where Quick Organics
  // charges the same operation up to $4,250 — competitive at the bottom, giving the product away
  // at the top. Extra Farm stays for 2–6 farms; the crossover lands at ~7 on its own.
  //
  // 2026-08-14: Starter no longer caps productions. The two tiers are separated by the OUTPUT —
  // the certifier packet, the audit export, the CA PUR export and the certifier link — not by how
  // much a farm may log. So the capacity rows below now read the same on both cards, on purpose,
  // and the artifact lines are the entire difference. That is the honest picture.
  const displayPlans = useMemo(() => {
    if (!plans || plans.length === 0) return [];

    const starterPlan = plans.find((plan) => plan.slug === 'starter');
    const compliancePlan = plans.find((plan) => plan.slug === 'compliance-yearly');
    const operationPlan = plans.find((plan) => plan.slug === 'operation-yearly');

    // Starter ALWAYS renders. It used to be hidden from anyone with a subscription, on the
    // reasoning that "upgrading TO the free tier is not a thing" — true about the CTA, wrong
    // about the card. This page's only job is the diff between what you have and what you
    // would get, and a Starter farm arriving here saw two cards, neither of which was theirs:
    // no anchor, no delta, nothing to reassure them about what they keep. Hiding what somebody
    // already has, on the page where you ask them for money, reads as a dark pattern even when
    // it is only an oversight.
    //
    // The card being present is not an offer — `isOnPaidPlan` turns its CTA into a statement.
    const lineup = [];
    if (starterPlan) lineup.push(starterPlan);
    if (compliancePlan) lineup.push(compliancePlan);
    if (operationPlan) lineup.push(operationPlan);
    return lineup;
  }, [plans]);

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

  const getRecommendedPlan = (plans) => {
    // Compliance, not Operation. The recommendation is for somebody who has not bought yet, and
    // that is a one-farm operation until they tell us otherwise — recommending the $1,200 tier to
    // a single-farm grower is the upsell that makes a pricing page feel like a sales call.
    // Operation earns its way in through the farm-limit prompt, not through a badge.
    return plans.find((plan) => plan.slug === 'compliance-yearly') || null;
  };

  const getPlanIcon = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('starter')) return FaGift;
    if (name.includes('compliance')) return FaShieldAlt;
    if (name.includes('operation')) return FaBuilding;
    return FaLeaf;
  };

  // ONE brand green, and it belongs to the tier being sold. Starter was 'teal' — Chakra's
  // teal.500 (#319795), not a Trazo token at all, which put a second brand accent on the
  // page and shipped a white-on-teal CTA at 3.4:1. The free tier is a neutral fact, so it
  // renders neutral; green marks the paid artifacts and nothing else.
  const getPlanColor = (planName) => {
    const name = planName.toLowerCase();
    if (name.includes('starter')) return 'gray';
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
    setCheckoutPlanId(planId);

    // Interval comes from the plan itself now — the page no longer has a billing-cycle
    // toggle, because each plan exists in exactly one interval (Compliance is yearly-only).
    const selectedPlanInterval = plans.find((p) => p.id === planId)?.interval || 'yearly';

    try {
      const result = await createCheckoutSession({
        plan_id: planId,
        company_id: companyId,
        interval: selectedPlanInterval,
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

      const stripe = await getStripe();

      if (checkoutUrl) {
        // Direct redirect to URL
        window.location.href = checkoutUrl;
      } else if (sessionId) {
        // Use Stripe's redirectToCheckout
        if (!stripe) {
          throw new Error('Payments are not configured in this environment');
        }
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

      if (error.data?.detail) {
        errorMessage = error.data.detail;
      } else if (error.data?.error) {
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
      setCheckoutPlanId(null);
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
      navigate('/admin/dashboard/subscription');
    } catch (error) {
      toast({
        title: t('app.error'),
        description: error?.data?.detail || error?.data?.error || t('app.trialStartError'),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  // The self-serve downgrade flow (handleDowngrade / confirmDowngrade / useChangePlanMutation /
  // the confirmation AlertDialog) is gone. It was unreachable: `isDowngrade` ranked
  // 'compliance' LAST in its plan order, and the only other plan the page can render is
  // Starter, whose branch was tested first — so the branch never evaluated. Reviving it would
  // also be the wrong call for October: a one-click downgrade off Compliance mid-renewal
  // season drops the certifier packet, the PUR export and the certifier link on a farm with a
  // deadline. Backend still schedules downgrades for period end; that stays a support path.

  // Plan identity is the SLUG, never the display name.
  //
  // Name matching (`currentPlanName.includes(planLower)`) returned false for a pilot on the
  // Compliance card — 'pilot' and 'compliance' share no substring — so a comped pilot was
  // rendered a full-strength "Select Plan" with the RECOMMENDED badge above it, on the exact
  // tier they already hold. With PAYMENTS_ENABLED that is a live $249 Stripe checkout for
  // something already paid for by someone else. `UnifiedSubscription` guards this (it hides
  // Cancel and swaps the price for `pilotComplimentary`); this page, which its "Change Plan"
  // button links to, did not.
  const currentSubscription = activeCompany?.subscription;
  const currentPlanSlug = currentSubscription?.plan?.slug || '';
  const currentPlanLabel = currentSubscription?.plan?.name || '';
  const isPilot =
    currentPlanSlug === 'pilot' || currentSubscription?.plan?.features?.is_pilot === true;

  // A pilot's features are DERIVED from Compliance (migration 0011 spreads
  // `compliance_features` into the pilot row), so Compliance *is* the pilot's current plan.
  const isCurrentPlan = (planSlug) => {
    if (isPilot) return planSlug === 'compliance-yearly';
    return !!currentPlanSlug && currentPlanSlug === planSlug;
  };

  // THE RETIRED LADDER IS NOT A HYPOTHETICAL.
  //
  // `basic-*`, `standard-*`, `corporate-*` and `enterprise-*` rows still exist and still carry
  // ACTIVE subscriptions — they were deactivated as products (0009/0012), not cancelled as
  // contracts. So there is a fourth state beside starter / compliance / pilot: a farm whose
  // plan is not on this page at all.
  //
  // Getting this wrong is expensive in both directions. Defining "paid" as
  // `slug === 'compliance-yearly'` (which this did) makes a Corporate customer read as FREE:
  // the hero told them "You're on Starter — free forever", and Starter's CTA rendered as a
  // live "Start free" that would drop a paying subscription to the free tier in one click.
  // So the test is the SUBSCRIPTION, not the slug we happen to sell today.
  const hasSubscription = !!currentPlanSlug;
  const isOnStarter = currentPlanSlug === 'starter';
  const isOnPaidPlan = hasSubscription && !isOnStarter;

  // The slugs this page can actually render. A SET, not a literal.
  //
  // 2026-08-17: `isOnRetiredPlan` was `currentPlanSlug !== 'compliance-yearly'`, and adding the
  // Operation tier turned every Operation subscriber into a "your plan is no longer sold" banner
  // — the same single-literal mistake that read a Corporate customer as free, one tier later.
  // Anything that asks "is this plan still on sale" belongs against this list.
  const LIVE_PAID_SLUGS = ['compliance-yearly', 'operation-yearly'];
  const isOnLivePaidPlan = LIVE_PAID_SLUGS.includes(currentPlanSlug);

  // On a plan this page cannot show. Compliance is NOT auto-labelled an upgrade from one:
  // Corporate grants 4 farms and 50 GB against Compliance's 1 farm and 25 GB, and both already
  // carry `compliance_exports`. That move is a trade with real losses, so the page states the
  // fact and lets the operator decide — it does not pitch.
  const isOnRetiredPlan = isOnPaidPlan && !isPilot && !isOnLivePaidPlan;

  return (
    <StandardPage
      title={
        newCompanyFlow || isNewCompany ? t('app.companyCreatedSuccessTitle') : t('app.selectPlan')
      }
      // The description states WHERE YOU ARE, not what we would like to sell you.
      //
      // It used to read "Upgrade your plan to unlock more features" for everyone, which is
      // wrong three ways: a pilot has nothing to upgrade to, a Compliance farm has nothing
      // to upgrade to, and a Starter farm is not missing "features" — it is missing the
      // OUTPUTS (that distinction is the whole 2026-08-14 packaging decision).
      //
      // The expired-trial branch is gone with it. Starter cannot expire any more:
      // `expire_trials` has an empty EXPIRABLE_TRIAL_PLAN_SLUGS and no-ops, so
      // "Your 14-day free trial has expired" could only ever be a lie sitting where the
      // page's h1 belongs — in the same locale file that says "free forever, no expiry".
      description={
        newCompanyFlow || isNewCompany
          ? intl.formatMessage(
              { id: 'app.companyReadySelectPlan' },
              { name: activeCompany?.name || t('app.newCompany') }
            )
          : isPilot
          ? t('app.pricingHeroPilot')
          : isOnRetiredPlan
          ? intl.formatMessage({ id: 'app.pricingHeroOnRetiredPlan' }, { plan: currentPlanLabel })
          : currentPlanSlug === 'operation-yearly'
          ? t('app.pricingHeroOnOperation')
          : currentPlanSlug === 'compliance-yearly'
          ? t('app.pricingHeroOnCompliance')
          : isOnStarter
          ? t('app.pricingHeroOnStarter')
          : // No subscription at all — do not assert a plan we cannot see.
            t('app.pricingHeroChoose')
      }
      showBackButton={!newCompanyFlow && !isNewCompany}
      onBack={() => navigate(-1)}>
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
            textTransform="none">
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

      {/* Your plan, when your plan is not one of the cards.
          A farm on a retired tier (basic/standard/corporate/enterprise) would otherwise see
          three cards and no answer to "which one am I on?" — the page's single most basic
          job. Naming the row is the whole point; this deliberately makes no recommendation,
          because moving off Corporate is a trade (4 farms and 50 GB for 1 farm and 25 GB),
          not an upgrade. */}
      {isOnRetiredPlan && (
        <StandardAlert
          status="info"
          title={intl.formatMessage(
            { id: 'app.pricingCurrentPlanNotListed' },
            { plan: currentPlanLabel }
          )}
          description={t('app.pricingRetiredPlanExplainer')}
        />
      )}

      {/* Plans Section — deliberately headerless.
          It used to be a StandardSection titled "Subscription Plans" / "Designed specifically
          for agricultural producers", stacked directly under StandardPage's hero, which had
          already rendered "Select Your Plan" / "Upgrade your plan…". Four header lines and
          ~200px before any content, two of them saying the same thing twice — and the second
          subtitle string renders AGAIN under "Why Choose Trazo?" from a different key with a
          byte-identical value.
          It also produced a visible seam: StandardPage pulls its body up with `mt="-40px"` so
          a CARD can overlap the hero gradient. The first child here was bare header text
          instead, so the hero's background boundary (measured at y=373) landed BETWEEN the h2
          and its own description — a title and its subtitle on two different backgrounds.
          The section is the page. The hero is its header. `className="plans-section"` went
          with it: StandardSection has no `className` prop and no rest-spread, so it was
          dropped, and nothing in the repo reads that selector. */}
      <Box mb={8}>
        {/* No billing-cycle toggle: each plan exists in exactly one interval (Starter is
            free, Compliance is yearly). The old monthly/yearly switch hid the only paid
            tier on its default tab. */}
        <VStack spacing={8} w="full">
          {/* Plans Grid */}
          {loading ? (
            <VStack spacing={4} py={12}>
              <CircularProgress isIndeterminate color="green.700" />
              <Text color="gray.500">{t('app.loadingPlans')}</Text>
              <StandardButton
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                isLoading={loading}>
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
            /* No self-cap. `maxW="1100px" mx="auto"` re-capped the grid inside a page column
               StandardPage had already capped at 8xl/1440px, while the section heading stayed
               on the full column — the exact "never cap the content yourself" failure in
               .claude/rules/frontend.md. Combined with `justifyItems="center"` and a 300px
               card cap it left the first card's edge ~290px right of its own heading, a 262px
               hole between two 298px cards, and plan cards NARROWER than the marketing cards
               below them. Tracks now size themselves and the cards fill them.
               `alignItems="stretch"` so the short Enterprise card matches its neighbours
               instead of top-aligning above 348px of dead space.

               `+1` counts the static Enterprise card rendered inside this same grid. Capped
               at 4, not 3: with three plans the old `min(len+1, 3)` put four cards into three
               columns and stranded Enterprise alone on a second row. The step is 1 → 2 → 4
               rather than 1 → 2 → 3 → 4 so the count never leaves an orphan; at `md`–`lg`
               four cards read as a balanced 2×2. */
            <SimpleGrid
              columns={{ base: 1, md: 2, xl: Math.min(displayPlans.length + 1, 4) }}
              spacing={5}
              w="full"
              alignItems="stretch">
              {displayPlans.map((plan) => {
                const isCurrent = isCurrentPlan(plan.slug);
                // Never recommend a plan the farm already holds. (Guarded here as well as at
                // the badge, so `isRecommended` cannot leak into the CTA variant either.)
                const isRecommended =
                  !isCurrent && !isOnPaidPlan && plan.id === getRecommendedPlan(displayPlans)?.id;
                const planIcon = getPlanIcon(plan.name);
                const planColor = getPlanColor(plan.name);

                return (
                  <motion.div
                    key={plan.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    style={{ width: '100%', height: '100%' }}>
                    {/* A plain Box, not StandardCard.
                        StandardCard takes no rest-spread (StandardComponents.tsx:329) so every
                        one of these props was silently dropped — which is why the RECOMMENDED
                        card had no border, the current-plan card had no tint, and nothing
                        stretched. Even with a spread it would not paint: the protected
                        trazo-dashboard-styles.css forces border/shadow/radius on `.trazo-card`
                        with !important. A Box carries neither hook, so these values are real —
                        this is the documented `project_trazo_card_css_override` escape hatch.
                        overflow visible, not hidden: the RECOMMENDED badge sits at top={-3}. */}
                    <Box
                      position="relative"
                      display="flex"
                      flexDirection="column"
                      h="full"
                      bg="white"
                      borderRadius={{ base: 'lg', md: 'xl' }}
                      border="2px solid"
                      // Status colour = meaning. The plan you already have is a plain FACT, so
                      // it gets a neutral boundary; green is reserved for the tier being sold.
                      // (blue.400/blue.50 previously marked "current" — blue carries no meaning
                      // in this palette outside Alert status="info".)
                      //
                      // gray.500, not gray.300. MEASURED against the gray.200 default every
                      // other card carries: gray.300 (#BDBDBD) is 1.88:1 on white and gray.200
                      // (#E0E0E0) is 1.32:1 — two hairlines nobody can tell apart, so the
                      // "current" boundary would have carried no information. gray.500
                      // (#757575) is 4.61:1 and clears the 3.0 non-text floor on its own.
                      // State is still never colour-only: the CURRENT PLAN badge and the
                      // disabled "Your plan" CTA each say it in words.
                      borderColor={
                        isCurrent ? 'gray.500' : isRecommended ? 'green.600' : 'gray.200'
                      }
                      boxShadow={isRecommended ? 'lg' : 'sm'}
                      transition="box-shadow 0.2s"
                      _hover={{ boxShadow: 'xl' }}>
                      {/* Current Plan Badge */}
                      {isCurrent && (
                        <Badge
                          position="absolute"
                          top={-3}
                          left="50%"
                          transform="translateX(-50%)"
                          bg="gray.700"
                          color="white"
                          fontSize="xs"
                          px={4}
                          py={1.5}
                          borderRadius="full"
                          fontWeight="semibold"
                          textTransform="uppercase"
                          letterSpacing="wide"
                          zIndex={2}>
                          {t('app.currentPlanBadge')}
                        </Badge>
                      )}
                      {/* Recommended Badge. green.700 explicitly, not colorScheme — the badge
                          theme resolves `green` to green.700/white (5.13:1) today, but the fill
                          under white text is worth pinning rather than inheriting. */}
                      {isRecommended && (
                        <Badge
                          position="absolute"
                          top={-3}
                          left="50%"
                          transform="translateX(-50%)"
                          bg="green.700"
                          color="white"
                          fontSize="xs"
                          px={4}
                          py={1.5}
                          borderRadius="full"
                          fontWeight="semibold"
                          textTransform="uppercase"
                          letterSpacing="wide"
                          zIndex={2}>
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
                            borderColor={`${planColor}.200`}>
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
                              alignItems="center">
                              {plan.description}
                            </Text>
                          </VStack>

                          {/* Pricing */}
                          <VStack spacing={2}>
                            {plan.slug === 'starter' ? (
                              <>
                                <Text fontSize="3xl" fontWeight="bold" color="gray.700">
                                  {t('app.starterTrialLength')}
                                </Text>
                                <Text fontSize="sm" color="gray.500" fontWeight="medium">
                                  {t('app.starterNoCreditCard')}
                                </Text>
                              </>
                            ) : (
                              <>
                                <HStack align="baseline" justify="center" flexWrap="nowrap">
                                  <Text
                                    fontSize="3xl"
                                    fontWeight="bold"
                                    color={`${planColor}.700`}
                                    whiteSpace="nowrap">
                                    $
                                    {(() => {
                                      const price =
                                        typeof plan.price === 'number'
                                          ? plan.price
                                          : parseFloat(plan.price) || 0;
                                      // Whole dollars — every live price is one.
                                      return Number.isInteger(price)
                                        ? price.toFixed(0)
                                        : price.toFixed(2);
                                    })()}
                                  </Text>
                                  <Text
                                    color="gray.500"
                                    fontSize="sm"
                                    fontWeight="medium"
                                    whiteSpace="nowrap">
                                    /
                                    {plan.interval === 'monthly'
                                      ? t('app.perMonthShort')
                                      : t('app.perYearShort')}
                                  </Text>
                                </HStack>
                                {plan.interval === 'yearly' && (
                                  <Text fontSize="sm" color="gray.500">
                                    {t('app.perFarmBilledAnnually')}
                                  </Text>
                                )}
                              </>
                            )}
                          </VStack>
                        </VStack>
                      </Box>

                      <Box py={5} px={4} flex="1">
                        <VStack spacing={4} align="stretch" h="full">
                          <Box textAlign="center" mb={3}>
                            <Text
                              fontSize="xs"
                              fontWeight="bold"
                              color="gray.700"
                              textTransform="uppercase"
                              letterSpacing="wide">
                              {t('app.featuresIncluded')}
                            </Text>
                            <Box w="40px" h="1px" bg={`${planColor}.300`} mx="auto" mt={2} />
                          </Box>

                          {/* Core Features */}
                          {plan.features?.max_establishments && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaBuilding} color={`${planColor}.700`} boxSize={4} />
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
                              <Icon as={FaMapMarkedAlt} color={`${planColor}.700`} boxSize={4} />
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
                              <Icon as={FaLeaf} color={`${planColor}.700`} boxSize={4} />
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
                              <Icon as={FaQrcode} color={`${planColor}.700`} boxSize={4} />
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
                              <Icon as={FaDatabase} color={`${planColor}.700`} boxSize={4} />
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
                              <Icon as={FaHeadset} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {intl.formatMessage(
                                  { id: 'app.supportInHours' },
                                  { hours: plan.features.support_response_time }
                                )}
                              </Text>
                            </HStack>
                          )}

                          {/* What the PAID tiers sell — the renewal-season artifacts.
                              Claim-safe wording: "readiness checks", never "findings";
                              the OSP is a DRAFT the producer reviews and submits.

                              Keyed off `compliance_exports`, not off a slug. The slug test
                              silently dropped these three lines from Operation the moment it
                              shipped, leaving the $1,200 card looking like it bought LESS than
                              the $249 one. The feature flag is what the backend actually gates
                              on (`subscriptions/gating.py`), so it is what the card should read. */}
                          {plan.features?.compliance_exports && (
                            <>
                              <HStack spacing={2} align="center">
                                <Icon as={FaShieldAlt} color={`${planColor}.700`} boxSize={4} />
                                <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                  {t('app.pricingFeatureCertifierPacket')}
                                </Text>
                              </HStack>
                              <HStack spacing={2} align="center">
                                <Icon as={FaCheckCircle} color={`${planColor}.700`} boxSize={4} />
                                <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                  {t('app.pricingFeatureOspDraft')}
                                </Text>
                              </HStack>
                              <HStack spacing={2} align="center">
                                <Icon as={FaCheckCircle} color={`${planColor}.700`} boxSize={4} />
                                <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                  {t('app.pricingFeaturePurExport')}
                                </Text>
                              </HStack>
                            </>
                          )}

                          {/* Operation's one differentiator, stated plainly.
                              Every other row on this card is identical to Compliance — that is
                              the point, and hiding it behind a longer feature list would only
                              make the difference harder to find. What $1,200 buys is that the
                              price stops counting farms. */}
                          {plan.slug === 'operation-yearly' && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaBuilding} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.pricingFeatureEveryFarm')}
                              </Text>
                            </HStack>
                          )}

                          {/* Starter's boundary, stated ON the free card.
                              A free tier whose limit is invisible is a 403 waiting to happen:
                              the farmer discovers it at renewal, with the packet half-filled and
                              a deadline in hand. Naming it here costs one line and makes the
                              upgrade a decision rather than an ambush. */}
                          {plan.slug === 'starter' && (
                            <HStack spacing={2} align="center">
                              {/* gray.500, not gray.400. MEASURED: gray.400 (#9E9E9E) on white is
                                  2.68:1 — below the 3.0 floor the colour rules set for non-text
                                  elements, so the icon marking the free tier's one limitation was
                                  the least visible mark on the card. gray.500 (#757575) is
                                  4.61:1 and still reads as muted beside the green feature rows. */}
                              <Icon as={FaShieldAlt} color="gray.500" boxSize={4} />
                              <Text fontSize="xs" color="gray.500" flex={1}>
                                {t('app.pricingStarterNoCertifierDocs')}
                              </Text>
                            </HStack>
                          )}

                          {/* AI Event Templates - Available on all plans */}
                          {plan.features?.ai_event_templates && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaMagic} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.aiEventTemplatesFeature')}
                              </Text>
                            </HStack>
                          )}

                          {plan.features?.priority_support && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaStar} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.prioritySupportFeature')}
                              </Text>
                            </HStack>
                          )}

                          {/* Enterprise Features */}
                          {plan.features?.dedicated_support && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaHeadset} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.dedicatedSupportFeature')}
                              </Text>
                            </HStack>
                          )}

                          {/* Voice Recording */}
                          {plan.features?.voice_recording && (
                            <HStack spacing={2} align="center">
                              <Icon as={FaMicrophone} color={`${planColor}.700`} boxSize={4} />
                              <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                                {t('app.voiceRecordingFeature')}
                              </Text>
                            </HStack>
                          )}
                        </VStack>
                      </Box>

                      <Box pt={4} pb={6} px={4}>
                        <VStack spacing={3} w="full">
                          {/* Three CTA states, in the order they are decided:
                              1. the plan you are ON        → a statement, disabled
                              2. Starter while you hold a paid plan → a fact, disabled; moving
                                 back down is a support conversation (backend schedules it for
                                 period end), not a button that quietly drops the certifier
                                 documents mid-renewal-season
                              3. anything else              → the actual offer */}
                          {isCurrent ? (
                            <StandardButton
                              variant="outline"
                              size="md"
                              leftIcon={<Icon as={FaCheckCircle} />}
                              w="full"
                              h="10"
                              fontSize="sm"
                              fontWeight="bold"
                              isDisabled
                              aria-label={`${
                                isPilot ? t('app.pricingIncludedInPilot') : t('app.pricingYourPlan')
                              }: ${plan.name}`}>
                              {isPilot ? t('app.pricingIncludedInPilot') : t('app.pricingYourPlan')}
                            </StandardButton>
                          ) : plan.slug === 'starter' && isOnPaidPlan ? (
                            <Tooltip
                              label={t('subscription.downgradeTooltip')}
                              placement="top"
                              hasArrow>
                              <Box w="full">
                                <StandardButton
                                  variant="outline"
                                  size="md"
                                  w="full"
                                  h="10"
                                  fontSize="sm"
                                  fontWeight="bold"
                                  isDisabled
                                  aria-label={`${t('app.downgrade')} ${plan.name}`}>
                                  {t('app.downgrade')}
                                </StandardButton>
                              </Box>
                            </Tooltip>
                          ) : plan.slug === 'starter' ? (
                            <StandardButton
                              variant="primary"
                              size="md"
                              leftIcon={<Icon as={FaGift} />}
                              w="full"
                              h="10"
                              fontSize="sm"
                              fontWeight="bold"
                              onClick={handleStartTrial}
                              isLoading={isStartingTrial}
                              loadingText={t('app.processing')}
                              aria-label={t('app.starterTrialCta')}>
                              {t('app.starterTrialCta')}
                            </StandardButton>
                          ) : (
                            <StandardButton
                              variant={isRecommended ? 'primary' : 'outline'}
                              size="md"
                              onClick={() => handleSubscribe(plan.id)}
                              isLoading={checkoutLoading && checkoutPlanId === plan.id}
                              loadingText={t('app.processingPayment')}
                              leftIcon={<Icon as={FaCreditCard} />}
                              w="full"
                              h="10"
                              fontSize="sm"
                              fontWeight="bold"
                              aria-label={`${t('app.selectPlanButton')}: ${plan.name}`}
                              // No `_hover` override. A style-prop `_hover` REPLACES the theme
                              // variant's hover object wholesale, which deleted the primary
                              // button's green.800 hover fill and dropped it from 5.13:1 to
                              // 4.12:1 the moment the pointer touched it.
                            >
                              {/* Always "Select Plan". In the new-company flow this rendered
                                  "Start free" — on a $249/yr card whose onClick opens Stripe. */}
                              {t('app.selectPlanButton')}
                            </StandardButton>
                          )}

                          {/* The `trial_with_card_days` block is gone. No live plan has a trial:
                              Starter is free forever and Compliance is paid from day one. It
                              still rendered because migration 0009 wrote trial_no_card_days /
                              trial_with_card_days onto the Compliance row and no later migration
                              removed them — so a migrate-only database (i.e. production) printed
                              "14-day free trial included" under a $249/yr plan. Migration 0015
                              strips the keys; this removes the surface that read them. */}
                        </VStack>
                      </Box>
                    </Box>
                  </motion.div>
                );
              })}

              {/* Enterprise — a conversation, not a checkout. Deliberately static: the
                  enterprise plan rows were deactivated (migration 0012) so no public
                  surface ever publishes a price for it again. */}
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                style={{ width: '100%', height: '100%' }}>
                <Box
                  position="relative"
                  display="flex"
                  flexDirection="column"
                  h="full"
                  bg="white"
                  borderRadius={{ base: 'lg', md: 'xl' }}
                  border="2px solid"
                  borderColor="gray.200"
                  boxShadow="sm"
                  transition="box-shadow 0.2s"
                  _hover={{ boxShadow: 'xl' }}>
                  <Box pb={4} pt={6}>
                    <VStack spacing={4} align="center">
                      <Box
                        p={3}
                        bg="gray.100"
                        borderRadius="full"
                        border="2px solid"
                        borderColor="gray.200">
                        <Icon as={FaIndustry} boxSize={8} color="gray.600" />
                      </Box>
                      <VStack spacing={2} textAlign="center">
                        <Heading as="h3" size="lg" color="gray.800" fontWeight="bold">
                          {t('app.enterprisePlanName')}
                        </Heading>
                        <Text
                          color="gray.600"
                          fontSize="sm"
                          textAlign="center"
                          minH="50px"
                          px={2}
                          lineHeight="1.5"
                          display="flex"
                          alignItems="center">
                          {t('app.enterpriseContactDescription')}
                        </Text>
                      </VStack>
                      <VStack spacing={2}>
                        <Text fontSize="3xl" fontWeight="bold" color="gray.700">
                          {t('app.enterpriseContactPrice')}
                        </Text>
                        <Text fontSize="sm" color="gray.500" fontWeight="medium">
                          {t('app.enterpriseContactSubtext')}
                        </Text>
                      </VStack>
                    </VStack>
                  </Box>
                  <Box py={5} px={4} flex="1">
                    <VStack spacing={4} align="stretch" h="full">
                      <Box textAlign="center" mb={3}>
                        <Text
                          fontSize="xs"
                          fontWeight="bold"
                          color="gray.700"
                          textTransform="uppercase"
                          letterSpacing="wide">
                          {t('app.featuresIncluded')}
                        </Text>
                        <Box w="40px" h="1px" bg="gray.300" mx="auto" mt={2} />
                      </Box>
                      {[
                        'app.enterpriseFeatureMultiFarm',
                        'app.enterpriseFeatureEverythingCompliance',
                        'app.enterpriseFeatureOnboarding'
                      ].map((featureId) => (
                        <HStack key={featureId} spacing={2} align="center">
                          <Icon as={FaCheckCircle} color="gray.500" boxSize={4} />
                          <Text fontSize="xs" color="gray.700" flex={1} fontWeight="medium">
                            {t(featureId)}
                          </Text>
                        </HStack>
                      ))}
                    </VStack>
                  </Box>
                  <Box pt={4} pb={6} px={4}>
                    <StandardButton
                      variant="outline"
                      size="md"
                      leftIcon={<Icon as={FaEnvelope} />}
                      w="full"
                      h="10"
                      fontSize="sm"
                      fontWeight="bold"
                      onClick={() => {
                        window.location.href =
                          'mailto:support@trazo.io?subject=' +
                          encodeURIComponent('Enterprise - Trazo');
                      }}
                      aria-label={t('app.enterpriseContactCta')}>
                      {t('app.enterpriseContactCta')}
                    </StandardButton>
                  </Box>
                </Box>
              </motion.div>
            </SimpleGrid>
          )}
        </VStack>
      </Box>

      {/* Blockchain add-on section removed 2026-08-06.
          The $15/mo blockchain add-on was withdrawn on 2026-08-03 along with its consumer
          surface, but this purchase flow survived — the page kept offering a product that no
          longer exists. BLOCKCHAIN_ENABLED now defaults to false backend-side; see
          documentation/strategy/TRAZO-OCTOBER-2026-PLAN.md §10.8. */}

      {/* "Why Choose Trazo?" and the FAQ are MARKETING, and they render only on the public
          /pricing page. In the dashboard the reader has already bought in — they came here to
          compare what they have against what they would get, and 1,400px of pitch below the
          cards is 2,276px of page for a two-plan decision. It also removes the second
          "Designed specifically for agricultural producers", which was the same sentence twice
          on one screen. */}
      {!inDashboard && (
        <>
          <Box mt={4}>
            <StandardSection
              title={intl.formatMessage({ id: 'app.whyChooseTrazo' })}
              description={intl.formatMessage({ id: 'app.designedForFarmers' })}>
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
                    color: 'green',
                    titleId: 'app.oneEntryTwoOutputs',
                    descId: 'app.oneEntryTwoOutputsDescription'
                  },
                  {
                    icon: FaHandshake,
                    color: 'green',
                    titleId: 'app.renewalReady',
                    descId: 'app.renewalReadyDescription'
                  }
                ].map((benefit, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -4, scale: 1.01 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}>
                    <Card
                      bg={cardBgColor}
                      borderRadius="xl"
                      boxShadow="sm"
                      border="1px solid"
                      borderColor={borderColor}
                      h="full"
                      _hover={{ boxShadow: 'md' }}
                      transition="all 0.2s">
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
                            justifyContent="center">
                            <Icon as={benefit.icon} boxSize={7} color={`${benefit.color}.700`} />
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
            description={intl.formatMessage({ id: 'app.faqDescription' })}>
            <Box maxW="800px" mx="auto">
              <FAQAccordion
                items={[
                  {
                    question: intl.formatMessage({ id: 'app.faqCanChangePlan' }),
                    answer: intl.formatMessage({ id: 'app.faqCanChangePlanAnswer' })
                  },
                  {
                    question: intl.formatMessage({ id: 'app.faqHowTrialWorks' }),
                    answer: intl.formatMessage({ id: 'app.faqHowTrialWorksAnswer' })
                  }
                ]}
              />
            </Box>
          </StandardSection>
        </>
      )}

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
                {activeCompany?.subscription
                  ? t('app.earlyAccess.bodyExisting')
                  : t('app.earlyAccess.body')}
              </Text>
              <Box
                bg="green.50"
                p={4}
                borderRadius="lg"
                borderLeft="4px solid"
                borderLeftColor="green.400">
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
                window.location.href =
                  'mailto:oscar@trazo.io?subject=Early Access - ' +
                  (earlyAccessPlanName || 'Trazo');
              }}
              leftIcon={<Icon as={FaEnvelope} />}>
              {t('app.earlyAccess.contactUs')}
            </StandardButton>
            {activeCompany?.subscription ? (
              <StandardButton
                variant="primary"
                size="md"
                colorScheme="green"
                onClick={() => {
                  onEarlyAccessClose();
                  navigate('/admin/dashboard');
                }}
                leftIcon={<Icon as={FaRocket} />}>
                {t('app.goToDashboard')}
              </StandardButton>
            ) : (
              <StandardButton
                variant="primary"
                size="md"
                colorScheme="green"
                onClick={() => {
                  onEarlyAccessClose();
                  handleStartTrial();
                }}
                leftIcon={<Icon as={FaGift} />}>
                {t('app.earlyAccess.startTrial')}
              </StandardButton>
            )}
          </ModalFooter>
        </ModalContent>
      </Modal>
    </StandardPage>
  );
}

/**
 * FAQ accordion — the SAME Chakra primitives as `views/Dashboard/Education/EducationFAQ.tsx`.
 *
 * This replaces a hand-rolled card that was labelled "Trazo Standard Pattern (from
 * EducationFAQ.tsx)" but only copied its LOOK. It toggled an `<h2>` with `onClick` +
 * `cursor="pointer"`, which measured on the live page as: not in the tab order, not focusable at
 * all, no `role`, no `aria-expanded`. A keyboard or screen-reader user could not open a single
 * answer — on a page that is also the PUBLIC /pricing route.
 *
 * `AccordionButton` renders a real `<button aria-expanded aria-controls>` and `AccordionPanel`
 * the matching region, so keyboard operation, focus ring and screen-reader state come for free.
 *
 * Note the education page fetches its FAQs from the API (`useGetFarmerQuestionsQuery`) and makes
 * them searchable; these two are hardcoded strings, which is a content decision, not a component
 * one. If the pricing FAQ ever grows past a handful, move it to the same source.
 */
const FAQAccordion = ({ items }) => {
  const cardBgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'white');
  const mutedTextColor = useColorModeValue('gray.500', 'gray.400');
  const dividerColor = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');

  return (
    <Card bg={cardBgColor} borderRadius="xl" boxShadow="sm" p={0} overflow="hidden">
      <Accordion allowMultiple>
        {items.map(({ question, answer }) => (
          <AccordionItem
            key={question}
            border="none"
            borderBottomWidth="1px"
            borderBottomColor={dividerColor}
            _last={{ borderBottomWidth: 0 }}>
            <AccordionButton px={{ base: 4, md: 6 }} py={4} _hover={{ bg: hoverBg }}>
              <Text
                fontWeight="semibold"
                fontSize="sm"
                color={textColor}
                flex={1}
                textAlign="left"
                pr={4}>
                {question}
              </Text>
              <AccordionIcon color="green.700" ml={2} />
            </AccordionButton>
            <AccordionPanel px={{ base: 4, md: 6 }} pb={5}>
              <Text fontSize="sm" color={mutedTextColor} lineHeight="1.6">
                {answer}
              </Text>
            </AccordionPanel>
          </AccordionItem>
        ))}
      </Accordion>
    </Card>
  );
};

export default Pricing;
