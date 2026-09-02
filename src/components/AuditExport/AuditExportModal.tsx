import React, { useState } from 'react';
import {
  VStack,
  HStack,
  Text,
  RadioGroup,
  Radio,
  Stack,
  Box,
  Icon,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import { FiDownload, FiFile, FiTable } from 'react-icons/fi';
import { useIntl } from 'react-intl';

import { ResponsiveModal } from 'components/Design/ResponsiveModal';
import { GuidanceNote, StandardButton } from 'components/Design/StandardComponents';
import { config } from 'config/environment';

interface AuditExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionId: string;
  productionName: string;
}

type CertificationKey = 'all' | 'organic' | 'globalgap' | 'roc' | 'fsma204' | 'scs';
type FormatKey = 'pdf' | 'csv';

/**
 * The two things this modal still chooses between. (The standard picker that used to sit above
 * the format selector was removed 2026-08-29 — see the note in the body.)
 */
const FORMAT_OPTIONS: { value: FormatKey; labelKey: string; icon: typeof FiFile }[] = [
  { value: 'pdf', labelKey: 'app.exportPdfReport', icon: FiFile },
  { value: 'csv', labelKey: 'app.exportCsvSpreadsheet', icon: FiTable }
];

/**
 * 🔴 2026-08-22 — this picker opened on "All Certifications" with five branded standards
 * given equal weight. Two problems, one strategic and one concrete.
 *
 * Concrete: "all" carries the carbon appendix that the organic export deliberately EXCLUDES
 * ("USDA inspectors do not grade on environmental footprint, and including emissions data in
 * an audit PDF risks greenwashing-by-association claims" — audit_export_service.py). The
 * default therefore handed an organic grower the one variant carrying the risk the organic
 * variant was built to avoid.
 *
 * Strategic: organic is 27 CFR-cited sections — OSP reference, drift findings, producer
 * attestation, SOE compliance, mass balance, CDFA registration. The other four are 5–19
 * generic sections re-sliced from the same records, with nothing standard-specific in them
 * (ROC gets no animal welfare or social fairness; GlobalG.A.P. no hygiene or water-risk
 * module; SCS nothing SCS-specific). Presenting them as peers of the organic packet claims
 * a breadth the product does not have.
 *
 * So: USDA Organic leads and is the default, ROC sits under it as the organic-adjacent
 * option, and the rest live behind a disclosure with a line saying plainly that choosing one
 * filters sections and is not a claim of certification.
 */
