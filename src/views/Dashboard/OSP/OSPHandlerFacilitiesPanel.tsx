/**
 * Off-farm handlers and storage facilities — CCOF G6.1 §C, CCOF G6.2 §A, WSDA J13 / K1 / L1.
 *
 * 🔴 The largest blocker in the certifier conformance register (6 rows across both certifiers,
 * 2026-08-28). `PostHarvestFacility` already held every fact these forms ask for — name, address,
 * facility type, certifier, certificate number, effective and expiry dates — and no OSP module
 * read it. The plan answered "who handles or stores your crop" from free text while the structured
 * record lived in a separate download, so one pilot packet named the same handler two different
 * ways under one certificate number with nothing comparing them.
 *
 * ONE EDITOR PER FACT. Facilities are authored on the production page
 * (`PostHarvestHandlerSection`), which is where the operator says which handlers a given lot went
 * to. This panel is the PLAN-layer view of those same records: read-only, with a pointer to the
 * editor. A second editor here would let the same handler be described two ways again — the exact
 * defect this closes.
 *
 * `cert_is_current` is TRI-STATE and must render as three states, never two: true = current,
 * false = expired or older than 15 months, null = no effective date on file, which is an ASK and
 * neither a pass nor a failure.
 */

import React from 'react';
import {
  Badge,
  Box,
  HStack,
  Icon,
  Skeleton,
  Stack,
  Text,
  useColorModeValue,
  VStack
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaIndustry } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { useGetPostHarvestFacilitiesQuery } from 'store/api/postHarvestFacilityApi';
import { cropsLine } from 'views/Dashboard/Dashboard/Production/FacilityProductsEditor';

interface OSPHandlerFacilitiesPanelProps {
  companyId: string;
  farmId: string;
}

const OSPHandlerFacilitiesPanel: React.FC<OSPHandlerFacilitiesPanelProps> = ({
  companyId,
  farmId
}) => {
  const intl = useIntl();
  const cardBg = useColorModeValue('gray.50', 'gray.700');
  const subtext = useColorModeValue('gray.600', 'gray.300');
  // Skipped rather than fetched with `undefined` in the path — and a skipped query reports
  // `isLoading: false` with no data, which is why the not-loaded case is handled explicitly
  // below instead of falling through to the empty state.
  const scoped = Boolean(companyId && farmId);
  const {
    data: allFacilities,
    isLoading,
    isError
  } = useGetPostHarvestFacilitiesQuery({ companyId, farmId }, { skip: !scoped });
  // The operation's own facilities have their own panel (OSPOwnFacilitiesPanel): listed here they
  // would read "no organic certificate on file" for the farm's own cooler.
  const facilities = allFacilities?.filter((f) => !f.is_own);

  if (isLoading) {
    return <Skeleton height="80px" borderRadius="md" />;
  }

  // A FAILED FETCH IS NOT AN ABSENCE. Falling through to "no facility is recorded" would print a
  // claim about the operation's records produced by a network error — directly above an
  // attestation the operator can then answer. Say what actually happened.
  if (isError || !scoped) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md" borderWidth="1px" borderColor="red.500">
        <HStack spacing={2} align="flex-start" color="red.800">
          <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
          <Text fontSize="sm">{intl.formatMessage({ id: 'osp.handlers.loadFailed' })}</Text>
        </HStack>
      </Box>
    );
  }

  if (!facilities?.length) {
    return (
      <Box p={3} bg={cardBg} borderRadius="md">
        <Text fontSize="sm" color={subtext}>
          {intl.formatMessage({ id: 'osp.handlers.empty' })}
        </Text>
      </Box>
    );
  }

  return (
    <VStack align="stretch" spacing={2}>
      {facilities.map((facility) => {
        const where = [facility.address, facility.city, facility.state].filter(Boolean).join(', ');
        const hasCert = Boolean(facility.certification_number || facility.certifier_name);
        // Three states, never two.
        const certState = !hasCert
          ? 'missing'
          : facility.cert_is_current === true
          ? 'current'
          : facility.cert_is_current === false
          ? 'stale'
          : 'unknown';
        return (
          <Box key={facility.id} p={3} bg={cardBg} borderRadius="md">
            <HStack spacing={2} align="flex-start">
              <Icon as={FaIndustry} color="green.700" mt="3px" />
              <VStack align="stretch" spacing={1} flex={1} minW={0}>
                <HStack spacing={2} wrap="wrap">
                  <Text fontSize="sm" fontWeight="semibold">
                    {facility.name}
                  </Text>
                  <Badge colorScheme="gray" fontSize="11px">
                    {facility.facility_type_display}
                  </Badge>
                  {facility.role_display && (
                    <Badge colorScheme="gray" fontSize="11px">
                      {facility.role_display}
                    </Badge>
                  )}
                </HStack>
                {where && (
                  <Text fontSize="xs" color={subtext}>
                    {where}
                  </Text>
                )}
                {/* CCOF G6.1 C2 / G6.2 A2, OTCO C7 7.7-2: crops from the linked records, products
                    in the operation's words. Edited on the production page, the one editor. */}
                <Text
                  fontSize="xs"
                  color={subtext}
                  data-testid={`osp-facility-crops-${facility.id}`}>
                  {cropsLine(facility)
                    ? intl.formatMessage(
                        { id: 'handler.products.crops' },
                        { crops: cropsLine(facility) }
                      )
                    : intl.formatMessage({ id: 'handler.products.noCrops' })}
                </Text>
                {facility.products_detail?.trim() ? (
                  <Text fontSize="xs" color={subtext}>
                    {intl.formatMessage(
                      { id: 'handler.products.described' },
                      {
                        products: facility.products_detail
                          .split('\n')
                          .map((p) => p.trim())
                          .filter(Boolean)
                          .join('; ')
                      }
                    )}
                  </Text>
                ) : null}
                {certState === 'current' && (
                  <Text fontSize="xs" color="green.700">
                    {intl.formatMessage(
                      { id: 'osp.handlers.certCurrent' },
                      {
                        certifier: facility.certifier_name || '',
                        number: facility.certification_number || ''
                      }
                    )}
                  </Text>
                )}
                {certState !== 'current' && (
                  <HStack spacing={1} align="flex-start" color="red.800">
                    <Icon as={FaExclamationTriangle} boxSize={3} mt="3px" />
                    <Text fontSize="xs">
                      {/* Static ids, never `osp.handlers.cert.${certState}` — an interpolated
                          message id is invisible to the locale-parity test and surfaces as a
                          runtime "missing message" instead of a build failure. */}
                      {certState === 'missing'
                        ? intl.formatMessage({ id: 'osp.handlers.cert.missing' })
                        : certState === 'stale'
                        ? intl.formatMessage({ id: 'osp.handlers.cert.stale' })
                        : intl.formatMessage({ id: 'osp.handlers.cert.unknown' })}
                    </Text>
                  </HStack>
                )}
              </VStack>
            </HStack>
          </Box>
        );
      })}
      <Stack>
        <Text fontSize="xs" color={subtext}>
          {intl.formatMessage({ id: 'osp.handlers.editedElsewhere' })}
        </Text>
      </Stack>
    </VStack>
  );
};

export default OSPHandlerFacilitiesPanel;
