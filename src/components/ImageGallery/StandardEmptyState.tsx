import React from 'react';
import { Box, VStack, Text, Icon, Button, useColorModeValue } from '@chakra-ui/react';
import {
  FaImage,
  FaCamera,
  FaLeaf,
  FaSeedling,
  FaBuilding,
  FaMapMarkedAlt,
  FaClipboardList,
  FaStar
} from 'react-icons/fa';
import { IconType } from 'react-icons';

export type EmptyStateVariant =
  | 'default'
  | 'establishment'
  | 'parcel'
  | 'production'
  | 'event'
  | 'product'
  | 'review';

interface StandardEmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  subtitle?: string;
  icon?: IconType;
  height?: string;
  borderRadius?: string;
  showAction?: boolean;
  actionText?: string;
  onAction?: () => void;
  isDashed?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const emptyStateConfig = {
  default: {
    icon: FaImage,
    title: 'No photos available',
    subtitle: 'Photos will appear here when uploaded'
  },
  establishment: {
    icon: FaBuilding,
    title: 'No establishment photos',
    subtitle: 'Add photos to showcase your agricultural facility'
  },
  parcel: {
    icon: FaMapMarkedAlt,
    title: 'No parcel photos',
    subtitle: 'Upload images to document your land and crops'
  },
  production: {
    icon: FaSeedling,
    title: 'No production photos',
    subtitle: 'Document your growing process with photos'
  },
  event: {
    icon: FaClipboardList,
    title: 'No event photos',
    subtitle: 'Add photos to document this agricultural event'
  },
  product: {
    icon: FaLeaf,
    title: 'No product photos',
    subtitle: 'Product images help build consumer trust'
  },
  review: {
    icon: FaStar,
    title: 'No review photos',
    subtitle: 'Customer photos help showcase product quality'
  }
};

const sizeConfig = {
  sm: {
    height: '200px',
    iconSize: 8,
    titleSize: 'md',
    subtitleSize: 'sm',
    spacing: 3
  },
  md: {
    height: '280px',
    iconSize: 12,
    titleSize: 'lg',
    subtitleSize: 'sm',
    spacing: 4
  },
  lg: {
    height: '360px',
    iconSize: 16,
    titleSize: 'xl',
    subtitleSize: 'md',
    spacing: 5
  }
};

const StandardEmptyState = ({
  variant = 'default',
  title,
  subtitle,
  icon,
  height,
  borderRadius = 'xl',
  showAction = false,
  actionText = 'Upload Photos',
  onAction,
  isDashed = true,
  size = 'md'
}: StandardEmptyStateProps) => {
  const bgColor = useColorModeValue('gray.50', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('gray.600', 'gray.400');
  const subtitleColor = useColorModeValue('gray.500', 'gray.500');

  const config = emptyStateConfig[variant];
  const sizeSettings = sizeConfig[size];

  const displayIcon = icon || config.icon;
  const displayTitle = title || config.title;
  const displaySubtitle = subtitle || config.subtitle;
  const displayHeight = height || sizeSettings.height;

  return (
    <Box
      bg={bgColor}
      border={isDashed ? '2px dashed' : '1px solid'}
      borderColor={borderColor}
      borderRadius={borderRadius}
      height={displayHeight}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={8}
      transition="all 0.2s ease"
      _hover={
        showAction
          ? { borderColor: 'green.300', bg: useColorModeValue('green.25', 'green.900') }
          : undefined
      }>
      <VStack spacing={sizeSettings.spacing} textAlign="center" maxW="300px">
        <Icon as={displayIcon} boxSize={sizeSettings.iconSize} color={textColor} opacity={0.7} />

        <VStack spacing={1}>
          <Text
            fontSize={sizeSettings.titleSize}
            fontWeight="600"
            color={textColor}
            lineHeight="shorter">
            {displayTitle}
          </Text>

          {displaySubtitle && (
            <Text
              fontSize={sizeSettings.subtitleSize}
              color={subtitleColor}
              opacity={0.8}
              textAlign="center"
              lineHeight="base">
              {displaySubtitle}
            </Text>
          )}
        </VStack>

        {showAction && onAction && (
          <Button
            size="sm"
            colorScheme="green"
            variant="outline"
            leftIcon={<FaCamera />}
            onClick={onAction}
            mt={2}
            borderRadius="lg"
            fontWeight="medium"
            _hover={{
              bg: 'green.50',
              borderColor: 'green.400'
            }}>
            {actionText}
          </Button>
        )}
      </VStack>
    </Box>
  );
};

export default StandardEmptyState;
