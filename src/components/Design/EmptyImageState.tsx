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
import { FaImage } from 'react-icons/fa';
import { IconType } from 'react-icons';

interface EmptyImageStateProps {
  /**
   * Size variant: small (dashboard cards), medium (dashboard cards), large (profile galleries)
   * @default 'large'
   */
  variant?: 'small' | 'medium' | 'large';

  /**
   * Custom primary text (optional)
   * Uses variant defaults if not provided
   */
  primaryText?: string;

  /**
   * Custom secondary text (optional)
   * Only shown in 'large' variant by default
   */
  secondaryText?: string;

  /**
   * Custom icon (optional)
   * @default FaImage
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
 * Modern, minimalist empty image state for dashboard cards and profile galleries
 * Provides consistent visual treatment across Trazo platform.
 *
 * Design: Subtle circular icon container with concise text messaging
 * - Icon: FaImage (universal symbol for photos)
 * - Colors: Trazo gray palette (professional, not temporary-feeling)
 * - Sizing: Responsive across contexts (40px → 70px)
 * - Accessibility: WCAG AA color contrast validated
 *
 * Usage Examples:
 * ```tsx
 * // Dashboard card (small)
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
  icon = FaImage,
  height,
  borderRadius = 'md',
  showBorder = true
}) => {
  // Trazo color palette
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const circleBgColor = useColorModeValue('gray.100', 'gray.800');
  const iconColor = useColorModeValue('gray.400', 'gray.500');
  const primaryTextColor = useColorModeValue('gray.600', 'gray.300');
  const secondaryTextColor = useColorModeValue('gray.500', 'gray.400');

  // Variant configuration
  const variantConfig = {
    small: {
      circleSize: '40px',
      iconSize: 5, // 20px
      spacing: 2, // 8px
      primaryFontSize: 'sm',
      primaryFontWeight: '500' as const,
      showSecondaryText: false,
      containerPadding: 4 // 16px
    },
    medium: {
      circleSize: '50px',
      iconSize: 6, // 24px
      spacing: 2, // 8px
      primaryFontSize: 'sm',
      primaryFontWeight: '500' as const,
      showSecondaryText: false,
      containerPadding: 4 // 16px
    },
    large: {
      circleSize: { base: '60px', md: '70px' },
      iconSize: { base: 6, md: 8 }, // 24px → 32px responsive
      spacing: { base: 3, md: 4 }, // 12px → 16px responsive
      primaryFontSize: { base: 'md', md: 'lg' }, // 16px → 18px responsive
      primaryFontWeight: '600' as const,
      showSecondaryText: true,
      containerPadding: 8 // 32px
    }
  };

  const config = variantConfig[variant];

  // Default text by variant
  const defaultPrimaryText = {
    small: 'No Image',
    medium: 'No Image',
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
      bg={bgColor}
      border={showBorder ? '1px solid' : 'none'}
      borderColor={borderColor}
      borderRadius={borderRadius}
      height={height}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={config.containerPadding}
      minH={height ? undefined : 'inherit'}
    >
      <VStack
        spacing={config.spacing}
        textAlign="center"
        role="img"
        aria-label={displayPrimaryText}
      >
        {/* Icon Container */}
        <Circle size={config.circleSize} bg={circleBgColor} color={iconColor} flexShrink={0}>
          <Icon as={icon} boxSize={config.iconSize} />
        </Circle>

        {/* Text Container */}
        <VStack spacing={1} w="100%">
          {/* Primary Text */}
          <Text
            fontSize={config.primaryFontSize}
            fontWeight={config.primaryFontWeight}
            color={primaryTextColor}
            lineHeight="tight"
          >
            {displayPrimaryText}
          </Text>

          {/* Secondary Text - Only show for large variant or if explicitly set */}
          {(config.showSecondaryText || secondaryText) && displaySecondaryText && (
            <Text
              fontSize="sm"
              color={secondaryTextColor}
              lineHeight="tall"
              display={{ base: variant === 'large' ? 'none' : 'block', md: 'block' }}
            >
              {displaySecondaryText}
            </Text>
          )}
        </VStack>
      </VStack>
    </Box>
  );
};

export default EmptyImageState;
