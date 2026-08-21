import React, { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Icon,
  useDisclosure,
  useToast,
  Spinner,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay
} from '@chakra-ui/react';
import { FaCertificate, FaPlus, FaSync, FaTrash } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import {
  useGetCertificationsQuery,
  useAddCertificationMutation,
  useDeleteCertificationMutation,
  useVerifyCertificationMutation
} from '../../store/api/certificationApi';
import { Certification, CertificationType, CreateCertificationData } from 'types/certification';
import { ResponsiveModal, StandardInput, StandardSelect } from 'components/Design';
import CertificationStatusBadge from './CertificationStatusBadge';

const CERTIFICATION_TYPE_OPTIONS: { value: CertificationType; label: string }[] = [
  { value: 'usda_organic', label: 'USDA Organic' },
  { value: 'ccof', label: 'CCOF' },
  { value: 'cng', label: 'Certified Naturally Grown' },
  { value: 'real_organic_project', label: 'Real Organic Project' },
  { value: 'roc', label: 'Regenerative Organic Certified' },
  { value: 'non_gmo_project', label: 'Non-GMO Project Verified' },
  { value: 'global_gap', label: 'GlobalG.A.P.' },
  { value: 'fair_trade', label: 'Fair Trade Certified' },
  { value: 'rainforest_alliance', label: 'Rainforest Alliance' },
  { value: 'sqf', label: 'SQF Certified' },
  { value: 'kosher', label: 'Kosher Certified' },
  { value: 'other', label: 'Other' }
];

interface CertificationManagerProps {
  companyId: string;
  farmId: string;
  /**
   * Suppress the internal title row. The caller already wraps this in a titled card, and
   * rendering both produced a card headed "Certifications" containing a second
   * "Certifications" heading from the same i18n id.
   */
  hideHeader?: boolean;
  /**
   * Externally-owned disclosure for the "add" modal, so the caller can put the Add button
   * in its card header. Falls back to an internal disclosure when omitted.
   */
  addDisclosure?: { isOpen: boolean; onOpen: () => void; onClose: () => void };
}

