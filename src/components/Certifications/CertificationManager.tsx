import React, { useState } from 'react';
import {
  Box,
  Button,
  HStack,
  VStack,
  Text,
  Icon,
  Select,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
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
}

const CertificationManager: React.FC<CertificationManagerProps> = ({ companyId, farmId }) => {
  const intl = useIntl();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
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
        description: 'Certification added and verification initiated.',
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
        title: 'Error',
        description: 'Failed to add certification.',
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
        title: 'Certification removed',
        status: 'info',
        duration: 2000
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to remove certification.',
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
        description: 'Re-verification initiated.',
        status: 'info',
        duration: 2000
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to trigger verification.',
        status: 'error',
        duration: 3000
      });
    }
  };

  return (
    <Box>
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
              <HStack justify="space-between" align="start">
                <VStack align="start" spacing={1} flex={1}>
                  <HStack>
                    <Text fontWeight="medium" fontSize="sm">
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
                      aria-label="Re-verify"
                      icon={<FaSync />}
                      size="xs"
                      variant="ghost"
                      onClick={() => handleVerify(cert)}
                    />
                  </Tooltip>
                  <Tooltip label="Remove">
                    <IconButton
                      aria-label="Delete"
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

      {/* Add Certification Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader fontSize="md">
            {intl.formatMessage({ id: 'certification.manage.add' })}
          </ModalHeader>
          <ModalBody>
            <VStack spacing={4}>
              <Box w="100%">
                <Text fontSize="sm" mb={1} fontWeight="medium">
                  {intl.formatMessage({ id: 'certification.manage.type' })}
                </Text>
                <Select
                  value={formData.certification_type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      certification_type: e.target.value as CertificationType
                    })
                  }
                  size="sm"
                >
                  {CERTIFICATION_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </Box>

              {formData.certification_type === 'usda_organic' && (
                <Box
                  w="100%"
                  p={3}
                  bg="blue.50"
                  borderRadius="md"
                  borderLeft="3px solid"
                  borderLeftColor="blue.400"
                >
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
                  <Input
                    size="sm"
                    placeholder={intl.formatMessage({
                      id: 'certification.manage.usdaNamePlaceholder'
                    })}
                    value={formData.usda_operation_name}
                    onChange={(e) =>
                      setFormData({ ...formData, usda_operation_name: e.target.value })
                    }
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
                <Input
                  size="sm"
                  placeholder="e.g., GGN-123456"
                  value={formData.certification_number}
                  onChange={(e) =>
                    setFormData({ ...formData, certification_number: e.target.value })
                  }
                />
              </Box>

              <Box w="100%">
                <Text fontSize="sm" mb={1} fontWeight="medium">
                  {intl.formatMessage({ id: 'certification.manage.certifier' })}
                </Text>
                <Input
                  size="sm"
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
                  <Input
                    size="sm"
                    type="date"
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                  />
                </Box>
                <Box flex={1}>
                  <Text fontSize="sm" mb={1} fontWeight="medium">
                    {intl.formatMessage({ id: 'certification.manage.expiryDate' })}
                  </Text>
                  <Input
                    size="sm"
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </Box>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button colorScheme="green" onClick={handleAdd} isLoading={isAdding} size="sm">
              {intl.formatMessage({ id: 'certification.manage.add' })}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={deleteDisclosure.isOpen}
        leastDestructiveRef={deleteRef}
        onClose={deleteDisclosure.onClose}
      >
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
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={handleDelete}
                ml={3}
                size="sm"
                isLoading={isDeleting}
              >
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
