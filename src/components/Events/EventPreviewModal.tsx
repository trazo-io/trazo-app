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
import { toConsumerVisibleEvent } from '../../utils/consumerDisplay';
import { scanEventNotes } from '../../utils/consumerNoteScan';
import { StandardizedEvent, EVENT_TYPE_NAMES } from '../../types/standardizedEvents';
import { getConsumerEventDescription } from '../../utils/eventDescriptions';
import {
  calculatePreviewVerificationLevel,
  type VerificationLevel
} from '../../utils/verificationTierHelpers';
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

  // Calculate mock verification level based on form photos.
  // D8 — the wizard holds photos in `acceptedFiles` (NewEvent.jsx sets it on upload and when
  // mapping an existing album for edit); `album.images` is the SAVED shape and is absent during
  // creation. Reading only the latter made the preview say "0 photos" no matter how many the
  // farmer had just attached, so the verification tier it previewed was always the lowest one —
  // telling them their documentation was weaker than what they were about to submit.
  const photoCount =
    (formData as { acceptedFiles?: unknown[] })?.acceptedFiles?.length ??
    formData?.album?.images?.length ??
    0;
  const hasGpsData = !!(formData?.latitude || formData?.longitude || formData?.gps_coordinates);
  const hasTimestamp = !!(formData?.timestamp || formData?.date);

  const mockVerificationLevel: VerificationLevel = calculatePreviewVerificationLevel(
    photoCount,
    hasGpsData,
    hasTimestamp,
    activeEventType
  );

  // Transform form data to standardized event format.
  //
  // `toConsumerVisibleEvent` applies the SAME strip the backend applies before an event
  // reaches an anonymous shopper (PublicHistorySerializer._CERTIFIER_ONLY_EVENT_FIELDS).
  // Without it this modal renders raw wizard form data — which has never been through the
  // public API — under the heading "How consumers will see this event", so growers were
  // shown REI, PHI, applicator name, EPA registration number and the supplier chain as
  // though shoppers saw them. They never did. A preview that overstates what is published
  // is worse than no preview: it is the screen a farmer uses to decide what is safe to
  // record, and it was telling them their private compliance data was public.
  const previewEvent: StandardizedEvent = hasEnoughData
    ? toConsumerVisibleEvent({
        ...normalizeFormEventData(activeEventType, formData, {
          generateMockVerification: true
        }),
        // MVP Photo Verification: Add calculated verification level for preview
        verification_level: mockVerificationLevel,
        photo_verified_count: photoCount > 0 ? photoCount : undefined
      })
    : ({
        id: 'preview-event',
        type: 'general',
        description: 'Please fill in more details to see preview',
        date: new Date().toISOString(),
        event_type: activeEventType,
        verification_level: 'self_reported'
      } as StandardizedEvent);

  // Free-text notes are published VERBATIM as "Farmer's Field Notes". Trazo strips
  // worker-safety, commercial and regulatory data as structured fields, and the narrative
  // walks straight past all of it — live records carried "REI 48 hours posted",
  // "Score: 98.5%" and a neighbouring ranch by name onto the public page.
  //
  // This warns; it never edits, truncates or withholds. These are the grower's own words
  // about their own farm and the most human part of the page — silently rewriting them (or
  // silently dropping the note) would be worse than the exposure, because the farmer would
  // never learn why. The decision stays with them.
  const noteFindings = React.useMemo(
    () => (hasEnoughData ? scanEventNotes(formData ?? {}) : []),
    [hasEnoughData, formData]
  );

  // Use official event type names to prevent mapping errors
  const eventTypeName =
    EVENT_TYPE_NAMES[activeEventType as keyof typeof EVENT_TYPE_NAMES] || 'Farming Activity';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: 'full', md: 'xl', lg: '2xl' }}
      scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent
        maxH={{ base: '100vh', md: '90vh' }}
        bg={bgColor}
        mx={{ base: 0, md: 4 }}
        my={{ base: 0, md: 4 }}
        borderRadius={{ base: 0, md: 'xl' }}>
        <ModalHeader
          pb={3}
          borderBottom="1px solid"
          borderColor={useColorModeValue('gray.200', 'gray.600')}>
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
              p={4}>
              <HStack spacing={3} align="start">
                <Icon as={FaInfoCircle} color="blue.500" boxSize={5} mt={1} />
                <VStack spacing={2} align="start" flex={1}>
                  <Text fontSize="sm" fontWeight="semibold" color="blue.600">
                    {eventTypeName} Preview
                  </Text>
                  <Text
                    fontSize="xs"
                    color={useColorModeValue('blue.700', 'blue.200')}
                    lineHeight="1.4">
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
                p={4}>
                <ConsumerEventCard event={previewEvent as any} isLast={true} />
              </Box>

              {/* Field-notes publish notice. Advisory only — nothing is edited or withheld. */}
              {hasEnoughData && (
                <Box
                  mt={4}
                  p={3}
                  borderRadius="md"
                  bg={useColorModeValue(
                    noteFindings.length > 0 ? 'orange.50' : 'gray.50',
                    noteFindings.length > 0 ? 'orange.900' : 'gray.700'
                  )}
                  border="1px solid"
                  borderColor={useColorModeValue(
                    noteFindings.length > 0 ? 'orange.200' : 'gray.200',
                    noteFindings.length > 0 ? 'orange.700' : 'gray.600'
                  )}>
                  <HStack spacing={2} align="start">
                    <Icon
                      as={FaInfoCircle}
                      color={noteFindings.length > 0 ? 'orange.500' : 'gray.500'}
                      boxSize={4}
                      mt="2px"
                    />
                    <VStack spacing={noteFindings.length > 0 ? 2 : 1} align="start" flex={1}>
                      <Text fontSize="sm" fontWeight="semibold">
                        {intl.formatMessage({
                          id: 'events.noteScan.heading',
                          defaultMessage: 'Your notes will be public'
                        })}
                      </Text>

                      {noteFindings.length === 0 ? (
                        // No findings is NOT a clean bill of health — the scanner is tuned for
                        // precision and cannot recognise, say, a neighbour's farm name. Keep a
                        // short standing reminder rather than implying "all clear".
                        <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                          {intl.formatMessage({
                            id: 'events.noteScan.alwaysPublic',
                            defaultMessage:
                              "Notes are published as written. Avoid worker names, other farms' names, prices and licence numbers unless you want shoppers to see them."
                          })}
                        </Text>
                      ) : (
                        <>
                          <Text fontSize="xs" color={mutedColor} lineHeight="1.5">
                            {intl.formatMessage({
                              id: 'events.noteScan.intro',
                              defaultMessage:
                                'Field notes appear on the product page exactly as you write them. A few things below may be worth a second look before you save — this is only a suggestion, nothing is changed or hidden.'
                            })}
                          </Text>
                          <VStack spacing={1.5} align="start" pl={1}>
                            {noteFindings.map((finding, i) => (
                              <Box key={`${finding.category}-${i}`}>
                                <Text fontSize="xs" fontWeight="semibold">
                                  “{finding.match}”
                                </Text>
                                <Text fontSize="xs" color={mutedColor} lineHeight="1.4">
                                  {intl.formatMessage({ id: finding.reasonKey })}
                                </Text>
                              </Box>
                            ))}
                          </VStack>
                        </>
                      )}
                    </VStack>
                  </HStack>
                </Box>
              )}
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
              p={4}>
              <Text
                fontSize="xs"
                color={useColorModeValue('green.700', 'green.200')}
                textAlign="center">
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
