import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Box,
  useColorModeValue,
  Divider
} from '@chakra-ui/react';
import { FaEye, FaInfoCircle } from 'react-icons/fa';
import { MdPreview } from 'react-icons/md';
import { ConsumerEventCard } from './ConsumerEventCard';
import { hasMinimalPreviewData, type PreviewEventData } from '../../utils/eventPreviewUtils';
import { normalizeFormEventData } from '../../utils/eventDataNormalizer';
import { StandardizedEvent, EVENT_TYPE_NAMES } from '../../types/standardizedEvents';
import { getConsumerEventDescription } from '../../utils/eventDescriptions';
import { useIntl } from 'react-intl';

interface EventPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEventType: number;
  formData: any;
}

export const EventPreviewModal: React.FC<EventPreviewModalProps> = ({
  isOpen,
  onClose,
  activeEventType,
  formData
}) => {
  const intl = useIntl();
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.800', 'white');
  const mutedColor = useColorModeValue('gray.600', 'gray.400');

  // Check if we have enough data for preview
  const hasEnoughData = hasMinimalPreviewData(activeEventType, formData);

  // DEBUG: Trace formData received by EventPreviewModal
  console.log('🔍 [EventPreviewModal] FORM DATA RECEIVED:', {
    activeEventType,
    area_covered: formData?.area_covered,
    area_unit: formData?.area_unit,
    formDataKeys: formData ? Object.keys(formData) : []
  });

  // Transform form data to standardized event format
  const previewEvent: StandardizedEvent = hasEnoughData
    ? normalizeFormEventData(activeEventType, formData, {
        generateMockVerification: true
      })
    : ({
        id: 'preview-event',
        type: 'general',
        description: 'Please fill in more details to see preview',
        date: new Date().toISOString(),
        event_type: activeEventType
      } as StandardizedEvent);

  // DEBUG: Trace normalized event
  if (hasEnoughData) {
    console.log('🔍 [EventPreviewModal] NORMALIZED EVENT:', {
      area_covered: (previewEvent as any).area_covered,
      type: previewEvent.type
    });
  }

  // Generate proper consumer-friendly description using the same logic as ConsumerEventCard
  const consumerEventInfo = hasEnoughData
    ? getConsumerEventDescription(previewEvent.description, previewEvent)
    : { description: 'Please fill in more details to see preview' };

  // Use official event type names to prevent mapping errors
  const eventTypeName =
    EVENT_TYPE_NAMES[activeEventType as keyof typeof EVENT_TYPE_NAMES] || 'Farming Activity';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'xl', lg: '2xl' }}
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        maxH={{ base: '100vh', md: '90vh' }}
        bg={bgColor}
        mx={{ base: 0, md: 4 }}
        my={{ base: 0, md: 4 }}
        borderRadius={{ base: 0, md: 'xl' }}
      >
        <ModalHeader
          pb={3}
          borderBottom="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}
        >
          <VStack spacing={2} align="start">
            <HStack spacing={3}>
              <Icon as={MdPreview} color="green.500" boxSize={6} />
              <Text fontSize="lg" fontWeight="bold" color={textColor}>
                {intl.formatMessage({ id: 'app.eventPreview' }) || 'Event Preview'}
              </Text>
            </HStack>
            <Text fontSize="sm" color={mutedColor}>
              {intl.formatMessage({ id: 'app.eventPreviewDescription' }) ||
                'See how your event will appear in the Production Journey'}
            </Text>
          </VStack>
        </ModalHeader>

        <ModalCloseButton size="lg" />

        <ModalBody p={{ base: 4, md: 6 }}>
          <VStack spacing={6} align="stretch">
            {/* Preview Info Banner */}
            <Box
              bg={useColorModeValue('blue.50', 'blue.900')}
              border="1px solid"
              borderColor={useColorModeValue('blue.200', 'blue.700')}
              borderRadius="lg"
              p={4}
            >
              <HStack spacing={3} align="start">
                <Icon as={FaInfoCircle} color="blue.500" boxSize={5} mt={1} />
                <VStack spacing={2} align="start" flex={1}>
                  <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                    {eventTypeName} Preview
                  </Text>
                  <Text
                    fontSize="xs"
                    color={useColorModeValue('blue.700', 'blue.200')}
                    lineHeight="1.4"
                  >
                    This preview shows how consumers will see your event in the Production Journey.
                    All verification badges shown are for preview only - actual verification will be
                    applied when the event is saved.
                  </Text>

                  {!hasEnoughData && (
                    <Badge colorScheme="orange" variant="subtle" fontSize="xs">
                      <HStack spacing={1}>
                        <Icon as={FaInfoCircle} boxSize={3} />
                        <Text>Fill in more details for a complete preview</Text>
                      </HStack>
                    </Badge>
                  )}
                </VStack>
              </HStack>
            </Box>
            <Divider />
            {/* Event Preview Header */}
            <Box>
              <HStack spacing={3} mb={4}>
                <Icon as={FaEye} color="green.500" boxSize={5} />
                <Text fontSize="md" fontWeight="semibold" color={textColor}>
                  How consumers will see this event:
                </Text>
              </HStack>

              {/* The actual preview using ConsumerEventCard */}
              <Box
                bg={useColorModeValue('white', 'gray.800')}
                borderRadius="xl"
                border="1px solid"
                borderColor={useColorModeValue('gray.200', 'gray.600')}
                overflow="hidden"
                p={4}
              >
                <ConsumerEventCard event={previewEvent} isFirst={true} isLast={true} />
              </Box>
            </Box>
            {/* Preview Details
            {hasEnoughData && (
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color={textColor} mb={3}>
                  Preview Details:
                </Text>
                <VStack spacing={2} align="stretch">
                  <HStack justify="space-between" fontSize="sm">
                    <Text color={mutedColor}>Event Type:</Text>
                    <Text color={textColor} fontWeight="medium">
                      {eventTypeName}
                    </Text>
                  </HStack>
                  <HStack justify="space-between" fontSize="sm">
                    <Text color={mutedColor}>Description:</Text>
                    <Text color={textColor} fontWeight="medium" textAlign="right" maxW="60%">
                      {consumerEventInfo.description}
                    </Text>
                  </HStack>
                  {previewEvent.carbon_impact && (
                    <HStack justify="space-between" fontSize="sm">
                      <Text color={mutedColor}>Estimated Carbon Impact:</Text>
                      <Badge colorScheme="green" variant="subtle">
                        {previewEvent.carbon_impact} kg CO₂e
                      </Badge>
                    </HStack>
                  )}
                  <HStack justify="space-between" fontSize="sm">
                    <Text color={mutedColor}>Verification Status:</Text>
                    <Badge colorScheme="blue" variant="outline">
                      Preview Mode
                    </Badge>
                  </HStack>
                </VStack>
              </Box>
            )} */}
            {/* Help Text */}
            <Box
              bg={useColorModeValue('green.50', 'green.900')}
              border="1px solid"
              borderColor={useColorModeValue('green.200', 'green.700')}
              borderRadius="lg"
              p={4}
            >
              <Text
                fontSize="xs"
                color={useColorModeValue('green.700', 'green.200')}
                textAlign="center"
              >
                💡 <strong>Tip:</strong> The more details you provide in the form, the more
                informative and trustworthy your event will appear to consumers. Complete
                transparency builds consumer confidence!
              </Text>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default EventPreviewModal;
