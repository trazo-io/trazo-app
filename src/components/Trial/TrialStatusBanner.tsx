import React from 'react';
import {
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  Progress,
  HStack
} from '@chakra-ui/react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { Company } from 'types/company';
import { useTourStore } from 'store/tourStore';

interface TrialStatusBannerProps {
  showOnlyWhenTrialExpiringSoon?: boolean;
}

const TrialStatusBanner: React.FC<TrialStatusBannerProps> = ({
  showOnlyWhenTrialExpiringSoon = false
}) => {
  const navigate = useNavigate();
  const intl = useIntl();
  const resetAllTours = useTourStore((s) => s.resetAllTours);

  // Get company data from Redux
  const company = useSelector((state: RootState) => {
    const auth = state.auth as any;
    if (auth && auth.companies && auth.companies.length > 0) {
      const selectedId = auth.selectedCompany;
      return auth.companies.find((company: Company) => company.id === selectedId) || null;
    }

    const companyState = (state as any).company;
    if (companyState && companyState.currentCompany) {
      return companyState.currentCompany;
    }

    return null;
  });

  // Color mode values — all hooks MUST be called before any conditional returns
  const alertBg = useColorModeValue('orange.50', 'orange.900');
  const alertBorder = useColorModeValue('orange.200', 'orange.700');
  const progressBg = useColorModeValue('orange.100', 'orange.800');

  if (!company) return null;

  // Check if company has active (paid) subscription
  const hasActiveSubscription =
    company.has_subscription === true ||
    (company.subscription &&
      company.subscription.status === 'active') ||
    (company.subscription_plan && company.subscription_plan.id);

  // Don't show banner if user has active paid subscription
  if (hasActiveSubscription) return null;

  // Only a REAL trial gets a countdown.
  //
  // 2026-08-13: this used to fall back to `company.created_at + 14 days` whenever a company had
  // no trialing subscription — inventing "Your trial expires in N days" for a company that has
  // no trial at all. Starter is now free forever, so nothing self-serve is ever `trialing`, and
  // that fallback could only ever have shown a countdown to an event that will not happen. The
  // banner now renders solely from a subscription that genuinely is trialing with a real
  // `trial_end`, which keeps it correct if a future paid plan reintroduces a trial.
  const trialEndRaw =
    company.subscription && company.subscription.status === 'trialing'
      ? company.subscription.trial_end
      : null;
  if (!trialEndRaw) return null;

  const trialEnd = new Date(trialEndRaw);
  if (Number.isNaN(trialEnd.getTime())) return null;

  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
  );

  const totalTrialDays = 14;
  const trialProgress = Math.min(100, ((totalTrialDays - daysRemaining) / totalTrialDays) * 100);

  const isTrialExpired = daysRemaining === 0;
  const isTrialExpiringSoon = daysRemaining <= 3;

  // If only showing when expiring soon and trial is not expiring soon, don't show
  if (showOnlyWhenTrialExpiringSoon && !isTrialExpiringSoon && !isTrialExpired) {
    return null;
  }

  const handleUpgradeClick = () => {
    navigate('/admin/dashboard/pricing');
  };

  if (isTrialExpired) {
    return (
      <Alert
        status="error"
        bg={alertBg}
        border="1px"
        borderColor={alertBorder}
        borderRadius="xl"
        mb={4}
      >
        <AlertIcon />
        <Box flex="1">
          <AlertTitle fontSize="sm" fontWeight="600">
            {intl.formatMessage({ id: 'app.trialExpired' })}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            {intl.formatMessage({ id: 'app.trialExpiredDescription' })}
          </AlertDescription>
        </Box>
        <Button size="sm" colorScheme="red" onClick={handleUpgradeClick}>
          {intl.formatMessage({ id: 'app.upgradeNow' })}
        </Button>
      </Alert>
    );
  }

  return (
    <Alert
      status="warning"
      bg={alertBg}
      border="1px"
      borderColor={alertBorder}
      borderRadius="xl"
      mb={4}
    >
      <AlertIcon />
      <Box flex="1">
        <Flex justify="space-between" align="center" mb={2}>
          <AlertTitle fontSize="sm" fontWeight="600">
            {intl.formatMessage({ id: 'app.freeTrialActive' })}
          </AlertTitle>
          <Text fontSize="xs" fontWeight="500" color="orange.600">
            {intl.formatMessage({ id: 'app.trialDaysRemaining' }, { days: daysRemaining })}
          </Text>
        </Flex>

        <AlertDescription fontSize="sm" mb={3}>
          {isTrialExpiringSoon
            ? intl.formatMessage(
                { id: 'app.trialExpiringSoonMessage' },
                { days: daysRemaining }
              )
            : intl.formatMessage({ id: 'app.trialExploringMessage' })}
        </AlertDescription>

        <Progress
          value={trialProgress}
          size="sm"
          colorScheme="orange"
          bg={progressBg}
          borderRadius="md"
          mb={3}
        />

        <HStack spacing={2}>
          <Button size="sm" colorScheme="green" onClick={handleUpgradeClick}>
            {isTrialExpiringSoon
              ? intl.formatMessage({ id: 'app.upgradeNow' })
              : intl.formatMessage({ id: 'app.viewPricing' })}
          </Button>
          <Button
            size="sm"
            variant="outline"
            colorScheme="blue"
            onClick={() => {
              resetAllTours();
            }}
          >
            {intl.formatMessage({ id: 'app.setupGuide' })}
          </Button>
          <Text fontSize="xs" color="gray.500" alignSelf="center">
            {intl.formatMessage({ id: 'app.noCreditCardForTrial' })}
          </Text>
        </HStack>
      </Box>
    </Alert>
  );
};

export default TrialStatusBanner;
