import React from 'react';
import {
  Box,
  Badge,
  Text,
  VStack,
  HStack,
  Icon,
  Tooltip,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  useBreakpointValue,
  Divider,
  Link,
  useColorModeValue
} from '@chakra-ui/react';
import { FaCertificate, FaCheckCircle, FaExternalLinkAlt } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { ConsumerCertification } from 'types/certification';

interface CertificationBadgeProps {
  certifications: ConsumerCertification[];
  compact?: boolean;
}

const CertificationBadge: React.FC<CertificationBadgeProps> = ({
  certifications,
  compact = false
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const intl = useIntl();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');

  if (!certifications || certifications.length === 0) return null;

  const detailBg = useColorModeValue('gray.50', 'gray.700');

  const verifiedCerts = certifications.filter(c => c.status === 'verified_via_database');
  const selfReportedCerts = certifications.filter(c => c.status === 'self_reported');
  const hasVerified = verifiedCerts.length > 0;

  const renderCertDetail = (cert: ConsumerCertification, index: number) => (
    <Box key={index} p={3} bg={detailBg} borderRadius="md">
      <VStack align="start" spacing={1.5}>
        <HStack>
          {cert.status === 'verified_via_database' ? (
            <Icon as={FaCheckCircle} color="green.500" boxSize={4} />
          ) : (
            <Icon as={FaCertificate} color="yellow.500" boxSize={4} />
          )}
          <Text fontWeight="semibold" fontSize="sm" color={textColor}>
            {cert.display_name}
          </Text>
        </HStack>

        {cert.status === 'verified_via_database' ? (
          <Text fontSize="xs" color="green.600">
            {intl.formatMessage({ id: 'certification.badge.verified' })}
          </Text>
        ) : (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'certification.badge.selfReported' })}
          </Text>
        )}

        {cert.certifier_name && (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'certification.manage.certifier' })}: {cert.certifier_name}
          </Text>
        )}

        {cert.effective_date && (
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'certification.manage.effectiveDate' })}: {cert.effective_date}
          </Text>
        )}

        {cert.verification_source_url && (
          <Link
            href={cert.verification_source_url}
            isExternal
            fontSize="xs"
            color="blue.500"
          >
            <HStack spacing={1}>
              <Text>{intl.formatMessage({ id: 'certification.badge.viewSource' })}</Text>
              <Icon as={FaExternalLinkAlt} boxSize={2.5} />
            </HStack>
          </Link>
        )}
      </VStack>
    </Box>
  );

  const renderDetailContent = () => (
    <VStack spacing={3} align="stretch">
      {verifiedCerts.length > 0 && (
        <>
          <Text fontSize="sm" fontWeight="semibold" color="green.600">
            {intl.formatMessage({ id: 'certification.badge.verified' })}
          </Text>
          {verifiedCerts.map((cert, i) => renderCertDetail(cert, i))}
        </>
      )}
      {verifiedCerts.length > 0 && selfReportedCerts.length > 0 && <Divider />}
      {selfReportedCerts.length > 0 && (
        <>
          <Text fontSize="sm" fontWeight="semibold" color="gray.500">
            {intl.formatMessage({ id: 'certification.badge.selfReported' })}
          </Text>
          {selfReportedCerts.map((cert, i) => renderCertDetail(cert, verifiedCerts.length + i))}
        </>
      )}
    </VStack>
  );

  const renderDrawerOrModal = () => {
    if (isMobile) {
      return (
        <Drawer isOpen={isOpen} onClose={onClose} placement="bottom" size="md">
          <DrawerOverlay />
          <DrawerContent borderTopRadius="xl" maxH="80vh">
            <DrawerCloseButton />
            <DrawerHeader fontSize="md">
              <HStack>
                <Icon as={FaCertificate} color={hasVerified ? 'green.500' : 'gray.500'} />
                <Text>{intl.formatMessage({ id: 'certification.manage.title' })}</Text>
              </HStack>
            </DrawerHeader>
            <DrawerBody pb={6}>
              {renderDetailContent()}
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalHeader fontSize="md">
            <HStack>
              <Icon as={FaCertificate} color={hasVerified ? 'green.500' : 'gray.500'} />
              <Text>{intl.formatMessage({ id: 'certification.manage.title' })}</Text>
            </HStack>
          </ModalHeader>
          <ModalBody pb={6}>
            {renderDetailContent()}
          </ModalBody>
        </ModalContent>
      </Modal>
    );
  };

  if (compact) {
    return (
      <>
        <Tooltip label={`${certifications.length} ${intl.formatMessage({ id: 'certification.manage.title' }).toLowerCase()}`}>
          <Badge
            colorScheme={hasVerified ? 'green' : 'gray'}
            variant="subtle"
            cursor="pointer"
            onClick={onOpen}
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            py={1}
          >
            <Icon as={hasVerified ? FaCheckCircle : FaCertificate} boxSize={3} />
            <Text fontSize="xs">
              {hasVerified
                ? `${verifiedCerts[0].display_name}`
                : `${certifications[0].display_name}`}
            </Text>
          </Badge>
        </Tooltip>
        {renderDrawerOrModal()}
      </>
    );
  }

  return (
    <>
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={hasVerified ? 'green.200' : borderColor}
        borderRadius="lg"
        p={4}
        cursor="pointer"
        onClick={onOpen}
        _hover={{ borderColor: hasVerified ? 'green.400' : 'gray.400', shadow: 'sm' }}
        transition="all 0.2s"
      >
        <VStack align="start" spacing={2}>
          <HStack>
            <Icon
              as={hasVerified ? FaCheckCircle : FaCertificate}
              color={hasVerified ? 'green.500' : 'yellow.500'}
              boxSize={5}
            />
            <Text fontWeight="semibold" color={textColor} fontSize="sm">
              {intl.formatMessage({ id: 'certification.manage.title' })}
            </Text>
          </HStack>

          <HStack spacing={2} flexWrap="wrap">
            {certifications.slice(0, 3).map((cert, i) => (
              <Badge
                key={i}
                colorScheme={cert.status === 'verified_via_database' ? 'green' : 'gray'}
                variant="subtle"
                fontSize="xs"
              >
                {cert.status === 'verified_via_database' && (
                  <Icon as={FaCheckCircle} boxSize={2.5} mr={1} />
                )}
                {cert.display_name}
              </Badge>
            ))}
            {certifications.length > 3 && (
              <Badge colorScheme="gray" variant="subtle" fontSize="xs">
                +{certifications.length - 3}
              </Badge>
            )}
          </HStack>
        </VStack>
      </Box>
      {renderDrawerOrModal()}
    </>
  );
};

export default CertificationBadge;
