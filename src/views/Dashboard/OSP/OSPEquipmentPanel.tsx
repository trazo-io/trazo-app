/**
 * Equipment on the plan's G6.0 page F: CCOF G6.0 C2 and G6.1 B1, OTCO C9 9.1-1, WSDA 2121 I 1-2b.
 *
 * The plan-layer view of the equipment register, read-only, with a link to its one editor on the
 * farm profile. Two editors would let one item be described two ways. The link saves the wizard page
 * first: answers autosave on page advance only.
 */
import React from 'react';
import { Box, HStack, Icon, Skeleton, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaTractor } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardButton, STATUS_URGENCY_TOKENS } from 'components/Design/StandardComponents';
import {
  useGetProductionEquipmentQuery,
  type ProductionEquipment
} from 'store/api/productionEquipmentApi';
import EquipmentStateLine from './EquipmentStateLine';
import { OWNERSHIP_IDS, USE_IDS } from './equipmentLabels';

interface Props {
  companyId: string;
  farmId: string;
  onNavigateAway?: () => Promise<boolean> | boolean;
}

const OSPEquipmentPanel: React.FC<Props> = ({ companyId, farmId, onNavigateAway }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId);
  const { data, isLoading, isError, error } = useGetProductionEquipmentQuery(
    { companyId, farmId },
    { skip: !scoped }
  );

  const open = async (item?: ProductionEquipment) => {
    if (onNavigateAway && !(await onNavigateAway())) return;
    navigate(
      `/admin/dashboard/farm/${farmId}/profile${
        item ? `?equipment=${item.id}` : ''
      }#production-equipment`
    );
  };

  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;

  // A failed fetch is not an absence: "no equipment recorded" would be a claim made by an error.
  if (isError || !scoped) {
    const forbidden = (error as { status?: number } | undefined)?.status === 403;
    return (
      <Box p={3} bg={cardBg} borderRadius="md">
        <HStack spacing={2} align="flex-start" color={STATUS_URGENCY_TOKENS.crit.text}>
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">
            {forbidden
              ? intl.formatMessage({ id: 'osp.equipment.forbidden' })
              : intl.formatMessage({ id: 'osp.equipment.loadFailed' })}
          </Text>
        </HStack>
      </Box>
    );
  }

  const items = data ?? [];
  if (!items.length) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" data-testid="osp-equipment-empty">
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.equipment.empty' })}
        </Text>
        <StandardButton size="sm" variant="ghost" mt={1} onClick={() => open()}>
          {intl.formatMessage({ id: 'osp.equipment.add' })}
        </StandardButton>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {items.map((item) => (
        <Box key={item.id} p={3} bg={cardBg} borderRadius="md" data-testid="osp-equipment-item">
          <HStack spacing={2} align="flex-start">
            <Icon as={FaTractor} color="green.700" mt="3px" />
            <VStack align="stretch" spacing={1} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold">
                {item.name}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {[
                  intl.formatMessage({ id: USE_IDS[item.use] }),
                  item.dedicated_organic === true
                    ? intl.formatMessage({ id: 'equipment.dedicatedLine.yes' })
                    : item.dedicated_organic === false
                    ? intl.formatMessage({ id: 'equipment.dedicatedLine.no' })
                    : null,
                  item.ownership ? intl.formatMessage({ id: OWNERSHIP_IDS[item.ownership] }) : null
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <EquipmentStateLine item={item} />
              <Box>
                <StandardButton size="sm" variant="ghost" onClick={() => open(item)}>
                  {intl.formatMessage({ id: 'osp.equipment.open' })}
                </StandardButton>
              </Box>
            </VStack>
          </HStack>
        </Box>
      ))}
      <Text fontSize="xs" color={subtext}>
        {intl.formatMessage({ id: 'osp.equipment.ownRecords' })}
      </Text>
    </VStack>
  );
};

export default OSPEquipmentPanel;
