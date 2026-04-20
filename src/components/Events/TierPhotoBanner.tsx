import React from 'react';
import { Box, HStack, Text, Icon, useColorModeValue } from '@chakra-ui/react';
import { FaExclamationCircle, FaInfoCircle, FaCamera, FaCheckCircle } from 'react-icons/fa';
import { useIntl } from 'react-intl';
import type { PhotoTier } from 'utils/photoTierHelpers';
import { getTierPenaltyPercent, getRecommendedPhotoCount } from 'utils/photoTierHelpers';

interface TierPhotoBannerProps {
  tier: PhotoTier;
  subtype?: string;
  photoCount: number;
}

/**
 * TierPhotoBanner
 *
 * Displays a tier-aware alert showing the score impact of documenting
 * an event with/without photos. Mirrors backend transparency_calculator.py
 * 3-tier photo penalty system.
 *
 * Tiers:
 *  - essential (Tier 1): Red alert, 50% penalty without photos
 *  - recommended (Tier 2): Orange alert, 25% penalty without photos
 *  - optional (Tier 3): Subtle green hint, 0% penalty
 *
 * When enough photos are attached, banner switches to a green success state.
 *
 * Used in: QuickAddEvent (Quick template + Detailed form paths)
 */
export const TierPhotoBanner: React.FC<TierPhotoBannerProps> = ({ tier, subtype, photoCount }) => {
  const intl = useIntl();
  const penalty = getTierPenaltyPercent(tier);
  const recommendedCount = getRecommendedPhotoCount(subtype);
  const hasEnoughPhotos = photoCount >= recommendedCount;

  // Color tokens per tier (Trazo theme tokens, no hardcoded hex)
  const essentialBg = useColorModeValue('red.50', 'red.900');
  const essentialBorder = useColorModeValue('red.300', 'red.700');
  const essentialText = useColorModeValue('red.800', 'red.200');
  const essentialIcon = useColorModeValue('red.500', 'red.300');

  const recommendedBg = useColorModeValue('orange.50', 'orange.900');
  const recommendedBorder = useColorModeValue('orange.300', 'orange.700');
  const recommendedText = useColorModeValue('orange.800', 'orange.200');
  const recommendedIcon = useColorModeValue('orange.500', 'orange.300');

  const optionalBg = useColorModeValue('green.50', 'green.900');
  const optionalBorder = useColorModeValue('green.200', 'green.800');
  const optionalText = useColorModeValue('green.800', 'green.200');
  const optionalIcon = useColorModeValue('green.500', 'green.400');

  const successBg = useColorModeValue('green.50', 'green.900');
  const successBorder = useColorModeValue('green.300', 'green.700');
  const successText = useColorModeValue('green.800', 'green.200');
  const successIcon = useColorModeValue('green.500', 'green.300');

  // Resolve colors + icon + label based on tier + photo state
  let bg: string;
  let border: string;
  let textColor: string;
  let iconColor: string;
  let BannerIcon: typeof FaExclamationCircle;
  let labelKey: string;
  let messageKey: string;

  if (hasEnoughPhotos) {
    bg = successBg;
    border = successBorder;
    textColor = successText;
    iconColor = successIcon;
    BannerIcon = FaCheckCircle;
    labelKey = 'quickAdd.photos.tierCoveredLabel';
    messageKey = 'quickAdd.photos.tierCoveredMessage';
  } else {
    switch (tier) {
      case 'essential':
        bg = essentialBg;
        border = essentialBorder;
        textColor = essentialText;
        iconColor = essentialIcon;
        BannerIcon = FaExclamationCircle;
        labelKey = 'quickAdd.photos.tierEssentialLabel';
        messageKey = 'quickAdd.photos.tierEssentialWarning';
        break;
      case 'recommended':
        bg = recommendedBg;
        border = recommendedBorder;
        textColor = recommendedText;
        iconColor = recommendedIcon;
        BannerIcon = FaInfoCircle;
        labelKey = 'quickAdd.photos.tierRecommendedLabel';
        messageKey = 'quickAdd.photos.tierRecommendedWarning';
        break;
      case 'optional':
      default:
        bg = optionalBg;
        border = optionalBorder;
        textColor = optionalText;
        iconColor = optionalIcon;
        BannerIcon = FaCamera;
        labelKey = 'quickAdd.photos.tierOptionalLabel';
        messageKey = 'quickAdd.photos.tierOptionalHint';
        break;
    }
  }

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="md"
      p={3}
      role="region"
      aria-label={intl.formatMessage({ id: labelKey })}
    >
      <HStack spacing={3} align="start">
        <Icon as={BannerIcon} color={iconColor} boxSize={5} mt="2px" flexShrink={0} />
        <Box flex={1} minW={0}>
          <Text fontSize="sm" fontWeight="semibold" color={textColor}>
            {intl.formatMessage({ id: labelKey })}
          </Text>
          <Text fontSize="xs" color={textColor} mt={0.5} lineHeight="1.5">
            {intl.formatMessage(
              { id: messageKey },
              { penalty, recommended: recommendedCount, current: photoCount }
            )}
          </Text>
        </Box>
      </HStack>
    </Box>
  );
};

export default TierPhotoBanner;
