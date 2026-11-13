/**
 * The farm-profile card that opens the Washington spray record export.
 *
 * Washington only: WAC 16-228-1320 binds pesticide applications in Washington, and the backend
 * answers 404 for any other farm. Same gate style as the CA PUR card (the farm's own state,
 * normalised, never a default). The plan gate is the ComplianceExportsGuard the farm profile
 * wraps around its export group, exactly as for the PUR card.
 */
import React from 'react';
import { HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { FaFileAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { normalizeState } from 'utils/usStates';

/** True when the farm's state resolves to Washington ("WA" or "Washington"). */
export const isWashingtonFarm = (state?: string | null): boolean => normalizeState(state) === 'WA';

interface Props {
  farmState?: string | null;
  onOpen: () => void;
}

const WASprayExportCard: React.FC<Props> = ({ farmState, onOpen }) => {
  const intl = useIntl();
  if (!isWashingtonFarm(farmState)) return null;
  return (
    <StandardCard
      title={intl.formatMessage({ id: 'app.pur.complianceReports' })}
      variant="elevated"
      padding={{ base: 0, md: 4 }}
      mb={0}>
      <HStack
        justify="space-between"
        align={{ base: 'flex-start', smd: 'center' }}
        flexDirection={{ base: 'column', smd: 'row' }}
        gap={3}>
        <VStack align="flex-start" gap={0.5}>
          <Text fontSize="sm" fontWeight="semibold" color="gray.800">
            {intl.formatMessage({ id: 'app.waSpray.cardTitle' })}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'app.waSpray.cardSubtitle' })}
          </Text>
        </VStack>
        <StandardButton
          variant="outline"
          size="sm"
          leftIcon={<Icon as={FaFileAlt} />}
          onClick={onOpen}
          w={{ base: 'full', smd: 'auto' }}>
          {intl.formatMessage({ id: 'app.waSpray.generate' })}
        </StandardButton>
      </HStack>
    </StandardCard>
  );
};

export default WASprayExportCard;
