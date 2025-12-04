import React from 'react';
import { Box, VStack, Text, Progress, useColorModeValue, Fade } from '@chakra-ui/react';
import { ModernSkeletonCard } from './ModernSkeletonCard';

interface LoadingWrapperProps {
  isLoading: boolean;
  skeletonType?: 'hero' | 'journey' | 'transparency' | 'analytics' | 'chart' | 'timeline' | 'card';
  loadingText?: string;
  showProgress?: boolean;
  children: React.ReactNode;
  minHeight?: string;
}

/**
 * LoadingWrapper - A clean, consistent loading state wrapper
 * for individual components following Trazo design patterns
 */
export const LoadingWrapper: React.FC<LoadingWrapperProps> = ({
  isLoading,
  skeletonType = 'card',
  loadingText,
  showProgress = false,
  children,
  minHeight
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  if (isLoading) {
    return (
      <Fade in={true}>
        <Box minH={minHeight}>
          {loadingText && (
            <VStack spacing={4} mb={6}>
              <Text fontSize="sm" color={textColor} fontWeight="medium">
                {loadingText}
              </Text>
              {showProgress && (
                <Progress
                  size="sm"
                  isIndeterminate
                  colorScheme="green"
                  borderRadius="full"
                  w="200px"
                />
              )}
            </VStack>
          )}
          <ModernSkeletonCard type={skeletonType} height={minHeight} />
        </Box>
      </Fade>
    );
  }

  return <Fade in={true}>{children}</Fade>;
};

export default LoadingWrapper;
