/**
 * The paper trail of one activity record, read-only, on the record's own detail view.
 *
 * Two blocks, both from the pilot rehearsal of 2026-10:
 *
 * - CORRECTIONS. A correction on a closed season (EventAmendment) keeps the original value,
 *   the reason, who and when, and the certifier packet prints all of it. The record's detail
 *   view showed only the corrected value, so the person looking at the record could not see
 *   that it had been corrected at all. This block shows each correction the way paper does:
 *   the original stays legible beside the new value.
 * - DOCUMENTS. Files filed against this one record (the supplier invoice behind a spray).
 *   Downloads go through the authenticated download route, never a storage URL.
 *
 * Nothing here edits anything: corrections are made in CorrectRecordModal, uploads on the
 * Documents page.
 */
import React from 'react';
import { Box, Divider, HStack, Link, Stack, Text, VStack } from '@chakra-ui/react';
import { FaDownload } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { DOCUMENT_DOWNLOAD_URL } from 'config';
import { env } from 'config/environment';
import { useGetEventAmendmentsQuery } from 'store/api/amendmentsApi';
import { useGetFarmDocumentsQuery } from 'store/api/documentsApi';
import { documentSourceLabel } from 'utils/documentSource';

interface CorrectionsProps {
  eventId?: number;
  eventType?: number;
  /** The amendments read is limited to members who may correct (the server answers 403 to
   *  viewers), so the block is not requested for anyone else. */
  enabled: boolean;
  headingColor: string;
  cardBg: string;
}

export const EventCorrections: React.FC<CorrectionsProps> = ({
  eventId,
  eventType,
  enabled,
  headingColor,
  cardBg
}) => {
  const intl = useIntl();
  const skip = !enabled || eventId == null || eventType == null;
  const { data } = useGetEventAmendmentsQuery(
    { eventId: eventId as number, eventType: eventType as number },
    { skip }
  );
  const amendments = skip ? [] : data?.amendments ?? [];
  if (amendments.length === 0) return null;

  const empty = intl.formatMessage({ id: 'eventDetails.corrections.emptyValue' });
  const show = (value: string) => (value === '' || value == null ? empty : value);

  return (
    <>
      <Divider />
      <Box data-testid="event-corrections">
        <Text fontSize="lg" fontWeight="bold" mb={1} color={headingColor}>
          {intl.formatMessage({ id: 'eventDetails.corrections.title' })}
        </Text>
        <Text fontSize="sm" color="gray.600" mb={4}>
          {intl.formatMessage({ id: 'eventDetails.corrections.help' })}
        </Text>
        <VStack spacing={3} align="stretch">
          {amendments.map((a) => (
            <Box key={a.id} p={4} bg={cardBg} borderRadius="lg" data-testid="event-correction">
              <Text fontWeight="semibold" fontSize="sm" mb={2}>
                {a.field_label || a.field_name}
              </Text>
              <Stack direction={{ base: 'column', md: 'row' }} spacing={{ base: 1, md: 6 }}>
                <Text fontSize="sm">
                  <Text as="span" color="gray.600">
                    {intl.formatMessage({ id: 'eventDetails.corrections.original' })}{' '}
                  </Text>
                  <Text as="span" textDecoration="line-through">
                    {show(a.original_value)}
                  </Text>
                </Text>
                <Text fontSize="sm">
                  <Text as="span" color="gray.600">
                    {intl.formatMessage({ id: 'eventDetails.corrections.corrected' })}{' '}
                  </Text>
                  <Text as="span" fontWeight="medium">
                    {show(a.corrected_value)}
                  </Text>
                </Text>
              </Stack>
              <Text fontSize="sm" mt={2} whiteSpace="pre-wrap">
                <Text as="span" color="gray.600">
                  {intl.formatMessage({ id: 'eventDetails.corrections.reason' })}{' '}
                </Text>
                {a.reason}
              </Text>
              <Text fontSize="xs" color="gray.600" mt={2}>
                {intl.formatMessage(
                  { id: 'eventDetails.corrections.byOn' },
                  {
                    name:
                      a.amended_by ||
                      intl.formatMessage({ id: 'eventDetails.corrections.unknownAuthor' }),
                    date: intl.formatDate(a.created_at, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  }
                )}
              </Text>
            </Box>
          ))}
        </VStack>
      </Box>
    </>
  );
};

interface DocumentsProps {
  companyId?: string | number;
  farmId?: string;
  eventId?: number;
  eventType?: number;
  headingColor: string;
  cardBg: string;
}

export const EventDocuments: React.FC<DocumentsProps> = ({
  companyId,
  farmId,
  eventId,
  eventType,
  headingColor,
  cardBg
}) => {
  const intl = useIntl();
  const skip = !companyId || !farmId || eventId == null || eventType == null;
  const { data } = useGetFarmDocumentsQuery(
    {
      companyId: String(companyId ?? ''),
      farmId: farmId ?? '',
      eventType: eventType as number,
      eventId: eventId as number
    },
    { skip }
  );
  const documents = skip ? [] : data ?? [];
  if (documents.length === 0) return null;

  return (
    <>
      <Divider />
      <Box data-testid="event-documents">
        <Text fontSize="lg" fontWeight="bold" mb={4} color={headingColor}>
          {intl.formatMessage({ id: 'eventDetails.documents.title' })}
        </Text>
        <VStack spacing={2} align="stretch">
          {documents.map((doc) => (
            <HStack
              key={doc.id}
              p={3}
              bg={cardBg}
              borderRadius="lg"
              justify="space-between"
              spacing={3}>
              <Box minW={0}>
                <Text fontSize="sm" fontWeight="medium" wordBreak="break-word">
                  {doc.title}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {documentSourceLabel(doc, intl)} ·{' '}
                  {intl.formatDate(doc.created_at, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </Text>
              </Box>
              <Link
                href={env.getApiUrl(
                  DOCUMENT_DOWNLOAD_URL(String(companyId), farmId as string, doc.id)
                )}
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                minW="44px"
                minH="44px"
                color="green.700"
                aria-label={intl.formatMessage(
                  { id: 'eventDetails.documents.download' },
                  { title: doc.title }
                )}>
                <FaDownload />
              </Link>
            </HStack>
          ))}
        </VStack>
      </Box>
    </>
  );
};
