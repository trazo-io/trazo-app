/**
 * Parcel page: the Parcel Application, as what is left to answer (2026-11-06).
 *
 * Until now the application was a solid green button in the page header whose label concatenated
 * its own status ("Parcel Application · In progress (1)"), with the missing items in a hover-only
 * tooltip no phone can open. This card states the status once and names each missing block of the
 * certifier's parcel form as a row, the same shape as the farm home's readiness card.
 *
 * Statuses keep their meanings: in progress = warning (work owed on a form), answers complete =
 * green tint, and evidence still outstanding is neutral and always shown WITH the answers half
 * (RetrieveParcelSerializer: never render one half without the other).
 */
import React from 'react';
import {
  Badge,
  Flex,
  Heading,
  HStack,
  Icon,
  Link,
  Text,
  VStack,
  useColorModeValue
} from '@chakra-ui/react';
import { FaClipboardCheck, FaExclamation } from 'react-icons/fa';
import { Link as RouterLink } from 'react-router-dom';
import { useIntl } from 'react-intl';

import Card from 'components/Card/Card';
import CardBody from 'components/Card/CardBody';
import { StatusList, StatusRow, TOUCH_TARGET } from 'components/Design/StandardComponents';

interface Props {
  farmId: string | number;
  parcelId: string | number;
  status?: string | null;
  missing?: string[] | null;
  evidenceStatus?: string | null;
  evidenceMissing?: unknown[] | null;
}

export default function ParcelApplicationCard({
  farmId,
  parcelId,
  status,
  missing,
  evidenceStatus,
  evidenceMissing
}: Props) {
  const intl = useIntl();
  const titleColor = useColorModeValue('gray.700', 'gray.200');
  const iconColor = useColorModeValue('gray.600', 'gray.400');
  const muted = useColorModeValue('gray.600', 'gray.400');
  const to = `/admin/dashboard/farm/${farmId}/parcel/${parcelId}/application`;
  const open = missing ?? [];

  const badge =
    status === 'complete' ? (
      <Badge variant="subtle" colorScheme="green" fontSize="11px">
        {intl.formatMessage({ id: 'parcel.card.appAnswersComplete' })}
      </Badge>
    ) : status === 'in_progress' ? (
      <Badge variant="warning" fontSize="11px">
        {intl.formatMessage({ id: 'parcelApp.status.in_progress' })}
      </Badge>
    ) : status === 'not_started' ? (
      <Badge variant="neutral" fontSize="11px">
        {intl.formatMessage({ id: 'parcelApp.status.not_started' })}
      </Badge>
    ) : null;

  return (
    <Card h="100%">
      <CardBody>
        <VStack align="stretch" spacing={2} w="100%" data-testid="parcel-application-card">
          <Flex justify="space-between" align="flex-start" gap={3}>
            <HStack spacing={3} align="start" minW={0}>
              <Icon as={FaClipboardCheck} color={iconColor} boxSize={5} mt={1} aria-hidden />
              <VStack align="start" spacing={0} minW={0}>
                <Heading as="h3" size="sm" fontWeight="600" color={titleColor}>
                  {intl.formatMessage({ id: 'parcelPage.application.title' })}
                </Heading>
                <Text fontSize="xs" color={muted}>
                  {intl.formatMessage({ id: 'parcelPage.application.subtitle' })}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={2} flexShrink={0} flexWrap="wrap" justify="flex-end">
              {badge}
              {status === 'complete' && evidenceStatus === 'outstanding' && (
                <Badge variant="neutral" fontSize="11px">
                  {intl.formatMessage(
                    { id: 'parcel.card.evidenceOutstanding' },
                    { count: (evidenceMissing ?? []).length || 1 }
                  )}
                </Badge>
              )}
            </HStack>
          </Flex>

          {open.length > 0 ? (
            <StatusList testId="parcel-application-missing">
              {open.map((key) => (
                <StatusRow
                  key={key}
                  tone="warn"
                  icon={FaExclamation}
                  title={intl.formatMessage({ id: `parcelApp.missing.${key}` })}
                />
              ))}
            </StatusList>
          ) : (
            <Text fontSize="sm" color={muted} py={2}>
              {intl.formatMessage({
                id:
                  status === 'complete'
                    ? 'parcelPage.application.allAnswered'
                    : 'parcelPage.application.noneListed'
              })}
            </Text>
          )}

          <Link
            as={RouterLink}
            to={to}
            alignSelf="flex-start"
            fontSize="sm"
            fontWeight="semibold"
            color="green.700"
            sx={{ '@media (hover: hover)': { '&:hover': { textDecoration: 'underline' } } }}
            {...TOUCH_TARGET}>
            {intl.formatMessage({
              id:
                status === 'not_started'
                  ? 'parcelPage.application.start'
                  : 'parcelPage.application.open'
            })}{' '}
            <span aria-hidden="true">→</span>
          </Link>
        </VStack>
      </CardBody>
    </Card>
  );
}
