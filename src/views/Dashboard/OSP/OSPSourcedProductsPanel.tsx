/**
 * Suppliers of bought-in organic product on the plan's G6.5: CCOF G6.5 A1/A2, OTCO C12 12.2-4.
 *
 * The plan-layer view of the supplier register, read-only, with a link to its one editor on the farm
 * profile. Lists only suppliers with products entered as bought in; a seed supplier alone is G3.0a's.
 */
import React from 'react';
import { Box, HStack, Icon, Skeleton, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaTruck } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardButton, STATUS_URGENCY_TOKENS } from 'components/Design/StandardComponents';
import { useGetSuppliersQuery, type Supplier } from 'store/api/supplierApi';
import SourcingStateLine from './SourcingStateLine';

interface Props {
  companyId: string;
  farmId: string;
  onNavigateAway?: () => Promise<boolean> | boolean;
}

const OSPSourcedProductsPanel: React.FC<Props> = ({ companyId, farmId, onNavigateAway }) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId);
  const { data, isLoading, isError, error } = useGetSuppliersQuery(
    { companyId, farmId },
    { skip: !scoped }
  );

  const open = async (supplier?: Supplier) => {
    if (onNavigateAway && !(await onNavigateAway())) return;
    navigate(
      `/admin/dashboard/farm/${farmId}/profile${
        supplier ? `?supplier=${supplier.id}` : ''
      }#suppliers`
    );
  };

  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;

  // A failed fetch is not an absence: "no supplier recorded" would be a claim made by an error.
  if (isError || !scoped) {
    const forbidden = (error as { status?: number } | undefined)?.status === 403;
    return (
      <Box p={3} bg={cardBg} borderRadius="md">
        <HStack spacing={2} align="flex-start" color={STATUS_URGENCY_TOKENS.crit.text}>
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">
            {intl.formatMessage({
              id: forbidden ? 'osp.sourcing.forbidden' : 'osp.sourcing.loadFailed'
            })}
          </Text>
        </HStack>
      </Box>
    );
  }

  const suppliers = (data ?? []).filter((s) => !s.archived && (s.sourced_products ?? '').trim());
  if (!suppliers.length) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" data-testid="osp-sourcing-empty">
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.sourcing.empty' })}
        </Text>
        <StandardButton size="sm" variant="ghost" mt={1} onClick={() => open()}>
          {intl.formatMessage({ id: 'osp.sourcing.add' })}
        </StandardButton>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {suppliers.map((supplier) => (
        <Box
          key={supplier.id}
          p={3}
          bg={cardBg}
          borderRadius="md"
          data-testid="osp-sourcing-supplier">
          <HStack spacing={2} align="flex-start">
            <Icon as={FaTruck} color="green.700" mt="3px" />
            <VStack align="stretch" spacing={1} flex={1} minW={0}>
              <Text fontSize="sm" fontWeight="semibold">
                {supplier.name}
              </Text>
              <Text fontSize="xs" color={subtext}>
                {intl.formatMessage(
                  { id: 'osp.sourcing.products' },
                  {
                    products: supplier.sourced_products
                      .split('\n')
                      .map((p) => p.trim())
                      .filter(Boolean)
                      .join('; ')
                  }
                )}
              </Text>
              {supplier.organic_status === 'not_certified' && supplier.source_operation ? (
                <Text fontSize="xs" color={subtext}>
                  {intl.formatMessage(
                    { id: 'osp.sourcing.sourceOperation' },
                    { name: supplier.source_operation }
                  )}
                </Text>
              ) : null}
              <SourcingStateLine supplier={supplier} />
              <Box>
                <StandardButton size="sm" variant="ghost" onClick={() => open(supplier)}>
                  {intl.formatMessage({ id: 'osp.sourcing.open' })}
                </StandardButton>
              </Box>
            </VStack>
          </HStack>
        </Box>
      ))}
      <Text fontSize="xs" color={subtext}>
        {intl.formatMessage({ id: 'osp.sourcing.ownRecords' })}
      </Text>
    </VStack>
  );
};

export default OSPSourcedProductsPanel;
