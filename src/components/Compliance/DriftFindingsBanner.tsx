/**
 * DriftFindingsBanner — Sprint 5.1 (OSP ↔ events drift detector).
 *
 * Farmer-facing warning surface that summarizes drift findings for the
 * current production cycle. Renders only when one or more events on the
 * timeline carry a `drift_warning` payload (stamped by the backend
 * post_save signal in certifications/services/drift_detector.py).
 *
 * The intent is a single, collapsible, yellow banner at the top of the
 * production page — NOT per-event badges on the consumer-facing timeline
 * cards, which would leak compliance noise to QR-code viewers.
 *
 * Props:
 *   events: array of any shape that may include { id, date, drift_warning }.
 *   cfrReference: overrides the displayed CFR cite (default: 7 CFR 205.400(f)(1)).
 */

import React, { useMemo, useState } from 'react';
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Collapse,
  HStack,
  Icon,
  Link,
  Stack,
  Text,
  useColorModeValue,
  VStack
} from '@chakra-ui/react';
import { FaExclamationTriangle, FaExternalLinkAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import type { DriftWarning } from 'types/standardizedEvents';

interface EventLike {
  id?: string | number;
  date?: string;
  type?: string;
  event_type?: string | number;
  drift_warning?: DriftWarning | null;
}

interface DriftFindingsBannerProps {
  events: EventLike[] | null | undefined;
}

const RESOLUTION_LABEL_KEY: Record<DriftWarning['resolved_via'], string> = {
  omri: 'drift.resolution.omri',
  national_list: 'drift.resolution.national_list',
  wsda: 'drift.resolution.wsda',
  unresolved: 'drift.resolution.unresolved',
  // Phase 2 — seed source findings (§ 205.204 / NOP 5029).
  seed_certification_missing: 'drift.resolution.seed_certification_missing',
  seed_search_incomplete: 'drift.resolution.seed_search_incomplete',
  seed_treated_prohibited: 'drift.resolution.seed_treated_prohibited'
};

const RESOLUTION_COLOR_SCHEME: Record<DriftWarning['resolved_via'], string> = {
  omri: 'yellow',
  wsda: 'yellow',
  national_list: 'yellow',
  unresolved: 'red',
  seed_certification_missing: 'orange',
  seed_search_incomplete: 'orange',
  seed_treated_prohibited: 'red'
};

const DriftFindingsBanner: React.FC<DriftFindingsBannerProps> = ({ events }) => {
  const intl = useIntl();
  const [open, setOpen] = useState(false);

  // Use Chakra `yellow.*` tokens — matches the existing compliance-warning
  // palette already used by the audit export "warning" style on the backend.
  const bg = useColorModeValue('yellow.50', 'yellow.900');
  const border = useColorModeValue('yellow.400', 'yellow.600');
  const headerFg = useColorModeValue('yellow.800', 'yellow.100');
  const bodyFg = useColorModeValue('gray.700', 'gray.200');
  const detailBg = useColorModeValue('white', 'gray.800');
  const labelFg = useColorModeValue('gray.500', 'gray.400');
  const reasonFg = useColorModeValue('gray.600', 'gray.300');

  const findings = useMemo(() => {
    if (!Array.isArray(events)) return [] as EventLike[];
    return events.filter((e) => e && e.drift_warning);
  }, [events]);

  if (findings.length === 0) return null;

  const count = findings.length;

  return (
    <Box
      bg={bg}
      borderTopWidth="1px"
      borderRightWidth="1px"
      borderBottomWidth="1px"
      borderLeftWidth="4px"
      borderColor={border}
      borderRadius={{ base: 'xl', md: '2xl' }}
      boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      p={{ base: 3, md: 4 }}
      mb={{ base: 4, md: 6 }}
      w="full"
    >
      <HStack align="start" justify="space-between" spacing={3} flexWrap="wrap">
        <HStack align="start" spacing={3} flex={1} minW={0}>
          <Icon as={FaExclamationTriangle} color={border} mt={1} boxSize={5} />
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <Text fontWeight="bold" fontSize="sm" color={headerFg}>
              {intl.formatMessage({ id: 'drift.banner.title' }, { count })}
            </Text>
            <Text fontSize="xs" color={bodyFg}>
              {intl.formatMessage({ id: 'drift.banner.body' })}
            </Text>
          </VStack>
        </HStack>
        <Button size="sm" variant="outline" colorScheme="yellow" onClick={() => setOpen((v) => !v)}>
          {intl.formatMessage({
            id: open ? 'drift.banner.hide' : 'drift.banner.show'
          })}
        </Button>
      </HStack>

      <Collapse in={open} animateOpacity>
        <VStack align="stretch" spacing={2} mt={4}>
          {findings.map((event, idx) => {
            const dw = event.drift_warning as DriftWarning;
            const resolutionKey = RESOLUTION_LABEL_KEY[dw.resolved_via];
            return (
              <Box
                key={event.id ?? idx}
                p={3}
                bg={detailBg}
                borderWidth="1px"
                borderColor={border}
                borderRadius="md"
              >
                <Stack direction={{ base: 'column', md: 'row' }} spacing={3} align="start">
                  <VStack align="start" spacing={0} minW="120px">
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.date' })}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold">
                      {event.date ? event.date.slice(0, 10) : '—'}
                    </Text>
                  </VStack>
                  <VStack align="start" spacing={0} flex={1} minW={0}>
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.input' })}
                    </Text>
                    <Text fontSize="sm" fontWeight="semibold" noOfLines={2}>
                      {dw.input_label || '—'}
                    </Text>
                    <Text fontSize="xs" color={reasonFg} noOfLines={3} mt={1}>
                      {dw.reason}
                    </Text>
                  </VStack>
                  <VStack align="start" spacing={1}>
                    <Text fontSize="xs" color={labelFg}>
                      {intl.formatMessage({ id: 'drift.detail.resolution' })}
                    </Text>
                    <Badge
                      colorScheme={RESOLUTION_COLOR_SCHEME[dw.resolved_via] ?? 'red'}
                      fontSize="11px"
                    >
                      {resolutionKey ? intl.formatMessage({ id: resolutionKey }) : dw.resolved_via}
                    </Badge>
                    {/* CA-only: CDFA OIM registration sub-finding. */}
                    {dw.cdfa_oim_status && dw.cdfa_oim_status.status === 'missing' && (
                      <Badge colorScheme="red" fontSize="11px">
                        {intl.formatMessage({ id: 'drift.resolution.cdfa_oim_missing' })}
                      </Badge>
                    )}
                    {dw.cdfa_oim_status && dw.cdfa_oim_status.status === 'registered' && (
                      <Badge colorScheme="green" fontSize="11px">
                        {intl.formatMessage(
                          { id: 'drift.resolution.cdfa_oim_registered' },
                          { reg: dw.cdfa_oim_status.cdfa_oim_reg_number || '—' }
                        )}
                      </Badge>
                    )}
                    {/* CA-only: DPR Restricted Materials Permit sub-finding. */}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'missing' && (
                      <Badge colorScheme="red" fontSize="11px">
                        {intl.formatMessage({ id: 'drift.resolution.ca_dpr_missing' })}
                      </Badge>
                    )}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'expired' && (
                      <Badge colorScheme="red" fontSize="11px">
                        {intl.formatMessage(
                          { id: 'drift.resolution.ca_dpr_expired' },
                          {
                            num: dw.ca_dpr_permit_status.permit_number || '—',
                            expires: dw.ca_dpr_permit_status.expires || '—'
                          }
                        )}
                      </Badge>
                    )}
                    {dw.ca_dpr_permit_status && dw.ca_dpr_permit_status.status === 'present' && (
                      <Badge colorScheme="green" fontSize="11px">
                        {intl.formatMessage(
                          { id: 'drift.resolution.ca_dpr_present' },
                          {
                            num: dw.ca_dpr_permit_status.permit_number || '—',
                            county: dw.ca_dpr_permit_status.county || '—'
                          }
                        )}
                      </Badge>
                    )}
                    {/* External catalog deep-link. OMRI for commercial
                        inputs, AOSCA Organic Seed Finder for seed findings. */}
                    {dw.omri_search_url && (
                      <Link
                        href={dw.omri_search_url}
                        isExternal
                        fontSize="xs"
                        color="blue.600"
                        mt={1}
                        display="inline-flex"
                        alignItems="center"
                        gap={1}
                      >
                        {intl.formatMessage({
                          id: dw.resolved_via.startsWith('seed_')
                            ? 'drift.detail.searchAosca'
                            : 'drift.detail.searchOmri'
                        })}
                        <Icon as={FaExternalLinkAlt} boxSize={2.5} />
                      </Link>
                    )}
                  </VStack>
                </Stack>
              </Box>
            );
          })}
          <Alert status="info" fontSize="xs" borderRadius="md">
            <AlertIcon />
            <Text>
              {intl.formatMessage({
                id: 'drift.banner.nextStep'
              })}
            </Text>
          </Alert>
        </VStack>
      </Collapse>
    </Box>
  );
};

export default DriftFindingsBanner;
