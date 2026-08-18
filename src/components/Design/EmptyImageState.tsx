import React from 'react';
import {
  Box,
  VStack,
  Text,
  Icon,
  Circle,
  useColorModeValue,
  ResponsiveValue
} from '@chakra-ui/react';
import { FaLeaf } from 'react-icons/fa';
import { IconType } from 'react-icons';

interface EmptyImageStateProps {
  /**
   * Size variant: small (dashboard cards), medium (dashboard cards), large (profile galleries)
   * @default 'large'
   */
  variant?: 'small' | 'medium' | 'large';

  /**
   * Custom primary text (optional)
   * small/medium render NO text unless this is explicitly set (quiet fill);
   * large keeps its upload-prompt defaults.
   */
  primaryText?: string;

  /**
   * Custom secondary text (optional)
   * Only shown in 'large' variant by default
   */
  secondaryText?: string;

  /**
   * Custom icon (optional)
   * @default FaLeaf
   */
  icon?: IconType;

  /**
   * Custom height for container (optional)
   * Defaults to fit parent if not specified
   */
  height?: ResponsiveValue<string | number>;

  /**
   * Custom border radius (optional)
   * Inherits from context if not specified
   */
  borderRadius?: ResponsiveValue<string>;

  /**
   * Whether to show border (optional)
   * @default true
   */
  showBorder?: boolean;
}

/**
 * EmptyImageState Component
 *
 * THE one empty-image standard across Trazo surfaces (2026-08-09 unification:
 * farm-profile card, parcel carousel cards, and galleries had drifted into
 * different empty states — gray "No Image" boxes vs quiet leaf fills).
 *
 * Design: a photo's absence is not an error, so card contexts must not
 * announce it.
 * - small/medium (cards): quiet brand-tinted fill + faint leaf watermark,
 *   NO text unless explicitly passed (e.g. "Photo unavailable" error tiles).
 * - large (galleries): keeps the action prompt — there the empty state IS
 *   the upload invitation.
 *
 * Usage Examples:
 * ```tsx
 * // Dashboard card (small) — quiet fill, no text
 * <EmptyImageState variant="small" height="180px" borderRadius="20px" />
 *
 * // Profile gallery (large with custom text)
 * <EmptyImageState
 *   variant="large"
 *   primaryText="No farm photos yet"
 *   secondaryText="Upload photos to showcase your practices"
 * />
 * ```
 */
export const EmptyImageState: React.FC<EmptyImageStateProps> = ({
  variant = 'large',
  primaryText,
  secondaryText,
  icon = FaLeaf,
  height,
  borderRadius = 'md',
  showBorder = true
}) => {
  // Quiet brand-tinted fill (never a flat gray void)
  const bgGradient = useColorModeValue(
    'linear(to-br, green.50, gray.50)',
    'linear(to-br, gray.800, gray.900)'
  );
  const borderColor = useColorModeValue('gray.100', 'gray.700');
  const watermarkColor = useColorModeValue('green.200', 'green.700');
  const circleBgColor = useColorModeValue('white', 'gray.800');
  const largeIconColor = useColorModeValue('green.400', 'green.500');
  const primaryTextColor = useColorModeValue('gray.600', 'gray.300');
  const secondaryTextColor = useColorModeValue('gray.500', 'gray.400');

  // Variant configuration
  const variantConfig = {
    small: {
      iconSize: 7, // 28px watermark
      spacing: 2,
      primaryFontSize: 'xs',
      primaryFontWeight: '500' as const,
      showSecondaryText: false,
      containerPadding: 4
    },
    medium: {
      iconSize: 8, // 32px watermark
      spacing: 2,
      primaryFontSize: 'sm',
      primaryFontWeight: '500' as const,
      showSecondaryText: false,
      containerPadding: 4
    },
    large: {
      iconSize: { base: 6, md: 8 },
      spacing: { base: 3, md: 4 },
      primaryFontSize: { base: 'md', md: 'lg' },
      primaryFontWeight: '600' as const,
      showSecondaryText: true,
      containerPadding: 8
    }
  };

  const config = variantConfig[variant];

  // small/medium: silent by default — text only when a caller states it
  // (error tiles). large: the gallery's upload prompt.
  const defaultPrimaryText = {
    small: '',
    medium: '',
    large: 'No photos available'
  };

  const defaultSecondaryText = {
    small: '',
    medium: '',
    large: 'Photos will appear here when uploaded'
  };

  const displayPrimaryText = primaryText ?? defaultPrimaryText[variant];
  const displaySecondaryText = secondaryText ?? defaultSecondaryText[variant];

  return (
    <Box
      bgGradient={bgGradient}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={borderColor}
      borderRadius={borderRadius}
      height={height}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={config.containerPadding}
      minH={height ? undefined : 'inherit'}
      role="img"
      aria-label={displayPrimaryText || 'No photo'}>
      {variant === 'large' ? (
        <VStack spacing={config.spacing} textAlign="center">
          <Circle
            size={{ base: '60px', md: '70px' }}
            bg={circleBgColor}
            color={largeIconColor}
            flexShrink={0}
            boxShadow="sm">
            <Icon as={icon} boxSize={config.iconSize} />
          </Circle>
          <VStack spacing={1} w="100%">
            <Text
              fontSize={config.primaryFontSize}
              fontWeight={config.primaryFontWeight}
              color={primaryTextColor}
              lineHeight="tight">
              {displayPrimaryText}
            </Text>
            {displaySecondaryText && (
              <Text fontSize="sm" color={secondaryTextColor} lineHeight="tall">
                {displaySecondaryText}
              </Text>
            )}
          </VStack>
        </VStack>
      ) : (
        <VStack spacing={config.spacing} textAlign="center">
          {/* A watermark is faint ON PURPOSE — green.200 measures 1.35:1 on white and is meant
              to. That is only honest if it carries no information, so it is marked decorative:
              the text beside it says what the empty state means. Without aria-hidden a
              contrast audit reads it as a failing 28px icon, because it looks like one. */}
          <Icon as={icon} boxSize={config.iconSize} color={watermarkColor} aria-hidden="true" />
          {displayPrimaryText && (
            <Text
              fontSize={config.primaryFontSize}
              fontWeight={config.primaryFontWeight}
              color={primaryTextColor}
              lineHeight="tight">
              {displayPrimaryText}
            </Text>
          )}
        </VStack>
      )}
    </Box>
  );
};

export default EmptyImageState;
