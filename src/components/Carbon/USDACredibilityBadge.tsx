import React from 'react';
import {
  Box,
  Badge,
  Text,
  VStack,
  HStack,
  Icon,
  Tooltip,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  useDisclosure,
  useBreakpointValue,
  Divider,
  useColorModeValue
} from '@chakra-ui/react';
import { FiShield, FiInfo, FiCheckCircle } from 'react-icons/fi';
import { useIntl } from 'react-intl';

interface USDACredibilityBadgeProps {
  compact?: boolean;
  showDetails?: boolean;
  establishmentId?: number; // Kept for backward compatibility but not used for API
}

const USDACredibilityBadge: React.FC<USDACredibilityBadgeProps> = ({
  compact = false,
  showDetails = true
}) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const intl = useIntl();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.700', 'gray.200');
  const disclaimerBg = useColorModeValue('gray.50', 'gray.700');

  const handleBadgeClick = () => {
    onOpen();
  };

  if (compact) {
    return (
      <>
        <Tooltip
          label={intl.formatMessage({ id: 'app.usdaBadge.tooltipCompact' })}
        >
          <Badge
            colorScheme="blue"
            variant="subtle"
            cursor="pointer"
            onClick={handleBadgeClick}
            display="flex"
            alignItems="center"
            gap={1}
            px={2}
            py={1}
          >
            <Icon as={FiShield} boxSize={3} />
            <Text fontSize="xs">
              {intl.formatMessage({ id: 'app.usdaBadge.label' })}
            </Text>
          </Badge>
        </Tooltip>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <Box
        bg={cardBg}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="lg"
        p={4}
        cursor={showDetails ? 'pointer' : 'default'}
        onClick={showDetails ? handleBadgeClick : undefined}
        _hover={showDetails ? { borderColor: 'blue.300', shadow: 'sm' } : {}}
        transition="all 0.2s"
      >
        <HStack justify="space-between" align="start">
          <VStack align="start" spacing={2} flex={1}>
            <HStack>
              <Icon as={FiShield} color="blue.500" boxSize={5} />
              <Text fontWeight="semibold" color={textColor}>
                {intl.formatMessage({ id: 'app.usdaBadge.cardTitle' })}
              </Text>
            </HStack>

            <Text fontSize="sm" color="gray.500" lineHeight="short">
              {intl.formatMessage({ id: 'app.usdaBadge.cardDescription' })}
            </Text>

            <HStack spacing={2}>
              <Badge colorScheme="blue" variant="subtle">
                <Icon as={FiCheckCircle} boxSize={3} mr={1} />
                {intl.formatMessage({ id: 'app.usdaBadge.epaUsdaSourced' })}
              </Badge>
              <Badge colorScheme="green" variant="subtle">
                {intl.formatMessage({ id: 'app.usdaBadge.governmentData' })}
              </Badge>
            </HStack>
          </VStack>

          {showDetails && <Icon as={FiInfo} color="gray.400" boxSize={4} />}
        </HStack>
      </Box>
      {renderModal()}
    </>
  );

  function renderModal() {
    const headerContent = (
      <HStack>
        <Icon as={FiShield} color="blue.500" />
        <Text>
          {intl.formatMessage({ id: 'app.usdaBadge.modalTitle' })}
        </Text>
      </HStack>
    );

    const bodyContent = (
      <VStack spacing={5} align="stretch" pb={{ base: 4, md: 0 }}>
        {/* Data Sources Used */}
        <Box>
          <Text fontWeight="semibold" mb={3}>
            {intl.formatMessage({ id: 'app.usdaBadge.dataSourcesUsed' })}
          </Text>
          <VStack align="start" spacing={2}>
            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={4} flexShrink={0} />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.usdaBadge.epaFactors' })}
              </Text>
            </HStack>
            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={4} flexShrink={0} />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.usdaBadge.usdaArs' })}
              </Text>
            </HStack>
            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={4} flexShrink={0} />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.usdaBadge.ipccGuidelines' })}
              </Text>
            </HStack>
            <HStack>
              <Icon as={FiCheckCircle} color="green.500" boxSize={4} flexShrink={0} />
              <Text fontSize="sm">
                {intl.formatMessage({ id: 'app.usdaBadge.epaEgrid' })}
              </Text>
            </HStack>
          </VStack>
        </Box>

        <Divider />

        {/* What This Means */}
        <Box>
          <Text fontWeight="semibold" mb={3}>
            {intl.formatMessage({ id: 'app.usdaBadge.whatThisMeans' })}
          </Text>
          <VStack align="start" spacing={2}>
            <Text fontSize="sm" color="gray.600">
              {intl.formatMessage({ id: 'app.usdaBadge.explanation' })}
            </Text>
          </VStack>
        </Box>

        <Divider />

        {/* Methodology Scope */}
        <Box>
          <Text fontWeight="semibold" mb={3}>
            {intl.formatMessage({ id: 'app.usdaBadge.methodologyScope' })}
          </Text>
          <VStack align="start" spacing={2}>
            <HStack align="start">
              <Icon as={FiCheckCircle} color="green.500" boxSize={4} mt={0.5} flexShrink={0} />
              <Text fontSize="sm" color="gray.600">
                {intl.formatMessage({ id: 'app.usdaBadge.scopeIncludes' })}
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.500" pl={6}>
              {intl.formatMessage({ id: 'app.usdaBadge.scopeExcludes' })}
            </Text>
          </VStack>
        </Box>

        {/* Disclaimer */}
        <Box bg={disclaimerBg} p={3} borderRadius="md">
          <Text fontSize="xs" color="gray.500">
            {intl.formatMessage({ id: 'app.usdaBadge.disclaimer' })}
          </Text>
        </Box>
      </VStack>
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
            <DrawerHeader px={5} pt={2} pb={4} borderBottomWidth="1px" borderColor={borderColor}>
              {headerContent}
            </DrawerHeader>
            <DrawerBody px={5} py={4} overflowY="auto">
              {bodyContent}
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      );
    }

    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent bg={cardBg} borderRadius="xl" maxH="90vh" mx={4}>
          <ModalHeader>{headerContent}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>{bodyContent}</ModalBody>
        </ModalContent>
      </Modal>
    );
  }
};

export default USDACredibilityBadge;
