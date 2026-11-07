import React, { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { Box, HStack, Icon, Text, VStack } from '@chakra-ui/react';
import { FaCamera } from 'react-icons/fa';
import {
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
 * What to photograph, on the activity wizard's photo step.
 *
 * Rewritten 2026-11-07. The old box:
 *  - graded the photos once they were added ("Add another photo from a different angle for
 *    stronger verification", "Excellent documentation for this activity!"), text left over
 *    from the retired per-event verification tiers. The record carries no grade, so the box
 *    no longer comments on what was uploaded: it shows only before the first photo;
 *  - listed PLANTING and HARVEST examples for any production-family activity it had no
 *    subtype entry for, so a cultivation pass was told to photograph seeding equipment. Those
 *    now get only the examples that fit any field pass (equipment working, the field before
 *    and after);
 *  - sat in a green box with a green title, the colour of a settled state, over guidance.
 *    Now neutral, like every other hint on the form.
 */
// The production-family examples that are true of any pass, not just planting or harvest.
const ANY_PASS_EXAMPLES = [
  'Equipment operation (tractor in field, irrigation running)',
  'Field conditions before/after activity'
];

export const PhotoRecommendationsBox: React.FC<PhotoRecommendationsBoxProps> = ({
  activeEventType,
  photoCount,
  subtype
}) => {
  const intl = useIntl();
  const photoRecs = useMemo(
    () => getEnhancedPhotoRecommendations(activeEventType, subtype),
    [activeEventType, subtype]
  );

  if (!photoRecs || photoCount > 0) return null;

  const tr = (value: string) => localizePhotoGuidance(value, intl.locale);
  const subtypeRec =
    subtype && 'subtypeCode' in photoRecs ? (photoRecs as SubtypePhotoRecommendation) : null;
  const examples = subtypeRec
    ? subtypeRec.examples
    : activeEventType === 1
    ? ANY_PASS_EXAMPLES
    : (photoRecs as PhotoRecommendation).examples;
  const tips = subtypeRec?.tips || (photoRecs as PhotoRecommendation).tips || [];
  // The shared lists still carry the retired tiers' pitch ("Multiple angles strengthen
  // verification", "dramatically improves verification credibility"). A photo is evidence the
  // packet counts, not a score that goes up, so lines that sell it as proof are left out.
  const sellsProof = /verif|credib|strengthen|stronger|excellent|prove/i;
  const lines = [
    ...examples.filter((line) => !sellsProof.test(line)).slice(0, 3),
    ...tips.filter((line) => !sellsProof.test(line)).slice(0, 2)
  ];
  if (lines.length === 0) return null;

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      role="note"
      aria-labelledby="photo-guidance-title">
      <HStack spacing={2} mb={2}>
        <Icon as={FaCamera} color="gray.600" boxSize={4} aria-hidden />
        <Text id="photo-guidance-title" fontSize="sm" fontWeight="semibold" color="gray.800">
          {intl.formatMessage({
            id: 'events.photos.whatToPhotograph',
            defaultMessage: 'What to photograph'
          })}
        </Text>
      </HStack>
      <VStack as="ul" spacing={1} align="start" pl={5} m={0}>
        {lines.map((line, idx) => (
          <Text as="li" key={idx} fontSize="sm" color="gray.700">
            {tr(line)}
          </Text>
        ))}
      </VStack>
    </Box>
  );
};

export default PhotoRecommendationsBox;
