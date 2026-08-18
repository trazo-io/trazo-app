import React, { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  RadioGroup,
  Radio,
  Stack,
  Box,
  Icon,
  Divider,
  useColorModeValue,
  useToast
} from '@chakra-ui/react';
import {
  FiDownload,
  FiFileText,
  FiGrid,
  FiLayers,
  FiCheckCircle,
  FiShield,
  FiRefreshCw,
  FiHash,
  FiDroplet
} from 'react-icons/fi';
import { useIntl } from 'react-intl';

import { StandardButton } from 'components/Design/StandardComponents';
import { config } from 'config/environment';

interface AuditExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  productionId: string;
  productionName: string;
}

type CertificationKey = 'all' | 'organic' | 'globalgap' | 'roc' | 'fsma204' | 'scs';
type FormatKey = 'pdf' | 'csv';

interface CertOption {
  value: CertificationKey;
  labelKey: string;
  subtitleKey: string;
  icon: React.ElementType;
}

interface CertGroup {
  titleKey: string;
  options: CertOption[];
}

const COMBINED_OPTION: CertOption = {
  value: 'all',
  labelKey: 'app.exportAllCertifications',
  subtitleKey: 'app.exportAllCertificationsSubtitle',
  icon: FiLayers
};

const CERT_GROUPS: CertGroup[] = [
  {
    titleKey: 'app.exportGroupOrganic',
    options: [
      {
        value: 'organic',
        labelKey: 'app.exportOrganic',
        subtitleKey: 'app.exportOrganicSubtitle',
        icon: FiCheckCircle
      },
      {
        value: 'roc',
        labelKey: 'app.exportRoc',
        subtitleKey: 'app.exportRocSubtitle',
        icon: FiRefreshCw
      }
    ]
  },
  {
    titleKey: 'app.exportGroupFoodSafety',
    options: [
      {
        value: 'globalgap',
        labelKey: 'app.exportGlobalgap',
        subtitleKey: 'app.exportGlobalgapSubtitle',
        icon: FiShield
      },
      {
        value: 'fsma204',
        labelKey: 'app.exportFsma204',
        subtitleKey: 'app.exportFsma204Subtitle',
        icon: FiHash
      }
    ]
  },
  {
    titleKey: 'app.exportGroupSustainability',
    options: [
      {
        value: 'scs',
        labelKey: 'app.exportScs',
        subtitleKey: 'app.exportScsSubtitle',
        icon: FiDroplet
      }
    ]
  }
];

const FORMAT_OPTIONS: Array<{ value: FormatKey; labelKey: string; icon: React.ElementType }> = [
  { value: 'pdf', labelKey: 'app.exportPdfReport', icon: FiFileText },
  { value: 'csv', labelKey: 'app.exportCsvSpreadsheet', icon: FiGrid }
];

const CERT_INFO_KEYS: Record<CertificationKey, string> = {
  all: 'app.exportInfoAll',
  organic: 'app.exportInfoOrganic',
  globalgap: 'app.exportInfoGlobalgap',
  roc: 'app.exportInfoRoc',
  fsma204: 'app.exportInfoFsma204',
  scs: 'app.exportInfoScs'
};

interface CertRadioCardProps {
  option: CertOption;
  isSelected: boolean;
}

const CertRadioCard: React.FC<CertRadioCardProps> = ({ option, isSelected }) => {
  const intl = useIntl();
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorder = useColorModeValue('gray.200', 'gray.600');
  const subtitleColor = useColorModeValue('gray.500', 'gray.400');
  const titleColor = useColorModeValue('gray.800', 'gray.100');

  return (
    <Box
      as="label"
      cursor="pointer"
      px={3}
      py={3}
      borderRadius="lg"
      border="2px solid"
      borderColor={isSelected ? 'green.400' : cardBorder}
      bg={isSelected ? 'green.50' : cardBg}
      transition="all 0.15s"
      _hover={{ borderColor: isSelected ? 'green.500' : 'green.300' }}
      minH="44px"
      display="block">
      <Radio value={option.value} colorScheme="green" size="md" w="full" alignItems="flex-start">
        <HStack spacing={3} align="flex-start" ml={1}>
          <Icon
            as={option.icon}
            boxSize={5}
            mt="2px"
            color={isSelected ? 'green.600' : 'gray.500'}
            flexShrink={0}
          />
          <VStack align="flex-start" spacing={0} flex={1}>
            <Text
              fontSize="sm"
              fontWeight={isSelected ? 'semibold' : 'medium'}
              color={isSelected ? 'green.700' : titleColor}
              lineHeight="1.3">
              {intl.formatMessage({ id: option.labelKey })}
            </Text>
            <Text fontSize="xs" color={subtitleColor} lineHeight="1.4">
              {intl.formatMessage({ id: option.subtitleKey })}
            </Text>
          </VStack>
        </HStack>
      </Radio>
    </Box>
  );
};