const CertificationManager: React.FC<CertificationManagerProps> = ({
  companyId,
  farmId,
  hideHeader = false,
  addDisclosure
}) => {
  const intl = useIntl();
  const toast = useToast();
  const internalDisclosure = useDisclosure();
  const { isOpen, onOpen, onClose } = addDisclosure ?? internalDisclosure;
  const deleteDisclosure = useDisclosure();
  const deleteRef = React.useRef<HTMLButtonElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<Certification | null>(null);

  const [formData, setFormData] = useState<CreateCertificationData>({
    certification_type: 'usda_organic',
    certification_number: '',
    certifier_name: '',
    usda_operation_name: '',
    effective_date: '',
    expiry_date: '',
    notes: ''
  });

  const { data: certifications, isLoading } = useGetCertificationsQuery({
    companyId,
    farmId
  });

  const [addCertification, { isLoading: isAdding }] = useAddCertificationMutation();
  const [deleteCertification, { isLoading: isDeleting }] = useDeleteCertificationMutation();
  const [verifyCertification] = useVerifyCertificationMutation();

  const handleAdd = async () => {
    try {
      // Strip empty strings — Django DateField rejects "" (needs null or valid date)
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => v !== '')
      ) as CreateCertificationData;

      await addCertification({
        companyId,
        farmId,
        data: cleanData
      }).unwrap();

      toast({
        title: intl.formatMessage({ id: 'certification.manage.add' }),
        description: intl.formatMessage({
          id: 'certification.manage.addedDescription',
          defaultMessage: 'Certification added and verification initiated.'
        }),
        status: 'success',
        duration: 3000
      });

      onClose();
      setFormData({
        certification_type: 'usda_organic',
        certification_number: '',
        certifier_name: '',
        usda_operation_name: '',
        effective_date: '',
        expiry_date: '',
        notes: ''
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'app.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({
          id: 'certification.manage.addFailed',
          defaultMessage: 'Failed to add certification.'
        }),
        status: 'error',
        duration: 3000
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCertification({
        companyId,
        farmId,
        certificationId: String(deleteTarget.id)
      }).unwrap();

      toast({
        title: intl.formatMessage({
          id: 'certification.manage.removed',
          defaultMessage: 'Certification removed'
        }),
        status: 'info',
        duration: 2000
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'app.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({
          id: 'certification.manage.removeFailed',
          defaultMessage: 'Failed to remove certification.'
        }),
        status: 'error',
        duration: 3000
      });
    }
    setDeleteTarget(null);
    deleteDisclosure.onClose();
  };

  const handleVerify = async (cert: Certification) => {
    try {
      await verifyCertification({
        companyId,
        farmId,
        certificationId: String(cert.id)
      }).unwrap();

      toast({
        title: intl.formatMessage({ id: 'certification.manage.verifying' }),
        description: intl.formatMessage({
          id: 'certification.manage.reverifyStarted',
          defaultMessage: 'Re-verification initiated.'
        }),
        status: 'info',
        duration: 2000
      });
    } catch {
      toast({
        title: intl.formatMessage({ id: 'app.error', defaultMessage: 'Error' }),
        description: intl.formatMessage({
          id: 'certification.manage.reverifyFailed',
          defaultMessage: 'Failed to trigger verification.'
        }),
        status: 'error',
        duration: 3000
      });
    }
  };

  return (
    <Box>
      {!hideHeader && (
        <HStack justify="space-between" mb={4}>
          <HStack>
            <Icon as={FaCertificate} color="green.500" />
            <Text fontWeight="semibold" fontSize="md">
              {intl.formatMessage({ id: 'certification.manage.title' })}
            </Text>
          </HStack>
          <Button size="sm" colorScheme="green" leftIcon={<FaPlus />} onClick={onOpen}>
            {intl.formatMessage({ id: 'certification.manage.add' })}
          </Button>
        </HStack>
      )}

      {isLoading ? (
        <HStack justify="center" py={4}>
          <Spinner size="sm" />
        </HStack>
      ) : !certifications || certifications.length === 0 ? (
        <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>
          {intl.formatMessage({ id: 'certification.manage.none' })}
        </Text>
      ) : (
        <VStack spacing={3} align="stretch">
          {certifications.map((cert) => (
            <Box key={cert.id} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
              <HStack justify="space-between" align="start" gap={2}>
                <VStack align="start" spacing={1} flex={1} minW={0}>
                  {/* flexWrap + minW=0: the badge would not shrink, so on a phone it squeezed
                      this Text to near-zero width and "USDA Organic" wrapped ONE CHARACTER
                      PER LINE. The name and its status now sit side by side when there is
                      room and stack when there is not. */}
                  <HStack gap={2} flexWrap="wrap" align="center" w="full">
                    <Text fontWeight="medium" fontSize="sm" minW={0}>
                      {cert.certification_type_display}
                    </Text>
                    <CertificationStatusBadge status={cert.verification_status} />
                  </HStack>
                  {cert.certifier_name && (
                    <Text fontSize="xs" color="gray.500">
                      {cert.certifier_name}
                    </Text>
                  )}
                  {cert.certification_number && (
                    <Text fontSize="xs" color="gray.500">
                      #{cert.certification_number}
                    </Text>
                  )}
                  {cert.verification_notes && (
                    <Text fontSize="xs" color="gray.400" fontStyle="italic">
                      {cert.verification_notes}
                    </Text>
                  )}
                </VStack>
                <HStack spacing={1}>
                  <Tooltip label={intl.formatMessage({ id: 'certification.manage.reverify' })}>
                    <IconButton
                      aria-label={intl.formatMessage({ id: 'certification.manage.reverify' })}
                      icon={<FaSync />}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleVerify(cert)}
                    />
                  </Tooltip>
                  <Tooltip
                    label={intl.formatMessage({
                      id: 'certification.manage.remove',
                      defaultMessage: 'Remove'
                    })}>
                    <IconButton
                      aria-label={intl.formatMessage({
                        id: 'certification.manage.remove',
                        defaultMessage: 'Remove'
                      })}
                      icon={<FaTrash />}
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      onClick={() => {
                        setDeleteTarget(cert);
                        deleteDisclosure.onOpen();
                      }}
                    />
                  </Tooltip>
                </HStack>
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      {/* Add Certification Modal — bottom sheet below `md`, centered modal above */}
      <ResponsiveModal
        isOpen={isOpen}
        onClose={onClose}
        size="md"
        header={
          <Text fontSize="md" fontWeight="semibold">
            {intl.formatMessage({ id: 'certification.manage.add' })}
          </Text>
        }
        footer={
          <>
            <Button variant="ghost" mr={3} onClick={onClose} size="sm">
              {intl.formatMessage({ id: 'app.cancel' })}
            </Button>
            <Button colorScheme="green" onClick={handleAdd} isLoading={isAdding} size="sm">
              {intl.formatMessage({ id: 'certification.manage.add' })}
            </Button>
          </>
        }>
        <VStack spacing={4}>
          <Box w="100%">
            <Text fontSize="sm" mb={1} fontWeight="medium">
              {intl.formatMessage({ id: 'certification.manage.type' })}
            </Text>
            <StandardSelect
              value={formData.certification_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  certification_type: e.target.value as CertificationType
                })
              }>
              {CERTIFICATION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </StandardSelect>
          </Box>

          {formData.certification_type === 'usda_organic' && (
            <Box
              w="100%"
              p={3}
              bg="blue.50"
              borderRadius="md"
              borderLeft="3px solid"
              borderLeftColor="blue.400">
              <Text fontSize="xs" color="blue.700">
                {intl.formatMessage({ id: 'certification.manage.usdaHelpText' })}
              </Text>
            </Box>
          )}

          {formData.certification_type === 'usda_organic' && (
            <Box w="100%">
              <Text fontSize="sm" mb={1} fontWeight="medium">
                {intl.formatMessage({ id: 'certification.manage.usdaName' })}
              </Text>
              <StandardInput
                placeholder={intl.formatMessage({
                  id: 'certification.manage.usdaNamePlaceholder'
                })}
                value={formData.usda_operation_name}
                onChange={(e) => setFormData({ ...formData, usda_operation_name: e.target.value })}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                {intl.formatMessage({ id: 'certification.manage.usdaNameHint' })}
              </Text>
            </Box>
          )}

          <Box w="100%">
            <Text fontSize="sm" mb={1} fontWeight="medium">
              {intl.formatMessage({ id: 'certification.manage.number' })}
            </Text>
            <StandardInput
              placeholder="e.g., GGN-123456"
              value={formData.certification_number}
              onChange={(e) => setFormData({ ...formData, certification_number: e.target.value })}
            />
          </Box>

          <Box w="100%">
            <Text fontSize="sm" mb={1} fontWeight="medium">
              {intl.formatMessage({ id: 'certification.manage.certifier' })}
            </Text>
            <StandardInput
              placeholder="e.g., Oregon Tilth, CCOF"
              value={formData.certifier_name}
              onChange={(e) => setFormData({ ...formData, certifier_name: e.target.value })}
            />
          </Box>

          <HStack w="100%" spacing={3}>
            <Box flex={1}>
              <Text fontSize="sm" mb={1} fontWeight="medium">
                {intl.formatMessage({ id: 'certification.manage.effectiveDate' })}
              </Text>
              <StandardInput
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
              />
            </Box>
            <Box flex={1}>
              <Text fontSize="sm" mb={1} fontWeight="medium">
                {intl.formatMessage({ id: 'certification.manage.expiryDate' })}
              </Text>
              <StandardInput
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </Box>
          </HStack>
        </VStack>
      </ResponsiveModal>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={deleteRef}
        onClose={deleteDisclosure.onClose}>
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="md">
              {intl.formatMessage({ id: 'certification.manage.deleteConfirm' })}
            </AlertDialogHeader>
            <AlertDialogBody fontSize="sm">
              {deleteTarget?.certification_type_display}
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={deleteRef} onClick={deleteDisclosure.onClose} size="sm">
                {intl.formatMessage({ id: 'app.cancel' })}
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                ml={3}
                size="sm"
                isLoading={isDeleting}>
                Remove
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default CertificationManager;
