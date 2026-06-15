import React from 'react';
import {
  Box,
  Badge,
  Text,
  VStack,
  HStack,
  Icon,
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
import { FaCheckCircle, FaExternalLinkAlt, FaShieldAlt, FaInfoCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import { ConsumerCertification } from 'types/certification';

interface CertificationBadgeProps {
  certifications: ConsumerCertification[];
  compact?: boolean;
  /** "card" = full bordered card (default), "inline" = flat row for embedding */
  variant?: 'card' | 'inline';
}

const CertificationBadge: React.FC<CertificationBadgeProps> = ({
  certifications,
  compact = false,
  variant = 'card'
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const intl = useIntl();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const cardBg = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const subtextColor = useColorModeValue('gray.500', 'gray.400');
  const detailBg = useColorModeValue('gray.50', 'gray.700');

  if (!certifications || certifications.length === 0) return null;

  const verifiedCerts = certifications.filter((c) => c.status === 'verified_via_database');
  const selfReportedCerts = certifications.filter((c) => c.status === 'self_reported');
  const hasVerified = verifiedCerts.length > 0;

  // Primary cert to display on the card — pick the most meaningful one:
  // 1. Verified certs first (most valuable to show)
  // 2. Among same status, skip "Other" (not meaningful to consumers)
  // 3. Fall back to first cert
  const pickPrimary = () => {
    const pool = hasVerified
      ? verifiedCerts
      : selfReportedCerts.length > 0
      ? selfReportedCerts
      : certifications;
    const meaningful = pool.filter((c) => c.display_name !== 'Other');
    return meaningful[0] || pool[0];
  };
  const primaryCert = pickPrimary();

  const renderCertDetail = (cert: ConsumerCertification, index: number) => (
    <Box
      key={index}
      p={4}
      bg={cert.status === 'verified_via_database' ? 'green.50' : detailBg}
      borderRadius="lg"
      border="1px solid"
      borderColor={cert.status === 'verified_via_database' ? 'green.200' : 'gray.100'}
    >
      <VStack align="start" spacing={2}>
        <HStack spacing={2} w="100%">
          <Icon
            as={cert.status === 'verified_via_database' ? FaCheckCircle : FaShieldAlt}
            color={cert.status === 'verified_via_database' ? 'green.500' : 'gray.400'}
            boxSize={5}
          />
          <VStack align="start" spacing={0} flex={1}>
            <Text fontWeight="bold" fontSize="sm" color={textColor}>
              {cert.display_name}
            </Text>
            <Badge
              colorScheme={cert.status === 'verified_via_database' ? 'green' : 'gray'}
              variant="subtle"
              fontSize="xs"
              px={2}
              py={0.5}
              borderRadius="full"
            >
              {cert.status === 'verified_via_database'
                ? intl.formatMessage({ id: 'certification.badge.verified' })
                : intl.formatMessage({ id: 'certification.badge.selfReported' })}
            </Badge>
          </VStack>
        </HStack>

        {cert.certifier_name && (
          <HStack spacing={1} pl={7}>
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'certification.manage.certifier' })}:
            </Text>
            <Text fontSize="xs" color={textColor} fontWeight="medium">
              {cert.certifier_name}
            </Text>
          </HStack>
        )}

        {cert.effective_date && (
          <HStack spacing={1} pl={7}>
            <Text fontSize="xs" color={subtextColor}>
              {intl.formatMessage({ id: 'certification.manage.effectiveDate' })}:
            </Text>
            <Text fontSize="xs" color={textColor} fontWeight="medium">
              {cert.effective_date}
            </Text>
          </HStack>
        )}

        {cert.verification_source_url && (
          <Link
            href={cert.verification_source_url}
            isExternal
            fontSize="xs"
            color="blue.500"
            pl={7}
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

  const renderDetailContent = () => {
    // Skip "Other" — not meaningful to consumers (consistent with pickPrimary +
    // the compact badge list). Use filtered lengths so the divider/guards match.
    const visibleVerified = verifiedCerts.filter((c) => c.display_name !== 'Other');
    const visibleSelfReported = selfReportedCerts.filter((c) => c.display_name !== 'Other');
    return (
      <VStack spacing={3} align="stretch">
        {visibleVerified.length > 0 && visibleVerified.map((cert, i) => renderCertDetail(cert, i))}
        {visibleVerified.length > 0 && visibleSelfReported.length > 0 && <Divider />}
        {visibleSelfReported.length > 0 &&
          visibleSelfReported.map((cert, i) =>
            renderCertDetail(cert, visibleVerified.length + i)
          )}
      </VStack>
    );
  };

  const renderDrawerOrModal = () => {
    const headerContent = (
      <HStack spacing={2}>
        <Icon as={FaShieldAlt} color={hasVerified ? 'green.500' : 'gray.500'} boxSize={5} />
        <VStack align="start" spacing={0}>
          <Text fontWeight="bold">{intl.formatMessage({ id: 'certification.manage.title' })}</Text>
          <Text fontSize="xs" color={subtextColor} fontWeight="normal">
            {hasVerified
              ? `${verifiedCerts.length} verified, ${selfReportedCerts.length} self-reported`
              : `${certifications.length} ${intl
                  .formatMessage({ id: 'certification.manage.title' })
                  .toLowerCase()}`}
          </Text>
        </VStack>
      </HStack>
    );

    if (isMobile) {
      return (
        <Drawer isOpen={isOpen} onClose={onClose} placement="bottom">
          <DrawerOverlay bg="blackAlpha.400" />
          <DrawerContent
            bg={cardBg}
            borderTopRadius="2xl"
            maxH="92vh"
            containerProps={{ style: { zIndex: 10000 } }}
          >
            <Box pt={3} pb={1} display="flex" justifyContent="center">
              <Box w="36px" h="4px" borderRadius="full" bg="gray.300" />
            </Box>
            <DrawerCloseButton top={4} />
            <DrawerHeader px={5} pt={2} pb={4} borderBottomWidth="1px" fontSize="md">
              {headerContent}
            </DrawerHeader>
            <DrawerBody px={5} py={4} overflowY="auto">
              {renderDetailContent()}
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="md" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.400" />
        <ModalContent borderRadius="xl">
          <ModalCloseButton />
          <ModalHeader fontSize="md" pb={2}>
            {headerContent}
          </ModalHeader>
          <ModalBody pb={6}>{renderDetailContent()}</ModalBody>
        </ModalContent>
      </Modal>
    );
  };

  if (compact) {
    return (
      <>
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
          borderRadius="full"
        >
          <Icon as={hasVerified ? FaCheckCircle : FaShieldAlt} boxSize={3} />
          <Text fontSize="xs">{primaryCert.display_name}</Text>
        </Badge>
        {renderDrawerOrModal()}
      </>
    );
  }

  // Inline mode — flat row for embedding inside other sections (no nested card)
  if (variant === 'inline') {
    return (
      <>
        <HStack
          spacing={3}
          cursor="pointer"
          onClick={onOpen}
          py={2}
          px={3}
          _hover={{ bg: 'gray.50' }}
          borderRadius="lg"
          transition="all 0.2s"
        >
          <Icon
            as={hasVerified ? FaCheckCircle : FaShieldAlt}
            color={hasVerified ? 'green.500' : 'gray.400'}
            boxSize={5}
          />
          <VStack align="start" spacing={0} flex={1}>
            <HStack spacing={2}>
              <Text fontWeight="semibold" fontSize="sm" color={textColor}>
                {primaryCert.display_name}
              </Text>
              <Badge
                colorScheme={hasVerified ? 'green' : 'gray'}
                variant="subtle"
                fontSize="xs"
                borderRadius="full"
                px={2}
              >
                {hasVerified
                  ? intl.formatMessage({ id: 'certification.badge.verifiedShort' })
                  : intl.formatMessage({ id: 'certification.badge.selfReportedShort' })}
              </Badge>
            </HStack>
            {hasVerified && (
              <Text fontSize="xs" color={subtextColor}>
                {intl.formatMessage({ id: 'certification.badge.verified' })}
              </Text>
            )}
            {primaryCert.certifier_name && (
              <Text fontSize="xs" color={subtextColor}>
                {intl.formatMessage({ id: 'certification.manage.certifier' })}:{' '}
                {primaryCert.certifier_name}
              </Text>
            )}
          </VStack>
          <Icon as={FaInfoCircle} color="gray.400" boxSize={4} />
        </HStack>
        {renderDrawerOrModal()}
      </>
    );
  }

  // Full card mode — matches ProductDetail page design system
  return (
    <>
      <Box
        bg={cardBg}
        borderRadius="xl"
        border="1px solid"
        borderColor={hasVerified ? 'green.200' : 'gray.200'}
        overflow="hidden"
        cursor="pointer"
        onClick={onOpen}
        _hover={{
          borderColor: hasVerified ? 'green.400' : 'gray.400',
          shadow: 'sm'
        }}
        transition="all 0.2s"
      >
        {/* Header with gradient — matches page pattern */}
        <Box
          bg={
            hasVerified
              ? 'linear-gradient(135deg, #f0fff4, #ebf8ff)'
              : 'linear-gradient(135deg, #f7fafc, #edf2f7)'
          }
          px={6}
          py={4}
        >
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon
                as={hasVerified ? FaCheckCircle : FaShieldAlt}
                color={hasVerified ? 'green.500' : 'gray.400'}
                boxSize={6}
              />
              <VStack align="start" spacing={0}>
                <Text fontWeight="bold" fontSize="md" color={textColor}>
                  {certifications.length === 1
                    ? primaryCert.display_name
                    : intl.formatMessage({ id: 'certification.manage.title' })}
                </Text>
                <Text fontSize="xs" color={subtextColor}>
                  {hasVerified
                    ? intl.formatMessage({ id: 'certification.badge.verified' })
                    : certifications.length === 1
                    ? intl.formatMessage({ id: 'certification.badge.selfReported' })
                    : `${certifications.length} ${intl
                        .formatMessage({ id: 'certification.manage.title' })
                        .toLowerCase()}`}
                </Text>
              </VStack>
            </HStack>
            <Icon as={FaInfoCircle} color="gray.400" boxSize={4} />
          </HStack>
        </Box>

        {/* Content */}
        <Box px={6} py={4}>
          <HStack spacing={2} flexWrap="wrap">
            {certifications
              .filter((c) => c.display_name !== 'Other')
              .map((cert, i) => (
                <Badge
                  key={i}
                  colorScheme={cert.status === 'verified_via_database' ? 'green' : 'gray'}
                  variant="subtle"
                  fontSize="xs"
                  px={2}
                  py={1}
                  borderRadius="full"
                >
                  <HStack spacing={1}>
                    {cert.status === 'verified_via_database' && (
                      <Icon as={FaCheckCircle} boxSize={2.5} />
                    )}
                    <Text>{cert.display_name}</Text>
                  </HStack>
                </Badge>
              ))}
          </HStack>

          {primaryCert.certifier_name && (
            <Text fontSize="xs" color={subtextColor} mt={2}>
              {intl.formatMessage({ id: 'certification.manage.certifier' })}:{' '}
              {primaryCert.certifier_name}
            </Text>
          )}
        </Box>
      </Box>
      {renderDrawerOrModal()}
    </>
  );
};

export default CertificationBadge;
