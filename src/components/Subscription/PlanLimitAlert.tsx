import React from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Stack
} from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

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
    <Alert status="warning" borderRadius="lg" mb={6} alignItems="flex-start">
      <AlertIcon />
      <Stack
        direction={{ base: 'column', smd: 'row' }}
        spacing={3}
        flex="1"
        align={{ base: 'flex-start', smd: 'center' }}
      >
        <Box flex="1">
          <AlertTitle fontSize="sm">
            {intl.formatMessage({ id: 'limits.planLimitReachedTitle' })}
          </AlertTitle>
          <AlertDescription fontSize="sm">
            {intl.formatMessage({ id: descriptionId }, { limit })}
          </AlertDescription>
        </Box>
        <Button
          colorScheme="green"
          size="sm"
          minH="44px"
          flexShrink={0}
          onClick={() => navigate('/admin/dashboard/pricing')}
        >
          {intl.formatMessage({ id: 'app.upgradePlan' })}
        </Button>
      </Stack>
    </Alert>
  );
};

export default PlanLimitAlert;