const AuditExportModal: React.FC<AuditExportModalProps> = ({
  isOpen,
  onClose,
  productionId,
  productionName
}) => {
  const intl = useIntl();
  const toast = useToast();

  const [certification, setCertification] = useState<CertificationKey>('all');
  const [format, setFormat] = useState<FormatKey>('pdf');
  const [isLoading, setIsLoading] = useState(false);

  const sectionBorder = useColorModeValue('gray.200', 'gray.600');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  const infoBg = useColorModeValue('blue.50', 'blue.900');
  const infoBorder = useColorModeValue('blue.100', 'blue.700');
  const infoText = useColorModeValue('blue.700', 'blue.200');
  const labelColor = useColorModeValue('gray.700', 'gray.200');
  const groupLabelColor = useColorModeValue('gray.500', 'gray.400');
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
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size={{ base: 'full', smd: 'md' }}
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
            <Icon as={FiDownload} color="green.500" boxSize={5} />
            <Text>{intl.formatMessage({ id: 'app.exportAuditTitle' })}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton isDisabled={isLoading} top={3} />

        <ModalBody py={5}>
          <VStack spacing={5} align="stretch">
            {/* Certification selector — grouped, card-style */}
            <Box>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                color="gray.500"
                mb={3}
                letterSpacing="0.05em">
                {intl.formatMessage({ id: 'app.exportCertificationType' })}
              </Text>
              <RadioGroup
                value={certification}
                onChange={(val) => setCertification(val as CertificationKey)}>
                <VStack spacing={4} align="stretch">
                  {/* Combined report — stands alone on top */}
                  <CertRadioCard
                    option={COMBINED_OPTION}
                    isSelected={certification === COMBINED_OPTION.value}
                  />

                  {/* Grouped cert options */}
                  {CERT_GROUPS.map((group) => (
                    <Box key={group.titleKey}>
                      <Text
                        fontSize="xs"
                        fontWeight="semibold"
                        textTransform="uppercase"
                        color={groupLabelColor}
                        mb={2}
                        letterSpacing="0.06em">
                        {intl.formatMessage({ id: group.titleKey })}
                      </Text>
                      <VStack spacing={2} align="stretch">
                        {group.options.map((opt) => (
                          <CertRadioCard
                            key={opt.value}
                            option={opt}
                            isSelected={certification === opt.value}
                          />
                        ))}
                      </VStack>
                    </Box>
                  ))}
                </VStack>
              </RadioGroup>
            </Box>

            <Divider />

            {/* Format selector */}
            <Box>
              <Text
                fontSize="xs"
                fontWeight="semibold"
                textTransform="uppercase"
                color="gray.500"
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
                      borderColor={format === opt.value ? 'green.400' : sectionBorder}
                      bg={format === opt.value ? 'green.50' : sectionBg}
                      transition="all 0.15s"
                      _hover={{ borderColor: 'green.300' }}
                      minH="60px"
                      display="flex"
                      alignItems="center">
                      <Radio value={opt.value} colorScheme="green" size="md" w="full">
                        <HStack spacing={2} ml={1}>
                          <Icon
                            as={opt.icon}
                            boxSize={4}
                            color={format === opt.value ? 'green.600' : 'gray.500'}
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

            {/* Info text — describes what the selected cert export contains */}
            <Box bg={infoBg} border="1px solid" borderColor={infoBorder} borderRadius="lg" p={3}>
              <Text fontSize="xs" color={infoText} lineHeight="1.6">
                {intl.formatMessage({ id: CERT_INFO_KEYS[certification] })}
              </Text>
            </Box>
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
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AuditExportModal;
