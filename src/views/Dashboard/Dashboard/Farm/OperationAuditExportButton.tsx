/**
 * Operation-wide audit export trigger. Downloads ONE combined NOP dossier across every parcel ×
 * production for the establishment (vs one PDF per production). Backend:
 * GET /companies/{companyId}/establishments/{farmId}/operation-audit-export/?certification=…
 *
 * Readiness guard (2026-08-10): the backend deliberately never refuses this download — a
 * not-ready operation gets its PDF stamped with a red "[NON-COMPLIANT DOSSIER — DO NOT SUBMIT
 * TO CERTIFIER]" banner instead. Before this guard, nothing ON SCREEN said so: the certifier
 * LINK card checks readiness and disables its button, but this card streamed the stamped PDF
 * silently. Now the same readiness query paints a warning with the blocker titles first, and
 * the download stays available — the farmer may legitimately want the stamped draft to see
 * exactly what the certifier would.
 */
import React, { useState } from 'react';
import { Box, HStack, Icon, Text, useToast } from '@chakra-ui/react';
import { FaExclamationTriangle, FaFilePdf } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard, StandardSelect } from 'components/Design/StandardComponents';
import { useGetOperationReadinessQuery } from 'store/api/certifierLinkApi';
import { config } from 'config/environment';

interface Props {
  companyId?: string;
  farmId?: string;
}

const CERT_OPTIONS = ['organic', 'all', 'roc', 'globalgap'];

const OperationAuditExportButton: React.FC<Props> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const toast = useToast();
  const [certification, setCertification] = useState('organic');
  const [isLoading, setIsLoading] = useState(false);

  const { data: readiness } = useGetOperationReadinessQuery(
    { companyId: companyId || '', farmId: farmId || '' },
    { skip: !companyId || !farmId }
  );
  const blockers = readiness?.applicable ? readiness.blockers || [] : [];

  const handleDownload = async () => {
    if (!companyId || !farmId) return;
    setIsLoading(true);
    try {
      const url =
        `${config.API_BASE_URL}/companies/${companyId}/establishments/${farmId}/operation-audit-export/` +
        `?certification=${certification}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        let msg = intl.formatMessage({ id: 'app.exportFailed', defaultMessage: 'Export failed' });
        try {
          const err = await response.json();
          msg = err?.detail || err?.error || msg;
        } catch {
          /* non-JSON error body */
        }
        throw new Error(msg);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `trazo-operation-audit-${farmId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast({
        status: 'success',
        title: intl.formatMessage({
          id: 'operationAudit.success',
          defaultMessage: 'Operation audit dossier downloaded'
        })
      });
    } catch (error) {
      toast({
        status: 'error',
        title: intl.formatMessage({ id: 'app.exportFailed', defaultMessage: 'Export failed' }),
        description: error instanceof Error ? error.message : undefined
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Title and subtitle come from StandardCard's own props. They used to be hand-rolled as
    // a bold <Text fontSize="lg"> inside the body, which made this the one card on the farm
    // profile whose header did not match its neighbours.
    <StandardCard
      variant="elevated"
      padding={{ base: 3, md: 4 }}
      mb={0}
      title={intl.formatMessage({
        id: 'operationAudit.title',
        defaultMessage: 'Operation Audit Dossier'
      })}
      subtitle={intl.formatMessage({
        id: 'operationAudit.subtitle',
        defaultMessage:
          'One combined NOP records PDF across every parcel and production — for your annual inspection.'
      })}
    >
      {blockers.length > 0 && (
        <HStack
          align="flex-start"
          spacing={2}
          mb={3}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor="orange.200"
          bg="orange.50"
        >
          <Icon as={FaExclamationTriangle} color="orange.500" mt="2px" flexShrink={0} />
          <Box>
            <Text fontSize="sm" fontWeight="semibold" color="orange.800">
              {intl.formatMessage({
                id: 'operationAudit.notReadyTitle',
                defaultMessage: 'This dossier will be stamped "DO NOT SUBMIT"'
              })}
            </Text>
            <Text fontSize="sm" color="orange.800">
              {intl.formatMessage(
                {
                  id: 'operationAudit.notReadyDetail',
                  defaultMessage:
                    'Open items: {items}. You can still download it as a working draft — fix these before sending anything to your certifier.'
                },
                { items: blockers.map((b) => b.title).join(' · ') }
              )}
            </Text>
          </Box>
        </HStack>
      )}
      <HStack
        gap={3}
        align={{ base: 'stretch', smd: 'flex-end' }}
        flexDirection={{ base: 'column', smd: 'row' }}
      >
        <Box minW={{ smd: '200px' }} w={{ base: 'full', smd: 'auto' }}>
          <Text fontSize="sm" mb={1} color="gray.600">
            {intl.formatMessage({
              id: 'operationAudit.certification',
              defaultMessage: 'Certification filter'
            })}
          </Text>
          <StandardSelect
            value={certification}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCertification(e.target.value)}
            size="sm"
          >
            {CERT_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {intl.formatMessage({
                  id: `operationAudit.cert.${c}`,
                  defaultMessage: c.toUpperCase()
                })}
              </option>
            ))}
          </StandardSelect>
        </Box>
        <StandardButton
          size="sm"
          leftIcon={<FaFilePdf />}
          onClick={handleDownload}
          isLoading={isLoading}
          isDisabled={!companyId || !farmId}
          w={{ base: 'full', smd: 'auto' }}
          flexShrink={0}
        >
          {intl.formatMessage({
            id: 'operationAudit.download',
            defaultMessage: 'Download Operation Dossier'
          })}
        </StandardButton>
      </HStack>
    </StandardCard>
  );
};

export default OperationAuditExportButton;
