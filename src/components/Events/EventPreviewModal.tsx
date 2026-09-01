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
import { FaEye } from 'react-icons/fa';
import { MdPreview } from 'react-icons/md';
import { ConsumerEventCard } from './ConsumerEventCard';
import { hasMinimalPreviewData, type PreviewEventData } from '../../utils/eventPreviewUtils';
import { normalizeFormEventData } from '../../utils/eventDataNormalizer';
import { buyerPageWithheldReasonId, toConsumerVisibleEvent } from '../../utils/consumerDisplay';
import { StandardAlert } from 'components/Design/StandardComponents';
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
  // Hoisted: these render inside a conditional branch below, and a hook call there
  // would change hook order between withheld and published previews.
  const previewCardBg = useColorModeValue('white', 'gray.800');
  const previewCardBorder = useColorModeValue('gray.200', 'gray.600');

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

  /*
   * Hoisted so the OPENING banner and the section heading can read it too.
   *
   * It used to be computed inside the IIFE that renders the card, which is why the banner
   * above could promise "how consumers will see your event" for an activity the backend
   * withholds from the buyer page entirely — the banner had no way to know.
   */
  const withheldReasonId = buyerPageWithheldReasonId({
    ...(previewEvent as unknown as Record<string, unknown>),
    event_type: activeEventType
  });
  const isWithheld = Boolean(withheldReasonId);

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
              {/* .700, not .500: 2.78 on white fails the 3.0 a glyph owes. Missed on the
                  first pass — the section icon below was fixed and this one was not. */}
              <Icon as={MdPreview} color="green.700" boxSize={6} />
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
            {/*
              The banner promised a CONSUMER preview unconditionally — including for the
              certifier-only activities (buffer use, seed search, equipment, treated lumber)
              that the backend withholds from the buyer page entirely. So the modal opened by
              saying "this is how consumers will see your event" and, two blocks later, said
              "not shown on your buyer page". It now renders only when the activity actually
              reaches a shopper; when it does not, the alert below is already the honest
              answer and this would contradict it.

              Was a hand-rolled <Box> imitating an info alert: bg blue.50, 1px blue.200,
              blue.500 icon, blue.600 heading, blue.700 body. MEASURED against blue.50 —
              heading 3.22 (needs 4.5), body 4.03 (needs 4.5), icon 2.74 (needs 3.0). All
              three fail, and `theme/components/alert.js` records the SAME 2.74 for blue.500
              as its reason for moving the real alert to the .700 step. The imitation used
              precisely the values the theme had already rejected.
            */}
            {!isWithheld && (
              <StandardAlert
                status="info"
                title={intl.formatMessage(
                  { id: 'events.preview.banner.title' },
                  { eventType: eventTypeName }
                )}
                mb={0}>
                <VStack align="start" spacing={2}>
                  <Text fontSize="sm">
                    {intl.formatMessage({ id: 'events.preview.banner.body' })}
                  </Text>
                  {!hasEnoughData && (
                    /* `variant="warning"`, not `colorScheme="orange"`: Badge colorScheme is
                       inert in this theme, and `orange` is not a Trazo scale at all — it
                       resolves to CHAKRA's orange, a different accent from the app's amber. */
                    <Badge variant="warning">
                      {intl.formatMessage({ id: 'events.preview.incomplete' })}
                    </Badge>
                  )}
                </VStack>
              </StandardAlert>
            )}
            <Divider />
            {/* Event Preview Header */}
            <Box>
              <HStack spacing={3} mb={4}>
                {/* green.500 is 2.78 on white and fails the 3.0 a glyph owes; .700 is 5.13.
                    `.claude/rules/frontend.md` bans the .500 step for anything that renders
                    marks, which this does. */}
                <Icon as={FaEye} color="green.700" boxSize={5} />
                <Text fontSize="md" fontWeight="semibold" color={textColor}>
                  {intl.formatMessage({
                    id: isWithheld
                      ? 'events.preview.headingCertifier'
                      : 'events.preview.headingConsumer'
                  })}
                </Text>
              </HStack>

              {/* The actual preview using ConsumerEventCard — unless the whole event is
                  certifier-only (BU/SS/EM/TP): the backend withholds those events entirely,
                  so an honest preview here is the explanation, not a card no shopper sees. */}
              {(() => {
                if (withheldReasonId) {
                  return (
                    <StandardAlert
                      status="info"
                      title={intl.formatMessage({ id: 'events.certifierOnly.title' })}
                      description={intl.formatMessage({ id: withheldReasonId })}
                      mb={0}
                    />
                  );
                }
                return (
                  <Box
                    bg={previewCardBg}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor={previewCardBorder}
                    overflow="hidden"
                    p={4}>
                    <ConsumerEventCard event={previewEvent as any} isLast={true} />
                  </Box>
                );
              })()}

              {/*
                Field-notes publish notice. Advisory only — nothing is edited or withheld.

                Was a third hand-rolled <Box>, and the one that swapped gray.50/gray.200 for
                ORANGE.50/orange.200 when the scanner found something. `orange` is not a Trazo
                scale (the theme defines green, gray, red, blue and amber), so the warning
                state silently rendered CHAKRA's orange — a different accent from every other
                warning in the app. `status="warning"` maps to amber through the theme, which
                is the whole reason that mapping exists.
              */}
              {/*
                🔴 2026-08-31 — `!isWithheld` added. This notice sat OUTSIDE the withheld branch
                above, so a cleanout, transport, buffer-use or seed-search preview showed
                "Certifier-only record — not shown on your buyer page" and then, directly under
                it, "Your notes will be public. Notes are published as written." Two statements
                about the same record, one of them false, in one modal.

                Suppressed rather than reworded: the alert above already tells the grower where
                this record goes, and the note scanner's whole purpose is to catch what a
                SHOPPER would read. On a record no shopper receives, its warnings are noise that
                teaches people to ignore it on the records where it matters.
              */}
              {hasEnoughData && !isWithheld && (
                <Box mt={4}>
                  <StandardAlert
                    status={noteFindings.length > 0 ? 'warning' : 'info'}
                    title={intl.formatMessage({
                      id: 'events.noteScan.heading',
                      defaultMessage: 'Your notes will be public'
                    })}
                    mb={0}>
                    {noteFindings.length === 0 ? (
                      // No findings is NOT a clean bill of health — the scanner is tuned for
                      // precision and cannot recognise, say, a neighbour's farm name. Keep a
                      // short standing reminder rather than implying "all clear".
                      <Text fontSize="sm" lineHeight="1.5">
                        {intl.formatMessage({
                          id: 'events.noteScan.alwaysPublic',
                          defaultMessage:
                            "Notes are published as written. Avoid worker names, other farms' names, prices and licence numbers unless you want shoppers to see them."
                        })}
                      </Text>
                    ) : (
                      <>
                        <Text fontSize="sm" lineHeight="1.5">
                          {intl.formatMessage({
                            id: 'events.noteScan.intro',
                            defaultMessage:
                              'Field notes appear on the product page exactly as you write them. A few things below may be worth a second look before you save — this is only a suggestion, nothing is changed or hidden.'
                          })}
                        </Text>
                        <VStack spacing={1.5} align="start" pl={1} pt={1}>
                          {noteFindings.map((finding, i) => (
                            <Box key={`${finding.category}-${i}`}>
                              <Text fontSize="sm" fontWeight="semibold">
                                “{finding.match}”
                              </Text>
                              <Text fontSize="sm" lineHeight="1.4">
                                {intl.formatMessage({ id: finding.reasonKey })}
                              </Text>
                            </Box>
                          ))}
                        </VStack>
                      </>
                    )}
                  </StandardAlert>
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

            {/*
              A fourth notice used to sit here: a green box, centred text, and the only emoji
              in the modal — "💡 Tip: the more details you provide ... Complete transparency
              builds consumer confidence!".

              Removed rather than converted. It carried no action the farmer could take that
              the "fill in more details" badge above does not already say, it was the fourth
              stacked notice around a single preview card (the preview is what this modal is
              for), and its copy leaned on the trust/confidence framing that
              `.claude/rules/transparency-first.md` moved away from.
            */}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default EventPreviewModal;
