/**
 * DEMOTED TO READ-ONLY LEGACY SUMMARY — 2026-08-10.
 *
 * This component used to be a full editor for the LEGACY single-sale columns
 * stored directly on History (sold_to, sale_date, quantity_sold, ...) via
 * PATCH productions/{id}/. That left TWO farmer-facing editors over one
 * fact-set: this aggregate form plus the itemized SalesRecordsSection
 * (POST sales_records/). In the certifier audit export, SalesRecord rows WIN;
 * the legacy History columns are only used as fallback when a production has
 * zero SalesRecord rows (see trazo-back audit_export_service).
 *
 * SalesRecordsSection is now THE sales editor. This component:
 *   - renders nothing when the production has no legacy single-sale data;
 *   - otherwise shows a compact READ-ONLY summary of the legacy record
 *     (pre-merge productions). The data must stay visible — it still feeds
 *     audit exports as fallback — and is never deleted.
 */
import React from 'react';
import { Box, HStack, Text, SimpleGrid, Badge, Icon, useColorModeValue } from '@chakra-ui/react';
import { FaCheckCircle, FaTruck } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { StandardCard } from 'components/Design/StandardComponents';

interface SalesDeliverySectionProps {
  historyData: {
    finish_date?: string;
    sold_to?: string;
    sale_date?: string;
    quantity_sold?: number;
    quantity_sold_unit?: string;
    box_weight_lb?: number | null;
    organic_on_invoice?: boolean;
    transport_method?: string;
    destination?: string;
    transport_vehicle_id?: string;
    transport_affidavit_on_file?: boolean;
    retention_until?: string;
  };
}

// Units where per-box weight is meaningful for NOP § 205.103(b)(2) mass-balance
// reconciliation; controls whether the stored box_weight_lb is displayed.
const BOX_UNITS = new Set(['boxes', 'crates', 'cartons', 'lugs']);

const formatDisplayDate = (value?: string): string => {
  if (!value) return '';
  return value.slice(0, 10);
};

export function SalesDeliverySection({ historyData }: SalesDeliverySectionProps) {
  const intl = useIntl();

  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const iconColor = useColorModeValue(
    'var(--chakra-colors-gray-500)',
    'var(--chakra-colors-gray-300)'
  );
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const footnoteFg = useColorModeValue('gray.500', 'gray.400');

  // Legacy single-sale data exists when ANY legacy column carries a value.
  // Booleans only count when true — false is indistinguishable from "never set".
  const hasLegacySalesData =
    Boolean(historyData.sold_to) ||
    Boolean(historyData.sale_date) ||
    (historyData.quantity_sold !== undefined && historyData.quantity_sold !== null) ||
    Boolean(historyData.quantity_sold_unit) ||
    (historyData.box_weight_lb !== undefined && historyData.box_weight_lb !== null) ||
    Boolean(historyData.transport_method) ||
    Boolean(historyData.destination) ||
    Boolean(historyData.transport_vehicle_id) ||
    historyData.organic_on_invoice === true ||
    historyData.transport_affidavit_on_file === true;

  if (!historyData.finish_date || !hasLegacySalesData) return null;

  return (
    <StandardCard variant="elevated" padding={{ base: 0, md: 4 }} title="">
      <HStack spacing={2} align="flex-start" mb={3}>
        <Box p={2} borderRadius="lg" bg={iconBg}>
          <FaTruck color={iconColor} />
        </Box>
        <Box>
          <HStack spacing={2} flexWrap="wrap">
            <Text fontWeight="bold" fontSize={{ base: 'sm', md: 'md' }}>
              {intl.formatMessage({
                id: 'sales.legacy.title',
                defaultMessage: 'Legacy Single-Sale Record'
              })}
            </Text>
            <Badge colorScheme="gray" fontSize="11px">
              {intl.formatMessage({
                id: 'sales.legacy.badge',
                defaultMessage: 'Read-only'
              })}
            </Badge>
          </HStack>
          <Text fontSize="xs" color={labelFg}>
            {intl.formatMessage({
              id: 'sales.legacy.note',
              defaultMessage:
                'Kept for audit exports. Record new sales in the itemized Buyer Sales Records above.'
            })}
          </Text>
        </Box>
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={2}>
        {historyData.sold_to && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.display.buyer' })}
            </Text>
            <Text fontSize="sm">{historyData.sold_to}</Text>
          </Box>
        )}
        {historyData.sale_date && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.display.saleDate' })}
            </Text>
            <Text fontSize="sm">{formatDisplayDate(historyData.sale_date)}</Text>
          </Box>
        )}
        {historyData.quantity_sold !== undefined && historyData.quantity_sold !== null && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.display.quantity' })}
            </Text>
            <Text fontSize="sm">
              {historyData.quantity_sold} {historyData.quantity_sold_unit}
              {historyData.box_weight_lb &&
                historyData.quantity_sold_unit &&
                BOX_UNITS.has(historyData.quantity_sold_unit) && (
                  <Text as="span" fontSize="xs" color={labelFg} ml={1}>
                    ({historyData.box_weight_lb} lb each)
                  </Text>
                )}
            </Text>
          </Box>
        )}
        {historyData.transport_method && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.field.transport' })}
            </Text>
            <Text fontSize="sm">{historyData.transport_method}</Text>
          </Box>
        )}
        {historyData.destination && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({ id: 'sales.display.destination' })}
            </Text>
            <Text fontSize="sm">{historyData.destination}</Text>
          </Box>
        )}
        {historyData.transport_vehicle_id && (
          <Box>
            <Text fontSize="xs" color={labelFg} fontWeight="semibold">
              {intl.formatMessage({
                id: 'sales.field.transportVehicleId',
                defaultMessage: 'Vehicle / Container ID'
              })}
            </Text>
            <Text fontSize="sm">{historyData.transport_vehicle_id}</Text>
          </Box>
        )}
      </SimpleGrid>

      {(historyData.organic_on_invoice === true ||
        historyData.transport_affidavit_on_file === true) && (
        <Box mt={2}>
          {historyData.organic_on_invoice === true && (
            <HStack spacing={1.5}>
              <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
              <Text fontSize="xs">
                {intl.formatMessage({
                  id: 'sales.legacy.display.organicOnInvoice',
                  defaultMessage: 'Organic identified on invoice'
                })}
              </Text>
            </HStack>
          )}
          {historyData.transport_affidavit_on_file === true && (
            <HStack spacing={1.5}>
              <Icon as={FaCheckCircle} color="green.500" boxSize={3} />
              <Text fontSize="xs">
                {intl.formatMessage({
                  id: 'sales.field.transportAffidavitOnFile',
                  defaultMessage: 'Clean-transport affidavit on file'
                })}
              </Text>
            </HStack>
          )}
        </Box>
      )}

      {historyData.retention_until && (
        <Text fontSize="xs" color={footnoteFg} mt={2} textAlign="center">
          {intl.formatMessage(
            { id: 'sales.retention' },
            { date: formatDisplayDate(historyData.retention_until) }
          )}
        </Text>
      )}
    </StandardCard>
  );
}

export default SalesDeliverySection;
