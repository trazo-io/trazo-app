/**
 * Operation-wide audit export trigger. Downloads ONE combined NOP dossier across every parcel ×
 * production for the establishment (vs one PDF per production). Backend:
 * GET /companies/{companyId}/establishments/{farmId}/operation-audit-export/?certification=…
 */
import React, { useState } from 'react';
import { Box, HStack, Text, useToast } from '@chakra-ui/react';
import { FaFilePdf } from 'react-icons/fa';
import { useIntl } from 'react-intl';

import { StandardButton, StandardCard, StandardSelect } from 'components/Design/StandardComponents';
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
          msg = err?.error || err?.detail || msg;
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
