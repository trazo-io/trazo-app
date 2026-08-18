import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Box, VStack, HStack, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { FaCamera } from 'react-icons/fa';
import {
  getPhotoRecommendations,
  getPhotoGuidanceParts,
  getEnhancedPhotoRecommendations,
  PhotoRecommendation,
  SubtypePhotoRecommendation
} from '../../utils/verificationTierHelpers';
import { localizePhotoGuidance } from '../../utils/photoGuidance.es';

interface PhotoRecommendationsBoxProps {
  activeEventType: number;
  photoCount: number;
  subtype?: string;
}

/**
 * PhotoRecommendationsBox (ENHANCED with Subtype Support)
 *
 * Displays event-type AND subtype-specific photo guidance to help farmers
 * understand exactly what photos to upload for their specific activity.
 *
 * Props:
 * - activeEventType: Event type number (0-7)
 * - photoCount: Number of photos currently uploaded
 * - subtype: Optional subtype code (e.g., 'PL', 'HA' for Production events)
 *
 * Features:
 * - Subtype-specific guidance (highly relevant examples for exact activity)
 * - Dynamic guidance based on photo count
 * - Green color scheme (Trazo primary brand color, agricultural theme)
 * - Minimalist design (icon-based, no decorative emoji)
 * - Shows examples only when no photos yet
 * - Shows tips when less than 2 photos uploaded
 *
 * Used in: NewEvent.jsx (Photo upload step)
 */
export const PhotoRecommendationsBox: React.FC<PhotoRecommendationsBoxProps> = ({
  activeEventType,
  photoCount,
  subtype
}) => {
  // Get subtype-specific or event-level recommendations with memoization
  const intl = useIntl();
  const photoRecs = useMemo(
    () => getEnhancedPhotoRecommendations(activeEventType, subtype),
    [activeEventType, subtype]
  );

  // Return nothing if event type doesn't have recommendations
  if (!photoRecs) return null;

  // Check if we have subtype-specific recommendations
  const isSubtypeSpecific = subtype && 'subtypeCode' in photoRecs;
  const subtypeRec = isSubtypeSpecific ? (photoRecs as SubtypePhotoRecommendation) : null;

  // Guidance text for non-subtype events. Built from PARTS via ICU rather than a pre-composed
  // English sentence, so the wording and order follow the locale; each part is then mapped
  // through the es-419 dictionary.
  const tr = (value: string) => localizePhotoGuidance(value, intl.locale);
  const parts = !isSubtypeSpecific ? getPhotoGuidanceParts(activeEventType, photoCount) : null;
  const guidanceText = !parts
    ? null
    : parts.stage === 0
    ? intl.formatMessage(
        {
          id: 'events.photos.guidanceNone',
          defaultMessage: 'To verify this {activity}, upload photos showing: {examples}'
        },
        {
          activity: tr(parts.eventTypeName),
          examples: parts.examples.map(tr).join(', ')
        }
      )
    : parts.stage === 1
    ? intl.formatMessage(
        {
          id: 'events.photos.guidanceOne',
          defaultMessage:
            '{tier} Add another photo from a different angle for stronger verification.'
        },
        { tier: tr(parts.tierText) }
      )
    : intl.formatMessage(
        {
          id: 'events.photos.guidanceMany',
          defaultMessage: '{tier} Excellent documentation for this activity!'
        },
        { tier: tr(parts.tierText) }
      );

  // Trazo green color scheme (professional agricultural branding)
  const bgColor = useColorModeValue('green.50', 'green.900');
  const borderColor = useColorModeValue('green.300', 'green.700');
  const textPrimary = useColorModeValue('green.800', 'green.200');
  const textSecondary = useColorModeValue('green.700', 'green.300');
  const iconColor = useColorModeValue('green.700', 'green.400');

  return (
    <Box
      bg={bgColor}
      border="1px solid"
      borderColor={borderColor}
      borderRadius="lg"
      p={4}
      boxShadow="sm"
      role="region"
      aria-label={intl.formatMessage(
        { id: 'events.photos.guidanceFor', defaultMessage: 'Photo guidance for {activity}' },
        { activity: tr(subtypeRec?.subtypeName || (photoRecs as PhotoRecommendation).eventType) }
      )}>
      <VStack spacing={3} align="stretch">
        {/* Title with Icon - No emoji, clean professional design */}
        <HStack spacing={2}>
          <Icon as={FaCamera} color={iconColor} boxSize={5} />
          <Text fontSize="sm" fontWeight="semibold" color={textPrimary}>
            {subtypeRec
              ? intl.formatMessage(
                  {
                    id: 'events.photos.guidanceTitle',
                    defaultMessage: '{activity} — photo guidance'
                  },
                  { activity: tr(subtypeRec.subtypeName) }
                )
              : intl.formatMessage(
                  {
                    id: 'events.photos.guidanceFor',
                    defaultMessage: 'Photo guidance for {activity}'
                  },
                  { activity: tr((photoRecs as PhotoRecommendation).eventType) }
                )}
          </Text>
        </HStack>

        {/* Subtype-Specific or Event-Level Guidance Text */}
        {subtypeRec ? (
          <Text fontSize="xs" color={textSecondary} lineHeight="1.6">
            {tr(subtypeRec.guidanceText)}
          </Text>
        ) : (
          guidanceText && (
            <Text fontSize="xs" color={textSecondary} lineHeight="1.6">
              {guidanceText}
            </Text>
          )
        )}

        {/* Example Photos (shown only when no photos uploaded) */}
        {photoCount === 0 && (
          <Box>
            <Text fontSize="xs" fontWeight="semibold" color={textPrimary} mb={1}>
              {intl.formatMessage({
                id: 'events.photos.examples',
                defaultMessage: 'Example photos:'
              })}
            </Text>
            <VStack spacing={1} align="start" pl={3}>
              {photoRecs.examples.slice(0, 3).map((example, idx) => (
                <Text key={idx} fontSize="xs" color={textSecondary}>
                  • {tr(example)}
                </Text>
              ))}
            </VStack>
          </Box>
        )}

        {/* Photography Tips - Show subtype tips if available, else general tips */}
        {(subtypeRec?.tips || (photoRecs as PhotoRecommendation).tips?.length > 0) &&
          photoCount < 2 && (
            <Box>
              <Text fontSize="xs" fontWeight="semibold" color={textPrimary} mb={1}>
                {intl.formatMessage({ id: 'events.photos.tips', defaultMessage: 'Tips:' })}
              </Text>
              <VStack spacing={1} align="start" pl={3}>
                {(subtypeRec?.tips || (photoRecs as PhotoRecommendation).tips)
                  ?.slice(0, 2)
                  .map((tip, idx) => (
                    <Text key={idx} fontSize="xs" color={textSecondary}>
                      • {tr(tip)}
                    </Text>
                  ))}
              </VStack>
            </Box>
          )}
      </VStack>
    </Box>
  );
};

export default PhotoRecommendationsBox;
