/**
 * CA Pesticide Use Report (PUR / DPR-PML-017C) export modal.
 *
 * Establishment + month scoped. Mirrors AuditExportModal's standards (Chakra Modal,
 * fetch+blob download with credentials, StandardButton, toast, i18n, `smd` breakpoint,
 * `export_format` query param — NOT `format`, which DRF reserves). Adds a month/year
 * picker and a JSON completeness preview so the farmer sees which DPR boxes are still
 * blank before downloading the CSV to file with the County Ag Commissioner.
 *
 * Backend: GET /api/histories/pur-export/?establishment_id=&month=&year=&export_format=
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Box,
  HStack,
  VStack,
  Text,
  Icon,
  Badge,
  Divider,
  Spinner,
  Link,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import {
  FiDownload,
  FiFileText,
  FiAlertTriangle,
  FiCheckCircle,
  FiExternalLink
} from 'react-icons/fi';
import { useIntl } from 'react-intl';
import { StandardButton, StandardSelect } from 'components/Design/StandardComponents';
import { config } from 'config/environment';

interface PURRow {
  product_and_manufacturer?: string;
  application_start?: string;
  application_method?: string;
  notes?: string;
}

interface PURSummary {
  application_count: number;
  complete_count: number;
  incomplete_count: number;
  filing_deadline: string;
  form: string;
  rows: PURRow[];
}

interface PURExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  establishmentId: number | string;
  establishmentName?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
];

const PURExportModal: React.FC<PURExportModalProps> = ({
  isOpen,
  onClose,
  establishmentId,
  establishmentName
}) => {
  const intl = useIntl();
  const toast = useToast();

  const now = new Date();
  const [month, setMonth] = useState<number>(now.getMonth() + 1);
  const [year, setYear] = useState<number>(now.getFullYear());
  const [summary, setSummary] = useState<PURSummary | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const sectionBorder = useColorModeValue('gray.200', 'gray.600');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  const infoBg = useColorModeValue('blue.50', 'blue.900');
  const infoBorder = useColorModeValue('blue.100', 'blue.700');
  const infoText = useColorModeValue('blue.700', 'blue.200');
  const labelColor = useColorModeValue('gray.700', 'gray.200');
  const rowBg = useColorModeValue('white', 'gray.800');

  const yearOptions = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  const baseUrl = useCallback(
    (exportFormat: string) =>
      `${config.API_BASE_URL}/histories/pur-export/` +
      `?establishment_id=${establishmentId}&month=${month}&year=${year}&export_format=${exportFormat}`,
    [establishmentId, month, year]
  );

  const loadPreview = useCallback(async () => {
    if (!establishmentId || !isOpen) return;
    setIsPreviewing(true);
    setSummary(null);
    try {
      const response = await fetch(baseUrl('json'), { credentials: 'include' });
      if (!response.ok) {
        let msg = intl.formatMessage({ id: 'app.pur.previewFailed' });
        try {
          const err = await response.json();
          msg = err?.error || err?.detail || msg;
        } catch {
          // not JSON
        }
        throw new Error(msg);
      }
      setSummary(await response.json());
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.pur.previewFailed' }),
        description: error instanceof Error ? error.message : '',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    } finally {
      setIsPreviewing(false);
    }
  }, [baseUrl, establishmentId, isOpen, intl, toast]);

  // Auto-load preview when opened or when month/year changes.
  useEffect(() => {
    if (isOpen) loadPreview();
  }, [isOpen, loadPreview]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(baseUrl('csv'), { credentials: 'include' });
      if (!response.ok) {
        let msg = intl.formatMessage({ id: 'app.exportFailed' });
        try {
          const err = await response.json();
          msg = err?.error || err?.detail || msg;
        } catch {
          // not JSON
        }
        throw new Error(msg);
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `trazo-pur-${establishmentId}-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
      toast({
        title: intl.formatMessage({ id: 'app.exportSuccess' }),
        status: 'success',
        duration: 4000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'app.exportFailed' }),
        description: error instanceof Error ? error.message : '',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    if (!isDownloading) onClose();
  };

  const hasApps = !!summary && summary.application_count > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={{ base: 'full', smd: 'lg' }}
      isCentered
      scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent
        borderRadius={{ base: 'none', smd: '2xl' }}
        mx={{ base: 0, smd: 4 }}
        my={{ base: 0, smd: 'auto' }}>
        <ModalHeader
          pb={3}
          fontSize={{ base: 'md', md: 'lg' }}
          fontWeight="bold"
          color={labelColor}
          borderBottom="1px solid"
          borderColor={sectionBorder}>
          <HStack spacing={2}>
            <Icon as={FiFileText} color="green.500" boxSize={5} />
            <Text>{intl.formatMessage({ id: 'app.pur.title' })}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton isDisabled={isDownloading} top={3} />

        <ModalBody py={5}>
          <VStack spacing={5} align="stretch">
            <Text fontSize="sm" color={labelColor}>
              {intl.formatMessage({ id: 'app.pur.subtitle' })}
            </Text>

            {/* Month + year selectors */}
            <HStack spacing={3} align="flex-end">
              <Box flex={2}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1}>
                  {intl.formatMessage({ id: 'app.pur.month' })}
                </Text>
                <StandardSelect
                  value={month}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setMonth(Number(e.target.value))
                  }>
                  {MONTHS.map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </StandardSelect>
              </Box>
              <Box flex={1}>
                <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1}>
                  {intl.formatMessage({ id: 'app.pur.year' })}
                </Text>
                <StandardSelect
                  value={year}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setYear(Number(e.target.value))
                  }>
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </StandardSelect>
              </Box>
            </HStack>

            <Divider />

            {/* Completeness preview */}
            {isPreviewing ? (
              <HStack justify="center" py={6}>
                <Spinner color="green.500" />
                <Text fontSize="sm" color="gray.500">
                  {intl.formatMessage({ id: 'app.pur.loadingPreview' })}
                </Text>
              </HStack>
            ) : summary ? (
              <VStack spacing={3} align="stretch">
                <HStack spacing={3} wrap="wrap">
                  <Badge colorScheme="gray" fontSize="sm" px={2} py={1} borderRadius="md">
                    {intl.formatMessage(
                      { id: 'app.pur.applications' },
                      { count: summary.application_count }
                    )}
                  </Badge>
                  {summary.complete_count > 0 && (
                    <Badge colorScheme="green" fontSize="sm" px={2} py={1} borderRadius="md">
                      <HStack spacing={1}>
                        <Icon as={FiCheckCircle} boxSize={3} />
                        <Text>
                          {intl.formatMessage(
                            { id: 'app.pur.complete' },
                            { count: summary.complete_count }
                          )}
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                  {summary.incomplete_count > 0 && (
                    <Badge colorScheme="orange" fontSize="sm" px={2} py={1} borderRadius="md">
                      <HStack spacing={1}>
                        <Icon as={FiAlertTriangle} boxSize={3} />
                        <Text>
                          {intl.formatMessage(
                            { id: 'app.pur.incomplete' },
                            { count: summary.incomplete_count }
                          )}
                        </Text>
                      </HStack>
                    </Badge>
                  )}
                </HStack>

                {hasApps ? (
                  <VStack
                    spacing={2}
                    align="stretch"
                    maxH="220px"
                    overflowY="auto"
                    bg={sectionBg}
                    borderRadius="lg"
                    p={3}>
                    {summary.rows.map((row, idx) => (
                      <Box
                        key={idx}
                        p={2}
                        borderRadius="md"
                        borderLeft="3px solid"
                        borderColor={row.notes ? 'orange.300' : 'green.300'}
                        bg={rowBg}>
                        <Text fontSize="sm" fontWeight="semibold" color={labelColor}>
                          {row.product_and_manufacturer || '—'}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {[row.application_start, row.application_method]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        {row.notes && (
                          <Text fontSize="xs" color="orange.500" mt={1}>
                            {row.notes}
                          </Text>
                        )}
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box
                    bg={infoBg}
                    border="1px solid"
                    borderColor={infoBorder}
                    borderRadius="lg"
                    p={3}>
                    <Text fontSize="sm" color={infoText}>
                      {intl.formatMessage({ id: 'app.pur.noApplications' })}
                    </Text>
                  </Box>
                )}

                <Box
                  bg={infoBg}
                  border="1px solid"
                  borderColor={infoBorder}
                  borderRadius="lg"
                  p={3}>
                  <Text fontSize="xs" color={infoText} lineHeight="1.6">
                    {intl.formatMessage(
                      { id: 'app.pur.deadlineNote' },
                      { deadline: summary.filing_deadline, form: summary.form }
                    )}
                  </Text>
                  <Text fontSize="xs" color={infoText} lineHeight="1.6" mt={2}>
                    {intl.formatMessage({ id: 'app.pur.filingHelp' })}{' '}
                    <Link
                      href="https://www.calagpermits.org/"
                      isExternal
                      color="green.500"
                      fontWeight="semibold">
                      calagpermits.org
                      <Icon as={FiExternalLink} boxSize={3} ml={1} verticalAlign="middle" />
                    </Link>
                  </Text>
                </Box>
              </VStack>
            ) : null}
          </VStack>
        </ModalBody>

        <ModalFooter
          borderTop="1px solid"
          borderColor={sectionBorder}
          gap={3}
          flexDirection={{ base: 'column', smd: 'row' }}
          pt={4}>
          <StandardButton
            variant="outline"
            size="md"
            onClick={handleClose}
            isDisabled={isDownloading}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.cancel' })}
          </StandardButton>
          <StandardButton
            variant="primary"
            size="md"
            leftIcon={<Icon as={FiDownload} />}
            onClick={handleDownload}
            isLoading={isDownloading}
            loadingText={intl.formatMessage({ id: 'app.exportDownloading' })}
            isDisabled={!hasApps || isPreviewing}
            w={{ base: 'full', smd: 'auto' }}>
            {intl.formatMessage({ id: 'app.pur.downloadCsv' })}
          </StandardButton>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default PURExportModal;