const AuditExportModal: React.FC<AuditExportModalProps> = ({
  isOpen,
  onClose,
  productionId,
  productionName
}) => {
  const intl = useIntl();
  const toast = useToast();

  // Fixed: this export is USDA Organic. See the note in the body where the picker was.
  const certification: CertificationKey = 'organic';
  // Opens itself when the current selection lives inside it, so a chosen standard is never
  // hidden behind a collapsed section the farmer has to remember to open.
  const [format, setFormat] = useState<FormatKey>('pdf');
  const [isLoading, setIsLoading] = useState(false);

  const sectionBorder = useColorModeValue('gray.200', 'gray.600');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  const radioLabelColor = useColorModeValue('gray.800', 'gray.100');

  const handleDownload = async () => {
    if (!productionId) {
      toast({
        title: intl.formatMessage({ id: 'app.error' }),
        description: intl.formatMessage({ id: 'app.exportErrorNoId' }),
        status: 'error',
        duration: 4000,
        isClosable: true
      });
      return;
    }

    setIsLoading(true);

    try {
      const url =
        `${config.API_BASE_URL}/histories/${productionId}/audit-export/` +
        `?certification=${certification}&export_format=${format}`;

      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        let errorMessage = intl.formatMessage({ id: 'app.exportFailed' });
        try {
          const errData = await response.json();
          // `detail` is the human sentence ("No Organic Fraud Prevention Plan on
          // file…"); `error` is a machine slug (audit_pdf_ofpp_missing). Farmers
          // were shown the slug because the order was reversed.
          if (errData?.detail) errorMessage = errData.detail;
          else if (errData?.error) errorMessage = errData.error;
        } catch {
          // response was not JSON — use the default message
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const safeName = productionName
        .replace(/[^a-zA-Z0-9\-_]/g, '-')
        .toLowerCase()
        .slice(0, 40);
      const extension = format === 'csv' ? 'csv' : 'pdf';
      link.download = `trazo-audit-${safeName || productionId}.${extension}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: intl.formatMessage({ id: 'app.exportSuccess' }),
        description: intl.formatMessage({ id: 'app.exportSuccessDescription' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });

      onClose();
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.exportFailed' }),
        description:
          error instanceof Error
            ? error.message
            : intl.formatMessage({ id: 'app.exportFailedDescription' }),
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    /*
     * 2026-09-01 — ResponsiveModal, not a hand-rolled <Modal>. This file was the template
     * PURExportModal copied, so its shell, its blue.700-on-blue.50 note box (4.03:1) and its
     * green.500 header icon (2.78:1) shipped twice. See ResponsiveModal.tsx: "new dialogs
     * should use this instead of hand-rolling a ninth copy."
     */
    <ResponsiveModal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      isCloseDisabled={isLoading}
      header={
        <HStack spacing={2}>
          <Icon as={FiDownload} color="green.700" boxSize={5} aria-hidden="true" />
          <Text fontSize="lg" fontWeight="bold" color="gray.800">
            {intl.formatMessage({ id: 'app.exportAuditTitle' })}
          </Text>
        </HStack>
      }
      footer={
        <Stack
          direction={{ base: 'column', smd: 'row' }}
          spacing={3}
          w={{ base: 'full', smd: 'auto' }}>
          <StandardButton
            variant="outline"
            size="md"
            onClick={handleClose}
            isDisabled={isLoading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.cancel' })}
          </StandardButton>
          <StandardButton
            variant="primary"
            size="md"
            leftIcon={<Icon as={FiDownload} />}
            onClick={handleDownload}
            isLoading={isLoading}
            loadingText={intl.formatMessage({ id: 'app.exportDownloading' })}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.exportDownload' })}
          </StandardButton>
        </Stack>
      }>
      <VStack spacing={5} align="stretch">
        {/*
          ⛔ THE STANDARD PICKER WAS REMOVED 2026-08-29. This export is USDA Organic, always.

          Measured, not assumed: every non-organic set was a strict SUBSET of `organic`,
          except that `roc`, `scs` and `all` each added exactly one section — `carbon` — and
          `fsma204` added `traceability`. `globalgap` added nothing whatsoever. So the picker
          offered LESS information under brands Trazo cannot substantiate, plus the one
          section the organic export deliberately omits (emissions data in an audit PDF is a
          greenwashing-by-association risk, and inspectors do not grade on it).

          The brands did not survive research: SCS-001 §2.5.1.2 requires a GFSI or USDA GAP
          certification Trazo publicly says it does not do, §3.4.1.1 requires an SCS-approved
          carbon calculator Trazo is not on, and SCS-001 is outside ANAB's accredited scope
          for its own issuer. FDA's FAQ TF.1 states FSMA 204 has no Key Data Elements for the
          growing stage, and §1.1320(a) puts the lot code on the initial packer, not the
          grower. The GlobalG.A.P. copy already conceded the missing hygiene, water-risk and
          worker-training data.

          The backend still accepts `certification_type` and every section set is intact, so
          restoring a standard is re-adding a control — not rebuilding a feature. Do not
          restore one without a named grower asking.
        */}

        {/* Format selector */}
        <Box>
          <Text
            fontSize="xs"
            fontWeight="semibold"
            textTransform="uppercase"
            color="gray.600"
            mb={3}
            letterSpacing="0.05em">
            {intl.formatMessage({ id: 'app.exportFormat' })}
          </Text>
          <RadioGroup value={format} onChange={(val) => setFormat(val as FormatKey)}>
            <Stack direction={{ base: 'column', smd: 'row' }} spacing={3}>
              {FORMAT_OPTIONS.map((opt) => (
                <Box
                  key={opt.value}
                  as="label"
                  flex={1}
                  cursor="pointer"
                  p={3}
                  borderRadius="xl"
                  border="2px solid"
                  borderColor={format === opt.value ? 'green.600' : sectionBorder}
                  bg={format === opt.value ? 'green.50' : sectionBg}
                  transition="all 0.15s"
                  _hover={{ borderColor: 'green.600' }}
                  minH="60px"
                  display="flex"
                  alignItems="center">
                  <Radio value={opt.value} colorScheme="green" size="md" w="full">
                    <HStack spacing={2} ml={1}>
                      <Icon
                        as={opt.icon}
                        boxSize={4}
                        color={format === opt.value ? 'green.700' : 'gray.600'}
                        aria-hidden="true"
                      />
                      <Text
                        fontSize="sm"
                        fontWeight={format === opt.value ? 'semibold' : 'normal'}
                        color={format === opt.value ? 'green.700' : radioLabelColor}>
                        {intl.formatMessage({ id: opt.labelKey })}
                      </Text>
                    </HStack>
                  </Radio>
                </Box>
              ))}
            </Stack>
          </RadioGroup>
        </Box>

        {/* What the export contains — static teaching copy, so a neutral GuidanceNote, not a
            tinted "info" box (frontend.md: blue survives only in Alert status="info"). */}
        <GuidanceNote>{intl.formatMessage({ id: 'app.exportInfoOrganic' })}</GuidanceNote>
        {/*
          Trazo has THREE certifier-facing exports and their names do not distinguish them:
          this one (a season), the Operation Audit Dossier (every parcel and production) and
          the OSP renewal packet (the filing). Until 2026-08-29 this modal's own copy called
          itself "the full renewal packet" — the exact phrase used elsewhere for the OSP ZIP,
          which is what a grower actually files. One line here, one on the farm card, both
          naming all three.
        */}
        <Text fontSize="xs" color="gray.600" lineHeight="1.6">
          {intl.formatMessage({ id: 'app.exportScopeNote' })}
        </Text>
      </VStack>
    </ResponsiveModal>
  );
};

export default AuditExportModal;
