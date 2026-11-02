/**
 * Seedling suppliers on the plan's G3.0a: CCOF G3.0 A2, OTCO C3 3.1-2, WSDA 2121-B 1/1a.
 *
 * Each of those forms asks for the organic certificate of EACH supplier of purchased seedlings.
 * Until 2026-11 a certificate was a plan-level upload tied to no supplier, so nothing said whose it
 * was. This panel is the plan-layer view of the supplier register, read-only, with a link to the
 * one place a supplier and its copies are edited (the farm profile). Two editors would let one
 * supplier be described two ways.
 *
 * The rows and their states are the server's (`seedling-suppliers/`, the same rows G3.0a prints and
 * the packet ships copies for). Every state is worded as what the records hold, never as verified.
 */
import React from 'react';
import { Box, HStack, Icon, Skeleton, Text, useColorModeValue, VStack } from '@chakra-ui/react';
import { FaExclamationTriangle, FaSeedling } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';

import { StandardButton, STATUS_URGENCY_TOKENS } from 'components/Design/StandardComponents';
import { useGetSeedlingSuppliersQuery, type SeedlingSupplier } from 'store/api/supplierApi';

interface Props {
  companyId: string;
  farmId: string;
  ospId: number | string;
  /** Saves the wizard page before the link leaves it (answers autosave on page advance only). */
  onNavigateAway?: () => Promise<boolean> | boolean;
}

const statusLine = (
  intl: ReturnType<typeof useIntl>,
  row: SeedlingSupplier
): { text: string; review: boolean } => {
  const issued = row.certificate_issued_on ?? '';
  // Static ids, never an interpolated `osp.seedlingSuppliers.${status}`: the locale-parity test
  // cannot see an id built at runtime.
  switch (row.status) {
    case 'covering':
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.covering' }, { issued }),
        review: false
      };
    case 'stale':
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.stale' }, { issued }),
        review: true
      };
    case 'postdates_purchase':
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.postdates' }, { issued }),
        review: true
      };
    case 'not_certified':
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.notCertified' }),
        review: row.claims_certified
      };
    case 'none_on_file':
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.noneOnFile' }),
        review: row.claims_certified
      };
    default:
      return {
        text: intl.formatMessage({ id: 'osp.seedlingSuppliers.unresolved' }),
        review: row.claims_certified
      };
  }
};

const OSPSeedlingSuppliersPanel: React.FC<Props> = ({
  companyId,
  farmId,
  ospId,
  onNavigateAway
}) => {
  const intl = useIntl();
  const navigate = useNavigate();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  const scoped = Boolean(companyId && farmId && ospId);
  const { data, isLoading, isError, error } = useGetSeedlingSuppliersQuery(
    { companyId, farmId, ospId },
    { skip: !scoped }
  );

  const open = async (row: SeedlingSupplier) => {
    if (onNavigateAway && !(await onNavigateAway())) return;
    const query =
      row.supplier_id != null
        ? `supplier=${row.supplier_id}`
        : `supplierSpelling=${encodeURIComponent(row.name)}`;
    navigate(`/admin/dashboard/farm/${farmId}/profile?${query}`);
  };

  if (isLoading) return <Skeleton height="80px" borderRadius="md" />;

  // A failed fetch is not an absence: "no supplier recorded" here would be a claim about the
  // records produced by a network error.
  if (isError || !scoped) {
    const forbidden = (error as { status?: number } | undefined)?.status === 403;
    return (
      <Box p={3} bg={cardBg} borderRadius="md">
        <HStack spacing={2} align="flex-start" color={STATUS_URGENCY_TOKENS.warn.text}>
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">
            {intl.formatMessage({
              id: forbidden ? 'osp.seedlingSuppliers.forbidden' : 'osp.seedlingSuppliers.loadFailed'
            })}
          </Text>
        </HStack>
      </Box>
    );
  }

  const rows = data?.suppliers ?? [];
  if (!rows.length) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" data-testid="osp-seedling-suppliers-empty">
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.seedlingSuppliers.empty' })}
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {rows.map((row) => {
        const line = statusLine(intl, row);
        const who = [row.certifier, row.nop_operation_id && `NOP ID ${row.nop_operation_id}`]
          .filter(Boolean)
          .join(', ');
        return (
          <Box
            key={`${row.supplier_id ?? 'x'}-${row.name}`}
            p={3}
            bg={cardBg}
            borderRadius="md"
            data-testid="osp-seedling-supplier">
            <HStack spacing={2} align="flex-start">
              <Icon as={FaSeedling} color="green.700" mt="3px" />
              <VStack align="stretch" spacing={1} flex={1} minW={0}>
                <Text fontSize="sm" fontWeight="semibold">
                  {row.name}
                </Text>
                <Text fontSize="xs" color={subtext}>
                  {intl.formatMessage(
                    { id: 'osp.seedlingSuppliers.purchases' },
                    { count: row.purchases, latest: row.latest ?? '' }
                  )}
                  {who ? ` · ${who}` : ''}
                </Text>
                <Text
                  fontSize="xs"
                  color={line.review ? STATUS_URGENCY_TOKENS.warn.text : subtext}
                  data-testid="osp-seedling-supplier-status">
                  {line.text}
                </Text>
                {row.not_covered > 0 ? (
                  <Text fontSize="xs" color={STATUS_URGENCY_TOKENS.warn.text}>
                    {intl.formatMessage(
                      { id: 'osp.seedlingSuppliers.earlierNotCovered' },
                      { count: row.not_covered }
                    )}
                  </Text>
                ) : null}
                <Box>
                  <StandardButton
                    size="sm"
                    variant="ghost"
                    onClick={() => open(row)}
                    data-testid="osp-seedling-supplier-open">
                    {intl.formatMessage({
                      id:
                        row.supplier_id != null
                          ? 'osp.seedlingSuppliers.openSupplier'
                          : 'osp.seedlingSuppliers.addToRegister'
                    })}
                  </StandardButton>
                </Box>
              </VStack>
            </HStack>
          </Box>
        );
      })}
      <Text fontSize="xs" color={subtext}>
        {intl.formatMessage({ id: 'osp.seedlingSuppliers.ownRecords' })}
      </Text>
    </VStack>
  );
};

export default OSPSeedlingSuppliersPanel;
