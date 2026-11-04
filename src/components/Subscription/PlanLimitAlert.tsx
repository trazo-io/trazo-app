import React from 'react';
import { Text } from '@chakra-ui/react';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { StandardButton, StandardNotice } from 'components/Design/StandardComponents';

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
 *
 * Still reachable on parcels and productions although every current plan is unlimited there:
 * the retired basic/standard/corporate ladder is live as CONTRACTS (CLAUDE.md), and those carry
 * finite limits. Do not delete it as dead on the strength of the current price list.
 *
 * Rendered as a `StandardNotice` (2026-11-04): the page-level notice style, white surface, the
 * status in the icon and the words, the way out on the right. It was a stock amber Alert, the
 * tinted-slab look retired from the production page.
 */
export const PlanLimitAlert: React.FC<PlanLimitAlertProps> = ({ limit, descriptionId }) => {
  const intl = useIntl();
  const navigate = useNavigate();

  return (
    <StandardNotice
      status="warning"
      title={intl.formatMessage({ id: 'limits.planLimitReachedTitle' })}
      data-testid="plan-limit-notice"
      action={
        // The way out IS the notice's condition ("you hit the limit -> here is the way out"),
        // and the form below keeps its own submit, so the button belongs here.
        <StandardButton
          variant="primary"
          size="sm"
          onClick={() => navigate('/admin/dashboard/pricing')}>
          {intl.formatMessage({ id: 'app.upgradePlan' })}
        </StandardButton>
      }>
      <Text fontSize="sm" color="gray.700">
        {intl.formatMessage({ id: descriptionId }, { limit })}
      </Text>
    </StandardNotice>
  );
};

export default PlanLimitAlert;
