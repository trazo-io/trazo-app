import React from 'react';
import { Alert, AlertDescription, AlertIcon, AlertTitle, Box, Stack } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { StandardButton } from 'components/Design/StandardComponents';

interface PlanLimitAlertProps {
  /** Plan limit for the resource (already resolved from effective_limits/features) */
  limit: number;
  /** intl message id for the description; receives {limit} as a value */
  descriptionId: string;
}

/**
 * Pre-flight warning shown at the top of add-forms when the current usage has
 * reached the subscription plan's limit. Purely informational — the form stays
 * usable and the backend remains the enforcer.
 */
export const PlanLimitAlert: React.FC<PlanLimitAlertProps> = ({ limit, descriptionId }) => {
  const intl = useIntl();
  const navigate = useNavigate();

  return (
    <Alert status="warning" mb={6}>
      <AlertIcon />
      <Stack
        direction={{ base: 'column', smd: 'row' }}
        spacing={3}
        flex="1"
        align={{ base: 'flex-start', smd: 'center' }}>
        <Box flex="1">
          <AlertTitle fontSize="sm">
            {intl.formatMessage({ id: 'limits.planLimitReachedTitle' })}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            {intl.formatMessage({ id: descriptionId }, { limit })}
          </AlertDescription>
        </Box>
        {/* The CTA stays inside this alert on purpose: it IS the alert's condition ("you hit
            the limit -> here is the way out"), it sits inline beside the text rather than
            acting as the page's action bar, and the form below keeps its own submit. That is
            the difference from a notice that holds a page's only actions. */}
        <StandardButton
          variant="primary"
          size="sm"
          flexShrink={0}
          onClick={() => navigate('/admin/dashboard/pricing')}>
          {intl.formatMessage({ id: 'app.upgradePlan' })}
        </StandardButton>
      </Stack>
    </Alert>
  );
};

export default PlanLimitAlert;
