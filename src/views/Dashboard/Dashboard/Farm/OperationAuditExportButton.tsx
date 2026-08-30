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

import { StandardButton, StandardCard } from 'components/Design/StandardComponents';
import { useGetOperationReadinessQuery } from 'store/api/certifierLinkApi';
import { config } from 'config/environment';

interface Props {
  companyId?: string;
  farmId?: string;
}

/**
 * ⛔ THE STANDARD PICKER WAS REMOVED 2026-08-29. This export is USDA Organic, always.
 *
 * Measured, not assumed: every non-organic set was a strict SUBSET of `organic`, except that
 * `roc`, `scs` and `all` each added exactly one section — `carbon` — and `fsma204` added
 * `traceability`. `globalgap` added nothing at all. So the picker offered LESS information under
 * a brand Trazo cannot substantiate, plus the one section the organic export deliberately omits
 * ("USDA inspectors do not grade on environmental footprint, and including emissions data in an
 * audit PDF risks greenwashing-by-association claims").
 *
 * The brands did not survive research either: SCS-001 §2.5.1.2 requires a GFSI or USDA GAP
 * certification Trazo publicly says it does not do, §3.4.1.1 requires an SCS-approved carbon
 * calculator Trazo is not on, and SCS-001 is not in ANAB's accredited scope. FDA's own FAQ says
 * FSMA 204 has no Key Data Elements for the growing stage and the initial packer — not the
 * grower — assigns the lot code. The GlobalG.A.P. copy already conceded Trazo lacks its hygiene,
 * water-risk and worker-training data.
 *
 * The backend still accepts `certification_type` and the section sets are intact, so restoring a
 * standard is re-adding a control, not rebuilding a feature. Do not restore one without a named
 * grower asking for it.
 */
const CERTIFICATION = 'organic';

const OperationAuditExportButton: React.FC<Props> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const toast = useToast();
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
        `?certification=${CERTIFICATION}`;
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
      padding={{ base: 0, md: 4 }}
      mb={0}
      title={intl.formatMessage({
        id: 'operationAudit.title',
        defaultMessage: 'Operation Audit Dossier'
      })}
      subtitle={intl.formatMessage({
        id: 'operationAudit.subtitle',
        defaultMessage:
          'One combined NOP records PDF across every parcel and production — for your annual inspection.'
      })}>
      {blockers.length > 0 && (
        <HStack
          align="flex-start"
          spacing={2}
          mb={3}
          p={3}
          borderRadius="md"
          borderWidth="1px"
          borderColor="orange.200"
          bg="orange.50">
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
        flexDirection={{ base: 'column', smd: 'row' }}>
        <StandardButton
          size="sm"
          leftIcon={<FaFilePdf />}
          onClick={handleDownload}
          isLoading={isLoading}
          isDisabled={!companyId || !farmId}
          w={{ base: 'full', smd: 'auto' }}
          flexShrink={0}>
          {intl.formatMessage({
            id: 'operationAudit.download',
            defaultMessage: 'Download Operation Dossier'
          })}
        </StandardButton>
      </HStack>
      {/*
        What the chosen standard actually covers — and, for ROC and GlobalG.A.P., what it does
        NOT. The per-production modal has said this since 2026-08-22; this dropdown offered the
        same four standards as flat peers with no description at all, so choosing GlobalG.A.P.
        here produced a 9-section document where USDA Organic produces 27, with nothing on screen
        to say so. Same strings as the modal on purpose: two copies of one explanation is how
        they come to disagree.
      */}
      <Text fontSize="xs" color="gray.600" mt={3}>
        {intl.formatMessage({ id: 'app.exportInfoOrganic' })}
      </Text>
      {/* Which of the three certifier artifacts this is, so it is not mistaken for the others. */}
      <Text fontSize="xs" color="gray.600" mt={1}>
        {intl.formatMessage({ id: 'operationAudit.scopeNote' })}
      </Text>
    </StandardCard>
  );
};

export default OperationAuditExportButton;
