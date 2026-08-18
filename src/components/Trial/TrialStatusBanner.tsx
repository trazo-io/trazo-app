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

  // Color mode values — all hooks MUST be called before any conditional returns.
  //
  // The Alert's ground and its border used to be declared here as `orange.50`/`orange.200`.
  // Two defects in one line: they outranked the theme (style props beat theme styles), and
  // `.claude/rules/frontend.md` records that the theme defines `amber` and NOT `orange`, so
  // an `orange.*` token silently resolved to CHAKRA's orange — a foreign accent on the trial
  // banner. The ground and the accent bar now come from `theme/components/alert.js`; what is
  // left is the progress track, and that override is gone too: MEASURED, amber.900 reads
  // 3.60:1 on the theme's own gray.100 groove and only 3.23:1 on an amber one, so the
  // default track is both more consistent AND the higher contrast.

  if (!company) return null;

  // Check if company has active (paid) subscription
  const hasActiveSubscription =
    company.has_subscription === true ||
    (company.subscription && company.subscription.status === 'active') ||
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
      <Alert status="error" mb={4}>
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
    <Alert status="warning" mb={4}>
      <AlertIcon />
      <Box flex="1">
        <Flex justify="space-between" align="center" mb={2}>
          <AlertTitle fontSize="sm" fontWeight="600">
            {intl.formatMessage({ id: 'app.freeTrialActive' })}
          </AlertTitle>
          <Text fontSize="xs" fontWeight="500" color="gray.700">
            {intl.formatMessage({ id: 'app.trialDaysRemaining' }, { days: daysRemaining })}
          </Text>
        </Flex>

        <AlertDescription fontSize="sm" mb={3}>
          {isTrialExpiringSoon
            ? intl.formatMessage({ id: 'app.trialExpiringSoonMessage' }, { days: daysRemaining })
            : intl.formatMessage({ id: 'app.trialExploringMessage' })}
        </AlertDescription>

        <Progress value={trialProgress} size="sm" colorScheme="amber" borderRadius="md" mb={3} />

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
            }}>
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
